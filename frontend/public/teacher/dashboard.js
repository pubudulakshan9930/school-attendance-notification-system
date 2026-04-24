const teacherGreeting = document.getElementById("teacherGreeting");
const teacherClassTitle = document.getElementById("teacherClassTitle");

function getDayGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Good Morning";
  }
  if (hour < 17) {
    return "Good Afternoon";
  }
  return "Good Evening";
}

async function loadTeacherDashboard() {
  const token = localStorage.getItem("sureki_token");
  if (!token) {
    window.location.href = "/index.html";
    return;
  }

  try {
    const response = await fetch("/api/teacher/dashboard", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to load dashboard details.");
    }

    const teacherName = data?.user?.name || "Teacher";
    const assignedClass = data?.class;

    teacherGreeting.textContent = `${getDayGreeting()}, ${teacherName}`;

    if (assignedClass) {
      teacherClassTitle.textContent = `Grade ${assignedClass.grade} · Class ${assignedClass.section}`;
    } else {
      teacherClassTitle.textContent = "No active class assigned";
    }
  } catch (error) {
    console.error("Teacher dashboard load failed:", error);
    teacherGreeting.textContent = `${getDayGreeting()}, Teacher`;
    teacherClassTitle.textContent = "Unable to load class details";
  }
}

loadTeacherDashboard();
