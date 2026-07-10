const test = require("node:test");
const assert = require("node:assert/strict");
const {
  storeOtpRecord,
  verifyOtpRecord,
  consumeOtpRecord,
} = require("../services/teacherPasswordResetService");

test("stores and verifies a one-time password for a normalized phone number", () => {
  const phone = "+94 77 123 4567";
  const otp = "123456";

  storeOtpRecord(phone, { otp, teacherId: 42 });

  const firstCheck = verifyOtpRecord(phone, otp);
  assert.equal(firstCheck.valid, true);
  assert.equal(firstCheck.teacherId, 42);

  const secondCheck = verifyOtpRecord(phone, otp);
  assert.equal(secondCheck.valid, false);

  const consumed = consumeOtpRecord(phone);
  assert.equal(consumed, true);
});
