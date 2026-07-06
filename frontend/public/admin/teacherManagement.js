/**
 * Teacher Management Module
 * Handles viewing, editing, and managing all teachers in a separate module
 * to keep admin.js clean and organized.
 */

const TEACHER_MANAGEMENT_API = "/api/admin/teachers";

class TeacherManagement {
  constructor() {
    this.teachers = [];
    this.filteredTeachers = [];
    this.getToken = this.getToken.bind(this);
    this.apiFetch = this.apiFetch.bind(this);
  }

  /**
   * Get authentication token from localStorage
   * @returns {string} The authentication token
   */
  getToken() {
    return localStorage.getItem("sureki_token");
  }

  /**
   * Wrapper for fetch with authentication
   * @param {string} url - API endpoint URL
   * @param {object} options - Fetch options
   * @returns {Promise<object>} Parsed JSON response
   */
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

  /**
   * Fetch all teachers from the API
   * @returns {Promise<void>}
   */
  async loadAllTeachers() {
    try {
      const data = await this.apiFetch(TEACHER_MANAGEMENT_API);
      this.teachers = data.teachers || [];
      this.filteredTeachers = [...this.teachers];
      return this.teachers;
    } catch (error) {
      console.error("Failed to load teachers:", error);
      throw error;
    }
  }

