const path = require("path");
const XLSX = require("xlsx");

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function asText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function isEmptyValue(value) {
  return asText(value) === "";
}

function pickValue(row, aliases) {
  const normalizedAliases = aliases.map((alias) => normalizeKey(alias));

  for (const [key, value] of Object.entries(row)) {
    if (normalizedAliases.includes(normalizeKey(key))) {
      return value;
    }
  }

  return "";
}

function parseMarkValue(rawMark) {
  const value = asText(rawMark).replace(/,/g, "");
  if (value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function normalizeSpreadsheetRow(row, rowNumber) {
  const studentCode = asText(
    pickValue(row, ["student_code", "student code", "id", "code"]),
  );
  // Note: new format requires `student_code` and `mark` only.
  const studentName = asText(
    pickValue(row, ["student_name", "student name", "full_name", "name"]),
  );
  const comment = asText(
    pickValue(row, ["comment", "remarks", "remark", "note"]),
  );
  const mark = parseMarkValue(
    pickValue(row, ["mark", "marks", "score", "result", "value"]),
  );

  const isBlankRow = Object.values(row).every(isEmptyValue);
  if (isBlankRow) {
    return null;
  }

  const errors = [];
  if (!studentCode) {
    errors.push("Student Code is required.");
  }

  if (mark === null) {
    errors.push("Mark must be a numeric value.");
  } else if (mark < 0 || mark > 100) {
    errors.push("Mark must be between 0 and 100.");
  }

  return {
    rowNumber,
    student_code: studentCode || null,
    student_name: studentName || null,
    comment: comment || null,
    mark,
    errors,
  };
}

function loadWorkbook(file) {
  const originalName = String(file?.name || file?.originalname || "");
  const extension = path.extname(originalName).toLowerCase();

  if (extension === ".csv") {
    return XLSX.read(file.data.toString("utf8"), { type: "string" });
  }

  return XLSX.read(file.data, { type: "buffer" });
}

function parseSubjectMarksSpreadsheetFile(file) {
  if (!file || !file.data) {
    const error = new Error("Spreadsheet file is required.");
    error.statusCode = 400;
    throw error;
  }

  const workbook = loadWorkbook(file);
  const sheetName = workbook.SheetNames?.[0];

  if (!sheetName) {
    const error = new Error("Spreadsheet does not contain any sheets.");
    error.statusCode = 400;
    throw error;
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  if (rawRows.length === 0) {
    const error = new Error("Spreadsheet is empty.");
    error.statusCode = 400;
    throw error;
  }

  const rows = [];
  const errors = [];

  rawRows.forEach((row, index) => {
    const normalized = normalizeSpreadsheetRow(row, index + 2);
    if (!normalized) {
      return;
    }

    if (normalized.errors.length > 0) {
      errors.push({
        row: normalized.rowNumber,
        error: normalized.errors.join(" "),
      });
    }

    rows.push(normalized);
  });

  if (rows.length === 0) {
    const error = new Error("Spreadsheet does not contain any data rows.");
    error.statusCode = 400;
    throw error;
  }

  return {
    rows,
    errors,
    sheetName,
  };
}

module.exports = {
  parseSubjectMarksSpreadsheetFile,
};
