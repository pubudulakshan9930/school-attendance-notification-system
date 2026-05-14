/**
 * Script to inspect the contents of an uploaded spreadsheet file.
 * Shows what student_ids and marks are in the file.
 *
 * Usage: node inspect-spreadsheet.js <file_path>
 * Example: node inspect-spreadsheet.js tmp/subject-marks.xlsx
 */

const fs = require("fs");
const path = require("path");
const {
  parseSubjectMarksSpreadsheetFile,
} = require("../services/termMarksSpreadsheetService");

async function inspectSpreadsheet(filePath) {
  try {
    if (!filePath) {
      console.error(
        "Error: file_path is required. Usage: node inspect-spreadsheet.js <file_path>",
      );
      process.exit(1);
    }

    const fullPath = path.resolve(__dirname, "..", filePath);

    if (!fs.existsSync(fullPath)) {
      console.error(`Error: File not found at ${fullPath}`);
      process.exit(1);
    }

    console.log(`\n=== SPREADSHEET INSPECTION ===`);
    console.log(`File: ${filePath}\n`);

    const fileData = fs.readFileSync(fullPath);
    const file = {
      name: path.basename(fullPath),
      data: fileData,
    };

    const result = parseSubjectMarksSpreadsheetFile(file);

    console.log(`Sheet Name: ${result.sheetName}`);
    console.log(`Total Rows: ${result.rows.length}\n`);

    console.log(`=== ROWS IN SPREADSHEET ===`);
    result.rows.forEach((row, index) => {
      console.log(`Row ${row.rowNumber}:`);
      console.log(`  student_id: ${row.student_id}`);
      console.log(`  mark: ${row.mark}`);
      if (row.comment) {
        console.log(`  comment: ${row.comment}`);
      }
      if (row.errors.length > 0) {
        console.log(`  ERRORS: ${row.errors.join(", ")}`);
      }
    });

    if (result.errors.length > 0) {
      console.log(`\n=== PARSING ERRORS ===`);
      result.errors.forEach((err) => {
        console.log(`Row ${err.row}: ${err.error}`);
      });
    }

    console.log(`\n=== INSTRUCTIONS ===`);
    console.log(
      `1. Check if the student_id values in the spreadsheet match your actual class roster.`,
    );
    console.log(
      `2. Use the script: node get-roster-for-upload.js <teacher_id>`,
    );
    console.log(
      `3. Copy the correct student_id values from your class roster.`,
    );

    process.exit(0);
  } catch (error) {
    console.error("Error inspecting spreadsheet:", error.message);
    process.exit(1);
  }
}

const filePath = process.argv[2];
inspectSpreadsheet(filePath);
