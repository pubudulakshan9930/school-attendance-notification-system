const {
  sanitizePhone,
  formatAttendanceSms,
  formatRegistrationSms,
  formatTermMarksSms,
  sendSms,
} = require("../services/smsService");
const {
  sendTermMarksEmail,
  isEmailConfigured,
} = require("../services/emailService");
const teacherRepository = require("../repositories/teacherRepository");

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

async function getDashboard(req, res) {
  try {
    const context = await teacherRepository.getClassStudentsWithSubjects(
      req.user.userId,
    );

    return res.json({
      success: true,
      message: "Teacher dashboard access granted",
      user: req.user,
      class: context.teacherClass,
    });
  } catch (error) {
    console.error("Teacher dashboard error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to load teacher dashboard.",
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

async function registerStudent(req, res) {
  const {
    student_name,
    parent_name,
    phone,
    email,
    elective_subject_1,
    elective_subject_2,
    elective_subject_3,
  } = req.body;

  if (!student_name || !parent_name || !phone) {
    return res.status(400).json({
      success: false,
      error: "Student name, parent name, and phone are required.",
    });
  }

  try {
    const result = await teacherRepository.createStudentForTeacher(
      req.user.userId,
      {
        student_name,
        parent_name,
        phone,
        email,
        elective_subject_1,
        elective_subject_2,
        elective_subject_3,
      },
    );
    // Attempt to notify parent via SMS (best-effort)
    (async () => {
      const className = `Grade ${result.class.grade} Class ${result.class.section}`;
      const recipient = sanitizePhone(result.student.parent_phone);
      const message = formatRegistrationSms({
        parentName: result.student.parent_name,
        studentName: result.student.full_name,
        className,
        studentCode: result.student.student_code,
      });

      if (!recipient) {
        try {
          await teacherRepository.insertNotificationLog({
            studentId: result.student.id,
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
          studentId: result.student.id,
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
            studentId: result.student.id,
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
    })();

    return res.status(201).json({
      success: true,
      message: "Student registered successfully.",
      data: {
        id: result.student.id,
        full_name: result.student.full_name,
        parent_name: result.student.parent_name,
        parent_phone: result.student.parent_phone,
        parent_email: result.student.parent_email,
        student_code: result.student.student_code,
        created_at: result.student.created_at,
        class: result.class,
        subjects: result.subjects,
      },
    });
  } catch (error) {
    console.error("Student registration error:", error);

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

    if (!studentId || !status) {
      return res.status(400).json({
        success: false,
        error:
          "Each attendance record must include student_id and valid status.",
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
    normalizedRecords.push({ student_id: studentId, status });
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

async function saveTermMarks(req, res) {
  const { term, student_id, marks } = req.body;
  const normalizedTerm = normalizeTerm(term);

  if (!normalizedTerm || !student_id || !Array.isArray(marks)) {
    return res.status(400).json({
      success: false,
      error: "Term, student_id, and marks array are required.",
    });
  }

  if (marks.length === 0) {
    return res.status(400).json({
      success: false,
      error: "At least one subject mark is required.",
    });
  }

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

    // Attempt to send email notification to parent (best-effort)
    (async () => {
      const className = `Grade ${result.class.grade} Class ${result.class.section}`;
      const recipient = result.student.parent_email;
      const message = `Term marks saved for ${result.student.full_name}`;
      const smsRecipient = sanitizePhone(result.student.parent_phone);
      const smsMessage = formatTermMarksSms({
        parentName: result.student.parent_name,
        term: `Term ${normalizedTerm}`,
        className,
        subjectMarks: result.subjectMarks,
      });
      const emailConfigured = isEmailConfigured();

      if (!emailConfigured) {
        try {
          await teacherRepository.insertNotificationLog({
            studentId: result.student.id,
            notificationType: "term_test",
            medium: "email",
            recipient: recipient || "N/A",
            message,
            status: "failed: email service not configured",
          });
        } catch (logErr) {
          console.error(
            "Notification log error (email not configured):",
            logErr,
          );
        }
      } else if (!recipient || !recipient.includes("@")) {
        try {
          await teacherRepository.insertNotificationLog({
            studentId: result.student.id,
            notificationType: "term_test",
            medium: "email",
            recipient: recipient || "N/A",
            message,
            status: "failed: missing or invalid parent email",
          });
        } catch (logErr) {
          console.error("Notification log error (missing email):", logErr);
        }
      } else {
        try {
          await sendTermMarksEmail({
            recipient,
            parentName: result.student.parent_name,
            studentName: result.student.full_name,
            studentCode: result.student.student_code,
            className,
            academicYear: result.class.academic_year,
            term: normalizedTerm,
            classTeacher: result.teacher.name,
            subjects: result.subjectMarks,
          });

          await teacherRepository.insertNotificationLog({
            studentId: result.student.id,
            notificationType: "term_test",
            medium: "email",
            recipient,
            message,
            status: "sent",
          });
        } catch (emailErr) {
          const failReason = emailErr?.message || "Email service error";
          try {
            await teacherRepository.insertNotificationLog({
              studentId: result.student.id,
              notificationType: "term_test",
              medium: "email",
              recipient,
              message,
              status: `failed: ${failReason}`,
            });
          } catch (logErr) {
            console.error("Notification log error:", logErr);
          }
          console.error("Send term marks email error:", emailErr);
        }
      }

      if (!smsRecipient) {
        try {
          await teacherRepository.insertNotificationLog({
            studentId: result.student.id,
            notificationType: "term_test",
            medium: "sms",
            recipient: "N/A",
            message: smsMessage,
            status: "failed: missing parent phone number",
          });
        } catch (logErr) {
          console.error("Notification log error (missing sms phone):", logErr);
        }
        return;
      }

      try {
        await sendSms({ recipient: smsRecipient, message: smsMessage });

        await teacherRepository.insertNotificationLog({
          studentId: result.student.id,
          notificationType: "term_test",
          medium: "sms",
          recipient: smsRecipient,
          message: smsMessage,
          status: "sent",
        });
      } catch (smsErr) {
        const failReason = smsErr?.message || "SMS service error";
        try {
          await teacherRepository.insertNotificationLog({
            studentId: result.student.id,
            notificationType: "term_test",
            medium: "sms",
            recipient: smsRecipient,
            message: smsMessage,
            status: `failed: ${failReason}`,
          });
        } catch (logErr) {
          console.error("Notification log error:", logErr);
        }
        console.error("Send term marks sms error:", smsErr);
      }
    })();

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

async function getStudentMarks(req, res) {
  try {
    const { student_id, term } = req.query;
    const normalizedTerm = normalizeTerm(term);

    if (!normalizedTerm || !student_id) {
      return res.status(400).json({
        success: false,
        error: "student_id and term are required query parameters.",
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

module.exports = {
  getDashboard,
  getStudents,
  getClassDetails,
  getStudentSubjects,
  registerStudent,
  saveAttendance,
  notifyAttendance,
  saveTermMarks,
  getStudentMarks,
};
