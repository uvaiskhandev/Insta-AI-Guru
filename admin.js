const isAdminLoggedIn = localStorage.getItem("insta_ai_guru_admin");

if (isAdminLoggedIn !== "true") {
  window.location.href = "/admin-login.html";
}

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("insta_ai_guru_admin");
    window.location.href = "/admin-login.html";
  });
}