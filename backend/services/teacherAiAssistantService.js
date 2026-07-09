const teacherAiAssistantRepository = require("../repositories/teacherAiAssistantRepository");
const { generateGeminiText } = require("./geminiService");

const INTENT_PATTERNS = [
  {
    intent: "attendance_summary",
    patterns: [
      /today'?s attendance/i,
      /summari[sz]e.*attendance/i,
      /attendance summary/i,
      /present.*absent.*late/i,
    ],
  },
  {
    intent: "low_attendance",
    patterns: [
      /low attendance/i,
      /attendance below/i,
      /attendance percent/i,
      /attendance %/i,
    ],
  },
  {
    intent: "academic_performance",
    patterns: [
      /academically weak/i,
      /weak students/i,
      /low marks/i,
      /poor marks/i,
      /academic performance/i,
    ],
  },
  {
    intent: "risk_students",
    patterns: [
      /at risk/i,
      /risk students/i,
      /students? at risk/i,
      /high risk/i,
      /medium risk/i,
    ],
  },
  {
    intent: "term_summary",
    patterns: [
      /this term/i,
      /term summary/i,
      /class performing/i,
      /performance this term/i,
      /across terms/i,
      /how is my class/i,
      /how.*class.*doing/i,
    ],
  },
  {
    intent: "late_students",
    patterns: [
      /frequently late/i,
      /late students/i,
      /late count/i,
      /who is late/i,
    ],
  },
  {
    intent: "attendance_comparison",
    patterns: [
      /compare.*attendance/i,
      /this month.*last month/i,
      /last month.*this month/i,
      /monthly attendance/i,
    ],
  },
  {
    intent: "parent_summary",
    patterns: [
      /parent meeting summary/i,
      /parent summary/i,
      /meeting summary/i,
      /parents? meeting/i,
    ],
  },
];

function detectIntent(message) {
  const text = String(message || "").trim();
  if (!text) {
    return null;
  }

  for (const entry of INTENT_PATTERNS) {
    if (entry.patterns.some((pattern) => pattern.test(text))) {
      return entry.intent;
    }
  }

  return null;
}

function formatClassLabel(classInfo) {
  if (!classInfo) {
    return "your assigned class";
  }

  const parts = [`Grade ${classInfo.grade}`, `Class ${classInfo.section}`];
  if (classInfo.stream) {
    parts.push(String(classInfo.stream).replace(/_/g, " "));
  }

  return parts.join(" ");
}

function classifyRisk(student) {
  if (student.attendancePercent < 70 || student.averageMark < 50) {
    return "High Risk";
  }

  if (student.attendancePercent >= 70 && student.attendancePercent <= 80) {
    return "Medium Risk";
  }

  return "Low Risk";
}

function buildSystemInstruction() {
  return [
    "You are Sureki AI Teacher Assistant.",
    "Only analyze the teacher's assigned class using the data provided in the prompt.",
    "Do not mention database access, hidden data, or other classes.",
    "Keep the answer concise, practical, and teacher-friendly.",
    "Use bullet points when helpful.",
    "If data is missing, say so clearly.",
  ].join(" ");
}

function buildPrompt({ teacherName, classLabel, intent, message, payload }) {
  return JSON.stringify(
    {
      teacherName,
      classLabel,
      intent,
      teacherQuestion: message,
      data: payload,
    },
    null,
    2,
  );
}

function buildAttendanceSummaryReply(payload) {
  const attendance = payload?.attendance || {};
  const attendancePercent = Number(attendance.attendancePercent || 0);
  const presentCount = Number(attendance.presentCount || 0);
  const absentCount = Number(attendance.absentCount || 0);
  const lateCount = Number(attendance.lateCount || 0);
  const totalCount = Number(attendance.totalCount || 0);

  const statusLine =
    attendancePercent >= 85
      ? "Attendance is strong today."
      : attendancePercent >= 70
        ? "Attendance is moderate today."
        : "Attendance needs attention today.";

  return [
    `${statusLine} Present: ${presentCount}, absent: ${absentCount}, late: ${lateCount}, total tracked: ${totalCount}.`,
    `Today's attendance rate is ${attendancePercent}%.`,
  ].join(" ");
}

