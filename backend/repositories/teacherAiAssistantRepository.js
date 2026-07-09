const pool = require("../db");
const teacherRepository = require("./teacherRepository");

async function getTeacherAssistantContext(teacherId) {
  const teacherClass = await teacherRepository.getTeacherCurrentClass(
    pool,
    teacherId,
  );
  if (!teacherClass) {
    return { teacher: null, classInfo: null };
  }

  const teacherResult = await pool.query(
    `
      SELECT id, full_name, email, phone, teacher_code
      FROM users
      WHERE id = $1 AND role = 'teacher'
      LIMIT 1
    `,
    [teacherId],
  );

  return {
    teacher: teacherResult.rows[0] || null,
    classInfo: teacherClass,
  };
}

async function getTodayAttendanceSummary(classId) {
  const { rows } = await pool.query(
    `
      SELECT
        COALESCE(SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END), 0) AS present_count,
        COALESCE(SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END), 0) AS absent_count,
        COALESCE(SUM(CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END), 0) AS late_count,
        COALESCE(COUNT(ar.id), 0) AS total_count
      FROM attendance_sheets sh
      LEFT JOIN attendance_records ar ON ar.attendance_sheet_id = sh.id
      WHERE sh.class_id = $1
        AND sh.attendance_date = CURRENT_DATE
    `,
    [classId],
  );

  const row = rows[0] || {};
  const totalCount = Number(row.total_count || 0);
  const attendedCount =
    Number(row.present_count || 0) + Number(row.late_count || 0);

  return {
    presentCount: Number(row.present_count || 0),
    absentCount: Number(row.absent_count || 0),
    lateCount: Number(row.late_count || 0),
    totalCount,
    attendancePercent:
      totalCount > 0
        ? Number(((attendedCount * 100) / totalCount).toFixed(2))
        : 0,
  };
}

async function getOverallAttendanceSummaryForClass(classId) {
  const { rows } = await pool.query(
    `
      SELECT
        COALESCE(SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END), 0) AS present_count,
        COALESCE(SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END), 0) AS absent_count,
        COALESCE(SUM(CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END), 0) AS late_count,
        COALESCE(COUNT(ar.id), 0) AS total_count
      FROM attendance_sheets sh
      LEFT JOIN attendance_records ar ON ar.attendance_sheet_id = sh.id
      WHERE sh.class_id = $1
    `,
    [classId],
  );

  const row = rows[0] || {};
  const totalCount = Number(row.total_count || 0);
  const attendedCount =
    Number(row.present_count || 0) + Number(row.late_count || 0);

  return {
    presentCount: Number(row.present_count || 0),
    absentCount: Number(row.absent_count || 0),
    lateCount: Number(row.late_count || 0),
    totalCount,
    attendancePercent:
      totalCount > 0
        ? Number(((attendedCount * 100) / totalCount).toFixed(2))
        : 0,
  };
}

async function getLatestTermForClass(classId, academicYear) {
  const { rows } = await pool.query(
    `
      SELECT COALESCE(MAX(term), 0) AS latest_term
      FROM term_tests
      WHERE class_id = $1
        AND academic_year = $2
    `,
    [classId, academicYear],
  );

  const term = Number(rows[0]?.latest_term || 0);
  return term > 0 ? term : null;
}

async function getStudentMetricsForClass(classId, academicYear, term) {
  const { rows } = await pool.query(
    `
      WITH class_students AS (
        SELECT s.id, s.full_name
        FROM student_class_assignments sca
        JOIN students s ON s.id = sca.student_id
        WHERE sca.class_id = $1
          AND sca.removed_at IS NULL
          AND s.is_active = true
      ),
      attendance_stats AS (
        SELECT
          cs.id AS student_id,
          COUNT(ar.id) AS attendance_count,
          COUNT(*) FILTER (WHERE ar.status IN ('present', 'late')) AS attended_count,
          COUNT(*) FILTER (WHERE ar.status = 'late') AS late_count
        FROM class_students cs
        LEFT JOIN attendance_sheets sh ON sh.class_id = $1
        LEFT JOIN attendance_records ar
          ON ar.attendance_sheet_id = sh.id
         AND ar.student_id = cs.id
        GROUP BY cs.id
      ),
      mark_stats AS (
        SELECT
          cs.id AS student_id,
          ROUND(COALESCE(AVG(tt.mark), 0)::numeric, 2) AS average_mark,
          COUNT(tt.id) AS marks_count
        FROM class_students cs
        LEFT JOIN term_tests tt
          ON tt.student_id = cs.id
         AND tt.class_id = $1
         AND tt.academic_year = $2
         AND tt.term = $3
        GROUP BY cs.id
      )
      SELECT
        cs.id,
        cs.full_name,
        COALESCE(attendance_stats.attendance_count, 0) AS attendance_count,
        COALESCE(attendance_stats.attended_count, 0) AS attended_count,
        COALESCE(attendance_stats.late_count, 0) AS late_count,
        ROUND(
          CASE
            WHEN COALESCE(attendance_stats.attendance_count, 0) = 0 THEN 0
            ELSE (COALESCE(attendance_stats.attended_count, 0) * 100.0 / attendance_stats.attendance_count)
          END::numeric,
          2
        ) AS attendance_percent,
        COALESCE(mark_stats.average_mark, 0) AS average_mark,
        COALESCE(mark_stats.marks_count, 0) AS marks_count
      FROM class_students cs
      LEFT JOIN attendance_stats ON attendance_stats.student_id = cs.id
      LEFT JOIN mark_stats ON mark_stats.student_id = cs.id
      ORDER BY cs.full_name ASC
    `,
    [classId, academicYear, term],
  );

  return rows.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    attendanceCount: Number(row.attendance_count || 0),
    attendedCount: Number(row.attended_count || 0),
    lateCount: Number(row.late_count || 0),
    attendancePercent: Number(row.attendance_percent || 0),
    averageMark: Number(row.average_mark || 0),
    marksCount: Number(row.marks_count || 0),
  }));
}

