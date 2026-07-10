const dotenv = require("dotenv");
const { Pool } = require("pg");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, ".env"), override: true });

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:password@localhost:5432/sureki";

const pool = new Pool({
  connectionString,
});

pool.on("error", (err) => {
  console.error("PostgreSQL client error:", err);
});

module.exports = pool;
