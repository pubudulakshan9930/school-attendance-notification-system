const registerForm = document.getElementById("registerStudentForm");

async function registerStudent(event) {
  event.preventDefault();

  const token = localStorage.getItem("sureki_token");
  if (!token) {
    window.location.href = "/index.html";
    return;
  }

  const formData = new FormData(registerForm);
  const payload = {
    student_name: (formData.get("student_name") || "").toString().trim(),
    parent_name: (formData.get("parent_name") || "").toString().trim(),
    phone: (formData.get("phone") || "").toString().trim(),
    email: (formData.get("email") || "").toString().trim(),
    elective_subject_1: (formData.get("elective_subject_1") || "")
      .toString()
      .trim(),
    elective_subject_2: (formData.get("elective_subject_2") || "")
      .toString()
      .trim(),
    elective_subject_3: (formData.get("elective_subject_3") || "")
      .toString()
      .trim(),
  };

  try {
    const response = await fetch("/api/teacher/students/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Unable to register student.");
    }

    alert("Student registered successfully.");
    registerForm.reset();
  } catch (error) {
    alert(error.message || "Student registration failed.");
  }
}

registerForm.addEventListener("submit", registerStudent);
