const pool = require("../db");
const { sanitizePhone, sendSms } = require("./smsService");

async function ensureAlertsTable() {
  const q = `
    CREATE TABLE IF NOT EXISTS alerts (
      id SERIAL PRIMARY KEY,
      student_id VARCHAR NOT NULL,
      type VARCHAR(32),
      message TEXT,
      sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
  await pool.query(q);
}

async function calculateAttendance(studentId) {
  // total days = number of attendance records for the student
  const totalRes = await pool.query(
    `SELECT COUNT(*)::int AS total_days FROM attendance_records WHERE student_id = $1`,
    [studentId],
  );
  const total_days = totalRes.rows[0]?.total_days || 0;

  // present days = count where status = 'present' OR 'late' (late counts as present)
  const presentRes = await pool.query(
    `SELECT COUNT(*)::int AS present_days FROM attendance_records WHERE student_id = $1 AND (status = 'present' OR status = 'late')`,
    [studentId],
  );
  const present_days = presentRes.rows[0]?.present_days || 0;

  const percentage = total_days > 0 ? (present_days / total_days) * 100 : 0;

  return { total_days, present_days, percentage };
}

async function shouldSendAlert(studentId) {
  await ensureAlertsTable();
  const res = await pool.query(
    `SELECT sent_at FROM alerts WHERE student_id = $1 ORDER BY sent_at DESC LIMIT 1`,
    [studentId],
  );

  if (res.rows.length === 0) return true;

  const last = res.rows[0].sent_at;
  if (!last) return true;
  const diffMs = Date.now() - new Date(last).getTime();
  const days = diffMs / (1000 * 60 * 60 * 24);
  return days >= 7;
}

function generateAlertMessage(parentName, studentName, percentage) {
  const p = String(parentName || "Parent").trim();
  const s = String(studentName || "Student").trim();
  const perc = Math.round(percentage);
  return `Hi ${p}, your child ${s} has low attendance (${perc}%). Please take action.`;
}

async function insertAlert(studentId, type, message) {
  await ensureAlertsTable();
  await pool.query(
    `INSERT INTO alerts (student_id, type, message, sent_at) VALUES ($1, $2, $3, NOW())`,
    [String(studentId), type, message],
  );
}

async function processAttendanceAlerts() {
  // load students
  const studentsRes = await pool.query(
    `SELECT id, full_name, parent_name, parent_phone FROM students WHERE is_active IS DISTINCT FROM false`,
  );

  const students = studentsRes.rows || [];
  let alertsSent = 0;
  let totalChecked = 0;

  for (const student of students) {
    try {
      const { total_days, present_days, percentage } =
        await calculateAttendance(student.id);

      // skip early evaluation
      if (total_days < 10) continue;

      totalChecked += 1;

      let type = null;
      if (percentage < 60) type = "urgent";
      else if (percentage < 80) type = "warning";

      if (!type) continue;

      const canSend = await shouldSendAlert(student.id);
      if (!canSend) continue;

      const message = generateAlertMessage(
        student.parent_name,
        student.full_name,
        percentage,
      );
      const recipient = sanitizePhone(student.parent_phone);

      if (!recipient) {
        // still record alert attempt without sending
        await insertAlert(student.id, type, message + " (no phone)");
        continue;
      }

      try {
        await sendSms({ recipient, message });
        await insertAlert(student.id, type, message);
        alertsSent += 1;
      } catch (smsErr) {
        // log alert insert with failure note
        await insertAlert(
          student.id,
          type,
          message + ` (send_error: ${smsErr.message})`,
        );
      }
    } catch (err) {
      console.error(
        "Attendance alert processing error for student",
        student.id,
        err.message,
      );
      continue;
    }
  }

  return { totalChecked, alertsSent };
}

module.exports = {
  calculateAttendance,
  shouldSendAlert,
  generateAlertMessage,
  processAttendanceAlerts,
};
