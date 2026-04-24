const express = require("express");
const teacherController = require("../controllers/teacherController");
const { authenticateToken, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(authenticateToken, requireRole("teacher"));

router.get("/dashboard", teacherController.getDashboard);
router.get("/students", teacherController.getStudents);
router.get("/class-details", teacherController.getClassDetails);
router.get("/students/:studentId/subjects", teacherController.getStudentSubjects);
router.post("/students/register", teacherController.registerStudent);
router.post("/attendance/save", teacherController.saveAttendance);
router.post("/attendance/notify", teacherController.notifyAttendance);
router.post("/term-marks/save", teacherController.saveTermMarks);

module.exports = router;
