// Sets the light/dark theme before the page draws, so it never flashes the wrong colours.
// A separate file (not inline in index.html) because the Content-Security-Policy only allows
// same-origin scripts. Must match resolveTheme in src/theme.js (tests/theme.test.js checks this).
(function () {
    var stored = null;
    try { stored = localStorage.getItem('theme'); } catch { /* storage blocked */ }
    var theme = stored === 'light' || stored === 'dark'
        ? stored
        : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
})();
