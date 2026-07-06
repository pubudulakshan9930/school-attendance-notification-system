const pool = require("../db");

async function getTeacherSummaryRows() {
  const query = `
    SELECT
      u.id,
      u.full_name,
      u.email,
      u.phone,
      u.teacher_code,
      u.is_active,
      u.created_at,
      COUNT(c.id) AS assigned_classes
    FROM users u
    LEFT JOIN classes c ON c.teacher_id = u.id AND c.is_active = true
    WHERE u.role = 'teacher'
    GROUP BY u.id
    ORDER BY u.created_at DESC, u.full_name ASC
  `;

  const { rows } = await pool.query(query);
  return rows;
}

async function findClassByYearGradeSection(year, grade, section, stream = "") {
  const query = `
    SELECT
      c.id,
      c.grade,
      c.section,
      c.stream,
      c.academic_year,
      c.teacher_id,
      c.is_active,
      u.full_name AS teacher_name,
      u.email AS teacher_email,
      u.phone AS teacher_phone,
      u.teacher_code
    FROM classes c
    LEFT JOIN users u ON u.id = c.teacher_id
    WHERE c.academic_year = $1
      AND c.grade = $2
      AND c.section = $3
      AND c.stream = $4
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [year, grade, section, stream]);
  return rows[0] || null;
}

async function getActiveClasses() {
  const query = `
    SELECT c.id, c.grade, c.section, c.stream, c.academic_year, c.max_students, c.teacher_id, c.is_active,
           u.full_name AS teacher_name,
           COUNT(sca.student_id) AS student_count
    FROM classes c
    LEFT JOIN users u ON u.id = c.teacher_id
    LEFT JOIN student_class_assignments sca ON sca.class_id = c.id AND sca.removed_at IS NULL
    GROUP BY c.id, u.full_name
    ORDER BY c.academic_year DESC, c.grade ASC, c.stream ASC, c.section ASC
  `;

  const { rows } = await pool.query(query);
  return rows;
}

async function createClassRecord(
  grade,
  section,
  academicYear,
  stream = "",
  maxStudents = 40,
) {
  const existingQuery = `
    SELECT id
    FROM classes
    WHERE grade = $1 AND section = $2 AND academic_year = $3 AND stream = $4
    LIMIT 1
  `;
  const existingResult = await pool.query(existingQuery, [
    grade,
    section,
    academicYear,
    stream,
  ]);

  if (existingResult.rows.length > 0) {
    const error = new Error(
      "This class already exists for the selected academic year.",
    );
    error.statusCode = 409;
    throw error;
  }

  const insertQuery = `
    INSERT INTO classes (grade, section, academic_year, stream, max_students)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, grade, section, stream, academic_year, max_students, teacher_id, is_active, created_at
  `;
  const insertResult = await pool.query(insertQuery, [
    grade,
    section,
    academicYear,
    stream,
    maxStudents,
  ]);

  return insertResult.rows[0];
}

async function deleteClassRecord(classId) {
  const deleteQuery = `
    DELETE FROM classes
    WHERE id = $1
    RETURNING id, grade, section, stream, academic_year, max_students, teacher_id
  `;

  const { rows } = await pool.query(deleteQuery, [classId]);
  return rows[0] || null;
}

async function getClassStudents(classId) {
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

  const { rows } = await pool.query(query, [classId]);
  return rows;
}

async function getStudentAlertRecipients() {
  const query = `
    SELECT id, full_name, parent_name, parent_phone, student_code
    FROM students
    WHERE is_active = true
    ORDER BY full_name ASC
  `;

  const { rows } = await pool.query(query);
  return rows;
}

async function getTeacherAlertRecipients() {
  const query = `
    SELECT id, full_name, phone, teacher_code
    FROM users
    WHERE role = 'teacher' AND is_active = true
    ORDER BY full_name ASC
  `;

  const { rows } = await pool.query(query);
  return rows;
}

function buildStudentFilterClause({ search = "", status = "" } = {}) {
  const clauses = ["1=1"];
  const values = [];
  let index = 1;

  if (status === "active" || status === "inactive") {
    clauses.push(`s.is_active = $${index++}`);
    values.push(status === "active");
  }

  const trimmedSearch = String(search || "")
    .trim()
    .toLowerCase();
  if (trimmedSearch) {
    const likeValue = `%${trimmedSearch}%`;
    clauses.push(`(
      LOWER(s.full_name) LIKE $${index}
      OR LOWER(s.student_code) LIKE $${index}
      OR LOWER(COALESCE(s.parent_name, '')) LIKE $${index}
      OR LOWER(COALESCE(s.parent_phone, '')) LIKE $${index}
      OR LOWER(COALESCE(s.parent_email, '')) LIKE $${index}
      OR LOWER(COALESCE(s.city, '')) LIKE $${index}
      OR LOWER(COALESCE(s.address, '')) LIKE $${index}
    )`);
    values.push(likeValue);
    index += 1;
  }

  return {
    whereClause: clauses.join(" AND "),
    values,
    nextIndex: index,
  };
}

async function getStudentSummaryRows({
  search = "",
  status = "",
  limit = 200,
  offset = 0,
} = {}) {
  const filters = buildStudentFilterClause({ search, status });
  const safeLimit = Math.max(1, Math.min(Number(limit) || 200, 1000));
  const safeOffset = Math.max(0, Number(offset) || 0);

  const query = `
    SELECT
      s.id,
      s.full_name,
      s.parent_name,
      s.parent_phone,
      s.parent_email,
      s.student_code,
      s.gender,
      s.city,
      s.address,
      s.is_active,
      s.created_at,
      s.updated_at,
      current_class.class_id,
      current_class.grade,
      current_class.section,
      current_class.stream,
      current_class.academic_year,
      u.full_name AS teacher_name
    FROM students s
    LEFT JOIN LATERAL (
      SELECT
        c.id AS class_id,
        c.grade,
        c.section,
        c.stream,
        c.academic_year,
        c.teacher_id
      FROM student_class_assignments sca
      JOIN classes c ON c.id = sca.class_id
      WHERE sca.student_id = s.id
        AND sca.removed_at IS NULL
      ORDER BY sca.assigned_at DESC
      LIMIT 1
    ) current_class ON TRUE
    LEFT JOIN users u ON u.id = current_class.teacher_id
    WHERE ${filters.whereClause}
    ORDER BY s.full_name ASC, s.created_at DESC
    LIMIT $${filters.nextIndex} OFFSET $${filters.nextIndex + 1}
  `;

  const { rows } = await pool.query(query, [
    ...filters.values,
    safeLimit,
    safeOffset,
  ]);
  return rows;
}

async function getStudentSummaryCount({ search = "", status = "" } = {}) {
  const filters = buildStudentFilterClause({ search, status });
  const query = `
    SELECT COUNT(*) AS count
    FROM students s
    WHERE ${filters.whereClause}
  `;

  const { rows } = await pool.query(query, filters.values);
  return parseInt(rows[0]?.count || 0, 10);
}

async function getStudentRecordById(studentId) {
  const query = `
    SELECT
      s.id,
      s.full_name,
      s.parent_name,
      s.parent_phone,
      s.parent_email,
      s.student_code,
      s.gender,
      s.city,
      s.address,
      s.is_active,
      s.created_at,
      s.updated_at,
      current_class.class_id,
      current_class.grade,
      current_class.section,
      current_class.stream,
      current_class.academic_year,
      u.full_name AS teacher_name
    FROM students s
    LEFT JOIN LATERAL (
      SELECT
        c.id AS class_id,
        c.grade,
        c.section,
        c.stream,
        c.academic_year,
        c.teacher_id
      FROM student_class_assignments sca
      JOIN classes c ON c.id = sca.class_id
      WHERE sca.student_id = s.id
        AND sca.removed_at IS NULL
      ORDER BY sca.assigned_at DESC
      LIMIT 1
    ) current_class ON TRUE
    LEFT JOIN users u ON u.id = current_class.teacher_id
    WHERE s.id = $1
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [studentId]);
  return rows[0] || null;
}

