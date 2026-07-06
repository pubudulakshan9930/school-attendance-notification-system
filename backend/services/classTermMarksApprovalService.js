const pool = require("../db");
const teacherRepository = require("../repositories/teacherRepository");
const { sanitizePhone, formatTermMarksSms, sendSms } = require("./smsService");
const { isEmailConfigured, sendTermMarksEmail } = require("./emailService");
const {
  getClassSubjectPlan,
  getStreamLabel,
} = require("./classCurriculumService");

let classTermReviewsInitPromise = null;

async function ensureClassTermReviewsTableExists() {
  if (!classTermReviewsInitPromise) {
    classTermReviewsInitPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS term_class_marks_reviews (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
          term SMALLINT NOT NULL CHECK (term IN (1, 2, 3)),
          academic_year SMALLINT NOT NULL,
          review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'notified', 'approved')),
          admin_notified_at TIMESTAMPTZ,
          admin_notification_error TEXT,
          approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
          approved_at TIMESTAMPTZ,
          parent_sms_status TEXT NOT NULL DEFAULT 'pending' CHECK (parent_sms_status IN ('pending', 'sent', 'failed')),
          parent_sms_sent_at TIMESTAMPTZ,
          parent_sms_error TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (class_id, term, academic_year)
        )
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_term_class_marks_reviews_class
          ON term_class_marks_reviews(class_id)
      `);
    })().catch((error) => {
      classTermReviewsInitPromise = null;
      throw error;
    });
  }

  await classTermReviewsInitPromise;
}

function normalizeTerm(term) {
  const parsed = Number(term);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 3) {
    return null;
  }

  return parsed;
}

function buildClassLabel(classInfo) {
  const grade = Number.isFinite(Number(classInfo?.grade))
    ? `Grade ${classInfo.grade}`
    : "Class";
  const section = String(classInfo?.section || "").trim();
  const streamLabel = getStreamLabel(classInfo?.stream);

  if (streamLabel) {
    return `${grade} ${streamLabel}`;
  }

  if (section) {
    return `${grade} Class ${section}`;
  }

  return grade;
}

function buildAdminReviewSms({ classLabel, term, studentCount, subjectCount }) {
  return `${classLabel} term ${term} marks are ready for approval. ${studentCount} student(s), ${subjectCount} subject(s) in the table.`;
}

function hasValidMark(mark) {
  return mark !== null && mark !== undefined && Number.isFinite(Number(mark));
}

async function getClassTermSnapshot(classId, term, academicYear) {
  await ensureClassTermReviewsTableExists();

  const normalizedTerm = normalizeTerm(term);
  if (!normalizedTerm) {
    const error = new Error("A valid term is required.");
    error.statusCode = 400;
    throw error;
  }

  const classResult = await pool.query(
    `
      SELECT
        c.id,
        c.grade,
        c.section,
        c.stream,
        c.academic_year,
        c.teacher_id,
        u.full_name AS teacher_name
      FROM classes c
      LEFT JOIN users u ON u.id = c.teacher_id
      WHERE c.id = $1
        AND c.academic_year = $2
      LIMIT 1
    `,
    [classId, academicYear],
  );

  if (classResult.rows.length === 0) {
    const error = new Error("Class not found for the selected academic year.");
    error.statusCode = 404;
    throw error;
  }

  const classInfo = classResult.rows[0];
  const classPlan = getClassSubjectPlan(classInfo.grade, classInfo.stream);
  const fixedSubjectNames = Array.isArray(classPlan?.fixed_subjects)
    ? classPlan.fixed_subjects
        .map((subject) => String(subject || "").trim())
        .filter(Boolean)
    : [];

  const studentRows = await pool.query(
    `
      SELECT
        s.id AS student_id,
        s.full_name AS student_name,
        s.student_code,
        s.parent_name,
        s.parent_phone,
        s.parent_email,
        sub.id AS subject_id,
        sub.name AS subject_name,
        tt.mark
      FROM student_class_assignments sca
      JOIN students s ON s.id = sca.student_id
      JOIN student_subjects ss ON ss.student_id = s.id
      JOIN subjects sub ON sub.id = ss.subject_id
      LEFT JOIN term_tests tt
        ON tt.student_id = s.id
       AND tt.class_id = sca.class_id
       AND tt.term = $2
       AND tt.academic_year = $3
       AND tt.subject_id = sub.id
      WHERE sca.class_id = $1
        AND sca.removed_at IS NULL
        AND s.is_active = true
      ORDER BY s.full_name ASC, sub.name ASC
    `,
    [classId, normalizedTerm, academicYear],
  );

  const studentsMap = new Map();
  const subjectsMap = new Map();

  for (const row of studentRows.rows) {
    if (!studentsMap.has(row.student_id)) {
      studentsMap.set(row.student_id, {
        student_id: row.student_id,
        student_name: row.student_name,
        student_code: row.student_code,
        parent_name: row.parent_name,
        parent_phone: row.parent_phone,
        parent_email: row.parent_email,
        marks: {},
        assigned_subject_names: [],
      });
    }

    if (!subjectsMap.has(row.subject_id)) {
      subjectsMap.set(row.subject_id, {
        subject_id: row.subject_id,
        subject_name: row.subject_name,
      });
    }

    const student = studentsMap.get(row.student_id);
    student.marks[row.subject_name] =
      row.mark === null || row.mark === undefined ? null : Number(row.mark);
    student.assigned_subject_names.push(row.subject_name);
  }

  for (const student of studentsMap.values()) {
    for (const fixedSubjectName of fixedSubjectNames) {
      if (!(fixedSubjectName in student.marks)) {
        student.marks[fixedSubjectName] = null;
      }

      if (!subjectsMap.has(fixedSubjectName)) {
        subjectsMap.set(fixedSubjectName, {
          subject_id: fixedSubjectName,
          subject_name: fixedSubjectName,
        });
      }
    }
  }

  const subjects = Array.from(subjectsMap.values()).sort((a, b) =>
    a.subject_name.localeCompare(b.subject_name),
  );
  const students = Array.from(studentsMap.values())
    .map((student) => {
      const totalMark = Object.values(student.marks).reduce(
        (sum, mark) => sum + (Number.isFinite(Number(mark)) ? Number(mark) : 0),
        0,
      );

      return {
        ...student,
        total_mark: totalMark,
      };
    })
    .sort((left, right) => {
      if (left.total_mark !== right.total_mark) {
        return right.total_mark - left.total_mark;
      }

      const nameComparison = left.student_name.localeCompare(
        right.student_name,
      );
      if (nameComparison !== 0) {
        return nameComparison;
      }

      return String(left.student_code || "").localeCompare(
        String(right.student_code || ""),
      );
    })
    .map((student, index) => ({
      ...student,
      rank: index + 1,
    }));

  const complete =
    students.length > 0 &&
    students.every((student) => {
      const requiredSubjectNames = new Set([
        ...fixedSubjectNames,
        ...student.assigned_subject_names,
      ]);

      return Array.from(requiredSubjectNames).every((subjectName) =>
        hasValidMark(student.marks[subjectName]),
      );
    });

  return {
    classInfo,
    term: normalizedTerm,
    academicYear,
    subjects,
    students,
    complete,
  };
}

async function getReviewRow(classId, term, academicYear) {
  await ensureClassTermReviewsTableExists();

  const result = await pool.query(
    `
      SELECT *
      FROM term_class_marks_reviews
      WHERE class_id = $1
        AND term = $2
        AND academic_year = $3
      LIMIT 1
    `,
    [classId, term, academicYear],
  );

  return result.rows[0] || null;
}

async function insertPendingReview(classId, term, academicYear) {
  await ensureClassTermReviewsTableExists();

  const result = await pool.query(
    `
      INSERT INTO term_class_marks_reviews (
        class_id,
        term,
        academic_year,
        review_status,
        parent_sms_status
      )
      VALUES ($1, $2, $3, 'pending', 'pending')
      RETURNING *
    `,
    [classId, term, academicYear],
  );

  return result.rows[0];
}

async function markReviewNotified(classId, term, academicYear) {
  await ensureClassTermReviewsTableExists();

  const result = await pool.query(
    `
      UPDATE term_class_marks_reviews
      SET
        review_status = 'notified',
        admin_notified_at = NOW(),
        admin_notification_error = NULL,
        updated_at = NOW()
      WHERE class_id = $1
        AND term = $2
        AND academic_year = $3
      RETURNING *
    `,
    [classId, term, academicYear],
  );

  return result.rows[0] || null;
}

async function markReviewNotificationFailed(
  classId,
  term,
  academicYear,
  errorMessage,
) {
  await ensureClassTermReviewsTableExists();

  const result = await pool.query(
    `
      UPDATE term_class_marks_reviews
      SET
        review_status = 'pending',
        admin_notification_error = $4,
        updated_at = NOW()
      WHERE class_id = $1
        AND term = $2
        AND academic_year = $3
      RETURNING *
    `,
    [classId, term, academicYear, errorMessage],
  );

  return result.rows[0] || null;
}

async function markReviewApproved(classId, term, academicYear, approvedBy) {
  await ensureClassTermReviewsTableExists();

  const result = await pool.query(
    `
      UPDATE term_class_marks_reviews
      SET
        review_status = 'approved',
        approved_by = $4,
        approved_at = NOW(),
        updated_at = NOW()
      WHERE class_id = $1
        AND term = $2
        AND academic_year = $3
      RETURNING *
    `,
    [classId, term, academicYear, approvedBy],
  );

  return result.rows[0] || null;
}

async function markParentSmsStatus(
  classId,
  term,
  academicYear,
  status,
  errorMessage = null,
) {
  await ensureClassTermReviewsTableExists();

  const result = await pool.query(
    `
      UPDATE term_class_marks_reviews
      SET
        parent_sms_status = $4,
        parent_sms_sent_at = CASE WHEN $4 = 'sent' THEN NOW() ELSE parent_sms_sent_at END,
        parent_sms_error = $5,
        updated_at = NOW()
      WHERE class_id = $1
        AND term = $2
        AND academic_year = $3
      RETURNING *
    `,
    [classId, term, academicYear, status, errorMessage],
  );

  return result.rows[0] || null;
}

async function notifyAdminsAboutReadyMarks(snapshot) {
  await ensureClassTermReviewsTableExists();

  const adminsResult = await pool.query(
    `
      SELECT id, full_name, phone
      FROM users
      WHERE role = 'admin'
        AND is_active = true
      ORDER BY full_name ASC
    `,
  );

  const classLabel = buildClassLabel(snapshot.classInfo);
  const message = buildAdminReviewSms({
    classLabel,
    term: snapshot.term,
    studentCount: snapshot.students.length,
    subjectCount: snapshot.subjects.length,
  });

  const failures = [];
  let sentCount = 0;

  for (const admin of adminsResult.rows) {
    const recipient = sanitizePhone(admin.phone);
    if (!recipient) {
      failures.push({
        id: admin.id,
        name: admin.full_name,
        reason: "Missing admin phone number.",
      });
      continue;
    }

    try {
      await sendSms({ recipient, message });
      sentCount += 1;
    } catch (error) {
      failures.push({
        id: admin.id,
        name: admin.full_name,
        reason: error?.message || "SMS provider error.",
      });
    }
  }

  return { sentCount, failedCount: failures.length, failures, message };
}

async function queueClassTermMarksForApproval({ classId, term, academicYear }) {
  await ensureClassTermReviewsTableExists();

  const snapshot = await getClassTermSnapshot(classId, term, academicYear);
  if (!snapshot.complete) {
    return { queued: false, reason: "incomplete", snapshot };
  }

  let review = await getReviewRow(classId, snapshot.term, academicYear);
  if (!review) {
    review = await insertPendingReview(classId, snapshot.term, academicYear);
  } else if (
    review.review_status === "approved" ||
    review.parent_sms_status === "sent" ||
    review.parent_sms_status === "failed"
  ) {
    await markReviewNotified(classId, snapshot.term, academicYear);
    return { queued: true, notified: false, snapshot, review };
  }

  if (review?.review_status === "notified" && review.admin_notified_at) {
    return { queued: true, notified: false, snapshot, review };
  }

  const adminNotification = await notifyAdminsAboutReadyMarks(snapshot);
  if (adminNotification.sentCount > 0) {
    review = await markReviewNotified(classId, snapshot.term, academicYear);
  } else {
    review = await markReviewNotificationFailed(
      classId,
      snapshot.term,
      academicYear,
      adminNotification.failures[0]?.reason || "No admin recipients available.",
    );
  }

  return {
    queued: true,
    notified: adminNotification.sentCount > 0,
    admin_notification: adminNotification,
    snapshot,
    review,
  };
}

async function listMissingClassReviewContexts(limit = 100) {
  await ensureClassTermReviewsTableExists();

  const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 500));
  const result = await pool.query(
    `
      SELECT DISTINCT
        tt.class_id,
        tt.term,
        tt.academic_year
      FROM term_tests tt
      JOIN classes c ON c.id = tt.class_id
      LEFT JOIN term_class_marks_reviews r
        ON r.class_id = tt.class_id
       AND r.term = tt.term
       AND r.academic_year = tt.academic_year
      WHERE r.id IS NULL
      ORDER BY tt.academic_year DESC, tt.term ASC
      LIMIT $1
    `,
    [safeLimit],
  );

  return result.rows;
}

async function reconcileMissingClassTermReviews(limit = 100) {
  await ensureClassTermReviewsTableExists();

  const contexts = await listMissingClassReviewContexts(limit);
  const createdReviews = [];
  const notifiedContexts = [];

  for (const context of contexts) {
    const snapshot = await getClassTermSnapshot(
      context.class_id,
      context.term,
      context.academic_year,
    );

    if (!snapshot.complete) {
      continue;
    }

    const queueResult = await queueClassTermMarksForApproval({
      classId: context.class_id,
      term: context.term,
      academicYear: context.academic_year,
    });

    if (queueResult.review) {
      createdReviews.push(queueResult.review);
    }

    if (queueResult.notified) {
      notifiedContexts.push({
        class_id: context.class_id,
        term: context.term,
        academic_year: context.academic_year,
      });
    }
  }

  return {
    created_count: createdReviews.length,
    notified_count: notifiedContexts.length,
    created_reviews: createdReviews,
    notified_contexts: notifiedContexts,
  };
}

async function approveClassTermMarks({
  classId,
  term,
  academicYear,
  approvedBy,
}) {
  await ensureClassTermReviewsTableExists();

  const snapshot = await getClassTermSnapshot(classId, term, academicYear);
  if (!snapshot.complete) {
    const error = new Error(
      "All student marks must be completed before approval.",
    );
    error.statusCode = 400;
    throw error;
  }

  let review = await getReviewRow(classId, snapshot.term, academicYear);
  if (!review) {
    review = await insertPendingReview(classId, snapshot.term, academicYear);
  }

  review = await markReviewApproved(
    classId,
    snapshot.term,
    academicYear,
    approvedBy,
  );

  const failedRecipients = [];
  const emailFailures = [];
  let emailSentCount = 0;

  for (const student of snapshot.students) {
    const parentPhone = sanitizePhone(
      student.parent_phone ||
        student.parentPhone ||
        student.parent_phone_number,
    );
    const subjectMarks = (
      Array.isArray(student.assigned_subject_names)
        ? student.assigned_subject_names
        : snapshot.subjects.map((s) => s.subject_name)
    ).map((subjectName) => ({
      name: subjectName,
      mark: student.marks ? student.marks[subjectName] : null,
    }));
    const message = formatTermMarksSms({
      parentName: student.parent_name,
      studentName: student.student_name,
      term: `Term ${snapshot.term}`,
      className: buildClassLabel(snapshot.classInfo),
      studentRank: student.rank,
      totalMark: student.total_mark,
      subjectMarks,
    });

    if (!parentPhone) {
      failedRecipients.push({
        student_id: student.student_id,
        name: student.student_name,
        reason: "Missing parent phone number.",
      });
    } else {
      try {
        await sendSms({ recipient: parentPhone, message });
        await teacherRepository.insertNotificationLog({
          studentId: student.student_id,
          notificationType: "term_test",
          medium: "sms",
          recipient: parentPhone,
          message,
          status: "sent",
        });
      } catch (error) {
        const failReason = error?.message || "SMS service error.";
        failedRecipients.push({
          student_id: student.student_id,
          name: student.student_name,
          reason: failReason,
        });

        await teacherRepository.insertNotificationLog({
          studentId: student.student_id,
          notificationType: "term_test",
          medium: "sms",
          recipient: parentPhone,
          message,
          status: `failed: ${failReason}`,
        });
      }
    }

    const parentEmail = String(
      student.parent_email || student.parentEmail || "",
    ).trim();
    if (parentEmail && isEmailConfigured()) {
      try {
        await sendTermMarksEmail({
          recipient: parentEmail,
          parentName: student.parent_name,
          studentName: student.student_name,
          studentCode: student.student_code,
          academicYear: snapshot.academicYear,
          className: buildClassLabel(snapshot.classInfo),
          classTeacher: snapshot.classInfo?.teacher_name || "Class Teacher",
          term: `Term ${snapshot.term}`,
          studentRank: student.rank,
          totalMark: student.total_mark,
          subjectMarks,
        });

        emailSentCount += 1;
        await teacherRepository.insertNotificationLog({
          studentId: student.student_id,
          notificationType: "term_test",
          medium: "email",
          recipient: parentEmail,
          message,
          status: "sent",
        });
      } catch (error) {
        const failReason = error?.message || "Email service error.";
        emailFailures.push({
          student_id: student.student_id,
          name: student.student_name,
          reason: failReason,
        });

        await teacherRepository.insertNotificationLog({
          studentId: student.student_id,
          notificationType: "term_test",
          medium: "email",
          recipient: parentEmail,
          message,
          status: `failed: ${failReason}`,
        });
      }
    }
  }

  review = await markParentSmsStatus(
    classId,
    snapshot.term,
    academicYear,
    failedRecipients.length === 0 ? "sent" : "failed",
    failedRecipients.length === 0
      ? null
      : `Failed for ${failedRecipients.length} student(s).`,
  );

  return {
    approved: true,
    snapshot,
    review,
    parent_sms: {
      sent_count: snapshot.students.length - failedRecipients.length,
      failed_count: failedRecipients.length,
      failed_recipients: failedRecipients,
    },
    parent_email: {
      sent_count: emailSentCount,
      failed_count: emailFailures.length,
      failed_recipients: emailFailures,
    },
  };
}

async function getPendingClassTermReviews(limit = 25) {
  await ensureClassTermReviewsTableExists();

  const safeLimit = Math.max(1, Math.min(Number(limit) || 25, 100));
  const result = await pool.query(
    `
      SELECT
        r.id,
        r.class_id,
        r.term,
        r.academic_year,
        r.review_status,
        r.admin_notified_at,
        r.approved_at,
        r.parent_sms_status,
        c.grade,
        c.section,
        c.stream
      FROM term_class_marks_reviews r
      JOIN classes c ON c.id = r.class_id
      WHERE r.review_status IN ('pending', 'notified')
      ORDER BY COALESCE(r.admin_notified_at, r.created_at) DESC
      LIMIT $1
    `,
    [safeLimit],
  );

  const pendingReviews = [];
  for (const row of result.rows) {
    const snapshot = await getClassTermSnapshot(
      row.class_id,
      row.term,
      row.academic_year,
    );

    if (!snapshot.complete) {
      continue;
    }

    pendingReviews.push({
      ...row,
      class_info: snapshot.classInfo,
      subjects: snapshot.subjects,
      students: snapshot.students,
      class_label: buildClassLabel(snapshot.classInfo),
    });
  }

  return pendingReviews;
}

async function getPendingClassTermReviewsCount() {
  await ensureClassTermReviewsTableExists();

  const result = await pool.query(`
    SELECT class_id, term, academic_year
    FROM term_class_marks_reviews
    WHERE review_status IN ('pending', 'notified')
  `);

  let pendingCount = 0;
  for (const row of result.rows) {
    const snapshot = await getClassTermSnapshot(
      row.class_id,
      row.term,
      row.academic_year,
    );

    if (snapshot.complete) {
      pendingCount += 1;
    }
  }

  return { pending_count: String(pendingCount) };
}

module.exports = {
  approveClassTermMarks,
  getClassTermSnapshot,
  getPendingClassTermReviews,
  getPendingClassTermReviewsCount,
  queueClassTermMarksForApproval,
  reconcileMissingClassTermReviews,
};
