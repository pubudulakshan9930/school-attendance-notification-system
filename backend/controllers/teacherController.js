function normalizeSpreadsheetHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function readSpreadsheetValue(row, aliases) {
  const normalizedAliases = aliases.map((alias) =>
    normalizeSpreadsheetHeader(alias),
  );

  for (const [key, value] of Object.entries(row || {})) {
    if (normalizedAliases.includes(normalizeSpreadsheetHeader(key))) {
      return value;
    }
  }

  return "";
}

function loadStudentRegistrationWorkbook(file) {
  const XLSX = require("xlsx");
  const path = require("path");

  const originalName = String(file?.name || file?.originalname || "");
  const extension = path.extname(originalName).toLowerCase();

  if (extension === ".csv") {
    return XLSX.read(file.data.toString("utf8"), { type: "string" });
  }

  return XLSX.read(file.data, { type: "buffer" });
}

function escapeCsvValue(value) {
  const text = String(value ?? "");

  if (/[,\r\n"]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function buildStudentRegistrationTemplateCsv(plan) {
  const columns = [
    "Full Name",
    "Gender",
    "Student ID",
    "Parent Name",
    "Parent Phone",
    "Parent Email",
    "City",
    "Address",
  ];

  const electiveGroups = (plan?.elective_groups || []).filter((group) => {
    return Array.isArray(group?.options) && group.options.length > 0;
  });

  electiveGroups.forEach((_, index) => {
    columns.push(`Category ${index + 1}`);
  });

  return `${columns.map(escapeCsvValue).join(",")}\n`;
}

function buildSubjectMarksTemplateCsv(students) {
  const lines = [["student_code", "mark"]];

  for (const student of students || []) {
    lines.push([String(student.student_code || ""), ""]);
  }

  return `${lines.map((row) => row.map(escapeCsvValue).join(",")).join("\n")}\n`;
}

async function sendRegistrationSmsNotification(student, classInfo) {
  const streamLabel = getStreamLabel(classInfo.stream);
  const className = streamLabel
    ? `Grade ${classInfo.grade} ${streamLabel} Class ${classInfo.section}`
    : `Grade ${classInfo.grade} Class ${classInfo.section}`;
  const recipient = sanitizePhone(student.parent_phone);
  const message = formatRegistrationSms({
    parentName: student.parent_name,
    studentName: student.full_name,
    className,
    studentCode: student.student_code,
  });

  if (!recipient) {
    try {
      await teacherRepository.insertNotificationLog({
        studentId: student.id,
        notificationType: "registration",
        medium: "sms",
        recipient: null,
        message,
        status: "failed: missing parent phone",
      });
    } catch (logErr) {
      console.error("Notification log error (missing phone):", logErr);
    }
    return;
  }

  try {
    await sendSms({ recipient, message });
    await teacherRepository.insertNotificationLog({
      studentId: student.id,
      notificationType: "registration",
      medium: "sms",
      recipient,
      message,
      status: "sent",
    });
  } catch (smsErr) {
    const failReason = smsErr?.message || "SMS provider error";
    try {
      await teacherRepository.insertNotificationLog({
        studentId: student.id,
        notificationType: "registration",
        medium: "sms",
        recipient,
        message,
        status: `failed: ${failReason}`,
      });
    } catch (logErr) {
      console.error("Notification log error:", logErr);
    }
    console.error("Send registration SMS error:", smsErr);
  }
}

async function bulkUploadStudents(req, res) {
  const csvFile = req.files?.csvFile;

  if (!csvFile) {
    return res.status(400).json({ error: "CSV file is required." });
  }

  try {
    const workbook = loadStudentRegistrationWorkbook(csvFile);
    const sheetName = workbook.SheetNames?.[0];

    if (!sheetName) {
      return res
        .status(400)
        .json({ error: "CSV/XLSX file does not contain any sheets." });
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = require("xlsx").utils.sheet_to_json(sheet, { defval: "" });

    if (rows.length === 0) {
      return res
        .status(400)
        .json({ error: "CSV/XLSX file is empty or only contains headers." });
    }

    let registeredCount = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const subjectData = {
          elective_subject_1: readSpreadsheetValue(row, [
            "Category 1",
            "elective_subject_1",
          ]),
          elective_subject_2: readSpreadsheetValue(row, [
            "Category 2",
            "elective_subject_2",
          ]),
          elective_subject_3: readSpreadsheetValue(row, [
            "Category 3",
            "elective_subject_3",
          ]),
        };

        const result = await teacherRepository.createStudentForTeacher(
          req.user.userId,
          {
            student_name: readSpreadsheetValue(row, ["Full Name", "full_name"]),
            gender: readSpreadsheetValue(row, ["Gender", "gender"]),
            student_code: readSpreadsheetValue(row, [
              "Student ID",
              "student_code",
            ]),
            parent_name: readSpreadsheetValue(row, [
              "Parent Name",
              "parent_name",
            ]),
            parent_phone: String(
              readSpreadsheetValue(row, ["Parent Phone", "parent_phone"]),
            ).trim(),
            parent_email:
              readSpreadsheetValue(row, ["Parent Email", "parent_email"]) ||
              null,
            city: readSpreadsheetValue(row, ["City", "city"]),
            address: readSpreadsheetValue(row, ["Address", "address"]),
            elective_subject_1: subjectData.elective_subject_1,
            elective_subject_2: subjectData.elective_subject_2,
            elective_subject_3: subjectData.elective_subject_3,
          },
        );

        void sendRegistrationSmsNotification(result.student, result.class);

        registeredCount += 1;
      } catch (error) {
        errors.push({ row: i + 2, error: error.message });
      }
    }

    return res.json({
      success: true,
      registered_count: registeredCount,
      total_rows: rows.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Bulk upload error:", error);
    return res.status(500).json({ error: "Failed to process CSV file." });
  }
}
const {
  sanitizePhone,
  formatAttendanceSms,
  formatRegistrationSms,
  sendSms,
} = require("../services/smsService");
const {
  parseSubjectMarksSpreadsheetFile,
} = require("../services/termMarksSpreadsheetService");
const classTermMarksApprovalService = require("../services/classTermMarksApprovalService");
const teacherRepository = require("../repositories/teacherRepository");
const attendanceAlertService = require("../services/attendanceAlertService");
const {
  getClassSubjectPlan,
  getStreamLabel,
} = require("../services/classCurriculumService");
const pool = require("../db");

const TERM_ALIASES = {
  first: 1,
  second: 2,
  third: 3,
};

function normalizeTerm(term) {
  if (term === undefined || term === null) {
    return null;
  }

  if (typeof term === "string" && TERM_ALIASES[term.toLowerCase()]) {
    return TERM_ALIASES[term.toLowerCase()];
  }

  const parsed = Number(term);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 3) {
    return null;
  }
  return parsed;
}

function normalizeAttendanceStatus(status) {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();
  if (!["present", "absent", "late"].includes(normalized)) {
    return null;
  }
  return normalized;
}

async function getTeacherProfile(req, res) {
  try {
    const context = await teacherRepository.getClassStudentsWithSubjects(
      req.user.userId,
    );
    const subjectPlan = context.teacherClass
      ? await getClassSubjectPlan(
          context.teacherClass.grade,
          context.teacherClass.stream,
        )
      : null;

    return res.json({
      success: true,
      user: req.user,
      teacher: context.teacher,
      class: context.teacherClass,
      subject_plan: subjectPlan,
    });
  } catch (error) {
    console.error("Teacher profile error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to load teacher profile.",
    });
  }
}

async function getDashboard(req, res) {
  try {
    const context = await teacherRepository.getClassStudentsWithSubjects(
      req.user.userId,
    );
    const subjectPlan = context.teacherClass
      ? await getClassSubjectPlan(
          context.teacherClass.grade,
          context.teacherClass.stream,
        )
      : null;

    return res.json({
      success: true,
      user: req.user,
      teacher: context.teacher,
      class: context.teacherClass,
      subject_plan: subjectPlan,
    });
  } catch (error) {
    console.error("Teacher dashboard error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to load teacher dashboard.",
    });
  }
}

