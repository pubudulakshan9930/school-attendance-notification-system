const manualForm = document.getElementById("manualForm");
const bulkForm = document.getElementById("bulkForm");
const tabButtons = document.querySelectorAll(".tab-button");
const tabPanes = document.querySelectorAll(".tab-pane");
const subjectChoices = document.getElementById("subjectChoices");
const statusDiv = document.getElementById("status");
const bulkStatusDiv = document.getElementById("bulkStatus");
const teacherName = document.getElementById("teacherName");
const classInfo = document.getElementById("classInfo");

const API_BASE = "/api/teacher/students";

let teacherClass = null;
let subjectPlan = null;
const selectedElectiveSubjects = {};

function getToken() {
  return localStorage.getItem("sureki_token");
}

function formatTeacherName(fullName) {
  if (!fullName || fullName.trim() === "") {
    return "Teacher";
  }

  const words = fullName.trim().split(" ");
  if (words.length <= 2) {
    return fullName;
  }

  // Split name: show first half on first line, rest on second
  const midPoint = Math.ceil(words.length / 2);
  const firstName = words.slice(0, midPoint).join(" ");
  const lastName = words.slice(midPoint).join(" ");

  return `${firstName}\n${lastName}`;
}

function formatClassInfo(classInfo) {
  if (!classInfo) {
    return "Grade - Class";
  }

  const year = new Date().getFullYear();
  const parts = [
    `${year} Grade ${classInfo.grade}`,
    `Class ${classInfo.section}`,
  ];
  if (classInfo.stream) {
    const streamLabel = getStreamLabel(classInfo.stream);
    if (streamLabel) {
      parts.push(streamLabel);
    }
  }

  return parts.join(" - ");
}

function formatClassTitle(classInfo) {
  if (!classInfo) {
    return "No active class assigned";
  }

  const parts = [`Grade ${classInfo.grade}`, `Class ${classInfo.section}`];
  if (classInfo.stream) {
    const streamLabel = getStreamLabel(classInfo.stream);
    if (streamLabel) parts.push(streamLabel);
  }

  return parts.join(" · ");
}

function getMandatorySubjectEntries(plan) {
  const mandatorySubjects = Array.isArray(plan?.mandatory_subjects)
    ? plan.mandatory_subjects
    : [];

  if (mandatorySubjects.length > 0) {
    return mandatorySubjects;
  }

  const entries = [];

  (plan?.fixed_subjects || []).forEach((subject) => {
    const name = String(subject || "").trim();
    if (name) {
      entries.push({ type: "subject", name });
    }
  });

  return entries;
}

async function apiFetch(url, options = {}) {
  const token = getToken();
  if (!token) {
    throw new Error("Authentication required.");
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("sureki_token");
      window.location.href = "/index.html";
      throw new Error("Session expired. Please login again.");
    }
    const message =
      payload && typeof payload === "object" && payload.error
        ? payload.error
        : "Request failed.";
    throw new Error(message);
  }

  return payload;
}

async function loadTeacherDashboard() {
  try {
    const data = await apiFetch("/api/teacher/dashboard");
    teacherClass = data.class;
    subjectPlan = data.subject_plan || null;

    const fullName =
      data?.teacher?.name ||
      data?.user?.full_name ||
      data?.user?.name ||
      "Teacher";
    teacherName.textContent = formatTeacherName(fullName);
    classInfo.textContent = formatClassInfo(teacherClass);

    renderSubjectChoices();
  } catch (error) {
    console.error("Failed to load teacher dashboard:", error);
    teacherName.textContent = "Teacher";
    classInfo.textContent = "Grade - Class";
  }
}

async function loadTeacherClass() {
  try {
    const data = await apiFetch("/api/teacher/profile");
    teacherClass = data.class;
    subjectPlan = data.subject_plan || null;
    renderSubjectChoices();
  } catch (error) {
    console.error("Failed to load teacher class:", error);
    showStatus("Failed to load class information.", false);
  }
}

