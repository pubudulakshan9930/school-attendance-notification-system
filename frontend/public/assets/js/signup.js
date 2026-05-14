const signupForm = document.getElementById("teacherSignupForm");
const passwordInput = document.getElementById("signupPassword");
const confirmPasswordInput = document.getElementById("signupConfirmPassword");
const togglePassword = document.getElementById("toggleSignupPassword");
const toggleConfirmPassword = document.getElementById(
  "toggleSignupConfirmPassword",
);
const SIGNUP_API_URL = "/api/auth/signup";
const SIGNUP_CLASSES_API_URL = "/api/auth/classes";
const classSelect = signupForm.elements["classId"];
const submitButton = signupForm.querySelector('button[type="submit"]');

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

async function loadAvailableClasses() {
  try {
    submitButton.disabled = true;
    setSelectOptions(classSelect, "Loading classes...", []);

    const response = await fetch(SIGNUP_CLASSES_API_URL);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Unable to load class list.");
    }

    const availableClasses = (data.classes || []).filter(
      (item) => item.teacher_id === null,
    );

    const classOptions = availableClasses.map((cls) => {
      let label = `Grade ${cls.grade} - Class ${cls.section}`;
      if (cls.stream) {
        const streamLabel = getStreamLabel(cls.stream);
        if (streamLabel) label += ` - ${streamLabel}`;
      }
      return {
        value: cls.id,
        label: label,
      };
    });

    setSelectOptions(
      classSelect,
      classOptions.length > 0 ? "Select Class" : "No classes available",
      classOptions,
    );

    submitButton.disabled = classOptions.length === 0;
    if (classOptions.length === 0) {
      alert("No classes are available for signup. Please contact admin.");
    }
  } catch (error) {
    console.error("Load classes error:", error);
    setSelectOptions(classSelect, "Error loading classes", []);
    submitButton.disabled = true;
    alert("Failed to load available classes. Please try again.");
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

loadAvailableClasses();

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(signupForm);
  const getTrimmed = (name) => String(formData.get(name) || "").trim();
  const payload = {
    full_name: getTrimmed("fullName"),
    teacher_code: getTrimmed("teacherId"),
    class_id: getTrimmed("classId"),
    phone: getTrimmed("phone"),
    email: getTrimmed("email"),
    password: getTrimmed("password"),
    confirm_password: getTrimmed("confirmPassword"),
  };

  if (!payload.class_id) {
    alert("Please select a class.");
    return;
  }

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
