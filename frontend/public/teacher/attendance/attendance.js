const saveButton = document.getElementById("saveAttendanceButton");
const notifyButton = document.getElementById("notifyParentsButton");
const studentCardsContainer = document.getElementById("studentCardsContainer");
const filterSelect = document.getElementById("filterStatus");
const attendanceDate = document.getElementById("attendanceDate");
const classInfo = document.getElementById("classInfo");

function getToday() {
  return new Date();
}
const options = {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
};

let students = [];
let hasSavedAttendance = false;
let attendanceState = {};
let attendanceWindow = null; // Will hold window status from API
let canMarkAttendance = false;
let canSendSMS = false;
notifyButton.disabled = true;
// Track current day's localStorage key to detect date rollover
let _currentAttendanceKey = getTodayKey();

function getAuthToken() {
  return localStorage.getItem("sureki_token");
}

async function loadAttendanceWindowStatus() {
  const token = getAuthToken();
  if (!token) {
    window.location.href = "/index.html";
    return;
  }

  try {
    const response = await fetch("/api/teacher/attendance/status", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch attendance window status");
    }

    attendanceWindow = data.data;
    canMarkAttendance = attendanceWindow.can_mark_attendance;
    canSendSMS = attendanceWindow.can_send_sms;

    updateAttendanceWindowUI();
    return attendanceWindow;
  } catch (error) {
    console.error("Attendance status error:", error);
    // Default to open window on error
    attendanceWindow = {
      status: "open",
      open_time: "07:30",
      close_time: "09:30",
      can_mark_attendance: true,
      can_send_sms: false,
    };
    canMarkAttendance = true;
    canSendSMS = false;
  }
}

function updateAttendanceWindowUI() {
  if (!attendanceWindow) return;

  const windowStatus = document.querySelector(".attendance-window-status");
  if (windowStatus) {
    if (attendanceWindow.status === "open") {
      windowStatus.style.background = "#dcfce7";
      windowStatus.style.color = "#166534";
      windowStatus.textContent = `✓ Attendance window is OPEN (Close at ${attendanceWindow.close_time})`;
    } else if (attendanceWindow.status === "closed") {
      windowStatus.style.background = "#fee2e2";
      windowStatus.style.color = "#991b1b";
      windowStatus.textContent = `✕ Attendance window is CLOSED. You can only view attendance.`;
    } else {
      windowStatus.style.background = "#fef3c7";
      windowStatus.style.color = "#92400e";
      windowStatus.textContent = `⏱ Attendance window will open at ${attendanceWindow.open_time}`;
    }
  }

  // Disable action buttons if not in open window
  const actionButtons = document.querySelectorAll(".action-btn");
  actionButtons.forEach((btn) => {
    if (!canMarkAttendance) {
      btn.disabled = true;
      btn.title = `Cannot mark - outside attendance window (${attendanceWindow.open_time} - ${attendanceWindow.close_time})`;
    }
  });

  // Update save button
  if (saveButton) {
    if (attendanceWindow.status === "closed") {
      saveButton.disabled = true;
      saveButton.style.opacity = "0.6";
      saveButton.title = "Attendance window is closed";
    } else if (!canMarkAttendance) {
      saveButton.disabled = true;
      saveButton.title = "Cannot mark - outside attendance window";
    }
  }
}

function getTodayKey() {
  const dateStr = getToday().toISOString().slice(0, 10);
  return `attendance_${dateStr}`;
}

function saveAttendanceState() {
  const key = getTodayKey();
  const state = {
    attendanceState,
    timestamp: new Date().toISOString(),
    studentIds: students.map((s) => s.id),
  };
  localStorage.setItem(key, JSON.stringify(state));
}

function loadSavedAttendanceState() {
  const key = getTodayKey();
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      const state = JSON.parse(saved);
      return state.attendanceState || null;
    } catch (e) {
      console.warn("Failed to parse saved attendance state:", e);
      return null;
    }
  }
  return null;
}

function clearAttendanceState() {
  const key = getTodayKey();
  localStorage.removeItem(key);
}

