const ADMIN_CLASSES_API = "/api/admin/classes";
const ADMIN_TEACHERS_API = "/api/admin/teachers";
const ADMIN_CLASS_DETAILS_API = "/api/admin/classes/details";
const ATTENDANCE_REPORT_API = "/api/admin/reports/attendance";
const TERM_REPORT_API = "/api/admin/reports/term-tests";
const ATTENDANCE_REPORT_FILTERED_API = "/api/admin/reports/attendance/filtered";
const TERM_REPORT_FILTERED_API = "/api/admin/reports/term-tests/filtered";
const EMERGENCY_ALERT_API = "/api/admin/alerts/emergency";

const adminClassForm = document.getElementById("adminClassForm");
const adminTeacherForm = document.getElementById("adminTeacherForm");
const emergencyAlertForm = document.getElementById("emergencyAlertForm");
const adminClassesList = document.getElementById("adminClassesList");
const teacherSummary = document.getElementById("teacherSummary");
const teacherCount = document.getElementById("teacherCount");
const absentTeacherCount = document.getElementById("absentTeacherCount");
const alertRecipientList = document.getElementById("alertRecipientList");
const classDetailsFilterForm = document.getElementById("classDetailsFilterForm");
const classDetailsYear = document.getElementById("classDetailsYear");
const classDetailsGrade = document.getElementById("classDetailsGrade");
const classDetailsSection = document.getElementById("classDetailsSection");
const classTeacherDetails = document.getElementById("classTeacherDetails");
const classStudentsDetails = document.getElementById("classStudentsDetails");
const attendanceReportSummary = document.getElementById(
  "attendanceReportSummary",
);
const attendanceReportList = document.getElementById("attendanceReportList");
const termReportSummary = document.getElementById("termReportSummary");
const termReportList = document.getElementById("termReportList");
const loadAttendanceReportButton = document.getElementById(
  "loadAttendanceReport",
);
const loadTermReportButton = document.getElementById("loadTermReport");
const downloadAttendanceReportButton = document.getElementById(
  "downloadAttendanceReport",
);
const downloadTermReportButton = document.getElementById("downloadTermReport");
const tabButtons = Array.from(document.querySelectorAll(".admin-tab"));
const panels = Array.from(document.querySelectorAll(".admin-panel"));

let teacherCache = [];
let currentAttendanceData = null;
let currentTermData = null;
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
      throw new Error("Admin access required. Please login with an admin account.");
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

