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

  // Slow matrix trails and an abstract orbital lattice fill the margins.
  // Keep the reading column quiet and all decoration outside the interaction layer.
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
  const glyphs = ['0', '1', '0', '1', 'λ', 'ψ', '∴', '+', '⊗', '01'];
  const frameInterval = 1000 / 24;

  function palette() {
    colors = root.dataset.theme === 'light'
      ? { point: '48,81,47', orbit: '56,88,103', glyph: '62,97,38' }
      : { point: '170,211,224', orbit: '110,185,207', glyph: '180,218,143' };
  }
  function edgeWeight(x) {
    const distance = Math.min(1, Math.abs(x / Math.max(width, 1) - .5) * 2);
    return .1 + .9 * Math.pow(distance, 2);
  }
  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(120, Math.max(32, Math.floor(width * height / 14000)));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width, y: Math.random() * height,
      phase: Math.random() * Math.PI * 2, radius: .6 + Math.random() * 1.1,
      speed: 1.2 + Math.random() * 2
    }));
    // Evenly spaced columns guarantee visible trails at every viewport size.
    const streamCount = width < 760 ? 6 : 16;
    const rows = Math.ceil(height / 20);
    streams = Array.from({ length: streamCount }, (_, i) => ({
      x: i % 2 ? width * (1 - (.025 + Math.floor(i / 2) * .021)) : width * (.025 + Math.floor(i / 2) * .021),
      start: ((i * .61803398875) % 1) * (height + 340),
      speed: 10 + (i % 5) * 1.2,
      length: Math.min(rows, 10 + i % 7), seed: i * 3
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
    ctx.lineWidth = .65;
    const orbitCount = width < 760 ? 2 : 3;
    for (let i = 0; i < orbitCount; i++) {
      const cx = width * (i % 2 ? .985 : .015);
      const cy = height * (.24 + i * .3);
      const rx = Math.min(width * .16, 220);
      const phase = elapsed * .045 + i * 1.7;
      // Intersecting planes and moving nodes suggest a quantum field, without a scene.
      for (let plane = 0; plane < 3; plane++) {
        const ry = rx * (.3 + plane * .12);
        const tilt = -.8 + plane * .8 + Math.sin(elapsed * .025 + i) * .12;
        ctx.strokeStyle = `rgba(${colors.orbit},.16)`;
        ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, tilt, 0, Math.PI * 2); ctx.stroke();
        const nodes = [];
        for (let j = 0; j < 8; j++) {
          const angle = phase + j * Math.PI / 4 + plane * .24;
          const ox = Math.cos(angle) * rx;
          const oy = Math.sin(angle) * ry;
          nodes.push({ x: cx + ox * Math.cos(tilt) - oy * Math.sin(tilt), y: cy + ox * Math.sin(tilt) + oy * Math.cos(tilt) });
        }
        for (let j = 0; j < nodes.length; j++) {
          const point = nodes[j];
          const next = nodes[(j + 2) % nodes.length];
          ctx.strokeStyle = `rgba(${colors.orbit},${.09 * edgeWeight(point.x)})`;
          ctx.beginPath(); ctx.moveTo(point.x, point.y); ctx.lineTo(next.x, next.y); ctx.stroke();
          ctx.fillStyle = `rgba(${colors.point},${.38 * edgeWeight(point.x)})`;
          ctx.beginPath(); ctx.arc(point.x, point.y, j % 3 ? 1 : 1.7, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    ctx.font = '13px monospace';
    for (const stream of streams) {
      const top = (stream.start + elapsed * stream.speed) % (height + 340) - 20;
      for (let j = 0; j < stream.length; j++) {
        const y = top - j * 20;
        if (y < -20 || y > height + 20) continue;
        const tail = Math.pow(1 - j / stream.length, 1.25);
        const alpha = (j === 0 ? .4 : .29 * tail) * edgeWeight(stream.x);
        ctx.fillStyle = `rgba(${j === 0 ? colors.point : colors.glyph},${alpha})`;
        // Stable characters and a fading tail avoid rapid scrambling or flashes.
        ctx.fillText(glyphs[(stream.seed + j) % glyphs.length], stream.x, y);
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
