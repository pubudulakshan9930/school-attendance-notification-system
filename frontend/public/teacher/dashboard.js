const teacherName = document.getElementById("teacherName");
const classInfo = document.getElementById("classInfo");
const registerStudentBtn = document.getElementById("registerStudentBtn");
const viewSubjectPlanBtn = document.getElementById("viewSubjectPlanBtn");
const registerStudentModal = document.getElementById("registerStudentModal");
const subjectPlanModal = document.getElementById("subjectPlanModal");
const closeRegisterModal = document.getElementById("closeRegisterModal");
const closeSubjectPlanModal = document.getElementById("closeSubjectPlanModal");
const manualStudentForm = document.getElementById("manualStudentForm");
const csvUploadForm = document.getElementById("csvUploadForm");
const downloadCsvTemplateBtn = document.getElementById(
  "downloadCsvTemplateBtn",
);
const subjectSelection = document.getElementById("subjectSelection");
const registrationStatus = document.getElementById("registrationStatus");
const subjectPlanSummary = document.getElementById("subjectPlanSummary");
const subjectPlanContent = document.getElementById("subjectPlanContent");
const headerIcon = document.querySelector(".header-icon");
const editTeacherModal = document.getElementById("editTeacherModal");
const editTeacherForm = document.getElementById("editTeacherForm");
const closeEditTeacherModal = document.getElementById("closeEditTeacherModal");
const cancelEditTeacher = document.getElementById("cancelEditTeacher");
const editTeacherStatus = document.getElementById("editTeacherStatus");
const teacherFullName = document.getElementById("teacherFullName");
const teacherEmail = document.getElementById("teacherEmail");
const teacherPhone = document.getElementById("teacherPhone");

const STUDENT_REGISTRATION_API = "/api/teacher/students";
const TEACHER_PROFILE_API = "/api/teacher/profile";
let teacherClass = null;
let subjectPlan = null;
let teacherDashboardPromise = null;
let currentTeacher = null;
const selectedElectiveSubjects = {};

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

