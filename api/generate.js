const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const MAX_VARIANTS = 3;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options, retries = 3, delay = 1200) {
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      const data = await response.json().catch(() => null);

      if (response.ok) return { response, data };

      const message = data?.error?.message || "";
      const retryable =
        response.status === 429 ||
        response.status === 500 ||
        response.status === 503 ||
        /busy|overloaded|unavailable|temporarily|high demand/i.test(message);

      if (!retryable || attempt === retries) {
        return { response, data };
      }

      await sleep(delay * attempt);
    } catch (error) {
      lastError = error;
      if (attempt === retries) throw error;
      await sleep(delay * attempt);
    }
  }

  throw lastError || new Error("Unknown AI request failure");
}

function parseDataUrlImage(image) {
  if (!image || typeof image !== "string") return null;
  const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    base64Data: match[2]
  };
}

function normalize(text) {
  return String(text || "")
    .replace(/^"(.*)"[,]?$/, "$1")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, "\n")
    .trim();
}

function uniq(items) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const clean = normalize(item);
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    if (["{", "}", "[", "]"].includes(clean)) continue;
    if (key.startsWith("captions") || key.startsWith('"captions"')) continue;
    if (key.startsWith("items") || key.startsWith('"items"')) continue;
    seen.add(key);
    result.push(clean);
  }

  return result;
}

function extractItems(rawText, requestedCount) {
  if (!rawText) return [];
  const cleaned = String(rawText)
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const directParseTargets = [cleaned];
  const objectMatch = cleaned.match(/\{[\s\S]*?("items"|"captions")\s*:\s*\[[\s\S]*?\][\s\S]*?\}/);
  const arrayMatch = cleaned.match(/\[[\s\S]*?\]/);
  if (objectMatch) directParseTargets.push(objectMatch[0]);
  if (arrayMatch) directParseTargets.push(arrayMatch[0]);

  for (const candidate of directParseTargets) {
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) return uniq(parsed).slice(0, requestedCount);
      if (Array.isArray(parsed?.items)) return uniq(parsed.items).slice(0, requestedCount);
      if (Array.isArray(parsed?.captions)) return uniq(parsed.captions).slice(0, requestedCount);
    } catch {
      // ignore parse failures
    }
  }

  return uniq(
    cleaned
      .split(/\n{2,}|\n(?=\d+[).\-\s])/)
      .map((line) => line.replace(/^\d+[).\-\s]*/, "").trim())
      .filter(Boolean)
  ).slice(0, requestedCount);
}

