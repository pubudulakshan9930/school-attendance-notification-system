const adminRepository = require("../repositories/adminRepository");

const LANGUAGE_OPTIONS = ["Sinhala", "Tamil"];
const RELIGION_OPTIONS = ["Buddhism", "Hindu", "Catholic", "Islam"];
const ELECTIVE_CATEGORY_1 = [
  "ICT",
  "Health and Physical Education",
  "Accounting",
];
const ELECTIVE_CATEGORY_2 = ["Music", "Arts", "Dancing"];
const ELECTIVE_CATEGORY_3 = ["Geography", "Tamil", "Human Studies"];
const STREAM_OPTIONS = ["biological", "science", "mathematical", "art"];

function normalizeClassStream(stream) {
  const normalized = String(stream || "")
    .trim()
    .toLowerCase();

  // Accept either 'science' or 'biological' as biological stream synonyms
  if (normalized === "science") return "biological";

  return STREAM_OPTIONS.includes(normalized) ? normalized : "";
}

function getStreamLabel(stream) {
  const normalized = normalizeClassStream(stream);

  if (normalized === "biological") {
    return "Biological Stream";
  }

  if (normalized === "mathematical") {
    return "Mathematical Stream";
  }

  if (normalized === "art") {
    return "Art Stream";
  }

  return "";
}

function getStreamSubjectNames(stream) {
  const normalized = normalizeClassStream(stream);

  if (normalized === "biological") {
    return ["Biology", "Chemistry", "Physics"];
  }

  if (normalized === "mathematical") {
    return ["Applied Mathematics", "Pure Mathematics", "Chemistry", "Physics"];
  }

  if (normalized === "art") {
    return ["Geography", "ICT", "Tamil"];
  }

  return [];
}

function parseSubjectList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildMandatorySubjectEntries(fixedSubjects, choiceGroups) {
  const entries = [];

  (fixedSubjects || []).forEach((subject) => {
    const name = String(subject || "").trim();
    if (!name) {
      return;
    }

    entries.push({
      type: "subject",
      name,
    });
  });

  (choiceGroups || []).forEach((group) => {
    const options = Array.isArray(group?.options)
      ? group.options
          .map((option) => String(option || "").trim())
          .filter(Boolean)
      : [];

    if (options.length === 0) {
      return;
    }

    entries.push({
      type: "choice_group",
      key: group.key,
      label: group.label,
      options,
    });
  });

  return entries;
}

function attachMandatorySubjects(plan) {
  if (!plan) {
    return null;
  }

  return {
    ...plan,
    mandatory_subjects: buildMandatorySubjectEntries(plan.fixed_subjects, []),
  };
}

function getDefaultClassSubjectPlan(grade, stream = "") {
  const normalizedGrade = Number(grade);
  const normalizedStream = normalizeClassStream(stream);

  if (!Number.isInteger(normalizedGrade)) {
    return null;
  }

  if (normalizedGrade >= 1 && normalizedGrade <= 2) {
    return attachMandatorySubjects({
      grade: normalizedGrade,
      stream: "",
      stream_label: "",
      fixed_subjects: ["Mathematics", "Environment"],
      choice_groups: [],
      elective_groups: [],
    });
  }

  if (normalizedGrade >= 3 && normalizedGrade <= 5) {
    return attachMandatorySubjects({
      grade: normalizedGrade,
      stream: "",
      stream_label: "",
      fixed_subjects: [
        "Mathematics",
        "English (as secondary language)",
        "Environment",
      ],
      choice_groups: [],
      elective_groups: [],
    });
  }

  if (normalizedGrade >= 6 && normalizedGrade <= 11) {
    return attachMandatorySubjects({
      grade: normalizedGrade,
      stream: "",
      stream_label: "",
      fixed_subjects: [
        "Mathematics",
        "English (as secondary language)",
        "Science",
        "History",
      ],
      choice_groups: [],
      elective_groups: [
        {
          key: "elective_subject_1",
          label: "Category 1",
          options: ELECTIVE_CATEGORY_1,
        },
        {
          key: "elective_subject_2",
          label: "Category 2",
          options: ELECTIVE_CATEGORY_2,
        },
        {
          key: "elective_subject_3",
          label: "Category 3",
          options: ELECTIVE_CATEGORY_3,
        },
      ],
    });
  }

  if (normalizedGrade === 12 || normalizedGrade === 13) {
    if (!normalizedStream) {
      return null;
    }

    if (normalizedStream === "biological" || normalizedStream === "science") {
      return attachMandatorySubjects({
        grade: normalizedGrade,
        stream: normalizedStream,
        stream_label: "Biological Stream",
        fixed_subjects: ["Biology", "Chemistry", "Physics"],
        choice_groups: [],
        elective_groups: [],
      });
    }

    if (normalizedStream === "mathematical") {
      return attachMandatorySubjects({
        grade: normalizedGrade,
        stream: normalizedStream,
        stream_label: "Mathematical Stream",
        fixed_subjects: [
          "Applied Mathematics",
          "Pure Mathematics",
          "Chemistry",
          "Physics",
        ],
        choice_groups: [],
        elective_groups: [],
      });
    }

    if (normalizedStream === "art") {
      return attachMandatorySubjects({
        grade: normalizedGrade,
        stream: normalizedStream,
        stream_label: "Art Stream",
        fixed_subjects: ["Geography", "ICT", "Tamil"],
        choice_groups: [],
        elective_groups: [],
      });
    }

    return null;
  }

  return null;
}

