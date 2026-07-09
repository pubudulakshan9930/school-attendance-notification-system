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

  const [yearsResult, gradesResult, subjectsResult] = await Promise.all([
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
        SELECT DISTINCT
          sub.id,
          sub.name
        FROM term_tests tt
        JOIN classes c
          ON c.id = tt.class_id
        JOIN subjects sub
          ON sub.id = tt.subject_id
        JOIN student_class_assignments sca
          ON sca.student_id = tt.student_id
         AND sca.class_id = tt.class_id
        JOIN students s
          ON s.id = tt.student_id
        WHERE ${whereClause}
          AND sca.removed_at IS NULL
          AND s.is_active = true
          AND tt.mark IS NOT NULL
        ORDER BY sub.name ASC
      `,
      values,
    ),
  ]);

  return {
    academic_years: yearsResult.rows.map((row) => Number(row.academic_year)),
    grades: gradesResult.rows.map((row) => Number(row.grade)),
    subjects: subjectsResult.rows.map((row) => ({
      id: row.id,
      name: String(row.name || ""),
    })),
  };
}

async function getSubjectPerformanceSeries(
  academicYear,
  grade,
  subjectId,
  term,
) {
  if (!subjectId || !term) {
    return [];
  }

  const values = [Number(term), String(subjectId)];
  const classConditions = ["c.is_active = true"];
  let parameterIndex = 3;

  if (academicYear) {
    classConditions.push(`c.academic_year = $${parameterIndex}`);
    values.push(Number(academicYear));
    parameterIndex += 1;
  }

  if (grade) {
    classConditions.push(`c.grade = $${parameterIndex}`);
    values.push(Number(grade));
    parameterIndex += 1;
  }

  const query = `
    WITH selected_classes AS (
      SELECT
        c.id,
        c.grade,
        c.academic_year,
        CASE
          WHEN NULLIF(c.section, '') IS NOT NULL THEN CONCAT('Grade ', c.grade, ' - ', c.section)
          WHEN NULLIF(c.stream, '') IS NOT NULL THEN CONCAT('Grade ', c.grade, ' - ', c.stream)
          ELSE CONCAT('Grade ', c.grade)
        END AS class_label
      FROM classes c
      WHERE ${classConditions.join(" AND ")}
    ),
    selected_students AS (
      SELECT
        sca.class_id,
        s.id AS student_id
      FROM student_class_assignments sca
      JOIN students s
        ON s.id = sca.student_id
      JOIN selected_classes sc
        ON sc.id = sca.class_id
      WHERE sca.removed_at IS NULL
        AND s.is_active = true
    ),
    class_subject_marks AS (
      SELECT
        sc.id AS class_id,
        sc.class_label,
        tt.mark
      FROM selected_classes sc
      LEFT JOIN selected_students sel
        ON sel.class_id = sc.id
      LEFT JOIN term_tests tt
        ON tt.student_id = sel.student_id
       AND tt.class_id = sc.id
       AND tt.term = $1
       AND tt.subject_id = $2
       AND tt.mark IS NOT NULL
    )
    SELECT
      class_label,
      ROUND(COALESCE(AVG(mark), 0)::numeric, 2) AS average_marks
    FROM class_subject_marks
    GROUP BY class_id, class_label
    ORDER BY class_label ASC
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