function escapeCsvValue(value) {
  const text = String(value ?? "");

  if (/[,\r\n"]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function pickFormValue(...values) {
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

function buildStudentRegistrationTemplateCsv() {
  const plan =
    subjectPlan ||
    getClassSubjectPlan(teacherClass?.grade, teacherClass?.stream);

  const electiveGroups = (plan?.elective_groups || []).filter((group) => {
    return Array.isArray(group?.options) && group.options.length > 0;
  });

  const columns = [
    "Full Name",
    "Gender",
    "Student ID",
    "Parent Name",
    "Parent Phone",
    "Parent Email",
    "City",
    "Address",
    ...electiveGroups.map((_, index) => `Category ${index + 1}`),
  ];

  return `${columns.map(escapeCsvValue).join(",")}\n`;
}

function triggerCsvTemplateDownload() {
  const csv = buildStudentRegistrationTemplateCsv();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  const gradePart = teacherClass?.grade
    ? `grade-${teacherClass.grade}`
    : "class";
  const streamPart = teacherClass?.stream
    ? `-${String(teacherClass.stream).trim().toLowerCase()}`
    : "";

  link.href = url;
  link.download = `student-registration-template-${gradePart}${streamPart}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getToken() {
  return localStorage.getItem("sureki_token");
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

function renderSubjectSelectionForm() {
  if (!teacherClass || !subjectSelection) return;

  Object.keys(selectedElectiveSubjects).forEach((key) => {
    delete selectedElectiveSubjects[key];
  });

  const plan =
    subjectPlan || getClassSubjectPlan(teacherClass.grade, teacherClass.stream);
  if (!plan) {
    subjectSelection.innerHTML = `
      <div class="subject-selection-empty">
        <div class="subject-selection-empty-icon">📚</div>
        <div>
          <h4>No subject plan configured</h4>
          <p>The current class does not have a subject plan yet.</p>
        </div>
      </div>
    `;
    return;
  }

  let html = `
    <div class="subject-selection-panel">
      <div class="subject-selection-header">
        <div>
          <p class="subject-selection-kicker">Select Subject</p>
          <h4 class="subject-selection-title">Class subject plan</h4>
        </div>
        <div class="subject-selection-badge">
          Grade ${teacherClass.grade}${teacherClass.stream ? ` • ${getStreamLabel(teacherClass.stream) || teacherClass.stream}` : ""}
        </div>
      </div>
  `;

  let mandatorySectionHtml = "";
  const mandatoryEntries = getMandatorySubjectEntries(plan);
  const mandatorySubjects = mandatoryEntries.filter(
    (entry) => entry.type === "subject",
  );
  if (mandatoryEntries.length > 0) {
    mandatorySectionHtml = `
      <div class="subject-selection-section">
        <div class="subject-selection-section-header">
          <span class="subject-selection-section-title">Mandatory subjects</span>
          <span class="subject-selection-section-note">Auto-assigned</span>
        </div>
        <div class="subject-chip-list">
          ${mandatorySubjects
            .map(
              (entry) => `
                <span class="subject-chip">
                  <span class="subject-chip-dot"></span>
                  <span>${entry.name}</span>
                </span>
              `,
            )
            .join("")}
        </div>
      </div>
    `;
  }

  // Elective groups (for grades 6-13) - render only when category has options
  const electiveSectionHtml = (plan.elective_groups || [])
    .filter((group) => Array.isArray(group.options) && group.options.length > 0)
    .map(
      (group) => `
        <div class="subject-selection-section subject-selection-card">
          <div class="subject-selection-section-header">
            <span class="subject-selection-section-title">${group.label}</span>
            <span class="subject-selection-section-note">Required</span>
          </div>
          <label class="subject-selection-label" for="${group.key}">
            Choose one subject from this category
          </label>
          <select id="${group.key}" name="${group.key}" required>
            <option value="">Select from ${group.label}</option>
            ${group.options.map((opt) => `<option value="${opt}">${opt}</option>`).join("")}
          </select>
        </div>
      `,
    )
    .join("");

  html += mandatorySectionHtml + electiveSectionHtml + "</div>";
  subjectSelection.innerHTML = html;
}

if (subjectSelection) {
  subjectSelection.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return;
    }

    if (target.name && target.name.startsWith("elective_subject_")) {
      selectedElectiveSubjects[target.name] = target.value;
    }
  });
}

function showStatus(message, isSuccess = true) {
  registrationStatus.className = `status-message ${isSuccess ? "success" : "error"}`;
  registrationStatus.textContent = message;
  registrationStatus.style.display = "block";
}

function hideStatus() {
  registrationStatus.style.display = "none";
}

function showEditTeacherStatus(message, isSuccess = true) {
  editTeacherStatus.className = `status-message ${isSuccess ? "success" : "error"}`;
  editTeacherStatus.textContent = message;
  editTeacherStatus.style.display = "block";
}

function hideEditTeacherStatus() {
  editTeacherStatus.style.display = "none";
}

function populateEditTeacherForm() {
  if (currentTeacher) {
    teacherFullName.value = currentTeacher.full_name || "";
    teacherEmail.value = currentTeacher.email || "";
    teacherPhone.value = currentTeacher.phone || "";
  }
}

function formatPlanList(items) {
  if (!items || items.length === 0) {
    return [];
  }

  return items;
}

function getSubjectCardTheme(subjectName, index = 0) {
  const value = String(subjectName || "").toLowerCase();

  const themes = [
    { icon: "∑", tint: "indigo" },
    { icon: "△", tint: "blue" },
    { icon: "▮", tint: "emerald" },
    { icon: "□", tint: "slate" },
    { icon: "λ", tint: "violet" },
    { icon: "◌", tint: "amber" },
  ];

  if (
    value.includes("math") ||
    value.includes("algebra") ||
    value.includes("calculus")
  ) {
    return { icon: "∑", tint: "indigo" };
  }
  if (value.includes("geo")) {
    return { icon: "△", tint: "blue" };
  }
  if (value.includes("stat")) {
    return { icon: "▮", tint: "emerald" };
  }
  if (
    value.includes("science") ||
    value.includes("bio") ||
    value.includes("chem") ||
    value.includes("phys")
  ) {
    return { icon: "◌", tint: "teal" };
  }
  if (
    value.includes("history") ||
    value.includes("civic") ||
    value.includes("soc")
  ) {
    return { icon: "▣", tint: "slate" };
  }
  if (
    value.includes("language") ||
    value.includes("english") ||
    value.includes("literature")
  ) {
    return { icon: "✎", tint: "violet" };
  }

  return themes[index % themes.length];
}

function createSubjectCard(subjectName, index = 0, detailText = "") {
  const theme = getSubjectCardTheme(subjectName, index);
  const card = document.createElement("article");
  card.className = `subject-plan-card subject-plan-card-${theme.tint}`;

  const iconWrap = document.createElement("div");
  iconWrap.className = "subject-plan-card-icon";
  iconWrap.textContent = theme.icon;

  const body = document.createElement("div");
  body.className = "subject-plan-card-body";

  const title = document.createElement("h4");
  title.textContent = subjectName;

  const subtitle = document.createElement("p");
  subtitle.textContent = detailText;

  body.appendChild(title);
  body.appendChild(subtitle);

  const arrow = document.createElement("span");
  arrow.className = "subject-plan-card-arrow";
  arrow.textContent = ">";

  card.appendChild(iconWrap);
  card.appendChild(body);
  card.appendChild(arrow);

  return card;
}

function createSubjectGroupCard(group, index = 0) {
  const theme = getSubjectCardTheme(group.label || "Elective Group", index);
  const card = document.createElement("article");
  card.className = `subject-plan-group-card subject-plan-card-${theme.tint}`;

  const header = document.createElement("div");
  header.className = "subject-plan-group-header";

  const iconWrap = document.createElement("div");
  iconWrap.className = "subject-plan-card-icon";
  iconWrap.textContent = theme.icon;

  const titleWrap = document.createElement("div");
  titleWrap.className = "subject-plan-group-title-wrap";

  const title = document.createElement("h4");
  title.textContent = group.label || `Elective Group ${index + 1}`;

  const subtitle = document.createElement("p");
  subtitle.textContent = `${(group.options || []).length} subject option${(group.options || []).length === 1 ? "" : "s"} available`;

  titleWrap.appendChild(title);
  titleWrap.appendChild(subtitle);

  const arrow = document.createElement("span");
  arrow.className = "subject-plan-card-arrow";
  arrow.textContent = ">";

  header.appendChild(iconWrap);
  header.appendChild(titleWrap);
  header.appendChild(arrow);

  const options = document.createElement("div");
  options.className = "group-options";

  (group.options || []).forEach((option) => {
    const tag = document.createElement("span");
    tag.className = "option-tag";
    tag.textContent = option;
    options.appendChild(tag);
  });

  card.appendChild(header);
  card.appendChild(options);

  return card;
}

function renderSubjectPlan() {
  if (!subjectPlanContent || !subjectPlanSummary) {
    return;
  }

  const plan =
    subjectPlan ||
    getClassSubjectPlan(teacherClass?.grade, teacherClass?.stream);

  if (!plan) {
    subjectPlanSummary.textContent =
      "No subject plan is configured for this class.";
    subjectPlanContent.innerHTML = "";
    return;
  }

  const title = plan.stream_label
    ? `Grade ${plan.grade} - ${plan.stream_label}`
    : `Grade ${plan.grade}`;
  subjectPlanSummary.innerHTML = `<span class="plan-title">${title}</span><span class="plan-subtitle">Current curriculum setup</span>`;

  subjectPlanContent.innerHTML = "";
  const fragment = document.createDocumentFragment();
  const mandatoryEntries = getMandatorySubjectEntries(plan);
  const mandatorySubjects = mandatoryEntries.filter(
    (entry) => entry.type === "subject",
  );

  const mandatorySection = document.createElement("section");
  mandatorySection.className = "subject-plan-section";

  const mandatoryHeader = document.createElement("div");
  mandatoryHeader.className = "section-header";
  mandatoryHeader.innerHTML = `
    <span class="section-icon">📚</span>
    <div>
      <h3>Mandatory Subjects</h3>
      <p>Core subjects included in this class plan.</p>
    </div>
  `;

  const mandatoryList = document.createElement("div");
  mandatoryList.className = "subject-plan-card-list";

  const mandatoryNames = formatPlanList(
    mandatorySubjects.map((entry) => entry.name),
  );
  if (mandatoryNames.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "subject-plan-empty-state";
    emptyState.textContent = "No mandatory subjects configured.";
    mandatoryList.appendChild(emptyState);
  } else {
    mandatoryNames.forEach((item, index) => {
      mandatoryList.appendChild(
        createSubjectCard(item, index, "Mandatory subject"),
      );
    });
  }

  mandatorySection.appendChild(mandatoryHeader);
  mandatorySection.appendChild(mandatoryList);
  fragment.appendChild(mandatorySection);

  const nonEmptyElectiveGroups = (plan.elective_groups || []).filter(
    (group) => group.options && group.options.length > 0,
  );

  if (nonEmptyElectiveGroups.length > 0) {
    const electiveSection = document.createElement("section");
    electiveSection.className = "subject-plan-section";

    const electiveHeader = document.createElement("div");
    electiveHeader.className = "section-header";
    electiveHeader.innerHTML = `
      <span class="section-icon">⭐</span>
      <div>
        <h3>Elective Groups</h3>
        <p>Pick one subject from each elective group.</p>
      </div>
    `;

    const electiveList = document.createElement("div");
    electiveList.className = "subject-plan-group-list";
    nonEmptyElectiveGroups.forEach((group, index) => {
      electiveList.appendChild(createSubjectGroupCard(group, index));
    });

    electiveSection.appendChild(electiveHeader);
    electiveSection.appendChild(electiveList);
    fragment.appendChild(electiveSection);
  }

  subjectPlanContent.appendChild(fragment);
}

function getFilenameFromContentDisposition(headerValue) {
  const match = String(headerValue || "").match(
    /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i,
  );
  const encoded = match?.[1] || match?.[2] || "";

  if (!encoded) {
    return "student-registration-template.csv";
  }

  try {
    return decodeURIComponent(encoded);
  } catch (_error) {
    return encoded;
  }
}

async function triggerCsvTemplateDownload() {
  const token = getToken();
  if (!token) {
    throw new Error("Authentication required.");
  }

  const response = await fetch("/api/teacher/students/template", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const contentType = response.headers.get("content-type") || "";
  if (!response.ok) {
    const payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text();
    const message =
      payload && typeof payload === "object" && payload.error
        ? payload.error
        : payload || "Failed to download CSV template.";
    throw new Error(message);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const fileName = getFilenameFromContentDisposition(
    response.headers.get("content-disposition"),
  );

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function loadTeacherDashboard() {
  const token = getToken();
  if (!token) {
    window.location.href = "/index.html";
    return;
  }

  if (registerStudentBtn) {
    registerStudentBtn.disabled = true;
  }

  if (teacherDashboardPromise) {
    return teacherDashboardPromise;
  }

  teacherDashboardPromise = (async () => {
    try {
      const response = await fetch("/api/teacher/dashboard", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load dashboard details.");
      }

      const fullName =
        data?.teacher?.name ||
        data?.user?.full_name ||
        data?.user?.name ||
        "Teacher";
      teacherClass = data?.class;

      currentTeacher = {
        id: data?.teacher?.id || data?.user?.id || data?.user?.userId,
        full_name: data?.teacher?.full_name || fullName,
        email: data?.teacher?.email || data?.user?.email,
        phone: data?.teacher?.phone || data?.user?.phone,
      };

      teacherName.textContent = formatTeacherName(fullName);
      classInfo.textContent = formatClassInfo(teacherClass);
      subjectPlan = data?.subject_plan || null;

      renderSubjectSelectionForm();
      if (registerStudentBtn) {
        registerStudentBtn.disabled = !teacherClass;
      }
    } catch (error) {
      console.error("Teacher dashboard load failed:", error);
      teacherName.textContent = "Teacher";
      classInfo.textContent = "Grade - Class";
      if (registerStudentBtn) {
        registerStudentBtn.disabled = true;
      }
      throw error;
    } finally {
      teacherDashboardPromise = null;
    }
  })();

  return teacherDashboardPromise;
}

async function ensureTeacherDashboard() {
  if (teacherClass && subjectPlan) {
    return teacherClass;
  }

  try {
    await loadTeacherDashboard();
  } catch (error) {
    console.error("Reload teacher dashboard failed:", error);
  }

  return teacherClass;
}

// Modal management
if (registerStudentBtn) {
  registerStudentBtn.addEventListener("click", async () => {
    await ensureTeacherDashboard();
    registerStudentModal.style.display = "flex";
    renderSubjectSelectionForm();
  });
}

if (closeRegisterModal) {
  closeRegisterModal.addEventListener("click", () => {
    registerStudentModal.style.display = "none";
    hideStatus();
  });
}

if (viewSubjectPlanBtn) {
  viewSubjectPlanBtn.addEventListener("click", async () => {
    await ensureTeacherDashboard();
    renderSubjectPlan();
    subjectPlanModal.style.display = "flex";
  });
}

if (downloadCsvTemplateBtn) {
  downloadCsvTemplateBtn.addEventListener("click", async () => {
    try {
      await ensureTeacherDashboard();
      await triggerCsvTemplateDownload();
    } catch (error) {
      console.error("CSV template download failed:", error);
      showStatus(error.message || "Failed to download CSV template.", false);
    }
  });
}

if (closeSubjectPlanModal) {
  closeSubjectPlanModal.addEventListener("click", () => {
    subjectPlanModal.style.display = "none";
  });
}

if (subjectPlanModal) {
  subjectPlanModal.addEventListener("click", (event) => {
    if (event.target === subjectPlanModal) {
      subjectPlanModal.style.display = "none";
    }
  });
}

// Tab switching
document.querySelectorAll(".modal-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const formType = tab.getAttribute("data-form");
    document.querySelectorAll(".modal-tab").forEach((t) => {
      t.classList.remove("is-active");
    });
    tab.classList.add("is-active");

    if (formType === "manual") {
      manualStudentForm.style.display = "block";
      csvUploadForm.style.display = "none";
    } else {
      manualStudentForm.style.display = "none";
      csvUploadForm.style.display = "block";
    }
    hideStatus();
  });
});

// Manual form submission
if (manualStudentForm) {
  manualStudentForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    await ensureTeacherDashboard();

    if (!teacherClass) {
      showStatus("No class assigned to your account.", false);
      return;
    }

    const formData = new FormData(manualStudentForm);
    const subjects = {};

    const plan =
      subjectPlan ||
      getClassSubjectPlan(teacherClass.grade, teacherClass.stream);
    if (plan) {
      for (const group of plan.elective_groups || []) {
        const opts = Array.isArray(group.options) ? group.options : [];
        if (opts.length === 0) continue;
        subjects[group.key] =
          selectedElectiveSubjects[group.key] ||
          formData.get(group.key) ||
          document.getElementById(group.key)?.value ||
          document.querySelector(`#registerStudentModal [name="${group.key}"]`)
            ?.value ||
          "";
      }
    }

    // Client-side validation: ensure required elective selections are provided
    if (plan) {
      const missing = [];
      for (const group of plan.elective_groups || []) {
        const opts = Array.isArray(group.options) ? group.options : [];
        if (opts.length === 0) continue;
        const val = String(
          selectedElectiveSubjects[group.key] ||
            formData.get(group.key) ||
            document.getElementById(group.key)?.value ||
            document.querySelector(
              `#registerStudentModal [name="${group.key}"]`,
            )?.value ||
            "",
        ).trim();
        if (!val) missing.push(group.label || group.key);
      }

      if (missing.length > 0) {
        console.debug("Missing elective selections (client):", missing);
        // Show first missing message to match backend phrasing
        showStatus(`Please select one subject from ${missing[0]}.`, false);
        return;
      }
    }

    const electiveSubject1 = pickFormValue(
      subjects.elective_subject_1,
      formData.get("elective_subject_1"),
      formData.get("elective1"),
      formData.get("Category 1"),
    );
    const electiveSubject2 = pickFormValue(
      subjects.elective_subject_2,
      formData.get("elective_subject_2"),
      formData.get("elective2"),
      formData.get("Category 2"),
    );
    const electiveSubject3 = pickFormValue(
      subjects.elective_subject_3,
      formData.get("elective_subject_3"),
      formData.get("elective3"),
      formData.get("Category 3"),
    );

    try {
      const result = await apiFetch(STUDENT_REGISTRATION_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: formData.get("fullName"),
          gender: formData.get("gender"),
          student_code: formData.get("studentCode"),
          parent_name: formData.get("parentName"),
          parent_phone: formData.get("parentPhone"),
          parent_email: formData.get("parentEmail") || null,
          city: formData.get("city"),
          address: formData.get("address"),
          class_id: teacherClass.id,
          grade: teacherClass.grade,
          stream: teacherClass.stream || "",
          elective_subject_1: electiveSubject1,
          elective_subject_2: electiveSubject2,
          elective_subject_3: electiveSubject3,
          subjects,
        }),
      });

      showStatus(
        `Student "${result.student?.full_name}" registered successfully!`,
        true,
      );
      manualStudentForm.reset();
      setTimeout(() => {
        registerStudentModal.style.display = "none";
        hideStatus();
      }, 2000);
    } catch (error) {
      console.error("Student registration failed:", error);
      showStatus(error.message || "Failed to register student.", false);
    }
  });
}

