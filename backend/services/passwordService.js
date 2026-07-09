const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;

async function hashPassword(password) {
  if (!password) {
    throw new Error("Password is required.");
  }

  return bcrypt.hash(String(password), SALT_ROUNDS);
}

async function verifyPassword(inputPassword, storedPasswordHash) {
  if (!storedPasswordHash) {
    return false;
  }

  if (typeof storedPasswordHash !== "string") {
    return false;
  }

  if (storedPasswordHash.startsWith("$2")) {
    return bcrypt.compare(String(inputPassword), storedPasswordHash);
  }

  return String(inputPassword) === storedPasswordHash;
}

module.exports = {
  SALT_ROUNDS,
  hashPassword,
  verifyPassword,
};
