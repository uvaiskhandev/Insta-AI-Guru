const toolType = document.getElementById("toolType");
const tone = document.getElementById("tone");
const category = document.getElementById("category");
const inputText = document.getElementById("inputText");
const generateBtn = document.getElementById("generateBtn");
const clearBtn = document.getElementById("clearBtn");
const outputArea = document.getElementById("outputArea");
const creditCount = document.getElementById("creditCount");
const statusBadge = document.getElementById("statusBadge");
const themeToggle = document.getElementById("themeToggle");
const typingText = document.getElementById("typingText");

const CREDIT_KEY = "instaboost_credits";
const THEME_KEY = "instaboost_theme";
const DEFAULT_CREDITS = 2;

const previewTexts = [
  "Captions that convert. Bios that impress.",
  "Create premium Instagram content in seconds.",
  "Hashtags, ideas, and bios — all in one place.",
  "Give your Instagram a smarter AI-powered voice."
];

let isGenerating = false;

function initCredits() {
  const saved = localStorage.getItem(CREDIT_KEY);

  if (saved === null) {
    localStorage.setItem(CREDIT_KEY, String(DEFAULT_CREDITS));
    creditCount.textContent = DEFAULT_CREDITS;
    return;
  }

  const parsed = Number(saved);
  const safeCredits = Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_CREDITS;
  localStorage.setItem(CREDIT_KEY, String(safeCredits));
  creditCount.textContent = safeCredits;
}

function getCredits() {
  const value = Number(localStorage.getItem(CREDIT_KEY));
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_CREDITS;
}

function setCredits(value) {
  const safeValue = Math.max(0, Number(value) || 0);
  localStorage.setItem(CREDIT_KEY, String(safeValue));
  creditCount.textContent = safeValue;
}

function setStatus(type, text) {
  statusBadge.className = `status-badge ${type}`;
  statusBadge.textContent = text;
}

function showToast(message) {
  const oldToast = document.querySelector(".toast");
  if (oldToast) oldToast.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2200);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = String(text ?? "");
  return div.innerHTML;
}

function renderPlaceholder(title, message) {
  outputArea.innerHTML = `
    <div class="placeholder-box">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function renderResults(items) {
  outputArea.innerHTML = "";

  if (!Array.isArray(items) || items.length === 0) {
    renderPlaceholder("No output received", "Please try again with a different prompt.");
    return;
  }

  items.forEach((item, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "result-item";

    wrapper.innerHTML = `
      <p>${escapeHtml(item)}</p>
      <div class="result-actions">
        <button type="button" class="copy-btn" data-copy-index="${index}">Copy</button>
      </div>
    `;

    outputArea.appendChild(wrapper);
  });

  const copyButtons = document.querySelectorAll(".copy-btn");
  copyButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const index = Number(button.dataset.copyIndex);
      const text = items[index] || "";

      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          const temp = document.createElement("textarea");
          temp.value = text;
          temp.setAttribute("readonly", "");
          temp.style.position = "absolute";
          temp.style.left = "-9999px";
          document.body.appendChild(temp);
          temp.select();
          document.execCommand("copy");
          temp.remove();
        }

        showToast("Text copied ✅");
      } catch (error) {
        console.error("Copy failed:", error);
        showToast("Copy failed ❌");
      }
    });
  });
}

function renderLimitReached() {
  outputArea.innerHTML = `
    <div class="limit-box">
      <h3>Free credits finished</h3>
      <p>You have used your 2 free credits. Add ads or payment unlock here later.</p>
      <button type="button" id="resetCreditsBtn" class="small-btn">Reset Demo Credits</button>
    </div>
  `;

  const resetBtn = document.getElementById("resetCreditsBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      setCredits(DEFAULT_CREDITS);
      setStatus("idle", "Idle");
      renderPlaceholder("Credits restored ✨", "You can test the generator again.");
      showToast("Demo credits restored");
    });
  }
}

function buildFallbackOutput(type, toneValue, categoryValue, prompt) {
  const base = prompt.trim() || `${categoryValue} Instagram content`;

  if (type === "caption") {
    return [
      `✨ ${base} — crafted with a ${toneValue} vibe to stand out and connect instantly.`,
      `🔥 ${base} but make it ${toneValue}. Clean visuals, strong message, and the perfect vibe for your audience.`,
      `💫 ${base} that feels ${toneValue}, stylish, and scroll-stopping from the first line.`
    ];
  }

  if (type === "bio") {
    return [
      `✨ ${toneValue} ${categoryValue} account | Creating with purpose 💫`,
      `🚀 ${categoryValue} vibes | ${toneValue} energy | Here to grow and inspire`,
      `💼 ${categoryValue} focused | Smart content | Big vision | DM for collabs`
    ];
  }

  if (type === "hashtags") {
    return [
      `#${categoryValue} #instagramgrowth #viralcontent #contentcreator #explorepage #trendingnow #socialmedia #instatips #digitalgrowth #reelsideas`,
      `#${categoryValue}style #brandcontent #creativepost #growonline #instadaily #newpost #contentstrategy #audiencegrowth #foryou #aestheticcontent`,
      `#${categoryValue}business #captionideas #bioideas #smartmarketing #creatorcommunity #engagementboost #socialsuccess #contentplan #instaai #postbetter`
    ];
  }

  return [
    `1. Show behind-the-scenes of ${base}.`,
    `2. Share a before/after post related to ${base}.`,
    `3. Make a quick reel with 3 useful tips around ${base}.`
  ];
}

