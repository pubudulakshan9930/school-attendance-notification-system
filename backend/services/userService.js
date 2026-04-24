const bcrypt = require("bcrypt");
const pool = require("../db");

const TEACHER_ROLE = "teacher";

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function normalizeTeacherId(teacherId) {
  return String(teacherId || "").trim();
}

function normalizeClassSection(classSection) {
  return String(classSection || "")
    .trim()
    .toUpperCase();
}

function normalizeGrade(grade) {
  const normalizedGrade = Number(grade);
  if (!Number.isInteger(normalizedGrade)) {
    return null;
  }
  return normalizedGrade;
}

function createStatusError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validateTeacherInput({
  email,
  full_name,
  teacher_code,
  teacher_id,
  grade,
  class_section,
  phone,
  password,
  confirm_password,
}) {
  const normalizedTeacherId = normalizeTeacherId(teacher_id || teacher_code);
  const normalizedGrade = normalizeGrade(grade);
  const normalizedClassSection = normalizeClassSection(class_section);

  if (
    !email ||
    !full_name ||
    !normalizedTeacherId ||
    !normalizedGrade ||
    !normalizedClassSection ||
    !phone ||
    !password ||
    !confirm_password
  ) {
    return { valid: false, message: "All fields are required." };
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail.includes("@")) {
    return { valid: false, message: "Please enter a valid email address." };
  }

  if (password !== confirm_password) {
    return {
      valid: false,
      message: "Password and confirm password do not match.",
    };
  }

  if (password.length < 6) {
    return { valid: false, message: "Password must be at least 6 characters." };
  }

  if (String(full_name).trim().length < 3) {
    return {
      valid: false,
      message: "Full name must be at least 3 characters.",
    };
  }

  if (normalizedTeacherId.length < 2) {
    return { valid: false, message: "Teacher ID must be provided." };
  }

  if (normalizedGrade < 1 || normalizedGrade > 13) {
    return { valid: false, message: "Grade must be between 1 and 13." };
  }

  if (!/^[A-Z]$/.test(normalizedClassSection)) {
    return {
      valid: false,
      message: "Class must be a single capital letter.",
    };
  }

  return {
    valid: true,
    email: normalizedEmail,
    teacher_code: normalizedTeacherId,
    grade: normalizedGrade,
    class_section: normalizedClassSection,
    full_name: String(full_name).trim(),
    phone: String(phone).trim(),
    password,
  };
}

async function findTeacherByEmailOrTeacherCode(email, teacherCode) {
  const query = `
    SELECT id, role, login_id, email, teacher_code
    FROM users
    WHERE login_id = $1 OR email = $1 OR teacher_code = $2
    LIMIT 1
  `;
  const { rows } = await pool.query(query, [email, teacherCode]);
  return rows[0] || null;
}

async function createTeacher({
  full_name,
  email,
  phone,
  teacher_code,
  grade,
  class_section,
  password,
}) {
  const client = await pool.connect();
  const password_hash = await bcrypt.hash(password, 10);

  try {
    await client.query("BEGIN");

    const teacherInsertQuery = `
      INSERT INTO users (role, full_name, login_id, email, phone, password_hash, teacher_code)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, role, full_name, email, phone, teacher_code
    `;
    const teacherValues = [
      TEACHER_ROLE,
      full_name,
      email,
      email,
      phone,
      password_hash,
      teacher_code,
    ];
    const teacherResult = await client.query(teacherInsertQuery, teacherValues);
    const teacher = teacherResult.rows[0];

    const academicYear = new Date().getFullYear();
    const classLookupQuery = `
      SELECT id, grade, section, academic_year, teacher_id
      FROM classes
      WHERE grade = $1 AND section = $2 AND academic_year = $3
      LIMIT 1
    `;
    const classLookupResult = await client.query(classLookupQuery, [
      grade,
      class_section,
      academicYear,
    ]);

    let classRecord;
    if (classLookupResult.rows.length === 0) {
      throw createStatusError(
        "Selected grade and class are not available. Ask admin to create the class first.",
        400,
      );
    } else {
      const existingClass = classLookupResult.rows[0];

      if (existingClass.teacher_id && existingClass.teacher_id !== teacher.id) {
        throw createStatusError(
          "Selected class already has an assigned teacher.",
          409,
        );
      }

      const classUpdateQuery = `
        UPDATE classes
        SET teacher_id = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, grade, section, academic_year, teacher_id
      `;
      const classUpdateResult = await client.query(classUpdateQuery, [
        teacher.id,
        existingClass.id,
      ]);
      classRecord = classUpdateResult.rows[0];
    }

    await client.query("COMMIT");

    return {
      ...teacher,
      grade: classRecord.grade,
      class_section: classRecord.section,
      academic_year: classRecord.academic_year,
      class_id: classRecord.id,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  TEACHER_ROLE,
  normalizeEmail,
  normalizeTeacherId,
  validateTeacherInput,
  findTeacherByEmailOrTeacherCode,
  createTeacher,
};
