// Applies the saved theme before first paint (loaded without defer).
(function () {
  try {
    var t = localStorage.getItem('theme');
    if (t) document.documentElement.setAttribute('data-theme', t);
  } catch (e) { /* storage blocked */ }
})();
