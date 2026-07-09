const dotenv = require("dotenv");
const { Pool } = require("pg");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, ".env") });

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:password@localhost:5432/sureki";

const isRemoteDatabase =
  process.env.NODE_ENV === "production" &&
  !connectionString.includes("localhost") &&
  !connectionString.includes("127.0.0.1") &&
  !connectionString.includes("::1");

const pool = new Pool({
  connectionString,
  ssl: isRemoteDatabase
    ? { rejectUnauthorized: false }
    : false,
});

pool.on("error", (err) => {
  console.error("PostgreSQL client error:", err);
});

module.exports = pool;