function updateReportClassOptions(gradeSelectId, classSelectId, classesData) {
  const gradeSelect = document.getElementById(gradeSelectId);
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

  gradeSelect.addEventListener("change", () => {
    const selectedGrade = Number(gradeSelect.value);
    if (!Number.isInteger(selectedGrade)) {
      setSelectOptions(classSelect, "Select Class", []);
      return;
    }
    const sections = [
      ...new Set(
        classesData
          .filter((item) => item.grade === selectedGrade)
          .map((item) => item.section),
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
      `Grade ${record.grade} ${record.section}`,
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
      `Grade ${record.grade} ${record.section}`,
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

function setClassDetailsGradeOptions(selectedYear) {
  if (!classDetailsGrade || !classDetailsSection) {
    return;
  }

  if (!selectedYear) {
    setSelectOptions(classDetailsGrade, "Select Grade", []);
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
  setSelectOptions(classDetailsSection, "Select Class", []);
}

function setClassDetailsSectionOptions(selectedYear, selectedGrade) {
  if (!classDetailsSection) {
    return;
  }

  if (!selectedYear || !selectedGrade) {
    setSelectOptions(classDetailsSection, "Select Class", []);
    return;
  }

  const sections = [
    ...new Set(
      availableClassesForClassDetails
        .filter(
          (item) =>
            Number(item.academic_year) === Number(selectedYear) &&
            Number(item.grade) === Number(selectedGrade),
        )
        .map((item) => item.section),
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

  classDetailsYear.addEventListener("change", () => {
    setClassDetailsGradeOptions(classDetailsYear.value);
  });

  classDetailsGrade.addEventListener("change", () => {
    setClassDetailsSectionOptions(classDetailsYear.value, classDetailsGrade.value);
  });
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
  const section = classDetailsSection.value;

  if (!year || !grade || !section) {
    alert("Please select year, grade, and class.");
    return;
  }

  const data = await apiFetch(
    `${ADMIN_CLASS_DETAILS_API}?year=${encodeURIComponent(year)}&grade=${encodeURIComponent(grade)}&class=${encodeURIComponent(section)}`,
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
            value: `Grade ${classInfo.grade} Class ${classInfo.section} (${classInfo.academic_year})`,
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
          value: `Grade ${classInfo.grade} Class ${classInfo.section} (${classInfo.academic_year})`,
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

async function loadClasses() {
  if (!adminClassesList) {
    return;
  }

  const data = await apiFetch(ADMIN_CLASSES_API);
  const classes = data.classes || [];

  renderList(
    adminClassesList,
    classes,
    "No classes created yet.",
    (classItem) => {
      const assignedTeacher = classItem.teacher_name || "Not assigned";
      return `Grade ${classItem.grade} Class ${classItem.section} (${classItem.academic_year}) - ${assignedTeacher}`;
    },
  );
}

async function loadAttendanceReport() {
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
      return `${record.student_name} - ${record.status} - Grade ${record.grade} ${record.section} by ${record.teacher_name}`;
    },
  );
}

async function loadTermReport() {
  const data = await apiFetch(TERM_REPORT_API);
  const summary = data.summary || {};

  renderSummaryCards(termReportSummary, {
    "Total records": summary.total_records || 0,
    "Average mark": summary.average_mark || 0,
    Distinctions: summary.distinction_count || 0,
  });

  renderList(
    termReportList,
    data.recent_records || [],
    "No term-test records found.",
    (record) => {
      return `${record.student_name} - Term ${record.term} ${record.subject_name} - ${record.mark}`;
    },
  );
}

if (adminClassForm) {
  const academicYearInput = adminClassForm.elements["academicYear"];
  academicYearInput.value = String(new Date().getFullYear());

  const sectionInput = adminClassForm.elements["section"];
  sectionInput.addEventListener("input", () => {
    sectionInput.value = sectionInput.value.toUpperCase().slice(0, 1);
  });

  adminClassForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(adminClassForm);
    const grade = Number(formData.get("grade"));
    const section = String(formData.get("section") || "")
      .trim()
      .toUpperCase();
    const academicYear = Number(formData.get("academicYear"));

    if (!Number.isInteger(grade) || grade < 1 || grade > 13) {
      alert("Grade must be a number from 1 to 13.");
      return;
    }

    if (!/^[A-Z]$/.test(section)) {
      alert("Class must be a single capital letter.");
      return;
    }

    if (
      !Number.isInteger(academicYear) ||
      academicYear < 2000 ||
      academicYear > 2100
    ) {
      alert("Please enter a valid academic year.");
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
      setSelectOptions(classSelect, "Select Class", []);
      return;
    }

    const sections = [
      ...new Set(
        availableClasses
          .filter((item) => item.grade === selectedGrade)
          .map((item) => item.section),
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
  loadAvailableClasses();

  adminTeacherForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(adminTeacherForm);
    const payload = {
      full_name: String(formData.get("fullName") || "").trim(),
      teacher_id: String(formData.get("teacherId") || "").trim(),
      grade: Number(formData.get("grade")),
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
    if (!currentTermData || currentTermData.records.length === 0) {
      alert("No term test data to download.");
      return;
    }
    const csv = buildTermTestCsv(currentTermData.records);
    downloadCsv("term_test_report.csv", csv);
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

    if (!year || !grade || !classSection || !date) {
      alert("Please fill all fields.");
      return;
    }

    try {
      const data = await apiFetch(
        `${ATTENDANCE_REPORT_FILTERED_API}?year=${year}&grade=${grade}&class=${classSection}&date=${date}`,
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

    if (!year || !grade || !classSection || !term) {
      alert("Please fill all fields.");
      return;
    }

    try {
      const data = await apiFetch(
        `${TERM_REPORT_FILTERED_API}?year=${year}&grade=${grade}&class=${classSection}&term=${term}`,
      );

      currentTermData = {
        records: data.records || [],
        summary: data.summary || {},
      };

      renderSummaryCards(termReportSummary, {
        "Total records": (data.records || []).length,
        "Average mark": data.summary?.average_mark || 0,
        Distinctions: data.summary?.distinction_count || 0,
      });

      renderList(
        termReportList,
        data.records || [],
        "No term-test records found for this filter.",
        (record) => {
          return `${record.student_name} - ${record.subject_name} - ${record.mark}`;
        },
      );

      if (downloadTermReportButton && (data.records || []).length > 0) {
        downloadTermReportButton.style.display = "inline-block";
      }

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
        "termClass",
        availableClassesForReports,
      );
    } catch (error) {
      console.error("Load classes for term filter failed:", error);
    }
  })();
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveTab(button.dataset.tab);
  });
});

setActiveTab("classes");

(async function initDashboard() {
  try {
    await Promise.all([
      loadTeachers(),
      loadClasses(),
      initializeClassDetailsFilters(),
    ]);
  } catch (error) {
    console.error("Admin dashboard init failed:", error);
    alert(error.message || "Failed to load dashboard data.");
  }
})();
