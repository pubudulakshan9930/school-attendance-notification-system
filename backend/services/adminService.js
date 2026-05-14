const pool = require("../db");

const DEFAULT_SETTINGS = {
  urgent_threshold: "60",
  warning_threshold: "80",
  attendance_threshold: "80",
};

let settingsInitPromise = null;

async function ensureSettingsTableExists() {
  if (!settingsInitPromise) {
    settingsInitPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(
        `
          INSERT INTO settings (key, value)
          VALUES
            ('urgent_threshold', '60'),
            ('warning_threshold', '80'),
            ('attendance_threshold', '80')
          ON CONFLICT (key) DO NOTHING
        `,
      );
    })().catch((error) => {
      settingsInitPromise = null;
      throw error;
    });
  }

  await settingsInitPromise;
}

/**
 * Attendance percentage calculation for a student over a date range
 * @param {string} studentId - Student ID
 * @param {string} fromDate - Start date (YYYY-MM-DD)
 * @param {string} toDate - End date (YYYY-MM-DD)
 * @returns {object} { total_days, present_days, absent_days, late_days, percentage }
 */
async function getAttendancePercentage(studentId, fromDate, toDate) {
  const query = `
    SELECT
      COUNT(*) FILTER (WHERE ar.status = 'present') AS present_days,
      COUNT(*) FILTER (WHERE ar.status = 'absent') AS absent_days,
      COUNT(*) FILTER (WHERE ar.status = 'late') AS late_days,
      COUNT(*) AS total_days
    FROM attendance_records ar
    JOIN attendance_sheets ats ON ats.id = ar.attendance_sheet_id
    WHERE ar.student_id = $1
      AND ats.attendance_date >= $2
      AND ats.attendance_date <= $3
  `;

  const { rows } = await pool.query(query, [studentId, fromDate, toDate]);
  const row = rows[0] || {};

  const totalDays = parseInt(row.total_days || 0, 10);
  const presentDays = parseInt(row.present_days || 0, 10);
  const lateDays = parseInt(row.late_days || 0, 10);
  // Treat late as present for percentage calc
  const effectivePresent = presentDays + lateDays;

  const percentage = totalDays > 0 ? (effectivePresent / totalDays) * 100 : 0;

  return {
    total_days: totalDays,
    present_days: presentDays,
    absent_days: parseInt(row.absent_days || 0, 10),
    late_days: lateDays,
    percentage: Math.round(percentage * 100) / 100,
  };
}

/**
 * Class attendance rate for a specific date
 * @param {string} classId - Class ID
 * @param {string} date - Date (YYYY-MM-DD)
 * @returns {object} { total_students, present_count, absent_count, late_count, attendance_rate }
 */
async function getClassAttendanceRate(classId, date) {
  const query = `
    SELECT
      COUNT(DISTINCT s.id) AS total_students,
      COUNT(DISTINCT ar.student_id) FILTER (WHERE ar.status = 'present') AS present_count,
      COUNT(DISTINCT ar.student_id) FILTER (WHERE ar.status = 'absent') AS absent_count,
      COUNT(DISTINCT ar.student_id) FILTER (WHERE ar.status = 'late') AS late_count
    FROM students s
    LEFT JOIN student_class_assignments sca ON sca.student_id = s.id AND sca.class_id = $1 AND sca.removed_at IS NULL
    LEFT JOIN attendance_sheets ats
      ON ats.class_id = $1
      AND ats.attendance_date = $2
    LEFT JOIN attendance_records ar
      ON ar.attendance_sheet_id = ats.id
      AND ar.student_id = s.id
    WHERE sca.student_id IS NOT NULL
      AND s.is_active = true
  `;

  const { rows } = await pool.query(query, [classId, date]);
  const row = rows[0] || {};

  const totalStudents = parseInt(row.total_students || 0, 10);
  const presentCount = parseInt(row.present_count || 0, 10);
  const lateCount = parseInt(row.late_count || 0, 10);
  const effectivePresent = presentCount + lateCount;

  const attendanceRate =
    totalStudents > 0 ? (effectivePresent / totalStudents) * 100 : 0;

  return {
    total_students: totalStudents,
    present_count: presentCount,
    absent_count: parseInt(row.absent_count || 0, 10),
    late_count: lateCount,
    attendance_rate: Math.round(attendanceRate * 100) / 100,
  };
}

/**
 * Determine risk category based on attendance percentage and settings
 * @param {number} percentage - Attendance percentage
 * @param {object} settings - { urgent_threshold, warning_threshold }
 * @returns {string} 'urgent' | 'warning' | 'good'
 */
function getRiskCategory(percentage, settings) {
  const urgentThreshold = parseFloat(settings.urgent_threshold || 60);
  const warningThreshold = parseFloat(settings.warning_threshold || 80);

  if (percentage < urgentThreshold) return "urgent";
  if (percentage < warningThreshold) return "warning";
  return "good";
}

