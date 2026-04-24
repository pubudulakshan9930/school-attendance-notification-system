const express = require("express");
const adminController = require("../controllers/adminController");
const { authenticateToken, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(authenticateToken, requireRole("admin"));

router.post("/alerts/emergency", adminController.sendEmergencyAlert);
router.post("/classes", adminController.createClass);
router.get("/classes", adminController.listClasses);
router.get("/classes/details", adminController.getClassDetails);
router.get("/teachers", adminController.listTeachers);
router.post("/teachers", adminController.registerTeacher);
router.get("/reports/attendance", adminController.getAttendanceReport);
router.get("/reports/term-tests", adminController.getTermTestReport);
router.get(
  "/reports/attendance/filtered",
  adminController.getFilteredAttendanceReport,
);
router.get(
  "/reports/term-tests/filtered",
  adminController.getFilteredTermTestReport,
);

module.exports = router;
