const form = document.getElementById("adminLoginForm");
const errorText = document.getElementById("errorText");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  errorText.textContent = "";

  try {
    const res = await fetch("/api/admin-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      localStorage.setItem("adminLoggedIn", "true");
      window.location.href = "/admin";
    } else {
      errorText.textContent = data.message || "Invalid credentials";
    }
  } catch (error) {
    errorText.textContent = "API not working or server error";
  }
});