async function getStudentRegistrationTemplate(req, res) {
  try {
    const context = await teacherRepository.getClassStudentsWithSubjects(
      req.user.userId,
    );

    if (!context.teacherClass) {
      return res.status(400).json({
        success: false,
        error: "You are not assigned to an active class.",
      });
    }

    const subjectPlan = await getClassSubjectPlan(
      context.teacherClass.grade,
      context.teacherClass.stream,
    );

    if (!subjectPlan) {
      return res.status(400).json({
        success: false,
        error: "No subject plan is configured for this class.",
      });
    }

    const csv = buildStudentRegistrationTemplateCsv(subjectPlan);
    const gradePart = `grade-${context.teacherClass.grade}`;
    const streamPart = context.teacherClass.stream
      ? `-${String(context.teacherClass.stream).trim().toLowerCase()}`
      : "";
    const fileName = `student-registration-template-${gradePart}${streamPart}.csv`;

    return res
      .status(200)
      .setHeader("Content-Type", "text/csv; charset=utf-8")
      .setHeader("Content-Disposition", `attachment; filename="${fileName}"`)
      .send(csv);
  } catch (error) {
    console.error("Student registration template error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate CSV template.",
    });
  }
}

async function getStudents(req, res) {
  try {
    const context = await teacherRepository.getClassStudentsWithSubjects(
      req.user.userId,
    );

    if (!context.teacherClass) {
      return res.json({
        success: true,
        data: [],
        count: 0,
      });
    }

    return res.json({
      success: true,
      data: context.students,
      count: context.students.length,
    });
  } catch (error) {
    console.error("Fetch students error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch students.",
    });
  }
}

