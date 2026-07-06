const express = require("express");
const adminController = require("../controllers/adminController");
const { authenticateToken, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(authenticateToken, requireRole("admin"));

// Dashboard
router.get("/dashboard", adminController.getDashboard);

// Teacher Management
router.get("/teachers", adminController.listTeachers);
router.post("/teachers", adminController.registerTeacher);
router.put("/teachers/:teacherId", adminController.updateTeacher);

// Class Management
router.post("/classes", adminController.createClass);
router.get("/classes", adminController.listClasses);
router.delete("/classes/:classId", adminController.deleteClass);
router.get("/classes/details", adminController.getClassDetails);

// Student Management
router.get("/students", adminController.getStudents);
router.get("/students/:studentId", adminController.getStudentDetail);
router.put("/students/:studentId", adminController.updateStudent);
router.delete("/students/:studentId", adminController.deleteStudent);

// Attendance Monitoring
router.get("/attendance", adminController.getAttendanceMonitoring);
router.get("/attendance/low-classes", adminController.getLowAttendanceClasses);

// Alerts
router.get("/alerts", adminController.getAlerts);

// Reporting - Attendance
router.get("/reports/attendance", adminController.getAttendanceReport);
router.get(
  "/analytics/attendance-trend",
  adminController.getAttendanceTrendAnalytics,
);
router.get(
  "/analytics/attendance-by-grade",
  adminController.getTodayAttendanceByGradeAnalytics,
);
router.get(
  "/analytics/attendance-status-distribution",
  adminController.getTodayAttendanceStatusDistributionAnalytics,
);
router.get(
  "/analytics/subject-performance/filters",
  adminController.getSubjectPerformanceFilterOptions,
);
router.get(
  "/analytics/subject-performance",
  adminController.getSubjectPerformanceAnalytics,
);
router.get(
  "/reports/attendance/range",
  adminController.getAttendanceReportRange,
);
router.get(
  "/reports/attendance/filtered",
  adminController.getFilteredAttendanceReport,
);

// Reporting - Performance
router.get("/reports/performance", adminController.getPerformanceReport);

// Reporting - Term Tests
router.get("/reports/term-tests", adminController.getTermTestReport);
router.get(
  "/reports/term-tests/filtered",
  adminController.getFilteredTermTestReport,
);
router.get(
  "/reports/term-tests/review",
  adminController.getTermMarksReviewDetail,
);
router.get("/reports/term-tests/csv", adminController.getTermTestReportCsv);
router.post("/term-marks/approve", adminController.approveTermMarks);

// Settings
router.get("/settings", adminController.getSettings);
router.get("/subject-plans", adminController.getSubjectPlans);
router.put("/subject-plans", adminController.updateSubjectPlan);
router.put("/settings", adminController.updateSettings);

// Grade Promotion
router.post("/promote", adminController.promoteStudents);

// Emergency Alerts
router.post("/alerts/emergency", adminController.sendEmergencyAlert);

// Attendance Settings
router.get("/attendance-settings", adminController.getAttendanceSettings);
router.put("/attendance-settings", adminController.updateAttendanceSettings);

module.exports = router;
