const pool = require("../db");
const {
  getClassSubjectPlan,
  resolveStudentSubjectsForClass,
} = require("../services/classCurriculumService");

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
    SELECT id, grade, section, stream, academic_year
    FROM classes
    WHERE teacher_id = $1
    ORDER BY academic_year DESC, updated_at DESC, created_at DESC
    LIMIT 1
  `;

  const { rows } = await db.query(classQuery, [teacherId]);
  return rows[0] || null;
}

async function getTeacherClassById(db, teacherId, classId) {
  const query = `
    SELECT id, grade, section, stream, academic_year
    FROM classes
    WHERE id = $1
      AND teacher_id = $2
    LIMIT 1
  `;

  const { rows } = await db.query(query, [classId, teacherId]);
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
      s.city,
      s.address,
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
      ss.is_elective,
      ss.created_at
    FROM student_subjects ss
    JOIN subjects sub ON sub.id = ss.subject_id
    WHERE ss.student_id = $1
    ORDER BY ss.created_at ASC, sub.name ASC
  `;

  const { rows } = await db.query(query, [studentId]);
  return rows;
}

function buildClassPlanSubjectDefinitions(plan) {
  const subjectsByName = new Map();

  const addSubjects = (values, subjectGroup) => {
    values.forEach((value) => {
      const name = String(value || "").trim();
      if (!name) {
        return;
      }

      const key = name.toLowerCase();
      const current = subjectsByName.get(key);
      if (
        !current ||
        (current.subject_group === "elective" && subjectGroup === "compulsory")
      ) {
        subjectsByName.set(key, { name, subject_group: subjectGroup });
      }
    });
  };

  addSubjects(plan?.fixed_subjects || [], "compulsory");
  (plan?.choice_groups || []).forEach((group) => {
    addSubjects(group?.options || [], "compulsory");
  });
  (plan?.elective_groups || []).forEach((group) => {
    addSubjects(group?.options || [], "elective");
  });

  return Array.from(subjectsByName.values());
}

async function ensureSubjectRecord(db, subjectDefinition) {
  const subjectCode = buildSubjectCode(
    subjectDefinition.name,
    subjectDefinition.subject_group,
  );

  const query = `
    INSERT INTO subjects (code, name, subject_group, is_active, updated_at)
    VALUES ($1, $2, $3, true, NOW())
    ON CONFLICT (code)
    DO UPDATE SET
      name = EXCLUDED.name,
      subject_group = EXCLUDED.subject_group,
      is_active = true,
      updated_at = NOW()
    RETURNING id, code, name, subject_group, created_at
  `;

  const { rows } = await db.query(query, [
    subjectCode,
    subjectDefinition.name,
    subjectDefinition.subject_group,
  ]);

  return rows[0] || null;
}

