const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const teacherRoutes = require("./routes/teacher");
const { isEmailConfigured } = require("./services/emailService");

dotenv.config({ path: path.resolve(__dirname, ".env"), override: true });

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "frontend", "public")));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/teacher", teacherRoutes);

app.listen(port, () => {
  console.log(`Sureki backend listening at http://localhost:${port}`);
  const emailConfigured = isEmailConfigured();
  console.log(`[HEALTH] Email configured: ${emailConfigured}`);

  if (!emailConfigured) {
    console.log(
      `[DEBUG] EMAIL_USER present: ${Boolean(process.env.EMAIL_USER)}`,
    );
    console.log(
      `[DEBUG] EMAIL_PASSWORD present: ${Boolean(process.env.EMAIL_PASSWORD)}`,
    );
    console.log(
      `[DEBUG] EMAIL_HOST: ${process.env.EMAIL_HOST || "smtp.gmail.com"}`,
    );
  } else {
    console.log(
      `[DEBUG] Email host: ${process.env.EMAIL_HOST || "smtp.gmail.com"}, port: ${process.env.EMAIL_PORT || 587}`,
    );
  }
});
