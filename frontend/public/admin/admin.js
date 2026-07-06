const ADMIN_CLASSES_API = "/api/admin/classes";
const ADMIN_TEACHERS_API = "/api/admin/teachers";
const ADMIN_CLASS_DETAILS_API = "/api/admin/classes/details";
const ATTENDANCE_REPORT_API = "/api/admin/reports/attendance";
const TERM_REPORT_API = "/api/admin/reports/term-tests";
const TERM_MARKS_APPROVE_API = "/api/admin/term-marks/approve";
const ATTENDANCE_REPORT_FILTERED_API = "/api/admin/reports/attendance/filtered";
const TERM_REPORT_FILTERED_API = "/api/admin/reports/term-tests/filtered";
const EMERGENCY_ALERT_API = "/api/admin/alerts/emergency";
const SUBJECT_PLANS_API = "/api/admin/subject-plans";
const ATTENDANCE_SETTINGS_API = "/api/admin/attendance-settings";

const adminClassForm = document.getElementById("adminClassForm");
const adminTeacherForm = document.getElementById("adminTeacherForm");
const emergencyAlertForm = document.getElementById("emergencyAlertForm");
const attendanceSettingsForm = document.getElementById(
  "attendanceSettingsForm",
);
const adminClassesList = document.getElementById("adminClassesList");
const teacherSummary = document.getElementById("teacherSummary");
const studentCount = document.getElementById("studentCount");
const teacherCount = document.getElementById("teacherCount");
const presentCount = document.getElementById("presentCount");
const presentRate = document.getElementById("presentRate");
const classCount = document.getElementById("classCount");
const absentTeacherCount = document.getElementById("absentTeacherCount");
const alertRecipientList = document.getElementById("alertRecipientList");
const classDetailsFilterForm = document.getElementById(
  "classDetailsFilterForm",
);
const classDetailsYear = document.getElementById("classDetailsYear");
const classDetailsGrade = document.getElementById("classDetailsGrade");
const classDetailsStream = document.getElementById("classDetailsStream");
const classDetailsSection = document.getElementById("classDetailsSection");
const classTeacherDetails = document.getElementById("classTeacherDetails");
const classStudentsDetails = document.getElementById("classStudentsDetails");
const attendanceReportSummary = document.getElementById(
  "attendanceReportSummary",
);
const attendanceReportList = document.getElementById("attendanceReportList");
const attendanceStream = document.getElementById("attendanceStream");
const termReportSummary = document.getElementById("termReportSummary");
const termReportList = document.getElementById("termReportList");
const pendingApprovalsList = document.getElementById("pendingApprovalsList");
const pendingApprovalsBadge = document.getElementById("pendingApprovalsBadge");
const termStream = document.getElementById("termStream");
const loadAttendanceReportButton = document.getElementById(
  "loadAttendanceReport",
);
const loadTermReportButton = document.getElementById("loadTermReport");
const downloadAttendanceReportButton = document.getElementById(
  "downloadAttendanceReport",
);
const downloadTermReportButton = document.getElementById("downloadTermReport");
const attendanceReportCard = document.getElementById("attendanceReportCard");
const termReportCard = document.getElementById("termReportCard");
const loadSubjectPlansButton = document.getElementById("loadSubjectPlans");
const subjectPlansBoard = document.getElementById("subjectPlansBoard");
const sidebarGreeting = document.getElementById("sidebarGreeting");
const tabButtons = Array.from(document.querySelectorAll(".admin-tab"));
const panels = Array.from(document.querySelectorAll(".admin-panel"));

let teacherCache = [];
let currentAttendanceData = null;
let currentTermData = null;
let currentTermFilter = null;
let availableClassesForReports = [];
let availableClassesForClassDetails = [];

function getToken() {
  return localStorage.getItem("sureki_token");
}

async function apiFetch(url, options = {}) {
  const token = getToken();
  if (!token) {
    throw new Error("Admin authentication required.");
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
      // If token is missing/expired or belongs to a non-admin user, force re-login.
      localStorage.removeItem("sureki_token");
      window.location.href = "/index.html";
      throw new Error(
        "Admin access required. Please login with an admin account.",
      );
    }

    const message =
      payload && typeof payload === "object" && payload.error
        ? payload.error
        : "Request failed.";
    throw new Error(message);
  }

  return payload;
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "flex";
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "none";
  }
}

function setYearToCurrentYear(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    input.value = new Date().getFullYear();
  }
}

function setToday(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    input.valueAsDate = new Date();
  }
}

function setSelectOptions(selectElement, placeholder, options) {
  selectElement.innerHTML = "";
  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = placeholder;
  selectElement.appendChild(placeholderOption);
  options.forEach((option) => {
    const optionElement = document.createElement("option");
    optionElement.value = option.value;
    optionElement.textContent = option.label;
    selectElement.appendChild(optionElement);
  });
}

function formatDateYmd(value) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function renderDetailedList(container, items, emptyMessage, formatter) {
  if (!container) {
    return;
  }

  container.innerHTML = "";
  if (!items || items.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.textContent = emptyMessage;
    container.appendChild(emptyItem);
    return;
  }

  items.forEach((item) => {
    const listItem = document.createElement("li");
    listItem.className = "detail-list-item";

    const lines = formatter(item) || [];
    lines.forEach((line) => {
      const row = document.createElement("div");
      row.className = "detail-line";

      const label = document.createElement("strong");
      label.className = "detail-label";
      label.textContent = `${line.label}: `;

      const value = document.createElement("span");
      value.className = "detail-value";
      value.textContent = line.value;

      row.appendChild(label);
      row.appendChild(value);
      listItem.appendChild(row);
    });

    container.appendChild(listItem);
  });
}

async function removeClass(classId, classLabel) {
  const confirmed = window.confirm(
    `Remove ${classLabel}? This will delete the class and its attendance and term-test records.`,
  );

  if (!confirmed) {
    return;
  }

  await apiFetch(`${ADMIN_CLASSES_API}/${encodeURIComponent(classId)}`, {
    method: "DELETE",
  });

  await Promise.all([
    loadClasses(),
    loadTeachers(),
    typeof loadAvailableClasses === "function"
      ? loadAvailableClasses()
      : Promise.resolve(),
  ]);
}

function updateReportClassOptions(
  gradeSelectId,
  streamSelectId,
  classSelectId,
  classesData,
) {
  const gradeSelect = document.getElementById(gradeSelectId);
  const streamSelect = document.getElementById(streamSelectId);
  const classSelect = document.getElementById(classSelectId);

  if (!gradeSelect || !classSelect) return;

  const grades = [...new Set(classesData.map((item) => item.grade))].sort(
    (a, b) => a - b,
  );

  setSelectOptions(
    gradeSelect,
    grades.length > 0 ? "Select Grade" : "No grades available",
    grades.map((grade) => ({
      value: String(grade),
      label: `Grade ${grade}`,
    })),
  );

  setSelectOptions(classSelect, "Select Class", []);

  if (streamSelect) {
    setStreamSelectState(streamSelect, null);
  }

  gradeSelect.addEventListener("change", () => {
    const selectedGrade = Number(gradeSelect.value);
    if (!Number.isInteger(selectedGrade)) {
      if (streamSelect) {
        setStreamSelectState(streamSelect, null);
      }
      setSelectOptions(classSelect, "Select Class", []);
      return;
    }

    if (streamSelect) {
      setStreamSelectState(streamSelect, selectedGrade);
    }

    const selectedStream = streamSelect ? streamSelect.value : "";
    if (isStreamGrade(selectedGrade) && !selectedStream) {
      setSelectOptions(classSelect, "Select Stream first", []);
      return;
    }

    const sections = [
      ...new Set(
        filterClassesByGradeAndStream(
          classesData,
          selectedGrade,
          selectedStream,
        ).map((item) => item.section),
      ),
    ].sort();

    setSelectOptions(
      classSelect,
      sections.length > 0 ? "Select Class" : "No classes available",
      sections.map((section) => ({
        value: section,
        label: `Class ${section}`,
      })),
    );
  });

  if (streamSelect) {
    streamSelect.addEventListener("change", () => {
      const selectedGrade = Number(gradeSelect.value);
      if (!Number.isInteger(selectedGrade)) {
        setSelectOptions(classSelect, "Select Class", []);
        return;
      }

      const selectedStream = streamSelect.value;
      if (isStreamGrade(selectedGrade) && !selectedStream) {
        setSelectOptions(classSelect, "Select Stream first", []);
        return;
      }

      const sections = [
        ...new Set(
          filterClassesByGradeAndStream(
            classesData,
            selectedGrade,
            selectedStream,
          ).map((item) => item.section),
        ),
      ].sort();

      setSelectOptions(
        classSelect,
        sections.length > 0 ? "Select Class" : "No classes available",
        sections.map((section) => ({
          value: section,
          label: `Class ${section}`,
        })),
      );
    });
  }
}