// CSV form submission
if (csvUploadForm) {
  csvUploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    await ensureTeacherDashboard();

    if (!teacherClass) {
      showStatus("No class assigned to your account.", false);
      return;
    }

    const fileInput = csvUploadForm.elements["csvFile"];
    if (!fileInput.files || !fileInput.files[0]) {
      showStatus("Please select a CSV file.", false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("csvFile", fileInput.files[0]);
      formData.append("class_id", teacherClass.id);
      formData.append("grade", teacherClass.grade);
      formData.append("stream", teacherClass.stream || "");

      const result = await apiFetch(`${STUDENT_REGISTRATION_API}/bulk-upload`, {
        method: "POST",
        body: formData,
      });

      showStatus(
        `${result.registered_count || 0} students registered successfully!`,
        true,
      );
      csvUploadForm.reset();
      setTimeout(() => {
        registerStudentModal.style.display = "none";
        hideStatus();
      }, 2000);
    } catch (error) {
      console.error("CSV upload failed:", error);
      showStatus(error.message || "Failed to upload CSV.", false);
    }
  });
}

// Edit Teacher Profile Modal - Header Icon Click
if (headerIcon) {
  headerIcon.addEventListener("click", async () => {
    await ensureTeacherDashboard();
    populateEditTeacherForm();
    hideEditTeacherStatus();
    editTeacherModal.style.display = "flex";
  });
}

