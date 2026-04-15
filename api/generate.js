export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { tool, tone, category, prompt } = req.body || {};

    if (!tool || !prompt) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "API key missing" });
    }

    const { GoogleGenAI } = await import("@google/genai");

    const ai = new GoogleGenAI({ apiKey });

    const toolInstructions = {
      caption: "Generate 3 premium Instagram captions with emojis.",
      bio: "Generate 3 stylish Instagram bios.",
      hashtags: "Generate 3 lines of 10 hashtags.",
      ideas: "Generate 3 Instagram post ideas."
    };

    const finalPrompt = `
Tool: ${tool}
Tone: ${tone || "professional"}
Category: ${category || "general"}
User input: ${prompt}

Task:
${toolInstructions[tool]}

Return ONLY JSON:
{
 "items": ["text1", "text2", "text3"]
}
`;

    // 🔁 FUNCTION FOR TRYING MODEL
    async function generate(modelName) {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: finalPrompt
      });

      const text = response.text?.() || "";

      try {
        const parsed = JSON.parse(text);
        return parsed.items || [];
      } catch {
        return text.split("\n").filter(Boolean).slice(0, 3);
      }
    }

    let items = [];

    // 🔥 TRY 1 → FAST MODEL
    try {
      items = await generate("gemini-1.5-flash");
    } catch (err) {
      console.log("First model failed");
    }

    // 🔥 TRY 2 → BACKUP MODEL
    if (!items.length) {
      try {
        items = await generate("gemini-1.5-pro");
      } catch (err) {
        console.log("Backup model failed");
      }
    }

    // ❌ FINAL FAIL
    if (!items.length) {
      return res.status(500).json({
        error: "AI temporarily unavailable"
      });
    }

    return res.status(200).json({ items });

  } catch (error) {
    return res.status(500).json({
      error: error.message || "Server error"
    });
  }
}
