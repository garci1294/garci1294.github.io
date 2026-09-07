(() => {
  const root = document.documentElement;
  const toggle = document.getElementById('theme-toggle');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  function syncTheme() {
    const light = root.dataset.theme === 'light';
    toggle.setAttribute('aria-label', `Switch to ${light ? 'dark' : 'light'} theme`);
    toggle.setAttribute('aria-pressed', String(light));
    themeMeta.setAttribute('content', light ? '#f4f5ef' : '#101211');
  }
  syncTheme();
  toggle.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (error) { /* The theme still works when storage is unavailable. */ }
    syncTheme();
  });
  document.getElementById('year').textContent = String(new Date().getFullYear());
})();