async function getClassDetails(req, res) {
  try {
    const context = await teacherRepository.getClassStudentsWithSubjects(
      req.user.userId,
    );
    const subjectPlan = context.teacherClass
      ? await getClassSubjectPlan(
          context.teacherClass.grade,
          context.teacherClass.stream,
        )
      : null;

    if (!context.teacherClass) {
      return res.json({
        success: true,
        class: null,
        class_teacher: null,
        students: [],
        student_count: 0,
      });
    }

    return res.json({
      success: true,
      class: context.teacherClass,
      class_teacher: context.teacher,
      students: context.students,
      student_count: context.students.length,
      subject_plan: subjectPlan,
    });
  } catch (error) {
    console.error("Teacher class details error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch class details.",
    });
  }
}

async function getStudentSubjects(req, res) {
  try {
    const { studentId } = req.params;
    const context = await teacherRepository.getStudentSubjectsForTeacher(
      req.user.userId,
      studentId,
    );

    if (!context.teacherClass) {
      return res.status(400).json({
        success: false,
        error: "You are not assigned to an active class.",
      });
    }

    if (!context.student) {
      return res.status(404).json({
        success: false,
        error: "Student not found in your class.",
      });
    }

    return res.json({
      success: true,
      student: context.student,
      data: context.subjects,
      count: context.subjects.length,
    });
  } catch (error) {
    console.error("Fetch student subjects error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch student subjects.",
    });
  }
}

async function getSubjects(req, res) {
  try {
    const teacherClass = await teacherRepository.getTeacherCurrentClass(
      pool,
      req.user.userId,
    );

    if (!teacherClass) {
      return res.status(400).json({
        success: false,
        error: "You are not assigned to an active class.",
      });
    }

    const subjects = await teacherRepository.getClassSubjects(
      pool,
      teacherClass.id,
    );

    return res.json({
      success: true,
      data: subjects,
      count: subjects.length,
    });
  } catch (error) {
    console.error("Fetch class subjects error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch class subjects.",
    });
  }
}

function getSpreadsheetUploadFile(req) {
  return req.files?.spreadsheet || req.files?.file || null;
}

function buildUploadRowSummary(parsedRows, teacherStudents) {
  const studentsByCode = new Map(
    teacherStudents.map((student) => [String(student.student_code), student]),
  );

  const seenStudentIds = new Set();
  const resolvedRows = [];
  const errors = [];

  for (const row of parsedRows) {
    const rowStudentCode = String(row.student_code || "").trim();

    if (row.errors.length > 0) {
      errors.push({ row: row.rowNumber, error: row.errors.join(" ") });
      continue;
    }

    const resolvedStudent = studentsByCode.get(rowStudentCode) || null;
    if (!resolvedStudent) {
      errors.push({
        row: row.rowNumber,
        error: "Student code not found in your class.",
      });
      continue;
    }

    if (seenStudentIds.has(String(resolvedStudent.id))) {
      errors.push({
        row: row.rowNumber,
        error: "Duplicate student row detected.",
      });
      continue;
    }

    seenStudentIds.add(String(resolvedStudent.id));
    resolvedRows.push({
      rowNumber: row.rowNumber,
      student_id: String(resolvedStudent.id),
      student_name: resolvedStudent.full_name,
      mark: row.mark,
      comment: row.comment,
    });
  }

  const missingStudents = teacherStudents.filter(
    (student) => !seenStudentIds.has(String(student.id)),
  );

  if (missingStudents.length > 0) {
    errors.push({
      row: null,
      error: `Missing marks for ${missingStudents.length} student(s): ${missingStudents
        .slice(0, 10)
        .map((student) => student.full_name)
        .join(", ")}${missingStudents.length > 10 ? "..." : ""}`,
    });
  }

  return {
    rows: resolvedRows,
    errors,
    missingStudents,
  };
}

async function getTeacherClassRoster(req) {
  const teacherClass = await teacherRepository.getTeacherCurrentClass(
    pool,
    req.user.userId,
  );

  if (!teacherClass) {
    const error = new Error("You are not assigned to an active class.");
    error.statusCode = 400;
    throw error;
  }

  const students = await teacherRepository.getStudentsByClass(
    pool,
    teacherClass.id,
  );

  return {
    teacherClass,
    students,
  };
}

