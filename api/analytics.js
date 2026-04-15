import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  try {
    const { count: total, error: totalError } = await supabase
      .from("requests")
      .select("*", { count: "exact", head: true });

    if (totalError) {
      return res.status(500).json({ error: totalError.message });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: todayCount, error: todayError } = await supabase
      .from("requests")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString());

    if (todayError) {
      return res.status(500).json({ error: todayError.message });
    }

    return res.status(200).json({
      total: total || 0,
      today: todayCount || 0
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Server error"
    });
  }
}
