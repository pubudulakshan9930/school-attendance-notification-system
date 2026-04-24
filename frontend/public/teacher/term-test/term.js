const termSelect = document.getElementById("termSelect");

termSelect.addEventListener("change", () => {
  const selectedTerm = termSelect.value;
  if (!selectedTerm) return;

  localStorage.setItem("selectedTerm", selectedTerm);
  localStorage.removeItem("selectedStudentId");
  localStorage.removeItem("selectedStudentName");
  window.location.href = "student-list.html";
});