function buildCustomClassSubjectPlan(planRow) {
  if (!planRow) {
    return null;
  }

  const normalizedGrade = Number(planRow.grade);
  const normalizedStream = normalizeClassStream(planRow.stream);

  if (!Number.isInteger(normalizedGrade)) {
    return null;
  }

  const fixedSubjects = parseSubjectList(planRow.fixed_subjects);

  return attachMandatorySubjects({
    grade: normalizedGrade,
    stream: normalizedStream,
    stream_label: getStreamLabel(normalizedStream),
    fixed_subjects: fixedSubjects,
    choice_groups: [],
    elective_groups: [
      {
        key: "elective_subject_1",
        label: "Category 1",
        options: parseSubjectList(planRow.elective_category_1_options),
      },
      {
        key: "elective_subject_2",
        label: "Category 2",
        options: parseSubjectList(planRow.elective_category_2_options),
      },
      {
        key: "elective_subject_3",
        label: "Category 3",
        options: parseSubjectList(planRow.elective_category_3_options),
      },
    ],
  });
}

async function getClassSubjectPlan(grade, stream = "") {
  const normalizedGrade = Number(grade);
  const normalizedStream = normalizeClassStream(stream);
  const rawStream = String(stream || "")
    .trim()
    .toLowerCase();

  if (!Number.isInteger(normalizedGrade)) {
    return null;
  }

  let customPlan = await adminRepository.getCustomSubjectPlan(
    normalizedGrade,
    normalizedStream,
  );

  if (!customPlan && rawStream && rawStream !== normalizedStream) {
    customPlan = await adminRepository.getCustomSubjectPlan(
      normalizedGrade,
      rawStream,
    );
  }

  return (
    buildCustomClassSubjectPlan(customPlan) ||
    getDefaultClassSubjectPlan(normalizedGrade, normalizedStream)
  );
}

function normalizeClassSubjectChoice(value, allowedOptions) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (!normalized) {
    return "";
  }

  const match = allowedOptions.find(
    (option) => option.toLowerCase() === normalized,
  );

  return match || "";
}

