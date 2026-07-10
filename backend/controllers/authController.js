const jwt = require("jsonwebtoken");
const {
  validateTeacherInput,
  findTeacherByEmailOrTeacherCode,
  createTeacher,
} = require("../services/userService");
const { hashPassword, verifyPassword } = require("../services/passwordService");
const { authenticateToken } = require("../middleware/auth");
const authRepository = require("../repositories/authRepository");
const {
  consumeOtpRecord,
  normalizePhone,
  storeOtpRecord,
  verifyOtpRecord,
} = require("../services/teacherPasswordResetService");
const { sendSms } = require("../services/smsService");

const JWT_SECRET = process.env.JWT_SECRET || "to_be_changed_in_production"; // Ensure this is set in .env for production use
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "45m";

async function listClasses(req, res) {
  try {
    const academicYear = Number(
      req.query.academic_year || new Date().getFullYear(),
    );
    if (!Number.isInteger(academicYear)) {
      return res.status(400).json({ error: "Invalid academic year." });
    }

    const rows = await authRepository.listClassesByAcademicYear(academicYear);

    return res.json({
      success: true,
      classes: rows,
      count: rows.length,
    });
  } catch (error) {
    console.error("Fetch signup classes error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
}

async function signup(req, res) {
  try {
    const normalizedBody = {
      ...req.body,
      teacher_code: req.body.teacher_code || req.body.teacher_id,
    };

    const validation = validateTeacherInput(normalizedBody);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }

    const existing = await findTeacherByEmailOrTeacherCode(
      validation.email,
      validation.teacher_code,
    );
    if (existing) {
      return res.status(409).json({
        error: "A teacher with this email or teacher ID already exists.",
      });
    }

    // Fetch class details
    const classInfo = await authRepository.getClassById(validation.class_id);
    if (!classInfo) {
      return res.status(400).json({ error: "Invalid class selected." });
    }
    if (classInfo.teacher_id) {
      return res
        .status(409)
        .json({ error: "This class is already assigned to another teacher." });
    }

    const teacher = await createTeacher({
      full_name: validation.full_name,
      email: validation.email,
      phone: validation.phone,
      teacher_code: validation.teacher_code,
      grade: classInfo.grade,
      class_section: classInfo.section,
      class_stream: classInfo.stream,
      password: normalizedBody.password,
    });

    // Update class with teacher_id
    await authRepository.assignTeacherToClass(classInfo.id, teacher.id);

    return res.status(201).json({ success: true, user: teacher });
  } catch (error) {
    console.error("Signup error:", error);
    const message =
      process.env.NODE_ENV === "development"
        ? error.message || "Internal server error."
        : "Internal server error.";
    return res.status(error.statusCode || 500).json({ error: message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required." });
    }

    const user = await authRepository.findUserByLoginOrEmail(
      email.trim().toLowerCase(),
    );

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const passwordMatches = await verifyPassword(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const payload = {
      userId: user.id,
      role: user.role,
      name: user.full_name,
      email: user.email || user.login_id,
      teacherCode: user.teacher_code || null,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.json({
      success: true,
      token,
      user: payload,
    });
  } catch (error) {
    console.error("Login error:", error);
    const message =
      process.env.NODE_ENV === "development"
        ? error.message
        : "Internal server error.";
    return res.status(500).json({ error: message });
  }
}

function me(req, res) {
  return res.json({ success: true, user: req.user });
}

async function requestPasswordReset(req, res) {
  try {
    const phone = String(req.body?.phone || "").trim();
    if (!phone) {
      return res.status(400).json({ error: "Phone number is required." });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return res
        .status(400)
        .json({ error: "A valid phone number is required." });
    }

    const teacher = await authRepository.findTeacherByPhone(normalizedPhone);
    if (!teacher) {
      return res.status(404).json({
        error: "No teacher account was found for the provided phone number.",
      });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    storeOtpRecord(normalizedPhone, { otp, teacherId: teacher.id });

    let smsDelivered = false;
    try {
      await sendSms({
        recipient: teacher.phone || phone,
        message: `Your Sureki password reset code is ${otp}. It expires in 5 minutes.`,
      });
      smsDelivered = true;
    } catch (error) {
      console.error("Teacher password reset SMS failed:", error);
      if (process.env.NODE_ENV === "production") {
        return res.status(502).json({
          error: "Unable to send the OTP right now. Please try again later.",
        });
      }
    }

    const response = {
      success: true,
      message: smsDelivered
        ? "A one-time password has been sent to your registered phone number."
        : "The OTP was generated, but SMS delivery failed. Please use the displayed code for testing.",
    };

    if (!smsDelivered && process.env.NODE_ENV !== "production") {
      response.debugOtp = otp;
      console.log(`[PASSWORD RESET] OTP for ${normalizedPhone}: ${otp}`);
    }

    return res.json(response);
  } catch (error) {
    console.error("Teacher password reset request error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
}

async function verifyPasswordReset(req, res) {
  try {
    const phone = String(req.body?.phone || "").trim();
    const otp = String(req.body?.otp || "").trim();

    if (!phone || !otp) {
      return res
        .status(400)
        .json({ error: "Phone number and OTP are required." });
    }

    const normalizedPhone = normalizePhone(phone);
    const verification = verifyOtpRecord(normalizedPhone, otp);

    if (!verification.valid) {
      return res.status(400).json({ error: "Invalid or expired OTP." });
    }

    return res.json({
      success: true,
      message: "OTP verified successfully. You can now set a new password.",
    });
  } catch (error) {
    console.error("Teacher password reset verification error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
}

async function updatePasswordReset(req, res) {
  try {
    const phone = String(req.body?.phone || "").trim();
    const otp = String(req.body?.otp || "").trim();
    const password = String(req.body?.password || "").trim();
    const confirmPassword = String(req.body?.confirmPassword || "").trim();

    if (!phone || !otp || !password) {
      return res
        .status(400)
        .json({ error: "Phone number, OTP, and password are required." });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "New password must be at least 6 characters long." });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match." });
    }

    const normalizedPhone = normalizePhone(phone);
    const verification = verifyOtpRecord(normalizedPhone, otp);
    if (!verification.valid) {
      return res.status(400).json({ error: "Invalid or expired OTP." });
    }

    const teacher = await authRepository.findTeacherByPhone(normalizedPhone);
    if (!teacher) {
      return res
        .status(404)
        .json({
          error: "No teacher account was found for the provided phone number.",
        });
    }

    const hashedPassword = await hashPassword(password);
    await authRepository.updateUserPasswordById(teacher.id, hashedPassword);
    consumeOtpRecord(normalizedPhone);

    return res.json({
      success: true,
      message:
        "Password updated successfully. Please sign in with your new password.",
    });
  } catch (error) {
    console.error("Teacher password reset update error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
}

module.exports = {
  listClasses,
  signup,
  login,
  me,
  requestPasswordReset,
  verifyPasswordReset,
  updatePasswordReset,
  authenticateToken,
};
