document.addEventListener("DOMContentLoaded", () => {

  const form =
    document.getElementById("captionForm") ||
    document.getElementById("bioForm") ||
    document.getElementById("reelIdeasForm") ||
    document.getElementById("hashtagForm");

  if (!form) return;

  const action = form.dataset.action || "captions";

  // OUTPUT TARGETS (auto detect page)
  const outputBox =
    document.getElementById("captionResults") ||
    document.getElementById("bioResults") ||
    document.getElementById("ideasResults") ||
    document.getElementById("hashtagResults");

  const stateBox =
    document.getElementById("outputState") ||
    document.getElementById("ideasStatus");

  let selectedImage = "";

  // IMAGE HANDLE
  const imageInput = document.getElementById("imageInput");
  if (imageInput) {
    imageInput.addEventListener("change", () => {
      const file = imageInput.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = e => {
        selectedImage = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function setState(msg, type = "") {
    if (!stateBox) return;
    stateBox.innerText = msg;
    stateBox.className = type;
  }

  function render(items) {
    if (!outputBox) return;
    outputBox.innerHTML = "";

    items.forEach((item, i) => {
      const div = document.createElement("div");
      div.className = "result-card";

      div.innerHTML = `
        <h4>${action} ${i + 1}</h4>
        <p>${item}</p>
        <button onclick="navigator.clipboard.writeText(\`${item}\`)">Copy</button>
      `;

      outputBox.appendChild(div);
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    setState("Generating... ⏳");

    const data = new FormData(form);

    const payload = {
      action: action,
      platform: data.get("platform"),
      tone: data.get("tone"),
      length: data.get("length") || "Medium",
      language: data.get("language"),
      postIdea:
        data.get("postIdea") ||
        data.get("topic") ||
        data.get("keywords") ||
        "",
      variants: data.get("variants") || "3",
      includeEmojis: data.get("includeEmojis") === "on",
      includeHashtags: data.get("includeHashtags") === "on",
      image: selectedImage
    };

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const json = await res.json();

      if (!json.ok) throw new Error(json.error);

      render(json.items);
      setState("Done ✅", "success");

    } catch (err) {
      setState("Error ❌ " + err.message, "error");
    }
  });
});