function getPayloadSubjectSelection(payload, key) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  let nested = {};
  if (payload.subjects && typeof payload.subjects === "object") {
    nested = payload.subjects;
  } else if (typeof payload.subjects === "string") {
    try {
      const parsed = JSON.parse(payload.subjects);
      if (parsed && typeof parsed === "object") {
        nested = parsed;
      }
    } catch (_error) {
      // Ignore invalid JSON payload.subjects and continue with other fallbacks.
    }
  }

  const aliasesByKey = {
    elective_subject_1: [
      "elective1",
      "electiveSubject1",
      "category_1",
      "Category 1",
    ],
    elective_subject_2: [
      "elective2",
      "electiveSubject2",
      "category_2",
      "Category 2",
    ],
    elective_subject_3: [
      "elective3",
      "electiveSubject3",
      "category_3",
      "Category 3",
    ],
  };

  const aliases = aliasesByKey[key] || [];
  const candidates = [payload[key], nested[key]];

  for (const alias of aliases) {
    candidates.push(payload[alias], nested[alias]);
  }

  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined) {
      continue;
    }
    const normalized = String(candidate).trim();
    if (normalized) {
      return normalized;
    }
  }

  // Final fallback: discover likely key names dynamically.
  const dynamicPatternsByKey = {
    elective_subject_1: ["elective", "category", "subject1", "subject_1"],
    elective_subject_2: ["elective", "category", "subject2", "subject_2"],
    elective_subject_3: ["elective", "category", "subject3", "subject_3"],
  };
  const patterns = dynamicPatternsByKey[key] || [];

  const readDynamic = (source) => {
    if (!source || typeof source !== "object") {
      return "";
    }
    for (const sourceKey of Object.keys(source)) {
      const lowerKey = String(sourceKey).toLowerCase();
      const matches = patterns.every((pattern) => lowerKey.includes(pattern));
      if (!matches) {
        continue;
      }
      const candidate = source[sourceKey];
      if (candidate === null || candidate === undefined) {
        continue;
      }
      const normalized = String(candidate).trim();
      if (normalized) {
        return normalized;
      }
    }
    return "";
  };

  const dynamicTopLevel = readDynamic(payload);
  if (dynamicTopLevel) {
    return dynamicTopLevel;
  }

  const dynamicNested = readDynamic(nested);
  if (dynamicNested) {
    return dynamicNested;
  }

  return "";
}

async function resolveStudentSubjectsForClass(teacherClass, payload) {
  const plan = await getClassSubjectPlan(
    teacherClass?.grade,
    teacherClass?.stream,
  );
  if (!plan) {
    const error = new Error("No subject plan is configured for this class.");
    error.statusCode = 400;
    throw error;
  }

  const selectedSubjects = [];

  for (const fixedSubject of plan.fixed_subjects) {
    selectedSubjects.push({
      name: fixedSubject,
      is_elective: false,
    });
  }

  for (const electiveGroup of plan.elective_groups) {
    const allowed = Array.isArray(electiveGroup.options)
      ? electiveGroup.options.filter(Boolean)
      : [];

    // If this elective group has no options, skip it (admin removed it)
    if (allowed.length === 0) {
      continue;
    }

    let selected = normalizeClassSubjectChoice(
      getPayloadSubjectSelection(payload, electiveGroup.key),
      allowed,
    );

    // If only one option is configured, treat it as the implicit selection.
    if (!selected && allowed.length === 1) {
      selected = allowed[0];
    }

    if (!selected) {
      const error = new Error(
        `Please select one subject from ${electiveGroup.label}.`,
      );
      error.statusCode = 400;
      throw error;
    }

    selectedSubjects.push({ name: selected, is_elective: true });
  }

  const uniqueNames = new Set();
  for (const subject of selectedSubjects) {
    const key = subject.name.toLowerCase();
    if (uniqueNames.has(key)) {
      const error = new Error("Duplicate subjects are not allowed.");
      error.statusCode = 400;
      throw error;
    }
    uniqueNames.add(key);
  }

  return {
    plan,
    subjects: selectedSubjects,
  };
}

function getAllGradeSubjectPlans() {
  const plans = [];

  for (let grade = 1; grade <= 11; grade += 1) {
    const plan = getDefaultClassSubjectPlan(grade, "");
    if (plan) {
      plans.push({
        grade,
        stream: "",
        stream_label: "",
        fixed_subjects: plan.fixed_subjects,
        choice_groups: plan.choice_groups,
        elective_groups: plan.elective_groups,
      });
    }
  }

  ["biological", "mathematical", "art"].forEach((stream) => {
    const plan = getDefaultClassSubjectPlan(12, stream);
    if (plan) {
      plans.push({
        grade: 12,
        stream,
        stream_label: plan.stream_label,
        fixed_subjects: plan.fixed_subjects,
        choice_groups: plan.choice_groups,
        elective_groups: plan.elective_groups,
      });
    }
  });

  ["biological", "mathematical", "art"].forEach((stream) => {
    const plan = getDefaultClassSubjectPlan(13, stream);
    if (plan) {
      plans.push({
        grade: 13,
        stream,
        stream_label: plan.stream_label,
        fixed_subjects: plan.fixed_subjects,
        choice_groups: plan.choice_groups,
        elective_groups: plan.elective_groups,
      });
    }
  });

  return plans;
}

module.exports = {
  getClassSubjectPlan,
  getStreamLabel,
  normalizeClassStream,
  resolveStudentSubjectsForClass,
  getAllGradeSubjectPlans,
};
