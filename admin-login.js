const form = document.getElementById("adminLoginForm");
const errorBox = document.getElementById("loginError");
const loginBtn = document.getElementById("loginBtn");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    errorBox.textContent = "";
    loginBtn.disabled = true;
    loginBtn.textContent = "Checking...";

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
      const response = await fetch("/api/admin-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem("insta_ai_guru_admin", "true");
        window.location.href = "/admin.html";
        return;
      }

      errorBox.textContent = data.message || "Invalid credentials";
    } catch (error) {
      errorBox.textContent = "Server error. Please try again.";
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = "Login";
    }
  });
}
