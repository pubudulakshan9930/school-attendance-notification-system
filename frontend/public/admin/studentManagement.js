/**
 * Student Management Module
 * Handles viewing and editing all registered students in a separate module
 * to keep the main admin dashboard script focused.
 */

const STUDENT_MANAGEMENT_API = "/api/admin/students";

class StudentManagement {
  constructor() {
    this.students = [];
    this.filteredStudents = [];
    this.searchTerm = "";
    this.statusFilter = "";
  }

  getToken() {
    return localStorage.getItem("sureki_token");
  }

  async apiFetch(url, options = {}) {
    const token = this.getToken();
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

  normalizeStudentResponse(payload) {
    if (Array.isArray(payload)) {
      return payload;
    }

    return payload.students || payload.data || [];
  }

  async loadAllStudents() {
    const data = await this.apiFetch(STUDENT_MANAGEMENT_API, {
      method: "GET",
    });
    this.students = this.normalizeStudentResponse(data);
    this.applyFilters();
    return this.students;
  }

  applyFilters() {
    const search = this.searchTerm.trim().toLowerCase();
    this.filteredStudents = this.students.filter((student) => {
      if (
        this.statusFilter &&
        ((this.statusFilter === "active" && !student.is_active) ||
          (this.statusFilter === "inactive" && student.is_active))
      ) {
        return false;
      }

      if (!search) {
        return true;
      }

      const haystack = [
        student.student_code,
        student.full_name,
        student.parent_name,
        student.parent_phone,
        student.parent_email,
        student.gender,
        student.city,
        student.address,
        this.formatClassLabel(student),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });
  }

  renderStudentsList(container) {
    if (!container) {
      return;
    }

    container.innerHTML = "";

    if (this.filteredStudents.length === 0) {
      const emptyState = document.createElement("div");
      emptyState.className = "empty-state-container";
      emptyState.innerHTML = `
        <p class="empty-state-text">No students found.</p>
      `;
      container.appendChild(emptyState);
      return;
    }

    const table = document.createElement("table");
    table.className = "students-table";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    [
      "Student Code",
      "Student",
      "Parent",
      "Contact",
      "Location",
      "Class",
      "Status",
      "Actions",
    ].forEach((header) => {
      const th = document.createElement("th");
      th.textContent = header;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    this.filteredStudents.forEach((student) => {
      const row = document.createElement("tr");
      row.dataset.studentId = student.id;

      const codeCell = document.createElement("td");
      codeCell.className = "student-code";
      codeCell.textContent = student.student_code || "N/A";
      row.appendChild(codeCell);

      const nameCell = document.createElement("td");
      nameCell.className = "student-name";
      nameCell.innerHTML = `
        <div>${this.escapeText(student.full_name || "N/A")}</div>
        <div class="student-subtext">${this.escapeText(student.gender || "No gender")}</div>
      `;
      row.appendChild(nameCell);

      const parentCell = document.createElement("td");
      parentCell.className = "student-contact";
      parentCell.innerHTML = `
        <div>${this.escapeText(student.parent_name || "N/A")}</div>
        <div class="student-subtext">${this.escapeText(student.parent_email || "No email")}</div>
      `;
      row.appendChild(parentCell);

      const contactCell = document.createElement("td");
      contactCell.className = "student-contact";
      contactCell.innerHTML = `
        <div>${this.escapeText(student.parent_phone || "N/A")}</div>
        <div class="student-subtext">Updated ${this.formatDate(student.updated_at)}</div>
      `;
      row.appendChild(contactCell);

      const locationCell = document.createElement("td");
      locationCell.className = "student-location";
      locationCell.innerHTML = `
        <div>${this.escapeText(student.city || "N/A")}</div>
        <div class="student-subtext">${this.escapeText(student.address || "No address")}</div>
      `;
      row.appendChild(locationCell);

      const classCell = document.createElement("td");
      classCell.className = "student-class";
      classCell.innerHTML = `
        <div>${this.escapeText(this.formatClassLabel(student))}</div>
        <div class="student-subtext">${this.escapeText(student.teacher_name || "No teacher")}</div>
      `;
      row.appendChild(classCell);

      const statusCell = document.createElement("td");
      statusCell.className = "teacher-status";
      const statusBadge = document.createElement("span");
      statusBadge.className = `status-badge status-${student.is_active ? "active" : "inactive"}`;
      statusBadge.textContent = student.is_active ? "Active" : "Inactive";
      statusCell.appendChild(statusBadge);
      row.appendChild(statusCell);

      const actionsCell = document.createElement("td");
      actionsCell.className = "student-actions";
      const actionsGroup = document.createElement("div");
      actionsGroup.className = "actions-group";

      const editButton = document.createElement("button");
      editButton.className = "action-btn action-edit";
      editButton.type = "button";
      editButton.title = "Edit student";
      editButton.innerHTML = "✏️";
      editButton.addEventListener("click", () => this.editStudent(student));
      actionsGroup.appendChild(editButton);

      const deleteButton = document.createElement("button");
      deleteButton.className = "action-btn action-delete";
      deleteButton.type = "button";
      deleteButton.title = "Delete student";
      deleteButton.innerHTML = "🗑️";
      deleteButton.addEventListener("click", () => this.deleteStudent(student));
      actionsGroup.appendChild(deleteButton);

      actionsCell.appendChild(actionsGroup);
      row.appendChild(actionsCell);

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);
  }

  formatClassLabel(student) {
    const grade = student.grade || student.current_grade;
    const section = student.section || student.current_section;
    const stream = student.stream || student.current_stream;
    const academicYear = student.academic_year || student.current_academic_year;

    if (!grade) {
      return "Not assigned";
    }

    const parts = [`Grade ${grade}`];
    if (stream) {
      parts.push(`Stream ${stream}`);
    }
    if (section) {
      parts.push(`Section ${section}`);
    }
    if (academicYear) {
      parts.push(`${academicYear}`);
    }

    return parts.join(" | ");
  }

  formatDate(dateString) {
    if (!dateString) {
      return "N/A";
    }

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return "N/A";
    }

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  escapeText(value) {
    return String(value || "").replace(/[&<>\"']/g, (character) => {
      const replacements = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return replacements[character] || character;
    });
  }

  editStudent(student) {
    const modalId = "studentEditModal";
    const editForm = document.getElementById("studentEditForm");
    const editId = document.getElementById("editStudentId");
    const editCode = document.getElementById("editStudentCode");
    const editFullName = document.getElementById("editStudentFullName");
    const editParentName = document.getElementById("editStudentParentName");
    const editParentPhone = document.getElementById("editStudentParentPhone");
    const editParentEmail = document.getElementById("editStudentParentEmail");
    const editGender = document.getElementById("editStudentGender");
    const editCity = document.getElementById("editStudentCity");
    const editAddress = document.getElementById("editStudentAddress");
    const editIsActive = document.getElementById("editStudentIsActive");

    if (!editForm || !editId) {
      alert("Edit form not found.");
      return;
    }

    editId.value = student.id;
    editCode.value = student.student_code || "";
    editFullName.value = student.full_name || "";
    editParentName.value = student.parent_name || "";
    editParentPhone.value = student.parent_phone || "";
    editParentEmail.value = student.parent_email || "";
    editGender.value = student.gender || "";
    editCity.value = student.city || "";
    editAddress.value = student.address || "";
    editIsActive.checked = !!student.is_active;

    if (typeof openModal === "function") {
      openModal(modalId);
    } else {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.style.display = "block";
      }
    }

    const submitHandler = async (event) => {
      event.preventDefault();

      const payload = {
        student_code: editCode.value.trim(),
        full_name: editFullName.value.trim(),
        parent_name: editParentName.value.trim(),
        parent_phone: editParentPhone.value.trim(),
        parent_email: editParentEmail.value.trim(),
        gender: editGender.value.trim(),
        city: editCity.value.trim(),
        address: editAddress.value.trim(),
        is_active: editIsActive.checked,
      };

      if (
        !payload.student_code ||
        !payload.full_name ||
        !payload.parent_name ||
        !payload.parent_phone
      ) {
        alert(
          "Student code, full name, parent name, and parent phone are required.",
        );
        return;
      }

      try {
        const response = await this.apiFetch(
          `${STUDENT_MANAGEMENT_API}/${encodeURIComponent(student.id)}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
        );

        const updatedStudent = response.student || response;
        const index = this.students.findIndex(
          (item) => String(item.id) === String(student.id),
        );
        if (index !== -1) {
          this.students[index] = { ...this.students[index], ...updatedStudent };
        }

        this.applyFilters();
        this.renderStudentsList(document.getElementById("allStudentsList"));

        if (typeof closeModal === "function") {
          closeModal(modalId);
        } else {
          const modal = document.getElementById(modalId);
          if (modal) {
            modal.style.display = "none";
          }
        }

        editForm.onsubmit = null;
        alert("Student updated successfully.");
      } catch (error) {
        console.error("Failed to update student:", error);
        alert(error.message || "Failed to update student.");
      }
    };

    editForm.onsubmit = submitHandler;
  }

  async deleteStudent(student) {
    const confirmed = window.confirm(
      `Delete ${student.full_name}? This will permanently remove the student and related records.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await this.apiFetch(
        `${STUDENT_MANAGEMENT_API}/${encodeURIComponent(student.id)}`,
        {
          method: "DELETE",
        },
      );

      this.students = this.students.filter(
        (item) => String(item.id) !== String(student.id),
      );
      this.applyFilters();
      this.renderStudentsList(document.getElementById("allStudentsList"));
      alert("Student deleted successfully.");
    } catch (error) {
      console.error("Failed to delete student:", error);
      alert(error.message || "Failed to delete student.");
    }
  }

  searchStudents(searchTerm) {
    this.searchTerm = searchTerm || "";
    this.applyFilters();
  }

  filterByStatus(status) {
    this.statusFilter = status || "";
    this.applyFilters();
  }

  exportToCSV() {
    if (this.filteredStudents.length === 0) {
      alert("No students to export.");
      return;
    }

    const headers = [
      "Student Code",
      "Full Name",
      "Parent Name",
      "Parent Phone",
      "Parent Email",
      "Gender",
      "City",
      "Address",
      "Class",
      "Status",
      "Registered On",
    ];

    const rows = this.filteredStudents.map((student) => [
      student.student_code || "N/A",
      student.full_name || "N/A",
      student.parent_name || "N/A",
      student.parent_phone || "N/A",
      student.parent_email || "N/A",
      student.gender || "N/A",
      student.city || "N/A",
      student.address || "N/A",
      this.formatClassLabel(student),
      student.is_active ? "Active" : "Inactive",
      this.formatDate(student.created_at),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) => {
            const value = String(cell ?? "");
            return `"${value.replace(/"/g, '""')}"`;
          })
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `students-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(anchor);
  }
}

const studentMgmt = new StudentManagement();

const studentSearchInput = document.getElementById("studentSearchInput");
const studentStatusFilter = document.getElementById("studentStatusFilter");
const exportStudentsBtn = document.getElementById("exportStudentsBtn");

document.addEventListener("click", async (event) => {
  const tabButton = event.target.closest(".admin-tab");
  if (tabButton && tabButton.dataset.tab === "view-students") {
    try {
      await studentMgmt.loadAllStudents();
      studentMgmt.renderStudentsList(
        document.getElementById("allStudentsList"),
      );
    } catch (error) {
      console.error("Failed to load students:", error);
      alert("Failed to load students. Please try again.");
    }
  }
});

if (studentSearchInput) {
  studentSearchInput.addEventListener("input", (event) => {
    studentMgmt.searchStudents(event.target.value);
    studentMgmt.renderStudentsList(document.getElementById("allStudentsList"));
  });
}

if (studentStatusFilter) {
  studentStatusFilter.addEventListener("change", (event) => {
    studentMgmt.filterByStatus(event.target.value);
    studentMgmt.renderStudentsList(document.getElementById("allStudentsList"));
  });
}

if (exportStudentsBtn) {
  exportStudentsBtn.addEventListener("click", () => {
    studentMgmt.exportToCSV();
  });
}
