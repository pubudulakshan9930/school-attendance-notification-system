const pool = require("../db");
const teacherRepository = require("../repositories/teacherRepository");
const { sanitizePhone, formatTermMarksSms, sendSms } = require("./smsService");
const { getStreamLabel } = require("./classCurriculumService");

let termMarksReviewsInitPromise = null;

async function ensureTermMarksReviewsTableExists() {
  if (!termMarksReviewsInitPromise) {
    termMarksReviewsInitPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS term_marks_reviews (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
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
          UNIQUE (student_id, class_id, term, academic_year)
        )
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_term_marks_reviews_student
          ON term_marks_reviews(student_id)
      `);
    })().catch((error) => {
      termMarksReviewsInitPromise = null;
      throw error;
    });
  }

  await termMarksReviewsInitPromise;
}

function normalizeTerm(term) {
  if (term === undefined || term === null) {
    return null;
  }

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

function buildAdminReviewSms({ studentName, term, classLabel, subjectCount }) {
  return `Term ${term} marks are ready for approval for ${studentName} in ${classLabel}. ${subjectCount} subject(s) completed.`;
}

async function getTermMarksSnapshot(studentId, classId, term, academicYear) {
  await ensureTermMarksReviewsTableExists();

  const studentResult = await pool.query(
    `
      SELECT
        s.id AS student_id,
        s.full_name,
        s.parent_name,
        s.parent_phone,
        s.parent_email,
        s.student_code,
        c.id AS class_id,
        c.grade,
        c.section,
        c.stream,
        c.academic_year
      FROM students s
      JOIN student_class_assignments sca
        ON sca.student_id = s.id
       AND sca.class_id = $2
       AND sca.removed_at IS NULL
      JOIN classes c ON c.id = sca.class_id
      WHERE s.id = $1
        AND s.is_active = true
        AND c.academic_year = $3
      LIMIT 1
    `,
    [studentId, classId, academicYear],
  );

  if (studentResult.rows.length === 0) {
    const error = new Error("Student not found in the selected class.");
    error.statusCode = 404;
    throw error;
  }

  const student = studentResult.rows[0];

  const subjectsResult = await pool.query(
    `
      SELECT
        sub.id AS subject_id,
        sub.name AS subject_name,
        tt.mark
      FROM student_subjects ss
      JOIN subjects sub ON sub.id = ss.subject_id
      LEFT JOIN term_tests tt
        ON tt.student_id = ss.student_id
       AND tt.class_id = $2
       AND tt.term = $3
       AND tt.academic_year = $4
       AND tt.subject_id = ss.subject_id
      WHERE ss.student_id = $1
      ORDER BY sub.name ASC
    `,
    [studentId, classId, term, academicYear],
  );

  const subjectMarks = subjectsResult.rows.map((row) => ({
    subject_id: row.subject_id,
    name: row.subject_name,
    mark: row.mark === null || row.mark === undefined ? null : Number(row.mark),
  }));

  const complete =
    subjectMarks.length > 0 &&
    subjectMarks.every((entry) => Number.isFinite(entry.mark));

  return {
    student,
    classInfo: student,
    subjectMarks,
    complete,
  };
}

async function listMissingReviewContexts(limit = 100) {
  await ensureTermMarksReviewsTableExists();

  const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 500));
  const result = await pool.query(
    `
      SELECT
        tt.student_id,
        tt.class_id,
        tt.term,
        tt.academic_year
      FROM term_tests tt
      JOIN students s
        ON s.id = tt.student_id
       AND s.is_active = true
      JOIN student_class_assignments sca
        ON sca.student_id = tt.student_id
       AND sca.class_id = tt.class_id
       AND sca.removed_at IS NULL
      LEFT JOIN term_marks_reviews r
        ON r.student_id = tt.student_id
       AND r.class_id = tt.class_id
       AND r.term = tt.term
       AND r.academic_year = tt.academic_year
      WHERE r.id IS NULL
      GROUP BY tt.student_id, tt.class_id, tt.term, tt.academic_year
      HAVING COUNT(*) = (
        SELECT COUNT(*)
        FROM student_subjects ss
        WHERE ss.student_id = tt.student_id
      )
      ORDER BY tt.academic_year DESC, tt.term ASC
      LIMIT $1
    `,
    [safeLimit],
  );

  return result.rows;
}

async function reconcileMissingTermMarksReviews(limit = 100) {
  await ensureTermMarksReviewsTableExists();

  const contexts = await listMissingReviewContexts(limit);
  const createdReviews = [];
  const notifiedContexts = [];

  for (const context of contexts) {
    const snapshot = await getTermMarksSnapshot(
      context.student_id,
      context.class_id,
      context.term,
      context.academic_year,
    );

    if (!snapshot.complete) {
      continue;
    }

    snapshot.term = context.term;

    const review = await insertPendingReview(
      context.student_id,
      context.class_id,
      context.term,
      context.academic_year,
    );

    createdReviews.push(review);

    const adminNotification = await notifyAdminsAboutReadyMarks(snapshot);
    if (adminNotification.sentCount > 0) {
      await markReviewNotified(
        context.student_id,
        context.class_id,
        context.term,
        context.academic_year,
      );
      notifiedContexts.push({
        ...context,
        sentCount: adminNotification.sentCount,
      });
    } else {
      await markReviewNotificationFailed(
        context.student_id,
        context.class_id,
        context.term,
        context.academic_year,
        adminNotification.failures[0]?.reason ||
          "No admin recipients available.",
      );
    }
  }

  return {
    created_count: createdReviews.length,
    notified_count: notifiedContexts.length,
    created_reviews: createdReviews,
    notified_contexts: notifiedContexts,
  };
}

async function getReviewRow(studentId, classId, term, academicYear) {
  await ensureTermMarksReviewsTableExists();

  const result = await pool.query(
    `
      SELECT *
      FROM term_marks_reviews
      WHERE student_id = $1
        AND class_id = $2
        AND term = $3
        AND academic_year = $4
      LIMIT 1
    `,
    [studentId, classId, term, academicYear],
  );

  return result.rows[0] || null;
}

async function insertPendingReview(studentId, classId, term, academicYear) {
  await ensureTermMarksReviewsTableExists();

  const result = await pool.query(
    `
      INSERT INTO term_marks_reviews (
        student_id,
        class_id,
        term,
        academic_year,
        review_status,
        parent_sms_status
      )
      VALUES ($1, $2, $3, $4, 'pending', 'pending')
      RETURNING *
    `,
    [studentId, classId, term, academicYear],
  );

  return result.rows[0];
}

async function resetApprovedReview(studentId, classId, term, academicYear) {
  await ensureTermMarksReviewsTableExists();

  const result = await pool.query(
    `
      UPDATE term_marks_reviews
      SET
        review_status = 'pending',
        admin_notified_at = NULL,
        admin_notification_error = NULL,
        approved_by = NULL,
        approved_at = NULL,
        parent_sms_status = 'pending',
        parent_sms_sent_at = NULL,
        parent_sms_error = NULL,
        updated_at = NOW()
      WHERE student_id = $1
        AND class_id = $2
        AND term = $3
        AND academic_year = $4
      RETURNING *
    `,
    [studentId, classId, term, academicYear],
  );

  return result.rows[0] || null;
}

async function markReviewNotified(studentId, classId, term, academicYear) {
  await ensureTermMarksReviewsTableExists();

  const result = await pool.query(
    `
      UPDATE term_marks_reviews
      SET
        review_status = 'notified',
        admin_notified_at = NOW(),
        admin_notification_error = NULL,
        updated_at = NOW()
      WHERE student_id = $1
        AND class_id = $2
        AND term = $3
        AND academic_year = $4
      RETURNING *
    `,
    [studentId, classId, term, academicYear],
  );

  return result.rows[0] || null;
}

async function markReviewNotificationFailed(
  studentId,
  classId,
  term,
  academicYear,
  errorMessage,
) {
  await ensureTermMarksReviewsTableExists();

  const result = await pool.query(
    `
      UPDATE term_marks_reviews
      SET
        review_status = 'pending',
        admin_notification_error = $5,
        updated_at = NOW()
      WHERE student_id = $1
        AND class_id = $2
        AND term = $3
        AND academic_year = $4
      RETURNING *
    `,
    [studentId, classId, term, academicYear, errorMessage],
  );

  return result.rows[0] || null;
}

async function markReviewApproved(
  studentId,
  classId,
  term,
  academicYear,
  approvedBy,
) {
  await ensureTermMarksReviewsTableExists();

  const result = await pool.query(
    `
      UPDATE term_marks_reviews
      SET
        review_status = 'approved',
        approved_by = $5,
        approved_at = NOW(),
        updated_at = NOW()
      WHERE student_id = $1
        AND class_id = $2
        AND term = $3
        AND academic_year = $4
      RETURNING *
    `,
    [studentId, classId, term, academicYear, approvedBy],
  );

  return result.rows[0] || null;
}

async function markParentSmsStatus(
  studentId,
  classId,
  term,
  academicYear,
  status,
  errorMessage = null,
) {
  await ensureTermMarksReviewsTableExists();

  const result = await pool.query(
    `
      UPDATE term_marks_reviews
      SET
        parent_sms_status = $5,
        parent_sms_sent_at = CASE WHEN $5 = 'sent' THEN NOW() ELSE parent_sms_sent_at END,
        parent_sms_error = $6,
        updated_at = NOW()
      WHERE student_id = $1
        AND class_id = $2
        AND term = $3
        AND academic_year = $4
      RETURNING *
    `,
    [studentId, classId, term, academicYear, status, errorMessage],
  );

  return result.rows[0] || null;
}

async function notifyAdminsAboutReadyMarks(snapshot) {
  await ensureTermMarksReviewsTableExists();

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
    studentName: snapshot.student.full_name,
    term: snapshot.term,
    classLabel,
    subjectCount: snapshot.subjectMarks.length,
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

  return {
    sentCount,
    failedCount: failures.length,
    failures,
    message,
  };
}

async function queueStudentTermMarksForApproval({
  studentId,
  classId,
  term,
  academicYear,
}) {
  await ensureTermMarksReviewsTableExists();

  const normalizedTerm = normalizeTerm(term);

  if (!normalizedTerm) {
    const error = new Error("A valid term is required.");
    error.statusCode = 400;
    throw error;
  }

  const snapshot = await getTermMarksSnapshot(
    studentId,
    classId,
    normalizedTerm,
    academicYear,
  );

  if (!snapshot.complete) {
    return {
      queued: false,
      reason: "incomplete",
      snapshot,
    };
  }

  snapshot.term = normalizedTerm;

  let review = await getReviewRow(
    studentId,
    classId,
    normalizedTerm,
    academicYear,
  );

  if (!review) {
    review = await insertPendingReview(
      studentId,
      classId,
      normalizedTerm,
      academicYear,
    );
  } else if (
    review.review_status === "approved" ||
    review.parent_sms_status === "sent" ||
    review.parent_sms_status === "failed"
  ) {
    review = await resetApprovedReview(
      studentId,
      classId,
      normalizedTerm,
      academicYear,
    );
  }

  if (review?.review_status === "notified" && review.admin_notified_at) {
    return {
      queued: true,
      notified: false,
      snapshot,
      review,
    };
  }

  const adminNotification = await notifyAdminsAboutReadyMarks(snapshot);

  if (adminNotification.sentCount > 0) {
    review = await markReviewNotified(
      studentId,
      classId,
      normalizedTerm,
      academicYear,
    );
  } else {
    const failReason =
      adminNotification.failures[0]?.reason || "No admin recipients available.";
    review = await markReviewNotificationFailed(
      studentId,
      classId,
      normalizedTerm,
      academicYear,
      failReason,
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

async function approveStudentTermMarks({
  studentId,
  classId,
  term,
  academicYear,
  approvedBy,
}) {
  await ensureTermMarksReviewsTableExists();

  const normalizedTerm = normalizeTerm(term);

  if (!normalizedTerm) {
    const error = new Error("A valid term is required.");
    error.statusCode = 400;
    throw error;
  }

  const snapshot = await getTermMarksSnapshot(
    studentId,
    classId,
    normalizedTerm,
    academicYear,
  );

  if (!snapshot.complete) {
    const error = new Error(
      "All subject marks must be completed before approval.",
    );
    error.statusCode = 400;
    throw error;
  }

  snapshot.term = normalizedTerm;

  let review = await getReviewRow(
    studentId,
    classId,
    normalizedTerm,
    academicYear,
  );

  if (!review) {
    review = await insertPendingReview(
      studentId,
      classId,
      normalizedTerm,
      academicYear,
    );
  }

  review = await markReviewApproved(
    studentId,
    classId,
    normalizedTerm,
    academicYear,
    approvedBy,
  );

  const parentRecipient = sanitizePhone(snapshot.student.parent_phone);
  const parentMessage = formatTermMarksSms({
    parentName: snapshot.student.parent_name,
    studentName: snapshot.student.full_name,
    term: `Term ${normalizedTerm}`,
    className: buildClassLabel(snapshot.classInfo),
    subjectMarks: snapshot.subjectMarks,
  });

  if (!parentRecipient) {
    review = await markParentSmsStatus(
      studentId,
      classId,
      normalizedTerm,
      academicYear,
      "failed",
      "Missing parent phone number.",
    );

    return {
      approved: true,
      snapshot,
      review,
      parent_sms: {
        sent: false,
        reason: "Missing parent phone number.",
      },
    };
  }

  try {
    await sendSms({ recipient: parentRecipient, message: parentMessage });

    await teacherRepository.insertNotificationLog({
      studentId: snapshot.student.student_id,
      notificationType: "term_test",
      medium: "sms",
      recipient: parentRecipient,
      message: parentMessage,
      status: "sent",
    });

    review = await markParentSmsStatus(
      studentId,
      classId,
      normalizedTerm,
      academicYear,
      "sent",
      null,
    );

    return {
      approved: true,
      snapshot,
      review,
      parent_sms: {
        sent: true,
      },
    };
  } catch (error) {
    const failReason = error?.message || "SMS service error.";

    await teacherRepository.insertNotificationLog({
      studentId: snapshot.student.student_id,
      notificationType: "term_test",
      medium: "sms",
      recipient: parentRecipient,
      message: parentMessage,
      status: `failed: ${failReason}`,
    });

    review = await markParentSmsStatus(
      studentId,
      classId,
      normalizedTerm,
      academicYear,
      "failed",
      failReason,
    );

    return {
      approved: true,
      snapshot,
      review,
      parent_sms: {
        sent: false,
        reason: failReason,
      },
    };
  }
}

module.exports = {
  approveStudentTermMarks,
  reconcileMissingTermMarksReviews,
  queueStudentTermMarksForApproval,
};