/**
 * Get today's attendance summary across all students
 * @returns {object} { total_students, present_count, absent_count, late_count, attendance_rate }
 */
async function getTodayAttendanceSummary() {
  const today = new Date().toISOString().split("T")[0];

  const query = `
    SELECT
      COUNT(DISTINCT s.id) AS total_students,
      COUNT(DISTINCT ar.student_id) FILTER (WHERE ar.status = 'present') AS present_count,
      COUNT(DISTINCT ar.student_id) FILTER (WHERE ar.status = 'absent') AS absent_count,
      COUNT(DISTINCT ar.student_id) FILTER (WHERE ar.status = 'late') AS late_count
    FROM students s
    LEFT JOIN student_class_assignments sca ON sca.student_id = s.id AND sca.removed_at IS NULL
    LEFT JOIN attendance_sheets ats
      ON ats.class_id = sca.class_id
      AND ats.attendance_date = $1
    LEFT JOIN attendance_records ar
      ON ar.attendance_sheet_id = ats.id
      AND ar.student_id = s.id
    WHERE s.is_active = true
  `;

  const { rows } = await pool.query(query, [today]);
  const row = rows[0] || {};

  const totalStudents = parseInt(row.total_students || 0, 10);
  const presentCount = parseInt(row.present_count || 0, 10);
  const lateCount = parseInt(row.late_count || 0, 10);
  const effectivePresent = presentCount + lateCount;

  const attendanceRate =
    totalStudents > 0 ? (effectivePresent / totalStudents) * 100 : 0;

  return {
    total_students: totalStudents,
    present_count: presentCount,
    absent_count: parseInt(row.absent_count || 0, 10),
    late_count: lateCount,
    attendance_rate: Math.round(attendanceRate * 100) / 100,
  };
}

/**
 * Count total active students
 */
async function getTotalActiveStudents() {
  const query = `SELECT COUNT(*) AS count FROM students WHERE is_active = true`;
  const { rows } = await pool.query(query);
  return parseInt(rows[0]?.count || 0, 10);
}

/**
 * Count total active teachers
 */
async function getTotalActiveTeachers() {
  const query = `SELECT COUNT(*) AS count FROM users WHERE role = 'teacher' AND is_active = true`;
  const { rows } = await pool.query(query);
  return parseInt(rows[0]?.count || 0, 10);
}

/**
 * Get all settings as key-value pairs
 * @returns {object} { key1: value1, key2: value2, ... }
 */
async function getAllSettings() {
  await ensureSettingsTableExists();

  const query = `SELECT key, value FROM settings ORDER BY key`;
  const { rows } = await pool.query(query);

  const settings = { ...DEFAULT_SETTINGS };
  rows.forEach((row) => {
    settings[row.key] = row.value;
  });

  return settings;
}

/**
 * Update or insert a setting
 */
async function updateSetting(key, value) {
  await ensureSettingsTableExists();

  const query = `
    INSERT INTO settings (key, value)
    VALUES ($1, $2)
    ON CONFLICT (key) DO UPDATE
      SET value = $2,
          updated_at = NOW()
    RETURNING key, value
  `;

  const { rows } = await pool.query(query, [key, value]);
  return rows[0];
}

/**
 * Get low-attendance classes for a specific date
 * @param {string} date - Date (YYYY-MM-DD)
 * @param {number} threshold - Attendance percentage threshold
 * @returns {array} Classes with attendance below threshold
 */
async function getLowAttendanceClasses(date, threshold) {
  const query = `
    SELECT
      c.id,
      c.grade,
      c.section,
      c.academic_year,
      u.full_name AS teacher_name,
      COUNT(DISTINCT s.id) AS total_students,
      COUNT(DISTINCT ar.student_id) FILTER (WHERE ar.status IN ('present', 'late')) AS present_count,
      ROUND(
        CAST(
          COUNT(DISTINCT ar.student_id) FILTER (WHERE ar.status IN ('present', 'late'))
          AS NUMERIC
        ) / COUNT(DISTINCT s.id) * 100, 2
      ) AS attendance_rate
    FROM classes c
    LEFT JOIN users u ON u.id = c.teacher_id
    LEFT JOIN students s ON s.class_id = c.id AND s.is_active = true
    LEFT JOIN attendance_sheets ats
      ON ats.attendance_date = $1
      AND ats.class_id = c.id
    LEFT JOIN attendance_records ar
      ON ar.student_id = s.id
      AND ar.attendance_sheet_id = ats.id
    WHERE c.is_active = true
    GROUP BY c.id, u.id
    HAVING COUNT(DISTINCT s.id) > 0
      AND ROUND(
        CAST(
          COUNT(DISTINCT ar.student_id) FILTER (WHERE ar.status IN ('present', 'late'))
          AS NUMERIC
        ) / COUNT(DISTINCT s.id) * 100, 2
      ) < $2
    ORDER BY attendance_rate ASC
  `;

  const { rows } = await pool.query(query, [date, threshold]);
  return rows;
}

