function isStreamGrade(grade) {
  const numericGrade = Number(grade);
  return numericGrade === 12 || numericGrade === 13;
}

function getStreamLabel(stream) {
  const normalized = String(stream || "")
    .trim()
    .toLowerCase();

  if (normalized === "science" || normalized === "biological") {
    return "Biological";
  }

  if (normalized === "mathematical") {
    return "Mathematical";
  }

  if (normalized === "art") {
    return "Art";
  }

  return "";
}

function formatClassLabel(classItem) {
  const streamLabel = classItem.stream ? getStreamLabel(classItem.stream) : "";

  if (streamLabel) {
    return `Class ${classItem.section} - ${streamLabel}`;
  }

  return `Class ${classItem.section}`;
}

function getStreamOptionsForGrade(grade) {
  if (!isStreamGrade(grade)) {
    return [];
  }

  return [
    { value: "biological", label: "Biological Stream" },
    { value: "mathematical", label: "Mathematical Stream" },
    { value: "art", label: "Art Stream" },
  ];
}

function setStreamSelectState(selectElement, grade) {
  if (!selectElement) {
    return;
  }

  const options = getStreamOptionsForGrade(grade);
  const isRequired = options.length > 0;
  selectElement.innerHTML = "";
  selectElement.required = isRequired;
  selectElement.disabled = !isRequired;

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = isRequired ? "Select Stream" : "Not required";
  selectElement.appendChild(placeholder);

  options.forEach((option) => {
    const optionElement = document.createElement("option");
    optionElement.value = option.value;
    optionElement.textContent = option.label;
    selectElement.appendChild(optionElement);
  });

  if (!isRequired) {
    selectElement.value = "";
  }
}

function filterClassesByGradeAndStream(classes, grade, stream) {
  const selectedGrade = Number(grade);
  const selectedStream = String(stream || "")
    .trim()
    .toLowerCase();

  return (classes || []).filter((item) => {
    if (Number(item.grade) !== selectedGrade) {
      return false;
    }

    if (!isStreamGrade(selectedGrade)) {
      return true;
    }

    return (
      String(item.stream || "")
        .trim()
        .toLowerCase() === selectedStream
    );
  });
}

function buildMandatorySubjectEntries(fixedSubjects) {
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

function getClassSubjectPlan(grade, stream = "") {
  const normalizedGrade = Number(grade);
  const normalizedStream = String(stream || "")
    .trim()
    .toLowerCase();

  const electiveCategory1 = [
    "ICT",
    "Health and Physical Education",
    "Accounting",
  ];
  const electiveCategory2 = ["Music", "Arts", "Dancing"];
  const electiveCategory3 = ["Geography", "Tamil", "Human Studies"];

  if (
    !Number.isInteger(normalizedGrade) ||
    normalizedGrade < 1 ||
    normalizedGrade > 13
  ) {
    return null;
  }

  if (normalizedGrade >= 1 && normalizedGrade <= 2) {
    return attachMandatorySubjects({
      grade: normalizedGrade,
      fixed_subjects: ["Mathematics", "Environment"],
      elective_groups: [],
    });
  }

  if (normalizedGrade >= 3 && normalizedGrade <= 5) {
    return attachMandatorySubjects({
      grade: normalizedGrade,
      fixed_subjects: [
        "Mathematics",
        "English (as secondary language)",
        "Environment",
      ],
      elective_groups: [],
    });
  }

  if (normalizedGrade >= 6 && normalizedGrade <= 11) {
    return attachMandatorySubjects({
      grade: normalizedGrade,
      fixed_subjects: [
        "Mathematics",
        "English (as secondary language)",
        "Science",
        "History",
      ],
      elective_groups: [
        {
          key: "elective_subject_1",
          label: "Category 1",
          options: electiveCategory1,
        },
        {
          key: "elective_subject_2",
          label: "Category 2",
          options: electiveCategory2,
        },
        {
          key: "elective_subject_3",
          label: "Category 3",
          options: electiveCategory3,
        },
      ],
    });
  }

  if (normalizedGrade === 12 || normalizedGrade === 13) {
    if (normalizedStream === "science" || normalizedStream === "biological") {
      return attachMandatorySubjects({
        grade: normalizedGrade,
        stream: normalizedStream,
        stream_label: "Biological Stream",
        fixed_subjects: ["Biology", "Chemistry", "Physics"],
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
        elective_groups: [],
      });
    }

    return null;
  }

  return null;
}
