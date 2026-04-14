const crypto = require("crypto");

function parseCookies(cookieHeader = "") {
  return Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [key, ...v] = c.trim().split("=");
      return [key, v.join("=")];
    })
  );
}

function verifyToken(token, secret) {
  if (!token) return null;

  const [data, signature] = token.split(".");
  if (!data || !signature) return null;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64url");

  if (expected !== signature) return null;

  const payload = JSON.parse(Buffer.from(data, "base64url").toString());
  if (Date.now() > payload.exp) return null;

  return payload;
}

async function fetchAllEvents() {
  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/analytics_events?select=*`,
    {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      }
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch analytics");
  }

  return await res.json();
}

module.exports = async (req, res) => {
  const cookies = parseCookies(req.headers.cookie || "");
  const token = cookies.admin_session;
  const payload = verifyToken(token, process.env.ADMIN_SECRET);

  if (!payload) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const events = await fetchAllEvents();

    const today = new Date().toISOString().slice(0, 10);

    const totalEvents = events.length;
    const todayEvents = events.filter((e) => (e.created_at || "").startsWith(today)).length;
    const pageViews = events.filter((e) => e.event_name === "page_view").length;
    const captionUses = events.filter((e) => e.event_name === "caption_generate").length;
    const bioUses = events.filter((e) => e.event_name === "bio_generate").length;
    const hashtagUses = events.filter((e) => e.event_name === "hashtag_generate").length;
    const copyClicks = events.filter((e) => e.event_name === "copy_click").length;

    const pageMap = {};
    const refMap = {};

    events.forEach((e) => {
      if (e.page) {
        pageMap[e.page] = (pageMap[e.page] || 0) + 1;
      }
      if (e.referrer) {
        refMap[e.referrer] = (refMap[e.referrer] || 0) + 1;
      }
    });

    const topPages = Object.entries(pageMap)
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topReferrer =
      Object.entries(refMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "Direct";

    return res.status(200).json({
      success: true,
      totalEvents,
      todayEvents,
      pageViews,
      captionUses,
      bioUses,
      hashtagUses,
      copyClicks,
      topReferrer,
      topPages
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load stats"
    });
  }
};