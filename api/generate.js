export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });
  }

  try {
    const {
      mode = "caption",
      idea = "",
      topic = "",
      niche = "",
      tone = "Professional",
      language = "English",
      platform = "Instagram",
      imageBase64 = "",
      imageMimeType = "",
      postIdea = "",
      prompt = ""
    } = req.body || {};

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        ok: false,
        error: "Missing GEMINI_API_KEY in environment variables"
      });
    }

    const userInput = idea || topic || niche || postIdea || prompt || "";

    if (!userInput && !imageBase64) {
      return res.status(400).json({
        ok: false,
        error: "Please provide some input"
      });
    }

    let systemPrompt = "";

    if (mode === "caption") {
      systemPrompt = `
You are an expert Instagram caption writer.
Generate 3 high-quality ${platform} captions in ${language} with a ${tone} tone.

Rules:
- Make each caption different
- Make them natural and engaging
- Add emojis only if suitable
- Add relevant hashtags at the end
- Return ONLY valid JSON in this format:
{"data":["caption 1","caption 2","caption 3"]}
`;
    } else if (mode === "hashtags") {
      systemPrompt = `
You are an Instagram hashtag expert.
Generate 3 different sets of hashtags in ${language}.

Return ONLY valid JSON in this format:
{"data":["set 1","set 2","set 3"]}
`;
    } else if (mode === "bio") {
      systemPrompt = `
You are an Instagram bio expert.
Generate 3 optimized Instagram bios in ${language} with a ${tone} tone.

Return ONLY valid JSON in this format:
{"data":["bio 1","bio 2","bio 3"]}
`;
    } else if (mode === "reel") {
      systemPrompt = `
You are an Instagram reel strategist.
Generate 3 reel ideas in ${language}.

Return ONLY valid JSON in this format:
{
  "data": [
    {
      "title": "idea title",
      "hook": "hook line",
      "content": "what happens in the reel",
      "cta": "call to action"
    },
    {
      "title": "idea title",
      "hook": "hook line",
      "content": "what happens in the reel",
      "cta": "call to action"
    },
    {
      "title": "idea title",
      "hook": "hook line",
      "content": "what happens in the reel",
      "cta": "call to action"
    }
  ]
}
`;
    } else {
      systemPrompt = `
Return ONLY valid JSON in this format:
{"data":["output 1","output 2","output 3"]}
`;
    }

    const parts = [
      {
        text: `${systemPrompt}\n\nUser input:\n${userInput}`
      }
    ];

    if (imageBase64 && imageMimeType) {
      parts.push({
        inline_data: {
          mime_type: imageMimeType,
          data: imageBase64
        }
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts
            }
          ],
          generationConfig: {
            temperature: 0.8,
            responseMimeType: "application/json"
          }
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: result?.error?.message || "Gemini API error"
      });
    }

    const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!rawText) {
      return res.status(500).json({
        ok: false,
        error: "Empty AI response"
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return res.status(500).json({
        ok: false,
        error: "AI returned invalid JSON",
        raw: rawText
      });
    }

    if (!parsed?.data || !Array.isArray(parsed.data)) {
      return res.status(500).json({
        ok: false,
        error: "AI response missing data array"
      });
    }

    return res.status(200).json({
      ok: true,
      data: parsed.data
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || "Server error"
    });
  }
}
