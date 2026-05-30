const termMapping = {
  1: "First Term",
  2: "Second Term",
  3: "Third Term",
};

const term = localStorage.getItem("selectedTerm");
const subjectId = localStorage.getItem("selectedSubjectId");
const subject = localStorage.getItem("selectedSubjectName");
const currentTerm = document.getElementById("currentTerm");
const currentSubject = document.getElementById("currentSubject");
const subjectName = document.getElementById("subjectName");
const marksHint = document.getElementById("marksHint");
const spreadsheetFile = document.getElementById("spreadsheetFile");
const previewButton = document.getElementById("previewButton");
const uploadButton = document.getElementById("uploadButton");
const uploadStatus = document.getElementById("uploadStatus");
const spreadsheetPreview = document.getElementById("spreadsheetPreview");
const studentList = document.getElementById("studentList");
const saveButton = document.getElementById("saveButton");

let students = [];
let selectedSpreadsheetFile = null;
let existingMarks = new Map(); // store existing marks by student_id

function getToken() {
  return localStorage.getItem("sureki_token");
}

function setUploadStatus(message, kind = "info") {
  if (!uploadStatus) {
    return;
  }

  uploadStatus.className = `spreadsheet-upload-status ${kind}`;
  uploadStatus.textContent = message || "";
}

function clearSpreadsheetPreview() {
  if (spreadsheetPreview) {
    spreadsheetPreview.innerHTML = "";
  }
}

