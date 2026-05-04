const nodemailer = require("nodemailer");

function requireEmailConfig() {
  const emailUser = String(process.env.EMAIL_USER || "").trim();
  const emailPassword = String(process.env.EMAIL_PASSWORD || "").trim();
  const emailHost = String(process.env.EMAIL_HOST || "smtp.gmail.com").trim();
  const emailPort = Number(process.env.EMAIL_PORT) || 587;
  const emailSecure =
    (process.env.EMAIL_SECURE || "false").toLowerCase() === "true";

  if (!emailUser || !emailPassword) {
    throw new Error(
      "Email configuration missing. Set EMAIL_USER and EMAIL_PASSWORD in .env",
    );
  }

  return { emailUser, emailPassword, emailHost, emailPort, emailSecure };
}

function isEmailConfigured() {
  const emailUser = String(process.env.EMAIL_USER || "").trim();
  const emailPassword = String(process.env.EMAIL_PASSWORD || "").trim();
  return Boolean(emailUser && emailPassword);
}

function createTransporter() {
  const config = requireEmailConfig();

  return nodemailer.createTransport({
    host: config.emailHost,
    port: config.emailPort,
    secure: config.emailSecure,
    auth: {
      user: config.emailUser,
      pass: config.emailPassword,
    },
  });
}

function formatTermMarksEmail({
  parentName,
  studentName,
  studentCode,
  className,
  academicYear,
  term,
  classTeacher,
  subjects,
}) {
  const termName =
    {
      1: "First Term",
      2: "Second Term",
      3: "Third Term",
    }[term] || `Term ${term}`;

  const subjectRows = subjects
    .map(
      (subject) => `
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 10px; text-align: left;">${subject.name || "N/A"}</td>
      <td style="padding: 10px; text-align: center; font-weight: bold;">${subject.mark}/100</td>
    </tr>
  `,
    )
    .join("");

  const totalMarks = subjects.reduce(
    (sum, s) => sum + (Number(s.mark) || 0),
    0,
  );
  const averageMark =
    subjects.length > 0 ? (totalMarks / subjects.length).toFixed(2) : 0;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            border: 1px solid #ddd;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #10223d 0%, #1a3a52 100%);
            color: white;
            padding: 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .content {
            padding: 25px;
          }
          .greeting {
            font-size: 16px;
            margin-bottom: 20px;
            color: #333;
          }
          .info-section {
            background: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            border-left: 4px solid #10223d;
          }
          .info-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e0e0e0;
          }
          .info-item:last-child {
            border-bottom: none;
          }
          .info-label {
            font-weight: bold;
            color: #10223d;
            min-width: 150px;
          }
          .info-value {
            color: #555;
          }
          .marks-table {
            width: 100%;
            margin: 20px 0;
            border-collapse: collapse;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .marks-table thead {
            background: #10223d;
            color: white;
          }
          .marks-table th {
            padding: 12px;
            text-align: left;
            font-weight: bold;
          }
          .marks-table td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          .marks-table tbody tr:hover {
            background: #f5f5f5;
          }
          .summary {
            background: #f0f8ff;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #10223d;
          }
          .summary-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-weight: bold;
          }
          .footer {
            background: #f5f5f5;
            padding: 15px;
            text-align: center;
            color: #777;
            font-size: 12px;
            border-top: 1px solid #ddd;
          }
          .footer p {
            margin: 5px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Term Test Results</h1>
            <p>Academic Year ${academicYear}</p>
          </div>
          
          <div class="content">
            <div class="greeting">
              <p>Dear <strong>${parentName}</strong>,</p>
              <p>Please find below the ${termName} test results for your child.</p>
            </div>

            <div class="info-section">
              <div class="info-item">
                <span class="info-label">Student Name:</span>
                <span class="info-value"><strong>${studentName}</strong></span>
              </div>
              <div class="info-item">
                <span class="info-label">Student Code:</span>
                <span class="info-value">${studentCode}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Class:</span>
                <span class="info-value">${className}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Class Teacher:</span>
                <span class="info-value">${classTeacher}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Term:</span>
                <span class="info-value">${termName}</span>
              </div>
            </div>

            <h3 style="color: #10223d; margin-top: 25px; margin-bottom: 10px;">Subject-wise Marks</h3>
            <table class="marks-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th style="text-align: center;">Marks</th>
                </tr>
              </thead>
              <tbody>
                ${subjectRows}
              </tbody>
            </table>

            <div class="summary">
              <div class="summary-item">
                <span>Total Marks:</span>
                <span>${totalMarks}/100</span>
              </div>
              <div class="summary-item">
                <span>Average:</span>
                <span>${averageMark}%</span>
              </div>
              <div class="summary-item">
                <span>Number of Subjects:</span>
                <span>${subjects.length}</span>
              </div>
            </div>

            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              If you have any queries regarding these marks, please contact your child's class teacher or the school administration.
            </p>
          </div>

          <div class="footer">
            <p><strong>Sureki Academic Management System</strong></p>
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return {
    subject: `${studentName} - ${termName} Test Results (Academic Year ${academicYear})`,
    html: htmlContent,
  };
}

async function sendTermMarksEmail({
  recipient,
  parentName,
  studentName,
  studentCode,
  className,
  academicYear,
  term,
  classTeacher,
  subjects,
}) {
  if (!recipient || !recipient.includes("@")) {
    const error = new Error(
      `Invalid email recipient: ${recipient}. Skipping email notification.`,
    );
    error.statusCode = 400;
    throw error;
  }

  const transporter = createTransporter();
  const emailContent = formatTermMarksEmail({
    parentName,
    studentName,
    studentCode,
    className,
    academicYear,
    term,
    classTeacher,
    subjects,
  });

  try {
    const info = await transporter.sendMail({
      from: `"Sureki Academic System" <${requireEmailConfig().emailUser}>`,
      to: recipient,
      subject: emailContent.subject,
      html: emailContent.html,
      replyTo: process.env.EMAIL_REPLY_TO || undefined,
    });

    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
    };
  } catch (error) {
    console.error("Email send error:", error.message);
    throw error;
  }
}

module.exports = {
  formatTermMarksEmail,
  sendTermMarksEmail,
  isEmailConfigured,
  requireEmailConfig,
};
