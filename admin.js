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

async function loadAnalytics() {
  try {
    const res = await fetch("/api/analytics");
    const data = await res.json();

    if (!res.ok) {
      console.log("Analytics API error:", data.error);
      return;
    }

    const totalRequestsEl = document.getElementById("totalRequests");
    const todayRequestsEl = document.getElementById("todayRequests");

    if (totalRequestsEl) totalRequestsEl.textContent = data.total ?? 0;
    if (todayRequestsEl) todayRequestsEl.textContent = data.today ?? 0;
  } catch (err) {
    console.log("Analytics fetch failed:", err.message);
  }
}

loadAnalytics();