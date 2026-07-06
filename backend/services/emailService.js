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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildTermMarksEmailTemplate({
  title,
  subtitle,
  parentName,
  studentName,
  studentCode,
  className,
  academicYear,
  termName,
  classTeacher,
  studentRank,
  totalMark,
  subjectRows,
  closingNote,
}) {
  const safeParentName = escapeHtml(parentName || "Parent");
  const safeStudentName = escapeHtml(studentName || "N/A");
  const safeStudentCode = escapeHtml(studentCode || "N/A");
  const safeClassName = escapeHtml(className || "N/A");
  const safeAcademicYear = escapeHtml(academicYear || "N/A");
  const safeTermName = escapeHtml(termName || "N/A");
  const safeClassTeacher = escapeHtml(classTeacher || "N/A");
  const safeStudentRank = escapeHtml(studentRank ?? "N/A");
  const safeTotalMark = escapeHtml(totalMark ?? "N/A");
  const safeTitle = escapeHtml(title || "Term Marks Results");
  const safeSubtitle = escapeHtml(subtitle || "");
  const safeClosingNote = escapeHtml(closingNote || "");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${safeTitle}</title>
      </head>
      <body style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f6fb;padding:24px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:720px;background:#ffffff;border:1px solid #dbe3ef;border-radius:10px;overflow:hidden;">
                <tr>
                  <td style="background:linear-gradient(135deg,#10223d 0%,#1a3a52 100%);padding:24px 28px;color:#ffffff;">
                    <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.82;margin-bottom:8px;">${safeTitle}</div>
                    <div style="font-size:26px;line-height:1.2;font-weight:700;margin:0 0 6px;">${safeStudentName}</div>
                    <div style="font-size:14px;line-height:1.5;opacity:0.95;">${safeSubtitle}</div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:24px 28px 8px;">
                    <div style="font-size:15px;line-height:1.7;color:#334155;">
                      Dear <strong style="color:#10223d;">${safeParentName}</strong>,
                      <div style="margin-top:8px;">Please find the ${safeTermName} results for your child below.</div>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:12px 28px 0;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;border:1px solid #dbe3ef;border-radius:8px;overflow:hidden;">
                      <tr>
                        <td style="width:50%;padding:12px 14px;background:#f8fbff;border-bottom:1px solid #dbe3ef;color:#10223d;font-weight:700;">Student Name</td>
                        <td style="padding:12px 14px;background:#ffffff;border-bottom:1px solid #dbe3ef;color:#334155;">${safeStudentName}</td>
                      </tr>
                      <tr>
                        <td style="width:50%;padding:12px 14px;background:#f8fbff;border-bottom:1px solid #dbe3ef;color:#10223d;font-weight:700;">Student Code</td>
                        <td style="padding:12px 14px;background:#ffffff;border-bottom:1px solid #dbe3ef;color:#334155;">${safeStudentCode}</td>
                      </tr>
                      <tr>
                        <td style="width:50%;padding:12px 14px;background:#f8fbff;border-bottom:1px solid #dbe3ef;color:#10223d;font-weight:700;">Class</td>
                        <td style="padding:12px 14px;background:#ffffff;border-bottom:1px solid #dbe3ef;color:#334155;">${safeClassName}</td>
                      </tr>
                      <tr>
                        <td style="width:50%;padding:12px 14px;background:#f8fbff;border-bottom:1px solid #dbe3ef;color:#10223d;font-weight:700;">Academic Year</td>
                        <td style="padding:12px 14px;background:#ffffff;border-bottom:1px solid #dbe3ef;color:#334155;">${safeAcademicYear}</td>
                      </tr>
                      <tr>
                        <td style="width:50%;padding:12px 14px;background:#f8fbff;border-bottom:1px solid #dbe3ef;color:#10223d;font-weight:700;">Term</td>
                        <td style="padding:12px 14px;background:#ffffff;border-bottom:1px solid #dbe3ef;color:#334155;">${safeTermName}</td>
                      </tr>
                      <tr>
                        <td style="width:50%;padding:12px 14px;background:#f8fbff;border-bottom:1px solid #dbe3ef;color:#10223d;font-weight:700;">Class Teacher</td>
                        <td style="padding:12px 14px;background:#ffffff;border-bottom:1px solid #dbe3ef;color:#334155;">${safeClassTeacher}</td>
                      </tr>
                      <tr>
                        <td style="width:50%;padding:12px 14px;background:#f8fbff;border-bottom:1px solid #dbe3ef;color:#10223d;font-weight:700;">Class Rank</td>
                        <td style="padding:12px 14px;background:#ffffff;border-bottom:1px solid #dbe3ef;color:#334155;">${safeStudentRank}</td>
                      </tr>
                      <tr>
                        <td style="width:50%;padding:12px 14px;background:#f8fbff;color:#10223d;font-weight:700;">Total Marks</td>
                        <td style="padding:12px 14px;background:#ffffff;color:#334155;">${safeTotalMark}</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:24px 28px 10px;">
                    <div style="font-size:18px;font-weight:700;color:#10223d;margin-bottom:10px;">Subject-wise Marks</div>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;border:1px solid #dbe3ef;border-radius:8px;overflow:hidden;">
                      <tr>
                        <th align="left" style="padding:12px 14px;background:#10223d;color:#ffffff;font-size:13px;letter-spacing:0.02em;">Subject</th>
                        <th align="center" style="padding:12px 14px;background:#10223d;color:#ffffff;font-size:13px;letter-spacing:0.02em;">Mark</th>
                      </tr>
                      ${subjectRows}
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:20px 28px 28px;">
                    <div style="font-size:13px;line-height:1.7;color:#64748b;">${safeClosingNote}</div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:16px 28px;background:#f8fafc;border-top:1px solid #dbe3ef;color:#64748b;font-size:12px;line-height:1.6;">
                    <div style="font-weight:700;color:#10223d;">Sureki Academic Management System</div>
                    <div>This is an automated email. Please do not reply to this message.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function formatTermMarksEmail({
  parentName,
  studentName,
  studentCode,
  className,
  academicYear,
  term,
  classTeacher,
  studentRank,
  totalMark,
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

  const htmlContent = buildTermMarksEmailTemplate({
    title: "Term Test Results",
    subtitle: `Academic Year ${academicYear}`,
    parentName,
    studentName,
    studentCode,
    className,
    academicYear,
    termName,
    classTeacher,
    studentRank,
    totalMark,
    subjectRows,
    closingNote:
      "If you have any queries regarding these marks, please contact your child's class teacher or the school administration.",
  });

  return {
    subject: `${studentName} - ${termName} Test Results (Academic Year ${academicYear})`,
    html: htmlContent,
  };
}

function formatTermMarksSmsStyleEmail({
  parentName,
  studentName,
  studentCode,
  academicYear,
  term,
  className,
  classTeacher,
  studentRank,
  totalMark,
  subjectMarks,
}) {
  const p = String(parentName || "Parent").trim();
  const s = String(studentName || "student").trim();
  const t = String(term || "term").trim();
  const c = String(className || "class").trim();

  const lines = Array.isArray(subjectMarks)
    ? subjectMarks
        .map((entry) => {
          const subject = String(
            entry?.name || entry?.subject || "Subject",
          ).trim();
          const mark = String(entry?.mark ?? "").trim();
          return `${subject} - ${mark}`;
        })
        .filter(Boolean)
    : [];

  const message = [
    `Dear ${p}, ${s}'s ${t} ${c} marks have been released.`,
    `Class Rank: ${studentRank ?? "N/A"}`,
    `Total Marks: ${totalMark ?? "N/A"}`,
    ...lines,
  ].join("\n");

  const htmlRows = lines
    .map((line) => {
      const [subject, mark] = line.split(" - ");
      return `
        <tr>
          <td style="padding:12px 14px;border-bottom:1px solid #dbe3ef;color:#334155;">${escapeHtml(subject)}</td>
          <td style="padding:12px 14px;border-bottom:1px solid #dbe3ef;color:#334155;text-align:center;font-weight:700;">${escapeHtml(mark)}</td>
        </tr>
      `;
    })
    .join("");

  return {
    subject: `${s} ${t} marks released`,
    text: message,
    html: buildTermMarksEmailTemplate({
      title: "Term Marks Results",
      subtitle: `Academic Year ${academicYear || "N/A"}`,
      parentName: p,
      studentName: s,
      studentCode,
      className: c,
      academicYear,
      termName: t,
      classTeacher,
      studentRank,
      totalMark,
      subjectRows: htmlRows,
      closingNote:
        "This message was generated automatically by Sureki Academic Management System.",
    }),
  };
}

async function sendTermMarksEmail({
  recipient,
  parentName,
  studentName,
  studentCode,
  academicYear,
  className,
  classTeacher,
  term,
  studentRank,
  totalMark,
  subjectMarks,
}) {
  if (!recipient || !recipient.includes("@")) {
    const error = new Error(
      `Invalid email recipient: ${recipient}. Skipping email notification.`,
    );
    error.statusCode = 400;
    throw error;
  }

  const transporter = createTransporter();
  const emailContent = formatTermMarksSmsStyleEmail({
    parentName,
    studentName,
    studentCode,
    academicYear,
    term,
    className,
    classTeacher,
    studentRank,
    totalMark,
    subjectMarks,
  });

  try {
    const info = await transporter.sendMail({
      from: `"Sureki Academic System" <${requireEmailConfig().emailUser}>`,
      to: recipient,
      subject: emailContent.subject,
      text: emailContent.text,
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
  formatTermMarksSmsStyleEmail,
  sendTermMarksEmail,
  isEmailConfigured,
  requireEmailConfig,
};
