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
const pool = require("../db");
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

async function getTermTestReport(req, res) {
  try {
    const [summary, recentRecords] = await Promise.all([
      adminRepository.getTermTestReportSummary(),
      adminRepository.getTermTestReportRecentRows(),
    ]);

    return res.json({
      success: true,
      summary,
      recent_records: recentRecords,
    });
  } catch (error) {
    console.error("Admin term test report error:", error);
    return res.status(500).json({ error: "Internal server error." });
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

    const [records, summary] = await Promise.all([
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
    ]);

    return res.json({
      success: true,
      records,
      summary: summary || {
        total_records: 0,
        average_mark: 0,
        distinction_count: 0,
      },
    });
  } catch (error) {
    console.error("Admin filtered term test report error:", error);
    return res.status(500).json({ error: "Internal server error." });
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
    const { grade, section, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT
        s.id,
        s.name,
        s.parent_name,
        s.parent_phone,
        s.parent_email,
        s.is_active,
        c.grade,
        c.section,
        c.academic_year
      FROM students s
      LEFT JOIN classes c ON c.id = s.class_id
      WHERE s.is_active = true
    `;

    const params = [];

    if (grade && section) {
      const g = Number(grade);
      const sec = String(section).toUpperCase();
      query += ` AND c.grade = $1 AND c.section = $2`;
      params.push(g, sec);
    }

    query += ` ORDER BY s.name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const result = await pool.query(query, params);
    const countQuery = `SELECT COUNT(*) FROM students WHERE is_active = true`;
    const countResult = await pool.query(countQuery);

    return res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      total: parseInt(countResult.rows[0]?.count || 0, 10),
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

    const detail = await adminService.getStudentDetailedInfo(studentId, 5);
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

module.exports = {
  sendEmergencyAlert,
  createClass,
  listClasses,
  getClassDetails,
  listTeachers,
  registerTeacher,
  getAttendanceReport,
  getTermTestReport,
  getFilteredAttendanceReport,
  getFilteredTermTestReport,
  deleteClass,
  getDashboard,
  getStudents,
  getStudentDetail,
  getAttendanceMonitoring,
  getLowAttendanceClasses,
  getAlerts,
  getAttendanceReportRange,
  getPerformanceReport,
  getSettings,
  getSubjectPlans,
  updateSubjectPlan,
  updateSettings,
  promoteStudents,
};
