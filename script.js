document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("captionForm");
  const output = document.getElementById("captionResults");
  const state = document.getElementById("outputState");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 1. Form data lo
    const data = {
      platform: document.getElementById("platform").value,
      tone: document.getElementById("tone").value,
      length: document.getElementById("length").value,
      language: document.getElementById("language").value,
      postIdea: document.getElementById("postIdea").value,
      variants: document.getElementById("variants").value,
      includeEmojis: document.getElementById("includeEmojis").checked,
      includeHashtags: document.getElementById("includeHashtags").checked
    };

    if (!data.postIdea) {
      state.innerHTML = "❌ Please enter post idea";
      return;
    }

    // 2. Loading state
    state.innerHTML = "⏳ Generating captions...";
    output.innerHTML = "";

    try {
      // 3. Backend ko request bhejo
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      const result = await res.json();

      // 4. Error check
      if (!res.ok || !result.ok) {
        state.innerHTML = "❌ Error: " + (result.error || "Something went wrong");
        return;
      }

      // 5. Output show karo
      state.innerHTML = "✅ Captions Generated";

      result.captions.forEach((text, index) => {
        const div = document.createElement("div");
        div.style.marginBottom = "15px";
        div.style.padding = "15px";
        div.style.border = "1px solid #333";
        div.style.borderRadius = "10px";

        div.innerHTML = `
          <b>Caption ${index + 1}</b><br><br>
          ${text}
          <br><br>
          <button onclick="navigator.clipboard.writeText(\`${text}\`)">
            Copy
          </button>
        `;

        output.appendChild(div);
      });

    } catch (err) {
      console.error(err);
      state.innerHTML = "❌ Failed to generate captions";
    }
  });
});