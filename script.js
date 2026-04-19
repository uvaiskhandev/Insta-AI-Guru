/**
 * script.js - Insta AI Guru PRO (FIXED)
 */

if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light-mode');
}

document.addEventListener('DOMContentLoaded', () => {

    const generateForm = document.getElementById('generate-form');
    if (generateForm) {
        generateForm.addEventListener('submit', handleGeneration);
    }

    initCreditSystem();
});

/* =========================
   CREDIT SYSTEM
========================= */
function initCreditSystem() {
    let credits = localStorage.getItem('credits');
    if (!credits) {
        credits = '2';
        localStorage.setItem('credits', credits);
    }
    updateCreditUI(false, credits);
}

function updateCreditUI(isPro, credits) {
    const badge = document.getElementById('credit-count');
    if (badge) {
        badge.textContent = `${credits} Credits`;
    }
}

function useCredit() {
    let credits = parseInt(localStorage.getItem('credits') || '0');
    if (credits > 0) {
        credits--;
        localStorage.setItem('credits', credits.toString());
        updateCreditUI(false, credits);
        return true;
    }
    return false;
}

/* =========================
   BASE64 FIX (MAIN FIX)
========================= */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result || "";
            const base64 = String(result).split(",")[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/* =========================
   MAIN GENERATION LOGIC
========================= */
async function handleGeneration(e) {
    e.preventDefault();

    if (!useCredit()) {
        alert("No credits left!");
        return;
    }

    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');

    btn.disabled = true;
    btn.innerHTML = "Generating...";

    try {
        const formData = new FormData(form);
        const data = {};

        // normal fields
        for (const [key, value] of formData.entries()) {
            if (key !== "image") {
                data[key] = value;
            }
        }

        // image handling
        const imageFile = formData.get("image");

        if (imageFile && imageFile.size > 0) {
            const base64 = await fileToBase64(imageFile);
            data.imageBase64 = base64;
            data.imageMimeType = imageFile.type;
        }

        const res = await fetch("/api/generate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await res.json();

        if (!res.ok) {
            throw new Error(result.error || "API Error");
        }

        console.log(result);
        alert("Caption Generated Successfully ✅");

    } catch (err) {
        console.error(err);
        alert("Error: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = "Generate";
    }
}
