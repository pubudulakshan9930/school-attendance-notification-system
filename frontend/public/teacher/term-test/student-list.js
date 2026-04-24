const termMapping = {
  1: "First Term",
  2: "Second Term",
  3: "Third Term",
};

const term = localStorage.getItem("selectedTerm");
const currentTerm = document.getElementById("currentTerm");
const studentList = document.getElementById("studentList");
const studentListPlaceholder = document.getElementById(
  "studentListPlaceholder",
);

let students = [];

function getToken() {
  return localStorage.getItem("sureki_token");
}

if (!term) {
  window.location.href = "term.html";
} else {
  currentTerm.textContent = termMapping[term] || term;
  loadStudents();
}

async function loadStudents() {
  const token = getToken();
  if (!token) {
    window.location.href = "/index.html";
    return;
  }

  studentListPlaceholder.classList.remove("hidden");
  studentListPlaceholder.textContent = "Loading students...";

  try {
    const response = await fetch("/api/teacher/students", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to load students.");
    }

    students = data.data || [];
    renderStudentList();
  } catch (error) {
    console.error("Load term-test students failed:", error);
    studentList.innerHTML = "";
    studentListPlaceholder.classList.remove("hidden");
    studentListPlaceholder.textContent =
      error.message || "Unable to load students.";
  }
}

function renderStudentList() {
  studentList.innerHTML = "";

  if (students.length === 0) {
    studentListPlaceholder.classList.remove("hidden");
    studentListPlaceholder.textContent =
      "No students registered for your class yet.";
    return;
  }

  studentListPlaceholder.classList.add("hidden");
  students.forEach((student) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = student.full_name;
    button.className = "student-button";
    button.addEventListener("click", () => selectStudent(student));
    li.appendChild(button);
    studentList.appendChild(li);
  });
}

function selectStudent(student) {
  localStorage.setItem("selectedStudentId", student.id);
  localStorage.setItem("selectedStudentName", student.full_name);
  window.location.href = "student-marks.html";
}
