/**
 * script.js — Insta AI Guru PRO
 * Handles: Theme, Mobile Menu, Credits, Scroll Reveal, Generator Forms, Copy Button
 */

// ── Apply theme instantly (before DOM loads) ─────────────────────────────────
if (localStorage.getItem('theme') === 'light') {
  document.documentElement.classList.add('light-pending');
  document.body && document.body.classList.add('light-mode');
}

document.addEventListener('DOMContentLoaded', () => {

  // Apply light mode on body if pending
  if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light-mode');
  }

  // ── 1. Mobile Menu ────────────────────────────────────────────────────────
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const navLinks = document.getElementById('nav-links');

  if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('active');
      mobileMenuBtn.setAttribute('aria-expanded', isOpen);
      const icon = mobileMenuBtn.querySelector('i');
      if (isOpen) {
        icon.classList.replace('fa-bars', 'fa-times');
      } else {
        icon.classList.replace('fa-times', 'fa-bars');
      }
    });

    // Close menu when a nav link is clicked (mobile UX)
    navLinks.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        const icon = mobileMenuBtn.querySelector('i');
        if (icon) icon.classList.replace('fa-times', 'fa-bars');
      });
    });

    // Close menu on outside click
    document.addEventListener('click', (e) => {
      if (!navLinks.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
        navLinks.classList.remove('active');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        const icon = mobileMenuBtn.querySelector('i');
        if (icon) icon.classList.replace('fa-times', 'fa-bars');
      }
    });
  }

  // ── 2. Navbar Scroll Effect ────────────────────────────────────────────────
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    const onScroll = () => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ── 3. Scroll Reveal ──────────────────────────────────────────────────────
  const reveals = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        revealObserver.unobserve(entry.target); // Once revealed, done
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

  reveals.forEach(el => revealObserver.observe(el));

  // ── 4. Theme Toggle ────────────────────────────────────────────────────────
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    const updateIcon = () => {
      const icon = themeBtn.querySelector('i');
      if (!icon) return;
      if (document.body.classList.contains('light-mode')) {
        icon.classList.replace('fa-sun', 'fa-moon');
      } else {
        icon.classList.replace('fa-moon', 'fa-sun');
      }
    };
    updateIcon(); // set icon on load

    themeBtn.addEventListener('click', () => {
      document.body.classList.toggle('light-mode');
      const isLight = document.body.classList.contains('light-mode');
      localStorage.setItem('theme', isLight ? 'light' : 'dark');
      updateIcon();
    });
  }

  // ── 5. Credit System ──────────────────────────────────────────────────────
  initCreditSystem();

  // ── 6. File Upload UI ─────────────────────────────────────────────────────
  const fileWrapper = document.querySelector('.file-upload-wrapper');
  const fileInput = document.querySelector('#image-upload');

  if (fileWrapper && fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        const name = e.target.files[0].name;
        const span = fileWrapper.querySelector('span');
        if (span) span.textContent = `✅ ${name}`;
        fileWrapper.style.borderColor = 'var(--clr-red)';
      }
    });

    fileWrapper.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileWrapper.classList.add('dragover');
    });
    fileWrapper.addEventListener('dragleave', () => fileWrapper.classList.remove('dragover'));
    fileWrapper.addEventListener('drop', (e) => {
      e.preventDefault();
      fileWrapper.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        fileInput.files = e.dataTransfer.files;
        const span = fileWrapper.querySelector('span');
        if (span) span.textContent = `✅ ${e.dataTransfer.files[0].name}`;
        fileWrapper.style.borderColor = 'var(--clr-red)';
      }
    });
  }

  // ── 7. Generator Form ─────────────────────────────────────────────────────
  const generateForm = document.getElementById('generate-form');
  if (generateForm) {
    generateForm.addEventListener('submit', handleGeneration);
  }

  // ── 8. Copy Button (event delegation) ────────────────────────────────────
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.copy-btn');
    if (!btn) return;
    const item = btn.closest('.output-item');
    if (!item) return;
    const textEl = item.querySelector('.output-text');
    if (!textEl) return;

    const text = textEl.innerText || textEl.textContent;
    navigator.clipboard.writeText(text).then(() => {
      const original = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-check"></i>';
      btn.style.background = '#22c55e';
      setTimeout(() => {
        btn.innerHTML = original;
        btn.style.background = '';
      }, 2000);
    }).catch(() => {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    });
  });

  // ── 9. Float Cards drag (desktop only) ───────────────────────────────────
  if (window.innerWidth > 768) {
    document.querySelectorAll('.float-card').forEach(card => {
      let isDragging = false, startX, startY, initLeft, initTop;

      card.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX; startY = e.clientY;
        initLeft = card.offsetLeft; initTop = card.offsetTop;
        card.style.animation = 'none';
        card.style.zIndex = '200';
        e.preventDefault();
      });

      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        card.style.left = (initLeft + e.clientX - startX) + 'px';
        card.style.top = (initTop + e.clientY - startY) + 'px';
      });

      document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        card.style.zIndex = '';
        card.style.animation = 'float 7s ease-in-out infinite';
      });
    });
  }
});

