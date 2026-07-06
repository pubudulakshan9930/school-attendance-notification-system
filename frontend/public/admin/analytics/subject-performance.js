const SUBJECT_PERFORMANCE_FILTERS_API =
  "/api/admin/analytics/subject-performance/filters";
const SUBJECT_PERFORMANCE_API = "/api/admin/analytics/subject-performance";
const analyticsPanel = document.getElementById("analytics");
const subjectPerformanceCanvas = document.getElementById(
  "subjectPerformanceChart",
);
const subjectPerformanceStatus = document.getElementById(
  "subjectPerformanceStatus",
);
const subjectPerformanceCaption = document.getElementById(
  "subjectPerformanceCaption",
);
const subjectPerformanceLoadingState = document.getElementById(
  "subjectPerformanceLoading",
);
const subjectPerformanceEmptyState = document.getElementById(
  "subjectPerformanceEmptyState",
);
const academicYearSelect = document.getElementById(
  "subjectPerformanceAcademicYear",
);
const gradeSelect = document.getElementById("subjectPerformanceGrade");
const classSelect = document.getElementById("subjectPerformanceClass");
const termSelect = document.getElementById("subjectPerformanceTerm");

let chartInstance = null;
let hasLoaded = false;
let loadingPromise = null;
let filterState = {
  academicYear: "",
  grade: "",
  classId: "",
  term: "",
};

function setStatus(message) {
  if (subjectPerformanceStatus) {
    subjectPerformanceStatus.textContent = message;
  }
}

function setLoadingState(isLoading) {
  if (subjectPerformanceLoadingState) {
    subjectPerformanceLoadingState.classList.toggle("is-hidden", !isLoading);
  }
}

function setEmptyState(isEmpty) {
  if (subjectPerformanceEmptyState) {
    subjectPerformanceEmptyState.classList.toggle("is-hidden", !isEmpty);
  }
}

function getSelectedValue(selectElement) {
  if (!selectElement) {
    return "";
  }

  return String(selectElement.value || "").trim();
}

function updateFilterStateFromControls() {
  filterState = {
    academicYear: getSelectedValue(academicYearSelect),
    grade: getSelectedValue(gradeSelect),
    classId: getSelectedValue(classSelect),
    term: getSelectedValue(termSelect),
  };
}

function buildSelectOptions(
  selectElement,
  options,
  valueKey,
  labelKey,
  emptyLabel,
) {
  if (!selectElement) {
    return;
  }

  const previousValue = selectElement.value;
  selectElement.innerHTML = "";

  if (emptyLabel) {
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = emptyLabel;
    selectElement.appendChild(emptyOption);
  }

  options.forEach((option) => {
    const element = document.createElement("option");
    element.value = String(option[valueKey]);
    element.textContent = String(option[labelKey]);
    selectElement.appendChild(element);
  });

  if (
    previousValue &&
    Array.from(selectElement.options).some(
      (option) => option.value === previousValue,
    )
  ) {
    selectElement.value = previousValue;
  } else if (selectElement.options.length > 1) {
    selectElement.value = selectElement.options[1].value;
  }
}

async function fetchFilterOptions() {
  const apiFetch = window.apiFetch;
  if (typeof apiFetch !== "function") {
    throw new Error("Admin API helper is unavailable.");
  }

  const params = new URLSearchParams();
  if (filterState.academicYear) {
    params.set("academic_year", filterState.academicYear);
  }
  if (filterState.grade) {
    params.set("grade", filterState.grade);
  }

  const response = await apiFetch(
    `${SUBJECT_PERFORMANCE_FILTERS_API}${params.toString() ? `?${params.toString()}` : ""}`,
    { method: "GET" },
  );

  return response.data || {};
}

function syncFilterControls(filters) {
  const academicYears = (filters.academic_years || []).map((value) => ({
    value,
    label: value,
  }));
  const grades = (filters.grades || []).map((value) => ({
    value,
    label: value,
  }));
  const classes = (filters.classes || []).map((item) => ({
    value: item.id,
    label: item.label,
  }));
  const terms = (filters.terms || []).map((item) => ({
    value: item.value,
    label: item.label,
  }));

  buildSelectOptions(
    academicYearSelect,
    academicYears,
    "value",
    "label",
    "All Years",
  );
  buildSelectOptions(gradeSelect, grades, "value", "label", "All Grades");
  buildSelectOptions(classSelect, classes, "value", "label", "Select Class");
  buildSelectOptions(termSelect, terms, "value", "label", "Select Term");

  if (filterState.academicYear) {
    academicYearSelect.value = filterState.academicYear;
  }
  if (filterState.grade) {
    gradeSelect.value = filterState.grade;
  }
  if (filterState.classId) {
    classSelect.value = filterState.classId;
  }
  if (!filterState.term && termSelect.options.length > 1) {
    termSelect.value = termSelect.options[1].value;
  }

  filterState.academicYear = getSelectedValue(academicYearSelect);
  filterState.grade = getSelectedValue(gradeSelect);
  filterState.classId = getSelectedValue(classSelect);
  filterState.term = getSelectedValue(termSelect);
}

