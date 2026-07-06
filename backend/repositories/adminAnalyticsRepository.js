const pool = require("../db");

async function getAttendanceTrendLast30SchoolDays() {
  const query = `
    WITH school_days AS (
      SELECT day::date AS attendance_date
      FROM generate_series(
        CURRENT_DATE - INTERVAL '120 days',
        CURRENT_DATE,
        INTERVAL '1 day'
      ) AS day
      WHERE EXTRACT(ISODOW FROM day) < 6
      ORDER BY day DESC
      LIMIT 30
    ),
    daily_attendance AS (
      SELECT
        ats.attendance_date::date AS attendance_date,
        COUNT(DISTINCT ar.student_id) FILTER (WHERE ar.status = 'present') AS present_count,
        COUNT(DISTINCT ar.student_id) FILTER (WHERE ar.status = 'late') AS late_count,
        COUNT(DISTINCT ar.student_id) FILTER (WHERE ar.status = 'absent') AS absent_count,
        COUNT(DISTINCT s.id) AS total_students
      FROM attendance_sheets ats
      JOIN attendance_records ar ON ar.attendance_sheet_id = ats.id
      JOIN students s ON s.id = ar.student_id
      WHERE ats.attendance_date IN (SELECT attendance_date FROM school_days)
        AND s.is_active = true
      GROUP BY ats.attendance_date
    )
    SELECT
      sd.attendance_date,
      COALESCE(da.present_count, 0) AS present_count,
      COALESCE(da.late_count, 0) AS late_count,
      COALESCE(da.absent_count, 0) AS absent_count,
      COALESCE(da.total_students, 0) AS total_students,
      CASE
        WHEN COALESCE(da.total_students, 0) > 0 THEN ROUND(
          ((COALESCE(da.present_count, 0) + COALESCE(da.late_count, 0))::numeric
            / COALESCE(da.total_students, 0)) * 100,
          2
        )
        ELSE 0
      END AS attendance_percentage
    FROM school_days sd
    LEFT JOIN daily_attendance da ON da.attendance_date = sd.attendance_date
    ORDER BY sd.attendance_date ASC
  `;

  const { rows } = await pool.query(query);
  return rows;
}

async function getTodayAttendanceByGrade(todayDate) {
  const query = `
    WITH active_students_by_grade AS (
      SELECT
        c.grade,
        s.id AS student_id
      FROM students s
      JOIN student_class_assignments sca
        ON sca.student_id = s.id
       AND sca.removed_at IS NULL
      JOIN classes c
        ON c.id = sca.class_id
      WHERE s.is_active = true
        AND c.is_active = true
    ),
    grade_totals AS (
      SELECT
        grade,
        COUNT(DISTINCT student_id) AS total_students
      FROM active_students_by_grade
      GROUP BY grade
    ),
    grade_attendance_today AS (
      SELECT
        c.grade,
        COUNT(DISTINCT ar.student_id) FILTER (WHERE ar.status = 'present') AS present_count,
        COUNT(DISTINCT ar.student_id) FILTER (WHERE ar.status = 'late') AS late_count,
        COUNT(DISTINCT ar.student_id) FILTER (WHERE ar.status = 'absent') AS absent_count
      FROM attendance_records ar
      JOIN attendance_sheets ats
        ON ats.id = ar.attendance_sheet_id
       AND ats.attendance_date = $1
      JOIN classes c
        ON c.id = ats.class_id
       AND c.is_active = true
      JOIN students s
        ON s.id = ar.student_id
       AND s.is_active = true
      GROUP BY c.grade
    )
    SELECT
      gt.grade,
      COALESCE(gat.present_count, 0) AS present_count,
      COALESCE(gat.late_count, 0) AS late_count,
      COALESCE(gat.absent_count, 0) AS absent_count,
      gt.total_students,
      CASE
        WHEN gt.total_students > 0 THEN ROUND(
          ((COALESCE(gat.present_count, 0) + COALESCE(gat.late_count, 0))::numeric
            / gt.total_students) * 100,
          2
        )
        ELSE 0
      END AS attendance_percentage
    FROM grade_totals gt
    LEFT JOIN grade_attendance_today gat ON gat.grade = gt.grade
    ORDER BY gt.grade ASC
  `;

  const { rows } = await pool.query(query, [todayDate]);
  return rows;
}

async function getTodayAttendanceStatusDistribution(todayDate) {
  const query = `
    WITH attendance_status_counts AS (
      SELECT
        ar.status,
        COUNT(*) AS status_count
      FROM attendance_records ar
      JOIN attendance_sheets ats
        ON ats.id = ar.attendance_sheet_id
       AND ats.attendance_date = $1
      JOIN students s
        ON s.id = ar.student_id
       AND s.is_active = true
      GROUP BY ar.status
    )
    SELECT
      status_labels.status AS status,
      COALESCE(status_counts.status_count, 0) AS count
    FROM (
      VALUES ('present'), ('late'), ('absent')
    ) AS status_labels(status)
    LEFT JOIN attendance_status_counts status_counts
      ON status_counts.status = status_labels.status
    ORDER BY CASE status_labels.status
      WHEN 'present' THEN 1
      WHEN 'late' THEN 2
      WHEN 'absent' THEN 3
      ELSE 4
    END
  `;

  const { rows } = await pool.query(query, [todayDate]);
  return rows;
}