function downloadCsv(filename, data) {
  const blob = new Blob([data], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function buildAttendanceCsv(records) {
  let csv = "Student Name,Status,Class,Date,Teacher Name,Student Code\n";
  records.forEach((record) => {
    const row = [
      record.student_name,
      record.status,
      formatClassLabel(record),
      record.attendance_date,
      record.teacher_name,
      record.student_code || "",
    ];
    csv +=
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",") +
      "\n";
  });
  return csv;
}

function buildTermTestCsv(records) {
  let csv = "Student Name,Subject,Term,Mark,Class,Date\n";
  records.forEach((record) => {
    const row = [
      record.student_name,
      record.subject_name,
      record.term,
      record.mark,
      formatClassLabel(record),
      record.exam_date,
    ];
    csv +=
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",") +
      "\n";
  });
  return csv;
}

function setActiveTab(tabName) {
  tabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tab === tabName);
  });

  panels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === tabName);
  });
}

function scrollToTabPanel(tabName) {
  const panel = document.querySelector(`.admin-panel[data-panel="${tabName}"]`);
  if (!panel) {
    return;
  }

  requestAnimationFrame(() => {
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function activateSidebarTab(tabName, options = {}) {
  if (!tabName) {
    return;
  }

  setActiveTab(tabName);

  if (options.updateHash) {
    history.replaceState(null, "", `#${tabName}`);
  }

  if (options.scroll !== false) {
    scrollToTabPanel(tabName);
  }
}

function updateSidebarGreetingByTime() {
  if (!sidebarGreeting) {
    return;
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : "Good evening";
  sidebarGreeting.textContent = greeting;
}

function renderTeacherSummary(teachers, absentCount) {
  if (teacherCount) {
    teacherCount.textContent = String(teachers.length);
  }

  if (absentTeacherCount) {
    absentTeacherCount.textContent = String(absentCount);
  }

  if (teacherSummary) {
    teacherSummary.innerHTML = "";
    if (teachers.length === 0) {
      const emptyState = document.createElement("span");
      emptyState.className = "empty-state";
      emptyState.textContent = "No teachers registered yet.";
      teacherSummary.appendChild(emptyState);
    } else {
      teachers.forEach((teacher) => {
        const chip = document.createElement("span");
        chip.className = "teacher-chip";
        chip.textContent = teacher.full_name;
        teacherSummary.appendChild(chip);
      });
    }
  }

  if (alertRecipientList) {
    alertRecipientList.innerHTML = "";
    if (teachers.length === 0) {
      const emptyItem = document.createElement("li");
      emptyItem.textContent = "No teachers available for alerts.";
      alertRecipientList.appendChild(emptyItem);
    } else {
      teachers.forEach((teacher) => {
        const item = document.createElement("li");
        item.textContent = `${teacher.full_name} - ${teacher.email || teacher.teacher_code}`;
        alertRecipientList.appendChild(item);
      });
    }
  }
}

function renderSummaryCards(container, summary) {
  if (!container) {
    return;
  }

  container.innerHTML = "";
  Object.entries(summary).forEach(([label, value]) => {
    const card = document.createElement("div");
    card.className = "report-stat";
    const title = document.createElement("span");
    title.textContent = label;
    const result = document.createElement("strong");
    result.textContent = value ?? "0";
    card.appendChild(title);
    card.appendChild(result);
    container.appendChild(card);
  });
}

function renderList(container, items, emptyMessage, formatter) {
  if (!container) {
    return;
  }

  container.innerHTML = "";
  if (!items || items.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.textContent = emptyMessage;
    container.appendChild(emptyItem);
    return;
  }

  items.forEach((item) => {
    const listItem = document.createElement("li");
    listItem.textContent = formatter(item);
    container.appendChild(listItem);
  });
}

function buildTermMarksMatrix(records) {
  const subjects = [];
  const subjectSet = new Set();
  const studentsByKey = new Map();

  (records || []).forEach((record) => {
    const subjectName = String(record.subject_name || "").trim();
    if (subjectName && !subjectSet.has(subjectName)) {
      subjectSet.add(subjectName);
      subjects.push(subjectName);
    }

    const studentKey = `${record.student_id || ""}::${record.student_code || ""}::${record.student_name || ""}`;
    if (!studentsByKey.has(studentKey)) {
      studentsByKey.set(studentKey, {
        student_name: record.student_name || "N/A",
        student_code: record.student_code || "",
        marks: {},
      });
    }

    studentsByKey.get(studentKey).marks[subjectName] = record.mark;
  });

  const students = Array.from(studentsByKey.values()).sort((left, right) =>
    String(left.student_name || "").localeCompare(
      String(right.student_name || ""),
    ),
  );

  return { subjects, students };
}

function renderTermMarksTable(container, records, emptyMessage) {
  if (!container) {
    return;
  }

  container.innerHTML = "";

  if (!records || records.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = emptyMessage;
    container.appendChild(emptyState);
    return;
  }

  const { subjects, students } = buildTermMarksMatrix(records);
  const tableWrap = document.createElement("div");
  tableWrap.className = "table-responsive";

  const table = document.createElement("table");
  table.className = "term-marks-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");

  ["Student Name", "Student Code", ...subjects].forEach((label) => {
    const th = document.createElement("th");
    th.textContent = label;
    headRow.appendChild(th);
  });

  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  students.forEach((student) => {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.textContent = student.student_name;
    row.appendChild(nameCell);

    const codeCell = document.createElement("td");
    codeCell.textContent = student.student_code || "-";
    row.appendChild(codeCell);

    subjects.forEach((subjectName) => {
      const td = document.createElement("td");
      const mark = student.marks[subjectName];
      td.textContent = Number.isFinite(Number(mark)) ? String(mark) : "-";
      row.appendChild(td);
    });

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  tableWrap.appendChild(table);
  container.appendChild(tableWrap);
}

function setActiveReportCard(activeReport) {
  if (attendanceReportCard) {
    attendanceReportCard.classList.toggle(
      "is-hidden",
      activeReport !== "attendance",
    );
  }

  if (termReportCard) {
    termReportCard.classList.toggle("is-hidden", activeReport !== "term");
  }
}

function updatePendingApprovalsBadge(count) {
  if (!pendingApprovalsBadge) {
    return;
  }

  const safeCount = Math.max(0, Number(count) || 0);
  pendingApprovalsBadge.textContent = String(safeCount);
  pendingApprovalsBadge.style.display = safeCount > 0 ? "inline-flex" : "none";
}

function renderPendingTermReviews(
  container,
  items,
  emptyMessage,
  onReview,
  onApprove,
) {
  if (!container) {
    return;
  }

  container.innerHTML = "";
  if (!items || items.length === 0) {
    const emptyItem = document.createElement("div");
    emptyItem.className = "result-list-empty";
    emptyItem.textContent = emptyMessage;
    container.appendChild(emptyItem);
    return;
  }

  const tableWrapper = document.createElement("div");
  tableWrapper.className = "table-responsive";

  const table = document.createElement("table");
  table.className = "term-marks-table pending-approvals-table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["Year", "Grade", "Class", "Term", "Actions"].forEach((columnName) => {
    const th = document.createElement("th");
    th.textContent = columnName;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  items.forEach((item) => {
    const row = document.createElement("tr");

    const classInfo = item.class_info || {};
    const className =
      String(classInfo.section || classInfo.stream || "-").trim() || "-";

    const yearCell = document.createElement("td");
    yearCell.textContent = String(item.academic_year || "-");
    row.appendChild(yearCell);

    const gradeCell = document.createElement("td");
    gradeCell.textContent = classInfo.grade ? `Grade ${classInfo.grade}` : "-";
    row.appendChild(gradeCell);

    const classCell = document.createElement("td");
    classCell.textContent = className;
    row.appendChild(classCell);

    const termCell = document.createElement("td");
    termCell.textContent = `Term ${item.term}`;
    row.appendChild(termCell);

    const actionWrap = document.createElement("div");
    actionWrap.style.display = "inline-flex";
    actionWrap.style.flexWrap = "nowrap";
    actionWrap.style.gap = "0.4rem";
    actionWrap.style.alignItems = "center";
    actionWrap.style.whiteSpace = "nowrap";

    const reviewButton = document.createElement("button");
    reviewButton.type = "button";
    reviewButton.className = "btn btn-secondary pending-action-button";
    reviewButton.textContent = "Review";
    reviewButton.addEventListener("click", () => onReview(item, reviewButton));
    actionWrap.appendChild(reviewButton);

    const approveButton = document.createElement("button");
    approveButton.type = "button";
    approveButton.className = "btn btn-primary pending-action-button";
    approveButton.textContent = "Approve";
    approveButton.addEventListener("click", () =>
      onApprove(item, approveButton),
    );
    actionWrap.appendChild(approveButton);

    const actionsCell = document.createElement("td");
    actionsCell.style.verticalAlign = "middle";
    actionsCell.style.textAlign = "center";
    actionsCell.appendChild(actionWrap);
    row.appendChild(actionsCell);

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  tableWrapper.appendChild(table);
  container.appendChild(tableWrapper);
}

function renderPendingApprovalsWidget(data) {
  renderPendingTermReviews(
    pendingApprovalsList,
    data.pending_reviews || [],
    "No pending term approvals.",
    (review) => {
      if (!review?.class_id || !review?.term || !review?.academic_year) {
        alert("Review record is incomplete.");
        return;
      }

      const reviewUrl = new URL(
        "/admin/term-approval-review.html",
        window.location.origin,
      );
      reviewUrl.searchParams.set("class_id", review.class_id);
      reviewUrl.searchParams.set("term", review.term);
      reviewUrl.searchParams.set("academic_year", review.academic_year);
      window.open(reviewUrl.toString(), "_blank", "noopener,noreferrer");
    },
    async (review, button) => {
      if (!review?.class_id || !review?.term || !review?.academic_year) {
        alert("Approval record is incomplete.");
        return;
      }

      const originalText = button.textContent;
      button.disabled = true;
      button.textContent = "Approving...";

      try {
        await apiFetch(TERM_MARKS_APPROVE_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            class_id: review.class_id,
            term: review.term,
            academic_year: review.academic_year,
          }),
        });

        await loadPendingTermApprovals();
        alert("Term marks approved and parent SMS processed.");
      } catch (error) {
        console.error("Approve term marks failed:", error);
        alert(error.message || "Failed to approve term marks.");
      } finally {
        button.disabled = false;
        button.textContent = originalText;
      }
    },
  );
}

function formatSubjectGroups(groups) {
  if (!groups || groups.length === 0) {
    return "None";
  }

  return groups
    .map((group) => `${group.label}: ${group.options.join(", ")}`)
    .join(" | ");
}

function renderSubjectPlans(plans) {
  if (!subjectPlansBoard) {
    return;
  }

  subjectPlansBoard.innerHTML = "";

  if (!plans || plans.length === 0) {
    const empty = document.createElement("div");
    empty.className = "panel-card";
    empty.textContent = "No subject plans available.";
    subjectPlansBoard.appendChild(empty);
    return;
  }

  plans.forEach((plan) => {
    const card = document.createElement("article");
    card.className = "panel-card subject-plan-card subject-plan-card-edit";
    card.style.border = "1px solid #d4dce6";
    card.style.padding = "1rem";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.height = "100%";
    card.style.backgroundColor = "#ffffff";
    card.style.borderRadius = "8px";
    card.dataset.isEditing = "false";

    // Grade/Title at TOP
    const title = document.createElement("h3");
    title.textContent = plan.stream_label
      ? `Grade ${plan.grade} - ${plan.stream_label}`
      : `Grade ${plan.grade}`;
    title.style.textAlign = "center";
    title.style.marginBottom = "0.85rem";
    title.style.marginTop = "0";
    title.style.color = "#10223d";
    title.style.fontSize = "1.15rem";
    title.style.fontWeight = "700";

    // Store field data for toggling modes
    const fieldsData = {
      fixed_subjects: (plan.fixed_subjects || "").join
        ? plan.fixed_subjects.join(", ")
        : plan.fixed_subjects || "",
      elective_category_1_options: plan.elective_category_1_options || "",
      elective_category_2_options: plan.elective_category_2_options || "",
      elective_category_3_options: plan.elective_category_3_options || "",
    };

    // Create input fields (hidden by default)
    const inputs = {};
    const createInputField = (key, label, placeholder) => {
      const labelEl = document.createElement("label");
      labelEl.style.display = "block";
      labelEl.style.marginBottom = "0.25rem";
      labelEl.style.fontSize = "0.8rem";
      labelEl.style.color = "#5a6c7d";
      labelEl.style.fontWeight = "600";
      labelEl.innerHTML = `${label}:`;

      const textarea = document.createElement("textarea");
      textarea.className = "admin-input";
      textarea.value = fieldsData[key];
      textarea.placeholder = placeholder;
      textarea.style.width = "100%";
      textarea.style.marginBottom = "0.6rem";
      textarea.style.fontSize = "0.75rem";
      textarea.style.padding = "0.4rem 0.6rem";
      textarea.style.border = "1px solid #d4dce6";
      textarea.style.borderRadius = "4px";
      textarea.style.minHeight = "45px";
      textarea.style.fontFamily = "inherit";
      textarea.style.resize = "vertical";
      textarea.dataset.field = key;
      textarea.disabled = true;

      inputs[key] = { labelEl, textarea };
      return { labelEl, textarea };
    };

    // Create all input fields
    createInputField(
      "fixed_subjects",
      "Mandatory Subjects",
      "e.g., Mathematics, Environment, English",
    );
    createInputField(
      "elective_category_1_options",
      "Elective Category 1 (Leave empty to remove)",
      "e.g., ICT, Health and Physical Education",
    );
    createInputField(
      "elective_category_2_options",
      "Elective Category 2 (Leave empty to remove)",
      "e.g., Music, Arts, Dancing",
    );
    createInputField(
      "elective_category_3_options",
      "Elective Category 3 (Leave empty to remove)",
      "e.g., Geography, Tamil, Human Studies",
    );

    // Add title to top
    card.appendChild(title);

    // Create DISPLAY section function (organized)
    const createDisplaySection = () => {
      const section = document.createElement("div");

      const mandatoryHeading = document.createElement("h4");
      mandatoryHeading.textContent = "📚 Mandatory Subjects";
      mandatoryHeading.style.fontSize = "0.75rem";
      mandatoryHeading.style.color = "#10223d";
      mandatoryHeading.style.marginBottom = "0.15rem";
      mandatoryHeading.style.marginTop = "0.25rem";
      mandatoryHeading.style.fontWeight = "700";
      section.appendChild(mandatoryHeading);

      const fixedLabel = document.createElement("p");
      fixedLabel.style.margin = "0 0 0.15rem 0";
      fixedLabel.style.fontSize = "0.7rem";
      fixedLabel.style.color = "#666";
      fixedLabel.innerHTML = "<strong>Fixed:</strong>";
      section.appendChild(fixedLabel);

      const fixedValue = document.createElement("p");
      fixedValue.style.margin = "0 0 0.4rem 0";
      fixedValue.style.fontSize = "0.7rem";
      fixedValue.style.color = "#2d3e50";
      fixedValue.style.lineHeight = "1.3";
      fixedValue.textContent = fieldsData.fixed_subjects || "(Not set)";
      section.appendChild(fixedValue);

      // Electives
      const electiveHeading = document.createElement("h4");
      electiveHeading.textContent = "✨ Electives";
      electiveHeading.style.fontSize = "0.75rem";
      electiveHeading.style.color = "#10223d";
      electiveHeading.style.marginBottom = "0.15rem";
      electiveHeading.style.marginTop = "0.25rem";
      electiveHeading.style.fontWeight = "700";
      section.appendChild(electiveHeading);

      let hasElectives = false;
      for (let i = 1; i <= 3; i++) {
        const key = `elective_category_${i}_options`;
        const val = fieldsData[key];
        if (val) {
          const categoryContainer = document.createElement("div");
          categoryContainer.style.display = "flex";
          categoryContainer.style.justifyContent = "space-between";
          categoryContainer.style.alignItems = "flex-start";
          categoryContainer.style.marginBottom = "0.1rem";

          const categoryText = document.createElement("span");
          categoryText.style.fontSize = "0.7rem";
          categoryText.style.color = "#2d3e50";
          categoryText.innerHTML = `<strong>C${i}:</strong> ${val}`;
          categoryContainer.appendChild(categoryText);

          const removeBtn = document.createElement("button");
          removeBtn.type = "button";
          removeBtn.textContent = "✕";
          removeBtn.style.padding = "0px 4px";
          removeBtn.style.fontSize = "0.65rem";
          removeBtn.style.color = "#d32f2f";
          removeBtn.style.backgroundColor = "transparent";
          removeBtn.style.border = "none";
          removeBtn.style.cursor = "pointer";
          removeBtn.style.fontWeight = "bold";
          removeBtn.title = `Remove Category ${i}`;
          removeBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            if (confirm(`Remove Category ${i} from Grade ${plan.grade}?`)) {
              inputs[key].textarea.value = "";
              await saveSubjectPlan(plan.grade, plan.stream || "", {
                fixed_subjects: inputs.fixed_subjects.textarea.value.trim(),
                elective_category_1_options:
                  key === "elective_category_1_options"
                    ? ""
                    : inputs.elective_category_1_options.textarea.value.trim(),
                elective_category_2_options:
                  key === "elective_category_2_options"
                    ? ""
                    : inputs.elective_category_2_options.textarea.value.trim(),
                elective_category_3_options:
                  key === "elective_category_3_options"
                    ? ""
                    : inputs.elective_category_3_options.textarea.value.trim(),
              });
              toggleEditMode(false);
            }
          });
          categoryContainer.appendChild(removeBtn);

          section.appendChild(categoryContainer);
          hasElectives = true;
        }
      }
      if (!hasElectives) {
        const noElec = document.createElement("p");
        noElec.style.margin = "0 0 0.4rem 0";
        noElec.style.fontSize = "0.7rem";
        noElec.style.color = "#999";
        noElec.style.fontStyle = "italic";
        noElec.textContent = "(No electives)";
        section.appendChild(noElec);
      }

      return section;
    };

    // Create middle content section (grows to fill space)
    const contentDiv = document.createElement("div");
    contentDiv.style.flex = "1";
    contentDiv.style.overflowY = "auto";
    contentDiv.style.maxHeight = "180px";
    contentDiv.style.paddingRight = "0.25rem";

    // Add organized display section
    const displaySection = createDisplaySection();
    contentDiv.appendChild(displaySection);

    // Create edit mode inputs container (hidden initially)
    const editInputsDiv = document.createElement("div");
    editInputsDiv.style.display = "none";

    // Add enhanced category management UI in edit mode
    const categoryActionsContainer = document.createElement("div");
    categoryActionsContainer.style.display = "none";
    categoryActionsContainer.style.marginTop = "0.5rem";
    categoryActionsContainer.style.paddingTop = "0.5rem";
    categoryActionsContainer.style.borderTop = "1px solid #e0e0e0";
    categoryActionsContainer.style.display = "none"; // Will be shown in edit mode

    const createCategoryBtn = document.createElement("button");
    createCategoryBtn.type = "button";
    createCategoryBtn.textContent = "➕ Add Empty Category";
    createCategoryBtn.style.width = "100%";
    createCategoryBtn.style.padding = "0.4rem 0.6rem";
    createCategoryBtn.style.fontSize = "0.8rem";
    createCategoryBtn.style.fontWeight = "500";
    createCategoryBtn.style.color = "#10223d";
    createCategoryBtn.style.backgroundColor = "#e8f0f7";
    createCategoryBtn.style.border = "1px solid #b3d4e8";
    createCategoryBtn.style.borderRadius = "4px";
    createCategoryBtn.style.cursor = "pointer";
    createCategoryBtn.style.marginBottom = "0.4rem";
    createCategoryBtn.addEventListener("click", () => {
      // Find first empty category and focus on it
      for (let i = 1; i <= 3; i++) {
        const key = `elective_category_${i}_options`;
        const textarea = inputs[key]?.textarea;
        if (textarea && !textarea.value.trim()) {
          textarea.focus();
          textarea.style.border = "2px solid #10223d";
          setTimeout(() => {
            textarea.style.border = "1px solid #d4dce6";
          }, 2000);
          break;
        }
      }
    });
    categoryActionsContainer.appendChild(createCategoryBtn);
    editInputsDiv.appendChild(categoryActionsContainer);

    Object.values(inputs).forEach(({ labelEl, textarea }) => {
      editInputsDiv.appendChild(labelEl);
      editInputsDiv.appendChild(textarea);

      // Add clear button for each textarea
      const clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.textContent = "✕ Clear";
      clearBtn.style.width = "100%";
      clearBtn.style.padding = "0.3rem 0.5rem";
      clearBtn.style.fontSize = "0.75rem";
      clearBtn.style.color = "#d32f2f";
      clearBtn.style.backgroundColor = "#ffebee";
      clearBtn.style.border = "1px solid #ffcdd2";
      clearBtn.style.borderRadius = "3px";
      clearBtn.style.cursor = "pointer";
      clearBtn.style.marginBottom = "0.5rem";
      clearBtn.addEventListener("click", (e) => {
        e.preventDefault();
        textarea.value = "";
        textarea.style.backgroundColor = "#fff9e6";
        setTimeout(() => {
          textarea.style.backgroundColor = "white";
        }, 300);
      });
      editInputsDiv.appendChild(clearBtn);
    });
    contentDiv.appendChild(editInputsDiv);

    card.appendChild(contentDiv);

    // Create button container at BOTTOM with full-width edit button
    const bottomDiv = document.createElement("div");
    bottomDiv.style.marginTop = "auto";
    bottomDiv.style.paddingTop = "0.75rem";
    bottomDiv.style.display = "flex";
    bottomDiv.style.flexDirection = "column";
    bottomDiv.style.gap = "0.75rem";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.textContent = "✏️ Edit";
    editBtn.style.width = "100%";
    editBtn.style.padding = "0.58rem 0.8rem";
    editBtn.style.fontSize = "0.95rem";
    editBtn.style.fontWeight = "600";
    editBtn.style.color = "white";
    editBtn.style.backgroundColor = "#10223d";
    editBtn.style.border = "none";
    editBtn.style.borderRadius = "6px";
    editBtn.style.cursor = "pointer";
    editBtn.style.transition = "background-color 0.2s";
    editBtn.addEventListener("mouseover", () => {
      editBtn.style.backgroundColor = "#0a1620";
    });
    editBtn.addEventListener("mouseout", () => {
      editBtn.style.backgroundColor = "#10223d";
    });

    bottomDiv.appendChild(editBtn);
    card.appendChild(bottomDiv);

    // Create save/cancel button container (hidden initially)
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "none";
    buttonContainer.style.marginTop = "auto";
    buttonContainer.style.paddingTop = "0.75rem";
    buttonContainer.style.flexDirection = "column";
    buttonContainer.style.gap = "0.75rem";

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.textContent = "Save";
    saveBtn.style.width = "100%";
    saveBtn.style.padding = "0.58rem 0.8rem";
    saveBtn.style.fontSize = "0.95rem";
    saveBtn.style.fontWeight = "600";
    saveBtn.style.color = "white";
    saveBtn.style.backgroundColor = "#10223d";
    saveBtn.style.border = "none";
    saveBtn.style.borderRadius = "6px";
    saveBtn.style.cursor = "pointer";
    saveBtn.addEventListener("mouseover", () => {
      saveBtn.style.backgroundColor = "#0a1620";
    });
    saveBtn.addEventListener("mouseout", () => {
      saveBtn.style.backgroundColor = "#10223d";
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.width = "100%";
    cancelBtn.style.padding = "0.58rem 0.8rem";
    cancelBtn.style.fontSize = "0.95rem";
    cancelBtn.style.fontWeight = "600";
    cancelBtn.style.color = "#333";
    cancelBtn.style.backgroundColor = "#f0f0f0";
    cancelBtn.style.border = "1px solid #ddd";
    cancelBtn.style.borderRadius = "6px";
    cancelBtn.style.cursor = "pointer";
    cancelBtn.addEventListener("mouseover", () => {
      cancelBtn.style.backgroundColor = "#e0e0e0";
    });
    cancelBtn.addEventListener("mouseout", () => {
      cancelBtn.style.backgroundColor = "#f0f0f0";
    });

    buttonContainer.appendChild(saveBtn);
    buttonContainer.appendChild(cancelBtn);
    card.appendChild(buttonContainer);

    // Function to toggle edit mode
    const toggleEditMode = (isEditing) => {
      card.dataset.isEditing = isEditing ? "true" : "false";

      // Toggle display section visibility
      displaySection.style.display = isEditing ? "none" : "block";

      // Toggle input fields visibility
      editInputsDiv.style.display = isEditing ? "block" : "none";

      // Show category actions in edit mode
      if (categoryActionsContainer) {
        categoryActionsContainer.style.display = isEditing ? "block" : "none";
      }

      // Toggle input field disabled state
      Object.values(inputs).forEach(({ textarea }) => {
        textarea.disabled = !isEditing;
      });

      // Toggle buttons
      bottomDiv.style.display = isEditing ? "none" : "flex";
      buttonContainer.style.display = isEditing ? "flex" : "none";
    };

    // Edit button handler
    editBtn.addEventListener("click", () => {
      toggleEditMode(true);
    });

    // Cancel button handler
    cancelBtn.addEventListener("click", () => {
      // Reset inputs to original values
      Object.entries(fieldsData).forEach(([key, value]) => {
        if (inputs[key]) {
          inputs[key].textarea.value = value;
        }
      });
      toggleEditMode(false);
    });

    // Save button handler
    saveBtn.addEventListener("click", async () => {
      const updatedData = {};
      Object.keys(inputs).forEach((key) => {
        updatedData[key] = inputs[key].textarea.value.trim();
      });

      await saveSubjectPlan(plan.grade, plan.stream || "", updatedData);
      toggleEditMode(false);
    });

    subjectPlansBoard.appendChild(card);
  });
}

async function saveSubjectPlan(grade, stream, planData) {
  try {
    const response = await apiFetch(SUBJECT_PLANS_API, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grade,
        stream,
        plan: planData,
      }),
    });

    if (response.success) {
      alert("Subject plan saved successfully!");
      await loadSubjectPlans();
    } else {
      alert(`Failed to save: ${response.error || response.message}`);
    }
  } catch (error) {
    console.error("Error saving subject plan:", error);
    alert(`Error: ${error.message}`);
  }
}

function setClassDetailsGradeOptions(selectedYear) {
  if (!classDetailsGrade || !classDetailsSection) {
    return;
  }

  if (!selectedYear) {
    setSelectOptions(classDetailsGrade, "Select Grade", []);
    if (classDetailsStream) {
      setStreamSelectState(classDetailsStream, null);
    }
    setSelectOptions(classDetailsSection, "Select Class", []);
    return;
  }

  const grades = [
    ...new Set(
      availableClassesForClassDetails
        .filter((item) => Number(item.academic_year) === Number(selectedYear))
        .map((item) => Number(item.grade)),
    ),
  ].sort((a, b) => a - b);

  setSelectOptions(
    classDetailsGrade,
    grades.length > 0 ? "Select Grade" : "No grades available",
    grades.map((grade) => ({
      value: String(grade),
      label: `Grade ${grade}`,
    })),
  );
  if (classDetailsStream) {
    setStreamSelectState(classDetailsStream, null);
  }
  setSelectOptions(classDetailsSection, "Select Class", []);
}

function setClassDetailsStreamOptions(selectedGrade) {
  if (!classDetailsStream) {
    return;
  }

  setStreamSelectState(classDetailsStream, selectedGrade);
}

function setClassDetailsSectionOptions(selectedYear, selectedGrade) {
  if (!classDetailsSection) {
    return;
  }

  const selectedStream = classDetailsStream ? classDetailsStream.value : "";

  if (!selectedYear || !selectedGrade) {
    setSelectOptions(classDetailsSection, "Select Class", []);
    return;
  }

  if (isStreamGrade(selectedGrade) && !selectedStream) {
    setSelectOptions(classDetailsSection, "Select Stream first", []);
    return;
  }

  const sections = [
    ...new Set(
      filterClassesByGradeAndStream(
        availableClassesForClassDetails.filter(
          (item) => Number(item.academic_year) === Number(selectedYear),
        ),
        selectedGrade,
        selectedStream,
      ).map((item) => item.section),
    ),
  ].sort();

  setSelectOptions(
    classDetailsSection,
    sections.length > 0 ? "Select Class" : "No classes available",
    sections.map((section) => ({
      value: section,
      label: `Class ${section}`,
    })),
  );
}

async function initializeClassDetailsFilters() {
  if (!classDetailsYear || !classDetailsGrade || !classDetailsSection) {
    return;
  }

  const data = await apiFetch(ADMIN_CLASSES_API);
  availableClassesForClassDetails = data.classes || [];

  const years = [
    ...new Set(
      availableClassesForClassDetails.map((item) => Number(item.academic_year)),
    ),
  ].sort((a, b) => b - a);

  setSelectOptions(
    classDetailsYear,
    years.length > 0 ? "Select Year" : "No years available",
    years.map((year) => ({
      value: String(year),
      label: String(year),
    })),
  );
  setSelectOptions(classDetailsGrade, "Select Grade", []);
  setSelectOptions(classDetailsSection, "Select Class", []);
  if (classDetailsStream) {
    setStreamSelectState(classDetailsStream, null);
  }

  classDetailsYear.addEventListener("change", () => {
    setClassDetailsGradeOptions(classDetailsYear.value);
  });

  classDetailsGrade.addEventListener("change", () => {
    setClassDetailsStreamOptions(classDetailsGrade.value);
    setClassDetailsSectionOptions(
      classDetailsYear.value,
      classDetailsGrade.value,
    );
  });

  if (classDetailsStream) {
    classDetailsStream.addEventListener("change", () => {
      setClassDetailsSectionOptions(
        classDetailsYear.value,
        classDetailsGrade.value,
      );
    });
  }
}

async function loadSelectedClassDetails() {
  if (
    !classDetailsYear ||
    !classDetailsGrade ||
    !classDetailsSection ||
    !classTeacherDetails ||
    !classStudentsDetails
  ) {
    return;
  }

  const year = classDetailsYear.value;
  const grade = classDetailsGrade.value;
  const stream = classDetailsStream ? classDetailsStream.value : "";
  const section = classDetailsSection.value;
  const numericGrade = Number(grade);
  const requiresSection = !isStreamGrade(numericGrade);

  if (!year || !grade || (requiresSection && !section)) {
    alert(
      requiresSection
        ? "Please select year, grade, and class."
        : "Please select year, grade, and stream.",
    );
    return;
  }

  const data = await apiFetch(
    `${ADMIN_CLASS_DETAILS_API}?year=${encodeURIComponent(year)}&grade=${encodeURIComponent(grade)}&class=${encodeURIComponent(section)}&stream=${encodeURIComponent(stream)}`,
  );

  renderDetailedList(
    classTeacherDetails,
    [data.class],
    "No class teacher assigned.",
    (classInfo) => {
      if (!classInfo.teacher_name) {
        return [
          {
            label: "Class",
            value: `${formatClassLabel(classInfo)} (${classInfo.academic_year})`,
          },
          {
            label: "Teacher",
            value: "Not assigned",
          },
        ];
      }

      return [
        {
          label: "Class",
          value: `${formatClassLabel(classInfo)} (${classInfo.academic_year})`,
        },
        {
          label: "Teacher",
          value: classInfo.teacher_name,
        },
        {
          label: "Email",
          value: classInfo.teacher_email || "N/A",
        },
        {
          label: "Phone",
          value: classInfo.teacher_phone || "N/A",
        },
      ];
    },
  );

  renderDetailedList(
    classStudentsDetails,
    data.students || [],
    "No active students found in this class.",
    (student) => {
      return [
        {
          label: "Student",
          value: student.full_name,
        },
        {
          label: "Parent",
          value: student.parent_name,
        },
        {
          label: "Parent Phone",
          value: student.parent_phone || "N/A",
        },
        {
          label: "Parent Email",
          value: student.parent_email || "N/A",
        },
        {
          label: "Assigned Date",
          value: formatDateYmd(student.assigned_at),
        },
        {
          label: "Registered Date",
          value: formatDateYmd(student.created_at),
        },
      ];
    },
  );
}

async function loadTeachers() {
  const data = await apiFetch(ADMIN_TEACHERS_API);
  teacherCache = data.teachers || [];
  renderTeacherSummary(teacherCache, Number(data.absent_count || 0));
}

async function loadDashboardMetrics() {
  try {
    const data = await apiFetch("/api/admin/dashboard");
    console.log("Dashboard metrics response:", data);
    const metrics = data.data || {};
    console.log("Extracted metrics:", metrics);

    const attendanceRate = Number(metrics.today_attendance_rate || 0);
    const attendanceRateLabel = `${attendanceRate.toFixed(1)}%`;

    if (studentCount) {
      const count = Number(metrics.total_students || 0);
      console.log("Setting student count to:", count);
      studentCount.textContent = String(count);
    } else {
      console.warn("studentCount element not found");
    }

    if (teacherCount) {
      teacherCount.textContent = String(metrics.total_teachers || 0);
    }

    if (presentCount) {
      presentCount.textContent = String(metrics.present_count_today || 0);
    }

    if (presentRate) {
      presentRate.textContent = `Attendance rate: ${attendanceRateLabel}`;
    }
  } catch (error) {
    console.error("Failed to load dashboard metrics:", error);
  }
}

async function loadClasses() {
  if (!adminClassesList) {
    return;
  }

  const data = await apiFetch(ADMIN_CLASSES_API);
  const classes = data.classes || [];

  if (classCount) {
    classCount.textContent = String(classes.length);
  }

  adminClassesList.innerHTML = "";
  if (classes.length === 0) {
    const emptyRow = document.createElement("tr");
    const emptyCell = document.createElement("td");
    emptyCell.colSpan = 6;
    emptyCell.textContent = "No classes created yet.";
    emptyRow.appendChild(emptyCell);
    adminClassesList.appendChild(emptyRow);
    return;
  }

  classes.forEach((classItem) => {
    const row = document.createElement("tr");

    const yearCell = document.createElement("td");
    yearCell.textContent = String(classItem.academic_year || "");

    const gradeCell = document.createElement("td");
    gradeCell.textContent = String(classItem.grade || "");

    const classCell = document.createElement("td");
    classCell.textContent = formatClassLabel(classItem);

    const teacherCell = document.createElement("td");
    teacherCell.textContent = classItem.teacher_name || "Not assigned";

    const studentCountCell = document.createElement("td");
    studentCountCell.textContent = String(Number(classItem.student_count || 0));

    const statusCell = document.createElement("td");
    statusCell.className = "teacher-status";

    const statusBadge = document.createElement("span");
    statusBadge.className = `status-badge status-${classItem.is_active ? "active" : "inactive"}`;
    statusBadge.textContent = classItem.is_active ? "Active" : "Not Active";

    statusCell.appendChild(statusBadge);

    row.appendChild(yearCell);
    row.appendChild(gradeCell);
    row.appendChild(classCell);
    row.appendChild(teacherCell);
    row.appendChild(studentCountCell);
    row.appendChild(statusCell);

    adminClassesList.appendChild(row);
  });
}

async function loadAttendanceReport() {
  setActiveReportCard("attendance");

  const data = await apiFetch(ATTENDANCE_REPORT_API);
  const summary = data.summary || {};

  renderSummaryCards(attendanceReportSummary, {
    "Total records": summary.total_records || 0,
    Present: summary.present_count || 0,
    Absent: summary.absent_count || 0,
    Late: summary.late_count || 0,
  });

  renderList(
    attendanceReportList,
    data.recent_records || [],
    "No attendance records found.",
    (record) => {
      return `${record.student_name} - ${record.status} - ${formatClassLabel(record)} by ${record.teacher_name}`;
    },
  );
}

async function loadTermReport() {
  setActiveReportCard("term");

  const data = await apiFetch(TERM_REPORT_API);
  const summary = data.summary || {};

  currentTermData = {
    records: data.recent_records || [],
    summary,
    pending_reviews: data.pending_reviews || [],
    pending_count: data.pending_count || 0,
  };

  renderSummaryCards(termReportSummary, {
    "Total records": summary.total_records || 0,
    "Average mark": summary.average_mark || 0,
    Distinctions: summary.distinction_count || 0,
  });

  renderTermMarksTable(
    termReportList,
    data.recent_records || [],
    "No term-test records found.",
  );
}

async function loadPendingTermApprovals() {
  const data = await apiFetch(TERM_REPORT_API);

  currentTermData = {
    ...(currentTermData || {}),
    pending_reviews: data.pending_reviews || [],
    pending_count: data.pending_count || 0,
  };

  updatePendingApprovalsBadge(data.pending_count || 0);

  renderPendingApprovalsWidget(data);
}

async function loadPendingTermApprovalCount() {
  try {
    const data = await apiFetch(TERM_REPORT_API);
    updatePendingApprovalsBadge(data.pending_count || 0);
  } catch (error) {
    console.error("Load pending term approval count failed:", error);
  }
}

async function loadSubjectPlans() {
  const data = await apiFetch(SUBJECT_PLANS_API);
  renderSubjectPlans(data.data || []);
}

async function loadAttendanceSettings() {
  try {
    const data = await apiFetch(ATTENDANCE_SETTINGS_API, { method: "GET" });
    const settings = data.data || {};

    // Set form values
    const openTimeInput = document.getElementById("attendanceOpenTime");
    const closeTimeInput = document.getElementById("attendanceCloseTime");
    const timezoneInput = document.getElementById("attendanceTimezone");

    if (openTimeInput && settings.open_time) {
      openTimeInput.value = settings.open_time;
    }
    if (closeTimeInput && settings.close_time) {
      closeTimeInput.value = settings.close_time;
    }
    if (timezoneInput && settings.timezone) {
      timezoneInput.value = settings.timezone;
    }

    // Update status display
    updateAttendanceSettingsStatus(settings);
  } catch (error) {
    console.error("Failed to load attendance settings:", error);
  }
}

function updateAttendanceSettingsStatus(settings) {
  const openTime = settings.open_time || "07:30";
  const closeTime = settings.close_time || "09:30";

  const displayOpenTime = document.getElementById("displayOpenTime");
  const displayCloseTime = document.getElementById("displayCloseTime");
  const statusElement = document.getElementById("attendanceWindowStatus");

  if (displayOpenTime) {
    displayOpenTime.textContent = formatTime12Hour(openTime);
  }
  if (displayCloseTime) {
    displayCloseTime.textContent = formatTime12Hour(closeTime);
  }

  // Check if we're within attendance window
  if (statusElement) {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [openHour, openMin] = openTime.split(":").map(Number);
    const [closeHour, closeMin] = closeTime.split(":").map(Number);
    const openTimeInMinutes = openHour * 60 + openMin;
    const closeTimeInMinutes = closeHour * 60 + closeMin;

    if (currentTime >= openTimeInMinutes && currentTime < closeTimeInMinutes) {
      statusElement.style.background = "#dcfce7";
      statusElement.style.color = "#166534";
      statusElement.style.borderLeft = "4px solid #16a34a";
      statusElement.innerHTML = "✓ Attendance window is currently active";
    } else if (currentTime < openTimeInMinutes) {
      statusElement.style.background = "#fef3c7";
      statusElement.style.color = "#92400e";
      statusElement.style.borderLeft = "4px solid #f59e0b";
      statusElement.innerHTML = "⏱ Attendance window has not opened yet";
    } else {
      statusElement.style.background = "#fee2e2";
      statusElement.style.color = "#991b1b";
      statusElement.style.borderLeft = "4px solid #dc2626";
      statusElement.innerHTML = "✕ Attendance window has closed for today";
    }
  }
}

function formatTime12Hour(time24) {
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${String(displayHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
}

if (adminClassForm) {
  const gradeInput = adminClassForm.elements["grade"];
  const streamInput = adminClassForm.elements["stream"];
  const academicYearInput = adminClassForm.elements["academicYear"];
  academicYearInput.value = String(new Date().getFullYear());

  const sectionInput = adminClassForm.elements["section"];
  sectionInput.addEventListener("input", () => {
    sectionInput.value = sectionInput.value.toUpperCase().slice(0, 1);
  });

  const syncStreamField = () => {
    if (streamInput) {
      setStreamSelectState(streamInput, gradeInput.value);
    }
  };

  // Toggle section visibility/requirement for stream-only grades (12 & 13)
  const syncSectionField = () => {
    const selectedGrade = Number(gradeInput.value);
    const requiresSection = !isStreamGrade(selectedGrade);
    if (requiresSection) {
      sectionInput.style.display = "";
      sectionInput.required = true;
      sectionInput.disabled = false;
    } else {
      sectionInput.style.display = "none";
      sectionInput.required = false;
      sectionInput.disabled = true;
      sectionInput.value = "";
    }
  };

  gradeInput.addEventListener("input", syncStreamField);
  gradeInput.addEventListener("change", syncStreamField);
  gradeInput.addEventListener("input", syncSectionField);
  gradeInput.addEventListener("change", syncSectionField);
  syncStreamField();
  syncSectionField();

  adminClassForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(adminClassForm);
    const grade = Number(formData.get("grade"));
    const section = String(formData.get("section") || "")
      .trim()
      .toUpperCase();
    const academicYear = Number(formData.get("academicYear"));
    const maxStudents = Number(formData.get("maxStudents"));
    const stream = String(formData.get("stream") || "").trim();

    if (!Number.isInteger(grade) || grade < 1 || grade > 13) {
      alert("Grade must be a number from 1 to 13.");
      return;
    }

    if ((grade === 12 || grade === 13) && !stream) {
      alert("Please select a stream for grades 12 and 13.");
      return;
    }

    const requiresSection = !isStreamGrade(grade);
    if (requiresSection) {
      if (!/^[A-Z]$/.test(section)) {
        alert("Class must be a single capital letter.");
        return;
      }
    } else {
      // For grade 12/13 classes are stream-only
      section = "";
    }

    if (
      !Number.isInteger(academicYear) ||
      academicYear < 2000 ||
      academicYear > 2100
    ) {
      alert("Please enter a valid academic year.");
      return;
    }

    if (
      !Number.isInteger(maxStudents) ||
      maxStudents < 1 ||
      maxStudents > 200
    ) {
      alert("Max students must be between 1 and 200.");
      return;
    }

    try {
      await apiFetch(ADMIN_CLASSES_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grade,
          section,
          academic_year: academicYear,
          max_students: maxStudents,
          stream,
        }),
      });

      adminClassForm.reset();
      academicYearInput.value = String(new Date().getFullYear());
      alert("Class created successfully.");
      await loadClasses();
      await loadTeachers();
    } catch (error) {
      console.error("Create class failed:", error);
      alert(error.message || "Failed to create class.");
    }
  });
}