async function updateStudentRecord(studentId, payload) {
  const fields = [];
  const values = [];
  let index = 1;

  const appendField = (column, value) => {
    if (value !== undefined) {
      fields.push(`${column} = $${index++}`);
      values.push(value);
    }
  };

  appendField("full_name", payload.full_name);
  appendField("parent_name", payload.parent_name);
  appendField("parent_phone", payload.parent_phone);
  appendField("parent_email", payload.parent_email);
  appendField("student_code", payload.student_code);
  appendField("gender", payload.gender);
  appendField("city", payload.city);
  appendField("address", payload.address);
  appendField("is_active", payload.is_active);

  if (fields.length > 0) {
    const query = `
      UPDATE students
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE id = $${index}
      RETURNING id
    `;

    values.push(studentId);
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return null;
    }
  }

  return getStudentRecordById(studentId);
}

async function deleteStudentRecord(studentId) {
  const existingStudent = await getStudentRecordById(studentId);
  if (!existingStudent) {
    return null;
  }

  const query = `
    DELETE FROM students
    WHERE id = $1
    RETURNING id
  `;

  const { rows } = await pool.query(query, [studentId]);
  if (rows.length === 0) {
    return null;
  }

  return existingStudent;
}

async function updateTeacherRecord(teacherId, payload) {
  const fields = [];
  const values = [];
  let idx = 1;

  if (payload.full_name !== undefined) {
    fields.push(`full_name = $${idx++}`);
    values.push(payload.full_name);
  }
  if (payload.email !== undefined) {
    fields.push(`email = $${idx++}`);
    values.push(payload.email);
  }
  if (payload.phone !== undefined) {
    fields.push(`phone = $${idx++}`);
    values.push(payload.phone);
  }
  if (payload.teacher_code !== undefined) {
    fields.push(`teacher_code = $${idx++}`);
    values.push(payload.teacher_code);
  }
  if (payload.is_active !== undefined) {
    fields.push(`is_active = $${idx++}`);
    values.push(payload.is_active);
  }

  if (fields.length === 0) {
    const { rows } = await pool.query(
      `SELECT id, full_name, email, phone, teacher_code, is_active, created_at FROM users WHERE id = $1 LIMIT 1`,
      [teacherId],
    );
    return rows[0] || null;
  }

  const query = `
    UPDATE users
    SET ${fields.join(", ")}, updated_at = now()
    WHERE id = $${idx}
    RETURNING id, full_name, email, phone, teacher_code, is_active, created_at, updated_at
  `;

  values.push(teacherId);
  const { rows } = await pool.query(query, values);
  return rows[0] || null;
}

