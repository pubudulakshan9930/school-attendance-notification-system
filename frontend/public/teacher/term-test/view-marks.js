const API_BASE = "/api";

const termSelect = document.getElementById("termSelect");
const subjectSelect = document.getElementById("subjectSelect");
const subjectFilterGroup = document.getElementById("subjectFilterGroup");
const instructionMessage = document.getElementById("instructionMessage");
const marksContainer = document.getElementById("marksContainer");
const marksCardGrid = document.getElementById("marksCardGrid");
const noMarksMessage = document.getElementById("noMarksMessage");
const loadingMessage = document.getElementById("loadingMessage");
const subjectNameDisplay = document.getElementById("subjectNameDisplay");
const classDisplay = document.getElementById("classDisplay");
const termDisplay = document.getElementById("termDisplay");
const totalStudentsDisplay = document.getElementById("totalStudents");
const marksRecordedDisplay = document.getElementById("marksRecorded");
const averageMarksDisplay = document.getElementById("averageMarks");
const averageMarksLarge = document.getElementById("averageMarksLarge");
const pendingCountDisplay = document.getElementById("pendingCount");
const highestMarkDisplay = document.getElementById("highestMark");
const highestStudentDisplay = document.getElementById("highestStudent");
const studentCardsContainer = document.getElementById("studentCards");
const studentCountText = document.getElementById("studentCountText");

let subjects = [];

document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
});

function getToken() {
  return localStorage.getItem("sureki_token");
}

function getTermLabel(term) {
  const termLabels = {
    1: "First Term",
    2: "Second Term",
    3: "Third Term",
  };

  return termLabels[term] || `Term ${term}`;
}

function getClassLabel(classInfo) {
  if (!classInfo) {
    return "Assigned class";
  }

  const yearPrefix = classInfo.academic_year
    ? `${classInfo.academic_year} `
    : "";
  const parts = [
    `${yearPrefix}Grade ${classInfo.grade}`.trim(),
    `Class ${classInfo.section}`,
  ];

  if (classInfo.stream) {
    parts.push(String(classInfo.stream).replace(/_/g, " "));
  }

  return parts.join(" - ");
}

function resetMarksView() {
  if (marksCardGrid) {
    marksCardGrid.innerHTML = "";
  }
  marksContainer.style.display = "none";
  noMarksMessage.style.display = "none";
  loadingMessage.style.display = "none";
}

function resetSubjectSelect(message = "Select Subject") {
  subjectSelect.innerHTML = `<option value="">${message}</option>`;
  subjectSelect.disabled = true;
}

async function loadSubjectsForTerm() {
  const token = getToken();
  if (!token) {
    window.location.href = "/index.html";
    return;
  }

  subjectFilterGroup.style.display = "block";
  resetSubjectSelect("Loading subjects...");

  try {
    const response = await fetch(`${API_BASE}/teacher/subjects`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to load subjects.");
    }

    subjects = data.data || [];
    populateSubjectSelect();
    instructionMessage.style.display = "block";
    instructionMessage.textContent =
      subjects.length > 0
        ? "Select a subject to view the class marks."
        : "No subjects assigned for your class.";
  } catch (error) {
    console.error("Error loading subjects:", error);
    subjects = [];
    resetSubjectSelect("Error loading subjects");
    instructionMessage.style.display = "block";
    instructionMessage.textContent =
      error.message || "Unable to load class subjects.";
  }
}

function populateSubjectSelect() {
  subjectSelect.innerHTML = '<option value="">Select Subject</option>';

  subjects.forEach((subject) => {
    const option = document.createElement("option");
    option.value = subject.id;
    option.textContent = subject.name;
    subjectSelect.appendChild(option);
  });

  subjectSelect.disabled = subjects.length === 0;
}

function setupEventListeners() {
  termSelect.addEventListener("change", async () => {
    resetMarksView();

    if (!termSelect.value) {
      subjectFilterGroup.style.display = "none";
      resetSubjectSelect();
      instructionMessage.style.display = "block";
      instructionMessage.textContent =
        "Select a term to load the available subjects.";
      return;
    }

    instructionMessage.style.display = "none";
    await loadSubjectsForTerm();
  });

  subjectSelect.addEventListener("change", async () => {
    resetMarksView();

    if (!termSelect.value || !subjectSelect.value) {
      return;
    }

    instructionMessage.style.display = "none";
    await fetchAndDisplayMarks();
  });
}

