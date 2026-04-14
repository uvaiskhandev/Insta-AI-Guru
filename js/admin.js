async function verifyAdmin() {
  try {
    const res = await fetch("/api/admin-verify");
    const data = await res.json();

    if (!data.authenticated) {
      window.location.href = "/admin-login.html";
      return false;
    }

    return true;
  } catch (error) {
    window.location.href = "/admin-login.html";
    return false;
  }
}

async function loadStats() {
  try {
    const res = await fetch("/api/admin-stats");
    const data = await res.json();

    if (!data.success) {
      alert("Failed to load stats");
      return;
    }

    document.getElementById("totalEvents").textContent = data.totalEvents || 0;
    document.getElementById("todayEvents").textContent = data.todayEvents || 0;
    document.getElementById("pageViews").textContent = data.pageViews || 0;
    document.getElementById("captionUses").textContent = data.captionUses || 0;
    document.getElementById("bioUses").textContent = data.bioUses || 0;
    document.getElementById("hashtagUses").textContent = data.hashtagUses || 0;
    document.getElementById("copyClicks").textContent = data.copyClicks || 0;
    document.getElementById("topReferrer").textContent = data.topReferrer || "-";

    const tbody = document.getElementById("topPagesBody");
    tbody.innerHTML = "";

    (data.topPages || []).forEach((item) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.page}</td>
        <td>${item.count}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error(error);
  }
}

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await fetch("/api/admin-logout", { method: "POST" });
  window.location.href = "/admin-login.html";
});

(async function init() {
  const ok = await verifyAdmin();
  if (ok) loadStats();
})();