async function getAttendanceReportSummary() {
  const query = `
    SELECT
      COUNT(*) AS total_records,
      COUNT(*) FILTER (WHERE ar.status = 'present') AS present_count,
      COUNT(*) FILTER (WHERE ar.status = 'absent') AS absent_count,
      COUNT(*) FILTER (WHERE ar.status = 'late') AS late_count
    FROM attendance_records ar
  `;

  const { rows } = await pool.query(query);
  return rows[0] || null;
}

async function getAttendanceReportRecentRows() {
  const query = `
    SELECT
      ar.id,
      ar.status,
      ar.reason,
      ar.marked_at,
      s.full_name AS student_name,
      c.grade,
      c.section,
      c.stream,
      c.academic_year,
      u.full_name AS teacher_name
    FROM attendance_records ar
    JOIN attendance_sheets sh ON sh.id = ar.attendance_sheet_id
    JOIN students s ON s.id = ar.student_id
    JOIN classes c ON c.id = sh.class_id
    JOIN users u ON u.id = sh.teacher_id
    ORDER BY ar.marked_at DESC
    LIMIT 10
  `;

  const { rows } = await pool.query(query);
  return rows;
}

async function getTermTestReportSummary() {
  const query = `
    SELECT
      COUNT(*) AS total_records,
      ROUND(AVG(mark)::numeric, 2) AS average_mark,
      COUNT(*) FILTER (WHERE mark >= 75) AS distinction_count
    FROM term_tests
  `;

  const { rows } = await pool.query(query);
  return rows[0] || null;
}

