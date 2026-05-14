const express = require("express");
const teacherController = require("../controllers/teacherController");
const { authenticateToken, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(authenticateToken, requireRole("teacher"));

router.get("/dashboard", teacherController.getDashboard);
router.get(
  "/students/template",
  teacherController.getStudentRegistrationTemplate,
);
router.get("/profile", teacherController.getTeacherProfile);
router.get("/students", teacherController.getStudents);
router.get("/class-details", teacherController.getClassDetails);
router.get(
  "/students/:studentId/subjects",
  teacherController.getStudentSubjects,
);
router.get("/subjects", teacherController.getSubjects);
router.get("/student-marks", teacherController.getStudentMarks);
router.post(
  "/term-marks/upload/preview",
  teacherController.previewSubjectTermMarksUpload,
);
router.post(
  "/term-marks/upload",
  teacherController.uploadSubjectTermMarksSpreadsheet,
);
router.post("/students", teacherController.registerStudent);
router.post("/students/bulk-upload", teacherController.bulkUploadStudents);
router.put("/students/:studentId", teacherController.updateStudentDetails);
router.post("/attendance/save", teacherController.saveAttendance);
router.post(
  "/attendance/process-alerts",
  teacherController.processAttendanceAlerts,
);
router.post("/attendance/notify", teacherController.notifyAttendance);
router.post("/term-marks/save", teacherController.saveTermMarks);
router.put("/profile", teacherController.updateTeacherProfile);

module.exports = router;