async function getLateStudentsForClass(classId) {
  const { rows } = await pool.query(
    `
      WITH class_students AS (
        SELECT s.id, s.full_name
        FROM student_class_assignments sca
        JOIN students s ON s.id = sca.student_id
        WHERE sca.class_id = $1
          AND sca.removed_at IS NULL
          AND s.is_active = true
      ),
      attendance_stats AS (
        SELECT
          cs.id AS student_id,
          COUNT(*) FILTER (WHERE ar.status = 'late') AS late_count
        FROM class_students cs
        LEFT JOIN attendance_sheets sh ON sh.class_id = $1
        LEFT JOIN attendance_records ar
          ON ar.attendance_sheet_id = sh.id
         AND ar.student_id = cs.id
        GROUP BY cs.id
      )
      SELECT cs.id, cs.full_name, COALESCE(attendance_stats.late_count, 0) AS late_count
      FROM class_students cs
      LEFT JOIN attendance_stats ON attendance_stats.student_id = cs.id
      WHERE COALESCE(attendance_stats.late_count, 0) >= 3
      ORDER BY late_count DESC, cs.full_name ASC
    `,
    [classId],
  );

  return rows.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    lateCount: Number(row.late_count || 0),
  }));
}

async function getSubjectAveragesForTerm(classId, academicYear, term) {
  const { rows } = await pool.query(
    `
      SELECT
        sub.id,
        sub.name,
        ROUND(AVG(tt.mark)::numeric, 2) AS average_mark
      FROM term_tests tt
      JOIN subjects sub ON sub.id = tt.subject_id
      WHERE tt.class_id = $1
        AND tt.academic_year = $2
        AND tt.term = $3
      GROUP BY sub.id, sub.name
      ORDER BY average_mark DESC, sub.name ASC
    `,
    [classId, academicYear, term],
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    averageMark: Number(row.average_mark || 0),
  }));
}

async function getClassAverageMarkForTerm(classId, academicYear, term) {
  const { rows } = await pool.query(
    `
      SELECT ROUND(COALESCE(AVG(mark), 0)::numeric, 2) AS average_mark
      FROM term_tests
      WHERE class_id = $1
        AND academic_year = $2
        AND term = $3
    `,
    [classId, academicYear, term],
  );

  return Number(rows[0]?.average_mark || 0);
}

async function getAttendanceComparisonForClass(classId) {
  const { rows } = await pool.query(
    `
      WITH month_stats AS (
        SELECT
          date_trunc('month', sh.attendance_date)::date AS month_start,
          COUNT(ar.id) AS total_count,
          COUNT(*) FILTER (WHERE ar.status IN ('present', 'late')) AS attended_count
        FROM attendance_sheets sh
        LEFT JOIN attendance_records ar ON ar.attendance_sheet_id = sh.id
        WHERE sh.class_id = $1
          AND sh.attendance_date >= (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')
          AND sh.attendance_date < (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')
        GROUP BY 1
      )
      SELECT
        month_start,
        ROUND(
          CASE
            WHEN total_count = 0 THEN 0
            ELSE (attended_count * 100.0 / total_count)
          END::numeric,
          2
        ) AS attendance_percent
      FROM month_stats
    `,
    [classId],
  );

  return rows.map((row) => ({
    monthStart: row.month_start,
    attendancePercent: Number(row.attendance_percent || 0),
  }));
}

async function getTodayAttendanceComparisonSummary(classId) {
  return getAttendanceComparisonForClass(classId);
}

module.exports = {
  getTeacherAssistantContext,
  getTodayAttendanceSummary,
  getOverallAttendanceSummaryForClass,
  getLatestTermForClass,
  getStudentMetricsForClass,
  getLateStudentsForClass,
  getSubjectAveragesForTerm,
  getClassAverageMarkForTerm,
  getAttendanceComparisonForClass,
  getTodayAttendanceComparisonSummary,
};
