const express = require("express");
const authController = require("../controllers/authController");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

router.get("/classes", authController.listClasses);
router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/password/reset/request", authController.requestPasswordReset);
router.post("/password/reset/verify", authController.verifyPasswordReset);
router.post("/password/reset/update", authController.updatePasswordReset);
router.get("/me", authenticateToken, authController.me);

module.exports = router;
