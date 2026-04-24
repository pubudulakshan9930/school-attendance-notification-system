const loginForm = document.getElementById("loginForm");
const LOGIN_API_URL = "/api/auth/login";

loginForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = e.target[0].value.trim();
  const password = e.target[1].value.trim();

  if (!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  try {
    const response = await fetch(LOGIN_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Invalid credentials.");
    }

    if (!data.success || !data.user || !data.token) {
      throw new Error("Login failed. Please try again.");
    }

    localStorage.setItem("sureki_token", data.token);

    const role = (data.user.role || "").toLowerCase();
    if (role === "admin") {
      window.location.href = "admin/dashbaord-admin.html";
    } else if (role === "teacher") {
      window.location.href = "teacher/dashboard.html";
    } else {
      throw new Error("Unauthorized role: " + role);
    }
  } catch (error) {
    console.error("Login failed:", error);
    alert(error.message || "Login failed. Please check your credentials.");
  }
});