async function getTeacherSubjectRoster(req, subjectId) {
  const teacherClass = await teacherRepository.getTeacherCurrentClass(
    pool,
    req.user.userId,
  );

  if (!teacherClass) {
    const error = new Error("You are not assigned to an active class.");
    error.statusCode = 400;
    throw error;
  }

  const subjectList = await teacherRepository.getClassSubjects(
    pool,
    teacherClass.id,
  );
  const selectedSubject = subjectList.find(
    (item) => String(item.id) === String(subjectId),
  );

  if (!selectedSubject) {
    const error = new Error(
      "Selected subject does not belong to your active class.",
    );
    error.statusCode = 400;
    throw error;
  }

  const students = await teacherRepository.getStudentsBySubjectForClass(
    pool,
    teacherClass.id,
    subjectId,
  );

  return {
    teacherClass,
    subject: selectedSubject,
    students,
  };
}

async function getSubjectTermMarksTemplate(req, res) {
  try {
    const subjectId = String(
      req.query.subject_id || req.query.subjectId || "",
    ).trim();

    if (!subjectId) {
      return res.status(400).json({
        success: false,
        error: "subject_id is required.",
      });
    }

    const { teacherClass, subject, students } = await getTeacherSubjectRoster(
      req,
      subjectId,
    );
    const csv = buildSubjectMarksTemplateCsv(students);
    const subjectSlug = String(subject.name || "subject")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const fileName = `subject-marks-template-grade-${teacherClass.grade}-section-${teacherClass.section}-${subjectSlug || "subject"}.csv`;

    return res
      .status(200)
      .setHeader("Content-Type", "text/csv; charset=utf-8")
      .setHeader("Content-Disposition", `attachment; filename="${fileName}"`)
      .send(csv);
  } catch (error) {
    console.error("Subject marks template error:", error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: "Failed to generate subject marks template.",
    });
  }
}

async function previewSubjectTermMarksUpload(req, res) {
  try {
    const term = normalizeTerm(req.body.term);
    const subjectId = String(
      req.body.subject_id || req.body.subjectId || "",
    ).trim();
    const file = getSpreadsheetUploadFile(req);

    if (!term) {
      return res.status(400).json({
        success: false,
        error: "A valid term is required.",
      });
    }

    if (!subjectId) {
      return res.status(400).json({
        success: false,
        error: "subject_id is required.",
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        error: "Spreadsheet file is required.",
      });
    }

    const parsed = parseSubjectMarksSpreadsheetFile(file);
    const { subject, students } = await getTeacherSubjectRoster(req, subjectId);
    const summary = buildUploadRowSummary(parsed.rows, students);

    return res.json({
      success: true,
      data: {
        term,
        subject_id: subjectId,
        subject_name: subject?.name || null,
        sheet_name: parsed.sheetName,
        total_rows: parsed.rows.length,
        preview_rows: summary.rows.slice(0, 10),
        errors: [...parsed.errors, ...summary.errors],
        missing_students_count: summary.missingStudents.length,
      },
    });
  } catch (error) {
    console.error("Preview term marks spreadsheet error:", error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: "Failed to preview spreadsheet.",
    });
  }
}

async function uploadSubjectTermMarksSpreadsheet(req, res) {
  try {
    const term = normalizeTerm(req.body.term);
    const subjectId = String(
      req.body.subject_id || req.body.subjectId || "",
    ).trim();
    const file = getSpreadsheetUploadFile(req);

    if (!term) {
      return res.status(400).json({
        success: false,
        error: "A valid term is required.",
      });
    }

    if (!subjectId) {
      return res.status(400).json({
        success: false,
        error: "subject_id is required.",
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        error: "Spreadsheet file is required.",
      });
    }

    const parsed = parseSubjectMarksSpreadsheetFile(file);
    const { students } = await getTeacherSubjectRoster(req, subjectId);
    const summary = buildUploadRowSummary(parsed.rows, students);
    const allErrors = [...parsed.errors, ...summary.errors];

    if (allErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Spreadsheet contains validation errors.",
        errors: allErrors,
      });
    }

    const { subject: selectedSubject } = await getTeacherSubjectRoster(
      req,
      subjectId,
    );

    const result =
      await teacherRepository.saveSubjectTermMarksSpreadsheetForTeacher(
        req.user.userId,
        term,
        subjectId,
        summary.rows.map((row) => ({
          student_id: row.student_id,
          mark: row.mark,
        })),
      );

    return res.json({
      success: true,
      message: "Spreadsheet marks saved successfully.",
      data: {
        term,
        subject_id: subjectId,
        subject_name: selectedSubject.name,
        class_id: result.class.id,
        academic_year: result.class.academic_year,
        saved_count: result.savedRows.length,
        submitted_by: req.user.userId,
      },
    });
  } catch (error) {
    console.error("Upload term marks spreadsheet error:", error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: "Failed to upload spreadsheet.",
    });
  }
}

