const saveButton = document.getElementById("saveAttendanceButton");
const notifyButton = document.getElementById("notifyParentsButton");
const studentCardsContainer = document.getElementById("studentCardsContainer");
const filterSelect = document.getElementById("filterStatus");
const attendanceDate = document.getElementById("attendanceDate");
const classInfo = document.getElementById("classInfo");

const today = new Date();
const options = {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
};

let students = [];
let hasSavedAttendance = false;
let attendanceState = {};
notifyButton.disabled = true;

function getAuthToken() {
  return localStorage.getItem("sureki_token");
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
    renderStudentCards();
  } catch (error) {
    console.error("Load students error:", error);
    studentCardsContainer.innerHTML =
      '<div class="empty-state"><p>Failed to load students. Please refresh the page.</p></div>';
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
        <button class="action-btn btn-present" data-status="present" title="Mark Present">
          ✓ Present
        </button>
        <button class="action-btn btn-absent" data-status="absent" title="Mark Absent">
          ✕ Absent
        </button>
        <button class="action-btn btn-late" data-status="late" title="Mark Late">
          ⏱ Late
        </button>
      </div>

      <div class="late-reason-field" data-student-id="${student.id}">
        <input
          type="text"
          class="late-reason-input"
          placeholder="Reason for late (required)"
          aria-label="Reason for late for ${student.full_name}"
          disabled
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
        markAttendance(student.id, btn.dataset.status, card);
      });
    });

    studentCardsContainer.appendChild(card);
  });
}

function markAttendance(studentId, status, card) {
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
        date: today.toISOString().slice(0, 10),
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
    "Attendance saved successfully!",
    {
      records,
    },
  );

  if (ok) {
    hasSavedAttendance = true;
    notifyButton.disabled = false;
  }
});

notifyButton.addEventListener("click", async () => {
  if (!hasSavedAttendance) {
    alert("Please click Save Attendance first.");
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

loadTeacherInfo();

if (attendanceDate) {
  attendanceDate.textContent = formatAttendanceDate(today);
}
loadStudents();

loadStudents();
