import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// jab bhi prompt generate ho:
await supabase.from("requests").insert([
  { created_at: new Date() }
]);

try {
  if (supabase) {
    await supabase.from("requests").insert([
      { created_at: new Date().toISOString() }
    ]);
  }
} catch (trackingError) {
  console.log("Tracking failed:", trackingError.message);
}
async function parseGeminiResponse(aiResponse) {
  if (!aiResponse || typeof aiResponse !== "object") {
    return [];
  }

  if (typeof aiResponse.text === "string" && aiResponse.text.trim()) {
    return extractItems(aiResponse.text);
  }

  if (typeof aiResponse.text === "function") {
    try {
      const textValue = aiResponse.text();
      if (typeof textValue === "string" && textValue.trim()) {
        return extractItems(textValue);
      }
    } catch (error) {
      // ignore
    }
  }

  const candidates = Array.isArray(aiResponse.candidates) ? aiResponse.candidates : [];

  for (const candidate of candidates) {
    const parts = candidate?.content?.parts;
    if (!Array.isArray(parts)) continue;

    const combined = parts
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("\n")
      .trim();

    if (combined) {
      return extractItems(combined);
    }
  }

  return [];
}

function extractItems(text) {
  if (!text || typeof text !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed?.items)) {
      return parsed.items
        .filter((item) => typeof item === "string" && item.trim())
        .slice(0, 3);
    }
  } catch (error) {
    // continue
  }

  const fenceStart = text.indexOf("```");
  const fenceEnd = text.lastIndexOf("```");

  if (fenceStart !== -1 && fenceEnd !== -1 && fenceEnd > fenceStart) {
    let fenced = text.slice(fenceStart + 3, fenceEnd).trim();

    if (fenced.startsWith("json")) {
      fenced = fenced.slice(4).trim();
    }

    try {
      const parsed = JSON.parse(fenced);
      if (Array.isArray(parsed?.items)) {
        return parsed.items
          .filter((item) => typeof item === "string" && item.trim())
          .slice(0, 3);
      }
    } catch (error) {
      // continue
    }
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const possibleJson = text.slice(firstBrace, lastBrace + 1);

    try {
      const parsed = JSON.parse(possibleJson);
      if (Array.isArray(parsed?.items)) {
        return parsed.items
          .filter((item) => typeof item === "string" && item.trim())
          .slice(0, 3);
      }
    } catch (error) {
      // continue
    }
  }

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("{") && !line.startsWith("}"));

  return lines.slice(0, 3);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { tool, tone, category, prompt } = req.body || {};

    if (!tool || !prompt || !String(prompt).trim()) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Missing GEMINI_API_KEY or GOOGLE_API_KEY in environment variables"
      });
    }

    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const toolInstructions = {
      caption:
        "Generate 3 premium Instagram captions. Keep them polished, attractive, and ready to post. Include emojis where natural.",
      bio:
        "Generate 3 Instagram bios. Keep them stylish, compact, premium, and category-aware.",
      hashtags:
        "Generate 3 lines of Instagram hashtags. Each line should include 10 relevant hashtags mixing broad and niche reach.",
      ideas:
        "Generate 3 Instagram post or reel ideas that are practical and engaging for the given niche."
    };

    const finalPrompt = `
Tool: ${tool}
Tone: ${tone || "professional"}
Category: ${category || "general"}
User input: ${prompt}

Task:
${toolInstructions[tool] || toolInstructions.caption}

Rules:
- Return ONLY valid JSON
- Use this exact structure:
{
  "items": ["text 1", "text 2", "text 3"]
}
- Do not add markdown
- Do not add explanation outside JSON
`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: finalPrompt
    });

    const items = await parseGeminiResponse(response);

    if (!items.length) {
      return res.status(500).json({
        error: "Gemini returned an invalid format"
      });
    }

    return res.status(200).json({ items });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Server error"
    });
  }
}