// ── Credit System ─────────────────────────────────────────────────────────────
function initCreditSystem() {
  const isPro = localStorage.getItem('isPro') === 'true';
  let credits = localStorage.getItem('credits');
  const lastReset = localStorage.getItem('lastCreditReset');
  const today = new Date().toDateString();

  if (!isPro) {
    if (lastReset !== today) {
      credits = '3'; // 3 free credits per day
      localStorage.setItem('credits', credits);
      localStorage.setItem('lastCreditReset', today);
    } else if (credits === null) {
      credits = '3';
      localStorage.setItem('credits', credits);
      localStorage.setItem('lastCreditReset', today);
    }
  }
  updateCreditUI(isPro, parseInt(credits) || 0);
}

function updateCreditUI(isPro, credits) {
  const badge = document.getElementById('credit-count');
  if (!badge) return;
  const span = badge.querySelector('span') || badge;
  if (isPro) {
    span.textContent = '∞ PRO';
    badge.style.borderColor = 'rgba(250,204,21,0.4)';
    badge.querySelector('i') && (badge.querySelector('i').style.color = 'gold');
  } else {
    span.textContent = `${credits} Credits`;
  }
}

function useCredit() {
  const isPro = localStorage.getItem('isPro') === 'true';
  if (isPro) return true;
  let credits = parseInt(localStorage.getItem('credits') || '0');
  if (credits <= 0) return false;
  credits--;
  localStorage.setItem('credits', credits.toString());
  updateCreditUI(false, credits);
  return true;
}

// ── Main Generator Handler ────────────────────────────────────────────────────
async function handleGeneration(e) {
  e.preventDefault();

  if (!useCredit()) {
    showToast("You've run out of free credits for today! Try again tomorrow.", 'error');
    return;
  }

  const form = e.target;
  const mode = form.dataset.mode; // caption | hashtags | bio | reel
  const btn = form.querySelector('button[type="submit"]');
  const resultContent = document.getElementById('result-content');
  const emptyState = document.getElementById('empty-state');
  const loader = document.getElementById('loader');

  // UI: Loading state
  btn.disabled = true;
  const originalBtnHTML = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';
  if (emptyState) emptyState.style.display = 'none';
  if (resultContent) resultContent.innerHTML = '';
  if (loader) loader.style.display = 'block';

  // Collect form data
  const formData = new FormData(form);
  const data = { mode };
  formData.forEach((value, key) => {
    if (key !== 'image') data[key] = value;
  });

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) throw new Error(result.error || 'Generation failed. Try again.');
    if (!result.data || result.data.length === 0) throw new Error('No content generated. Try different inputs.');

    if (loader) loader.style.display = 'none';
    renderResults(result.data, resultContent, mode);

  } catch (err) {
    if (loader) loader.style.display = 'none';
    if (resultContent) {
      resultContent.innerHTML = `
        <div class="output-item" style="border-color:rgba(230,0,35,0.4);">
          <div class="output-text" style="color:var(--clr-red);">
            <i class="fa-solid fa-circle-exclamation"></i> ${err.message}
          </div>
        </div>
      `;
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalBtnHTML;
  }
}

function renderResults(items, container, mode) {
  container.innerHTML = items.map(item => `
    <div class="output-item">
      <div class="output-text">${formatOutput(item, mode)}</div>
      <button class="copy-btn" title="Copy to clipboard" aria-label="Copy this result">
        <i class="fa-regular fa-copy" aria-hidden="true"></i>
      </button>
    </div>
  `).join('');
}

function formatOutput(item, mode) {
  if (mode === 'reel' && typeof item === 'object') {
    return [
      item.title ? `<strong>📌 Title:</strong> ${item.title}` : '',
      item.hook ? `<strong>🎯 Hook:</strong> ${item.hook}` : '',
      item.content ? `<strong>📝 Content:</strong> ${item.content}` : '',
      item.cta ? `<strong>📢 CTA:</strong> ${item.cta}` : '',
    ].filter(Boolean).join('\n\n');
  }
  if (typeof item === 'string') return item;
  return JSON.stringify(item, null, 2);
}

// ── Toast Notification ─────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.setAttribute('role', 'alert');
  toast.style.cssText = `
    position: fixed; bottom: 2rem; right: 2rem; z-index: 9999;
    background: ${type === 'error' ? 'var(--clr-red)' : '#22c55e'};
    color: #fff; padding: 1rem 1.5rem; border-radius: 10px;
    font-family: var(--font-body, sans-serif); font-size: 0.95rem;
    box-shadow: 0 8px 30px rgba(0,0,0,0.3);
    animation: slideInToast 0.3s ease;
    max-width: 320px; line-height: 1.4;
  `;
  toast.textContent = message;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInToast {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 4000);
}
