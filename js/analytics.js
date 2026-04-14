async function trackEvent(eventName, extra = {}) {
  try {
    await fetch("/api/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        eventName,
        page: window.location.pathname,
        referrer: document.referrer || "Direct",
        ...extra
      })
    });
  } catch (error) {
    console.error("Tracking failed:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  trackEvent("page_view");
});