function renderSubjectChoices() {
  if (!teacherClass) return;

  Object.keys(selectedElectiveSubjects).forEach((key) => {
    delete selectedElectiveSubjects[key];
  });

  const plan =
    subjectPlan || getClassSubjectPlan(teacherClass.grade, teacherClass.stream);
  if (!plan) {
    subjectChoices.innerHTML =
      "<p style='color: #6b7280; text-align: center; padding: 20px;'>No subject plan configured.</p>";
    return;
  }

  let html = "";
  const mandatoryEntries = getMandatorySubjectEntries(plan);
  const mandatorySubjects = mandatoryEntries.filter(
    (entry) => entry.type === "subject",
  );
  if (mandatoryEntries.length > 0) {
    html += `
      <div class="fixed-subjects">
        <div class="fixed-subject-list">${mandatorySubjects
          .map((entry) => entry.name)
          .join(", ")}</div>
      </div>
    `;
  }

  if (plan.elective_groups && plan.elective_groups.length > 0) {
    plan.elective_groups.forEach((group) => {
      const opts = Array.isArray(group.options) ? group.options : [];
      if (opts.length === 0) return;
      html += `
        <div class="subject-group">
          <label for="${group.key}">${group.label}</label>
          <select id="${group.key}" name="${group.key}" required>
            <option value="">Select ${group.label}</option>
            ${opts.map((opt) => `<option value="${opt}">${opt}</option>`).join("")}
          </select>
        </div>
      `;
    });
  }

  subjectChoices.innerHTML = html;
}

if (subjectChoices) {
  subjectChoices.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return;
    }

    if (target.name && target.name.startsWith("elective_subject_")) {
      selectedElectiveSubjects[target.name] = target.value;
    }
  });
}

function showStatus(message, isSuccess = false) {
  statusDiv.textContent = message;
  statusDiv.className = `status-message show ${isSuccess ? "success" : "error"}`;
}

function showBulkStatus(message, isSuccess = false) {
  bulkStatusDiv.textContent = message;
  bulkStatusDiv.className = `status-message show ${isSuccess ? "success" : "error"}`;
}

// Tab navigation
tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const tabName = button.dataset.tab;

    // Update active button
    tabButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    // Update active pane
    tabPanes.forEach((pane) => pane.classList.remove("active"));
    document.getElementById(tabName + "Tab").classList.add("active");
  });
});

// File input display filename
const fileInput = document.querySelector(".file-input");
if (fileInput) {
  fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      const fileName = e.target.files[0].name;
      e.target.title = fileName;
    }
  });
}

manualForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!teacherClass) {
    showStatus("Teacher class information not available.", false);
    return;
  }

  const formData = new FormData(manualForm);
  const pickFormValue = (...values) => {
    for (const value of values) {
      if (value === null || value === undefined) {
        continue;
      }
      const normalized = String(value).trim();
      if (normalized) {
        return normalized;
      }
    }
    return null;
  };

  const payload = {
    student_name: formData.get("student_name").trim(),
    student_code: formData.get("student_code").trim(),
    parent_name: formData.get("parent_name").trim(),
    parent_phone: formData.get("parent_phone").trim(),
    parent_email: formData.get("parent_email").trim() || null,
    city: formData.get("city").trim() || null,
    address: formData.get("address").trim(),
    elective_subject_1: pickFormValue(
      selectedElectiveSubjects.elective_subject_1,
      formData.get("elective_subject_1"),
      formData.get("elective1"),
      formData.get("Category 1"),
    ),
    elective_subject_2: pickFormValue(
      selectedElectiveSubjects.elective_subject_2,
      formData.get("elective_subject_2"),
      formData.get("elective2"),
      formData.get("Category 2"),
    ),
    elective_subject_3: pickFormValue(
      selectedElectiveSubjects.elective_subject_3,
      formData.get("elective_subject_3"),
      formData.get("elective3"),
      formData.get("Category 3"),
    ),
  };

  try {
    const data = await apiFetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    showStatus("✓ Student registered successfully!", true);
    manualForm.reset();
    setTimeout(() => {
      statusDiv.classList.remove("show");
    }, 4000);
  } catch (error) {
    showStatus("✕ " + error.message, false);
  }
});

bulkForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!teacherClass) {
    showBulkStatus("Teacher class information not available.", false);
    return;
  }

  const formData = new FormData(bulkForm);

  try {
    const data = await apiFetch(API_BASE + "/bulk-upload", {
      method: "POST",
      body: formData,
    });

    const message = `✓ Bulk upload completed. Registered: ${data.registered_count}, Errors: ${data.errors ? data.errors.length : 0}`;
    showBulkStatus(message, true);
    if (data.errors && data.errors.length > 0) {
      console.log("Upload errors:", data.errors);
    }
    bulkForm.reset();
    setTimeout(() => {
      bulkStatusDiv.classList.remove("show");
    }, 4000);
  } catch (error) {
    showBulkStatus("✕ " + error.message, false);
  }
});

loadTeacherDashboard();
