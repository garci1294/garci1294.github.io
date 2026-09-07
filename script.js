(() => {
  const root = document.documentElement;
  const themeToggle = document.getElementById('theme-toggle');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  function syncTheme() {
    const light = root.dataset.theme === 'light';
    themeToggle.setAttribute('aria-label', `Switch to ${light ? 'dark' : 'light'} theme`);
    themeToggle.setAttribute('aria-pressed', String(light));
    themeMeta.setAttribute('content', light ? '#f4f5ef' : '#101211');
  }
  syncTheme();
  themeToggle.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (error) { /* Storage is optional. */ }
    syncTheme();
  });
  document.getElementById('year').textContent = String(new Date().getFullYear());

  const canvas = document.getElementById('ambient-field');
  const motionToggle = document.getElementById('motion-toggle');
  const ctx = canvas?.getContext('2d');
  if (!ctx || !motionToggle) return;

  // An abstract field: slow glyph streams, drifting points, and orbital paths.
  // Its density and contrast are lowest behind the reading column.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let userPaused = false;
  try { userPaused = localStorage.getItem('background-motion') === 'paused'; } catch (error) { /* Storage is optional. */ }
  let width = 0;
  let height = 0;
  let particles = [];
  let streams = [];
  let frame = null;
  let lastFrame = 0;
  let elapsed = 0;
  let colors;
  const glyphs = ['0', '1', '·', '+', 'λ', 'ψ', '∴'];
  const frameInterval = 1000 / 24;

  function palette() {
    colors = root.dataset.theme === 'light'
      ? { point: '48,81,47', orbit: '56,88,103', glyph: '62,97,38' }
      : { point: '172,202,217', orbit: '104,167,195', glyph: '188,221,145' };
  }
  function edgeWeight(x) {
    return .18 + .82 * Math.pow(Math.abs(x / Math.max(width, 1) - .5) * 2, 1.6);
  }
  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(100, Math.max(28, Math.floor(width * height / 18000)));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width, y: Math.random() * height,
      phase: Math.random() * Math.PI * 2, radius: .5 + Math.random() * .8,
      speed: .8 + Math.random() * 1.8
    }));
    // Sparse columns stay close to the margins, away from body copy.
    streams = Array.from({ length: width < 760 ? 4 : 10 }, (_, i) => ({
      x: i % 2 ? width * (.84 + Math.random() * .14) : width * (.02 + Math.random() * .14),
      start: Math.random() * (height + 200), speed: 5 + Math.random() * 5,
      length: 4 + i % 5, seed: i * 3
    }));
    draw();
  }
  function draw() {
    ctx.clearRect(0, 0, width, height);
    for (const p of particles) {
      const x = (p.x + elapsed * p.speed) % Math.max(width, 1);
      const y = p.y + Math.sin(elapsed * .07 + p.phase) * 9;
      ctx.fillStyle = `rgba(${colors.point},${.34 * edgeWeight(x)})`;
      ctx.beginPath(); ctx.arc(x, y, p.radius, 0, Math.PI * 2); ctx.fill();
    }
    ctx.lineWidth = .7;
    for (let i = 0; i < 3; i++) {
      const cx = width * (i === 1 ? .94 : .065);
      const cy = height * (.26 + i * .27);
      const rx = Math.min(width * .18, 240);
      const ry = rx * .34;
      const rotation = -.55 + i * .4;
      ctx.strokeStyle = `rgba(${colors.orbit},.13)`;
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, rotation, 0, Math.PI * 2); ctx.stroke();
      const phase = elapsed * (.035 + i * .007) + i * 2;
      const ox = Math.cos(phase) * rx;
      const oy = Math.sin(phase) * ry;
      const x = cx + ox * Math.cos(rotation) - oy * Math.sin(rotation);
      const y = cy + ox * Math.sin(rotation) + oy * Math.cos(rotation);
      ctx.fillStyle = `rgba(${colors.point},.32)`;
      ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.font = '12px monospace';
    for (const stream of streams) {
      const top = (stream.start + elapsed * stream.speed) % (height + 220) - 160;
      for (let j = 0; j < stream.length; j++) {
        const alpha = .2 * (1 - j / stream.length) * edgeWeight(stream.x);
        ctx.fillStyle = `rgba(${colors.glyph},${alpha})`;
        // Each symbol is stable as it drifts; there is no flashing or rapid scramble.
        ctx.fillText(glyphs[(stream.seed + j) % glyphs.length], stream.x, top - j * 18);
      }
    }
  }
  function animate(now) {
    frame = null;
    if (userPaused || reducedMotion.matches || document.hidden) return;
    if (!lastFrame) lastFrame = now;
    const delta = now - lastFrame;
    if (delta >= frameInterval) {
      elapsed += Math.min(delta, 100) / 1000;
      lastFrame = now;
      draw();
    }
    frame = requestAnimationFrame(animate);
  }
  function syncMotion() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    lastFrame = 0;
    const paused = userPaused || reducedMotion.matches;
    motionToggle.hidden = false;
    motionToggle.disabled = reducedMotion.matches;
    motionToggle.setAttribute('data-paused', String(paused));
    const label = reducedMotion.matches ? 'Background motion disabled by your reduced motion preference' : `${paused ? 'Resume' : 'Pause'} background animation`;
    motionToggle.setAttribute('aria-label', label);
    motionToggle.setAttribute('title', label);
    draw();
    if (!paused && !document.hidden) frame = requestAnimationFrame(animate);
  }
  motionToggle.addEventListener('click', () => {
    userPaused = !userPaused;
    try { localStorage.setItem('background-motion', userPaused ? 'paused' : 'playing'); } catch (error) { /* Storage is optional. */ }
    syncMotion();
  });
  reducedMotion.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', syncMotion);
  window.addEventListener('resize', resize, { passive: true });
  themeToggle.addEventListener('click', () => { palette(); draw(); });
  palette();
  resize();
  syncMotion();
})();
