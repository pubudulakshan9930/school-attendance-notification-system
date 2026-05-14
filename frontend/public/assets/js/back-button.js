(function () {
  function getFallbackPath() {
    const { pathname } = window.location;

    if (
      pathname.startsWith("/teacher/attendance/") ||
      pathname.startsWith("/teacher/student/") ||
      pathname.startsWith("/teacher/term-test/")
    ) {
      return "/teacher/dashboard.html";
    }

    if (pathname.startsWith("/teacher/")) {
      return "/teacher/dashboard.html";
    }

    if (pathname.startsWith("/admin/teacher/reset-password/")) {
      return "/admin/teacher/register-teacher.html";
    }

    if (pathname.startsWith("/admin/teacher/")) {
      return "/admin/dashbaord-admin.html";
    }

    if (pathname.startsWith("/admin/")) {
      return "/admin/dashbaord-admin.html";
    }

    return "/index.html";
  }

  function goBack() {
    if (window.history.length > 1 && document.referrer) {
      window.history.back();
      return;
    }

    window.location.href = getFallbackPath();
  }

  function injectStyles() {
    if (document.getElementById("shared-back-button-styles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "shared-back-button-styles";
    style.textContent = `
      .shared-back-button {
        position: fixed;
        top: 18px;
        left: 18px;
        z-index: 2000;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        border-radius: 14px;
        border: 1px solid rgba(16, 34, 61, 0.18);
        background: rgba(255, 255, 255, 0.92);
        color: #10223d;
        text-decoration: none;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
      }

      .shared-back-button:hover {
        transform: translateY(-1px);
        box-shadow: 0 14px 30px rgba(15, 23, 42, 0.16);
        background: rgba(255, 255, 255, 1);
      }

      .shared-back-button svg {
        width: 20px;
        height: 20px;
        display: block;
      }

      @media (max-width: 640px) {
        .shared-back-button {
          top: 12px;
          left: 12px;
          width: 40px;
          height: 40px;
          border-radius: 12px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function injectButton() {
    if (document.querySelector(".shared-back-button")) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "shared-back-button";
    button.setAttribute("aria-label", "Go back");
    button.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    button.addEventListener("click", goBack);
    document.body.appendChild(button);
  }

  function init() {
    injectStyles();
    injectButton();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
