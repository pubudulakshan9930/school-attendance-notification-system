const adminClassForm = document.getElementById("adminClassForm");
const adminClassesList = document.getElementById("adminClassesList");
const ADMIN_CLASSES_API = "/api/admin/classes";

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

    const payload = {
      grade,
      section,
      academic_year: academicYear,
    };

    try {
      const token = localStorage.getItem("sureki_token");
      if (!token) {
        throw new Error("Admin authentication required.");
      }

      const response = await fetch(ADMIN_CLASSES_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to create class.");
      }

      adminClassForm.reset();
      academicYearInput.value = String(new Date().getFullYear());
      alert("Class created successfully.");
      await loadClasses();
    } catch (error) {
      console.error("Create class failed:", error);
      alert(error.message || "Failed to create class.");
    }
  });
}

async function loadClasses() {
  if (!adminClassesList) {
    return;
  }

  try {
    const token = localStorage.getItem("sureki_token");
    if (!token) {
      throw new Error("Admin authentication required.");
    }

    const response = await fetch(ADMIN_CLASSES_API, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to load classes.");
    }

    const classes = data.classes || [];
    adminClassesList.innerHTML = "";

    if (classes.length === 0) {
      const emptyItem = document.createElement("li");
      emptyItem.textContent = "No classes created yet.";
      adminClassesList.appendChild(emptyItem);
      return;
    }

    classes.forEach((classItem) => {
      const listItem = document.createElement("li");
      const assignedTeacher = classItem.teacher_name || "Not assigned";
      listItem.textContent = `Grade ${classItem.grade} Class ${classItem.section} (${classItem.academic_year}) - ${assignedTeacher}`;
      adminClassesList.appendChild(listItem);
    });
  } catch (error) {
    console.error("Load classes failed:", error);
    adminClassesList.innerHTML = "";
    const errorItem = document.createElement("li");
    errorItem.textContent = error.message || "Failed to load classes.";
    adminClassesList.appendChild(errorItem);
  }
}

loadClasses();
