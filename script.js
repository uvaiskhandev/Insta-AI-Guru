/**
 * script.js - Insta AI Guru PRO
 * Handles UI interactions, credit system, and API calls.
 */

// Apply theme immediately to prevent flash
if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light-mode');
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Mobile Menu Toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = mobileMenuBtn.querySelector('i');
            if (navLinks.classList.contains('active')) {
                icon.classList.replace('fa-bars', 'fa-times');
            } else {
                icon.classList.replace('fa-times', 'fa-bars');
            }
        });
    }

    // 2. Navbar Scroll Effect
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    // 3. Scroll Reveal Animation
    const reveals = document.querySelectorAll('.reveal');
    const revealOnScroll = () => {
        for (let i = 0; i < reveals.length; i++) {
            const windowHeight = window.innerHeight;
            const elementTop = reveals[i].getBoundingClientRect().top;
            const elementVisible = 100;
            if (elementTop < windowHeight - elementVisible) {
                reveals[i].classList.add('active');
            }
        }
    };
    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll(); // Trigger on load

    // 4. Credit System Logic (LocalStorage)
    initCreditSystem();

    // 5. File Upload UI handling
    const fileWrapper = document.querySelector('.file-upload-wrapper');
    const fileInput = document.querySelector('#image-upload');
    if (fileWrapper && fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                const fileName = e.target.files[0].name;
                fileWrapper.querySelector('span').textContent = fileName;
                fileWrapper.style.borderColor = 'var(--color-primary)';
            }
        });
        
        fileWrapper.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileWrapper.classList.add('dragover');
        });
        
        fileWrapper.addEventListener('dragleave', () => {
            fileWrapper.classList.remove('dragover');
        });
        
        fileWrapper.addEventListener('drop', (e) => {
            e.preventDefault();
            fileWrapper.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                fileInput.files = e.dataTransfer.files;
                const fileName = e.dataTransfer.files[0].name;
                fileWrapper.querySelector('span').textContent = fileName;
                fileWrapper.style.borderColor = 'var(--color-primary)';
            }
        });
    }

    // 6. Generic Generator Form Handling
    const generateForm = document.getElementById('generate-form');
    if (generateForm) {
        generateForm.addEventListener('submit', handleGeneration);
    }
    
    // Copy button delegation
    document.addEventListener('click', (e) => {
        if (e.target.closest('.copy-btn')) {
            const btn = e.target.closest('.copy-btn');
            const item = btn.closest('.output-item');
            if(item) {
                const text = item.querySelector('.output-text').textContent;
                navigator.clipboard.writeText(text).then(() => {
                    const originalHTML = btn.innerHTML;
                    btn.innerHTML = '<i class="fa-solid fa-check"></i>';
                    setTimeout(() => {
                        btn.innerHTML = originalHTML;
                    }, 2000);
                });
            }
        }
    });

    // 7. Theme Toggle Logic
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        const currentTheme = localStorage.getItem('theme') || 'dark';
        if (currentTheme === 'light') {
            document.body.classList.add('light-mode');
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }

        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            let theme = 'dark';
            if (document.body.classList.contains('light-mode')) {
                theme = 'light';
                themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
            } else {
                themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
            }
            localStorage.setItem('theme', theme);
        });
    }
});

/**
 * Initializes and manages the simple credit system
 */
function initCreditSystem() {
    const isPro = localStorage.getItem('isPro') === 'true';
    let credits = localStorage.getItem('credits');
    const lastReset = localStorage.getItem('lastCreditReset');
    const today = new Date().toDateString();

    // Reset credits daily for free users
    if (!isPro && lastReset !== today) {
        credits = '2'; // 2 free credits per day
        localStorage.setItem('credits', credits);
        localStorage.setItem('lastCreditReset', today);
    } else if (!credits) {
        credits = '2';
        localStorage.setItem('credits', credits);
        localStorage.setItem('lastCreditReset', today);
    }

    updateCreditUI(isPro, credits);
}

