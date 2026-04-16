document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("captionForm");
  const output = document.getElementById("captionResults");
  const state = document.getElementById("outputState");
  const copyAllBtn = document.getElementById("copyAllBtn");
  const themeToggle = document.getElementById("themeToggle");
  const navToggle = document.getElementById("navToggle");
  const mobileMenu = document.getElementById("mobileMenu");

  let latestCaptions = [];

  function setState(message) {
    state.textContent = message;
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderCaptions(captions) {
    output.innerHTML = "";
    latestCaptions = captions;

    captions.forEach((text, index) => {
      const card = document.createElement("article");
      card.className = "result-card";

      const title = document.createElement("h4");
      title.textContent = `Caption ${index + 1}`;

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
          setTimeout(() => {
            copyBtn.textContent = "Copy";
          }, 1200);
        } catch (error) {
          copyBtn.textContent = "Failed";
          setTimeout(() => {
            copyBtn.textContent = "Copy";
          }, 1200);
        }
      });

      actions.appendChild(copyBtn);
      card.appendChild(title);
      card.appendChild(para);
      card.appendChild(actions);
      output.appendChild(card);
    });
  }

  if (copyAllBtn) {
    copyAllBtn.addEventListener("click", async () => {
      if (!latestCaptions.length) {
        setState("❌ No captions to copy yet.");
        return;
      }

      try {
        await navigator.clipboard.writeText(latestCaptions.join("\n\n"));
        setState("✅ All captions copied.");
      } catch (error) {
        setState("❌ Failed to copy captions.");
      }
    });
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      document.body.classList.toggle("light-theme");
      const isLight = document.body.classList.contains("light-theme");
      const icon = themeToggle.querySelector(".theme-icon");

      if (icon) {
        icon.textContent = isLight ? "☀️" : "🌙";
      }

      localStorage.setItem("insta_ai_theme", isLight ? "light" : "dark");
    });

    const savedTheme = localStorage.getItem("insta_ai_theme");
    if (savedTheme === "light") {
      document.body.classList.add("light-theme");
      const icon = themeToggle.querySelector(".theme-icon");
      if (icon) {
        icon.textContent = "☀️";
      }
    }
  }

  if (navToggle && mobileMenu) {
    navToggle.addEventListener("click", () => {
      const isOpen = mobileMenu.classList.toggle("show");
      navToggle.classList.toggle("active", isOpen);
      navToggle.setAttribute("aria-expanded", String(isOpen));
      mobileMenu.hidden = !isOpen;
    });
  }

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      platform: document.getElementById("platform").value,
      tone: document.getElementById("tone").value,
      length: document.getElementById("length").value,
      language: document.getElementById("language").value,
      postIdea: document.getElementById("postIdea").value.trim(),
      variants: document.getElementById("variants").value,
      includeEmojis: document.getElementById("includeEmojis").checked,
      includeHashtags: document.getElementById("includeHashtags").checked
    };

    if (!data.postIdea) {
      setState("❌ Please enter post idea.");
      return;
    }

    setState("⏳ Generating captions...");
    output.innerHTML = "";
    latestCaptions = [];

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Generating...";
    }

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      const result = await res.json().catch(() => null);

      if (!res.ok || !result?.ok) {
        setState(
          "❌ Error: " +
          (result?.error || result?.raw?.error?.message || `HTTP ${res.status}`)
        );
        console.error("Backend result:", result);
        return;
      }

      if (!Array.isArray(result.captions) || !result.captions.length) {
        setState("❌ No captions received.");
        return;
      }

      renderCaptions(result.captions);
      setState("✅ Captions generated successfully.");
    } catch (error) {
      console.error(error);
      setState("❌ Failed to generate captions. Check backend.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Generate Captions";
      }
    }
  });
  const imageInput = document.getElementById("imageInput");
const uploadBtn = document.getElementById("uploadBtn");
const fileName = document.getElementById("fileName");
const imagePreview = document.getElementById("imagePreview");
const imagePreviewBox = document.getElementById("imagePreviewBox");

let selectedImageBase64 = "";

if (uploadBtn && imageInput) {
  uploadBtn.addEventListener("click", () => {
    imageInput.click();
  });

  imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];

    if (!file) {
      fileName.textContent = "No image selected";
      imagePreviewBox.style.display = "none";
      imagePreview.src = "";
      selectedImageBase64 = "";
      return;
    }

    fileName.textContent = file.name;

    const reader = new FileReader();

    reader.onload = function (e) {
      selectedImageBase64 = e.target.result;
      imagePreview.src = selectedImageBase64;
      imagePreviewBox.style.display = "block";
    };

    reader.readAsDataURL(file);
  });
}
});
