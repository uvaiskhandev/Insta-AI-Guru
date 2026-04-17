document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const themeToggle = document.getElementById("themeToggle");
  const navToggle = document.getElementById("navToggle");
  const mobileMenu = document.getElementById("mobileMenu");

  function applySavedTheme() {
    const savedTheme = localStorage.getItem("insta_ai_theme");
    const icon = themeToggle?.querySelector(".theme-icon");

    if (savedTheme === "light") {
      body.classList.add("light-theme");
      if (icon) icon.textContent = "☀️";
    } else if (icon) {
      icon.textContent = "🌙";
    }
  }

  applySavedTheme();

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      body.classList.toggle("light-theme");
      const isLight = body.classList.contains("light-theme");
      const icon = themeToggle.querySelector(".theme-icon");
      if (icon) icon.textContent = isLight ? "☀️" : "🌙";
      localStorage.setItem("insta_ai_theme", isLight ? "light" : "dark");
    });
  }

  if (navToggle && mobileMenu) {
    navToggle.addEventListener("click", () => {
      const isOpen = mobileMenu.classList.toggle("show");
      navToggle.classList.toggle("active", isOpen);
      navToggle.setAttribute("aria-expanded", String(isOpen));
      mobileMenu.hidden = !isOpen;
    });
  }

  const textOutput = document.getElementById("generatedText");
  const state = document.getElementById("outputState");
  const copyAllBtn = document.getElementById("copyAllBtn");
  const form = document.getElementById("aiForm") || document.getElementById("captionForm");
  let selectedImageBase64 = "";
  let latestItems = [];

  function setState(message, type = "default") {
    if (!state) return;
    state.className = "output-state";
    if (type === "error") state.classList.add("error-box");
    if (type === "success") state.classList.add("notice");
    state.textContent = message;
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderItems(items, headingPrefix = "Result") {
    if (!textOutput) return;
    textOutput.innerHTML = "";
    latestItems = items;

    items.forEach((text, index) => {
      const card = document.createElement("article");
      card.className = "result-card";

      const title = document.createElement("h4");
      title.textContent = `${headingPrefix} ${index + 1}`;

      const para = document.createElement("p");
      para.innerHTML = escapeHtml(text).replace(/\n/g, "<br>");

      const actions = document.createElement("div");
      actions.className = "result-actions";

      const copyBtn = document.createElement("button");
      copyBtn.className = "copy-btn";
      copyBtn.type = "button";
      copyBtn.textContent = "Copy";
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(text);
          copyBtn.textContent = "Copied!";
        } catch (error) {
          copyBtn.textContent = "Failed";
        }
        setTimeout(() => {
          copyBtn.textContent = "Copy";
        }, 1200);
      });

      actions.appendChild(copyBtn);
      card.append(title, para, actions);
      textOutput.appendChild(card);
    });
  }

  if (copyAllBtn) {
    copyAllBtn.addEventListener("click", async () => {
      if (!latestItems.length) {
        setState("No results to copy yet.", "error");
        return;
      }
      try {
        await navigator.clipboard.writeText(latestItems.join("\n\n"));
        setState("All results copied successfully.", "success");
      } catch (error) {
        setState("Copy failed. Please try again.", "error");
      }
    });
  }

  const imageInput = document.getElementById("imageInput");
  const uploadBtn = document.getElementById("uploadBtn");
  const fileName = document.getElementById("fileName");
  const imagePreview = document.getElementById("imagePreview");
  const imagePreviewBox = document.getElementById("imagePreviewBox");

  if (uploadBtn && imageInput) {
    uploadBtn.addEventListener("click", () => imageInput.click());
    imageInput.addEventListener("change", () => {
      const file = imageInput.files?.[0];
      if (!file) {
        selectedImageBase64 = "";
        if (fileName) fileName.textContent = "No image selected";
        if (imagePreview) imagePreview.src = "";
        if (imagePreviewBox) imagePreviewBox.style.display = "none";
        return;
      }

      if (file.size > 4 * 1024 * 1024) {
        setState("Image is too large. Please upload under 4 MB.", "error");
        imageInput.value = "";
        return;
      }

      if (fileName) fileName.textContent = file.name;
      const reader = new FileReader();
      reader.onload = (e) => {
        selectedImageBase64 = e.target?.result || "";
        if (imagePreview) imagePreview.src = selectedImageBase64;
        if (imagePreviewBox) imagePreviewBox.style.display = "block";
      };
      reader.readAsDataURL(file);
    });
  }

  if (!form || !textOutput) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    const action = form.dataset.action || document.getElementById("toolAction")?.value || "captions";
    const topic = document.getElementById("postIdea")?.value.trim() || document.getElementById("topic")?.value.trim() || "";
    const variantsValue = document.getElementById("variants")?.value || "3";
    const count = Math.max(1, Math.min(3, Number(variantsValue) || 3));
    const platform = document.getElementById("platform")?.value || "Instagram";
    const tone = document.getElementById("tone")?.value || "Professional";
    const length = document.getElementById("length")?.value || "Medium";
    const language = document.getElementById("language")?.value || "English";
    const includeEmojis = document.getElementById("includeEmojis")?.checked ?? true;
    const includeHashtags = document.getElementById("includeHashtags")?.checked ?? true;

    if (!topic) {
      setState("Please enter your topic or post idea.", "error");
      return;
    }

    const payload = {
      action,
      platform,
      tone,
      length,
      language,
      postIdea: topic,
      variants: count,
      includeEmojis,
      includeHashtags,
      image: selectedImageBase64 || null
    };

    setState("Generating smart AI results...", "default");
    textOutput.innerHTML = "";
    latestItems = [];
    document.getElementById("resultsArea")?.scrollIntoView({ behavior: "smooth", block: "start" });

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Generating...";
    }

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.ok) {
        throw new Error(result?.error || `Request failed with status ${res.status}`);
      }

      const items = result.items || result.captions || [];
      if (!Array.isArray(items) || !items.length) {
        throw new Error("AI did not return usable results.");
      }

      const prefixMap = {
        captions: "Caption",
        bio: "Bio",
        hashtags: "Hashtag Set",
        reelIdeas: "Idea"
      };

      renderItems(items, prefixMap[action] || "Result");
      setState("AI results generated successfully.", "success");
    } catch (error) {
      console.error(error);
      setState(error.message || "Something went wrong.", "error");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = form.dataset.buttonText || "Generate Now";
      }
    }
  });
});