/**
 * Get low-attendance students (last 30 days)
 * @param {number} limit - Max students to return
 * @param {object} settings - Settings with thresholds
 * @returns {array} Students with low attendance
 */
async function getLowAttendanceStudents(limit = 10, settings = {}) {
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fromDate = thirtyDaysAgo.toISOString().split("T")[0];
  const toDate = today.toISOString().split("T")[0];

  const query = `
    SELECT
      s.id,
      s.full_name as name,
      c.grade,
      c.section,
      COUNT(ar.id) AS total_attendance_days,
      COUNT(ar.id) FILTER (WHERE ar.status = 'present') AS present_days,
      COUNT(ar.id) FILTER (WHERE ar.status = 'late') AS late_days,
      COUNT(ar.id) FILTER (WHERE ar.status = 'absent') AS absent_days,
      ROUND(
        CAST(
          COUNT(ar.id) FILTER (WHERE ar.status IN ('present', 'late'))
          AS NUMERIC
        ) / COUNT(ar.id) * 100, 2
      ) AS attendance_percentage
    FROM students s
    LEFT JOIN student_class_assignments sca ON sca.student_id = s.id AND sca.removed_at IS NULL
    LEFT JOIN classes c ON c.id = sca.class_id
    LEFT JOIN attendance_sheets ats
      ON ats.class_id = sca.class_id
      AND ats.attendance_date >= $1
      AND ats.attendance_date <= $2
    LEFT JOIN attendance_records ar
      ON ar.student_id = s.id
      AND ar.attendance_sheet_id = ats.id
    WHERE s.is_active = true AND sca.student_id IS NOT NULL
    GROUP BY s.id, c.id
    HAVING COUNT(ar.id) > 0
    ORDER BY attendance_percentage ASC
    LIMIT $3
  `;

  const { rows } = await pool.query(query, [fromDate, toDate, limit]);
  return rows;
}

/**
 * Get average term marks by subject for a class/term
 * @param {string} classId - Class ID
 * @param {number} term - Term number (1, 2, 3)
 * @returns {array} Subject-wise averages
 */
async function getSubjectAveragesByClass(classId, term) {
  const query = `
    SELECT
      sub.id,
      sub.name,
      ROUND(AVG(tm.marks)::NUMERIC, 2) AS average_mark,
      COUNT(tm.id) AS submission_count,
      COUNT(DISTINCT tm.student_id) AS student_count
    FROM subjects sub
    LEFT JOIN term_marks tm ON tm.subject_id = sub.id AND tm.term = $2
    LEFT JOIN students s ON s.id = tm.student_id
    WHERE s.class_id = $1
      AND s.is_active = true
    GROUP BY sub.id, sub.name
    ORDER BY average_mark DESC NULLS LAST
  `;

  const { rows } = await pool.query(query, [classId, term]);
  return rows;
}

/**
 * Get lowest performing students by term
 * @param {number} term - Term number
 * @param {number} limit - Max students to return
 * @returns {array} Lowest performing students
 */
async function getLowestPerformingStudents(term, limit = 10) {
  const query = `
    SELECT
      s.id,
      s.name,
      c.grade,
      c.section,
      ROUND(AVG(tm.marks)::NUMERIC, 2) AS average_mark,
      COUNT(tm.id) AS subject_count
    FROM students s
    LEFT JOIN classes c ON c.id = s.class_id
    LEFT JOIN term_marks tm ON tm.student_id = s.id AND tm.term = $1
    WHERE s.is_active = true
    GROUP BY s.id, c.id
    HAVING COUNT(tm.id) > 0
    ORDER BY average_mark ASC
    LIMIT $2
  `;

  const { rows } = await pool.query(query, [term, limit]);
  return rows;
}

/**
 * Get student alerts with recent entries
 * @param {string} fromDate - Start date (YYYY-MM-DD)
 * @param {string} toDate - End date (YYYY-MM-DD)
 * @param {string} classId - Optional class ID filter
 * @param {number} limit - Max records to return
 * @returns {array} Alert records with student info
 */
