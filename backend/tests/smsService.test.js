const test = require("node:test");
const assert = require("node:assert/strict");
const axios = require("axios");
const { sendSms } = require("../services/smsService");

test("sendSms throws when the provider rejects the request", async () => {
  const originalPost = axios.post;
  const originalApiToken = process.env.API_TOKEN;
  const originalSenderId = process.env.SENDER_ID;

  process.env.API_TOKEN = "test-token";
  process.env.SENDER_ID = "TEST";
  axios.post = async () => ({
    data: {
      success: false,
      message: "rejected",
    },
  });

  try {
    await assert.rejects(
      () => sendSms({ recipient: "0761722369", message: "Test OTP" }),
      /SMS provider/i,
    );
  } finally {
    axios.post = originalPost;
    process.env.API_TOKEN = originalApiToken;
    process.env.SENDER_ID = originalSenderId;
  }
});
