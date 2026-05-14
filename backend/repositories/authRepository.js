const pool = require("../db");

async function listClassesByAcademicYear(academicYear) {
  const query = `
    SELECT c.id, c.grade, c.section, c.stream, c.academic_year, c.teacher_id, u.full_name AS teacher_name
    FROM classes c
    LEFT JOIN users u ON u.id = c.teacher_id
    WHERE c.is_active = true
      AND c.academic_year = $1
    ORDER BY c.grade ASC, c.stream ASC, c.section ASC
  `;

  const { rows } = await pool.query(query, [academicYear]);
  return rows;
}

async function getClassById(classId) {
  const query = `
    SELECT id, grade, section, stream, academic_year, teacher_id
    FROM classes
    WHERE id = $1 AND is_active = true
  `;

  const { rows } = await pool.query(query, [classId]);
  return rows[0] || null;
}

async function findUserByLoginOrEmail(identifier) {
  const query = `
    SELECT id, role, full_name, login_id, email, phone, password_hash, teacher_code
    FROM users
    WHERE login_id = $1 OR email = $1
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [identifier]);
  return rows[0] || null;
}

async function getClassById(classId) {
  const query = `
    SELECT id, grade, section, stream, academic_year, teacher_id
    FROM classes
    WHERE id = $1 AND is_active = true
  `;

  const { rows } = await pool.query(query, [classId]);
  return rows[0] || null;
}

async function assignTeacherToClass(classId, teacherId) {
  const query = `
    UPDATE classes
    SET teacher_id = $1
    WHERE id = $2
  `;

  await pool.query(query, [teacherId, classId]);
}

module.exports = {
  listClassesByAcademicYear,
  findUserByLoginOrEmail,
  getClassById,
  assignTeacherToClass,
};
