async function callGeminiWithRetry(url, options, retries = 3, delay = 1500) {
  let lastData = null;
  let lastStatus = 500;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => null);

    lastData = data;
    lastStatus = response.status;

    if (response.ok) {
      return { response, data };
    }

    const message = data?.error?.message || "";

    const shouldRetry =
      response.status === 429 ||
      response.status === 500 ||
      response.status === 503 ||
      /high demand|overloaded|unavailable|temporarily|busy/i.test(message);

    if (!shouldRetry || attempt === retries) {
      return { response, data };
    }

    await new Promise((resolve) => setTimeout(resolve, delay * attempt));
  }

  return {
    response: { ok: false, status: lastStatus },
    data: lastData
  };
}

function normalizeCaption(text) {
  return String(text || "")
    .replace(/^"(.*)"[,]?$/, "$1")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, "\n")
    .trim();
}

function uniqueCaptions(items) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const clean = normalizeCaption(item);
    const key = clean.toLowerCase();

    if (!clean) continue;
    if (clean === "{" || clean === "}" || clean === "[" || clean === "]") continue;
    if (key.startsWith('"captions"') || key.startsWith("captions")) continue;
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(clean);
  }

  return result;
}

function extractCaptions(rawText, count) {
  if (!rawText) return [];

  const cleaned = String(rawText)
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // 1) Direct JSON parse
  try {
    const parsed = JSON.parse(cleaned);

    if (Array.isArray(parsed)) {
      return uniqueCaptions(parsed).slice(0, count);
    }

    if (Array.isArray(parsed?.captions)) {
      return uniqueCaptions(parsed.captions).slice(0, count);
    }
  } catch (e) {}

  // 2) Extract object containing "captions"
  try {
    const match = cleaned.match(/\{[\s\S]*?"captions"\s*:\s*\[[\s\S]*?\][\s\S]*?\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed?.captions)) {
        return uniqueCaptions(parsed.captions).slice(0, count);
      }
    }
  } catch (e) {}

  // 3) Extract just the array part [...]
  try {
    const arrayMatch = cleaned.match(/\[[\s\S]*?\]/);
    if (arrayMatch) {
      const parsedArray = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsedArray)) {
        return uniqueCaptions(parsedArray).slice(0, count);
      }
    }
  } catch (e) {}

  // 4) Fallback plain text split
  const fallback = cleaned
    .split(/\n{2,}|\n(?=\d+[\).\-\s])/)
    .map((line) => line.replace(/^\d+[\).\-\s]*/, "").trim())
    .filter(Boolean);

  return uniqueCaptions(fallback).slice(0, count);
}

function getImageInfoFromDataUrl(image) {
  if (!image || typeof image !== "string") return null;

  const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;

  return {
    mimeType: match[1],
    base64Data: match[2]
  };
}

async function requestCaptions({
  apiKey,
  count,
  platform,
  tone,
  length,
  language,
  postIdea,
  includeEmojis,
  includeHashtags,
  imageInfo,
  strictRetry = false
}) {
  const prompt = strictRetry
    ? `
You are a professional social media caption writer.

Generate exactly ${count} DIFFERENT caption variants.

Requirements:
- Platform: ${platform}
- Tone: ${tone}
- Length: ${length}
- Language: ${language}
- Include Emojis: ${includeEmojis ? "Yes" : "No"}
- Include Hashtags: ${includeHashtags ? "Yes" : "No"}

User's post idea:
${postIdea}

${
  imageInfo
    ? `Important:
- Carefully analyze the uploaded image.
- Base captions on the actual image content.
- Mention the real scene, mood, subject, and setting if relevant.
- Do not make assumptions beyond what is visible.`
    : `No image is attached. Write captions only from the user's text idea.`
}

VERY IMPORTANT:
- Return exactly ${count} captions
- Every caption must be clearly different
- Do not return fewer than ${count} captions
- Do not return more than ${count} captions
- Return ONLY a valid JSON object
- No markdown
- No explanation
- No headings

Return in this exact format:
{
  "captions": [
    "caption 1",
    "caption 2",
    "caption 3"
  ]
}
`.trim()
    : `
You are a professional social media caption writer.

Generate exactly ${count} caption variants.

Requirements:
- Platform: ${platform}
- Tone: ${tone}
- Length: ${length}
- Language: ${language}
- Include Emojis: ${includeEmojis ? "Yes" : "No"}
- Include Hashtags: ${includeHashtags ? "Yes" : "No"}

User's post idea:
${postIdea}

${
  imageInfo
    ? `Important:
- Carefully analyze the uploaded image.
- Understand the subject, mood, setting, style, and visual details of the image.
- Write captions based on the actual image, not assumptions.
- Make each caption meaningfully different.`
    : `No image is attached. Write captions only from the user's text idea.`
}

Return ONLY valid JSON in this exact format:
{
  "captions": [
    "caption 1",
    "caption 2",
    "caption 3"
  ]
}

Rules:
- Do not add markdown
- Do not add triple backticks
- Do not add explanation
- Do not add headings
- Return only JSON
`.trim();

  const parts = [];

  if (imageInfo) {
    parts.push({
      inline_data: {
        mime_type: imageInfo.mimeType,
        data: imageInfo.base64Data
      }
    });
  }

  parts.push({ text: prompt });

  const { response, data } = await callGeminiWithRetry(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: strictRetry ? 0.9 : 0.7,
          maxOutputTokens: 900
        }
      })
    },
    3,
    1500
  );

  return { response, data };
}

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
      includeHashtags = true,
      image = null
    } = req.body || {};

    if (!postIdea || !String(postIdea).trim()) {
      return res.status(400).json({
        ok: false,
        error: "Post idea is required"
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        ok: false,
        error: "Missing GEMINI_API_KEY"
      });
    }

    const count = Math.max(1, Math.min(3, Number(variants) || 1));
    const imageInfo = getImageInfoFromDataUrl(image);

    // First request
    let { response, data } = await requestCaptions({
      apiKey,
      count,
      platform,
      tone,
      length,
      language,
      postIdea,
      includeEmojis,
      includeHashtags,
      imageInfo,
      strictRetry: false
    });

    if (!response.ok) {
      const msg = data?.error?.message || "AI service is temporarily busy";

      const friendlyMessage =
        /high demand|overloaded|unavailable|temporarily|busy/i.test(msg)
          ? "AI is busy right now. Please try again in a few seconds."
          : msg;

      return res.status(response.status || 500).json({
        ok: false,
        error: friendlyMessage,
        raw: data
      });
    }

    let rawText = data?.candidates?.[0]?.content?.parts
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

    let captions = extractCaptions(rawText, count);

    // If captions are fewer than requested, do one stricter retry
    if (captions.length < count) {
      const retryResult = await requestCaptions({
        apiKey,
        count,
        platform,
        tone,
        length,
        language,
        postIdea,
        includeEmojis,
        includeHashtags,
        imageInfo,
        strictRetry: true
      });

      if (retryResult.response.ok) {
        const retryText = retryResult.data?.candidates?.[0]?.content?.parts
          ?.map((part) => part?.text || "")
          .join("")
          .trim();

        if (retryText) {
          rawText = retryText;
          captions = extractCaptions(retryText, count);
        }
      }
    }

    if (!captions.length) {
      return res.status(500).json({
        ok: false,
        error: "No captions found in AI response",
        rawText
      });
    }

    if (captions.length < count) {
      return res.status(500).json({
        ok: false,
        error: `Only ${captions.length} caption(s) were generated. Please try again.`,
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
