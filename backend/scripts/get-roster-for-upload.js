/**
 * Script to retrieve the actual student roster with student_code values
 * that should be used in the spreadsheet upload.
 *
 * Usage: node get-roster-for-upload.js <teacher_id>
 * Example: node get-roster-for-upload.js 123e4567-e89b-12d3-a456-426614174000
 */

const pool = require("../db");
const teacherRepository = require("../repositories/teacherRepository");

async function getRosterForUpload(teacherId) {
  try {
    if (!teacherId) {
      console.error(
        "Error: teacher_id is required. Usage: node get-roster-for-upload.js <teacher_id>",
      );
      process.exit(1);
    }

    console.log(`\nFetching roster for teacher: ${teacherId}\n`);

    const teacherClass = await teacherRepository.getTeacherCurrentClass(
      pool,
      teacherId,
    );

    if (!teacherClass) {
      console.error("Error: Teacher is not assigned to an active class.");
      process.exit(1);
    }

    const students = await teacherRepository.getStudentsByClass(
      pool,
      teacherClass.id,
    );

    console.log(`=== CLASS ROSTER ===`);
    console.log(
      `Class: Grade ${teacherClass.grade} Section ${teacherClass.section}`,
    );
    console.log(`Academic Year: ${teacherClass.academic_year}`);
    console.log(`Total Students: ${students.length}\n`);

    console.log(`student_code,mark`);
    students.forEach((student) => {
      console.log(`${student.student_code},`);
    });

    console.log(`\n=== INSTRUCTIONS ===`);
    console.log(`1. Copy the student_code values above.`);
    console.log(
      `2. Create a CSV/XLSX file with two columns: student_code and mark.`,
    );
    console.log(
      `3. For each student, enter their student_code and the mark (0-100).`,
    );
    console.log(`4. Example row: ${students[0]?.student_code || "S001"},85`);
    console.log(
      `5. Upload the file via the Teacher → Term → Subject → Bulk upload panel.`,
    );

    process.exit(0);
  } catch (error) {
    console.error("Error retrieving roster:", error.message);
    process.exit(1);
  }
}

const teacherId = process.argv[2];
getRosterForUpload(teacherId);