async function getClassSubjects(db, classId) {
  const classQuery = `
    SELECT grade, stream
    FROM classes
    WHERE id = $1
    LIMIT 1
  `;

  const classResult = await db.query(classQuery, [classId]);
  const teacherClass = classResult.rows[0] || null;
  if (!teacherClass) {
    return [];
  }

  const plan = await getClassSubjectPlan(
    teacherClass.grade,
    teacherClass.stream,
  );

  if (!plan) {
    const legacyQuery = `
      SELECT DISTINCT
        sub.id,
        sub.code,
        sub.name,
        sub.subject_group,
        MIN(ss.created_at) as created_at
      FROM student_subjects ss
      JOIN subjects sub ON sub.id = ss.subject_id
      JOIN student_class_assignments sca ON sca.student_id = ss.student_id
      WHERE sca.class_id = $1
        AND sca.removed_at IS NULL
      GROUP BY sub.id, sub.code, sub.name, sub.subject_group
      ORDER BY sub.subject_group ASC, sub.name ASC
    `;

    const { rows } = await db.query(legacyQuery, [classId]);
    return rows;
  }

  const subjectDefinitions = buildClassPlanSubjectDefinitions(plan);
  const subjects = [];

  for (const subjectDefinition of subjectDefinitions) {
    const subject = await ensureSubjectRecord(db, subjectDefinition);
    if (subject) {
      subjects.push(subject);
    }
  }

  return subjects;
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

    const genderColumnCheck = await client.query(
      `
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'students'
          AND column_name = 'gender'
        LIMIT 1
      `,
    );

    if (genderColumnCheck.rowCount === 0) {
      await client.query(
        `ALTER TABLE students ADD COLUMN IF NOT EXISTS gender TEXT`,
      );
    }

    const classId = String(payload.class_id || "").trim();
    const teacherClass = classId
      ? await getTeacherClassById(client, teacherId, classId)
      : await getTeacherCurrentClass(client, teacherId);

    if (!teacherClass) {
      const error = new Error("You are not assigned to an active class.");
      error.statusCode = 400;
      throw error;
    }

    const studentCode = String(payload.student_code || "").trim();
    if (!studentCode) {
      const error = new Error("Student ID is required.");
      error.statusCode = 400;
      throw error;
    }

    const studentName = String(payload.student_name || "").trim();
    const gender = payload.gender ? String(payload.gender).trim() : "";
    const parentName = String(payload.parent_name || "").trim();
    const parentPhone = String(payload.parent_phone || "").trim();
    const city = String(payload.city || "").trim();
    const address = String(payload.address || "").trim();

    if (
      !studentName ||
      !gender ||
      !parentName ||
      !parentPhone ||
      !city ||
      !address
    ) {
      const error = new Error(
        "Full name, gender, parent name, parent phone, city, and address are required.",
      );
      error.statusCode = 400;
      throw error;
    }

    const studentQuery = `
      INSERT INTO students (full_name, gender, parent_name, parent_phone, parent_email, student_code, city, address)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, full_name, gender, parent_name, parent_phone, parent_email, student_code, city, address, created_at
    `;
    const studentResult = await client.query(studentQuery, [
      studentName,
      gender,
      parentName,
      parentPhone,
      payload.parent_email ? payload.parent_email.trim() : null,
      studentCode,
      city,
      address,
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

    const resolvedSubjects = await resolveStudentSubjectsForClass(
      teacherClass,
      payload,
    );

    const savedSubjects = [];
    for (const subjectEntry of resolvedSubjects.subjects) {
      const subjectName = subjectEntry.name;
      const isMandatory = !subjectEntry.is_elective;
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
      subjectPlan: resolvedSubjects.plan,
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
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (attendance_sheet_id, student_id)
      DO UPDATE SET
        status = EXCLUDED.status,
        reason = EXCLUDED.reason,
        marked_at = NOW()
      RETURNING id
    `;

    for (const record of records) {
      const studentId = String(record.student_id).trim();
      const status = String(record.status).trim().toLowerCase();
      if (!expectedStudentIds.has(studentId)) {
        const error = new Error(
          "One or more students do not belong to your class.",
        );
        error.statusCode = 400;
        throw error;
      }

      await client.query(recordUpsertQuery, [
        attendanceSheet.id,
        studentId,
        status,
        String(record.reason || "").trim() || null,
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

  const sheetResult = await pool.query(
    `
      SELECT id, attendance_date
      FROM attendance_sheets
      WHERE class_id = $1
        AND attendance_date = CURRENT_DATE
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 1
    `,
    [teacherClass.id],
  );

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
      ar.reason,
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
  { studentId, notificationType, medium, recipient, message, status },
  db = pool,
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
        SELECT s.id, s.full_name, s.parent_email, s.parent_name, s.parent_phone, s.student_code
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
        SELECT ss.subject_id, sub.name, ss.created_at
        FROM student_subjects ss
        JOIN subjects sub ON sub.id = ss.subject_id
        WHERE ss.student_id = $1
        ORDER BY ss.created_at ASC, sub.name ASC
      `,
      [studentId],
    );
    const subjectIds = new Set(subjectResult.rows.map((row) => row.subject_id));

    if (subjectIds.size === 0) {
      const error = new Error("No subjects found for this student.");
      error.statusCode = 400;
      throw error;
    }

    const existingTermMarksResult = await client.query(
      `
        SELECT 1
        FROM term_tests
        WHERE student_id = $1
          AND class_id = $2
          AND term = $3
          AND academic_year = $4
        LIMIT 1
      `,
      [studentId, teacherClass.id, term, teacherClass.academic_year],
    );

    if (existingTermMarksResult.rows.length > 0) {
      const error = new Error(
        "Marks for this student and term have already been submitted.",
      );
      error.statusCode = 409;
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
    const subjectMarks = [];
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

      // Find subject name for email
      const subjectName = subjectResult.rows.find(
        (row) => row.subject_id === subjectId,
      )?.name;
      subjectMarks.push({
        subject_id: subjectId,
        name: subjectName,
        mark: markValue,
      });
    }

    // Fetch teacher name
    const teacherResult = await client.query(
      `SELECT full_name FROM users WHERE id = $1`,
      [teacherId],
    );
    const teacherName =
      teacherResult.rows.length > 0
        ? teacherResult.rows[0].full_name
        : "Class Teacher";

    await client.query("COMMIT");

    return {
      class: teacherClass,
      student: studentCheckResult.rows[0],
      teacher: { name: teacherName },
      subjectMarks,
      savedRows,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function saveSubjectTermMarksSpreadsheetForTeacher(
  teacherId,
  term,
  subjectId,
  marks,
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const teacherClass = await getTeacherCurrentClass(client, teacherId);
    if (!teacherClass) {
      const error = new Error("You are not assigned to an active class.");
      error.statusCode = 400;
      throw error;
    }

    const subjectResult = await client.query(
      `
        SELECT id, name
        FROM subjects
        WHERE id = $1
        LIMIT 1
      `,
      [subjectId],
    );

    if (subjectResult.rows.length === 0) {
      const error = new Error("Subject not found.");
      error.statusCode = 404;
      throw error;
    }

    const classSubjects = await getClassSubjects(client, teacherClass.id);
    const subjectAllowed = classSubjects.some(
      (subject) => String(subject.id) === String(subjectId),
    );

    if (!subjectAllowed) {
      const error = new Error(
        "Selected subject does not belong to your active class.",
      );
      error.statusCode = 400;
      throw error;
    }

    const students = await getStudentsByClass(client, teacherClass.id);
    const studentsById = new Map(
      students.map((student) => [String(student.id), student]),
    );

    const expectedStudentIds = new Set(
      students.map((student) => String(student.id)),
    );

    if (expectedStudentIds.size === 0) {
      const error = new Error("No students found in your class.");
      error.statusCode = 400;
      throw error;
    }

    const seenStudentIds = new Set();
    const normalizedMarks = [];

    for (const entry of marks) {
      const studentIdValue = String(entry.student_id || "").trim();
      const markValue = Number(entry.mark);

      if (!studentIdValue) {
        const error = new Error("Each row must include a student_id.");
        error.statusCode = 400;
        throw error;
      }

      if (!studentsById.has(studentIdValue)) {
        const error = new Error(
          "One or more students do not belong to your class.",
        );
        error.statusCode = 400;
        throw error;
      }

      if (seenStudentIds.has(studentIdValue)) {
        const error = new Error("Duplicate student rows were found.");
        error.statusCode = 400;
        throw error;
      }

      if (!Number.isFinite(markValue) || markValue < 0 || markValue > 100) {
        const error = new Error(
          "Marks must be numeric values between 0 and 100.",
        );
        error.statusCode = 400;
        throw error;
      }

      seenStudentIds.add(studentIdValue);
      normalizedMarks.push({
        student_id: studentIdValue,
        mark: markValue,
      });
    }

    if (seenStudentIds.size !== expectedStudentIds.size) {
      const missingStudents = students
        .filter((student) => !seenStudentIds.has(String(student.id)))
        .map((student) => student.full_name);

      const error = new Error(
        `Please include marks for every student in the class. Missing: ${missingStudents.join(", ")}`,
      );
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
    for (const entry of normalizedMarks) {
      const result = await client.query(upsertQuery, [
        entry.student_id,
        teacherClass.id,
        term,
        teacherClass.academic_year,
        subjectId,
        entry.mark,
      ]);
      savedRows.push(result.rows[0]);
    }

    await client.query("COMMIT");

    return {
      class: teacherClass,
      subject: subjectResult.rows[0],
      students,
      savedRows,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getStudentMarksForTeacher(teacherId, studentId, term) {
  const client = await pool.connect();

  try {
    const teacherClass = await getTeacherCurrentClass(client, teacherId);
    if (!teacherClass) {
      const error = new Error("You are not assigned to an active class.");
      error.statusCode = 400;
      throw error;
    }

    const studentResult = await client.query(
      `
        SELECT s.id, s.full_name, s.parent_name, s.student_code
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

    if (studentResult.rows.length === 0) {
      const error = new Error("Student not found in your class.");
      error.statusCode = 404;
      throw error;
    }

    const marksResult = await client.query(
      `
        SELECT tt.id, tt.term, tt.subject_id, sub.name as subject_name, 
               tt.mark, tt.exam_date, tt.created_at, tt.updated_at
        FROM term_tests tt
        JOIN subjects sub ON sub.id = tt.subject_id
        WHERE tt.student_id = $1
          AND tt.class_id = $2
          AND tt.term = $3
          AND tt.academic_year = $4
        ORDER BY tt.created_at ASC, sub.name ASC
      `,
      [studentId, teacherClass.id, term, teacherClass.academic_year],
    );

    return {
      class: teacherClass,
      student: studentResult.rows[0],
      marks: marksResult.rows,
    };
  } finally {
    client.release();
  }
}

async function getSubjectMarksForTeacher(teacherId, subjectId, term) {
  const client = await pool.connect();

  try {
    const teacherClass = await getTeacherCurrentClass(client, teacherId);
    if (!teacherClass) {
      const error = new Error("You are not assigned to an active class.");
      error.statusCode = 400;
      throw error;
    }

    const classSubjects = await getClassSubjects(client, teacherClass.id);
    const subjectAllowed = classSubjects.some(
      (subject) => String(subject.id) === String(subjectId),
    );

    if (!subjectAllowed) {
      const error = new Error(
        "Selected subject does not belong to your active class.",
      );
      error.statusCode = 400;
      throw error;
    }

    const subjectResult = await client.query(
      `
        SELECT id, name, code, subject_group
        FROM subjects
        WHERE id = $1
        LIMIT 1
      `,
      [subjectId],
    );

    if (subjectResult.rows.length === 0) {
      const error = new Error("Subject not found.");
      error.statusCode = 404;
      throw error;
    }

    const studentsResult = await client.query(
      `
        SELECT
          s.id AS student_id,
          s.student_code,
          s.full_name,
          s.parent_name,
          s.parent_phone,
          s.parent_email,
          tt.mark,
          tt.exam_date,
          tt.updated_at
        FROM student_class_assignments sca
        JOIN students s ON s.id = sca.student_id
        LEFT JOIN term_tests tt
          ON tt.student_id = s.id
          AND tt.class_id = sca.class_id
          AND tt.term = $2
          AND tt.academic_year = $3
          AND tt.subject_id = $4
        WHERE sca.class_id = $1
          AND sca.removed_at IS NULL
          AND s.is_active = true
        ORDER BY s.full_name ASC
      `,
      [teacherClass.id, term, teacherClass.academic_year, subjectId],
    );

    return {
      class: teacherClass,
      subject: subjectResult.rows[0],
      students: studentsResult.rows,
    };
  } finally {
    client.release();
  }
}

async function updateStudentDetails(studentId, teacherId, payload) {
  const client = await pool.connect();
  try {
    // Verify student belongs to teacher's class
    const studentCheck = await client.query(
      `
        SELECT s.id
        FROM students s
        JOIN student_class_assignments sca ON sca.student_id = s.id
        JOIN classes c ON c.id = sca.class_id
        WHERE s.id = $1 AND c.teacher_id = $2 AND sca.removed_at IS NULL AND s.is_active = true
      `,
      [studentId, teacherId],
    );

    if (studentCheck.rows.length === 0) {
      const error = new Error("Student not found in your class.");
      error.statusCode = 404;
      throw error;
    }

    // Update student details
    const result = await client.query(
      `
        UPDATE students
        SET 
          full_name = COALESCE($2, full_name),
          parent_name = COALESCE($3, parent_name),
          parent_phone = COALESCE($4, parent_phone),
          parent_email = COALESCE($5, parent_email),
          city = COALESCE($6, city),
          address = COALESCE($7, address),
          updated_at = NOW()
        WHERE id = $1
        RETURNING id, full_name, parent_name, parent_phone, parent_email, city, address, updated_at
      `,
      [
        studentId,
        payload.full_name,
        payload.parent_name,
        payload.parent_phone,
        payload.parent_email,
        payload.city,
        payload.address,
      ],
    );

    return result.rows[0];
  } finally {
    client.release();
  }
}

async function updateTeacherProfile(teacherId, payload) {
  const client = await pool.connect();
  try {
    // Update teacher profile (user table)
    const result = await client.query(
      `
        UPDATE users
        SET 
          full_name = COALESCE($2, full_name),
          email = COALESCE($3, email),
          phone = COALESCE($4, phone),
          updated_at = NOW()
        WHERE id = $1 AND role = 'teacher'
        RETURNING id, full_name, email, phone, teacher_code, updated_at
      `,
      [
        teacherId,
        payload.full_name || null,
        payload.email || null,
        payload.phone || null,
      ],
    );

    if (result.rows.length === 0) {
      const error = new Error("Teacher profile not found.");
      error.statusCode = 404;
      throw error;
    }

    return result.rows[0];
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
  getClassSubjects,
  getClassStudentsWithSubjects,
  createStudentForTeacher,
  saveAttendanceForTeacher,
  getTodayAttendanceBundle,
  insertNotificationLog,
  getStudentSubjectsForTeacher,
  saveTermMarksForTeacher,
  saveSubjectTermMarksSpreadsheetForTeacher,
  getStudentMarksForTeacher,
  getSubjectMarksForTeacher,
  updateStudentDetails,
  updateTeacherProfile,
};
