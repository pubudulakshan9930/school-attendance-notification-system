const saveButton = document.getElementById("saveAttendanceButton");
const notifyButton = document.getElementById("notifyParentsButton");
const todayDate = document.getElementById("todayDate");
const studentRowsContainer = document.getElementById("studentRowsContainer");

const today = new Date();
const options = {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
};

todayDate.textContent = today.toLocaleDateString(undefined, options);

let students = [];
let hasSavedAttendance = false;
notifyButton.disabled = true;

function getAuthToken() {
  return localStorage.getItem("sureki_token");
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
    renderStudentRows();
  } catch (error) {
    console.error("Load students error:", error);
    studentRowsContainer.innerHTML =
      '<div style="padding: 20px; text-align: center; color: red;">Failed to load students. Please refresh the page.</div>';
  }
}

function renderStudentRows() {
  studentRowsContainer.innerHTML = "";

  if (students.length === 0) {
    studentRowsContainer.innerHTML =
      '<div style="padding: 20px; text-align: center; color: #666;">No students registered yet.</div>';
    return;
  }

  students.forEach((student) => {
    const div = document.createElement("div");
    div.className = "table-row";

    const radioName = `student-${student.id}`;

    div.innerHTML = `
      <div class="name-cell">${student.full_name}</div>
      <label class="status-cell">
        <input type="radio" name="${radioName}" value="present" />
        <span>Present</span>
      </label>
      <label class="status-cell">
        <input type="radio" name="${radioName}" value="absent" />
        <span>Absent</span>
      </label>
      <label class="status-cell">
        <input type="radio" name="${radioName}" value="late" />
        <span>Late</span>
      </label>
    `;

    studentRowsContainer.appendChild(div);
  });
}

function buildAttendanceRecords() {
  const records = [];

  students.forEach((student) => {
    const radioName = `student-${student.id}`;
    const checkedInput = document.querySelector(
      `input[name="${radioName}"]:checked`,
    );

    if (checkedInput) {
      records.push({
        student_id: student.id,
        student_name: student.full_name,
        status: checkedInput.value,
        date: today.toISOString().slice(0, 10),
      });
    }
  });

  return records;
}

function getUnmarkedStudents() {
  return students.filter((student) => {
    const radioName = `student-${student.id}`;
    return !document.querySelector(`input[name="${radioName}"]:checked`);
  });
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

  const records = buildAttendanceRecords();
  const ok = await submitAttendance(
    "/api/teacher/attendance/save",
    "Attendance saved.",
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
    "Parents notified.",
    {},
  );

  if (!ok) {
    return;
  }
});

studentRowsContainer.addEventListener("change", (event) => {
  if (
    event.target instanceof HTMLInputElement &&
    event.target.type === "radio"
  ) {
    hasSavedAttendance = false;
    notifyButton.disabled = true;
  }
});

loadStudents();