async function getTermTestReportRecentRows() {
  const query = `
    SELECT
      tt.id,
      tt.term,
      tt.academic_year,
      tt.mark,
      tt.exam_date,
      s.full_name AS student_name,
      c.grade,
      c.section,
      c.stream,
      sub.name AS subject_name
    FROM term_tests tt
    JOIN students s ON s.id = tt.student_id
    JOIN classes c ON c.id = tt.class_id
    JOIN subjects sub ON sub.id = tt.subject_id
    ORDER BY tt.updated_at DESC
    LIMIT 10
  `;

  const { rows } = await pool.query(query);
  return rows;
}

async function getPendingTermMarkReviews(limit = 25) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 25, 100));
  const query = `
    SELECT
      r.id,
      r.student_id,
      r.class_id,
      r.term,
      r.academic_year,
      r.review_status,
      r.admin_notified_at,
      r.approved_at,
      r.parent_sms_status,
      s.full_name AS student_name,
      s.student_code,
      s.parent_name,
      s.parent_phone,
      c.grade,
      c.section,
      c.stream,
      COUNT(tt.id) AS subject_count
    FROM term_marks_reviews r
    JOIN students s ON s.id = r.student_id
    JOIN classes c ON c.id = r.class_id
    LEFT JOIN term_tests tt
      ON tt.student_id = r.student_id
     AND tt.class_id = r.class_id
     AND tt.term = r.term
     AND tt.academic_year = r.academic_year
    WHERE r.review_status IN ('pending', 'notified')
    GROUP BY
      r.id,
      s.full_name,
      s.student_code,
      s.parent_name,
      s.parent_phone,
      c.grade,
      c.section,
      c.stream
    ORDER BY COALESCE(r.admin_notified_at, r.created_at) DESC
    LIMIT $1
  `;

  const { rows } = await pool.query(query, [safeLimit]);
  return rows;
}

async function getPendingTermMarkReviewsCount() {
  const query = `
    SELECT COUNT(*) AS pending_count
    FROM term_marks_reviews
    WHERE review_status IN ('pending', 'notified')
  `;

  const { rows } = await pool.query(query);
  return rows[0] || null;
}

async function getFilteredAttendanceRows(
  year,
  grade,
  section,
  date,
  stream = "",
) {
  const query = `
    SELECT
      ar.id,
      ar.status,
      ar.marked_at,
      ar.student_id,
      s.full_name AS student_name,
      s.student_code,
      c.grade,
      c.section,
      c.stream,
      c.academic_year,
      u.full_name AS teacher_name,
      sh.attendance_date
    FROM attendance_records ar
    JOIN attendance_sheets sh ON sh.id = ar.attendance_sheet_id
    JOIN students s ON s.id = ar.student_id
    JOIN classes c ON c.id = sh.class_id
    JOIN users u ON u.id = sh.teacher_id
    WHERE c.academic_year = $1
      AND c.grade = $2
      AND c.section = $3
      AND c.stream = $5
      AND sh.attendance_date = $4
    ORDER BY s.full_name ASC
  `;

  const { rows } = await pool.query(query, [
    year,
    grade,
    section,
    date,
    stream,
  ]);
  return rows;
}

async function getFilteredAttendanceSummary(
  year,
  grade,
  section,
  date,
  stream = "",
) {
  const query = `
    SELECT
      COUNT(*) FILTER (WHERE ar.status = 'present') AS present_count,
      COUNT(*) FILTER (WHERE ar.status = 'absent') AS absent_count,
      COUNT(*) FILTER (WHERE ar.status = 'late') AS late_count
    FROM attendance_records ar
    JOIN attendance_sheets sh ON sh.id = ar.attendance_sheet_id
    JOIN classes c ON c.id = sh.class_id
    WHERE c.academic_year = $1
      AND c.grade = $2
      AND c.section = $3
      AND c.stream = $5
      AND sh.attendance_date = $4
  `;

  const { rows } = await pool.query(query, [
    year,
    grade,
    section,
    date,
    stream,
  ]);
  return rows[0] || null;
}