function buildPrompt({
  action,
  count,
  platform,
  tone,
  length,
  language,
  postIdea,
  includeEmojis,
  includeHashtags,
  hasImage
}) {
  const taskMap = {
    captions: `Generate exactly ${count} high-quality social media captions.`,
    bio: `Generate exactly ${count} premium social media bios.`,
    hashtags: `Generate exactly ${count} hashtag sets.`,
    reelIdeas: `Generate exactly ${count} reel ideas with hook, execution, and CTA.`
  };

  const formatRules = {
    captions: `
For captions:
- Make each caption feel premium, natural, and human-written
- Make every caption clearly different in angle and wording
- Match the selected platform and tone properly
- If image exists, use visible details from the image naturally
- Do NOT sound robotic or repetitive
- Avoid generic lines like "elevate your feed" unless truly suitable
- Add emojis only if requested
- Add hashtags only if requested
`,
    bio: `
For bios:
- Make each bio short, profile-ready, and premium
- Use strong niche identity
- Keep it attractive and practical
- Avoid generic overused phrases
- Add emojis only if requested
`,
    hashtags: `
For hashtags:
- Each result must be a single line
- Use 12 to 18 relevant hashtags only
- Mix broad + niche + intent-based hashtags
- Avoid spammy repeated hashtags
`,
    reelIdeas: `
For reel ideas:
- Each idea must include:
  1. Hook
  2. Execution
  3. CTA
- Keep ideas practical and easy to shoot
- Avoid vague advice
- Make each idea clearly different
`
  };

  return `
You are an elite social media strategist and copywriter.

Task:
${taskMap[action] || taskMap.captions}

Input context:
- Platform: ${platform}
- Tone: ${tone}
- Length: ${length}
- Language: ${language}
- User input: ${postIdea}
- Emojis allowed: ${includeEmojis ? "Yes" : "No"}
- Hashtags allowed: ${includeHashtags ? "Yes" : "No"}

Image instructions:
${
  hasImage
    ? `
An image is attached.
You must carefully inspect the image and use ONLY visible details.
Focus on:
- subject or person
- outfit / product / object details
- colors
- background / setting
- mood / vibe
- style / luxury / aesthetic feel
Blend image details naturally with the user's text.
Do not invent hidden details.
`
    : `No image is attached. Use only the written input.`
}

Quality rules:
- Return exactly ${count} items
- Every item must be meaningfully different
- The writing must feel premium, specific, and realistic
- Do not repeat the same opening style
- Do not use filler
- Do not use markdown
- Do not include explanations
- Return only valid JSON

${formatRules[action] || formatRules.captions}

Return exactly in this format:
{
  "items": [
    "item 1",
    "item 2",
    "item 3"
  ]
}
`.trim();
}
async function requestAI({ apiKey, action, count, platform, tone, length, language, postIdea, includeEmojis, includeHashtags, imageInfo, strict }) {
  const parts = [];

  if (imageInfo) {
    parts.push({
      inline_data: {
        mime_type: imageInfo.mimeType,
        data: imageInfo.base64Data
      }
    });
  }

  parts.push({
    text: buildPrompt({
      action,
      count,
      platform,
      tone,
      length,
      language,
      postIdea,
      includeEmojis,
      includeHashtags,
      hasImage: Boolean(imageInfo)
    })
  });

  return fetchWithRetry(
    GEMINI_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: strict ? 0.95 : 0.75,
          maxOutputTokens: 1000,
          responseMimeType: "application/json"
        }
      })
    },
    3,
    1200
  );
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const {
      action = "captions",
      platform = "Instagram",
      tone = "Professional",
      length = "Medium",
      language = "English",
      postIdea = "",
      variants = 3,
      includeEmojis = true,
      includeHashtags = true,
      image = null
    } = req.body || {};

    if (!String(postIdea).trim()) {
      return res.status(400).json({ ok: false, error: "Post idea or topic is required." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ ok: false, error: "Missing GEMINI_API_KEY in environment." });
    }

    const count = Math.max(1, Math.min(MAX_VARIANTS, Number(variants) || 3));
    const imageInfo = parseDataUrlImage(image);

    let { response, data } = await requestAI({
      apiKey,
      action,
      count,
      platform,
      tone,
      length,
      language,
      postIdea,
      includeEmojis,
      includeHashtags,
      imageInfo,
      strict: false
    });

    if (!response.ok) {
      const message = data?.error?.message || "AI service is temporarily unavailable.";
      const friendly = /busy|overloaded|unavailable|temporarily|high demand/i.test(message)
        ? "AI is busy right now. Please try again in a few seconds."
        : message;
      return res.status(response.status || 500).json({ ok: false, error: friendly, raw: data });
    }

    let rawText = data?.candidates?.[0]?.content?.parts?.map((part) => part?.text || "").join("\n").trim();
    let items = extractItems(rawText, count);

    if (items.length < count) {
      const retry = await requestAI({
        apiKey,
        action,
        count,
        platform,
        tone,
        length,
        language,
        postIdea,
        includeEmojis,
        includeHashtags,
        imageInfo,
        strict: true
      });

      if (retry.response.ok) {
        rawText = retry.data?.candidates?.[0]?.content?.parts?.map((part) => part?.text || "").join("\n").trim();
        items = extractItems(rawText, count);
      }
    }

    if (!items.length) {
      return res.status(500).json({ ok: false, error: "No usable results found in AI response.", rawText });
    }

    return res.status(200).json({
      ok: true,
      action,
      items: items.slice(0, count)
    });
  } catch (error) {
    console.error("SERVER ERROR:", error);
    return res.status(500).json({
      ok: false,
      error: error?.message || "Internal server error"
    });
  }
}