async function getAlerts(fromDate, toDate, classId = null, limit = 100) {
  let query = `
    SELECT
      a.id,
      a.student_id,
      s.name AS student_name,
      s.parent_name,
      s.parent_phone,
      c.grade,
      c.section,
      a.type,
      a.message,
      a.sent_at
    FROM alerts a
    LEFT JOIN students s ON s.id = a.student_id
    LEFT JOIN classes c ON c.id = s.class_id
    WHERE a.sent_at >= $1
      AND a.sent_at <= $2
  `;

  const params = [fromDate, toDate];

  if (classId) {
    query += ` AND s.class_id = $3`;
    params.push(classId);
  }

  query += ` ORDER BY a.sent_at DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  const { rows } = await pool.query(query, params);
  return rows;
}

/**
 * Get daily attendance report for a date range
 * @param {string} fromDate - Start date
 * @param {string} toDate - End date
 * @param {string} classId - Optional class filter
 * @returns {array} Daily records with counts
 */
async function getDailyAttendanceReport(fromDate, toDate, classId = null) {
  let query = `
    SELECT
      ats.attendance_date,
      COUNT(DISTINCT ar.student_id) FILTER (WHERE ar.status = 'present') AS present_count,
      COUNT(DISTINCT ar.student_id) FILTER (WHERE ar.status = 'absent') AS absent_count,
      COUNT(DISTINCT ar.student_id) FILTER (WHERE ar.status = 'late') AS late_count,
      COUNT(DISTINCT s.id) AS total_students,
      ROUND(
        CAST(
          COUNT(DISTINCT ar.student_id) FILTER (WHERE ar.status IN ('present', 'late'))
          AS NUMERIC
        ) / COUNT(DISTINCT s.id) * 100, 2
      ) AS attendance_rate
    FROM attendance_records ar
    JOIN attendance_sheets ats ON ats.id = ar.attendance_sheet_id
    LEFT JOIN students s
      ON s.id = ar.student_id
      AND s.is_active = true
  `;

  const params = [fromDate, toDate];

  if (classId) {
    query += ` WHERE s.class_id = $3`;
    params.push(classId);
  } else {
    query += ` WHERE 1=1`;
  }

  query += ` AND ats.attendance_date >= $1 AND ats.attendance_date <= $2
    GROUP BY ats.attendance_date
    ORDER BY ats.attendance_date DESC
  `;

  const { rows } = await pool.query(query, params);
  return rows;
}

/**
 * Move students from one class to another (for grade promotion)
 * @param {string} fromClassId - Source class ID
 * @param {string} toClassId - Destination class ID
 * @returns {object} { moved_count, failed_count }
 */
async function promoteStudentsToClass(fromClassId, toClassId) {
  const query = `
    UPDATE students
    SET class_id = $2
    WHERE class_id = $1 AND is_active = true
    RETURNING id
  `;

  const { rows } = await pool.query(query, [fromClassId, toClassId]);
  return {
    moved_count: rows.length,
    student_ids: rows.map((r) => r.id),
  };
}

/**
 * Get student details with recent alerts
 * @param {string} studentId - Student ID
 * @param {number} alertLimit - Max alerts to fetch
 * @returns {object} Student with alerts and attendance
 */
async function getStudentDetailedInfo(studentId, alertLimit = 5) {
  const studentQuery = `
    SELECT
      s.id,
      s.name,
      s.parent_name,
      s.parent_phone,
      s.parent_email,
      s.is_active,
      c.grade,
      c.section,
      c.academic_year,
      u.full_name AS teacher_name
    FROM students s
    LEFT JOIN classes c ON c.id = s.class_id
    LEFT JOIN users u ON u.id = c.teacher_id
    WHERE s.id = $1
  `;

  const alertsQuery = `
    SELECT id, type, message, sent_at
    FROM alerts
    WHERE student_id = $1
    ORDER BY sent_at DESC
    LIMIT $2
  `;

  const [studentResult, alertsResult] = await Promise.all([
    pool.query(studentQuery, [studentId]),
    pool.query(alertsQuery, [studentId, alertLimit]),
  ]);

  const student = studentResult.rows[0];
  const alerts = alertsResult.rows;

  if (!student) {
    return null;
  }

  // Calculate recent attendance
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fromDate = thirtyDaysAgo.toISOString().split("T")[0];
  const toDate = today.toISOString().split("T")[0];

  const attendance = await getAttendancePercentage(studentId, fromDate, toDate);

  return {
    ...student,
    recent_attendance: attendance,
    recent_alerts: alerts,
  };
}

module.exports = {
  getAttendancePercentage,
  getClassAttendanceRate,
  getRiskCategory,
  getTodayAttendanceSummary,
  getTotalActiveStudents,
  getTotalActiveTeachers,
  getAllSettings,
  updateSetting,
  getLowAttendanceClasses,
  getLowAttendanceStudents,
  getSubjectAveragesByClass,
  getLowestPerformingStudents,
  getAlerts,
  getDailyAttendanceReport,
  promoteStudentsToClass,
  getStudentDetailedInfo,
};
