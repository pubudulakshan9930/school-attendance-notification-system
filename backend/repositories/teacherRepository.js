const pool = require("../db");

const MANDATORY_SUBJECTS = [
  "Mathematics",
  "Science",
  "English",
  "Language",
  "Social Studies",
];

function buildSubjectCode(name, subjectGroup) {
  const normalizedName = String(name || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

  const prefix = subjectGroup === "elective" ? "ELE" : "COM";
  return `${prefix}_${normalizedName || "SUBJECT"}`;
}

function normalizeSubjectNames(values) {
  const seen = new Set();
  const result = [];

  values.forEach((value) => {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    result.push(normalized);
  });

  return result;
}

async function getTeacherCurrentClass(db, teacherId) {
  const classQuery = `
    SELECT id, grade, section, academic_year
    FROM classes
    WHERE teacher_id = $1
      AND is_active = true
    ORDER BY academic_year DESC, updated_at DESC, created_at DESC
    LIMIT 1
  `;

  const { rows } = await db.query(classQuery, [teacherId]);
  return rows[0] || null;
}

async function getTeacherProfile(db, teacherId) {
  const query = `
    SELECT id, full_name, email, phone, teacher_code
    FROM users
    WHERE id = $1
    LIMIT 1
  `;

  const { rows } = await db.query(query, [teacherId]);
  return rows[0] || null;
}

async function getStudentsByClass(db, classId) {
  const query = `
    SELECT
      s.id,
      s.full_name,
      s.parent_name,
      s.parent_phone,
      s.parent_email,
      s.student_code,
      s.created_at,
      sca.assigned_at
    FROM student_class_assignments sca
    JOIN students s ON s.id = sca.student_id
    WHERE sca.class_id = $1
      AND sca.removed_at IS NULL
      AND s.is_active = true
    ORDER BY s.full_name ASC
  `;

  const { rows } = await db.query(query, [classId]);
  return rows;
}

async function getStudentMembershipInClass(db, classId, studentId) {
  const query = `
    SELECT s.id, s.full_name
    FROM student_class_assignments sca
    JOIN students s ON s.id = sca.student_id
    WHERE sca.class_id = $1
      AND sca.student_id = $2
      AND sca.removed_at IS NULL
      AND s.is_active = true
    LIMIT 1
  `;

  const { rows } = await db.query(query, [classId, studentId]);
  return rows[0] || null;
}

async function getStudentSubjects(db, studentId) {
  const query = `
    SELECT
      sub.id,
      sub.code,
      sub.name,
      sub.subject_group,
      ss.is_elective
    FROM student_subjects ss
    JOIN subjects sub ON sub.id = ss.subject_id
    WHERE ss.student_id = $1
    ORDER BY sub.subject_group ASC, sub.name ASC
  `;

  const { rows } = await db.query(query, [studentId]);
  return rows;
}

async function getClassStudentsWithSubjects(teacherId) {
  const teacherClass = await getTeacherCurrentClass(pool, teacherId);
  if (!teacherClass) {
    return {
      teacherClass: null,
      teacher: null,
      students: [],
    };
  }

  const teacher = await getTeacherProfile(pool, teacherId);
  const students = await getStudentsByClass(pool, teacherClass.id);

  if (students.length === 0) {
    return {
      teacherClass,
      teacher,
      students: [],
    };
  }

  const studentIds = students.map((student) => student.id);
  const subjectsQuery = `
    SELECT
      ss.student_id,
      sub.id AS subject_id,
      sub.code,
      sub.name,
      sub.subject_group,
      ss.is_elective
    FROM student_subjects ss
    JOIN subjects sub ON sub.id = ss.subject_id
    WHERE ss.student_id = ANY($1)
    ORDER BY sub.subject_group ASC, sub.name ASC
  `;
  const subjectsResult = await pool.query(subjectsQuery, [studentIds]);

  const subjectsByStudentId = new Map();
  subjectsResult.rows.forEach((row) => {
    const current = subjectsByStudentId.get(row.student_id) || [];
    current.push({
      id: row.subject_id,
      code: row.code,
      name: row.name,
      subject_group: row.subject_group,
      is_elective: row.is_elective,
    });
    subjectsByStudentId.set(row.student_id, current);
  });

  return {
    teacherClass,
    teacher,
    students: students.map((student) => ({
      ...student,
      subjects: subjectsByStudentId.get(student.id) || [],
    })),
  };
}

async function createStudentForTeacher(teacherId, payload) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const teacherClass = await getTeacherCurrentClass(client, teacherId);
    if (!teacherClass) {
      const error = new Error("You are not assigned to an active class.");
      error.statusCode = 400;
      throw error;
    }

    const studentCode = `STU-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const studentQuery = `
      INSERT INTO students (full_name, parent_name, parent_phone, parent_email, student_code)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, full_name, parent_name, parent_phone, parent_email, student_code, created_at
    `;
    const studentResult = await client.query(studentQuery, [
      payload.student_name.trim(),
      payload.parent_name.trim(),
      payload.phone.trim(),
      payload.email ? payload.email.trim() : null,
      studentCode,
    ]);

    const student = studentResult.rows[0];
    if (!student) {
      throw new Error("Failed to insert student record.");
    }

    await client.query(
      `
        INSERT INTO student_class_assignments (student_id, class_id, assigned_at)
        VALUES ($1, $2, CURRENT_DATE)
      `,
      [student.id, teacherClass.id],
    );

    const electiveSubjects = normalizeSubjectNames([
      payload.elective_subject_1,
      payload.elective_subject_2,
      payload.elective_subject_3,
    ]);
    const subjectNames = normalizeSubjectNames([
      ...MANDATORY_SUBJECTS,
      ...electiveSubjects,
    ]);

    const savedSubjects = [];
    for (const subjectName of subjectNames) {
      const isMandatory = MANDATORY_SUBJECTS.some(
        (value) => value.toLowerCase() === subjectName.toLowerCase(),
      );
      const subjectCode = buildSubjectCode(
        subjectName,
        isMandatory ? "compulsory" : "elective",
      );

      const subjectResult = await client.query(
        `
          INSERT INTO subjects (code, name, subject_group, is_active, updated_at)
          VALUES ($1, $2, $3, true, NOW())
          ON CONFLICT (code)
          DO UPDATE SET
            name = EXCLUDED.name,
            subject_group = EXCLUDED.subject_group,
            is_active = true,
            updated_at = NOW()
          RETURNING id, name, subject_group
        `,
        [subjectCode, subjectName, isMandatory ? "compulsory" : "elective"],
      );

      const subject = subjectResult.rows[0];
      await client.query(
        `
          INSERT INTO student_subjects (student_id, subject_id, is_elective)
          VALUES ($1, $2, $3)
          ON CONFLICT (student_id, subject_id) DO NOTHING
        `,
        [student.id, subject.id, !isMandatory],
      );

      savedSubjects.push({
        id: subject.id,
        name: subject.name,
        subject_group: subject.subject_group,
        is_elective: !isMandatory,
      });
    }

    await client.query("COMMIT");

    return {
      student,
      class: teacherClass,
      subjects: savedSubjects,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function saveAttendanceForTeacher(teacherId, records) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const teacherClass = await getTeacherCurrentClass(client, teacherId);
    if (!teacherClass) {
      const error = new Error("You are not assigned to an active class.");
      error.statusCode = 400;
      throw error;
    }

    const studentResult = await client.query(
      `
        SELECT s.id
        FROM student_class_assignments sca
        JOIN students s ON s.id = sca.student_id
        WHERE sca.class_id = $1
          AND sca.removed_at IS NULL
          AND s.is_active = true
      `,
      [teacherClass.id],
    );
    const expectedStudentIds = new Set(studentResult.rows.map((row) => row.id));

    if (expectedStudentIds.size === 0) {
      const error = new Error("No students found in your class.");
      error.statusCode = 400;
      throw error;
    }

    const sheetResult = await client.query(
      `
        INSERT INTO attendance_sheets (
          class_id,
          teacher_id,
          attendance_date,
          created_at,
          updated_at
        )
        VALUES ($1, $2, CURRENT_DATE, NOW(), NOW())
        ON CONFLICT (class_id, attendance_date)
        DO UPDATE SET
          teacher_id = EXCLUDED.teacher_id,
          updated_at = NOW()
        RETURNING id, attendance_date
      `,
      [teacherClass.id, teacherId],
    );
    const attendanceSheet = sheetResult.rows[0];

    const recordUpsertQuery = `
      INSERT INTO attendance_records (
        attendance_sheet_id,
        student_id,
        status,
        reason,
        marked_at
      )
      VALUES ($1, $2, $3, NULL, NOW())
      ON CONFLICT (attendance_sheet_id, student_id)
      DO UPDATE SET
        status = EXCLUDED.status,
        reason = NULL,
        marked_at = NOW()
      RETURNING id
    `;

    for (const record of records) {
      const studentId = String(record.student_id).trim();
      const status = String(record.status).trim().toLowerCase();
      if (!expectedStudentIds.has(studentId)) {
        const error = new Error("One or more students do not belong to your class.");
        error.statusCode = 400;
        throw error;
      }

      await client.query(recordUpsertQuery, [
        attendanceSheet.id,
        studentId,
        status,
      ]);
    }

    await client.query("COMMIT");

    return {
      attendanceSheet,
      recordsCount: records.length,
      class: teacherClass,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getTodayAttendanceBundle(teacherId) {
  const teacherClass = await getTeacherCurrentClass(pool, teacherId);
  if (!teacherClass) {
    return {
      teacherClass: null,
      attendanceSheet: null,
      attendanceRows: [],
    };
  }

  const sheetQuery = `
    SELECT id, attendance_date
    FROM attendance_sheets
    WHERE class_id = $1
      AND attendance_date = CURRENT_DATE
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  const sheetResult = await pool.query(sheetQuery, [teacherClass.id]);

  if (sheetResult.rows.length === 0) {
    return {
      teacherClass,
      attendanceSheet: null,
      attendanceRows: [],
    };
  }

  const attendanceSheet = sheetResult.rows[0];
  const recordsQuery = `
    SELECT
      ar.student_id,
      ar.status,
      s.full_name AS student_name,
      s.parent_name,
      s.parent_phone,
      c.grade,
      c.section,
      sh.attendance_date
    FROM attendance_records ar
    JOIN attendance_sheets sh ON sh.id = ar.attendance_sheet_id
    JOIN students s ON s.id = ar.student_id
    JOIN classes c ON c.id = sh.class_id
    WHERE ar.attendance_sheet_id = $1
    ORDER BY s.full_name ASC
  `;
  const recordsResult = await pool.query(recordsQuery, [attendanceSheet.id]);

  return {
    teacherClass,
    attendanceSheet,
    attendanceRows: recordsResult.rows,
  };
}

