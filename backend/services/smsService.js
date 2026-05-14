const axios = require("axios");

const TEXTLK_SMS_URL =
  process.env.TEXTLK_SMS_URL || "https://app.text.lk/api/v3/sms/send";

function requireSmsConfig() {
  const apiToken = String(process.env.API_TOKEN || "").trim();
  const senderId = String(process.env.SENDER_ID || "").trim();

  if (!apiToken || !senderId) {
    throw new Error(
      "SMS configuration missing. Set API_TOKEN and SENDER_ID in .env.",
    );
  }

  return { apiToken, senderId };
}

function sanitizePhone(phone) {
  let cleaned = String(phone || "")
    .replace(/\s+/g, "")
    .replace(/[()-]/g, "");

  if (!cleaned) {
    return null;
  }

  // Remove leading + if present
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }

  // If it starts with 0 (local format like 0771234567), replace with 94
  if (cleaned.startsWith("0")) {
    cleaned = "94" + cleaned.substring(1);
  }

  // Ensure it starts with 94 (Sri Lanka country code)
  if (!cleaned.startsWith("94")) {
    // Assume it's a local number without 0 prefix
    cleaned = "94" + cleaned;
  }

  return cleaned;
}

function formatAttendanceSms({
  parentName,
  studentName,
  className,
  attendanceDate,
  status,
  reason,
}) {
  const p = String(parentName || "Parent").trim();
  const s = String(studentName || "student").trim();
  const c = String(className || "class").trim();
  const normalizedStatus = String(status || "absent")
    .trim()
    .toLowerCase();
  const lateReason = String(reason || "").trim();

  const baseDate = attendanceDate ? new Date(attendanceDate) : new Date();
  const dateInSriLanka = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(baseDate);

  const message = `Dear ${p}, Your child ${s} ${normalizedStatus} at school on ${dateInSriLanka} at ${c}.`;

  if (normalizedStatus === "late" && lateReason) {
    return `${message} Reason: ${lateReason}.`;
  }

  return message;
}

function formatTermMarksSms({ parentName, term, className, subjectMarks }) {
  const p = String(parentName || "Parent").trim();
  const t = String(term || "term").trim();
  const c = String(className || "class").trim();

  const lines = Array.isArray(subjectMarks)
    ? subjectMarks
        .map((entry) => {
          const subject = String(
            entry?.name || entry?.subject || "Subject",
          ).trim();
          const mark = String(entry?.mark ?? "").trim();
          return `${subject} - ${mark}`;
        })
        .filter(Boolean)
    : [];

  const header = `Dear ${p}, Your child's ${t} ${c} marks has released,`;

  return [header, ...lines].join("\n");
}

function formatEmergencyAlertSms({ alertTitle, alertBody }) {
  const title = String(alertTitle || "").trim();
  const body = String(alertBody || "").trim();

  return [title, body].filter(Boolean).join("\n\n");
}

function formatRegistrationSms({
  parentName,
  studentName,
  className,
  studentCode,
}) {
  const p = String(parentName || "").trim();
  const s = String(studentName || "").trim();
  const c = String(className || "").trim();
  const code = String(studentCode || "").trim();

  const parts = [];
  if (p) parts.push(`Hi ${p},`);
  parts.push(`${s} has been registered to ${c}.`);
  if (code) parts.push(`Student Code: ${code}`);

  return parts.join(" ");
}

async function sendSms({ recipient, message }) {
  const { apiToken, senderId } = requireSmsConfig();

  const response = await axios.post(
    TEXTLK_SMS_URL,
    {
      recipient,
      sender_id: senderId,
      type: "plain",
      message,
    },
    {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    },
  );

  return response.data;
}

module.exports = {
  sanitizePhone,
  formatAttendanceSms,
  formatTermMarksSms,
  formatEmergencyAlertSms,
  formatRegistrationSms,
  sendSms,
};