function updateCreditUI(isPro, credits) {
    const badge = document.getElementById('credit-count');
    if (badge) {
        if (isPro) {
            badge.textContent = 'PRO';
            badge.style.color = 'gold';
        } else {
            badge.textContent = `${credits} Credits`;
        }
    }
}

function useCredit() {
    const isPro = localStorage.getItem('isPro') === 'true';
    if (isPro) return true;

    let credits = parseInt(localStorage.getItem('credits') || '0');
    if (credits > 0) {
        credits--;
        localStorage.setItem('credits', credits.toString());
        updateCreditUI(false, credits);
        return true;
    }
    return false;
}

/**
 * Handles the submit event for all generation forms
 */
async function handleGeneration(e) {
    e.preventDefault();
    
    if (!useCredit()) {
        alert("You've run out of free credits today! Please try again tomorrow or upgrade to PRO.");
        return;
    }

    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    const mode = form.dataset.mode; // 'caption', 'hashtags', 'bio', 'reel'
    
    const resultContent = document.getElementById('result-content');
    const emptyState = document.getElementById('empty-state');
    const loader = document.getElementById('loader');

    // UI state: Loading
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';
    if(emptyState) emptyState.style.display = 'none';
    if(resultContent) resultContent.innerHTML = '';
    if(loader) loader.style.display = 'block';

    // Gather form data
    const formData = new FormData(form);
    const data = { mode: mode };
    formData.forEach((value, key) => {
        // Simple file skip for this demo if needed, usually we'd base64 it
        if(key !== 'image') data[key] = value;
    });

    try {
        // Call Serverless API
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to generate content');
        }

        // Render Results
        if(loader) loader.style.display = 'none';
        if (result.data && result.data.length > 0) {
            renderResults(result.data, resultContent, mode);
        } else {
            throw new Error('No content generated.');
        }

    } catch (error) {
        if(loader) loader.style.display = 'none';
        if(resultContent) {
            resultContent.innerHTML = `
                <div class="output-item" style="border-color: #ff3333;">
                    <div class="output-text text-primary"><i class="fa-solid fa-circle-exclamation"></i> Error: ${error.message}</div>
                </div>
            `;
        }
    } finally {
        // Reset Button
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate';
    }
}

function renderResults(items, container, mode) {
    let html = '';
    items.forEach(item => {
        html += `
            <div class="output-item reveal active">
                <div class="output-text">${formatOutput(item, mode)}</div>
                <button class="copy-btn" title="Copy to clipboard">
                    <i class="fa-regular fa-copy"></i>
                </button>
            </div>
        `;
    });
    container.innerHTML = html;
}

function formatOutput(item, mode) {
    if (mode === 'reel') {
        return `<strong>Title:</strong> ${item.title}\n\n<strong>Hook:</strong> ${item.hook}\n\n<strong>Content:</strong> ${item.content}\n\n<strong>CTA:</strong> ${item.cta}`;
    }
    return item;
}

/**
 * Antigravity / Floating Interaction Logic
 * Allows basic dragging of float-cards if available
 */
const floatCards = document.querySelectorAll('.float-card');
floatCards.forEach(card => {
    let isDragging = false;
    let startX, startY, initialX, initialY;

    card.addEventListener('mousedown', dragStart);
    document.addEventListener('mouseup', dragEnd);
    document.addEventListener('mousemove', drag);

    function dragStart(e) {
        if(e.target.closest('a') || e.target.closest('button')) return; // Don't drag if clicking a link
        initialX = card.offsetLeft;
        initialY = card.offsetTop;
        startX = e.clientX;
        startY = e.clientY;
        isDragging = true;
        card.style.animation = 'none'; // Stop float animation while dragging
        card.style.zIndex = '100';
    }

    function drag(e) {
        if (!isDragging) return;
        e.preventDefault();
        const currentX = e.clientX - startX;
        const currentY = e.clientY - startY;
        card.style.left = (initialX + currentX) + 'px';
        card.style.top = (initialY + currentY) + 'px';
    }

    function dragEnd() {
        if(!isDragging) return;
        isDragging = false;
        card.style.zIndex = '';
        // Resume subtle float animation
        card.style.animation = 'float 6s ease-in-out infinite';
    }
});
