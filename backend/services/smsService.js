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
    .trim()
    .replace(/[^\d+]/g, "");

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

  return `+${cleaned}`;
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

function formatTermMarksSms({
  parentName,
  studentName,
  term,
  className,
  studentRank,
  totalMark,
  subjectMarks,
}) {
  const p = String(parentName || "Parent").trim();
  const s = String(studentName || "student").trim();
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

  const header = `Dear ${p}, ${s}'s ${t} ${c} marks have been released.`;
  const rankLine = `Class Rank: ${studentRank ?? "N/A"}`;
  const totalLine = `Total Marks: ${totalMark ?? "N/A"}`;

  return [header, rankLine, totalLine, ...lines].join("\n");
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

function looksLikeSuccessfulSmsResponse(response) {
  if (response == null) {
    return false;
  }

  if (typeof response === "string") {
    const normalized = response.toLowerCase();
    return (
      normalized.includes("success") ||
      normalized.includes("queued") ||
      normalized.includes("accepted") ||
      normalized.includes("sent")
    );
  }

  if (typeof response === "object") {
    if (response.success === false) {
      return false;
    }

    if (
      response.status === "failed" ||
      response.status === "error" ||
      response.status === "failure"
    ) {
      return false;
    }

    if (response.message && typeof response.message === "string") {
      const normalized = response.message.toLowerCase();
      if (
        normalized.includes("error") ||
        normalized.includes("failed") ||
        normalized.includes("rejected")
      ) {
        return false;
      }
    }

    return true;
  }

  return true;
}

async function sendSms({ recipient, message }) {
  const { apiToken, senderId } = requireSmsConfig();

  const cleaned = sanitizePhone(recipient);
  if (!cleaned) {
    throw new Error(`Invalid recipient phone number: ${recipient}`);
  }

  const payload = {
    api_token: apiToken,
    recipient: cleaned,
    sender_id: senderId,
    type: "plain",
    message,
  };

  const formPayload = new URLSearchParams({
    api_token: apiToken,
    recipient: cleaned,
    sender_id: senderId,
    type: "plain",
    message,
  });

  async function postSmsRequest(data, headers) {
    const response = await axios.post(TEXTLK_SMS_URL, data, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "X-API-Token": apiToken,
        ...headers,
      },
      timeout: 10000,
    });

    return response.data;
  }

  try {
    const response = await postSmsRequest(payload, {
      "Content-Type": "application/json",
      Accept: "application/json",
    });

    if (!looksLikeSuccessfulSmsResponse(response)) {
      const providerMsg = response?.message || response?.error || response;
      const error = new Error(
        `SMS provider rejected the request: ${JSON.stringify(providerMsg)}`,
      );
      error.cause = response;
      throw error;
    }

    return response;
  } catch (err) {
    try {
      const response = await postSmsRequest(formPayload.toString(), {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      });

      if (!looksLikeSuccessfulSmsResponse(response)) {
        const providerMsg = response?.message || response?.error || response;
        const error = new Error(
          `SMS provider rejected the request: ${JSON.stringify(providerMsg)}`,
        );
        error.cause = response;
        throw error;
      }

      return response;
    } catch (fallbackErr) {
      const providerMsg =
        fallbackErr?.response?.data ||
        fallbackErr?.response ||
        fallbackErr.message;
      const e = new Error(`SMS provider error: ${JSON.stringify(providerMsg)}`);
      e.cause = fallbackErr;
      throw e;
    }
  }
}

module.exports = {
  sanitizePhone,
  formatAttendanceSms,
  formatTermMarksSms,
  formatEmergencyAlertSms,
  formatRegistrationSms,
  sendSms,
};
