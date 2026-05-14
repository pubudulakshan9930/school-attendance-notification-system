const assert = require("assert");
const path = require("path");
const fs = require("fs");
const {
  parseSubjectMarksSpreadsheetFile,
} = require("../services/termMarksSpreadsheetService");

const templatePath = path.resolve(
  __dirname,
  "..",
  "..",
  "frontend",
  "public",
  "teacher",
  "term-test",
  "subject-marks-upload-template.csv",
);

const file = {
  name: "subject-marks-upload-template.csv",
  data: fs.readFileSync(templatePath),
};

const result = parseSubjectMarksSpreadsheetFile(file);

assert.ok(Array.isArray(result.rows), "rows should be an array");
assert.ok(result.rows.length >= 2, "template should contain sample rows");
assert.strictEqual(result.rows[0].student_code, "S001");
assert.strictEqual(result.rows[0].mark, 78);

console.log(`Parsed ${result.rows.length} row(s) from the sample template.`);
