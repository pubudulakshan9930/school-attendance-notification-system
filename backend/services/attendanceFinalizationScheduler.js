const pool = require("../db");
const adminService = require("./adminService");
const teacherRepository = require("../repositories/teacherRepository");
const { sendSms } = require("./smsService");

let schedulerInterval = null;
let lastRunTime = null;

async function getAttendanceSettings() {
  try {
    const allSettings = await adminService.getAllSettings();

    return {
      closeTime: allSettings.attendance_close_time || "09:30",
      timezone: allSettings.attendance_timezone || "Asia/Colombo",
    };
  } catch (error) {
    console.error("Error fetching attendance settings:", error);
    return { closeTime: "09:30", timezone: "Asia/Colombo" };
  }
}

function getCurrentTimeString() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function isTimeToFinalize(closeTime) {
  const currentTime = getCurrentTimeString();
  const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const [closeHour, closeMin] = closeTime.split(":").map(Number);
  const closeTimeInMinutes = closeHour * 60 + closeMin;

  // Execute within 1 minute after closing time
  return (
    currentMinutes >= closeTimeInMinutes &&
    currentMinutes < closeTimeInMinutes + 1
  );
}

function hasRunToday(closeTime) {
  if (!lastRunTime) return false;
  const now = new Date();
  const lastRun = new Date(lastRunTime);

  // Check if last run was today (same date)
  if (now.toDateString() !== lastRun.toDateString()) {
    return false;
  }

  // Check if last run was after the close time
  const [closeHour, closeMin] = closeTime.split(":").map(Number);
  const closeDate = new Date();
  closeDate.setHours(closeHour, closeMin, 0, 0);

  return lastRun >= closeDate;
}

async function getTodayUnsentNotifiedAttendance() {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // Get all attendance sheets for today that haven't been marked as notified
    const query = `
      SELECT 
        ash.id,
        ash.class_id,
        ash.teacher_id,
        ash.attendance_date,
        COUNT(ar.id) as record_count
      FROM attendance_sheets ash
      LEFT JOIN attendance_records ar ON ash.id = ar.attendance_sheet_id
      WHERE ash.attendance_date = $1
        AND ash.is_notified = FALSE
      GROUP BY ash.id, ash.class_id, ash.teacher_id, ash.attendance_date
    `;

    const result = await pool.query(query, [today]);
    return result.rows;
  } catch (error) {
    console.error("Error fetching unnotified attendance:", error);
    return [];
  }
}

async function markAttendanceAsNotified(attendanceSheetId) {
  try {
    const query = `
      UPDATE attendance_sheets 
      SET is_notified = TRUE, notified_at = NOW()
      WHERE id = $1
    `;
    await pool.query(query, [attendanceSheetId]);
  } catch (error) {
    console.error("Error marking attendance as notified:", error);
  }
}

async function sendAttendanceNotifications(attendanceSheet) {
  try {
    // Get class info
    const classResult = await pool.query(
      `SELECT grade, section FROM classes WHERE id = $1`,
      [attendanceSheet.class_id],
    );

    if (classResult.rows.length === 0) {
      console.log(`Class ${attendanceSheet.class_id} not found`);
      return false;
    }

    const classInfo = classResult.rows[0];

    // Get all students and their attendance for this sheet
    const attendanceResult = await pool.query(
      `
      SELECT 
        s.id,
        s.full_name,
        s.parent_phone,
        ar.status,
        ar.reason
      FROM attendance_records ar
      JOIN students s ON ar.student_id = s.id
      WHERE ar.attendance_sheet_id = $1
      `,
      [attendanceSheet.id],
    );

    let successCount = 0;
    let failureCount = 0;

    // Send SMS for every student so parents receive the marked status
    for (const record of attendanceResult.rows) {
      if (!record.parent_phone) {
        failureCount++;
        console.warn(`Skipping ${record.full_name}: missing parent phone`);
        continue;
      }

      const message = require("./smsService").formatAttendanceSms({
        parentName: record.parent_name,
        studentName: record.full_name,
        className: `Grade ${classInfo.grade} Class ${classInfo.section}`,
        attendanceDate: attendanceSheet.attendance_date,
        status: record.status,
        reason: record.reason,
      });

      try {
        await sendSms({
          recipient: record.parent_phone,
          message,
        });
        successCount++;
        console.log(
          `SMS sent to ${record.parent_phone} for ${record.full_name}`,
        );

        await teacherRepository.insertNotificationLog({
          studentId: record.id,
          notificationType: "attendance",
          medium: "sms",
          recipient: record.parent_phone,
          message,
          status: "sent",
        });
      } catch (error) {
        console.error(
          `Failed to send SMS to ${record.parent_phone}:`,
          error.message,
        );
        failureCount++;

        await teacherRepository.insertNotificationLog({
          studentId: record.id,
          notificationType: "attendance",
          medium: "sms",
          recipient: record.parent_phone,
          message,
          status: `failed: ${error.message}`,
        });
      }
    }

    // Mark attendance as notified
    await markAttendanceAsNotified(attendanceSheet.id);

    console.log(
      `Attendance finalization for sheet ${attendanceSheet.id}: ${successCount} sent, ${failureCount} failed`,
    );
    return true;
  } catch (error) {
    console.error("Error sending attendance notifications:", error);
    return false;
  }
}

async function runFinalizationScheduler() {
  try {
    const { closeTime } = await getAttendanceSettings();

    // Check if it's time to finalize
    if (!isTimeToFinalize(closeTime)) {
      return;
    }

    // Check if already ran today
    if (hasRunToday(closeTime)) {
      console.log(
        "[Scheduler] Attendance finalization already ran today at",
        lastRunTime,
      );
      return;
    }

    console.log("[Scheduler] Running attendance finalization...");

    // Get unnotified attendance
    const unsentAttendance = await getTodayUnsentNotifiedAttendance();

    if (unsentAttendance.length === 0) {
      console.log("[Scheduler] No unnotified attendance sheets to finalize");
      lastRunTime = new Date();
      return;
    }

    // Send notifications for each attendance sheet
    for (const sheet of unsentAttendance) {
      await sendAttendanceNotifications(sheet);
    }

    lastRunTime = new Date();
    console.log("[Scheduler] Attendance finalization completed");
  } catch (error) {
    console.error("[Scheduler] Error in finalization scheduler:", error);
  }
}

function startScheduler() {
  if (schedulerInterval) {
    console.log("[Scheduler] Attendance scheduler already running");
    return;
  }

  // Run every 1 minute
  schedulerInterval = setInterval(() => {
    runFinalizationScheduler().catch((error) => {
      console.error("[Scheduler] Unhandled error:", error);
    });
  }, 60 * 1000);

  console.log("[Scheduler] Attendance finalization scheduler started");

  // Run immediately on startup
  runFinalizationScheduler().catch((error) => {
    console.error("[Scheduler] Initial run error:", error);
  });
}

function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[Scheduler] Attendance scheduler stopped");
  }
}

module.exports = {
  startScheduler,
  stopScheduler,
  runFinalizationScheduler,
};