if (adminTeacherForm) {
  const gradeSelect = adminTeacherForm.elements["grade"];
  const classStreamSelect = adminTeacherForm.elements["classStream"];
  const classSelect = adminTeacherForm.elements["classSection"];
  const submitButton = adminTeacherForm.querySelector('button[type="submit"]');
  let availableClasses = [];

  function setSelectOptions(selectElement, placeholder, options) {
    selectElement.innerHTML = "";

    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = placeholder;
    selectElement.appendChild(placeholderOption);

    options.forEach((option) => {
      const optionElement = document.createElement("option");
      optionElement.value = option.value;
      optionElement.textContent = option.label;
      selectElement.appendChild(optionElement);
    });
  }

  function updateClassOptionsByGrade() {
    const selectedGrade = Number(gradeSelect.value);
    if (!Number.isInteger(selectedGrade)) {
      setStreamSelectState(classStreamSelect, null);
      setSelectOptions(classSelect, "Select Class", []);
      return;
    }

    setStreamSelectState(classStreamSelect, selectedGrade);
    const selectedStream = String(classStreamSelect.value || "").trim();
    if (isStreamGrade(selectedGrade) && !selectedStream) {
      setSelectOptions(classSelect, "Select Stream first", []);
      return;
    }

    const sections = [
      ...new Set(
        filterClassesByGradeAndStream(
          availableClasses,
          selectedGrade,
          selectedStream,
        ).map((item) => item.section),
      ),
    ].sort();

    setSelectOptions(
      classSelect,
      sections.length > 0 ? "Select Class" : "No classes available",
      sections.map((section) => ({
        value: section,
        label: `Class ${section}`,
      })),
    );
  }

  // Hide/disable class select when grade is stream-only (12/13)
  function syncTeacherClassField() {
    const selectedGrade = Number(gradeSelect.value);
    const requiresSection = !isStreamGrade(selectedGrade);
    if (requiresSection) {
      classSelect.style.display = "";
      classSelect.required = true;
      classSelect.disabled = false;
    } else {
      classSelect.style.display = "none";
      classSelect.required = false;
      classSelect.disabled = true;
      classSelect.value = "";
    }
  }

  async function loadAvailableClasses() {
    try {
      submitButton.disabled = true;
      setSelectOptions(gradeSelect, "Loading grades...", []);
      setSelectOptions(classSelect, "Loading classes...", []);

      const data = await apiFetch(ADMIN_CLASSES_API);
      availableClasses = (data.classes || []).filter(
        (item) => item.teacher_id === null,
      );

      const grades = [
        ...new Set(availableClasses.map((item) => item.grade)),
      ].sort((a, b) => a - b);

      setSelectOptions(
        gradeSelect,
        grades.length > 0 ? "Select Grade" : "No grades available",
        grades.map((grade) => ({
          value: String(grade),
          label: `Grade ${grade}`,
        })),
      );
      setStreamSelectState(classStreamSelect, null);
      setSelectOptions(classSelect, "Select Class", []);

      submitButton.disabled = grades.length === 0;
      if (grades.length === 0) {
        alert(
          "No available classes found. Create classes first from the admin dashboard.",
        );
      }
    } catch (error) {
      console.error("Load classes failed:", error);
      alert(error.message || "Failed to load classes.");
      setSelectOptions(gradeSelect, "Select Grade", []);
      setSelectOptions(classSelect, "Select Class", []);
      submitButton.disabled = true;
    }
  }

  gradeSelect.addEventListener("change", updateClassOptionsByGrade);
  if (classStreamSelect) {
    classStreamSelect.addEventListener("change", updateClassOptionsByGrade);
  }
  gradeSelect.addEventListener("change", syncTeacherClassField);
  gradeSelect.addEventListener("input", syncTeacherClassField);
  loadAvailableClasses();
  syncTeacherClassField();

  const togglePassword = document.getElementById("toggleTeacherPassword");
  if (togglePassword) {
    togglePassword.addEventListener("change", () => {
      const pwd = adminTeacherForm.elements["password"];
      const cpwd = adminTeacherForm.elements["confirmPassword"];
      const type = togglePassword.checked ? "text" : "password";
      if (pwd) pwd.type = type;
      if (cpwd) cpwd.type = type;
    });
  }

  adminTeacherForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(adminTeacherForm);
    const payload = {
      full_name: String(formData.get("fullName") || "").trim(),
      teacher_id: String(formData.get("teacherId") || "").trim(),
      grade: Number(formData.get("grade")),
      class_stream: String(formData.get("classStream") || "").trim(),
      class_section: String(formData.get("classSection") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      password: String(formData.get("password") || "").trim(),
      confirm_password: String(formData.get("confirmPassword") || "").trim(),
    };

    try {
      await apiFetch(ADMIN_TEACHERS_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      alert("Teacher registered successfully.");
      adminTeacherForm.reset();
      await loadTeachers();
      await loadClasses();
      await loadAvailableClasses();
    } catch (error) {
      console.error("Admin register failed:", error);
      alert(error.message || "Registration failed.");
    }
  });
}