async function getSubjectPerformanceFilterOptions(academicYear, grade) {
  const clauses = ["c.is_active = true"];
  const values = [];

  if (academicYear) {
    clauses.push(`c.academic_year = $${values.length + 1}`);
    values.push(Number(academicYear));
  }

  if (grade) {
    clauses.push(`c.grade = $${values.length + 1}`);
    values.push(Number(grade));
  }

  const whereClause = clauses.join(" AND ");

  const [yearsResult, gradesResult, classesResult] = await Promise.all([
    pool.query(
      `
        SELECT DISTINCT c.academic_year
        FROM classes c
        WHERE ${whereClause}
        ORDER BY c.academic_year DESC
      `,
      values,
    ),
    pool.query(
      `
        SELECT DISTINCT c.grade
        FROM classes c
        WHERE ${whereClause}
        ORDER BY c.grade ASC
      `,
      values,
    ),
    pool.query(
      `
        SELECT
          c.id,
          c.academic_year,
          c.grade,
          c.section,
          c.stream,
          CASE
            WHEN NULLIF(c.section, '') IS NOT NULL THEN CONCAT('Grade ', c.grade, ' - ', c.section)
            WHEN NULLIF(c.stream, '') IS NOT NULL THEN CONCAT('Grade ', c.grade, ' - ', c.stream)
            ELSE CONCAT('Grade ', c.grade)
          END AS label
        FROM classes c
        WHERE ${whereClause}
        ORDER BY c.academic_year DESC, c.grade ASC, c.section ASC, c.stream ASC
      `,
      values,
    ),
  ]);

  return {
    academic_years: yearsResult.rows.map((row) => Number(row.academic_year)),
    grades: gradesResult.rows.map((row) => Number(row.grade)),
    classes: classesResult.rows.map((row) => ({
      id: row.id,
      academic_year: Number(row.academic_year),
      grade: Number(row.grade),
      section: String(row.section || ""),
      stream: String(row.stream || ""),
      label: String(row.label || ""),
    })),
  };
}

async function getSubjectPerformanceSeries(academicYear, grade, classId, term) {
  if (!classId || !term) {
    return [];
  }

  const values = [classId, Number(term)];
  const studentConditions = [
    "sca.class_id = $1",
    "sca.removed_at IS NULL",
    "s.is_active = true",
  ];
  const markConditions = [
    "tt.class_id = $1",
    "tt.term = $2",
    "tt.mark IS NOT NULL",
  ];

  let parameterIndex = 3;

  if (academicYear) {
    studentConditions.push(`selected_class.academic_year = $${parameterIndex}`);
    markConditions.push(`tt.academic_year = $${parameterIndex}`);
    values.push(Number(academicYear));
    parameterIndex += 1;
  }

  if (grade) {
    studentConditions.push(`selected_class.grade = $${parameterIndex}`);
    markConditions.push(`selected_class.grade = $${parameterIndex}`);
    values.push(Number(grade));
    parameterIndex += 1;
  }

  const query = `
    WITH selected_class AS (
      SELECT
        c.id,
        c.grade,
        c.academic_year
      FROM classes c
      WHERE c.id = $1
        AND c.is_active = true
    ),
    selected_students AS (
      SELECT
        s.id AS student_id
      FROM student_class_assignments sca
      JOIN students s
        ON s.id = sca.student_id
      JOIN selected_class
        ON selected_class.id = sca.class_id
      WHERE ${studentConditions.join(" AND ")}
    ),
    selected_marks AS (
      SELECT
        tt.subject_id,
        tt.mark
      FROM term_tests tt
      JOIN selected_students sel
        ON sel.student_id = tt.student_id
      JOIN selected_class
        ON selected_class.id = tt.class_id
      WHERE ${markConditions.join(" AND ")}
    ),
    subject_mark_aggregates AS (
      SELECT
        selected_marks.subject_id,
        ROUND(AVG(selected_marks.mark)::numeric, 2) AS average_marks
      FROM selected_marks
      GROUP BY selected_marks.subject_id
    )
    SELECT
      sub.name AS subject_name,
      subject_mark_aggregates.average_marks
    FROM subject_mark_aggregates
    JOIN subjects sub
      ON sub.id = subject_mark_aggregates.subject_id
    ORDER BY sub.name ASC
  `;

  const { rows } = await pool.query(query, values);
  return rows;
}

module.exports = {
  getAttendanceTrendLast30SchoolDays,
  getTodayAttendanceByGrade,
  getTodayAttendanceStatusDistribution,
  getSubjectPerformanceFilterOptions,
  getSubjectPerformanceSeries,
};
