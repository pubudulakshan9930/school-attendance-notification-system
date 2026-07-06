const ANALYTICS_API = "/api/admin/analytics/attendance-trend";
const analyticsPanel = document.getElementById("analytics");
const analyticsChartCanvas = document.getElementById("attendanceTrendChart");
const analyticsStatus = document.getElementById("attendanceTrendStatus");
const analyticsCaption = document.getElementById("attendanceTrendCaption");

let chartInstance = null;
let hasLoaded = false;
let loadingPromise = null;

function formatChartDate(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatLongDate(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function setStatus(message) {
  if (analyticsStatus) {
    analyticsStatus.textContent = message;
  }
}

async function fetchAttendanceTrend() {
  const apiFetch = window.apiFetch;
  if (typeof apiFetch !== "function") {
    throw new Error("Admin API helper is unavailable.");
  }

  const response = await apiFetch(ANALYTICS_API, { method: "GET" });
  return response.data?.series || [];
}

function buildChart(series) {
  if (!analyticsChartCanvas || typeof window.Chart !== "function") {
    return;
  }

  const labels = series.map((item) => formatChartDate(item.attendance_date));
  const values = series.map((item) => Number(item.attendance_percentage || 0));

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new window.Chart(analyticsChartCanvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Attendance %",
          data: values,
          borderColor: "#10223d",
          borderWidth: 2,
          backgroundColor: "rgba(16, 34, 61, 0.12)",
          pointBackgroundColor: "#10223d",
          pointBorderColor: "#ffffff",
          pointRadius: 2,
          pointHoverRadius: 4,
          fill: true,
          tension: 0.32,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: true,
          text: "School Attendance Trend (Last 30 School Days)",
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
            title(context) {
              const index = context[0]?.dataIndex ?? 0;
              const row = series[index];
              return row ? formatLongDate(row.attendance_date) : "Date";
            },
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
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 10,
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

async function loadAttendanceTrend() {
  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      setStatus("Loading data...");
      const series = await fetchAttendanceTrend();

      if (analyticsCaption) {
        analyticsCaption.textContent = `${series.length} school days loaded.`;
      }

      buildChart(series);
      hasLoaded = true;
      setStatus("Loaded");

      if (!series.length && analyticsCaption) {
        analyticsCaption.textContent =
          "No attendance data found for the last 30 school days.";
      }
    } catch (error) {
      console.error("Attendance trend analytics load failed:", error);
      setStatus("Failed to load");
      if (analyticsCaption) {
        analyticsCaption.textContent =
          error.message || "Unable to load attendance analytics.";
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
    void loadAttendanceTrend();
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
