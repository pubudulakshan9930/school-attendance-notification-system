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
    button.dataset.subjectId = subject.id;

    // append a small status badge (will be filled after checking marks)
    const badge = document.createElement("span");
    badge.className = "subject-badge";
    badge.textContent = "...";
    button.appendChild(badge);
    button.addEventListener("click", () => selectSubject(subject));
    li.appendChild(button);
    subjectList.appendChild(li);
    // check marks for this subject and update button appearance
    checkSubjectMarks(subject.id, button, badge).catch((err) => {
      console.error("Error checking subject marks", err);
      badge.textContent = "--";
    });
  });
}

async function checkSubjectMarks(subjectId, buttonEl, badgeEl) {
  const token = getToken();
  if (!token) return;
  const selectedTerm = localStorage.getItem("selectedTerm");
  if (!selectedTerm) return;

  try {
    const res = await fetch(
      `/api/teacher/student-marks?term=${encodeURIComponent(selectedTerm)}&subject_id=${encodeURIComponent(subjectId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    const data = await res.json();
    if (!res.ok) {
      badgeEl.textContent = "err";
      return;
    }

    const payload = data.data || {};
    const students = payload.students || [];

    const total = students.length;
    let recorded = 0;
    let marksTotal = 0;
    students.forEach((s) => {
      const m =
        s.mark === null || s.mark === undefined || s.mark === ""
          ? null
          : Number(s.mark);
      if (m !== null && Number.isFinite(m)) {
        recorded += 1;
        marksTotal += m;
      }
    });

    // update badge and classes
    badgeEl.textContent = `${recorded}/${total}`;
    if (recorded > 0) {
      buttonEl.classList.add("subject-filled");
      buttonEl.classList.remove("subject-empty");
    } else {
      buttonEl.classList.add("subject-empty");
      buttonEl.classList.remove("subject-filled");
    }
  } catch (err) {
    console.error(err);
    badgeEl.textContent = "err";
  }
}

function selectSubject(subject) {
  localStorage.setItem("selectedSubjectId", subject.id);
  localStorage.setItem("selectedSubjectName", subject.name);
  window.location.href = "subject-marks.html";
}