function renderSpreadsheetPreview(data) {
  if (!spreadsheetPreview) {
    return;
  }

  const previewRows = Array.isArray(data.preview_rows) ? data.preview_rows : [];
  const errors = Array.isArray(data.errors) ? data.errors : [];

  const sections = [];

  sections.push(`
    <div class="spreadsheet-preview-summary">
      <div><strong>Sheet:</strong> ${data.sheet_name || "First sheet"}</div>
      <div><strong>Rows parsed:</strong> ${data.total_rows || 0}</div>
      <div><strong>Missing students:</strong> ${data.missing_students_count || 0}</div>
    </div>
  `);

  if (previewRows.length > 0) {
    sections.push(`
      <div class="spreadsheet-preview-table-wrap">
        <table class="spreadsheet-preview-table">
          <thead>
            <tr>
              <th>Row</th>
              <th>Student</th>
              <th>Code / ID</th>
              <th>Mark</th>
              <th>Comment</th>
            </tr>
          </thead>
          <tbody>
            ${previewRows
              .map(
                (row) => `
                  <tr>
                    <td>${row.rowNumber ?? "-"}</td>
                    <td>${row.student_name || "-"}</td>
                    <td>${row.student_code || row.student_id || "-"}</td>
                    <td>${row.mark ?? "-"}</td>
                    <td>${row.comment || "-"}</td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `);
  }

  if (errors.length > 0) {
    sections.push(`
      <div class="spreadsheet-preview-errors">
        <h4>Validation issues</h4>
        <ul>
          ${errors
            .map(
              (item) => `
                <li>${item.row ? `Row ${item.row}: ` : ""}${item.error}</li>
              `,
            )
            .join("")}
        </ul>
      </div>
    `);
  }

  spreadsheetPreview.innerHTML = sections.join("");
}

function buildSpreadsheetFormData() {
  if (!selectedSpreadsheetFile) {
    throw new Error("Please choose a spreadsheet file first.");
  }

  const formData = new FormData();
  formData.append("spreadsheet", selectedSpreadsheetFile);
  formData.append("term", String(term));
  formData.append("subject_id", String(subjectId));
  return formData;
}

async function sendSpreadsheetRequest(url) {
  const token = getToken();
  if (!token) {
    window.location.href = "/index.html";
    return null;
  }

  const formData = buildSpreadsheetFormData();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok) {
    const message = payload.error || "Unable to process spreadsheet.";
    const validationErrors = Array.isArray(payload.errors)
      ? payload.errors
      : [];
    const combinedMessage = validationErrors.length
      ? `${message}\n${validationErrors
          .map((item) => `${item.row ? `Row ${item.row}: ` : ""}${item.error}`)
          .join("\n")}`
      : message;
    throw new Error(combinedMessage);
  }

  return payload;
}

spreadsheetFile?.addEventListener("change", () => {
  selectedSpreadsheetFile = spreadsheetFile.files?.[0] || null;
  clearSpreadsheetPreview();

  if (selectedSpreadsheetFile) {
    setUploadStatus(`Selected file: ${selectedSpreadsheetFile.name}`, "info");
  } else {
    setUploadStatus("Choose a spreadsheet to preview or upload.", "info");
  }
});

previewButton?.addEventListener("click", async () => {
  try {
    setUploadStatus("Generating preview...", "info");
    const payload = await sendSpreadsheetRequest(
      "/api/teacher/term-marks/upload/preview",
    );

    if (!payload) {
      return;
    }

    renderSpreadsheetPreview(payload.data || {});
    setUploadStatus(
      "Preview loaded. Check the rows before uploading.",
      "success",
    );
  } catch (error) {
    clearSpreadsheetPreview();
    setUploadStatus(error.message || "Unable to preview spreadsheet.", "error");
  }
});

uploadButton?.addEventListener("click", async () => {
  const confirmUpload = window.confirm(
    "Upload the spreadsheet and save all term marks now?",
  );
  if (!confirmUpload) {
    return;
  }

  try {
    setUploadStatus("Uploading spreadsheet and saving marks...", "info");
    const payload = await sendSpreadsheetRequest(
      "/api/teacher/term-marks/upload",
    );

    if (!payload) {
      return;
    }

    setUploadStatus(
      payload.message || "Spreadsheet uploaded successfully.",
      "success",
    );
    alert(payload.message || "Spreadsheet uploaded successfully.");
    spreadsheetFile.value = "";
    selectedSpreadsheetFile = null;
    clearSpreadsheetPreview();
  } catch (error) {
    setUploadStatus(error.message || "Unable to upload spreadsheet.", "error");
  }
});

setUploadStatus("Choose a spreadsheet to preview or upload.", "info");

if (!term) {
  window.location.href = "term.html";
} else if (!subjectId || !subject) {
  window.location.href = "subject-list.html";
} else {
  currentTerm.textContent = termMapping[term] || term;
  currentSubject.textContent = subject;
  subjectName.textContent = subject;
  loadStudents();
}

async function loadStudents() {
  const token = getToken();
  if (!token) {
    window.location.href = "/index.html";
    return;
  }

  marksHint.textContent = "Loading students...";
  console.log("loadStudents: Starting load");

  try {
    const response = await fetch(
      `/api/teacher/student-marks?term=${encodeURIComponent(term)}&subject_id=${encodeURIComponent(subjectId)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const data = await response.json();
    console.log("loadStudents: Response status:", response.status);
    console.log("loadStudents: Response data:", data);

    if (!response.ok) {
      throw new Error(data.error || "Failed to load students.");
    }

    students = Array.isArray(data.data?.students) ? data.data.students : [];
    console.log("loadStudents: Loaded students:", students.length);

    existingMarks.clear();
    for (const student of students) {
      const studentIdKey = String(student.student_id || student.id);
      if (
        student.mark !== null &&
        student.mark !== undefined &&
        student.mark !== ""
      ) {
        existingMarks.set(studentIdKey, Number(student.mark));
      }
    }

    console.log("loadStudents: Calling renderStudentInputs...");
    renderStudentInputs();
    console.log("loadStudents: renderStudentInputs completed");
    // Wire download template button to authenticated endpoint returning subject-specific student codes
    try {
      const downloadLink = document.getElementById("downloadTemplateLink");
      if (downloadLink) {
        downloadLink.onclick = async (e) => {
          e.preventDefault();
          const token = getToken();
          if (!token) {
            window.location.href = "/index.html";
            return;
          }

          try {
            setUploadStatus("Preparing template...", "info");
            const resp = await fetch(
              `/api/teacher/term-marks/template?subject_id=${encodeURIComponent(
                subjectId,
              )}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );

            if (!resp.ok) {
              const body = await resp.json().catch(() => ({}));
              throw new Error(
                body.error || resp.statusText || "Failed to fetch template.",
              );
            }

            const blob = await resp.blob();
            const cd = resp.headers.get("content-disposition") || "";
            let filename = `subject-marks-template-${subject || "subject"}.csv`;
            const m = /filename="([^\"]+)"/.exec(cd);
            if (m && m[1]) filename = m[1];

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            setUploadStatus("", "info");
          } catch (err) {
            console.error("Download template failed:", err);
            setUploadStatus(
              err.message || "Failed to download template.",
              "error",
            );
          }
        };
      }
    } catch (err) {
      console.warn("Failed to set download template link:", err);
    }
  } catch (error) {
    console.error("Load students failed:", error);
    studentList.innerHTML = "";
    marksHint.textContent =
      error.message || "Unable to load students for this class.";
    saveButton.disabled = true;
  }
}

// Ensure download template button works even if loadStudents fails
function attachDownloadTemplateHandler() {
  try {
    const downloadLink = document.getElementById("downloadTemplateLink");
    if (!downloadLink) return;

    downloadLink.onclick = async (e) => {
      e.preventDefault();
      const token = getToken();
      if (!token) {
        window.location.href = "/index.html";
        return;
      }

      try {
        setUploadStatus("Preparing template...", "info");
        const resp = await fetch(
          `/api/teacher/term-marks/template?subject_id=${encodeURIComponent(
            subjectId,
          )}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          throw new Error(
            body.error || resp.statusText || "Failed to fetch template.",
          );
        }

        const blob = await resp.blob();
        const cd = resp.headers.get("content-disposition") || "";
        let filename = `subject-marks-template-${subject || "subject"}.csv`;
        const m = /filename="([^\"]+)"/.exec(cd);
        if (m && m[1]) filename = m[1];

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setUploadStatus("", "info");
      } catch (err) {
        console.error("Download template failed:", err);
        setUploadStatus(err.message || "Failed to download template.", "error");
      }
    };
  } catch (err) {
    console.warn("attachDownloadTemplateHandler error:", err);
  }
}

attachDownloadTemplateHandler();

async function loadExistingMarks() {
  const token = getToken();
  if (!token || !term || !subjectId) {
    console.warn("loadExistingMarks: Missing token, term, or subjectId");
    return;
  }

  console.log(
    `loadExistingMarks: Fetching marks for term=${term}, subjectId=${subjectId}`,
  );

  try {
    const url = `/api/teacher/student-marks?term=${encodeURIComponent(term)}&subject_id=${encodeURIComponent(subjectId)}`;
    console.log("loadExistingMarks: Fetching from URL:", url);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("loadExistingMarks: Response status:", response.status);
    const data = await response.json();
    console.log("loadExistingMarks: Response data:", data);

    if (response.ok) {
      const payload = data.data || {};
      const marksData = payload.students || [];

      console.log("loadExistingMarks: Students data:", marksData);

      // store marks by student_id (the API returns student_id as the key)
      existingMarks.clear();
      marksData.forEach((student) => {
        // The API returns student_id, not id
        const studentIdKey = String(student.student_id || student.id);

        if (
          student.mark !== null &&
          student.mark !== undefined &&
          student.mark !== ""
        ) {
          existingMarks.set(studentIdKey, Number(student.mark));
          console.log(
            `loadExistingMarks: Stored mark for student ${studentIdKey}: ${student.mark}`,
          );
        }
      });

      console.log("loadExistingMarks: Total marks loaded:", existingMarks.size);
    } else {
      console.error("loadExistingMarks: Response not OK", data);
    }
  } catch (error) {
    console.error("Load existing marks failed:", error);
  }
}

function renderStudentInputs() {
  console.log(
    "renderStudentInputs: Starting. Students count:",
    students.length,
  );
  console.log("renderStudentInputs: Existing marks:", existingMarks);

  studentList.innerHTML = "";

  if (students.length === 0) {
    marksHint.textContent = "No students found for this class.";
    saveButton.disabled = true;
    return;
  }

  saveButton.disabled = false;
  marksHint.textContent =
    "Enter all student marks and click Save to store them in the database.";

  students.forEach((student) => {
    const row = document.createElement("div");
    row.className = "subject-row";

    const studentId = String(student.student_id || student.id || "");
    const existingMark = existingMarks.get(studentId);
    const hasExistingMark = existingMark !== undefined;

    console.log(
      `renderStudentInputs: Student ${studentId}, mark=${existingMark}, has=${hasExistingMark}`,
    );

    // Apply styling based on whether mark is already entered
    if (hasExistingMark) {
      row.classList.add("subject-row-filled");
    } else {
      row.classList.add("subject-row-empty");
    }

    const label = document.createElement("label");
    label.textContent = student.full_name;
    label.htmlFor = `student-${studentId}`;

    // Add badge for existing marks
    const badge = document.createElement("span");
    badge.className = "mark-badge";
    if (hasExistingMark) {
      badge.textContent = `✓ ${existingMark}`;
      badge.classList.add("mark-badge-filled");
    } else {
      badge.textContent = "○ Not marked";
      badge.classList.add("mark-badge-empty");
    }
    label.appendChild(badge);

    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.max = "100";
    input.placeholder = "Mark";
    input.id = `student-${studentId}`;
    input.name = `student-${studentId}`;
    input.className = "subject-input";
    input.required = true;
    input.dataset.studentId = studentId;
    input.dataset.studentName = student.full_name;

    // Pre-fill with existing mark if available
    if (hasExistingMark) {
      input.value = existingMark;
      console.log(
        `renderStudentInputs: Pre-filled input for student ${studentId} with value ${existingMark}`,
      );
    }

    row.appendChild(label);
    row.appendChild(input);
    studentList.appendChild(row);
  });

  console.log(
    "renderStudentInputs: Completed rendering",
    studentList.children.length,
  );
}

saveButton.addEventListener("click", async () => {
  const token = getToken();
  if (!token) {
    window.location.href = "/index.html";
    return;
  }

  const marks = [];
  const inputs = Array.from(studentList.querySelectorAll("input"));
  for (const input of inputs) {
    const raw = String(input.value || "").trim();
    if (raw === "") {
      alert(`Please enter a mark for ${input.dataset.studentName}.`);
      input.focus();
      return;
    }

    const markValue = Number(raw);
    if (!Number.isFinite(markValue) || markValue < 0 || markValue > 100) {
      input.focus();
      return;
    }

    marks.push({
      student_id: input.dataset.studentId,
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
        subject_id: subjectId,
        marks,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Unable to save term marks.");
    }

    alert("Term marks saved successfully.");
    window.location.href = "subject-list.html";
  } catch (error) {
    alert(error.message || "Unable to save term marks.");
  }
});