async function registerStudent(req, res) {
  const {
    student_name,
    full_name,
    gender,
    student_code,
    class_id,
    phone,
    email,
    parent_name,
    parent_phone,
    parent_email,
    city,
    address,
    subjects = {},
  } = req.body;

  const normalizedName = String(student_name || full_name || "").trim();
  const normalizedGender = String(gender || "").trim();
  const normalizedStudentCode = String(student_code || "").trim();
  const normalizedParentName = String(parent_name || "").trim();
  const normalizedParentPhone = String(parent_phone || phone || "").trim();
  const normalizedParentEmail = String(parent_email || email || "").trim();
  const normalizedCity = String(city || "").trim();
  const normalizedAddress = String(address || "").trim();

  if (
    !normalizedName ||
    !normalizedGender ||
    !normalizedStudentCode ||
    !normalizedParentName ||
    !normalizedParentPhone ||
    !normalizedCity ||
    !normalizedAddress
  ) {
    return res.status(400).json({
      error:
        "Full name, gender, student code, parent name, parent phone, city, and address are required.",
    });
  }

  try {
    const subjectData = {};
    const pickSubjectValue = (...values) => {
      for (const value of values) {
        if (value === null || value === undefined) {
          continue;
        }
        const normalized = String(value).trim();
        if (normalized) {
          return normalized;
        }
      }
      return "";
    };

    const mergedSubjectInput = {
      elective_subject_1: pickSubjectValue(
        req.body.elective_subject_1,
        subjects.elective_subject_1,
      ),
      elective_subject_2: pickSubjectValue(
        req.body.elective_subject_2,
        subjects.elective_subject_2,
      ),
      elective_subject_3: pickSubjectValue(
        req.body.elective_subject_3,
        subjects.elective_subject_3,
      ),
    };

    for (const [key, value] of Object.entries(mergedSubjectInput)) {
      if (value) {
        subjectData[key] = value;
      }
    }

    const result = await teacherRepository.createStudentForTeacher(
      req.user.userId,
      {
        student_name: normalizedName,
        gender: normalizedGender,
        student_code: normalizedStudentCode,
        class_id,
        parent_name: normalizedParentName,
        parent_phone: normalizedParentPhone,
        parent_email: normalizedParentEmail || null,
        city: normalizedCity,
        address: normalizedAddress,
        elective_subject_1: subjectData.elective_subject_1,
        elective_subject_2: subjectData.elective_subject_2,
        elective_subject_3: subjectData.elective_subject_3,
        // Pass nested subjects too so repository/service can resolve either shape safely.
        subjects: {
          ...(subjects && typeof subjects === "object" ? subjects : {}),
          ...subjectData,
        },
      },
    );
    // Attempt to notify parent via SMS (best-effort)
    void sendRegistrationSmsNotification(result.student, result.class);

    return res.status(201).json({
      success: true,
      student: {
        id: result.student.id,
        full_name: result.student.full_name,
        parent_name: result.student.parent_name,
        parent_phone: result.student.parent_phone,
        parent_email: result.student.parent_email,
        student_code: result.student.student_code,
        created_at: result.student.created_at,
      },
      class: result.class,
      subjects: result.subjects,
    });
  } catch (error) {
    console.error("Student registration error:", error);

    if (error?.code === "23505") {
      return res.status(409).json({
        success: false,
        error: "Student ID already exists.",
      });
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: "Failed to register student. Please try again.",
    });
  }
}