  /**
   * Render all teachers in a detailed table view
   * @param {HTMLElement} container - DOM container to render teachers into
   */
  renderTeachersList(container) {
    if (!container) {
      console.warn("Container element not found for teachers list");
      return;
    }

    container.innerHTML = "";

    if (this.filteredTeachers.length === 0) {
      const emptyState = document.createElement("div");
      emptyState.className = "empty-state-container";
      emptyState.innerHTML = `
        <p class="empty-state-text">No teachers found.</p>
      `;
      container.appendChild(emptyState);
      return;
    }

    // Create table
    const table = document.createElement("table");
    table.className = "teachers-table";

    // Table header
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const headers = [
      "Name",
      "Teacher Code",
      "Email",
      "Phone",
      "Assigned Class",
      "Status",
      "Actions",
    ];

    headers.forEach((header) => {
      const th = document.createElement("th");
      th.textContent = header;
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Table body
    const tbody = document.createElement("tbody");

    this.filteredTeachers.forEach((teacher) => {
      const row = document.createElement("tr");
      row.className = "teacher-row";
      row.dataset.teacherId = teacher.id;

      // Name
      const nameCell = document.createElement("td");
      nameCell.className = "teacher-name";
      nameCell.textContent = teacher.full_name;
      row.appendChild(nameCell);

      // Teacher Code
      const codeCell = document.createElement("td");
      codeCell.className = "teacher-code";
      codeCell.textContent = teacher.teacher_code || "N/A";
      row.appendChild(codeCell);

      // Email
      const emailCell = document.createElement("td");
      emailCell.className = "teacher-email";
      emailCell.textContent = teacher.email || "N/A";
      row.appendChild(emailCell);

      // Phone
      const phoneCell = document.createElement("td");
      phoneCell.className = "teacher-phone";
      phoneCell.textContent = teacher.phone || "N/A";
      row.appendChild(phoneCell);

      // Assigned Class
      const classCell = document.createElement("td");
      classCell.className = "teacher-class";
      const classLabel = teacher.class_label || "N/A";
      classCell.textContent = classLabel;
      row.appendChild(classCell);

      // Status
      const statusCell = document.createElement("td");
      statusCell.className = "teacher-status";
      const statusBadge = document.createElement("span");
      statusBadge.className = `status-badge status-${teacher.is_active ? "active" : "inactive"}`;
      statusBadge.textContent = teacher.is_active ? "Active" : "Inactive";
      statusCell.appendChild(statusBadge);
      row.appendChild(statusCell);

      // Actions
      const actionsCell = document.createElement("td");
      actionsCell.className = "teacher-actions";
      const actionsContainer = document.createElement("div");
      actionsContainer.className = "actions-group";

      // View button
      const viewBtn = document.createElement("button");
      viewBtn.className = "action-btn action-view";
      viewBtn.title = "View details";
      viewBtn.innerHTML = "👁️";
      viewBtn.addEventListener("click", () => this.showTeacherDetails(teacher));
      actionsContainer.appendChild(viewBtn);

      // Edit button
      const editBtn = document.createElement("button");
      editBtn.className = "action-btn action-edit";
      editBtn.title = "Edit teacher";
      editBtn.innerHTML = "✏️";
      editBtn.addEventListener("click", () => this.editTeacher(teacher));
      actionsContainer.appendChild(editBtn);

      // Delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "action-btn action-delete";
      deleteBtn.title = "Delete teacher";
      deleteBtn.innerHTML = "🗑️";
      deleteBtn.addEventListener("click", () =>
        this.deleteTeacher(teacher.id, teacher.full_name),
      );
      actionsContainer.appendChild(deleteBtn);

      actionsCell.appendChild(actionsContainer);
      row.appendChild(actionsCell);

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);
  }

  /**
   * Show teacher details in a modal or panel
   * @param {object} teacher - Teacher object to display
   */
  showTeacherDetails(teacher) {
    const detailsHtml = `
      <div class="teacher-detail-panel">
        <div class="detail-section">
          <h4>Personal Information</h4>
          <div class="detail-row">
            <span class="detail-label">Name:</span>
            <span class="detail-value">${teacher.full_name}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Teacher Code:</span>
            <span class="detail-value">${teacher.teacher_code || "N/A"}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Email:</span>
            <span class="detail-value">${teacher.email || "N/A"}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Phone:</span>
            <span class="detail-value">${teacher.phone || "N/A"}</span>
          </div>
        </div>

        <div class="detail-section">
          <h4>Assignment</h4>
          <div class="detail-row">
            <span class="detail-label">Class:</span>
            <span class="detail-value">${teacher.class_label || "Not assigned"}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Status:</span>
            <span class="detail-value">
              <span class="status-badge status-${teacher.is_active ? "active" : "inactive"}">
                ${teacher.is_active ? "Active" : "Inactive"}
              </span>
            </span>
          </div>
        </div>

        <div class="detail-section">
          <h4>Additional Info</h4>
          <div class="detail-row">
            <span class="detail-label">Registered On:</span>
            <span class="detail-value">${this.formatDate(teacher.created_at)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Last Updated:</span>
            <span class="detail-value">${this.formatDate(teacher.updated_at)}</span>
          </div>
        </div>
      </div>
    `;

    alert(
      `Teacher Details:\n\n${teacher.full_name}\nCode: ${teacher.teacher_code || "N/A"}\nEmail: ${teacher.email || "N/A"}\nClass: ${teacher.class_label || "Not assigned"}\nStatus: ${teacher.is_active ? "Active" : "Inactive"}`,
    );
  }

  /**
   * Edit teacher information
   * @param {object} teacher - Teacher to edit
   */
  editTeacher(teacher) {
    // Open modal and prefill form
    const modalId = "teacherEditModal";
    const editForm = document.getElementById("teacherEditForm");
    const editId = document.getElementById("editTeacherId");
    const editFullName = document.getElementById("editFullName");
    const editTeacherCode = document.getElementById("editTeacherCode");
    const editEmail = document.getElementById("editEmail");
    const editPhone = document.getElementById("editPhone");
    const editIsActive = document.getElementById("editIsActive");

    if (!editForm || !editId) {
      alert("Edit form not found.");
      return;
    }

    editId.value = teacher.id;
    editFullName.value = teacher.full_name || "";
    editTeacherCode.value = teacher.teacher_code || "";
    editEmail.value = teacher.email || "";
    editPhone.value = teacher.phone || "";
    editIsActive.checked = !!teacher.is_active;

    // Use existing modal helpers from admin.js
    if (typeof openModal === "function") {
      openModal(modalId);
    } else {
      document.getElementById(modalId).style.display = "block";
    }

    // Submit handler
    const submitHandler = async (e) => {
      e.preventDefault();
      const payload = {
        full_name: editFullName.value.trim(),
        teacher_code: editTeacherCode.value.trim(),
        email: editEmail.value.trim(),
        phone: editPhone.value.trim(),
        is_active: editIsActive.checked,
      };

      try {
        const res = await this.apiFetch(
          `${TEACHER_MANAGEMENT_API}/${encodeURIComponent(teacher.id)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );

        const updated = res.teacher || res;
        const idx = this.teachers.findIndex(
          (t) => String(t.id) === String(teacher.id),
        );
        if (idx !== -1) {
          this.teachers[idx] = { ...this.teachers[idx], ...updated };
        }
        this.filteredTeachers = [...this.teachers];
        const container = document.getElementById("allTeachersList");
        if (container) this.renderTeachersList(container);

        if (typeof closeModal === "function") {
          closeModal(modalId);
        } else {
          document.getElementById(modalId).style.display = "none";
        }

        editForm.removeEventListener("submit", submitHandler);
        alert("Teacher updated successfully.");
      } catch (err) {
        console.error("Failed to update teacher:", err);
        alert(err.message || "Failed to update teacher.");
      }
    };

    // Replace any previous submit handler to avoid duplicate submissions
    editForm.onsubmit = submitHandler;
  }

  /**
   * Delete a teacher
   * @param {number} teacherId - ID of teacher to delete
   * @param {string} teacherName - Name of teacher for confirmation
   */
  async deleteTeacher(teacherId, teacherName) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${teacherName}? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await this.apiFetch(
        `${TEACHER_MANAGEMENT_API}/${encodeURIComponent(teacherId)}`,
        {
          method: "DELETE",
        },
      );

      alert(`${teacherName} has been deleted successfully.`);
      await this.loadAllTeachers();
      // Refresh the display
      const container = document.getElementById("allTeachersList");
      if (container) {
        this.renderTeachersList(container);
      }
    } catch (error) {
      alert(`Failed to delete teacher: ${error.message}`);
    }
  }

  /**
   * Filter teachers by search term
   * @param {string} searchTerm - Term to search for
   */
  searchTeachers(searchTerm) {
    const term = searchTerm.toLowerCase();
    this.filteredTeachers = this.teachers.filter(
      (teacher) =>
        teacher.full_name.toLowerCase().includes(term) ||
        teacher.email.toLowerCase().includes(term) ||
        teacher.teacher_code.toLowerCase().includes(term),
    );
  }

  /**
   * Filter teachers by class
   * @param {string} classLabel - Class to filter by
   */
  filterByClass(classLabel) {
    if (!classLabel) {
      this.filteredTeachers = [...this.teachers];
      return;
    }

    this.filteredTeachers = this.teachers.filter(
      (teacher) => teacher.class_label === classLabel,
    );
  }

  /**
   * Filter teachers by status
   * @param {string} status - "active" or "inactive"
   */
  filterByStatus(status) {
    if (!status) {
      this.filteredTeachers = [...this.teachers];
      return;
    }

    const isActive = status === "active";
    this.filteredTeachers = this.teachers.filter(
      (teacher) => teacher.is_active === isActive,
    );
  }

  /**
   * Format date string
   * @param {string} dateString - Date to format
   * @returns {string} Formatted date
   */
  formatDate(dateString) {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  }

  /**
   * Export teachers data as CSV
   * @returns {void}
   */
  exportToCSV() {
    if (this.filteredTeachers.length === 0) {
      alert("No teachers to export.");
      return;
    }

    const headers = [
      "Full Name",
      "Teacher Code",
      "Email",
      "Phone",
      "Assigned Class",
      "Status",
      "Registered On",
    ];

    const rows = this.filteredTeachers.map((teacher) => [
      teacher.full_name,
      teacher.teacher_code || "N/A",
      teacher.email || "N/A",
      teacher.phone || "N/A",
      teacher.class_label || "Not assigned",
      teacher.is_active ? "Active" : "Inactive",
      this.formatDate(teacher.created_at),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) =>
            typeof cell === "string" && cell.includes(",") ? `"${cell}"` : cell,
          )
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `teachers-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

// Initialize and export the module
const teacherMgmt = new TeacherManagement();
