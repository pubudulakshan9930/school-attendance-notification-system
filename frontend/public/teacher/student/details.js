const loadDetailsButton = document.getElementById("loadDetailsButton");
const classMetaList = document.getElementById("classMetaList");
const studentsList = document.getElementById("studentsList");

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

function renderDetailsList(container, items, emptyMessage, formatter) {
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

async function loadAssignedClassDetails() {
  const token = localStorage.getItem("sureki_token");
  if (!token) {
    window.location.href = "/index.html";
    return;
  }

  const originalText = loadDetailsButton ? loadDetailsButton.textContent : "Load Details";

  try {
    if (loadDetailsButton) {
      loadDetailsButton.disabled = true;
      loadDetailsButton.textContent = "Loading...";
    }

    const response = await fetch("/api/teacher/class-details", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to load class details.");
    }

    if (!data.class) {
      renderDetailsList(classMetaList, [], "No active class assigned.", () => "");
      renderDetailsList(
        studentsList,
        [],
        "No students found for your assigned class.",
        () => "",
      );
      return;
    }

    renderDetailsList(
      classMetaList,
      [
        {
          ...data.class,
          class_teacher: data.class_teacher,
        },
      ],
      "No class information available.",
      (item) => {
        const teacher = item.class_teacher;
        if (!teacher) {
          return [
            {
              label: "Class",
              value: `Grade ${item.grade} Class ${item.section} (${item.academic_year})`,
            },
            {
              label: "Teacher",
              value: "Details unavailable",
            },
          ];
        }

        return [
          {
            label: "Class",
            value: `Grade ${item.grade} Class ${item.section} (${item.academic_year})`,
          },
          {
            label: "Teacher",
            value: teacher.full_name,
          },
          {
            label: "Email",
            value: teacher.email || "N/A",
          },
          {
            label: "Phone",
            value: teacher.phone || "N/A",
          },
        ];
      },
    );

    renderDetailsList(
      studentsList,
      data.students || [],
      "No students found for your assigned class.",
      (student) => {
        const subjects = (student.subjects || []).map((subject) => subject.name);
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
          {
            label: "Subjects",
            value: subjects.length > 0 ? subjects.join(", ") : "N/A",
          },
        ];
      },
    );
  } catch (error) {
    console.error("Load assigned class details failed:", error);
    alert(error.message || "Failed to load class details.");
  } finally {
    if (loadDetailsButton) {
      loadDetailsButton.disabled = false;
      loadDetailsButton.textContent = originalText;
    }
  }
}

if (loadDetailsButton) {
  loadDetailsButton.addEventListener("click", () => {
    loadAssignedClassDetails();
  });
}
