const {
  validateTeacherInput,
  findTeacherByEmailOrTeacherCode,
  createTeacher,
} = require("../services/userService");
const {
  sanitizePhone,
  formatEmergencyAlertSms,
  sendSms,
} = require("../services/smsService");
const adminRepository = require("../repositories/adminRepository");
const adminService = require("../services/adminService");
const backupService = require("../services/backupService");
const classTermMarksApprovalService = require("../services/classTermMarksApprovalService");
const pool = require("../db");
const adminAnalyticsRepository = require("../repositories/adminAnalyticsRepository");
const {
  normalizeClassStream,
  getAllGradeSubjectPlans,
} = require("../services/classCurriculumService");

function normalizeGrade(grade) {
  const parsed = Number(grade);
  return Number.isInteger(parsed) ? parsed : null;
}

function normalizeSection(section) {
  return String(section || "")
    .trim()
    .toUpperCase();
}

function normalizeAcademicYear(academicYear) {
  const parsed = Number(academicYear);
  return Number.isInteger(parsed) ? parsed : null;
}

function normalizeMaxStudents(maxStudents) {
  const parsed = Number(maxStudents);
  return Number.isInteger(parsed) ? parsed : null;
}

function getStreamForGrade(grade, payload) {
  const normalizedGrade = normalizeGrade(grade);
  const normalizedStream = normalizeClassStream(
    payload.stream || payload.class_stream,
  );

  if (normalizedGrade === 12 || normalizedGrade === 13) {
    return normalizedStream;
  }

  return "";
}

function validateClassInput(payload) {
  const grade = normalizeGrade(payload.grade);
  const section = normalizeSection(payload.section || payload.class_section);
  const academicYear = normalizeAcademicYear(
    payload.academic_year || new Date().getFullYear(),
  );
  const maxStudents = normalizeMaxStudents(payload.max_students);
  const stream = getStreamForGrade(grade, payload);

  // For grades 12 and 13, classes are identified by stream only (no section).
  const requiresSection = !(grade === 12 || grade === 13);

  if (
    !grade ||
    !academicYear ||
    !maxStudents ||
    (requiresSection && !section)
  ) {
    return {
      valid: false,
      message:
        "Grade, academic year, and max students are required. Class section is required for grades below 12.",
    };
  }

  if (grade < 1 || grade > 13) {
    return { valid: false, message: "Grade must be between 1 and 13." };
  }

  if ((grade === 12 || grade === 13) && !stream) {
    return {
      valid: false,
      message: "Please select a stream for grades 12 and 13.",
    };
  }

  if (grade < 12 && stream) {
    return {
      valid: false,
      message: "Streams are only required for grades 12 and 13.",
    };
  }

  // Only validate section format for grades that require a section
  if (requiresSection && !/^[A-Z]$/.test(section)) {
    return {
      valid: false,
      message: "Class must be a single capital letter.",
    };
  }

  if (academicYear < 2000 || academicYear > 2100) {
    return { valid: false, message: "Please provide a valid academic year." };
  }

  if (maxStudents < 1 || maxStudents > 200) {
    return {
      valid: false,
      message: "Max students must be between 1 and 200.",
    };
  }

  return {
    valid: true,
    grade,
    section: requiresSection ? section : "",
    academic_year: academicYear,
    max_students: maxStudents,
    stream,
  };
}

function normalizeAlertType(alertType) {
  const normalized = String(alertType || "")
    .trim()
    .toLowerCase();

  if (!["student", "teacher"].includes(normalized)) {
    return null;
  }

  return normalized;
}

async function sendEmergencyAlert(req, res) {
  try {
    const alertType = normalizeAlertType(
      req.body.alert_type || req.body.alertType,
    );
    const alertTitle = String(
      req.body.alert_title || req.body.alertTitle || "",
    ).trim();
    const alertBody = String(
      req.body.alert_body || req.body.alertBody || "",
    ).trim();

    if (!alertType || !alertTitle || !alertBody) {
      return res.status(400).json({
        error:
          "Alert type, alert title, and alert body are required for emergency alerts.",
      });
    }

    const recipientRows =
      alertType === "student"
        ? await adminRepository.getStudentAlertRecipients()
        : await adminRepository.getTeacherAlertRecipients();

    if (recipientRows.length === 0) {
      return res.status(400).json({
        error:
          alertType === "student"
            ? "No active students found to receive the alert."
            : "No active teachers found to receive the alert.",
      });
    }

    const message = formatEmergencyAlertSms({
      alertTitle,
      alertBody,
    });

    let sentCount = 0;
    const failedRecipients = [];

    for (const recipient of recipientRows) {
      const phone = sanitizePhone(recipient.parent_phone || recipient.phone);
      if (!phone) {
        failedRecipients.push({
          id: recipient.id,
          name: recipient.parent_name || recipient.full_name,
          reason: "Missing phone number.",
        });
        continue;
      }

      try {
        await sendSms({ recipient: phone, message });
        sentCount += 1;
      } catch (smsError) {
        failedRecipients.push({
          id: recipient.id,
          name: recipient.parent_name || recipient.full_name,
          reason: smsError?.message || "SMS provider error.",
        });
      }
    }

    return res.json({
      success: true,
      alert_type: alertType,
      total_recipients: recipientRows.length,
      sent_count: sentCount,
      failed_count: failedRecipients.length,
      failed_recipients: failedRecipients,
    });
  } catch (error) {
    console.error("Emergency alert SMS error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to send emergency alert.",
    });
  }
}

