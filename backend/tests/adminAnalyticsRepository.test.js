const test = require("node:test");
const assert = require("node:assert/strict");

const pool = require("../db");
const adminAnalyticsRepository = require("../repositories/adminAnalyticsRepository");

test("getSubjectPerformanceSeries uses the selected subject and grade to build class-level averages", async () => {
  const originalQuery = pool.query;
  const calls = [];

  pool.query = async (query, values) => {
    calls.push({ query, values });
    return {
      rows: [
        {
          class_label: "Grade 6 - A",
          average_marks: 78.5,
        },
      ],
    };
  };

  try {
    const rows = await adminAnalyticsRepository.getSubjectPerformanceSeries(
      2025,
      6,
      "Science",
      2,
    );

    assert.deepEqual(rows, [
      {
        class_label: "Grade 6 - A",
        average_marks: 78.5,
      },
    ]);
    assert.equal(calls.length, 1);
    assert.match(calls[0].query, /subject_id/i);
    assert.match(calls[0].query, /class_label/i);
    assert.ok(calls[0].values.includes("Science"));
  } finally {
    pool.query = originalQuery;
  }
});