if (emergencyAlertForm) {
  emergencyAlertForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(emergencyAlertForm);
    const alertType = String(formData.get("alertType") || "").trim();
    const title = String(formData.get("alertTitle") || "").trim();
    const message = String(formData.get("alertMessage") || "").trim();

    if (!alertType || !title || !message) {
      alert("Please select an alert target, title, and message.");
      return;
    }

    const submitButton = emergencyAlertForm.querySelector(
      'button[type="submit"]',
    );
    const originalText = submitButton ? submitButton.textContent : "Send Alert";

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Sending...";
      }

      const result = await apiFetch(EMERGENCY_ALERT_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          alert_type: alertType,
          alert_title: title,
          alert_body: message,
        }),
      });

      alert(
        `Alert sent: ${result.sent_count || 0} delivered, ${result.failed_count || 0} failed.`,
      );
      emergencyAlertForm.reset();
    } catch (error) {
      console.error("Emergency alert failed:", error);
      alert(error.message || "Failed to send emergency alert.");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }
  });

  // Attendance Settings Form
  attendanceSettingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(attendanceSettingsForm);
    const openTime = String(formData.get("openTime") || "").trim();
    const closeTime = String(formData.get("closeTime") || "").trim();
    const timezone = String(formData.get("timezone") || "Asia/Colombo").trim();

    if (!openTime || !closeTime) {
      alert("Please select both opening and closing times.");
      return;
    }

    const submitButton = attendanceSettingsForm.querySelector(
      'button[type="submit"]',
    );
    const originalText = submitButton
      ? submitButton.textContent
      : "Save Settings";

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Saving...";
      }

      const result = await apiFetch(ATTENDANCE_SETTINGS_API, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          open_time: openTime,
          close_time: closeTime,
          timezone: timezone,
        }),
      });

      alert("Attendance settings saved successfully!");
      loadAttendanceSettings();
    } catch (error) {
      console.error("Attendance settings update failed:", error);
      alert(error.message || "Failed to save attendance settings.");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }
  });
}