async function fetchAndDisplayMarks() {
  const term = termSelect.value;
  const subjectId = subjectSelect.value;

  if (!term || !subjectId) {
    return;
  }

  const token = getToken();
  if (!token) {
    window.location.href = "/index.html";
    return;
  }

  showLoadingMessage();
  instructionMessage.style.display = "none";

  try {
    const response = await fetch(
      `${API_BASE}/teacher/student-marks?term=${encodeURIComponent(term)}&subject_id=${encodeURIComponent(subjectId)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to load marks.");
    }

    const payload = data.data || {};
    const students = payload.students || [];

    if (students.length === 0) {
      showNoMarksMessage("No students found for the selected class.");
      return;
    }

    displayMarks(payload);
  } catch (error) {
    console.error("Error fetching marks:", error);
    showNoMarksMessage(error.message || "Failed to load marks.");
  } finally {
    hideLoadingMessage();
  }
}

function displayMarks(data) {
  const { class: classInfo, subject, term, students = [] } = data;

  instructionMessage.style.display = "none";
  subjectNameDisplay.textContent = subject?.name || "Selected Subject";
  classDisplay.textContent = getClassLabel(classInfo);
  termDisplay.textContent = getTermLabel(term);

  if (marksCardGrid) {
    marksCardGrid.innerHTML = "";
  }

  let marksTotal = 0;
  let marksRecorded = 0;
  let highestMark = -1;
  let highestStudentName = "";

  students.forEach((student) => {
    const markValue =
      student.mark === null || student.mark === undefined || student.mark === ""
        ? null
        : Number(student.mark);

    if (markValue !== null && Number.isFinite(markValue)) {
      marksTotal += markValue;
      marksRecorded += 1;
      if (markValue > highestMark) {
        highestMark = markValue;
        highestStudentName = student.full_name || "";
      }
    }

    const card = document.createElement("article");
    card.className = "student-mark-card";
    card.innerHTML = `
      <div class="student-mark-card-main">
        <div class="student-mark-card-name">${student.full_name || "N/A"}</div>
        <div class="student-mark-card-code">Code: ${student.student_code || "N/A"}</div>
      </div>
      <div class="student-mark-card-score">
        <span class="student-mark-card-score-label">Marks</span>
        <span class="student-mark-card-score-value ${markValue === null ? "is-empty" : ""}">${markValue === null ? "N/A" : `${markValue}%`}</span>
      </div>
    `;
    marksCardGrid.appendChild(card);
  });

  const average = marksRecorded > 0 ? marksTotal / marksRecorded : 0;

  if (totalStudentsDisplay) {
    totalStudentsDisplay.textContent = String(students.length);
  }
  if (marksRecordedDisplay) {
    marksRecordedDisplay.textContent = String(marksRecorded);
  }
  if (averageMarksDisplay) {
    averageMarksDisplay.textContent = `${average.toFixed(1)}%`;
  }
  if (averageMarksLarge) {
    averageMarksLarge.textContent = `${average.toFixed(1)} %`;
  }

  // pending: not marked / total
  const pending = students.length - marksRecorded;
  if (pendingCountDisplay) {
    pendingCountDisplay.textContent = `${pending} / ${students.length}`;
  }

  // highest
  if (highestMarkDisplay) {
    if (highestMark >= 0) {
      highestMarkDisplay.textContent = `${highestMark}%`;
    } else {
      highestMarkDisplay.textContent = `0%`;
    }
  }

  if (highestStudentDisplay) {
    highestStudentDisplay.textContent = highestStudentName;
  }

  // render student cards (compact list)
  if (studentCardsContainer) {
    studentCardsContainer.innerHTML = "";
    students.forEach((student) => {
      const markValue =
        student.mark === null ||
        student.mark === undefined ||
        student.mark === ""
          ? null
          : Number(student.mark);

      const initials = ((name) => {
        if (!name) return "";
        const parts = name.split(/\s+/).filter(Boolean);
        return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
      })(student.full_name);

      const card = document.createElement("div");
      card.className = "student-card";
      card.innerHTML = `
          <div class="student-avatar">${initials}</div>
          <div class="student-info">
            <div class="student-name">${student.full_name || "N/A"}</div>
            <div class="student-id">ID: ${student.student_code || "-"}</div>
          </div>
          <div class="student-mark">${markValue === null ? "<strong>00</strong>" : `<strong>${markValue}</strong>`}</div>
        `;

      studentCardsContainer.appendChild(card);
    });
  }

  if (studentCountText) {
    studentCountText.textContent = `${students.length} Students`;
  }

  marksContainer.style.display = "grid";
  noMarksMessage.style.display = "none";
}

function showLoadingMessage() {
  loadingMessage.style.display = "block";
  marksContainer.style.display = "none";
  noMarksMessage.style.display = "none";
}

function hideLoadingMessage() {
  loadingMessage.style.display = "none";
}

function showNoMarksMessage(message) {
  instructionMessage.style.display = "none";
  noMarksMessage.querySelector("p").textContent = message;
  noMarksMessage.style.display = "block";
  marksContainer.style.display = "none";
}
