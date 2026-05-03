const signupForm = document.getElementById("teacherSignupForm");
const passwordInput = document.getElementById("signupPassword");
const confirmPasswordInput = document.getElementById("signupConfirmPassword");
const togglePassword = document.getElementById("toggleSignupPassword");
const toggleConfirmPassword = document.getElementById(
  "toggleSignupConfirmPassword",
);
const SIGNUP_API_URL = "/api/auth/signup";
const SIGNUP_CLASSES_API_URL = "/api/auth/classes";
const gradeSelect = signupForm.elements["grade"];
const classSelect = signupForm.elements["classSection"];
const submitButton = signupForm.querySelector('button[type="submit"]');

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

    const response = await fetch(SIGNUP_CLASSES_API_URL);
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
    setSelectOptions(classSelect, "Select Class", []);

    submitButton.disabled = grades.length === 0;
    if (grades.length === 0) {
      alert("No classes are available for signup. Please contact admin.");
    }
  } catch (error) {
    console.error("Load classes failed:", error);
    alert(error.message || "Failed to load classes.");
    setSelectOptions(gradeSelect, "Select Grade", []);
    setSelectOptions(classSelect, "Select Class", []);
    submitButton.disabled = true;
  }
}

function toggleVisibility(input, button) {
  if (input.type === "password") {
    input.type = "text";
    button.textContent = "🙈";
  } else {
    input.type = "password";
    button.textContent = "👁";
  }
}

togglePassword.addEventListener("click", () =>
  toggleVisibility(passwordInput, togglePassword),
);
toggleConfirmPassword.addEventListener("click", () =>
  toggleVisibility(confirmPasswordInput, toggleConfirmPassword),
);

gradeSelect.addEventListener("change", updateClassOptionsByGrade);
loadAvailableClasses();

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(signupForm);
  const payload = {
    full_name: formData.get("fullName").trim(),
    teacher_code: formData.get("teacherId").trim(),
    grade: Number(formData.get("grade")),
    class_section: formData.get("classSection").trim(),
    phone: formData.get("phone").trim(),
    email: formData.get("email").trim(),
    password: formData.get("password").trim(),
    confirm_password: formData.get("confirmPassword").trim(),
  };

  try {
    const response = await fetch(SIGNUP_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Unable to complete sign-up.");
    }

    alert("Teacher account created successfully. Please log in.");
    window.location.href = "/index.html";
  } catch (error) {
    console.error("Signup failed:", error);
    alert(error.message || "Signup failed.");
  }
});
