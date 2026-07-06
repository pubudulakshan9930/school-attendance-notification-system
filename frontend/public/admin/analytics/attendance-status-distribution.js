const ATTENDANCE_STATUS_DISTRIBUTION_API =
  "/api/admin/analytics/attendance-status-distribution";
const analyticsPanel = document.getElementById("analytics");
const statusDistributionCanvas = document.getElementById(
  "attendanceStatusDistributionChart",
);
const statusDistributionStatus = document.getElementById(
  "attendanceStatusDistributionStatus",
);
const statusDistributionCaption = document.getElementById(
  "attendanceStatusDistributionCaption",
);
const statusDistributionLoadingState = document.getElementById(
  "attendanceStatusDistributionLoading",
);
const statusDistributionEmptyState = document.getElementById(
  "attendanceStatusDistributionEmptyState",
);

let chartInstance = null;
let hasLoaded = false;
let loadingPromise = null;

function setStatus(message) {
  if (statusDistributionStatus) {
    statusDistributionStatus.textContent = message;
  }
}

function setLoadingState(isLoading) {
  if (statusDistributionLoadingState) {
    statusDistributionLoadingState.classList.toggle("is-hidden", !isLoading);
  }
}

function setEmptyState(isEmpty) {
  if (statusDistributionEmptyState) {
    statusDistributionEmptyState.classList.toggle("is-hidden", !isEmpty);
  }
}

async function fetchAttendanceStatusDistribution() {
  const apiFetch = window.apiFetch;
  if (typeof apiFetch !== "function") {
    throw new Error("Admin API helper is unavailable.");
  }

  const response = await apiFetch(ATTENDANCE_STATUS_DISTRIBUTION_API, {
    method: "GET",
  });

  return {
    reportDate: response.data?.report_date || "",
    totalCount: Number(response.data?.total_count || 0),
    series: response.data?.series || [],
  };
}

function buildChart(series) {
  if (!statusDistributionCanvas || typeof window.Chart !== "function") {
    return;
  }

  const labels = series.map((row) => {
    const status = String(row.status || "").toLowerCase();
    if (status === "present") return "Present";
    if (status === "late") return "Late";
    if (status === "absent") return "Absent";
    return status || "Unknown";
  });

  const values = series.map((row) => Number(row.count || 0));
  const totalCount = values.reduce((sum, value) => sum + value, 0);

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new window.Chart(statusDistributionCanvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: ["#10223d", "#3b82f6", "#ef4444"],
          borderColor: ["#0f172a", "#2563eb", "#dc2626"],
          borderWidth: 1,
          hoverOffset: 8,
          spacing: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#374151",
            boxWidth: 12,
            padding: 16,
          },
        },
        title: {
          display: true,
          text: "Today's Attendance Status Distribution",
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
              const count = Number(context.parsed || 0);
              const percentage =
                totalCount > 0
                  ? ((count / totalCount) * 100).toFixed(2)
                  : "0.00";
              return `${context.label}: ${count} (${percentage}%)`;
            },
          },
        },
        datalabels: {
          color: "#ffffff",
          font: {
            weight: "700",
            size: 12,
          },
          formatter(value, context) {
            const percentage =
              totalCount > 0 ? ((value / totalCount) * 100).toFixed(1) : "0.0";
            return `${percentage}%`;
          },
        },
      },
    },
  });
}

async function loadAttendanceStatusDistributionChart() {
  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      setStatus("Loading data...");
      setLoadingState(true);
      setEmptyState(false);

      const { reportDate, totalCount, series } =
        await fetchAttendanceStatusDistribution();

      if (statusDistributionCaption) {
        statusDistributionCaption.textContent = reportDate
          ? `Report date: ${reportDate}. ${totalCount} attendance records loaded.`
          : `${totalCount} attendance records loaded.`;
      }

      if (!series.length || totalCount === 0) {
        setLoadingState(false);
        setEmptyState(true);
        setStatus("No data");
        if (chartInstance) {
          chartInstance.destroy();
          chartInstance = null;
        }
        if (statusDistributionCaption) {
          statusDistributionCaption.textContent =
            "No attendance data available";
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
      console.error(
        "Attendance status distribution analytics load failed:",
        error,
      );
      setStatus("Failed to load");
      setLoadingState(false);
      setEmptyState(false);
      if (statusDistributionCaption) {
        statusDistributionCaption.textContent =
          error.message ||
          "Unable to load attendance status distribution analytics.";
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

  if (!hasLoaded) {
    void loadAttendanceStatusDistributionChart();
    return;
  }

  if (chartInstance) {
    chartInstance.resize();
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