async function getFilteredTermTestRows(
  year,
  grade,
  section,
  term,
  stream = "",
) {
  const query = `
    SELECT
      tt.id,
      tt.term,
      tt.academic_year,
      tt.mark,
      tt.exam_date,
      s.full_name AS student_name,
      s.student_code,
      c.grade,
      c.section,
      c.stream,
      sub.name AS subject_name
    FROM term_tests tt
    JOIN students s ON s.id = tt.student_id
    JOIN classes c ON c.id = tt.class_id
    JOIN subjects sub ON sub.id = tt.subject_id
    WHERE c.academic_year = $1
      AND c.grade = $2
      AND c.section = $3
      AND c.stream = $5
      AND tt.term = $4
    ORDER BY s.full_name ASC, sub.name ASC
  `;

  const { rows } = await pool.query(query, [
    year,
    grade,
    section,
    term,
    stream,
  ]);
  return rows;
}

async function getFilteredTermTestSummary(
  year,
  grade,
  section,
  term,
  stream = "",
) {
  const query = `
    SELECT
      COUNT(*) AS total_records,
      ROUND(AVG(mark)::numeric, 2) AS average_mark,
      COUNT(*) FILTER (WHERE mark >= 75) AS distinction_count
    FROM term_tests tt
    JOIN classes c ON c.id = tt.class_id
    WHERE c.academic_year = $1
      AND c.grade = $2
      AND c.section = $3
      AND c.stream = $5
      AND tt.term = $4
  `;

  const { rows } = await pool.query(query, [
    year,
    grade,
    section,
    term,
    stream,
  ]);
  return rows[0] || null;
}

async function getCustomSubjectPlan(grade, stream = "") {
  const query = `
    SELECT
      id,
      grade,
      stream,
      fixed_subjects,
      language_options,
      religion_options,
      elective_category_1_options,
      elective_category_2_options,
      elective_category_3_options,
      is_active,
      created_at,
      updated_at
    FROM class_subject_plans
    WHERE grade = $1 AND stream = $2
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [grade, stream]);
  return rows[0] || null;
}

async function getAllCustomSubjectPlans() {
  const query = `
    SELECT
      id,
      grade,
      stream,
      fixed_subjects,
      language_options,
      religion_options,
      elective_category_1_options,
      elective_category_2_options,
      elective_category_3_options,
      is_active,
      created_at,
      updated_at
    FROM class_subject_plans
    ORDER BY grade ASC, stream ASC
  `;

  const { rows } = await pool.query(query);
  return rows;
}

async function updateSubjectPlan(grade, stream, planData) {
  const {
    fixed_subjects,
    language_options,
    religion_options,
    elective_category_1_options,
    elective_category_2_options,
    elective_category_3_options,
  } = planData;

  const query = `
    UPDATE class_subject_plans
    SET
      fixed_subjects = $1,
      language_options = $2,
      religion_options = $3,
      elective_category_1_options = $4,
      elective_category_2_options = $5,
      elective_category_3_options = $6,
      updated_at = NOW()
    WHERE grade = $7 AND stream = $8
    RETURNING *
  `;

  const { rows } = await pool.query(query, [
    fixed_subjects || "",
    language_options || "",
    religion_options || "",
    elective_category_1_options || "",
    elective_category_2_options || "",
    elective_category_3_options || "",
    grade,
    stream,
  ]);

  return rows[0] || null;
}

module.exports = {
  getTeacherSummaryRows,
  findClassByYearGradeSection,
  getActiveClasses,
  createClassRecord,
  getClassStudents,
  getStudentAlertRecipients,
  getTeacherAlertRecipients,
  getStudentSummaryRows,
  getStudentSummaryCount,
  getStudentRecordById,
  updateStudentRecord,
  deleteStudentRecord,
  getAttendanceReportSummary,
  getAttendanceReportRecentRows,
  getTermTestReportSummary,
  getTermTestReportRecentRows,
  getPendingTermMarkReviews,
  getPendingTermMarkReviewsCount,
  getFilteredAttendanceRows,
  getFilteredAttendanceSummary,
  getFilteredTermTestRows,
  getFilteredTermTestSummary,
  deleteClassRecord,
  getCustomSubjectPlan,
  getAllCustomSubjectPlans,
  updateSubjectPlan,
  updateTeacherRecord,
};
