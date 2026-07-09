const test = require("node:test");
const assert = require("node:assert/strict");

const { buildFallbackReply } = require("../services/teacherAiAssistantService");

test("buildFallbackReply summarises students at risk", () => {
  const reply = buildFallbackReply({
    intent: "risk_students",
    payload: {
      classLabel: "Grade 8 Class A",
      students: [
        {
          fullName: "Alice Johnson",
          attendancePercent: 68,
          averageMark: 42,
          riskLevel: "High Risk",
        },
        {
          fullName: "Bob Smith",
          attendancePercent: 79,
          averageMark: 55,
          riskLevel: "Medium Risk",
        },
      ],
    },
  });

  assert.match(reply, /Grade 8 Class A/i);
  assert.match(reply, /Alice Johnson/i);
  assert.match(reply, /High Risk/i);
  assert.match(reply, /attendance/i);
});
