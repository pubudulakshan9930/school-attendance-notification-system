const requestForm = document.getElementById("passwordResetRequestForm");
const verifyForm = document.getElementById("passwordResetVerifyForm");
const messageBox = document.getElementById("resetMessage");
const phoneInput = document.getElementById("resetPhone");
const otpInput = document.getElementById("resetOtp");
const passwordInput = document.getElementById("resetPassword");
const confirmPasswordInput = document.getElementById("resetConfirmPassword");
const requestStep = document.getElementById("requestStep");
const verifyStep = document.getElementById("verifyStep");

let resetPhone = "";

function setMessage(type, text) {
  if (!messageBox) return;
  messageBox.className = `form-message ${type}`.trim();
  messageBox.textContent = text;
}

function showStep(step) {
  if (requestForm) {
    requestForm.classList.toggle("hidden", step !== "request");
  }
  if (requestStep) {
    requestStep.classList.toggle("hidden", step !== "request");
  }
  if (verifyForm) {
    verifyForm.classList.toggle("hidden", step !== "verify");
  }
  if (verifyStep) {
    verifyStep.classList.toggle("hidden", step !== "verify");
  }
}

requestForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const phone = phoneInput?.value.trim();
  if (!phone) {
    setMessage(
      "error",
      "Please enter the phone number used during registration.",
    );
    return;
  }

  try {
    const response = await fetch("/api/auth/password/reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Unable to send the verification code.");
    }

    resetPhone = phone;
    setMessage("success", data.message || "OTP sent successfully.");

    if (data.debugOtp) {
      setMessage(
        "success",
        `${data.message || "OTP sent successfully."} Dev OTP: ${data.debugOtp}`,
      );
    }

    showStep("verify");
    otpInput?.focus();
  } catch (error) {
    console.error("Password reset request failed:", error);
    setMessage(
      "error",
      error.message || "Unable to send the verification code.",
    );
  }
});

verifyForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const otp = otpInput?.value.trim();
  const password = passwordInput?.value;
  const confirmPassword = confirmPasswordInput?.value;

  if (!otp) {
    setMessage("error", "Please enter the OTP sent to your phone.");
    return;
  }

  if (!password || password.length < 6) {
    setMessage("error", "New password must be at least 6 characters long.");
    return;
  }

  if (password !== confirmPassword) {
    setMessage("error", "Passwords do not match.");
    return;
  }

  try {
    const response = await fetch("/api/auth/password/reset/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: resetPhone,
        otp,
        password,
        confirmPassword,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Unable to update the password.");
    }

    setMessage("success", data.message || "Password updated successfully.");
    window.setTimeout(() => {
      window.location.href = "../../../index.html";
    }, 1800);
  } catch (error) {
    console.error("Password reset update failed:", error);
    setMessage("error", error.message || "Unable to update the password.");
  }
});
