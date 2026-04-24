const token = localStorage.getItem("sureki_token");
const ADMIN_DASHBOARD_PATH = "/admin/dashbaord-admin.html";

if (!token) {
  window.location.href = "/index.html";
} else {
  fetch("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error("Authentication failed.");
      }
      return res.json();
    })
    .then((data) => {
      const role = (data?.user?.role || "").toLowerCase();

      if (!data.success || !data.user) {
        throw new Error("Invalid user payload.");
      }

      if (role === "admin") {
        return;
      }

      localStorage.removeItem("sureki_token");
      window.location.href = "/index.html";
    })
    .catch(() => {
      localStorage.removeItem("sureki_token");
      window.location.href = "/index.html";
    });
}
