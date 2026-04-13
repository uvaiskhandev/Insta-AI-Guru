"use strict";

document.addEventListener("DOMContentLoaded", () => {
  /* =========================
     Helpers
  ========================= */
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

  const showToast = (message = "Done!") => {
    let toast = $(".custom-toast");

    if (!toast) {
      toast = document.createElement("div");
      toast.className = "custom-toast";
      document.body.appendChild(toast);

      Object.assign(toast.style, {
        position: "fixed",
        bottom: "20px",
        right: "20px",
        padding: "12px 18px",
        borderRadius: "12px",
        background: "rgba(0,0,0,0.85)",
        color: "#fff",
        fontSize: "14px",
        fontWeight: "500",
        zIndex: "9999",
        opacity: "0",
        transform: "translateY(20px)",
        transition: "all 0.3s ease"
      });
    }

    toast.textContent = message;
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";

    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(20px)";
    }, 2200);
  };

  /* =========================
     Sticky Header
  ========================= */
  const header = $("header");
  const handleHeader = () => {
    if (!header) return;
    if (window.scrollY > 20) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  };
  handleHeader();
  window.addEventListener("scroll", handleHeader);

  /* =========================
     Mobile Menu Toggle
  ========================= */
  const menuBtn = $("#menu-btn, .menu-btn, .hamburger");
  const navMenu = $("#nav-menu, .nav-menu, nav ul, .navbar ul");

  if (menuBtn && navMenu) {
    menuBtn.addEventListener("click", () => {
      navMenu.classList.toggle("active");
      menuBtn.classList.toggle("active");
      document.body.classList.toggle("menu-open");
    });

    $$("a", navMenu).forEach((link) => {
      link.addEventListener("click", () => {
        navMenu.classList.remove("active");
        menuBtn.classList.remove("active");
        document.body.classList.remove("menu-open");
      });
    });
  }

  /* =========================
     Smooth Scroll
  ========================= */
  $$('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const targetId = this.getAttribute("href");
      if (!targetId || targetId === "#") return;

      const target = $(targetId);
      if (!target) return;

      e.preventDefault();

      const offset = header ? header.offsetHeight : 0;
      const topPos = target.getBoundingClientRect().top + window.pageYOffset - offset;

      window.scrollTo({
        top: topPos,
        behavior: "smooth"
      });
    });
  });

  /* =========================
     Active Nav Link on Scroll
  ========================= */
  const sections = $$("section[id]");
  const navLinks = $$('nav a[href^="#"], .nav-menu a[href^="#"], .navbar a[href^="#"]');

  const activateNavLink = () => {
    const scrollY = window.pageYOffset;
    let currentId = "";

    sections.forEach((section) => {
      const sectionTop = section.offsetTop - 140;
      const sectionHeight = section.offsetHeight;
      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        currentId = section.getAttribute("id");
      }
    });

    navLinks.forEach((link) => {
      link.classList.remove("active");
      const href = link.getAttribute("href");
      if (href === `#${currentId}`) {
        link.classList.add("active");
      }
    });
  };

  activateNavLink();
  window.addEventListener("scroll", activateNavLink);

  /* =========================
     Dark / Light Theme Toggle
  ========================= */
  const themeBtn = $("#theme-toggle, .theme-toggle");
  const root = document.documentElement;
  const savedTheme = localStorage.getItem("theme");

  if (savedTheme === "light") {
    root.classList.add("light-mode");
  } else {
    root.classList.remove("light-mode");
  }

  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      root.classList.toggle("light-mode");
      const isLight = root.classList.contains("light-mode");
      localStorage.setItem("theme", isLight ? "light" : "dark");
      showToast(isLight ? "Light mode enabled" : "Dark mode enabled");
    });
  }

  /* =========================
     Reveal on Scroll
  ========================= */
  const revealElements = $$(".reveal, .card, .feature-card, .service-card, .box");

  if (revealElements.length) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("show");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    revealElements.forEach((el) => revealObserver.observe(el));
  }

  /* =========================
     FAQ Toggle
  ========================= */
  const faqItems = $$(".faq-item");

  faqItems.forEach((item) => {
    const question = $(".faq-question", item);
    if (!question) return;

    question.addEventListener("click", () => {
      item.classList.toggle("active");
    });
  });

  /* =========================
     Copy Buttons
     HTML example:
     <button class="copy-btn" data-copy="Text to copy">Copy</button>
     or
     <button class="copy-btn" data-target="#output1">Copy</button>
  ========================= */
  const copyButtons = $$(".copy-btn");

  copyButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        let textToCopy = btn.getAttribute("data-copy") || "";

        const targetSelector = btn.getAttribute("data-target");
        if (!textToCopy && targetSelector) {
          const targetEl = $(targetSelector);
          if (targetEl) {
            textToCopy = targetEl.innerText.trim();
          }
        }

        if (!textToCopy) {
          showToast("Nothing to copy");
          return;
        }

        await navigator.clipboard.writeText(textToCopy);

        const oldText = btn.innerText;
        btn.innerText = "Copied!";
        btn.disabled = true;

        showToast("Text copied successfully");

        setTimeout(() => {
          btn.innerText = oldText;
          btn.disabled = false;
        }, 1400);
      } catch (error) {
        console.error("Copy failed:", error);
        showToast("Copy failed");
      }
    });
  });

  /* =========================
     Simple Form Validation
  ========================= */
  const form = $("#contact-form, form");

  if (form) {
    form.addEventListener("submit", (e) => {
      const requiredFields = $$("[required]", form);
      let isValid = true;

      requiredFields.forEach((field) => {
        const value = field.value.trim();
        field.classList.remove("input-error");

        if (!value) {
          isValid = false;
          field.classList.add("input-error");
        }

        if (field.type === "email" && value) {
          const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailPattern.test(value)) {
            isValid = false;
            field.classList.add("input-error");
          }
        }
      });

      if (!isValid) {
        e.preventDefault();
        showToast("Please fill all required fields correctly");
      }
    });
  }

  /* =========================
     Scroll To Top Button
  ========================= */
  const topBtn = $("#scrollTopBtn, .scroll-top");

  const handleTopBtn = () => {
    if (!topBtn) return;
    if (window.scrollY > 300) {
      topBtn.classList.add("show");
    } else {
      topBtn.classList.remove("show");
    }
  };

  if (topBtn) {
    window.addEventListener("scroll", handleTopBtn);
    handleTopBtn();

    topBtn.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    });
  }

  /* =========================
     Typing Effect
     HTML example:
     <span id="typing-text"></span>
  ========================= */
  const typingEl = $("#typing-text");

  if (typingEl) {
    const words = [
      "Instagram Captions",
      "Bio Generator",
      "Hashtag Ideas",
      "AI Content Tools"
    ];

    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    const typeEffect = () => {
      const currentWord = words[wordIndex];
      const visibleText = currentWord.substring(0, charIndex);
      typingEl.textContent = visibleText;

      if (!isDeleting && charIndex < currentWord.length) {
        charIndex++;
        setTimeout(typeEffect, 90);
      } else if (isDeleting && charIndex > 0) {
        charIndex--;
        setTimeout(typeEffect, 45);
      } else {
        isDeleting = !isDeleting;
        if (!isDeleting) {
          wordIndex = (wordIndex + 1) % words.length;
        }
        setTimeout(typeEffect, isDeleting ? 1200 : 300);
      }
    };

    typeEffect();
  }
});