function buildFallbackReply({ intent, payload }) {
  const classLabel = payload?.classLabel || "your class";

  switch (intent) {
    case "attendance_summary":
      return buildAttendanceSummaryReply(payload);

    case "risk_students": {
      const students = Array.isArray(payload?.students) ? payload.students : [];
      if (!students.length) {
        return `No students are currently flagged as at risk for ${classLabel}.`;
      }

      const topStudents = students
        .filter((student) => student?.fullName)
        .slice(0, 5)
        .map((student) => {
          const attendance = Number(student.attendancePercent || 0);
          const mark = Number(student.averageMark || 0);
          const riskLabel = student.riskLevel || "Needs attention";
          return `${student.fullName} — ${riskLabel} (${attendance}% attendance, ${mark} avg mark)`;
        });

      return [
        `For ${classLabel}, I found ${students.length} students who may need attention:`,
        ...topStudents,
      ].join(" ");
    }

    case "low_attendance": {
      const students = Array.isArray(payload?.students) ? payload.students : [];
      if (!students.length) {
        return `No students are below the attendance threshold for ${classLabel}.`;
      }

      const topStudents = students
        .filter((student) => student?.fullName)
        .slice(0, 5)
        .map(
          (student) =>
            `${student.fullName} (${student.attendancePercent || 0}% attendance)`,
        );

      return [
        `For ${classLabel}, these students need attendance support:`,
        ...topStudents,
      ].join(" ");
    }

    case "academic_performance": {
      const students = Array.isArray(payload?.students) ? payload.students : [];
      if (!students.length) {
        return `No students are currently showing weak academic performance for ${classLabel}.`;
      }

      const topStudents = students
        .filter((student) => student?.fullName)
        .slice(0, 5)
        .map(
          (student) =>
            `${student.fullName} (${student.averageMark || 0} avg mark)`,
        );

      return [
        `For ${classLabel}, these students may need academic support:`,
        ...topStudents,
      ].join(" ");
    }

    case "late_students": {
      const students = Array.isArray(payload?.students) ? payload.students : [];
      if (!students.length) {
        return `No students are currently showing repeated lateness for ${classLabel}.`;
      }

      const topStudents = students
        .filter((student) => student?.fullName)
        .slice(0, 5)
        .map(
          (student) =>
            `${student.fullName} (${student.lateCount || 0} late marks)`,
        );

      return [
        `For ${classLabel}, these students are regularly late:`,
        ...topStudents,
      ].join(" ");
    }

    case "term_summary":
      return `For ${classLabel}, the latest class summary shows ${payload?.classAverageMark || 0} average marks and ${payload?.attendance?.attendancePercent || 0}% attendance.`;

    case "parent_summary": {
      const students = Array.isArray(payload?.students) ? payload.students : [];
      if (!students.length) {
        return `No parent summary data is available for ${classLabel}.`;
      }

      const topStudents = students
        .filter((student) => student?.name)
        .slice(0, 3)
        .map(
          (student) =>
            `${student.name} (${student.attendancePercent || 0}% attendance, ${student.averageMark || 0} avg mark)`,
        );

      return [
        `For ${classLabel}, these students may be worth discussing with parents:`,
        ...topStudents,
      ].join(" ");
    }

    default:
      return `I can help with attendance summaries, low attendance, weak students, risk students, term performance, late students, attendance comparison, and parent summaries for ${classLabel}.`;
  }
}