function formatClassInfo(classData) {
  if (!classData) {
    return "Grade - Class";
  }

  const year = new Date().getFullYear();
  const parts = [
    `${year} Grade ${classData.grade}`,
    `Class ${classData.section}`,
  ];
  if (classData.stream) {
    const streamLabel = getStreamLabel(classData.stream);
    if (streamLabel) {
      parts.push(streamLabel);
    }
  }

  return parts.join(" - ");
}

function formatAttendanceDate(dateValue) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(dateValue);
}

function getDayGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Good Morning";
  }
  if (hour < 17) {
    return "Good Afternoon";
  }
  return "Good Evening";
}

async function loadTeacherInfo() {
  const token = getAuthToken();
  if (!token) return;

  try {
    const response = await fetch("/api/teacher/dashboard", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (response.ok) {
      classInfo.textContent = formatClassInfo(data?.class);
    }
  } catch (error) {
    console.error("Failed to load teacher info:", error);
  }
}

async function loadStudents() {
  const token = getAuthToken();
  if (!token) {
    window.location.href = "/index.html";
    return;
  }

  try {
    const response = await fetch("/api/teacher/students", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to load students.");
    }

    students = data.data || [];
    attendanceState = {};
    students.forEach((student) => {
      attendanceState[student.id] = { status: null, reason: "" };
    });

    // Load saved attendance state for today
    const savedState = loadSavedAttendanceState();
    if (savedState) {
      Object.entries(savedState).forEach(([studentId, state]) => {
        attendanceState[studentId] = {
          status: state?.status || null,
          reason: state?.reason || "",
        };
      });
      hasSavedAttendance = true;
      notifyButton.disabled = !canSendSMS;
      showAttendanceMarkedStatus();
    }

    renderStudentCards();
  } catch (error) {
    console.error("Load students error:", error);
    studentCardsContainer.innerHTML =
      '<div class="empty-state"><p>Failed to load students. Please refresh the page.</p></div>';
  }
}

function showAttendanceMarkedStatus() {
  const container = studentCardsContainer.parentElement;
  const existingStatus = container.querySelector(".attendance-marked-badge");

  if (!existingStatus) {
    const statusBadge = document.createElement("div");
    statusBadge.className = "attendance-marked-badge";
    statusBadge.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: #dcfce7; border: 1px solid #86efac; border-radius: 8px; color: #166534; font-weight: 500; font-size: 0.95rem;">
        <span>✓</span>
        <span>Attendance draft loaded for today</span>
      </div>
    `;
    container.insertBefore(statusBadge, container.firstChild);
  }
}

function getStatusBadgeClass(status) {
  switch (status) {
    case "present":
      return "present";
    case "absent":
      return "absent";
    case "late":
      return "late";
    default:
      return "not-marked";
  }
}

function getStatusText(status) {
  switch (status) {
    case "present":
      return "Present";
    case "absent":
      return "Absent";
    case "late":
      return "Late";
    default:
      return "Not Marked";
  }
}

function renderStudentCards() {
  studentCardsContainer.innerHTML = "";

  if (students.length === 0) {
    studentCardsContainer.innerHTML =
      '<div class="empty-state" style="grid-column: 1/-1;"><p>No students registered yet.</p></div>';
    return;
  }

  students.forEach((student) => {
    const card = document.createElement("div");
    card.className = "student-card";
    card.dataset.studentId = student.id;

    const status = attendanceState[student.id]?.status;
    const reason = attendanceState[student.id]?.reason || "";
    const badgeClass = getStatusBadgeClass(status);
    const statusText = getStatusText(status);

    card.innerHTML = `
      <div class="card-header">
        <div class="student-info">
          <h3>${student.full_name}</h3>
          <p class="student-id">ID: ${student.student_code || "N/A"}</p>
        </div>
        <div class="status-badge-card ${badgeClass}">${statusText}</div>
      </div>

      <div class="card-actions">
        <button class="action-btn btn-present" data-status="present" title="Mark Present" ${!canMarkAttendance ? "disabled" : ""}>
          ✓ Present
        </button>
        <button class="action-btn btn-absent" data-status="absent" title="Mark Absent" ${!canMarkAttendance ? "disabled" : ""}>
          ✕ Absent
        </button>
        <button class="action-btn btn-late" data-status="late" title="Mark Late" ${!canMarkAttendance ? "disabled" : ""}>
          ⏱ Late
        </button>
      </div>

      <div class="late-reason-field ${status === "late" ? "visible" : ""}" data-student-id="${student.id}">
        <input
          type="text"
          class="late-reason-input"
          placeholder="Reason for late (required)"
          aria-label="Reason for late for ${student.full_name}"
          value="${status === "late" ? reason : ""}"
          ${!canMarkAttendance ? "disabled" : status === "late" ? "" : "disabled"}
        />
      </div>
    `;

    // Update button states
    const buttons = card.querySelectorAll(".action-btn");
    buttons.forEach((btn) => {
      if (btn.dataset.status === status) {
        btn.classList.add("selected");
      }

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        if (canMarkAttendance) {
          markAttendance(student.id, btn.dataset.status, card);
        }
      });
    });

    // Add late reason input listener
    const lateReasonInput = card.querySelector(".late-reason-input");
    if (lateReasonInput) {
      lateReasonInput.addEventListener("input", (e) => {
        if (canMarkAttendance) {
          attendanceState[student.id].reason = e.target.value.trim();
        }
      });
    }

    studentCardsContainer.appendChild(card);
  });

  // Update counts after rendering
  updateAttendanceCounts();
}

function updateAttendanceCounts() {
  const presentEl = document.getElementById("presentCount");
  const absentEl = document.getElementById("absentCount");
  const lateEl = document.getElementById("lateCount");

  if (!students || students.length === 0) {
    if (presentEl) presentEl.textContent = "0";
    if (absentEl) absentEl.textContent = "0";
    if (lateEl) lateEl.textContent = "0";
    return;
  }

  let present = 0;
  let absent = 0;
  let late = 0;

  students.forEach((s) => {
    const st = attendanceState[s.id]?.status;
    if (st === "present") present += 1;
    else if (st === "absent") absent += 1;
    else if (st === "late") late += 1;
  });

  if (presentEl) presentEl.textContent = String(present);
  if (absentEl) absentEl.textContent = String(absent);
  if (lateEl) lateEl.textContent = String(late);
}

function markAttendance(studentId, status, card) {
  // Prevent changes outside the configured attendance window
  if (!canMarkAttendance) {
    alert("Attendance window is closed. You can only view attendance.");
    return;
  }

  if (!attendanceState[studentId]) {
    attendanceState[studentId] = { status: null, reason: "" };
  }
  attendanceState[studentId].status = status;
  hasSavedAttendance = false;
  notifyButton.disabled = true;

  // Update button states
  const buttons = card.querySelectorAll(".action-btn");
  buttons.forEach((btn) => {
    btn.classList.remove("selected");
    if (btn.dataset.status === status) {
      btn.classList.add("selected");
    }
  });

  // Update badge
  const badge = card.querySelector(".status-badge-card");
  badge.className = `status-badge-card ${getStatusBadgeClass(status)}`;
  badge.textContent = getStatusText(status);

  // Handle late reason field
  const lateReasonField = card.querySelector(".late-reason-field");
  const lateReasonInput = card.querySelector(".late-reason-input");

  if (status === "late") {
    lateReasonField.classList.add("visible");
    lateReasonInput.disabled = false;
    lateReasonInput.focus();
  } else {
    lateReasonField.classList.remove("visible");
    lateReasonInput.disabled = true;
    lateReasonInput.value = "";
    attendanceState[studentId].reason = "";
  }

  applyFilter();

  // Recalculate and update counts when a student is marked
  updateAttendanceCounts();
}

function buildAttendanceRecords() {
  const records = [];

  students.forEach((student) => {
    const state = attendanceState[student.id];
    if (state && state.status) {
      records.push({
        student_id: student.id,
        student_name: student.full_name,
        status: state.status,
        reason: state.status === "late" ? state.reason : null,
        date: getToday().toISOString().slice(0, 10),
      });
    }
  });

  return records;
}

function validateLateReasons() {
  let valid = true;

  students.forEach((student) => {
    if (attendanceState[student.id].status === "late") {
      const reasonInput = document.querySelector(
        `.late-reason-field[data-student-id="${student.id}"] .late-reason-input`,
      );
      if (!reasonInput || !reasonInput.value.trim()) {
        alert(`Please enter a reason for ${student.full_name} being late.`);
        reasonInput?.focus();
        valid = false;
        return;
      }
      attendanceState[student.id].reason = reasonInput.value.trim();
    }
  });

  return valid;
}

function getUnmarkedStudents() {
  return students.filter((student) => !attendanceState[student.id].status);
}

async function submitAttendance(url, successMessage, payload = {}) {
  const token = getAuthToken();
  if (!token) {
    window.location.href = "/index.html";
    return;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Request failed.");
    }

    alert(successMessage);
    return true;
  } catch (error) {
    alert(error.message || "Unable to complete this action.");
    return false;
  }
}

function applyFilter() {
  const filterValue = filterSelect.value;
  const cards = document.querySelectorAll(".student-card");

  cards.forEach((card) => {
    const status = attendanceState[card.dataset.studentId]?.status;

    if (filterValue === "all") {
      card.style.display = "block";
    } else if (filterValue === "marked" && status) {
      card.style.display = "block";
    } else if (filterValue === "unmarked" && !status) {
      card.style.display = "block";
    } else {
      card.style.display = "none";
    }
  });
}

filterSelect.addEventListener("change", applyFilter);

saveButton.addEventListener("click", async () => {
  if (students.length === 0) {
    alert("No students registered yet.");
    return;
  }

  // Check if outside attendance window
  if (!canMarkAttendance) {
    alert(
      `Attendance window is closed. It's only open from ${attendanceWindow.open_time} to ${attendanceWindow.close_time}`,
    );
    return;
  }

  const unmarked = getUnmarkedStudents();
  if (unmarked.length > 0) {
    alert("Please mark attendance for all students before saving.");
    return;
  }

  if (!validateLateReasons()) {
    return;
  }

  const records = buildAttendanceRecords();
  const ok = await submitAttendance(
    "/api/teacher/attendance/save",
    "Attendance saved successfully! Parents will be notified at " +
      attendanceWindow.close_time,
    {
      records,
    },
  );

  if (ok) {
    hasSavedAttendance = true;

    // Show message about when SMS will be sent
    if (!canSendSMS) {
      const timeUntilClose = attendanceWindow.time_to_close || 0;
      const minutes = Math.max(0, timeUntilClose);
      alert(
        `SMS notifications will be sent to parents automatically at ${attendanceWindow.close_time}`,
      );
      notifyButton.disabled = true;
      notifyButton.title = `SMS will be sent automatically at ${attendanceWindow.close_time}`;
    } else {
      notifyButton.disabled = false;
    }

    // Save state to localStorage for persistence
    saveAttendanceState();

    // Show status indicator
    showAttendanceMarkedStatus();
  }
});

