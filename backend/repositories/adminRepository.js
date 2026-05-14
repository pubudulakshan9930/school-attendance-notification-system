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
    WHERE c.is_active = true
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
  getAttendanceReportSummary,
  getAttendanceReportRecentRows,
  getTermTestReportSummary,
  getTermTestReportRecentRows,
  getFilteredAttendanceRows,
  getFilteredAttendanceSummary,
  getFilteredTermTestRows,
  getFilteredTermTestSummary,
  deleteClassRecord,
  getCustomSubjectPlan,
  getAllCustomSubjectPlans,
  updateSubjectPlan,
};
