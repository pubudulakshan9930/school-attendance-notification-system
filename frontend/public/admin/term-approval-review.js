const reviewTitle = document.getElementById("reviewTitle");
const reviewSubtitle = document.getElementById("reviewSubtitle");
const reviewAlert = document.getElementById("reviewAlert");
const reviewMetrics = document.getElementById("reviewMetrics");
const subjectChips = document.getElementById("subjectChips");
const tableWrap = document.getElementById("tableWrap");
const approveButton = document.getElementById("approveButton");
const secondaryApproveButton = document.getElementById(
  "secondaryApproveButton",
);

function getToken() {
  return localStorage.getItem("sureki_token");
}

async function apiFetch(url, options = {}) {
  const token = getToken();
  if (!token) {
    window.location.href = "/index.html";
    throw new Error("Authentication required.");
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || "Request failed.");
  }

  return data;
}

function getReviewParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    classId: params.get("class_id") || params.get("classId") || "",
    term: params.get("term") || "",
    academicYear:
      params.get("academic_year") || params.get("academicYear") || "",
  };
}

function renderMetric(label, value) {
  const metric = document.createElement("div");
  metric.className = "review-metric";

  const labelNode = document.createElement("span");
  labelNode.textContent = label;

  const valueNode = document.createElement("strong");
  valueNode.textContent = value;

  metric.appendChild(labelNode);
  metric.appendChild(valueNode);
  return metric;
}

function formatClassLabel(classInfo) {
  if (!classInfo) {
    return "Unknown class";
  }

  const grade = Number.isFinite(Number(classInfo.grade))
    ? `Grade ${classInfo.grade}`
    : "Class";
  const section = String(classInfo.section || "").trim();
  const stream = String(classInfo.stream || "").trim();

  if (stream) {
    return `${grade} ${stream}`;
  }

  if (section) {
    return `${grade} ${section}`;
  }

  return grade;
}

function renderStudentTable(snapshot) {
  const subjects = snapshot.subjects || [];
  const students = snapshot.students || [];

  subjectChips.innerHTML = "";
  tableWrap.innerHTML = "";

  subjects.forEach((subject) => {
    const chip = document.createElement("span");
    chip.className = "subject-chip";
    chip.textContent = subject.subject_name;
    subjectChips.appendChild(chip);
  });

  const table = document.createElement("table");
  table.className = "term-marks-table pending-approvals-table review-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");

  const rankHead = document.createElement("th");
  rankHead.textContent = "Rank";
  rankHead.style.textAlign = "center";
  rankHead.className = "rank-column";
  headRow.appendChild(rankHead);

  const studentHead = document.createElement("th");
  studentHead.textContent = "Student";
  studentHead.className = "student-column";
  headRow.appendChild(studentHead);

  const totalHead = document.createElement("th");
  totalHead.textContent = "Total Mark";
  totalHead.style.textAlign = "center";
  totalHead.className = "total-column";
  headRow.appendChild(totalHead);

  subjects.forEach((subject) => {
    const th = document.createElement("th");
    th.textContent = subject.subject_name;
    th.style.textAlign = "center";
    headRow.appendChild(th);
  });

  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  students.forEach((student) => {
    const row = document.createElement("tr");

    const rankCell = document.createElement("td");
    rankCell.className = "marks-cell rank-column";
    rankCell.textContent = Number.isFinite(Number(student.rank))
      ? String(student.rank)
      : "-";
    row.appendChild(rankCell);

    const nameCell = document.createElement("td");
    nameCell.className = "student-column";
    nameCell.textContent = `${student.student_name} (${student.student_code || "N/A"})`;
    row.appendChild(nameCell);

    const totalCell = document.createElement("td");
    totalCell.className = "marks-cell total-column";
    totalCell.textContent = Number.isFinite(Number(student.total_mark))
      ? String(student.total_mark)
      : "-";
    row.appendChild(totalCell);

    subjects.forEach((subject) => {
      const cell = document.createElement("td");
      cell.className = "marks-cell";
      const mark = student.marks?.[subject.subject_name];
      cell.textContent = Number.isFinite(Number(mark)) ? String(mark) : "-";
      row.appendChild(cell);
    });

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  tableWrap.appendChild(table);
}

function setAlert(message = "") {
  reviewAlert.textContent = message;
}

async function approveReview(review) {
  const originalText = approveButton.textContent;
  approveButton.disabled = true;
  secondaryApproveButton.disabled = true;
  approveButton.textContent = "Approving...";
  secondaryApproveButton.textContent = "Approving...";

  try {
    await apiFetch("/api/admin/term-marks/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        class_id: review.class_id,
        term: review.term,
        academic_year: review.academic_year,
      }),
    });

    setAlert("Term marks approved and parent SMS processed.");
    approveButton.textContent = "Approved";
    secondaryApproveButton.textContent = "Approved";
    approveButton.disabled = true;
    secondaryApproveButton.disabled = true;
  } catch (error) {
    console.error("Approve term marks failed:", error);
    setAlert(error.message || "Failed to approve term marks.");
    approveButton.disabled = false;
    secondaryApproveButton.disabled = false;
    approveButton.textContent = originalText;
    secondaryApproveButton.textContent = originalText;
  }
}

