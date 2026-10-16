// Ambient floating-particle background (recovered from the v3.0 Desktop copy).
// Capped at ~30fps, paused while the tab is hidden, off for reduced motion.

export function initParticles(canvas) {
  if (!canvas || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = canvas.getContext?.('2d');
  if (!ctx) return;

  let W = 0;
  let H = 0;
  let particles = [];
  let lastFrame = 0;
  let raf = 0;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  function create() {
    const n = Math.min(60, Math.floor((W * H) / 8000));
    particles = Array.from({ length: n }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 4 + 2,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      o: Math.random() * 0.18 + 0.08,
    }));
  }
  function draw(ts) {
    raf = requestAnimationFrame(draw);
    if (ts - lastFrame < 33) return;
    lastFrame = ts;
    ctx.clearRect(0, 0, W, H);
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    ctx.fillStyle = dark ? '#7EDAA8' : '#2A7048';
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -5) p.x = W + 5;
      if (p.x > W + 5) p.x = -5;
      if (p.y < -5) p.y = H + 5;
      if (p.y > H + 5) p.y = -5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.globalAlpha = p.o;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  resize();
  create();
  raf = requestAnimationFrame(draw);
  window.addEventListener('resize', () => {
    resize();
    create();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else raf = requestAnimationFrame(draw);
  });
}
