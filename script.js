async function generateCaptions() {
  const output = document.getElementById("output");
  const button = document.getElementById("generateBtn");
  const promptInput = document.getElementById("prompt");

  const prompt = promptInput?.value?.trim();

  if (!prompt) {
    output.innerText = "Please enter a prompt first.";
    return;
  }

  try {
    button.disabled = true;
    output.innerText = "Generating...";

    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt })
    });

    const rawText = await response.text();

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      output.innerText = "Server returned invalid JSON:\n" + rawText;
      return;
    }

    if (!response.ok) {
      output.innerText = data.error || "Something went wrong.";
      return;
    }

    output.innerText = data.result || "No result returned.";
  } catch (error) {
    output.innerText = "Request failed: " + error.message;
  } finally {
    button.disabled = false;
  }
}
