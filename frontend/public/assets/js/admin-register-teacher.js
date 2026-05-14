const adminTeacherForm = document.getElementById("adminTeacherForm");
const ADMIN_TEACHER_API = "/api/admin/teachers";
const ADMIN_CLASSES_API = "/api/admin/classes";
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

async function loadAvailableClasses() {
  const token = localStorage.getItem("sureki_token");
  if (!token) {
    return;
  }

  try {
    submitButton.disabled = true;
    setSelectOptions(gradeSelect, "Loading grades...", []);
    setSelectOptions(classSelect, "Loading classes...", []);

    const response = await fetch(ADMIN_CLASSES_API, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Unable to load class list.");
    }

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
loadAvailableClasses();

adminTeacherForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(adminTeacherForm);
  const payload = {
    full_name: formData.get("fullName").trim(),
    teacher_id: formData.get("teacherId").trim(),
    grade: Number(formData.get("grade")),
    class_stream: formData.get("classStream").trim(),
    class_section: formData.get("classSection").trim(),
    phone: formData.get("phone").trim(),
    email: formData.get("email").trim(),
    password: formData.get("password").trim(),
    confirm_password: formData.get("confirmPassword").trim(),
  };

  try {
    const token = localStorage.getItem("sureki_token");
    if (!token) {
      throw new Error("Admin authentication required. Please sign in first.");
    }

    const response = await fetch(ADMIN_TEACHER_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Unable to register teacher.");
    }

    alert("Teacher registered successfully.");
    adminTeacherForm.reset();
  } catch (error) {
    console.error("Admin register failed:", error);
    alert(error.message || "Registration failed.");
  }
});