async function saveAttendance(req, res) {
  const { records } = req.body;
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({
      success: false,
      error: "Attendance records are required.",
    });
  }

  const context = await teacherRepository.getClassStudentsWithSubjects(
    req.user.userId,
  );
  if (!context.teacherClass) {
    return res.status(400).json({
      success: false,
      error: "You are not assigned to an active class.",
    });
  }

  const expectedStudentIds = new Set(
    context.students.map((student) => student.id),
  );
  const seen = new Set();
  const normalizedRecords = [];

  for (const record of records) {
    const studentId = String(record?.student_id || "").trim();
    const status = normalizeAttendanceStatus(record?.status);
    const reason = String(record?.reason || "").trim();

    if (!studentId || !status) {
      return res.status(400).json({
        success: false,
        error:
          "Each attendance record must include student_id and valid status.",
      });
    }

    if (status === "late" && !reason) {
      return res.status(400).json({
        success: false,
        error: "Please enter a reason for late attendance.",
      });
    }

    if (seen.has(studentId)) {
      return res.status(400).json({
        success: false,
        error:
          "Duplicate attendance records are not allowed for the same student.",
      });
    }

    if (!expectedStudentIds.has(studentId)) {
      return res.status(400).json({
        success: false,
        error: "One or more students do not belong to your class.",
      });
    }

    seen.add(studentId);
    normalizedRecords.push({
      student_id: studentId,
      status,
      reason: status === "late" ? reason : null,
    });
  }

  if (seen.size !== expectedStudentIds.size) {
    return res.status(400).json({
      success: false,
      error: "Please mark attendance for all students before saving.",
    });
  }

  try {
    const result = await teacherRepository.saveAttendanceForTeacher(
      req.user.userId,
      normalizedRecords,
    );

    // Fire-and-forget: process attendance alerts after saving
    (async () => {
      try {
        await attendanceAlertService.processAttendanceAlerts();
      } catch (err) {
        console.error("processAttendanceAlerts error:", err.message);
      }
    })();

    return res.json({
      success: true,
      message: "Attendance saved successfully.",
      records_count: result.recordsCount,
      attendance_sheet_id: result.attendanceSheet.id,
      attendance_date: result.attendanceSheet.attendance_date,
      submitted_by: req.user.userId,
    });
  } catch (error) {
    console.error("Attendance save error:", error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: "Failed to save attendance.",
    });
  }
}

async function notifyAttendance(req, res) {
  try {
    const context = await teacherRepository.getTodayAttendanceBundle(
      req.user.userId,
    );

    if (!context.teacherClass) {
      return res.status(400).json({
        success: false,
        error: "You are not assigned to an active class.",
      });
    }

    if (!context.attendanceSheet) {
      return res.status(400).json({
        success: false,
        error: "Please save attendance first before notifying parents.",
      });
    }

    if (context.attendanceRows.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No saved attendance records found for today.",
      });
    }

    let sentCount = 0;
    const failedRecipients = [];
    const className = `Grade ${context.teacherClass.grade} Class ${context.teacherClass.section}`;

    for (const row of context.attendanceRows) {
      const recipient = sanitizePhone(row.parent_phone);
      if (!recipient) {
        failedRecipients.push({
          student_id: row.student_id,
          reason: "Missing parent phone number.",
        });
        continue;
      }

      const message = formatAttendanceSms({
        parentName: row.parent_name,
        studentName: row.student_name,
        className,
        attendanceDate: row.attendance_date,
        status: row.status,
        reason: row.reason,
      });

      try {
        await sendSms({ recipient, message });
        sentCount += 1;

        await teacherRepository.insertNotificationLog({
          studentId: row.student_id,
          notificationType: "attendance",
          medium: "sms",
          recipient,
          message,
          status: "sent",
        });
      } catch (smsError) {
        const failReason = smsError?.message || "SMS provider error";
        failedRecipients.push({
          student_id: row.student_id,
          reason: failReason,
        });

        await teacherRepository.insertNotificationLog({
          studentId: row.student_id,
          notificationType: "attendance",
          medium: "sms",
          recipient,
          message,
          status: `failed: ${failReason}`,
        });
      }
    }

    return res.json({
      success: true,
      message: "Attendance notifications processed.",
      total_records: context.attendanceRows.length,
      sent_count: sentCount,
      failed_count: failedRecipients.length,
      failed_recipients: failedRecipients,
      submitted_by: req.user.userId,
    });
  } catch (error) {
    console.error("Attendance notify error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to notify parents.",
    });
  }
}

async function processAttendanceAlerts(req, res) {
  try {
    const result = await attendanceAlertService.processAttendanceAlerts();
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("Process attendance alerts error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to process attendance alerts." });
  }
}

async function saveTermMarks(req, res) {
  const { term, student_id, subject_id, marks } = req.body;
  const normalizedTerm = normalizeTerm(term);

  if (!normalizedTerm || !Array.isArray(marks) || marks.length === 0) {
    return res.status(400).json({
      success: false,
      error:
        "Term, marks array, and either student_id or subject_id are required.",
    });
  }

  // Determine if this is student-based or subject-based marks entry
  if (student_id && !subject_id) {
    // Student-based marks entry (original format)
    return saveStudentTermMarks(req, res, normalizedTerm, student_id, marks);
  } else if (subject_id && !student_id) {
    // Subject-based marks entry (new format)
    return saveSubjectTermMarks(req, res, normalizedTerm, subject_id, marks);
  } else {
    return res.status(400).json({
      success: false,
      error: "Provide either student_id OR subject_id, not both or neither.",
    });
  }
}

