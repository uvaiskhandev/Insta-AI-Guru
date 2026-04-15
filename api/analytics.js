import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  try {
    // total requests
    const { count: total } = await supabase
      .from("requests")
      .select("*", { count: "exact", head: true });

    // today's requests
    const today = new Date().toISOString().split("T")[0];

    const { count: todayCount } = await supabase
      .from("requests")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today);

    res.status(200).json({
      total,
      today: todayCount
    });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}