async function safeReadJson(response) {
  const raw = await response.text();

  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return { error: raw || "Invalid server response" };
  }
}

async function generateWithAI() {
  if (isGenerating) return;

  const credits = getCredits();
  const text = inputText.value.trim();

  if (!text) {
    showToast("Please enter some details first.");
    inputText.focus();
    return;
  }

  if (credits <= 0) {
    setStatus("error", "Limit Reached");
    renderLimitReached();
    return;
  }

  isGenerating = true;
  generateBtn.disabled = true;
  generateBtn.textContent = "Generating...";
  setStatus("loading", "Generating...");
  renderPlaceholder("Generating premium output...", "Please wait while the AI prepares your result.");

  try {
    const payload = {
      tool: toolType.value,
      tone: tone.value,
      category: category.value,
      prompt: text
    };

    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await safeReadJson(response);

    if (!response.ok) {
      throw new Error(data.error || "Something went wrong.");
    }

    const items = Array.isArray(data.items) && data.items.length
      ? data.items
      : buildFallbackOutput(toolType.value, tone.value, category.value, text);

    setCredits(credits - 1);
    renderResults(items);
    setStatus("success", "Done");
    showToast("Output generated successfully ✨");
  } catch (error) {
    console.error("Generate error:", error);
    const fallback = buildFallbackOutput(toolType.value, tone.value, category.value, text);
    renderResults(fallback);
    setStatus("error", "Fallback Used");
    showToast("AI issue detected. Showing fallback output.");
  } finally {
    isGenerating = false;
    generateBtn.disabled = false;
    generateBtn.textContent = "Generate with AI";
  }
}

function clearForm() {
  inputText.value = "";
  renderPlaceholder("Cleared ✨", "Enter a new topic to generate fresh results.");
  setStatus("idle", "Idle");
}

function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);

  if (savedTheme === "light") {
    document.body.classList.add("light");
    themeToggle.textContent = "☀️";
  } else {
    themeToggle.textContent = "🌙";
  }
}

function toggleTheme() {
  document.body.classList.toggle("light");
  const isLight = document.body.classList.contains("light");
  localStorage.setItem(THEME_KEY, isLight ? "light" : "dark");
  themeToggle.textContent = isLight ? "☀️" : "🌙";
}

function initTypingEffect() {
  let index = 0;

  setInterval(() => {
    index = (index + 1) % previewTexts.length;
    typingText.textContent = previewTexts[index];
  }, 2400);
}

generateBtn.addEventListener("click", generateWithAI);
clearBtn.addEventListener("click", clearForm);
themeToggle.addEventListener("click", toggleTheme);

initCredits();
initTheme();
initTypingEffect();

if (getCredits() <= 0) {
  renderLimitReached();
}