async function loadReview() {
  const { classId, term, academicYear } = getReviewParams();

  if (!classId || !term || !academicYear) {
    reviewTitle.textContent = "Invalid review link";
    reviewSubtitle.textContent =
      "The class, term, and academic year are required to open this page.";
    setAlert("Missing review parameters.");
    return;
  }

  try {
    const data = await apiFetch(
      `/api/admin/reports/term-tests/review?class_id=${encodeURIComponent(classId)}&term=${encodeURIComponent(term)}&academic_year=${encodeURIComponent(academicYear)}`,
    );

    const snapshot = data.snapshot || {};
    const review = data.review || {};
    const classInfo = snapshot.classInfo || {};
    const classLabel = formatClassLabel(classInfo);
    const subjects = snapshot.subjects || [];
    const students = snapshot.students || [];

    reviewTitle.textContent = `${classLabel} - Term ${snapshot.term || term}`;
    reviewSubtitle.textContent = `Academic year ${snapshot.academicYear || academicYear} • ${review.review_status || "pending"}`;
    setAlert(
      snapshot.complete
        ? ""
        : "This review is incomplete and cannot be approved yet.",
    );

    reviewMetrics.innerHTML = "";
    reviewMetrics.appendChild(renderMetric("Class", classLabel));
    reviewMetrics.appendChild(
      renderMetric("Term", String(snapshot.term || term)),
    );
    reviewMetrics.appendChild(
      renderMetric(
        "Academic year",
        String(snapshot.academicYear || academicYear),
      ),
    );
    reviewMetrics.appendChild(
      renderMetric("Students", String(students.length)),
    );
    reviewMetrics.appendChild(
      renderMetric("Subjects", String(subjects.length)),
    );
    reviewMetrics.appendChild(
      renderMetric("Status", review.review_status || "pending"),
    );

    renderStudentTable(snapshot);

    const canApprove =
      snapshot.complete &&
      (review.review_status === "pending" ||
        review.review_status === "notified");
    approveButton.style.display = canApprove ? "inline-flex" : "none";
    secondaryApproveButton.style.display = canApprove ? "inline-flex" : "none";

    approveButton.disabled = !canApprove;
    secondaryApproveButton.disabled = !canApprove;

    approveButton.onclick = () => approveReview(review);
    secondaryApproveButton.onclick = () => approveReview(review);
  } catch (error) {
    console.error("Load term marks review failed:", error);
    reviewTitle.textContent = "Failed to load review";
    reviewSubtitle.textContent =
      "Please return to the admin dashboard and try again.";
    setAlert(error.message || "Failed to load term marks review details.");
  }
}

loadReview();