notifyButton.addEventListener("click", async () => {
  if (!hasSavedAttendance) {
    alert("Please click Save Attendance first.");
    return;
  }

  // Check if window is closed
  if (!canSendSMS) {
    alert(
      "Attendance window is still open. SMS will be sent automatically at " +
        attendanceWindow.close_time,
    );
    return;
  }

  const ok = await submitAttendance(
    "/api/teacher/attendance/notify",
    "Parents notified successfully!",
    {},
  );

  if (!ok) {
    return;
  }
});

// Initialize UI based on saved state
function initializeUIState() {
  if (!canMarkAttendance && saveButton) {
    saveButton.disabled = true;
    saveButton.style.opacity = "0.6";
    saveButton.title = "Attendance window is closed";
  }
}

loadTeacherInfo();

if (attendanceDate) {
  attendanceDate.textContent = formatAttendanceDate(getToday());
}

// Load attendance window status and students in parallel
(async () => {
  await loadAttendanceWindowStatus();
  await loadStudents();

  // Initialize UI after students are loaded
  setTimeout(() => {
    initializeUIState();
  }, 200);
})();

// Auto-refresh the page when the date changes (start a new attendance sheet)
setInterval(() => {
  try {
    const latestKey = getTodayKey();
    if (latestKey !== _currentAttendanceKey) {
      console.log(
        "Date change detected, reloading attendance page for new day.",
      );
      // Reload to reset UI state and load today's (fresh) attendance
      window.location.reload();
    }
  } catch (err) {
    console.error("Date rollover check failed:", err);
  }
}, 60 * 1000); // check every minute
