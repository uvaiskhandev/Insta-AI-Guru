module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false });
  }

  const { eventName, page, referrer } = req.body || {};

  if (!eventName) {
    return res.status(400).json({ success: false, message: "eventName required" });
  }

  const ua = req.headers["user-agent"] || "";
  const device = /mobile/i.test(ua) ? "Mobile" : "Desktop";

  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/analytics_events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        event_name: eventName,
        page: page || null,
        device,
        country: null,
        referrer: referrer || "Direct"
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(500).json({ success: false, message: text });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Tracking failed" });
  }
};