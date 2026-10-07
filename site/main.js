(function () {
  'use strict';

  // ── T040: Theme Toggle ──────────────────────────────────────────────

  function initTheme() {
    var saved = sessionStorage.getItem('theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      document.documentElement.setAttribute('data-theme', 'light');
    }
    updateThemeLabel();
  }

  function updateThemeLabel() {
    var toggle = document.getElementById('theme-toggle');
    if (!toggle) return;
    var current = document.documentElement.getAttribute('data-theme');
    toggle.setAttribute('aria-label',
      current === 'light' ? 'Switch to dark mode' : 'Switch to light mode'
    );
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme');
    var next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    sessionStorage.setItem('theme', next);
    updateThemeLabel();
  }

  // ── T039: Hamburger Menu ────────────────────────────────────────────

  function initHamburger() {
    var hamburger = document.getElementById('hamburger');
    var menu = document.getElementById('nav-menu');
    var closeBtn = menu ? menu.querySelector('.nav__menu-close') : null;
    var menuLinks = menu ? menu.querySelectorAll('.nav__link') : [];

    if (!hamburger || !menu) return;

    function openMenu() {
      menu.hidden = false;
      hamburger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      if (closeBtn) closeBtn.focus();
    }

    function closeMenu() {
      menu.hidden = true;
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      hamburger.focus();
    }

    hamburger.addEventListener('click', function () {
      var expanded = hamburger.getAttribute('aria-expanded') === 'true';
      if (expanded) closeMenu(); else openMenu();
    });

    if (closeBtn) closeBtn.addEventListener('click', closeMenu);

    for (var i = 0; i < menuLinks.length; i++) {
      menuLinks[i].addEventListener('click', closeMenu);
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) closeMenu();
    });

    // Trap focus within open menu
    menu.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || menu.hidden) return;
      var focusable = menu.querySelectorAll('a, button');
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  // ── T043: Scroll Animations ─────────────────────────────────────────

  function initScrollAnimations() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var sections = document.querySelectorAll('main > section:not(.hero)');
    for (var i = 0; i < sections.length; i++) {
      sections[i].classList.add('animate-in');
    }

    var observer = new IntersectionObserver(function (entries) {
      for (var j = 0; j < entries.length; j++) {
        if (entries[j].isIntersecting) {
          entries[j].target.classList.add('visible');
          observer.unobserve(entries[j].target);
        }
      }
    }, { threshold: 0.1, rootMargin: '0px' });

    for (var k = 0; k < sections.length; k++) {
      observer.observe(sections[k]);
    }
  }

  // ── T045: Email Obfuscation ─────────────────────────────────────────

  function initEmailObfuscation() {
    var emailLink = document.querySelector('[data-email]');
    if (!emailLink) return;
    var emailText = emailLink.querySelector('.contact__email-text');
    if (!emailText) return;

    var reversed = emailText.textContent;
    var email = reversed.split('').reverse().join('');

    emailLink.addEventListener('click', function (e) {
      e.preventDefault();
      window.location.href = 'mailto:' + email;
    });
  }

  // ── Init ────────────────────────────────────────────────────────────

  initTheme();

  document.addEventListener('DOMContentLoaded', function () {
    var themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

    initHamburger();
    initScrollAnimations();
    initEmailObfuscation();
  });
})();