async function buildIntentPayload({ intent, teacherId, classInfo }) {
  const classLabel = formatClassLabel(classInfo);
  const academicYear = classInfo.academic_year;

  switch (intent) {
    case "attendance_summary": {
      const data = await teacherAiAssistantRepository.getTodayAttendanceSummary(
        classInfo.id,
      );
      return {
        classLabel,
        attendance: data,
      };
    }

    case "low_attendance": {
      const latestTerm =
        await teacherAiAssistantRepository.getLatestTermForClass(
          classInfo.id,
          academicYear,
        );
      const metrics =
        await teacherAiAssistantRepository.getStudentMetricsForClass(
          classInfo.id,
          academicYear,
          latestTerm || 1,
        );

      return {
        classLabel,
        students: metrics.filter((student) => student.attendancePercent < 80),
      };
    }

    case "academic_performance": {
      const latestTerm =
        await teacherAiAssistantRepository.getLatestTermForClass(
          classInfo.id,
          academicYear,
        );
      const metrics =
        await teacherAiAssistantRepository.getStudentMetricsForClass(
          classInfo.id,
          academicYear,
          latestTerm || 1,
        );

      return {
        classLabel,
        term: latestTerm,
        students: metrics.filter(
          (student) => student.marksCount > 0 && student.averageMark < 50,
        ),
      };
    }

    case "risk_students": {
      const latestTerm =
        await teacherAiAssistantRepository.getLatestTermForClass(
          classInfo.id,
          academicYear,
        );
      const metrics =
        await teacherAiAssistantRepository.getStudentMetricsForClass(
          classInfo.id,
          academicYear,
          latestTerm || 1,
        );

      return {
        classLabel,
        term: latestTerm,
        students: metrics.map((student) => ({
          ...student,
          riskLevel: classifyRisk(student),
        })),
      };
    }

    case "term_summary": {
      const latestTerm =
        await teacherAiAssistantRepository.getLatestTermForClass(
          classInfo.id,
          academicYear,
        );
      const attendance =
        await teacherAiAssistantRepository.getOverallAttendanceSummaryForClass(
          classInfo.id,
        );
      const classAverageMark = latestTerm
        ? await teacherAiAssistantRepository.getClassAverageMarkForTerm(
            classInfo.id,
            academicYear,
            latestTerm,
          )
        : 0;
      const subjectAverages = latestTerm
        ? await teacherAiAssistantRepository.getSubjectAveragesForTerm(
            classInfo.id,
            academicYear,
            latestTerm,
          )
        : [];

      return {
        classLabel,
        term: latestTerm,
        attendance,
        classAverageMark,
        highestSubjectAverage: subjectAverages[0] || null,
        lowestSubjectAverage: subjectAverages.at(-1) || null,
        subjectAverages,
      };
    }

    case "late_students": {
      const students =
        await teacherAiAssistantRepository.getLateStudentsForClass(
          classInfo.id,
        );
      return { classLabel, students };
    }

    case "attendance_comparison": {
      const comparison =
        await teacherAiAssistantRepository.getAttendanceComparisonForClass(
          classInfo.id,
        );
      return { classLabel, comparison };
    }

    case "parent_summary": {
      const latestTerm =
        await teacherAiAssistantRepository.getLatestTermForClass(
          classInfo.id,
          academicYear,
        );
      const metrics =
        await teacherAiAssistantRepository.getStudentMetricsForClass(
          classInfo.id,
          academicYear,
          latestTerm || 1,
        );

      return {
        classLabel,
        term: latestTerm,
        students: metrics.map((student) => ({
          name: student.fullName,
          attendancePercent: student.attendancePercent,
          averageMark: student.averageMark,
          riskLevel: classifyRisk(student),
        })),
      };
    }

    default:
      return null;
  }
}

async function chatWithTeacherAssistant({ teacherId, message }) {
  const intent = detectIntent(message);
  if (!intent) {
    return {
      intent: null,
      reply:
        "I can help with attendance summaries, low attendance, weak students, risk students, term performance, late students, attendance comparison, and parent meeting summaries.",
    };
  }

  const context =
    await teacherAiAssistantRepository.getTeacherAssistantContext(teacherId);
  if (!context.classInfo) {
    const error = new Error("You are not assigned to an active class.");
    error.statusCode = 400;
    throw error;
  }

  const payload = await buildIntentPayload({
    intent,
    teacherId,
    classInfo: context.classInfo,
  });

  if (intent === "attendance_summary") {
    return {
      intent,
      reply: buildAttendanceSummaryReply(payload),
    };
  }

  const prompt = buildPrompt({
    teacherName: context.teacher?.full_name || "Teacher",
    classLabel: formatClassLabel(context.classInfo),
    intent,
    message,
    payload,
  });

  let reply;

  try {
    reply = await generateGeminiText({
      systemInstruction: buildSystemInstruction(),
      prompt,
    });
  } catch (error) {
    if (intent === "attendance_summary") {
      reply = buildAttendanceSummaryReply(payload);
    } else if (
      error?.statusCode === 503 ||
      error?.statusCode === 429 ||
      error?.status === 429 ||
      error?.code === "GEMINI_RATE_LIMITED"
    ) {
      reply = buildFallbackReply({ intent, payload });
    } else {
      throw error;
    }
  }

  return {
    intent,
    reply,
  };
}

module.exports = {
  detectIntent,
  buildFallbackReply,
  chatWithTeacherAssistant,
};