// Edit Teacher Modal - Close Button
if (closeEditTeacherModal) {
  closeEditTeacherModal.addEventListener("click", () => {
    editTeacherModal.style.display = "none";
    hideEditTeacherStatus();
  });
}

// Edit Teacher Modal - Cancel Button
if (cancelEditTeacher) {
  cancelEditTeacher.addEventListener("click", () => {
    editTeacherModal.style.display = "none";
    hideEditTeacherStatus();
  });
}

// Edit Teacher Modal - Click outside to close
if (editTeacherModal) {
  editTeacherModal.addEventListener("click", (event) => {
    if (event.target === editTeacherModal) {
      editTeacherModal.style.display = "none";
      hideEditTeacherStatus();
    }
  });
}

// Edit Teacher Form Submission
if (editTeacherForm) {
  editTeacherForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideEditTeacherStatus();

    if (!currentTeacher || !currentTeacher.id) {
      showEditTeacherStatus("Unable to load teacher information.", false);
      return;
    }

    const fullName = teacherFullName.value.trim();
    if (!fullName) {
      showEditTeacherStatus("Full name is required.", false);
      return;
    }

    try {
      const result = await apiFetch(TEACHER_PROFILE_API, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: fullName,
          email: teacherEmail.value.trim() || null,
          phone: teacherPhone.value.trim() || null,
        }),
      });

      if (result.success) {
        // Update the displayed teacher name with the new value
        teacherName.textContent = formatTeacherName(fullName);

        // Update currentTeacher with new data
        if (result.teacher) {
          currentTeacher = {
            id: currentTeacher.id,
            full_name: result.teacher.full_name,
            email: result.teacher.email,
            phone: result.teacher.phone,
          };
        }

        showEditTeacherStatus("Profile updated successfully!", true);

        setTimeout(() => {
          editTeacherModal.style.display = "none";
          hideEditTeacherStatus();
        }, 1500);
      } else {
        showEditTeacherStatus(
          result.error || "Failed to update profile.",
          false,
        );
      }
    } catch (error) {
      console.error("Update profile error:", error);
      showEditTeacherStatus(
        error.message || "Failed to update profile.",
        false,
      );
    }
  });
}

loadTeacherDashboard();