async function saveStudentTermMarks(
  req,
  res,
  normalizedTerm,
  student_id,
  marks,
) {
  const context = await teacherRepository.getStudentSubjectsForTeacher(
    req.user.userId,
    student_id,
  );

  if (!context.teacherClass) {
    return res.status(400).json({
      success: false,
      error: "You are not assigned to an active class.",
    });
  }

  if (!context.student) {
    return res.status(404).json({
      success: false,
      error: "Student not found in your class.",
    });
  }

  const subjectIds = new Set(context.subjects.map((subject) => subject.id));
  if (subjectIds.size === 0) {
    return res.status(400).json({
      success: false,
      error: "No subjects found for this student.",
    });
  }

  const markMap = new Map();
  for (const entry of marks) {
    const subjectId = String(entry?.subject_id || "").trim();
    const markValue = Number(entry?.mark);

    if (!subjectId) {
      return res.status(400).json({
        success: false,
        error: "Each mark must include subject_id.",
      });
    }

    if (markMap.has(subjectId)) {
      return res.status(400).json({
        success: false,
        error: "Duplicate subject mark submission detected.",
      });
    }

    if (!Number.isFinite(markValue) || markValue < 0 || markValue > 100) {
      return res.status(400).json({
        success: false,
        error: "Marks must be numeric values between 0 and 100.",
      });
    }

    if (!subjectIds.has(subjectId)) {
      return res.status(400).json({
        success: false,
        error: "One or more subjects do not belong to the selected student.",
      });
    }

    markMap.set(subjectId, markValue);
  }

  if (markMap.size !== subjectIds.size) {
    return res.status(400).json({
      success: false,
      error: "Please enter marks for all registered subjects.",
    });
  }

  try {
    const result = await teacherRepository.saveTermMarksForTeacher(
      req.user.userId,
      student_id,
      normalizedTerm,
      marks.map((entry) => ({
        subject_id: String(entry.subject_id).trim(),
        mark: Number(entry.mark),
      })),
    );

    void classTermMarksApprovalService
      .queueClassTermMarksForApproval({
        classId: result.class.id,
        term: normalizedTerm,
        academicYear: result.class.academic_year,
      })
      .catch((error) => {
        console.error("Queue class term approval error:", error);
      });

    return res.json({
      success: true,
      message: "Term marks saved successfully.",
      data: {
        term: normalizedTerm,
        student_id,
        class_id: result.class.id,
        academic_year: result.class.academic_year,
        saved_count: result.savedRows.length,
        submitted_by: req.user.userId,
      },
    });
  } catch (error) {
    console.error("Term marks save error:", error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: "Failed to save term marks.",
    });
  }
}

async function saveSubjectTermMarks(
  req,
  res,
  normalizedTerm,
  subject_id,
  marks,
) {
  try {
    const saveResult =
      await teacherRepository.saveSubjectTermMarksSpreadsheetForTeacher(
        req.user.userId,
        normalizedTerm,
        subject_id,
        marks,
      );

    const classResult = saveResult.class;
    const subjectResult = saveResult.subject;
    const studentsResult = saveResult.students || [];
    const savedRows = saveResult.savedRows || [];

    void classTermMarksApprovalService
      .queueClassTermMarksForApproval({
        classId: classResult.id,
        term: normalizedTerm,
        academicYear: classResult.academic_year,
      })
      .catch((error) => {
        console.error("Queue class term approval error:", error);
      });

    return res.json({
      success: true,
      message: "Term marks saved successfully.",
      data: {
        term: normalizedTerm,
        subject_id,
        subject_name: subjectResult.name,
        class_id: classResult.id,
        academic_year: classResult.academic_year,
        saved_count: savedRows.length,
        submitted_by: req.user.userId,
      },
    });
  } catch (error) {
    console.error("Subject term marks save error:", error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: "Failed to save term marks.",
    });
  }
}

async function getStudentMarks(req, res) {
  try {
    const { student_id, subject_id, term } = req.query;
    const normalizedTerm = normalizeTerm(term);

    if (!normalizedTerm) {
      return res.status(400).json({
        success: false,
        error: "term is a required query parameter.",
      });
    }

    if (subject_id) {
      const result = await teacherRepository.getSubjectMarksForTeacher(
        req.user.userId,
        subject_id,
        normalizedTerm,
      );

      return res.json({
        success: true,
        data: {
          class: result.class,
          subject: result.subject,
          term: normalizedTerm,
          students: result.students,
        },
      });
    }

    if (!student_id) {
      return res.status(400).json({
        success: false,
        error: "student_id or subject_id must be provided with term.",
      });
    }

    const result = await teacherRepository.getStudentMarksForTeacher(
      req.user.userId,
      student_id,
      normalizedTerm,
    );

    return res.json({
      success: true,
      data: {
        student: result.student,
        class: result.class,
        term: normalizedTerm,
        marks: result.marks,
      },
    });
  } catch (error) {
    console.error("Get student marks error:", error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: "Failed to fetch student marks.",
    });
  }
}

