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
  return String(phone || "")
    .replace(/\s+/g, "")
    .replace(/[()-]/g, "");
}

function formatAttendanceSms({
  parentName,
  studentName,
  className,
  attendanceDate,
  status,
}) {
  return `Hi ${parentName}, ${studentName} (${className}) attendance on ${attendanceDate}: ${status}.`;
}

function formatEmergencyAlertSms({ alertTitle, alertBody }) {
  const title = String(alertTitle || "").trim();
  const body = String(alertBody || "").trim();

  return [title, body].filter(Boolean).join("\n\n");
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
  formatEmergencyAlertSms,
  sendSms,
};
