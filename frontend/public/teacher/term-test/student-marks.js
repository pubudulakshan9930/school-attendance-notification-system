const termMapping = {
  1: "First Term",
  2: "Second Term",
  3: "Third Term",
};

const term = localStorage.getItem("selectedTerm");
const studentId = localStorage.getItem("selectedStudentId");
const student = localStorage.getItem("selectedStudentName");
const currentTerm = document.getElementById("currentTerm");
const currentStudent = document.getElementById("currentStudent");
const studentName = document.getElementById("studentName");
const marksHint = document.getElementById("marksHint");
const subjectList = document.getElementById("subjectList");
const saveButton = document.getElementById("saveButton");

let subjects = [];

function getToken() {
  return localStorage.getItem("sureki_token");
}

if (!term) {
  window.location.href = "term.html";
} else if (!studentId || !student) {
  window.location.href = "student-list.html";
} else {
  currentTerm.textContent = termMapping[term] || term;
  currentStudent.textContent = student;
  studentName.textContent = student;
  loadStudentSubjects();
}

async function loadStudentSubjects() {
  const token = getToken();
  if (!token) {
    window.location.href = "/index.html";
    return;
  }

  marksHint.textContent = "Loading registered subjects...";

  try {
    const response = await fetch(
      `/api/teacher/students/${studentId}/subjects`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to load student subjects.");
    }

    subjects = data.data || [];
    renderSubjectInputs();
  } catch (error) {
    console.error("Load student subjects failed:", error);
    subjectList.innerHTML = "";
    marksHint.textContent =
      error.message || "Unable to load subjects for this student.";
    saveButton.disabled = true;
  }
}

function renderSubjectInputs() {
  subjectList.innerHTML = "";

  if (subjects.length === 0) {
    marksHint.textContent = "No subjects found for this student.";
    saveButton.disabled = true;
    return;
  }

  saveButton.disabled = false;
  marksHint.textContent =
    "Enter all subject marks and click Save to store them in the database.";

  subjects.forEach((subject) => {
    const row = document.createElement("div");
    row.className = "subject-row";

    const label = document.createElement("label");
    label.textContent = subject.name;
    label.htmlFor = `subject-${subject.id}`;

    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.max = "100";
    input.placeholder = "Mark";
    input.id = `subject-${subject.id}`;
    input.name = `subject-${subject.id}`;
    input.className = "subject-input";
    input.required = true;
    input.dataset.subjectId = subject.id;
    input.dataset.subjectName = subject.name;

    row.appendChild(label);
    row.appendChild(input);
    subjectList.appendChild(row);
  });
}

saveButton.addEventListener("click", async () => {
  const token = getToken();
  if (!token) {
    window.location.href = "/index.html";
    return;
  }

  const marks = [];
  const inputs = Array.from(subjectList.querySelectorAll("input"));
  for (const input of inputs) {
    const raw = String(input.value || "").trim();
    if (raw === "") {
      alert(`Please enter a mark for ${input.dataset.subjectName}.`);
      input.focus();
      return;
    }

    const markValue = Number(raw);
    if (!Number.isFinite(markValue) || markValue < 0 || markValue > 100) {
      alert(`Mark for ${input.dataset.subjectName} must be between 0 and 100.`);
      input.focus();
      return;
    }

    marks.push({
      subject_id: input.dataset.subjectId,
      mark: markValue,
    });
  }

  try {
    const response = await fetch("/api/teacher/term-marks/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        term: Number(term),
        student_id: studentId,
        marks,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Unable to save term marks.");
    }

    alert("Term marks saved successfully.");
    window.location.href = "student-list.html";
  } catch (error) {
    alert(error.message || "Unable to save term marks.");
  }
});
