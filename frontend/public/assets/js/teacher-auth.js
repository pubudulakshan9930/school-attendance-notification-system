const teacherToken = localStorage.getItem("sureki_token");

if (!teacherToken) {
  window.location.href = "/index.html";
} else {
  fetch("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${teacherToken}`,
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

      if (role === "teacher") {
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
