(function () {
  'use strict';

  // ── T040: Theme Toggle ──────────────────────────────────────────────

  function readTheme() {
    try { return sessionStorage.getItem('theme'); } catch (e) { return null; }
  }

  function saveTheme(theme) {
    try { sessionStorage.setItem('theme', theme); } catch (e) { /* storage blocked */ }
  }

  function initTheme() {
    var saved = readTheme();
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
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
    saveTheme(next);
    updateThemeLabel();
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

    initEmailObfuscation();
  });
})();
