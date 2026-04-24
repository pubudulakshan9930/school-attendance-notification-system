const pool = require("./db");

(async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Get class ID
    const classResult = await client.query(
      "SELECT id FROM classes WHERE grade = $1 AND section = $2 AND academic_year = $3",
      [1, "A", 2026],
    );

    if (classResult.rows.length === 0) {
      console.log("Class not found");
      await client.query("ROLLBACK");
      process.exit(0);
    }

    const classId = classResult.rows[0].id;
    console.log("Found class ID:", classId);

    // Get all student IDs in this class
    const studentsResult = await client.query(
      "SELECT student_id FROM student_class_assignments WHERE class_id = $1",
      [classId],
    );

    const studentIds = studentsResult.rows.map((r) => r.student_id);
    console.log("Found", studentIds.length, "students");

    if (studentIds.length === 0) {
      console.log("No students to delete");
      await client.query("ROLLBACK");
      process.exit(0);
    }

    // Delete attendance records
    const ar1 = await client.query(
      "DELETE FROM attendance_records WHERE student_id = ANY($1)",
      [studentIds],
    );
    console.log("Deleted", ar1.rowCount, "attendance records");

    // Delete attendance sheets for this class
    const ar2 = await client.query(
      "DELETE FROM attendance_sheets WHERE class_id = $1",
      [classId],
    );
    console.log("Deleted", ar2.rowCount, "attendance sheets");

    // Delete term tests
    const ar3 = await client.query(
      "DELETE FROM term_tests WHERE student_id = ANY($1)",
      [studentIds],
    );
    console.log("Deleted", ar3.rowCount, "term test records");

    // Delete student subjects
    const ar4 = await client.query(
      "DELETE FROM student_subjects WHERE student_id = ANY($1)",
      [studentIds],
    );
    console.log("Deleted", ar4.rowCount, "student subject records");

    // Delete student class assignments
    const ar5 = await client.query(
      "DELETE FROM student_class_assignments WHERE class_id = $1",
      [classId],
    );
    console.log("Deleted", ar5.rowCount, "student class assignments");

    // Delete students
    const ar6 = await client.query("DELETE FROM students WHERE id = ANY($1)", [
      studentIds,
    ]);
    console.log("Deleted", ar6.rowCount, "students");

    await client.query("COMMIT");
    console.log("✓ Successfully cleared all data for Grade 1 Class A (2026)");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error:", error.message);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
})();
