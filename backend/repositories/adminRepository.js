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

async function findClassByYearGradeSection(year, grade, section) {
  const query = `
    SELECT
      c.id,
      c.grade,
      c.section,
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
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [year, grade, section]);
  return rows[0] || null;
}

async function getActiveClasses() {
  const query = `
    SELECT c.id, c.grade, c.section, c.academic_year, c.teacher_id, c.is_active,
           u.full_name AS teacher_name
    FROM classes c
    LEFT JOIN users u ON u.id = c.teacher_id
    WHERE c.is_active = true
    ORDER BY c.academic_year DESC, c.grade ASC, c.section ASC
  `;

  const { rows } = await pool.query(query);
  return rows;
}

async function createClassRecord(grade, section, academicYear) {
  const existingQuery = `
    SELECT id
    FROM classes
    WHERE grade = $1 AND section = $2 AND academic_year = $3
    LIMIT 1
  `;
  const existingResult = await pool.query(existingQuery, [
    grade,
    section,
    academicYear,
  ]);

  if (existingResult.rows.length > 0) {
    const error = new Error(
      "This class already exists for the selected academic year.",
    );
    error.statusCode = 409;
    throw error;
  }

  const insertQuery = `
    INSERT INTO classes (grade, section, academic_year)
    VALUES ($1, $2, $3)
    RETURNING id, grade, section, academic_year, teacher_id, is_active, created_at
  `;
  const insertResult = await pool.query(insertQuery, [
    grade,
    section,
    academicYear,
  ]);

  return insertResult.rows[0];
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

async function getFilteredAttendanceRows(year, grade, section, date) {
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
      AND sh.attendance_date = $4
    ORDER BY s.full_name ASC
  `;

  const { rows } = await pool.query(query, [year, grade, section, date]);
  return rows;
}

async function getFilteredAttendanceSummary(year, grade, section, date) {
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
      AND sh.attendance_date = $4
  `;

  const { rows } = await pool.query(query, [year, grade, section, date]);
  return rows[0] || null;
}

async function getFilteredTermTestRows(year, grade, section, term) {
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
      sub.name AS subject_name
    FROM term_tests tt
    JOIN students s ON s.id = tt.student_id
    JOIN classes c ON c.id = tt.class_id
    JOIN subjects sub ON sub.id = tt.subject_id
    WHERE c.academic_year = $1
      AND c.grade = $2
      AND c.section = $3
      AND tt.term = $4
    ORDER BY s.full_name ASC, sub.name ASC
  `;

  const { rows } = await pool.query(query, [year, grade, section, term]);
  return rows;
}

async function getFilteredTermTestSummary(year, grade, section, term) {
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
      AND tt.term = $4
  `;

  const { rows } = await pool.query(query, [year, grade, section, term]);
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
};