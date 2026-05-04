const BASE_URL = "http://localhost:4000";
const API_BASE = `${BASE_URL}/api`;

let students = [];

document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
});

async function loadStudents() {
  try {
    const response = await fetch(`${API_BASE}/teacher/students`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("sureki_token")}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to load students");
    }

    const data = await response.json();
    students = data.data || data.students || [];

    populateStudentSelect();
    document.getElementById("studentSelect").disabled = false;
  } catch (error) {
    console.error("Error loading students:", error);
    document.getElementById("studentSelect").innerHTML =
      '<option value="">Error loading students</option>';
  }
}

function populateStudentSelect() {
  const select = document.getElementById("studentSelect");
  select.innerHTML = '<option value="">Select Student</option>';

  students.forEach((student) => {
    const option = document.createElement("option");
    option.value = student.id;
    option.textContent = student.full_name;
    select.appendChild(option);
  });
}

function setupEventListeners() {
  const termSelect = document.getElementById("termSelect");
  const studentSelect = document.getElementById("studentSelect");
  const viewMarksBtn = document.getElementById("viewMarksBtn");

  termSelect.addEventListener("change", () => {
    if (termSelect.value) {
      loadStudents();
    }
    updateViewMarksButton();
  });
  studentSelect.addEventListener("change", updateViewMarksButton);
  viewMarksBtn.addEventListener("click", fetchAndDisplayMarks);
}

function updateViewMarksButton() {
  const term = document.getElementById("termSelect").value;
  const student = document.getElementById("studentSelect").value;
  const btn = document.getElementById("viewMarksBtn");

  btn.disabled = !term || !student;
}

async function fetchAndDisplayMarks() {
  const term = document.getElementById("termSelect").value;
  const student_id = document.getElementById("studentSelect").value;

  if (!term || !student_id) {
    alert("Please select both term and student");
    return;
  }

  const studentName = document.querySelector(
    `#studentSelect option[value="${student_id}"]`,
  ).textContent;

  showLoadingMessage();

  try {
    const response = await fetch(
      `${API_BASE}/teacher/student-marks?student_id=${student_id}&term=${term}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sureki_token")}`,
        },
      },
    );

    if (!response.ok) {
      if (response.status === 404) {
        showNoMarksMessage();
        return;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !data.data.marks || data.data.marks.length === 0) {
      showNoMarksMessage();
      return;
    }

    displayMarks(data.data);
  } catch (error) {
    console.error("Error fetching marks:", error);
    alert("Failed to load marks. Please try again.");
    hideLoadingMessage();
  }
}

function displayMarks(data) {
  hideLoadingMessage();

  const { student, class: classInfo, term, marks } = data;

  document.getElementById("studentNameDisplay").textContent = student.full_name;
  document.getElementById("classDisplay").textContent = classInfo.name;

  const termNames = {
    1: "First Term",
    2: "Second Term",
    3: "Third Term",
  };
  document.getElementById("termDisplay").textContent =
    termNames[term] || `Term ${term}`;

  const tableBody = document.getElementById("marksTableBody");
  tableBody.innerHTML = "";

  let totalMarks = 0;
  marks.forEach((mark) => {
    const markValue = Number(mark.mark) || 0;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${mark.subject_name}</td>
      <td><strong>${markValue}</strong>/100</td>
    `;
    tableBody.appendChild(row);
    totalMarks += markValue;
  });

  const average = marks.length > 0 ? totalMarks / marks.length : 0;

  document.getElementById("totalMarks").textContent = totalMarks;
  document.getElementById("averageMarks").textContent =
    `${average.toFixed(1)}%`;
  document.getElementById("subjectCount").textContent = marks.length;

  document.getElementById("marksContainer").style.display = "grid";
  document.getElementById("noMarksMessage").style.display = "none";
}

function showLoadingMessage() {
  document.getElementById("loadingMessage").style.display = "block";
  document.getElementById("marksContainer").style.display = "none";
  document.getElementById("noMarksMessage").style.display = "none";
}

function hideLoadingMessage() {
  document.getElementById("loadingMessage").style.display = "none";
}

function showNoMarksMessage() {
  document.getElementById("noMarksMessage").style.display = "block";
  document.getElementById("marksContainer").style.display = "none";
  hideLoadingMessage();
}