async function fetchSubjectPerformanceSeries() {
  const apiFetch = window.apiFetch;
  if (typeof apiFetch !== "function") {
    throw new Error("Admin API helper is unavailable.");
  }

  const params = new URLSearchParams();
  if (filterState.academicYear) {
    params.set("academic_year", filterState.academicYear);
  }
  if (filterState.grade) {
    params.set("grade", filterState.grade);
  }
  if (filterState.classId) {
    params.set("class_id", filterState.classId);
  }
  if (filterState.term) {
    params.set("term", filterState.term);
  }

  const response = await apiFetch(
    `${SUBJECT_PERFORMANCE_API}${params.toString() ? `?${params.toString()}` : ""}`,
    { method: "GET" },
  );

  return response.data?.series || [];
}

function buildChart(series) {
  if (!subjectPerformanceCanvas || typeof window.Chart !== "function") {
    return;
  }

  const labels = series.map((row) => String(row.subject || ""));
  const values = series.map((row) => Number(row.average_marks || 0));

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new window.Chart(subjectPerformanceCanvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Average Marks",
          data: values,
          backgroundColor: "rgba(16, 34, 61, 0.85)",
          borderColor: "#10223d",
          borderWidth: 1,
          borderRadius: 6,
          maxBarThickness: 38,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: true,
          text: "Average Subject Marks",
          color: "#10223d",
          font: {
            size: 14,
            weight: "600",
          },
          padding: {
            bottom: 10,
          },
        },
        tooltip: {
          callbacks: {
            label(context) {
              return `Average Marks: ${Number(context.parsed.y || 0).toFixed(2)}`;
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Subject",
            color: "#10223d",
          },
          ticks: {
            color: "#64748b",
          },
          grid: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          suggestedMax: 100,
          title: {
            display: true,
            text: "Average Marks",
            color: "#10223d",
          },
          ticks: {
            color: "#64748b",
            callback(value) {
              return `${value}`;
            },
          },
        },
      },
    },
  });
}

async function loadSubjectPerformanceChart() {
  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      setStatus("Loading data...");
      setLoadingState(true);
      setEmptyState(false);
      updateFilterStateFromControls();

      const [filters, series] = await Promise.all([
        fetchFilterOptions(),
        fetchSubjectPerformanceSeries(),
      ]);

      syncFilterControls(filters);
      updateFilterStateFromControls();

      if (subjectPerformanceCaption) {
        subjectPerformanceCaption.textContent = filterState.classId
          ? `Showing results for ${filterState.classId ? "the selected class" : "the selected filters"}.`
          : "Select a class to view the chart.";
      }

      if (!series.length) {
        setLoadingState(false);
        setEmptyState(true);
        setStatus("No data");
        if (chartInstance) {
          chartInstance.destroy();
          chartInstance = null;
        }
        if (subjectPerformanceCaption) {
          subjectPerformanceCaption.textContent =
            "No subject performance data available for the selected filters.";
        }
        hasLoaded = true;
        return;
      }

      buildChart(series);
      hasLoaded = true;
      setStatus("Loaded");
      setLoadingState(false);
      setEmptyState(false);
    } catch (error) {
      console.error("Subject performance analytics load failed:", error);
      setStatus("Failed to load");
      setLoadingState(false);
      setEmptyState(false);
      if (subjectPerformanceCaption) {
        subjectPerformanceCaption.textContent =
          error.message || "Unable to load subject performance analytics.";
      }
    } finally {
      loadingPromise = null;
    }
  })();

  return loadingPromise;
}

function bindFilterEvents() {
  [academicYearSelect, gradeSelect, classSelect, termSelect].forEach(
    (selectElement) => {
      if (selectElement) {
        selectElement.addEventListener("change", () => {
          updateFilterStateFromControls();
          if (
            selectElement === academicYearSelect ||
            selectElement === gradeSelect
          ) {
            void loadSubjectPerformanceChart();
            return;
          }
          void loadSubjectPerformanceChart();
        });
      }
    },
  );
}

function activateAnalyticsPanel() {
  if (!analyticsPanel || !analyticsPanel.classList.contains("is-active")) {
    return;
  }

  if (!hasLoaded) {
    void loadSubjectPerformanceChart();
    return;
  }

  if (chartInstance) {
    chartInstance.resize();
  }
}

if (analyticsPanel) {
  bindFilterEvents();

  const observer = new MutationObserver(() => {
    activateAnalyticsPanel();
  });

  observer.observe(analyticsPanel, {
    attributes: true,
    attributeFilter: ["class"],
  });

  activateAnalyticsPanel();
}