async function updateStudentDetails(req, res) {
  try {
    const studentId = req.params.studentId || req.body.studentId;
    if (!studentId) {
      return res.status(400).json({ error: "Student ID is required." });
    }

    const {
      full_name,
      parent_name,
      parent_phone,
      parent_email,
      city,
      address,
    } = req.body;

    // Validate at least one field is provided
    if (
      !full_name &&
      !parent_name &&
      !parent_phone &&
      !parent_email &&
      !city &&
      !address
    ) {
      return res
        .status(400)
        .json({ error: "At least one field to update is required." });
    }

    const updatedStudent = await teacherRepository.updateStudentDetails(
      studentId,
      req.user.userId,
      {
        full_name,
        parent_name,
        parent_phone,
        parent_email,
        city,
        address,
      },
    );

    return res.json({
      success: true,
      message: "Student details updated successfully.",
      student: updatedStudent,
    });
  } catch (error) {
    console.error("Update student details error:", error);

    if (error.statusCode === 404) {
      return res.status(404).json({ error: error.message });
    }

    return res.status(500).json({
      success: false,
      error: "Failed to update student details.",
    });
  }
}

async function updateTeacherProfile(req, res) {
  try {
    const payload = {
      full_name: req.body?.full_name,
      email: req.body?.email,
      phone: req.body?.phone,
    };

    const updatedTeacher = await teacherRepository.updateTeacherProfile(
      req.user.userId,
      payload,
    );

    return res.json({
      success: true,
      message: "Teacher profile updated successfully.",
      teacher: updatedTeacher,
    });
  } catch (error) {
    console.error("Update teacher profile error:", error);

    if (error.statusCode === 404) {
      return res.status(404).json({ error: error.message });
    }

    return res.status(500).json({
      success: false,
      error: "Failed to update teacher profile.",
    });
  }
}

async function getAttendanceStatus(req, res) {
  try {
    const adminService = require("../services/adminService");

    // Get attendance settings
    const allSettings = await adminService.getAllSettings();
    const openTime = allSettings.attendance_open_time || "07:30";
    const closeTime = allSettings.attendance_close_time || "09:30";
    const timezone = allSettings.attendance_timezone || "Asia/Colombo";

    // Get current time
    const now = new Date();
    const currentHours = String(now.getHours()).padStart(2, "0");
    const currentMinutes = String(now.getMinutes()).padStart(2, "0");
    const currentTime = `${currentHours}:${currentMinutes}`;
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

    // Parse times
    const [openHour, openMin] = openTime.split(":").map(Number);
    const [closeHour, closeMin] = closeTime.split(":").map(Number);
    const openTimeInMinutes = openHour * 60 + openMin;
    const closeTimeInMinutes = closeHour * 60 + closeMin;

    // Determine window status
    let status = "closed";
    let canMarkAttendance = false;
    let canSaveAndNotify = false;

    if (
      currentTimeInMinutes >= openTimeInMinutes &&
      currentTimeInMinutes < closeTimeInMinutes
    ) {
      status = "open";
      canMarkAttendance = true;
      canSaveAndNotify = false; // Can't send SMS before closing time
    } else if (currentTimeInMinutes >= closeTimeInMinutes) {
      status = "closed";
      canMarkAttendance = false;
      canSaveAndNotify = true; // Can send SMS after closing time
    } else {
      status = "not_started";
      canMarkAttendance = false;
      canSaveAndNotify = false;
    }

    return res.json({
      success: true,
      data: {
        status, // 'open', 'closed', 'not_started'
        open_time: openTime,
        close_time: closeTime,
        current_time: currentTime,
        timezone,
        can_mark_attendance: canMarkAttendance,
        can_send_sms: canSaveAndNotify,
        time_to_close: closeTimeInMinutes - currentTimeInMinutes, // in minutes
      },
    });
  } catch (error) {
    console.error("Teacher fetch attendance status error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch attendance status.",
    });
  }
}

module.exports = {
  getDashboard,
  getTeacherProfile,
  getStudentRegistrationTemplate,
  getSubjectTermMarksTemplate,
  getStudents,
  getClassDetails,
  getStudentSubjects,
  getSubjects,
  previewSubjectTermMarksUpload,
  uploadSubjectTermMarksSpreadsheet,
  registerStudent,
  bulkUploadStudents,
  saveAttendance,
  notifyAttendance,
  saveTermMarks,
  getStudentMarks,
  processAttendanceAlerts,
  updateStudentDetails,
  updateTeacherProfile,
  getAttendanceStatus,
};
