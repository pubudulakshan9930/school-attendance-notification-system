const termButtons = document.querySelectorAll(".term-button");

termButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selectedTerm = button.getAttribute("data-term");
    localStorage.setItem("selectedTerm", selectedTerm);
    localStorage.removeItem("selectedSubjectId");
    localStorage.removeItem("selectedSubjectName");
    window.location.href = "subject-list.html";
  });
});
