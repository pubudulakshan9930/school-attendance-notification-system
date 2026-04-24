const pool = require("../db");

async function listClassesByAcademicYear(academicYear) {
  const query = `
    SELECT c.id, c.grade, c.section, c.academic_year, c.teacher_id, u.full_name AS teacher_name
    FROM classes c
    LEFT JOIN users u ON u.id = c.teacher_id
    WHERE c.is_active = true
      AND c.academic_year = $1
    ORDER BY c.grade ASC, c.section ASC
  `;

  const { rows } = await pool.query(query, [academicYear]);
  return rows;
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

module.exports = {
  listClassesByAcademicYear,
  findUserByLoginOrEmail,
};