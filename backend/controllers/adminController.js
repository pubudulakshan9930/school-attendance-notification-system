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

function validateClassInput(payload) {
  const grade = normalizeGrade(payload.grade);
  const section = normalizeSection(payload.section || payload.class_section);
  const academicYear = normalizeAcademicYear(
    payload.academic_year || new Date().getFullYear(),
  );

  if (!grade || !section || !academicYear) {
    return {
      valid: false,
      message: "Grade, class section, and academic year are required.",
    };
  }

  if (grade < 1 || grade > 13) {
    return { valid: false, message: "Grade must be between 1 and 13." };
  }

  if (!/^[A-Z]$/.test(section)) {
    return {
      valid: false,
      message: "Class must be a single capital letter.",
    };
  }

  if (academicYear < 2000 || academicYear > 2100) {
    return { valid: false, message: "Please provide a valid academic year." };
  }

  return {
    valid: true,
    grade,
    section,
    academic_year: academicYear,
  };
}

function normalizeAlertType(alertType) {
  const normalized = String(alertType || "").trim().toLowerCase();

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

async function getClassDetails(req, res) {
  try {
    const year = normalizeAcademicYear(req.query.year);
    const grade = normalizeGrade(req.query.grade);
    const section = normalizeSection(req.query.class || req.query.section);

    if (!year || !grade || !section) {
      return res.status(400).json({
        error: "Year, grade, and class are required.",
      });
    }

    const classDetails = await adminRepository.findClassByYearGradeSection(
      year,
      grade,
      section,
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
    const { year, grade, class: classSection, date } = req.query;

    if (!year || !grade || !classSection || !date) {
      return res.status(400).json({
        error: "Missing required parameters: year, grade, class, date",
      });
    }

    const yearNum = Number(year);
    const gradeNum = Number(grade);
    const classStr = String(classSection).toUpperCase();
    const dateStr = String(date);

    const [records, summary] = await Promise.all([
      adminRepository.getFilteredAttendanceRows(
        yearNum,
        gradeNum,
        classStr,
        dateStr,
      ),
      adminRepository.getFilteredAttendanceSummary(
        yearNum,
        gradeNum,
        classStr,
        dateStr,
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
    const { year, grade, class: classSection, term } = req.query;

    if (!year || !grade || !classSection || !term) {
      return res.status(400).json({
        error: "Missing required parameters: year, grade, class, term",
      });
    }

    const yearNum = Number(year);
    const gradeNum = Number(grade);
    const classStr = String(classSection).toUpperCase();
    const termNum = Number(term);

    const [records, summary] = await Promise.all([
      adminRepository.getFilteredTermTestRows(
        yearNum,
        gradeNum,
        classStr,
        termNum,
      ),
      adminRepository.getFilteredTermTestSummary(
        yearNum,
        gradeNum,
        classStr,
        termNum,
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
};
