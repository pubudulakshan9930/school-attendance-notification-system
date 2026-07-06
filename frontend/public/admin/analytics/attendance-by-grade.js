const ATTENDANCE_BY_GRADE_API = "/api/admin/analytics/attendance-by-grade";
const analyticsPanel = document.getElementById("analytics");
const gradeChartCanvas = document.getElementById("attendanceByGradeChart");
const gradeStatus = document.getElementById("attendanceByGradeStatus");
const gradeCaption = document.getElementById("attendanceByGradeCaption");

let gradeChartInstance = null;
let hasLoadedGradeChart = false;
let loadingPromise = null;

function setStatus(message) {
  if (gradeStatus) {
    gradeStatus.textContent = message;
  }
}

async function fetchAttendanceByGrade() {
  const apiFetch = window.apiFetch;
  if (typeof apiFetch !== "function") {
    throw new Error("Admin API helper is unavailable.");
  }

  const response = await apiFetch(ATTENDANCE_BY_GRADE_API, {
    method: "GET",
  });

  return {
    reportDate: response.data?.report_date || "",
    series: response.data?.series || [],
  };
}

function buildChart(series) {
  if (!gradeChartCanvas || typeof window.Chart !== "function") {
    return;
  }

  const labels = series.map((row) => `Grade ${row.grade}`);
  const values = series.map((row) => Number(row.attendance_percentage || 0));

  if (gradeChartInstance) {
    gradeChartInstance.destroy();
  }

  gradeChartInstance = new window.Chart(gradeChartCanvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Attendance %",
          data: values,
          borderRadius: 6,
          backgroundColor: "rgba(16, 34, 61, 0.82)",
          hoverBackgroundColor: "rgba(16, 34, 61, 0.94)",
          borderColor: "#10223d",
          borderWidth: 1,
          maxBarThickness: 30,
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
          text: "Today's Attendance by Grade",
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
              const value = Number(context.parsed.y || 0).toFixed(2);
              return `Attendance %: ${value}%`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: "#64748b",
          },
          title: {
            display: true,
            text: "Grade",
            color: "#10223d",
          },
        },
        y: {
          beginAtZero: true,
          suggestedMax: 100,
          ticks: {
            color: "#64748b",
            callback(value) {
              return `${value}%`;
            },
          },
          title: {
            display: true,
            text: "Attendance %",
            color: "#10223d",
          },
        },
      },
    },
  });
}

async function loadAttendanceByGradeChart() {
  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      setStatus("Loading data...");
      const { reportDate, series } = await fetchAttendanceByGrade();

      if (gradeCaption) {
        gradeCaption.textContent = reportDate
          ? `Report date: ${reportDate}. ${series.length} grades loaded.`
          : `${series.length} grades loaded.`;
      }

      if (series.length === 0 && gradeCaption) {
        gradeCaption.textContent =
          "No active grade attendance data found for today.";
      }

      buildChart(series);
      hasLoadedGradeChart = true;
      setStatus("Loaded");
    } catch (error) {
      console.error("Attendance by grade analytics load failed:", error);
      setStatus("Failed to load");
      if (gradeCaption) {
        gradeCaption.textContent =
          error.message || "Unable to load attendance by grade analytics.";
      }
    } finally {
      loadingPromise = null;
    }
  })();

  return loadingPromise;
}

function activateAnalyticsPanel() {
  if (!analyticsPanel || !analyticsPanel.classList.contains("is-active")) {
    return;
  }

  if (!hasLoadedGradeChart) {
    void loadAttendanceByGradeChart();
    return;
  }

  if (gradeChartInstance) {
    gradeChartInstance.resize();
  }
}

if (analyticsPanel) {
  const observer = new MutationObserver(() => {
    activateAnalyticsPanel();
  });

  observer.observe(analyticsPanel, {
    attributes: true,
    attributeFilter: ["class"],
  });

  activateAnalyticsPanel();
}
