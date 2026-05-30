const TOKEN_KEY = "sureki_token";

const loadDetailsButton = document.getElementById("loadDetailsButton");
const classMetaList = document.getElementById("classMetaList");
const studentsList = document.getElementById("studentsList");

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
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
    const message =
      payload && typeof payload === "object" && payload.error
        ? payload.error
        : "Request failed.";
    throw new Error(message);
  }

  return payload;
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

function createEditForm(student) {
  const form = document.createElement("form");
  form.className = "edit-form";
  form.noValidate = true;
  form.innerHTML = `
    <div class="form-field">
      <label>Student Name *</label>
      <input type="text" name="full_name" value="${(student.full_name || "").replace(/"/g, "&quot;")}" required />
    </div>
    <div class="form-field">
      <label>Parent Name *</label>
      <input type="text" name="parent_name" value="${(student.parent_name || "").replace(/"/g, "&quot;")}" required />
    </div>
    <div class="form-field">
      <label>Parent Phone *</label>
      <input type="tel" name="parent_phone" value="${(student.parent_phone || "").replace(/"/g, "&quot;")}" required />
    </div>
    <div class="form-field">
      <label>Parent Email</label>
      <input type="email" name="parent_email" value="${(student.parent_email || "").replace(/"/g, "&quot;")}" />
    </div>
    <div class="form-field">
      <label>City</label>
      <input type="text" name="city" value="${(student.city || "").replace(/"/g, "&quot;")}" />
    </div>
    <div class="form-field">
      <label>Address</label>
      <input type="text" name="address" value="${(student.address || "").replace(/"/g, "&quot;")}" />
    </div>
    <div class="form-actions">
      <button type="button" class="save-button" data-student-id="${student.id}">Save Changes</button>
      <button type="button" class="cancel-button">Cancel</button>
    </div>
  `;
  return form;
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

    // Add edit button for students
    if (item.student_id) {
      const editRow = document.createElement("div");
      editRow.className = "detail-line";
      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "edit-button";
      editBtn.textContent = "Edit";
      editBtn.dataset.studentId = item.student_id;
      editRow.appendChild(editBtn);
      listItem.appendChild(editRow);

      // Add edit form
      const form = createEditForm(item);
      listItem.appendChild(form);

      // Event listeners
      editBtn.addEventListener("click", () => {
        form.classList.add("active");
        editBtn.style.display = "none";
      });

      const cancelBtn = form.querySelector(".cancel-button");
      cancelBtn.addEventListener("click", () => {
        form.classList.remove("active");
        editBtn.style.display = "block";
      });

      const saveBtn = form.querySelector(".save-button");
      saveBtn.addEventListener("click", async () => {
        await handleSaveStudent(item.student_id, form, editBtn);
      });
    }

    container.appendChild(listItem);
  });
}

async function handleSaveStudent(studentId, form, editBtn) {
  const saveBtn = form.querySelector(".save-button");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    const formData = new FormData(form);
    const payload = {
      full_name: formData.get("full_name")?.trim(),
      parent_name: formData.get("parent_name")?.trim(),
      parent_phone: formData.get("parent_phone")?.trim(),
      parent_email: formData.get("parent_email")?.trim() || null,
      city: formData.get("city")?.trim() || null,
      address: formData.get("address")?.trim() || null,
    };

    // Validate required fields
    if (!payload.full_name || !payload.parent_name || !payload.parent_phone) {
      alert("Student name, parent name, and parent phone are required.");
      return;
    }

    const response = await apiFetch(`/api/teacher/students/${studentId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.success) {
      alert("Student details updated successfully.");
      form.classList.remove("active");
      editBtn.style.display = "block";
      // Reload to show updated data
      await loadAssignedClassDetails();
    } else {
      alert(response.error || "Failed to update student details.");
    }
  } catch (error) {
    console.error("Save student error:", error);
    alert(error.message || "Failed to save changes.");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Changes";
  }
}

async function loadAssignedClassDetails() {
  const token = localStorage.getItem("sureki_token");
  if (!token) {
    window.location.href = "/index.html";
    return;
  }

  const originalText = loadDetailsButton
    ? loadDetailsButton.textContent
    : "Load Details";

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
      const totalEl = document.getElementById("totalStudents");
      if (totalEl) {
        totalEl.textContent = `Total students: 0`;
      }
      renderDetailsList(
        classMetaList,
        [],
        "No active class assigned.",
        () => "",
      );
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
    // Update total students count in the UI
    const totalEl = document.getElementById("totalStudents");
    const totalCount = (data.students || []).length;
    if (totalEl) {
      totalEl.textContent = `Total students: ${totalCount}`;
    }

    renderDetailsList(
      studentsList,
      data.students || [],
      "No students found for your assigned class.",
      (student) => {
        const subjects = (student.subjects || []).map(
          (subject) => subject.name,
        );
        return [
          {
            label: "Student Code",
            value: student.student_code || "N/A",
          },
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
            label: "City",
            value: student.city || "N/A",
          },
          {
            label: "Address",
            value: student.address || "N/A",
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

    // Store student_id for edit functionality
    const studentsWithId = (data.students || []).map((student) => ({
      ...student,
      student_id: student.id,
    }));

    // Re-render with edit buttons
    renderDetailsList(
      studentsList,
      studentsWithId,
      "No students found for your assigned class.",
      (student) => {
        const subjects = (student.subjects || []).map(
          (subject) => subject.name,
        );
        return [
          {
            label: "Student Code",
            value: student.student_code || "N/A",
          },
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
            label: "City",
            value: student.city || "N/A",
          },
          {
            label: "Address",
            value: student.address || "N/A",
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

// Auto-load student details when page loads
loadAssignedClassDetails();