async function createClass(req, res) {
  try {
    const validation = validateClassInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }

    const classRecord = await adminRepository.createClassRecord(
      validation.grade,
      validation.section,
      validation.academic_year,
      validation.stream,
      validation.max_students,
    );

    return res.status(201).json({
      success: true,
      class: classRecord,
    });
  } catch (error) {
    console.error("Admin create class error:", error);

    if (error.statusCode === 409) {
      return res.status(409).json({ error: error.message });
    }

    if (error.code === "23514" && error.constraint === "classes_grade_check") {
      return res.status(400).json({
        error:
          "Grade is outside the current database rule. Run backend/migration-fix-classes-grade-check.sql to align the DB with grades 1-13.",
      });
    }

    return res.status(500).json({ error: "Internal server error." });
  }
}

async function listClasses(req, res) {
  try {
    const rows = await adminRepository.getActiveClasses();

    return res.json({
      success: true,
      classes: rows,
      count: rows.length,
    });
  } catch (error) {
    console.error("Admin fetch classes error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
}

async function deleteClass(req, res) {
  try {
    const classId = String(req.params.classId || "").trim();
    if (!classId) {
      return res.status(400).json({ error: "classId is required." });
    }

    const deletedClass = await adminRepository.deleteClassRecord(classId);

    if (!deletedClass) {
      return res.status(404).json({ error: "Class not found." });
    }

    return res.json({
      success: true,
      message: "Class removed successfully.",
      class: deletedClass,
    });
  } catch (error) {
    console.error("Admin delete class error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
}

async function getClassDetails(req, res) {
  try {
    const year = normalizeAcademicYear(req.query.year);
    const grade = normalizeGrade(req.query.grade);
    const section = normalizeSection(req.query.class || req.query.section);
    const stream = normalizeClassStream(req.query.stream);
    const requiresSection = !(grade === 12 || grade === 13);

    if ((grade === 12 || grade === 13) && !stream) {
      return res.status(400).json({
        error: "Stream is required for grades 12 and 13.",
      });
    }

    if (!year || !grade || (requiresSection && !section)) {
      return res.status(400).json({
        error:
          "Year and grade are required. Class is required for grades below 12.",
      });
    }

    const sectionToUse = requiresSection ? section : "";

    const classDetails = await adminRepository.findClassByYearGradeSection(
      year,
      grade,
      sectionToUse,
      stream,
    );

    if (!classDetails) {
      return res.status(404).json({
        error: "Class not found for selected year, grade, and class.",
      });
    }

    const students = await adminRepository.getClassStudents(classDetails.id);

    return res.json({
      success: true,
      class: classDetails,
      students,
      student_count: students.length,
    });
  } catch (error) {
    console.error("Admin class details error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
}

async function listTeachers(req, res) {
  try {
    const rows = await adminRepository.getTeacherSummaryRows();
    const teachers = rows.map((row) => ({
      ...row,
      assigned_classes: Number(row.assigned_classes || 0),
      status: row.is_active ? "active" : "absent",
    }));
    const absentCount = teachers.filter((teacher) => !teacher.is_active).length;

    return res.json({
      success: true,
      teachers,
      count: teachers.length,
      absent_count: absentCount,
    });
  } catch (error) {
    console.error("Admin fetch teachers error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
}

async function registerTeacher(req, res) {
  try {
    const payload = req.body;
    const validation = validateTeacherInput(payload);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }

    const existing = await findTeacherByEmailOrTeacherCode(
      validation.email,
      validation.teacher_code,
    );
    if (existing) {
      return res.status(409).json({
        error: "A teacher with this email or teacher ID already exists.",
      });
    }

    const teacher = await createTeacher({
      full_name: validation.full_name,
      email: validation.email,
      phone: validation.phone,
      teacher_code: validation.teacher_code,
      grade: validation.grade,
      class_section: validation.class_section,
      class_stream: validation.class_stream,
      password: payload.password,
    });

    return res.status(201).json({ success: true, teacher });
  } catch (error) {
    console.error("Admin create teacher error:", error);
    return res.status(error.statusCode || 500).json({
      error: error.message || "Internal server error.",
    });
  }
}

async function updateTeacher(req, res) {
  try {
    const teacherId = req.params.teacherId;
    if (!teacherId) {
      return res.status(400).json({ error: "Teacher ID is required." });
    }

    const payload = {
      full_name: req.body.full_name,
      email: req.body.email,
      phone: req.body.phone,
      teacher_code: req.body.teacher_code,
      is_active: req.body.is_active,
    };

    const updated = await adminRepository.updateTeacherRecord(
      teacherId,
      payload,
    );
    if (!updated) {
      return res.status(404).json({ error: "Teacher not found." });
    }

    return res.json({ success: true, teacher: updated });
  } catch (error) {
    console.error("Admin update teacher error:", error);
    return res.status(500).json({ error: "Failed to update teacher." });
  }
}

async function getAttendanceReport(req, res) {
  try {
    const [summary, recentRecords] = await Promise.all([
      adminRepository.getAttendanceReportSummary(),
      adminRepository.getAttendanceReportRecentRows(),
    ]);

    return res.json({
      success: true,
      summary,
      recent_records: recentRecords,
    });
  } catch (error) {
    console.error("Admin attendance report error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
}

async function getAttendanceTrendAnalytics(req, res) {
  try {
    const rows =
      await adminAnalyticsRepository.getAttendanceTrendLast30SchoolDays();

    return res.json({
      success: true,
      data: {
        series: rows.map((row) => ({
          attendance_date:
            row.attendance_date instanceof Date
              ? row.attendance_date.toISOString().slice(0, 10)
              : String(row.attendance_date || ""),
          present_count: Number(row.present_count || 0),
          late_count: Number(row.late_count || 0),
          absent_count: Number(row.absent_count || 0),
          total_students: Number(row.total_students || 0),
          attendance_percentage: Number(row.attendance_percentage || 0),
        })),
      },
    });
  } catch (error) {
    console.error("Admin attendance trend analytics error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to load attendance analytics.",
    });
  }
}

async function getTodayAttendanceByGradeAnalytics(req, res) {
  try {
    const todayDate = new Date().toISOString().slice(0, 10);
    const rows =
      await adminAnalyticsRepository.getTodayAttendanceByGrade(todayDate);

    return res.json({
      success: true,
      data: {
        report_date: todayDate,
        series: rows.map((row) => ({
          grade: Number(row.grade),
          present_count: Number(row.present_count || 0),
          late_count: Number(row.late_count || 0),
          absent_count: Number(row.absent_count || 0),
          total_students: Number(row.total_students || 0),
          attendance_percentage: Number(row.attendance_percentage || 0),
        })),
      },
    });
  } catch (error) {
    console.error("Admin attendance by grade analytics error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to load attendance by grade analytics.",
    });
  }
}

async function getTodayAttendanceStatusDistributionAnalytics(req, res) {
  try {
    const todayDate = new Date().toISOString().slice(0, 10);
    const rows =
      await adminAnalyticsRepository.getTodayAttendanceStatusDistribution(
        todayDate,
      );

    const totalCount = rows.reduce(
      (sum, row) => sum + Number(row.count || 0),
      0,
    );

    return res.json({
      success: true,
      data: {
        report_date: todayDate,
        total_count: totalCount,
        series: rows.map((row) => ({
          status: String(row.status || ""),
          count: Number(row.count || 0),
          percentage:
            totalCount > 0
              ? Number(((Number(row.count || 0) / totalCount) * 100).toFixed(2))
              : 0,
        })),
      },
    });
  } catch (error) {
    console.error(
      "Admin attendance status distribution analytics error:",
      error,
    );
    return res.status(500).json({
      success: false,
      error: "Failed to load attendance status distribution analytics.",
    });
  }
}

function normalizeAnalyticsFilterValue(value, parser) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = parser(value);
  return Number.isNaN(parsed) ? null : parsed;
}

async function getSubjectPerformanceFilterOptions(req, res) {
  try {
    const academicYear = normalizeAnalyticsFilterValue(
      req.query.academic_year || req.query.academicYear,
      (value) => Number(value),
    );
    const grade = normalizeAnalyticsFilterValue(req.query.grade, (value) =>
      Number(value),
    );

    const filters =
      await adminAnalyticsRepository.getSubjectPerformanceFilterOptions(
        academicYear,
        grade,
      );

    return res.json({
      success: true,
      data: {
        academic_years: filters.academic_years || [],
        grades: filters.grades || [],
        subjects: filters.subjects || [],
        terms: [
          { value: 1, label: "First Term" },
          { value: 2, label: "Second Term" },
          { value: 3, label: "Third Term" },
        ],
      },
    });
  } catch (error) {
    console.error("Subject performance filter options error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to load subject performance filters.",
    });
  }
}

async function getSubjectPerformanceAnalytics(req, res) {
  try {
    const academicYear = normalizeAnalyticsFilterValue(
      req.query.academic_year || req.query.academicYear,
      (value) => Number(value),
    );
    const grade = normalizeAnalyticsFilterValue(req.query.grade, (value) =>
      Number(value),
    );
    const subjectId = String(
      req.query.subject_id || req.query.subjectId || "",
    ).trim();
    const term = normalizeAnalyticsFilterValue(req.query.term, (value) =>
      Number(value),
    );

    const rows = await adminAnalyticsRepository.getSubjectPerformanceSeries(
      academicYear,
      grade,
      subjectId,
      term,
    );

    return res.json({
      success: true,
      data: {
        series: rows.map((row) => ({
          label: String(row.class_label || ""),
          average_marks: Number(row.average_marks || 0),
        })),
      },
    });
  } catch (error) {
    console.error("Subject performance analytics error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to load subject performance analytics.",
    });
  }
}

async function getTermTestReport(req, res) {
  try {
    await classTermMarksApprovalService.reconcileMissingClassTermReviews();

    const [summary, recentRecords, pendingReviews, pendingCount] =
      await Promise.all([
        adminRepository.getTermTestReportSummary(),
        adminRepository.getTermTestReportRecentRows(),
        classTermMarksApprovalService.getPendingClassTermReviews(),
        classTermMarksApprovalService.getPendingClassTermReviewsCount(),
      ]);

    return res.json({
      success: true,
      summary,
      recent_records: recentRecords,
      pending_reviews: pendingReviews,
      pending_count: Number(pendingCount?.pending_count || 0),
    });
  } catch (error) {
    console.error("Admin term test report error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
}

async function getTermMarksReviewDetail(req, res) {
  try {
    const classId = String(
      req.query.class_id || req.query.classId || "",
    ).trim();
    const term = Number(req.query.term);
    const academicYear = Number(
      req.query.academic_year || req.query.academicYear,
    );

    if (!classId || !Number.isInteger(term) || !academicYear) {
      return res.status(400).json({
        success: false,
        error: "class_id, term, and academic_year are required.",
      });
    }

    const [snapshot, reviewResult] = await Promise.all([
      classTermMarksApprovalService.getClassTermSnapshot(
        classId,
        term,
        academicYear,
      ),
      pool.query(
        `
          SELECT
            id,
            class_id,
            term,
            academic_year,
            review_status,
            admin_notified_at,
            admin_notification_error,
            approved_by,
            approved_at,
            parent_sms_status,
            parent_sms_sent_at,
            parent_sms_error,
            created_at,
            updated_at
          FROM term_class_marks_reviews
          WHERE class_id = $1
            AND term = $2
            AND academic_year = $3
          LIMIT 1
        `,
        [classId, term, academicYear],
      ),
    ]);

    const review = reviewResult.rows[0] || null;
    if (!review) {
      return res.status(404).json({
        success: false,
        error: "Term marks review not found.",
      });
    }

    return res.json({
      success: true,
      review,
      snapshot,
    });
  } catch (error) {
    console.error("Admin term marks review detail error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to load term marks review details.",
    });
  }
}

async function approveTermMarks(req, res) {
  try {
    const classId = String(req.body.class_id || req.body.classId || "").trim();
    const term = Number(req.body.term);
    const academicYear = Number(
      req.body.academic_year || req.body.academicYear,
    );

    if (!classId || !Number.isInteger(term) || !academicYear) {
      return res.status(400).json({
        success: false,
        error: "class_id, term, and academic_year are required.",
      });
    }

    const result = await classTermMarksApprovalService.approveClassTermMarks({
      classId,
      term,
      academicYear,
      approvedBy: req.user.userId,
    });

    return res.json({
      success: true,
      message: "Term marks approved successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Admin approve term marks error:", error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: "Failed to approve term marks.",
    });
  }
}

async function getFilteredAttendanceReport(req, res) {
  try {
    const { year, grade, class: classSection, date, stream } = req.query;

    if (!year || !grade || !classSection || !date) {
      return res.status(400).json({
        error: "Missing required parameters: year, grade, class, date",
      });
    }

    const yearNum = Number(year);
    const gradeNum = Number(grade);
    const classStr = String(classSection).toUpperCase();
    const dateStr = String(date);
    const streamValue = normalizeClassStream(stream);

    if ((gradeNum === 12 || gradeNum === 13) && !streamValue) {
      return res.status(400).json({
        error: "Stream is required for grades 12 and 13.",
      });
    }

    const [records, summary] = await Promise.all([
      adminRepository.getFilteredAttendanceRows(
        yearNum,
        gradeNum,
        classStr,
        dateStr,
        streamValue,
      ),
      adminRepository.getFilteredAttendanceSummary(
        yearNum,
        gradeNum,
        classStr,
        dateStr,
        streamValue,
      ),
    ]);

    return res.json({
      success: true,
      records,
      summary: summary || {
        present_count: 0,
        absent_count: 0,
        late_count: 0,
      },
    });
  } catch (error) {
    console.error("Admin filtered attendance report error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
}

async function getFilteredTermTestReport(req, res) {
  try {
    const { year, grade, class: classSection, term, stream } = req.query;

    if (!year || !grade || !classSection || !term) {
      return res.status(400).json({
        error: "Missing required parameters: year, grade, class, term",
      });
    }

    const yearNum = Number(year);
    const gradeNum = Number(grade);
    const classStr = String(classSection).toUpperCase();
    const termNum = Number(term);
    const streamValue = normalizeClassStream(stream);

    if ((gradeNum === 12 || gradeNum === 13) && !streamValue) {
      return res.status(400).json({
        error: "Stream is required for grades 12 and 13.",
      });
    }

    const [records, summary, pendingReviews] = await Promise.all([
      adminRepository.getFilteredTermTestRows(
        yearNum,
        gradeNum,
        classStr,
        termNum,
        streamValue,
      ),
      adminRepository.getFilteredTermTestSummary(
        yearNum,
        gradeNum,
        classStr,
        termNum,
        streamValue,
      ),
      classTermMarksApprovalService.getPendingClassTermReviews(100),
    ]);

    const filteredPendingReviews = pendingReviews.filter((review) => {
      const classInfo = review.class_info || {};
      const reviewGrade = Number(classInfo.grade);
      const reviewSection = String(classInfo.section || "").toUpperCase();
      const reviewStream = normalizeClassStream(classInfo.stream);
      const matchesYear = Number(review.academic_year) === yearNum;
      const matchesGrade = reviewGrade === gradeNum;
      const matchesTerm = Number(review.term) === termNum;

      if (!matchesYear || !matchesGrade || !matchesTerm) {
        return false;
      }

      if (gradeNum === 12 || gradeNum === 13) {
        return reviewStream === streamValue;
      }

      return reviewSection === classStr;
    });

    return res.json({
      success: true,
      records,
      summary: summary || {
        total_records: 0,
        average_mark: 0,
        distinction_count: 0,
      },
      pending_reviews: filteredPendingReviews,
      pending_count: filteredPendingReviews.length,
    });
  } catch (error) {
    console.error("Admin filtered term test report error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
}

async function getTermTestReportCsv(req, res) {
  try {
    const { year, grade, class: classSection, term, stream } = req.query;

    if (!year || !grade || !classSection || !term) {
      return res.status(400).json({
        error: "Missing required parameters: year, grade, class, term",
      });
    }

    const yearNum = Number(year);
    const gradeNum = Number(grade);
    const classStr = String(classSection).toUpperCase();
    const termNum = Number(term);
    const streamValue = normalizeClassStream(stream);

    if ((gradeNum === 12 || gradeNum === 13) && !streamValue) {
      return res
        .status(400)
        .json({ error: "Stream is required for grades 12 and 13." });
    }

    // Fetch raw rows and pivot in Node
    const rows = await adminRepository.getFilteredTermTestRows(
      yearNum,
      gradeNum,
      classStr,
      termNum,
      streamValue,
    );

    // Build subject list (unique, ordered by appearance)
    const subjects = [];
    const subjectSet = new Set();
    const studentsMap = new Map(); // key: student_code||name -> { student_code, student_name, marks: { subject: mark } }

    rows.forEach((r) => {
      const subj = r.subject_name || "";
      if (subj && !subjectSet.has(subj)) {
        subjectSet.add(subj);
        subjects.push(subj);
      }

      const studentKey = (r.student_code || "") + "::" + (r.student_name || "");
      if (!studentsMap.has(studentKey)) {
        studentsMap.set(studentKey, {
          student_code: r.student_code || "",
          student_name: r.student_name || "",
          marks: {},
        });
      }

      const student = studentsMap.get(studentKey);
      student.marks[r.subject_name || ""] = r.mark;
    });

    // Build CSV header
    const headerCols = ["Student Code", "Student Name", ...subjects];

    // Escape function
    const escape = (v) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return '"' + s.replace(/"/g, '""') + '"';
    };

    let csv = headerCols.map(escape).join(",") + "\n";

    // Build rows sorted by student name
    const students = Array.from(studentsMap.values()).sort((a, b) => {
      return String(a.student_name || "").localeCompare(
        String(b.student_name || ""),
      );
    });

    students.forEach((stu) => {
      const row = [stu.student_code || "", stu.student_name || ""];
      subjects.forEach((subj) => {
        const mark = stu.marks?.[subj];
        row.push(Number.isFinite(Number(mark)) ? String(mark) : "");
      });
      csv += row.map(escape).join(",") + "\n";
    });

    const gradePart = String(gradeNum || "");
    const classPart = classStr || streamValue || "class";
    const fileName = `term-marks-grade-${gradePart}-class-${classPart}-term-${termNum}-${yearNum}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return res.send(csv);
  } catch (error) {
    console.error("Generate term test CSV error:", error);
    return res.status(500).json({ error: "Failed to generate CSV." });
  }
}

async function getDashboard(req, res) {
  try {
    const [
      totalStudents,
      totalTeachers,
      todayAttendance,
      lowStudents,
      settings,
    ] = await Promise.all([
      adminService.getTotalActiveStudents(),
      adminService.getTotalActiveTeachers(),
      adminService.getTodayAttendanceSummary(),
      adminService.getLowAttendanceStudents(10, {}),
      adminService.getAllSettings(),
    ]);

    const riskCounts = { urgent: 0, warning: 0, good: 0 };
    lowStudents.forEach((student) => {
      const category = adminService.getRiskCategory(
        student.attendance_percentage,
        settings,
      );
      riskCounts[category] += 1;
    });

    return res.json({
      success: true,
      data: {
        total_students: totalStudents,
        total_teachers: totalTeachers,
        present_count_today: todayAttendance.present_count,
        today_attendance_rate: todayAttendance.attendance_rate,
        absent_count_today: todayAttendance.absent_count,
        late_count_today: todayAttendance.late_count,
        risk_counts: riskCounts,
      },
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard.",
    });
  }
}

async function getStudents(req, res) {
  try {
    const { search = "", status = "", limit = 200, offset = 0 } = req.query;

    const [students, total] = await Promise.all([
      adminRepository.getStudentSummaryRows({
        search,
        status,
        limit,
        offset,
      }),
      adminRepository.getStudentSummaryCount({ search, status }),
    ]);

    return res.json({
      success: true,
      students,
      count: students.length,
      total,
    });
  } catch (error) {
    console.error("Admin fetch students error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch students.",
    });
  }
}

async function getStudentDetail(req, res) {
  try {
    const { studentId } = req.params;

    const detail = await adminRepository.getStudentRecordById(studentId);
    if (!detail) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    return res.json({
      success: true,
      data: detail,
    });
  } catch (error) {
    console.error("Admin fetch student detail error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch student details.",
    });
  }
}

async function updateStudent(req, res) {
  try {
    const { studentId } = req.params;
    if (!studentId) {
      return res.status(400).json({
        success: false,
        error: "Student ID is required.",
      });
    }

    const payload = {
      full_name:
        typeof req.body.full_name === "string"
          ? req.body.full_name.trim()
          : req.body.full_name,
      parent_name:
        typeof req.body.parent_name === "string"
          ? req.body.parent_name.trim()
          : req.body.parent_name,
      parent_phone:
        typeof req.body.parent_phone === "string"
          ? req.body.parent_phone.trim()
          : req.body.parent_phone,
      parent_email:
        typeof req.body.parent_email === "string"
          ? req.body.parent_email.trim()
          : req.body.parent_email,
      student_code:
        typeof req.body.student_code === "string"
          ? req.body.student_code.trim()
          : req.body.student_code,
      gender:
        typeof req.body.gender === "string"
          ? req.body.gender.trim()
          : req.body.gender,
      city:
        typeof req.body.city === "string"
          ? req.body.city.trim()
          : req.body.city,
      address:
        typeof req.body.address === "string"
          ? req.body.address.trim()
          : req.body.address,
      is_active:
        req.body.is_active === undefined
          ? undefined
          : req.body.is_active === true ||
            req.body.is_active === "true" ||
            req.body.is_active === 1 ||
            req.body.is_active === "1",
    };

    const hasEditableField = Object.values(payload).some(
      (value) => value !== undefined,
    );

    if (!hasEditableField) {
      return res.status(400).json({
        success: false,
        error: "At least one field to update is required.",
      });
    }

    const requiredFields = [
      "full_name",
      "parent_name",
      "parent_phone",
      "student_code",
    ];
    for (const fieldName of requiredFields) {
      if (payload[fieldName] !== undefined && payload[fieldName] === "") {
        return res.status(400).json({
          success: false,
          error: `${fieldName.replace(/_/g, " ")} cannot be empty.`,
        });
      }
    }

    const student = await adminRepository.updateStudentRecord(
      studentId,
      payload,
    );
    if (!student) {
      return res.status(404).json({
        success: false,
        error: "Student not found.",
      });
    }

    return res.json({
      success: true,
      message: "Student details updated successfully.",
      student,
    });
  } catch (error) {
    console.error("Admin update student error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        error: "Student code already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Failed to update student details.",
    });
  }
}

async function deleteStudent(req, res) {
  try {
    const { studentId } = req.params;
    if (!studentId) {
      return res.status(400).json({
        success: false,
        error: "Student ID is required.",
      });
    }

    const student = await adminRepository.deleteStudentRecord(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        error: "Student not found.",
      });
    }

    return res.json({
      success: true,
      message: "Student deleted successfully.",
      student,
    });
  } catch (error) {
    console.error("Admin delete student error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to delete student.",
    });
  }
}

async function getAttendanceMonitoring(req, res) {
  try {
    const { date = new Date().toISOString().split("T")[0], classId } =
      req.query;

    if (!classId) {
      return res.status(400).json({
        success: false,
        message: "classId is required.",
      });
    }

    const [classAttendance, students] = await Promise.all([
      adminService.getClassAttendanceRate(classId, date),
      pool.query(
        `
        SELECT
          s.id,
          s.name,
          ar.status,
          ar.attendance_date
        FROM students s
        LEFT JOIN attendance_records ar
          ON ar.student_id = s.id
          AND ar.attendance_date = $1
        WHERE s.class_id = $2
          AND s.is_active = true
        ORDER BY s.name ASC
      `,
        [date, classId],
      ),
    ]);

    return res.json({
      success: true,
      data: {
        date,
        attendance_rate: classAttendance.attendance_rate,
        total_students: classAttendance.total_students,
        present_count: classAttendance.present_count,
        absent_count: classAttendance.absent_count,
        late_count: classAttendance.late_count,
        students: students.rows,
      },
    });
  } catch (error) {
    console.error("Admin attendance monitoring error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch attendance data.",
    });
  }
}

async function getLowAttendanceClasses(req, res) {
  try {
    const { date = new Date().toISOString().split("T")[0] } = req.query;
    const settings = await adminService.getAllSettings();
    const threshold = parseFloat(settings.attendance_threshold || 80);

    const classes = await adminService.getLowAttendanceClasses(date, threshold);

    return res.json({
      success: true,
      data: classes,
      count: classes.length,
      threshold,
    });
  } catch (error) {
    console.error("Admin low attendance classes error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch low-attendance classes.",
    });
  }
}

async function getAlerts(req, res) {
  try {
    const { from, to, classId = null, limit = 100 } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: "from and to dates are required.",
      });
    }

    const alerts = await adminService.getAlerts(
      from,
      to,
      classId,
      parseInt(limit, 10),
    );

    return res.json({
      success: true,
      data: alerts,
      count: alerts.length,
    });
  } catch (error) {
    console.error("Admin fetch alerts error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch alerts.",
    });
  }
}

async function getAttendanceReportRange(req, res) {
  try {
    const { from, to, classId = null } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: "from and to dates are required.",
      });
    }

    const dailyRecords = await adminService.getDailyAttendanceReport(
      from,
      to,
      classId,
    );

    const avgAttendance =
      dailyRecords.length > 0
        ? dailyRecords.reduce((sum, r) => sum + r.attendance_rate, 0) /
          dailyRecords.length
        : 0;

    const lowStudents = await adminService.getLowAttendanceStudents(10, {});

    return res.json({
      success: true,
      data: {
        daily_records: dailyRecords,
        average_attendance_rate: Math.round(avgAttendance * 100) / 100,
        top_10_low_attendance: lowStudents,
      },
    });
  } catch (error) {
    console.error("Admin attendance report range error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate attendance report.",
    });
  }
}

async function getPerformanceReport(req, res) {
  try {
    const { term, classId } = req.query;

    if (!term) {
      return res.status(400).json({
        success: false,
        message: "term is required.",
      });
    }

    const termNum = Number(term);
    if (!Number.isInteger(termNum) || termNum < 1 || termNum > 3) {
      return res.status(400).json({
        success: false,
        message: "term must be 1, 2, or 3.",
      });
    }

    let subjectAverages = [];
    if (classId) {
      subjectAverages = await adminService.getSubjectAveragesByClass(
        classId,
        termNum,
      );
    }

    const lowestPerforming = await adminService.getLowestPerformingStudents(
      termNum,
      10,
    );

    return res.json({
      success: true,
      data: {
        term: termNum,
        subject_averages: subjectAverages,
        lowest_performing_students: lowestPerforming,
      },
    });
  } catch (error) {
    console.error("Admin performance report error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate performance report.",
    });
  }
}

async function getSettings(req, res) {
  try {
    const settings = await adminService.getAllSettings();

    return res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("Admin fetch settings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch settings.",
    });
  }
}

async function getSubjectPlans(req, res) {
  try {
    // Fetch custom plans from database, fallback to hardcoded defaults
    const dbPlans = await adminRepository.getAllCustomSubjectPlans();
    const plans = dbPlans.length > 0 ? dbPlans : getAllGradeSubjectPlans();

    return res.json({
      success: true,
      data: plans,
      count: plans.length,
    });
  } catch (error) {
    console.error("Admin subject plans error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch subject plans.",
    });
  }
}

async function updateSubjectPlan(req, res) {
  try {
    const { grade, stream = "", plan } = req.body;

    if (!grade || !plan) {
      return res.status(400).json({
        success: false,
        error: "grade and plan are required.",
      });
    }

    const normalizedGrade = Number(grade);
    if (
      !Number.isInteger(normalizedGrade) ||
      normalizedGrade < 1 ||
      normalizedGrade > 13
    ) {
      return res.status(400).json({
        success: false,
        error: "grade must be a number between 1 and 13.",
      });
    }

    const result = await adminRepository.updateSubjectPlan(
      normalizedGrade,
      String(stream),
      plan,
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        error: "Subject plan not found for the specified grade and stream.",
      });
    }

    return res.json({
      success: true,
      message: "Subject plan updated successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Update subject plan error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update subject plan.",
    });
  }
}

async function updateSettings(req, res) {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== "object") {
      return res.status(400).json({
        success: false,
        message: "settings object is required.",
      });
    }

    const updated = {};
    for (const [key, value] of Object.entries(settings)) {
      const result = await adminService.updateSetting(key, String(value));
      updated[result.key] = result.value;
    }

    return res.json({
      success: true,
      data: updated,
      message: "Settings updated successfully.",
    });
  } catch (error) {
    console.error("Admin update settings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update settings.",
    });
  }
}

async function getAttendanceSettings(req, res) {
  try {
    const allSettings = await adminService.getAllSettings();
    const openTime = allSettings.attendance_open_time || "07:30";
    const closeTime = allSettings.attendance_close_time || "09:30";
    const timezone = allSettings.attendance_timezone || "Asia/Colombo";

    return res.json({
      success: true,
      data: {
        open_time: openTime,
        close_time: closeTime,
        timezone: timezone,
      },
    });
  } catch (error) {
    console.error("Admin fetch attendance settings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch attendance settings.",
    });
  }
}

async function updateAttendanceSettings(req, res) {
  try {
    const { open_time, close_time, timezone } = req.body;

    if (!open_time || !close_time) {
      return res.status(400).json({
        success: false,
        message: "open_time and close_time are required.",
      });
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(open_time) || !timeRegex.test(close_time)) {
      return res.status(400).json({
        success: false,
        message: "Time must be in HH:MM format.",
      });
    }

    await adminService.updateSetting("attendance_open_time", open_time);
    await adminService.updateSetting("attendance_close_time", close_time);
    if (timezone) {
      await adminService.updateSetting("attendance_timezone", timezone);
    }

    return res.json({
      success: true,
      data: {
        open_time,
        close_time,
        timezone: timezone || "Asia/Colombo",
      },
      message: "Attendance settings updated successfully.",
    });
  } catch (error) {
    console.error("Admin update attendance settings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update attendance settings.",
    });
  }
}

async function promoteStudents(req, res) {
  try {
    const { fromGrade, fromSection, toGrade, toSection } = req.body;

    if (!fromGrade || !fromSection || !toGrade || !toSection) {
      return res.status(400).json({
        success: false,
        message: "fromGrade, fromSection, toGrade, toSection are required.",
      });
    }

    const fromG = Number(fromGrade);
    const fromSec = String(fromSection).toUpperCase();
    const toG = Number(toGrade);
    const toSec = String(toSection).toUpperCase();

    if (!Number.isInteger(fromG) || !Number.isInteger(toG)) {
      return res.status(400).json({
        success: false,
        message: "Grades must be integers.",
      });
    }

    // Find source and destination classes
    const currentYear = new Date().getFullYear();
    const fromClass = await adminRepository.findClassByYearGradeSection(
      currentYear,
      fromG,
      fromSec,
    );
    const toClass = await adminRepository.findClassByYearGradeSection(
      currentYear,
      toG,
      toSec,
    );

    if (!fromClass) {
      return res.status(404).json({
        success: false,
        message: `Source class (Grade ${fromG}, Section ${fromSec}) not found.`,
      });
    }

    if (!toClass) {
      return res.status(404).json({
        success: false,
        message: `Destination class (Grade ${toG}, Section ${toSec}) not found.`,
      });
    }

    const result = await adminService.promoteStudentsToClass(
      fromClass.id,
      toClass.id,
    );

    return res.json({
      success: true,
      data: {
        moved_count: result.moved_count,
        from_class: {
          grade: fromG,
          section: fromSec,
        },
        to_class: {
          grade: toG,
          section: toSec,
        },
        message: `${result.moved_count} students promoted successfully.`,
      },
    });
  } catch (error) {
    console.error("Admin promote students error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to promote students.",
    });
  }
}

async function getBackupModule(req, res) {
  try {
    const data = await backupService.getBackupDashboardData();
    return res.json({
      success: true,
      message:
        data.history.length > 0
          ? "Backup history loaded."
          : "No Backup Available",
      data,
    });
  } catch (error) {
    console.error("Admin backup overview error:", error);
    return res.status(500).json({
      success: false,
      message: "Backup Failed",
      error: error.message,
    });
  }
}

async function createBackup(req, res) {
  try {
    const result = await backupService.createDatabaseBackup();
    return res.json({
      success: true,
      message: "Backup Created Successfully",
      data: result,
    });
  } catch (error) {
    console.error("Admin backup creation error:", error);
    return res.status(500).json({
      success: false,
      message: "Backup Failed",
      error: error.message,
    });
  }
}

async function downloadBackup(req, res) {
  try {
    const { backup, file_path } = await backupService.getBackupForDownload(
      req.params.backupId,
    );
    return res.download(file_path, backup.backup_name || backup.file_name);
  } catch (error) {
    console.error("Admin backup download error:", error);
    return res.status(404).json({
      success: false,
      message: error.message || "Backup not found.",
    });
  }
}

async function restoreBackup(req, res) {
  try {
    const confirmed =
      req.body?.confirm === true || req.body?.confirm === "true";

    if (!confirmed) {
      return res.status(400).json({
        success: false,
        message: "Restore confirmation required.",
      });
    }

    const result = await backupService.restoreDatabaseFromBackup(
      req.params.backupId,
    );

    return res.json({
      success: true,
      message: "Restore Successful",
      data: result,
    });
  } catch (error) {
    console.error("Admin backup restore error:", error);
    return res.status(500).json({
      success: false,
      message: "Restore Failed",
      error: error.message,
    });
  }
}

module.exports = {
  sendEmergencyAlert,
  createClass,
  listClasses,
  getClassDetails,
  listTeachers,
  registerTeacher,
  updateTeacher,
  getAttendanceReport,
  getAttendanceTrendAnalytics,
  getTodayAttendanceByGradeAnalytics,
  getTodayAttendanceStatusDistributionAnalytics,
  getSubjectPerformanceFilterOptions,
  getSubjectPerformanceAnalytics,
  getTermTestReport,
  getTermMarksReviewDetail,
  getTermTestReportCsv,
  approveTermMarks,
  getFilteredAttendanceReport,
  getFilteredTermTestReport,
  deleteClass,
  getDashboard,
  getStudents,
  getStudentDetail,
  updateStudent,
  deleteStudent,
  getAttendanceMonitoring,
  getLowAttendanceClasses,
  getAlerts,
  getAttendanceReportRange,
  getPerformanceReport,
  getSettings,
  getSubjectPlans,
  updateSubjectPlan,
  updateSettings,
  getAttendanceSettings,
  updateAttendanceSettings,
  promoteStudents,
  getBackupModule,
  createBackup,
  downloadBackup,
  restoreBackup,
};