async function insertNotificationLog(
  db = pool,
  { studentId, notificationType, medium, recipient, message, status },
) {
  await db.query(
    `
      INSERT INTO notification_logs (
        student_id,
        notification_type,
        medium,
        recipient,
        message,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [studentId, notificationType, medium, recipient, message, status],
  );
}

async function getStudentSubjectsForTeacher(teacherId, studentId) {
  const teacherClass = await getTeacherCurrentClass(pool, teacherId);
  if (!teacherClass) {
    return {
      teacherClass: null,
      student: null,
      subjects: [],
    };
  }

  const student = await getStudentMembershipInClass(
    pool,
    teacherClass.id,
    studentId,
  );
  if (!student) {
    return {
      teacherClass,
      student: null,
      subjects: [],
    };
  }

  const subjects = await getStudentSubjects(pool, studentId);
  return { teacherClass, student, subjects };
}

async function saveTermMarksForTeacher(teacherId, studentId, term, marks) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const teacherClass = await getTeacherCurrentClass(client, teacherId);
    if (!teacherClass) {
      const error = new Error("You are not assigned to an active class.");
      error.statusCode = 400;
      throw error;
    }

    const studentCheckResult = await client.query(
      `
        SELECT s.id, s.full_name
        FROM student_class_assignments sca
        JOIN students s ON s.id = sca.student_id
        WHERE sca.class_id = $1
          AND sca.student_id = $2
          AND sca.removed_at IS NULL
          AND s.is_active = true
        LIMIT 1
      `,
      [teacherClass.id, studentId],
    );

    if (studentCheckResult.rows.length === 0) {
      const error = new Error("Student not found in your class.");
      error.statusCode = 404;
      throw error;
    }

    const subjectResult = await client.query(
      `
        SELECT ss.subject_id, sub.name
        FROM student_subjects ss
        JOIN subjects sub ON sub.id = ss.subject_id
        WHERE ss.student_id = $1
        ORDER BY sub.name ASC
      `,
      [studentId],
    );
    const subjectIds = new Set(subjectResult.rows.map((row) => row.subject_id));

    if (subjectIds.size === 0) {
      const error = new Error("No subjects found for this student.");
      error.statusCode = 400;
      throw error;
    }

    const upsertQuery = `
      INSERT INTO term_tests (
        student_id,
        class_id,
        term,
        academic_year,
        subject_id,
        mark,
        exam_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
      ON CONFLICT (student_id, class_id, term, academic_year, subject_id)
      DO UPDATE SET
        mark = EXCLUDED.mark,
        exam_date = EXCLUDED.exam_date,
        updated_at = NOW()
      RETURNING id, subject_id, mark
    `;

    const savedRows = [];
    for (const entry of marks) {
      const subjectId = String(entry.subject_id).trim();
      const markValue = Number(entry.mark);
      if (!subjectIds.has(subjectId)) {
        const error = new Error(
          "One or more subjects do not belong to the selected student.",
        );
        error.statusCode = 400;
        throw error;
      }

      const result = await client.query(upsertQuery, [
        studentId,
        teacherClass.id,
        term,
        teacherClass.academic_year,
        subjectId,
        markValue,
      ]);
      savedRows.push(result.rows[0]);
    }

    await client.query("COMMIT");

    return {
      class: teacherClass,
      student: studentCheckResult.rows[0],
      savedRows,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getTeacherCurrentClass,
  getTeacherProfile,
  getStudentsByClass,
  getStudentMembershipInClass,
  getStudentSubjects,
  getClassStudentsWithSubjects,
  createStudentForTeacher,
  saveAttendanceForTeacher,
  getTodayAttendanceBundle,
  insertNotificationLog,
  getStudentSubjectsForTeacher,
  saveTermMarksForTeacher,
};