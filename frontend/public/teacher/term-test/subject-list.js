const termMapping = {
  1: "First Term",
  2: "Second Term",
  3: "Third Term",
};

const term = localStorage.getItem("selectedTerm");
const currentTerm = document.getElementById("currentTerm");
const subjectList = document.getElementById("subjectList");
const subjectListPlaceholder = document.getElementById(
  "subjectListPlaceholder",
);

let subjects = [];

function getToken() {
  return localStorage.getItem("sureki_token");
}

if (!term) {
  window.location.href = "term.html";
} else {
  currentTerm.textContent = termMapping[term] || term;
  loadSubjects();
}

async function loadSubjects() {
  const token = getToken();
  if (!token) {
    window.location.href = "/index.html";
    return;
  }

  subjectListPlaceholder.classList.remove("hidden");
  subjectListPlaceholder.textContent = "Loading subjects...";

  try {
    const response = await fetch("/api/teacher/subjects", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to load subjects.");
    }

    subjects = data.data || [];
    renderSubjectList();
  } catch (error) {
    console.error("Load subjects failed:", error);
    subjectList.innerHTML = "";
    subjectListPlaceholder.classList.remove("hidden");
    subjectListPlaceholder.textContent =
      error.message || "Unable to load subjects.";
  }
}

function renderSubjectList() {
  subjectList.innerHTML = "";

  if (subjects.length === 0) {
    subjectListPlaceholder.classList.remove("hidden");
    subjectListPlaceholder.textContent =
      "No subjects assigned for your class yet.";
    return;
  }

  subjectListPlaceholder.classList.add("hidden");
  subjects.forEach((subject) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = subject.name;
    button.className = "student-button";
    button.addEventListener("click", () => selectSubject(subject));
    li.appendChild(button);
    subjectList.appendChild(li);
  });
}

function selectSubject(subject) {
  localStorage.setItem("selectedSubjectId", subject.id);
  localStorage.setItem("selectedSubjectName", subject.name);
  window.location.href = "subject-marks.html";
}
