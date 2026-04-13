document.addEventListener("DOMContentLoaded", () => {
  const staffNavLink = document.getElementById("staffNavLink");
  if (staffNavLink && !isSuperAdmin()) {
    staffNavLink.style.display = "none";
  }
});