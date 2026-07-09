const test = require("node:test");
const assert = require("node:assert/strict");
const { hashPassword, verifyPassword } = require("../services/passwordService");

test("hashPassword returns a bcrypt hash and verifyPassword matches it", async () => {
  const password = "1234";
  const hash = await hashPassword(password);

  assert.match(hash, /^\$2[aby]?\$10\$/);
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword("wrong-password", hash), false);
});
