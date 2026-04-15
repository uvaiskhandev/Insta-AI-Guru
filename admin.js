async function loadAnalytics() {
  try {
    const res = await fetch("/api/analytics");
    const data = await res.json();

    document.getElementById("totalRequests").textContent = data.total || 0;
    document.getElementById("todayRequests").textContent = data.today || 0;

  } catch (err) {
    console.log("Analytics error");
  }
}

loadAnalytics();
