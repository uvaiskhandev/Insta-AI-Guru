export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const { postIdea } = req.body;

    if (!postIdea) {
      return res.status(400).json({ ok: false, error: "Post idea required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        ok: false,
        error: "API key missing"
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Generate 3 Instagram captions for: ${postIdea}`
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(500).json({
        ok: false,
        error: "No response from AI"
      });
    }

    // simple split
    const captions = text.split("\n").filter(Boolean).slice(0, 3);

    res.status(200).json({
      ok: true,
      captions
    });

  } catch (err) {
    console.error("ERROR:", err);

    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
}
