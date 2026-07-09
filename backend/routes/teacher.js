const express = require("express");
const teacherController = require("../controllers/teacherController");
const { authenticateToken, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(authenticateToken);

const requireTeacherRole = requireRole("teacher");

router.get("/dashboard", requireTeacherRole, teacherController.getDashboard);
router.get(
  "/students/template",
  requireTeacherRole,
  teacherController.getStudentRegistrationTemplate,
);
router.get(
  "/term-marks/template",
  requireTeacherRole,
  teacherController.getSubjectTermMarksTemplate,
);
router.get("/profile", requireTeacherRole, teacherController.getTeacherProfile);
router.get("/students", requireTeacherRole, teacherController.getStudents);
router.get(
  "/class-details",
  requireTeacherRole,
  teacherController.getClassDetails,
);
router.get(
  "/students/:studentId/subjects",
  requireTeacherRole,
  teacherController.getStudentSubjects,
);
router.get("/subjects", requireTeacherRole, teacherController.getSubjects);
router.post(
  "/ai-assistant/chat",
  requireTeacherRole,
  teacherController.chatWithAiAssistant,
);
router.get(
  "/student-marks",
  requireTeacherRole,
  teacherController.getStudentMarks,
);
router.post(
  "/term-marks/upload/preview",
  requireTeacherRole,
  teacherController.previewSubjectTermMarksUpload,
);
router.post(
  "/term-marks/upload",
  requireTeacherRole,
  teacherController.uploadSubjectTermMarksSpreadsheet,
);
router.post("/students", requireTeacherRole, teacherController.registerStudent);
router.post(
  "/students/bulk-upload",
  requireTeacherRole,
  teacherController.bulkUploadStudents,
);
router.put(
  "/students/:studentId",
  requireTeacherRole,
  teacherController.updateStudentDetails,
);
router.post(
  "/attendance/save",
  requireTeacherRole,
  teacherController.saveAttendance,
);
router.get(
  "/attendance/status",
  requireTeacherRole,
  teacherController.getAttendanceStatus,
);
router.post(
  "/attendance/process-alerts",
  requireTeacherRole,
  teacherController.processAttendanceAlerts,
);
router.post("/attendance/notify", teacherController.notifyAttendance);
router.post(
  "/term-marks/save",
  requireTeacherRole,
  teacherController.saveTermMarks,
);
router.put(
  "/profile",
  requireTeacherRole,
  teacherController.updateTeacherProfile,
);

module.exports = router;
