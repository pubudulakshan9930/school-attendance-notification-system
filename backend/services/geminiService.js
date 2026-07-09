const axios = require("axios");

const GEMINI_API_KEY = String(process.env.GEMINI_API_KEY || "").trim();
const GEMINI_MODEL = String(
  process.env.GEMINI_MODEL || "gemini-2.0-flash",
).trim();
const GEMINI_BASE_URL = String(
  process.env.GEMINI_BASE_URL ||
    "https://generativelanguage.googleapis.com/v1beta",
).trim();

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryableStatus(error) {
  const status = error?.response?.status || error?.status;
  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

async function generateGeminiText({ systemInstruction, prompt }) {
  if (!GEMINI_API_KEY) {
    const error = new Error(
      "AI Assistant is not configured. Add GEMINI_API_KEY to backend/.env and restart the server.",
    );
    error.statusCode = 503;
    error.code = "GEMINI_API_KEY_MISSING";
    throw error;
  }

  let lastError;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await axios.post(
        `${GEMINI_BASE_URL}/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`,
        {
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            topP: 0.9,
            maxOutputTokens: 900,
          },
        },
        {
          params: {
            key: GEMINI_API_KEY,
          },
          timeout: 15000,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const text =
        response.data?.candidates?.[0]?.content?.parts
          ?.map((part) => part?.text || "")
          .join("")
          .trim() || "";

      if (!text) {
        const error = new Error("AI Assistant is temporarily unavailable.");
        error.statusCode = 503;
        error.code = "GEMINI_EMPTY_RESPONSE";
        throw error;
      }

      return text;
    } catch (error) {
      lastError = error;
      if (attempt === 2 || !getRetryableStatus(error)) {
        break;
      }

      await delay(600);
    }
  }

  const status = lastError?.response?.status || lastError?.status || 503;
  const code =
    lastError?.code === "ECONNABORTED"
      ? "GEMINI_RATE_LIMITED"
      : lastError?.code;
  const error = new Error("AI Assistant is temporarily unavailable.");
  error.statusCode = status;
  error.status = status;
  error.code = code || "GEMINI_RATE_LIMITED";
  throw error;
}

module.exports = {
  generateGeminiText,
};
