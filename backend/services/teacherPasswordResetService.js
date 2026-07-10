const { sanitizePhone } = require("./smsService");

const otpRecords = new Map();
const OTP_TTL_MS = 5 * 60 * 1000;

function normalizePhone(phone) {
  const cleaned = sanitizePhone(phone);
  return cleaned || "";
}

function storeOtpRecord(phone, payload) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    throw new Error("Phone number is required.");
  }

  const record = {
    otp: String(payload.otp),
    teacherId: payload.teacherId,
    createdAt: Date.now(),
    expiresAt: Date.now() + OTP_TTL_MS,
    used: false,
  };

  otpRecords.set(normalizedPhone, record);
  return record;
}

function verifyOtpRecord(phone, otp) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return { valid: false };
  }

  const record = otpRecords.get(normalizedPhone);
  if (!record) {
    return { valid: false };
  }

  if (record.used) {
    return { valid: false };
  }

  if (Date.now() > record.expiresAt) {
    otpRecords.delete(normalizedPhone);
    return { valid: false };
  }

  if (String(record.otp) !== String(otp)) {
    return { valid: false };
  }

  record.used = true;
  otpRecords.set(normalizedPhone, record);

  return {
    valid: true,
    teacherId: record.teacherId,
    phone: normalizedPhone,
  };
}

function consumeOtpRecord(phone) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return false;
  }

  if (!otpRecords.has(normalizedPhone)) {
    return false;
  }

  otpRecords.delete(normalizedPhone);
  return true;
}

module.exports = {
  normalizePhone,
  storeOtpRecord,
  verifyOtpRecord,
  consumeOtpRecord,
};