if (loadAttendanceReportButton) {
  loadAttendanceReportButton.addEventListener("click", () => {
    openModal("attendanceFilterModal");
  });
}

if (loadTermReportButton) {
  loadTermReportButton.addEventListener("click", () => {
    openModal("termFilterModal");
  });
}

if (loadSubjectPlansButton) {
  loadSubjectPlansButton.addEventListener("click", async () => {
    try {
      loadSubjectPlansButton.disabled = true;
      await loadSubjectPlans();
    } catch (error) {
      console.error("Load subject plans failed:", error);
      alert(error.message || "Failed to load subject plans.");
    } finally {
      loadSubjectPlansButton.disabled = false;
    }
  });
}

if (downloadAttendanceReportButton) {
  downloadAttendanceReportButton.addEventListener("click", () => {
    if (!currentAttendanceData || currentAttendanceData.records.length === 0) {
      alert("No attendance data to download.");
      return;
    }
    const csv = buildAttendanceCsv(currentAttendanceData.records);
    downloadCsv("attendance_report.csv", csv);
  });
}

if (downloadTermReportButton) {
  downloadTermReportButton.addEventListener("click", () => {
    if (!currentTermFilter) {
      alert("Please run a term report filter before downloading CSV.");
      return;
    }

    const params = new URLSearchParams({
      year: currentTermFilter.year,
      grade: currentTermFilter.grade,
      class: currentTermFilter.class,
      term: currentTermFilter.term,
      stream: currentTermFilter.stream || "",
    });

    // Fetch CSV with auth and trigger download
    (async () => {
      try {
        const token = getToken();
        if (!token) throw new Error("Authentication required.");
        const resp = await fetch(
          `/api/admin/reports/term-tests/csv?${params.toString()}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(text || "Failed to download CSV.");
        }
        const blob = await resp.blob();
        const dispo = resp.headers.get("content-disposition") || "";
        let filename = "term_test_report.csv";
        const m = /filename="?([^";]+)"?/.exec(dispo);
        if (m) filename = m[1];
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (err) {
        alert(err.message || "Failed to download CSV.");
      }
    })();
  });
}

if (classDetailsFilterForm) {
  classDetailsFilterForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      await loadSelectedClassDetails();
    } catch (error) {
      console.error("Load class details failed:", error);
      alert(error.message || "Failed to load class details.");
    }
  });
}

document.querySelectorAll(".modal-close, [data-modal]").forEach((button) => {
  button.addEventListener("click", (e) => {
    const modalId = e.target.getAttribute("data-modal");
    if (modalId) {
      closeModal(modalId);
    }
  });
});

const attendanceFilterForm = document.getElementById("attendanceFilterForm");
if (attendanceFilterForm) {
  attendanceFilterForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const year = document.getElementById("attendanceYear").value;
    const grade = document.getElementById("attendanceGrade").value;
    const classSection = document.getElementById("attendanceClass").value;
    const date = document.getElementById("attendanceDate").value;

    const numericGrade = Number(grade);
    const requiresSection = !isStreamGrade(numericGrade);

    if (!year || !grade || (requiresSection && !classSection) || !date) {
      alert("Please fill all fields.");
      return;
    }

    try {
      const data = await apiFetch(
        `${ATTENDANCE_REPORT_FILTERED_API}?year=${year}&grade=${grade}&class=${classSection}&date=${date}&stream=${encodeURIComponent(attendanceStream ? attendanceStream.value : "")}`,
      );

      currentAttendanceData = {
        records: data.records || [],
        summary: data.summary || {},
      };

      renderSummaryCards(attendanceReportSummary, {
        "Total records": (data.records || []).length,
        Present: data.summary?.present_count || 0,
        Absent: data.summary?.absent_count || 0,
        Late: data.summary?.late_count || 0,
      });

      renderList(
        attendanceReportList,
        data.records || [],
        "No attendance records found for this filter.",
        (record) => {
          return `${record.student_name} - ${record.status} (${record.student_code || "N/A"})`;
        },
      );

      if (downloadAttendanceReportButton && (data.records || []).length > 0) {
        downloadAttendanceReportButton.style.display = "inline-block";
      }

      setActiveReportCard("attendance");

      closeModal("attendanceFilterModal");
    } catch (error) {
      console.error("Load filtered attendance report failed:", error);
      alert(error.message || "Failed to load attendance report.");
    }
  });

  setYearToCurrentYear("attendanceYear");
  setToday("attendanceDate");

  (async () => {
    try {
      const data = await apiFetch(ADMIN_CLASSES_API);
      availableClassesForReports = data.classes || [];
      updateReportClassOptions(
        "attendanceGrade",
        "attendanceStream",
        "attendanceClass",
        availableClassesForReports,
      );
    } catch (error) {
      console.error("Load classes for attendance filter failed:", error);
    }
  })();
}

const termFilterForm = document.getElementById("termFilterForm");
if (termFilterForm) {
  termFilterForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const year = document.getElementById("termYear").value;
    const grade = document.getElementById("termGrade").value;
    const classSection = document.getElementById("termClass").value;
    const term = document.getElementById("termSelect").value;

    const numericGrade = Number(grade);
    const requiresSection = !isStreamGrade(numericGrade);

    if (!year || !grade || (requiresSection && !classSection) || !term) {
      alert("Please fill all fields.");
      return;
    }

    try {
      const data = await apiFetch(
        `${TERM_REPORT_FILTERED_API}?year=${year}&grade=${grade}&class=${classSection}&term=${term}&stream=${encodeURIComponent(termStream ? termStream.value : "")}`,
      );
      // store active filter for CSV download
      currentTermFilter = {
        year,
        grade,
        class: classSection,
        term,
        stream: termStream ? termStream.value : "",
      };

      currentTermData = {
        records: data.records || [],
        summary: data.summary || {},
        pending_reviews: data.pending_reviews || [],
        pending_count: data.pending_count || 0,
      };

      renderSummaryCards(termReportSummary, {
        "Total records": (data.records || []).length,
        "Average mark": data.summary?.average_mark || 0,
        Distinctions: data.summary?.distinction_count || 0,
      });

      renderTermMarksTable(
        termReportList,
        data.records || [],
        "No term-test records found for this filter.",
      );

      renderPendingApprovalsWidget(data);

      if (downloadTermReportButton && (data.records || []).length > 0) {
        downloadTermReportButton.style.display = "inline-block";
      }

      setActiveReportCard("term");

      closeModal("termFilterModal");
    } catch (error) {
      console.error("Load filtered term report failed:", error);
      alert(error.message || "Failed to load term-test report.");
    }
  });

  setYearToCurrentYear("termYear");

  (async () => {
    try {
      const data = await apiFetch(ADMIN_CLASSES_API);
      availableClassesForReports = data.classes || [];
      updateReportClassOptions(
        "termGrade",
        "termStream",
        "termClass",
        availableClassesForReports,
      );
    } catch (error) {
      console.error("Load classes for term filter failed:", error);
    }
  })();
}

tabButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    activateSidebarTab(button.dataset.tab, { updateHash: true });

    if (button.dataset.tab === "pending-approvals") {
      loadPendingTermApprovals().catch((error) => {
        console.error("Load pending term approvals failed:", error);
        alert(error.message || "Failed to load pending term approvals.");
      });
    }
  });
});

updateSidebarGreetingByTime();
activateSidebarTab("classes", { updateHash: false, scroll: false });

const initialTab = window.location.hash.replace(/^#/, "");
if (initialTab) {
  activateSidebarTab(initialTab, { updateHash: false });

  if (initialTab === "pending-approvals") {
    loadPendingTermApprovals().catch((error) => {
      console.error("Load pending term approvals failed:", error);
      alert(error.message || "Failed to load pending term approvals.");
    });
  }
}

(async function initDashboard() {
  try {
    await Promise.allSettled([
      loadDashboardMetrics(),
      loadTeachers(),
      loadClasses(),
      initializeClassDetailsFilters(),
      loadAttendanceSettings(),
      loadPendingTermApprovalCount(),
    ]);

    loadSubjectPlans().catch((error) => {
      console.error("Load subject plans failed:", error);
      renderSubjectPlans([]);
    });
  } catch (error) {
    console.error("Admin dashboard init failed:", error);
    alert(error.message || "Failed to load dashboard data.");
  }
})();

// Logout functionality
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("sureki_token");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    window.location.href = "/";
  });
}

// ========== Teacher Management Module Integration ==========
// Initialize teacher management when the view-teachers tab is activated
const teacherSearchInput = document.getElementById("teacherSearchInput");
const teacherStatusFilter = document.getElementById("teacherStatusFilter");
const exportTeachersBtn = document.getElementById("exportTeachersBtn");

// Initialize teacher management on tab switch
document.addEventListener("click", async (event) => {
  const tabButton = event.target.closest(".admin-tab");
  if (tabButton && tabButton.dataset.tab === "view-teachers") {
    try {
      await teacherMgmt.loadAllTeachers();
      teacherMgmt.renderTeachersList(
        document.getElementById("allTeachersList"),
      );
    } catch (error) {
      console.error("Failed to load teachers:", error);
      alert("Failed to load teachers. Please try again.");
    }
  }
});

// Search functionality
if (teacherSearchInput) {
  teacherSearchInput.addEventListener("input", (event) => {
    teacherMgmt.searchTeachers(event.target.value);
    teacherMgmt.renderTeachersList(document.getElementById("allTeachersList"));
  });
}

// Status filter functionality
if (teacherStatusFilter) {
  teacherStatusFilter.addEventListener("change", (event) => {
    teacherMgmt.filterByStatus(event.target.value);
    teacherMgmt.renderTeachersList(document.getElementById("allTeachersList"));
  });
}

// Export to CSV functionality
if (exportTeachersBtn) {
  exportTeachersBtn.addEventListener("click", () => {
    teacherMgmt.exportToCSV();
  });
}
