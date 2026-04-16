export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const {
      platform = "Instagram",
      tone = "Professional",
      length = "Medium",
      language = "English",
      postIdea = "",
      variants = "3",
      includeEmojis = true,
      includeHashtags = true
    } = req.body || {};

    if (!postIdea || !String(postIdea).trim()) {
      return res.status(400).json({ ok: false, error: "Post idea is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ ok: false, error: "Missing GEMINI_API_KEY" });
    }

    const count = Math.max(1, Math.min(3, Number(variants) || 1));

    const prompt = `
You are a professional social media caption writer.

Generate exactly ${count} caption variants.

Requirements:
- Platform: ${platform}
- Tone: ${tone}
- Length: ${length}
- Language: ${language}
- Include Emojis: ${includeEmojis ? "Yes" : "No"}
- Include Hashtags: ${includeHashtags ? "Yes" : "No"}

Post idea:
${postIdea}

Return ONLY valid JSON in this exact format:
{
  "captions": [
    "caption 1",
    "caption 2",
    "caption 3"
  ]
}
Do not add markdown.
Do not add triple backticks.
`.trim();

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 1000
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: data?.error?.message || "Gemini API request failed",
        raw: data
      });
    }

    const rawText = data?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text || "")
      .join("")
      .trim();

    if (!rawText) {
      return res.status(500).json({
        ok: false,
        error: "No text returned by Gemini",
        raw: data
      });
    }

    let captions = [];

    try {
      const cleaned = rawText
        .replace(/^```json/i, "")
        .replace(/^```/i, "")
        .replace(/```$/i, "")
        .trim();

      const parsed = JSON.parse(cleaned);

      if (Array.isArray(parsed?.captions)) {
        captions = parsed.captions.map(x => String(x || "").trim()).filter(Boolean);
      }
    } catch {
      captions = rawText
        .split("\n")
        .map(line => line.replace(/^\d+[\).\-\s]*/, "").trim())
        .filter(Boolean)
        .slice(0, count);
    }

    if (!captions.length) {
      return res.status(500).json({
        ok: false,
        error: "No captions found in AI response",
        rawText
      });
    }

    return res.status(200).json({
      ok: true,
      captions: captions.slice(0, count)
    });
  } catch (error) {
    console.error("SERVER ERROR:", error);
    return res.status(500).json({
      ok: false,
      error: error?.message || "Internal server error"
    });
  }
}
