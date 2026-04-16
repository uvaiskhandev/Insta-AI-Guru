module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed. Use POST."
    });
  }

  try {
    const {
      platform,
      tone,
      length,
      language,
      postIdea,
      variants,
      includeEmojis,
      includeHashtags
    } = req.body || {};

    if (!postIdea || typeof postIdea !== "string" || !postIdea.trim()) {
      return res.status(400).json({
        ok: false,
        error: "Post idea is required."
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        ok: false,
        error: "Missing GEMINI_API_KEY in environment variables."
      });
    }

    const safePlatform = String(platform || "Instagram").trim();
    const safeTone = String(tone || "Professional").trim();
    const safeLength = String(length || "Medium").trim();
    const safeLanguage = String(language || "English").trim();
    const safePostIdea = String(postIdea).trim();
    const safeVariants = Math.min(Math.max(Number(variants) || 3, 1), 3);
    const wantsEmojis = Boolean(includeEmojis);
    const wantsHashtags = Boolean(includeHashtags);

    const prompt = `
You are an expert social media caption writer.

Generate exactly ${safeVariants} high-quality ${safePlatform} captions.

Requirements:
- Tone: ${safeTone}
- Length: ${safeLength}
- Language: ${safeLanguage}
- Topic: ${safePostIdea}
- Include emojis: ${wantsEmojis ? "Yes" : "No"}
- Include hashtags: ${wantsHashtags ? "Yes" : "No"}

Rules:
- Return ONLY valid JSON.
- Do not include markdown code fences.
- JSON format must be:
{
  "captions": [
    "caption 1",
    "caption 2",
    "caption 3"
  ]
}
- If variants are less than 3, return only that many captions.
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.9,
            topP: 0.95,
            maxOutputTokens: 900,
            responseMimeType: "application/json"
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: data?.error?.message || "Gemini API request failed."
      });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) {
      return res.status(500).json({
        ok: false,
        error: "Empty response from Gemini."
      });
    }

    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: "Failed to parse Gemini JSON response.",
        modelText: text
      });
    }

    const captions = Array.isArray(parsed?.captions)
      ? parsed.captions.filter(item => typeof item === "string" && item.trim()).slice(0, safeVariants)
      : [];

    if (!captions.length) {
      return res.status(500).json({
        ok: false,
        error: "No captions returned by model."
      });
    }

    return res.status(200).json({
      ok: true,
      captions
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error?.message || "Internal server error."
    });
  }
};
