const form = document.getElementById("adminLoginForm");
const msg = document.getElementById("loginMsg");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  msg.style.color = "#ffffff";
  msg.textContent = "Logging in...";

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

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
      msg.style.color = "#9cffb1";
      msg.textContent = "Login successful...";
      window.location.href = "/admin.html";
    } else {
      msg.style.color = "#ffb9b9";
      msg.textContent = data.message || "Login failed";
    }
  } catch (error) {
    msg.style.color = "#ffb9b9";
    msg.textContent = "API not working or server error";
    console.error(error);
  }
});
