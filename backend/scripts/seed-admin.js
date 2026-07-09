require("dotenv").config();

const pool = require("../db");
const { hashPassword } = require("../services/passwordService");

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL || "admin@gmail.com";
  const password = process.env.ADMIN_PASSWORD || "1234";
  const fullName = process.env.ADMIN_FULL_NAME || "School Admin";
  const phone = process.env.ADMIN_PHONE || "0000000000";
  const passwordHash = await hashPassword(password);

  await pool.query(
    `
      INSERT INTO users (role, full_name, login_id, email, phone, password_hash, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE)
      ON CONFLICT (login_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        password_hash = EXCLUDED.password_hash,
        is_active = TRUE
    `,
    ["admin", fullName, email, email, phone, passwordHash],
  );

  console.log(`Seeded admin user ${email}`);
}

seedAdmin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Admin seed failed:", error);
    process.exit(1);
  });
