// =========================================================
// CARL-1 — interaction layer
// =========================================================

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Intro loader ----------
(() => {
  if (prefersReducedMotion) return;
  const loader = document.createElement('div');
  loader.className = 'site-loader';
  loader.innerHTML = '<div class="site-loader-mark"><span>CARL-1</span><small>Portfolio boot sequence</small></div>';
  document.body.classList.add('is-loading');
  document.body.prepend(loader);

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    loader.classList.add('is-done');
    document.body.classList.remove('is-loading');
    setTimeout(() => loader.remove(), 1000);
  };

  window.addEventListener('load', () => setTimeout(finish, 450), { once: true });
  setTimeout(finish, 1600);
})();

// ---------- Ambient side rails ----------
(() => {
  if (prefersReducedMotion || window.matchMedia('(max-width: 640px)').matches) return;

  const canvas = document.getElementById('ambient-rails-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const particles = [];
  const ripples = [];
  let width = 0;
  let height = 0;
  let rail = 0;
  let dpr = 1;
  let mouseX = 0.5;
  let mouseY = 0.5;
  let mousePx = 0;
  let mousePy = 0;
  let mouseActive = false;
  let mousePulse = 0;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const rand = (min, max) => min + Math.random() * (max - min);

  const createParticle = side => ({
    side,
    x: side === 'left' ? rand(24, rail - 18) : width - rand(24, rail - 18),
    y: rand(0, height),
    r: rand(0.7, 1.9),
    vy: rand(0.08, 0.28),
    drift: rand(-0.16, 0.16),
    phase: rand(0, Math.PI * 2),
    kind: Math.random() > 0.82 ? 'diamond' : 'dot',
    lastRipple: -Infinity
  });

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    rail = clamp(width * 0.18, 120, 270);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    particles.length = 0;
    const count = Math.round(clamp(height / 18, 34, 68));
    for (let i = 0; i < count; i += 1) {
      particles.push(createParticle(i % 2 === 0 ? 'left' : 'right'));
    }
  };

  const drawParticle = (p, time) => {
    const edgeBias = p.side === 'left' ? 1 - mouseX : mouseX;
    const glow = 0.06 + edgeBias * mousePulse * 0.08;
    const sway = Math.sin(time * 0.001 + p.phase) * 5 + (mouseY - 0.5) * 10;
    const x = p.x + sway;
    const distToMouse = Math.hypot(x - mousePx, p.y - mousePy);

    if (mouseActive && distToMouse < 42 && time - p.lastRipple > 620) {
      p.lastRipple = time;
      ripples.push({
        x,
        y: p.y,
        side: p.side,
        start: time,
        seed: Math.random()
      });
      if (ripples.length > 26) ripples.shift();
    }

    ctx.save();
    ctx.translate(x, p.y);
    if (p.kind === 'diamond') {
      ctx.rotate(Math.PI / 4);
      ctx.strokeStyle = `rgba(200,245,49,${0.12 + glow})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(-3.5, -3.5, 7, 7);
    } else {
      ctx.fillStyle = `rgba(244,244,242,${0.13 + glow})`;
      ctx.beginPath();
      ctx.arc(0, 0, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    p.y += p.vy;
    p.x += p.drift;
    if (p.y > height + 18) {
      Object.assign(p, createParticle(p.side), { y: -18 });
    }
  };

  const drawRipples = time => {
    for (let i = ripples.length - 1; i >= 0; i -= 1) {
      const ripple = ripples[i];
      const age = time - ripple.start;
      const life = 980;
      const progress = age / life;
      if (progress >= 1) {
        ripples.splice(i, 1);
        continue;
      }

      const ease = 1 - Math.pow(1 - progress, 3);
      const radius = 8 + ease * (54 + ripple.seed * 28);
      const alpha = Math.pow(1 - progress, 1.8);
      const gradient = ctx.createRadialGradient(ripple.x, ripple.y, radius * 0.18, ripple.x, ripple.y, radius);

      gradient.addColorStop(0, `rgba(200,245,49,${0.08 * alpha})`);
      gradient.addColorStop(0.48, `rgba(200,245,49,${0.025 * alpha})`);
      gradient.addColorStop(1, 'rgba(200,245,49,0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(200,245,49,${0.22 * alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, radius * 0.72, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(244,244,242,${0.09 * alpha})`;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, radius * 0.38, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  const drawConnections = () => {
    for (let i = 0; i < particles.length; i += 1) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j += 1) {
        const b = particles[j];
        if (a.side !== b.side) continue;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 105) continue;
        const alpha = (1 - dist / 105) * 0.055;
        ctx.strokeStyle = `rgba(200,245,49,${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  };

  const drawRailLines = time => {
    const offset = (time * 0.012) % 96;
    ctx.strokeStyle = 'rgba(244,244,242,0.035)';
    ctx.lineWidth = 1;
    for (let y = -96 + offset; y < height + 96; y += 96) {
      ctx.beginPath();
      ctx.moveTo(28, y);
      ctx.lineTo(rail * 0.72, y + 34);
      ctx.moveTo(width - 28, y + 16);
      ctx.lineTo(width - rail * 0.72, y + 50);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(200,245,49,0.045)';
    ctx.beginPath();
    ctx.moveTo(rail, 0);
    ctx.lineTo(rail, height);
    ctx.moveTo(width - rail, 0);
    ctx.lineTo(width - rail, height);
    ctx.stroke();
  };

  const render = time => {
    ctx.clearRect(0, 0, width, height);
    mousePulse += ((mouseX < 0.24 || mouseX > 0.76 ? 1 : 0.35) - mousePulse) * 0.04;
    drawRailLines(time);
    drawRipples(time);
    drawConnections();
    particles.forEach(p => drawParticle(p, time));
    requestAnimationFrame(render);
  };

  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', e => {
    mouseX = e.clientX / width;
    mouseY = e.clientY / height;
    mousePx = e.clientX;
    mousePy = e.clientY;
    mouseActive = true;
  }, { passive: true });
  window.addEventListener('mouseleave', () => {
    mouseActive = false;
  });

  resize();
  requestAnimationFrame(render);
})();

// ---------- Hero title reveal (character stagger) ----------
(() => {
  const nodes = document.querySelectorAll('[data-split]');
  nodes.forEach(node => {
    const text = node.textContent;
    node.textContent = '';
    [...text].forEach((c, i) => {
      const span = document.createElement('span');
      span.className = 'char';
      span.style.animationDelay = `${0.05 + i * 0.06}s`;
      span.textContent = c === ' ' ? '\u00A0' : c;
      node.appendChild(span);
    });
  });
})();

// ---------- Scroll reveal ----------
(() => {
  const stagger = (root, selectors) => {
    const nodes = selectors.flatMap(selector => [...root.querySelectorAll(selector)]);
    nodes.forEach((node, index) => node.style.setProperty('--reveal-delay', `${Math.min(index * 70, 420)}ms`));
  };

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        clearTimeout(e.target._revealTimer);
        e.target._revealTimer = setTimeout(() => e.target.classList.add('has-entered'), 1200);
        // animate benchmark bars on reveal
        e.target.querySelectorAll?.('.bench-bar').forEach(b => {
          const v = b.dataset.v;
          if (v) b.style.setProperty('--v', v);
        });
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.reveal').forEach(el => {
    stagger(el, [
      '.section-label',
      '.bench-head',
      '.abstract-meta',
      '.abstract-body',
      '.desk-readout > div',
      '.project-panel',
      '.timeline-item',
      '.review',
      '.contact-headline',
      '.contact-grid > div',
      '.bibtex'
    ]);
    io.observe(el);
  });
})();

// ---------- Smooth anchor navigation ----------
(() => {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    });
  });
})();

// ---------- Live clock in nav ----------
(() => {
  const t = document.getElementById('live-time');
  if (!t) return;
  const tick = () => {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    t.textContent = `HZ ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };
  tick(); setInterval(tick, 1000);
})();

// ---------- BibTeX copy ----------
(() => {
  const btn = document.querySelector('.bibtex-copy');
  const pre = document.querySelector('.bibtex pre');
  if (!btn || !pre) return;
  btn.addEventListener('click', () => {
    navigator.clipboard?.writeText(pre.innerText);
    const orig = btn.textContent;
    btn.textContent = 'Copied ✓';
    setTimeout(() => btn.textContent = orig, 1400);
  });
})();

// ---------- Language toggle ----------
(() => {
  const btn = document.querySelector('.lang-toggle');
  if (!btn) return;
  let lang = localStorage.getItem('carl-lang') || 'en';
  const apply = () => {
    document.documentElement.setAttribute('data-lang', lang);
    btn.textContent = lang === 'en' ? 'EN / 中' : '中 / EN';
    document.querySelectorAll('[data-en]').forEach(el => {
      const content = lang === 'en' ? el.dataset.en : (el.dataset.zh || el.dataset.en);
      if (el.classList.contains('project-placeholder')) {
        el.dataset.label = content;
        return;
      }
      el.innerHTML = content;
    });
  };
  apply();
  btn.addEventListener('click', () => {
    lang = lang === 'en' ? 'zh' : 'en';
    localStorage.setItem('carl-lang', lang);
    apply();
  });
})();

// ---------- Parallax on hero ----------
(() => {
  if (prefersReducedMotion) return;
  const hero = document.querySelector('.hero');
  const glow = document.querySelector('.hero-glow');
  const title = document.querySelector('.hero-title');
  const nav = document.querySelector('.nav');
  if (!hero || !glow || !title) return;

  let mx = 0;
  let my = 0;
  let tx = 0;
  let ty = 0;
  let scrollY = window.scrollY;
  let ticking = false;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const render = () => {
    ticking = false;
    mx += (tx - mx) * 0.08;
    my += (ty - my) * 0.08;

    const progress = clamp(scrollY / window.innerHeight, 0, 1);
    hero.style.setProperty('--hero-bg-x', `${mx * -14}px`);
    hero.style.setProperty('--hero-bg-y', `${my * -10 - progress * 42}px`);
    hero.style.setProperty('--hero-glow-x', `${mx * 30}px`);
    hero.style.setProperty('--hero-glow-y', `${my * 30}px`);
    hero.style.setProperty('--hero-title-x', `${mx * 6}px`);
    hero.style.setProperty('--hero-title-y', `${my * 4 - progress * 90}px`);
    hero.style.setProperty('--hero-title-opacity', String(clamp(1 - progress * 1.25, 0, 1)));
    hero.style.setProperty('--hero-scale', String(1.05 + progress * 0.06));
    hero.style.setProperty('--hero-brightness', String(clamp(0.55 - progress * 0.28, 0.22, 0.55)));
    nav?.classList.toggle('is-scrolled', scrollY > 24);

    if (Math.abs(tx - mx) > 0.001 || Math.abs(ty - my) > 0.001) requestTick();
  };

  const requestTick = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(render);
  };

  window.addEventListener('mousemove', e => {
    tx = (e.clientX / window.innerWidth - 0.5) * 2;
    ty = (e.clientY / window.innerHeight - 0.5) * 2;
    requestTick();
  });
  window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
    requestTick();
  });
  requestTick();
})();

// ---------- Work panel interactions ----------
(() => {
  const panels = [...document.querySelectorAll('.project-panel')];
  if (!panels.length) return;

  panels.forEach(panel => {
    panel.addEventListener('mousemove', e => {
      const rect = panel.getBoundingClientRect();
      panel.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      panel.style.setProperty('--my', `${e.clientY - rect.top}px`);
    });

    panel.addEventListener('mouseleave', () => {
      panel.style.setProperty('--mx', '50%');
      panel.style.setProperty('--my', '50%');
    });
  });
})();

// ---------- Works scroll presence ----------
(() => {
  if (prefersReducedMotion) return;
  const section = document.getElementById('projects');
  const rail = document.querySelector('.projects-rail');
  if (!section) return;

  let ticking = false;
  let railTarget = rail?.scrollLeft || 0;
  let railAnimating = false;
  let wheelActive = false;
  let wheelIdleTimer;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const maxRailScroll = () => rail ? Math.max(0, rail.scrollWidth - rail.clientWidth) : 0;

  const animateRail = () => {
    if (!rail) return;

    const diff = railTarget - rail.scrollLeft;
    if (Math.abs(diff) < 0.45) {
      rail.scrollLeft = railTarget;
      railAnimating = false;
      if (!wheelActive) rail.classList.remove('is-wheel-scrolling');
      requestTick();
      return;
    }

    rail.scrollLeft += diff * 0.105;
    requestTick();
    requestAnimationFrame(animateRail);
  };

  const requestRailAnimation = () => {
    if (railAnimating) return;
    railAnimating = true;
    requestAnimationFrame(animateRail);
  };

  const normalizeWheelDelta = e => {
    const primaryDelta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    const unit = e.deltaMode === 1 ? 38 : e.deltaMode === 2 ? rail.clientWidth * 0.86 : 1;
    const raw = primaryDelta * unit;
    return Math.sign(raw) * Math.min(Math.abs(raw), 160);
  };

  const render = () => {
    ticking = false;
    let progress = 0;
    if (rail && rail.scrollWidth > rail.clientWidth) {
      progress = rail.scrollLeft / (rail.scrollWidth - rail.clientWidth);
    } else {
      const rect = section.getBoundingClientRect();
      const range = rect.height + window.innerHeight;
      progress = (window.innerHeight - rect.top) / range;
    }
    section.style.setProperty('--works-progress', clamp(progress, 0, 1).toFixed(3));
  };

  const requestTick = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(render);
  };

  rail?.addEventListener('wheel', e => {
    if (window.matchMedia('(max-width: 640px)').matches) return;
    const maxScroll = maxRailScroll();
    if (!maxScroll) return;

    const delta = normalizeWheelDelta(e);
    const atStart = railTarget <= 1 && delta < 0;
    const atEnd = railTarget >= maxScroll - 1 && delta > 0;
    if (atStart || atEnd) return;

    e.preventDefault();
    wheelActive = true;
    rail.classList.add('is-wheel-scrolling');
    clearTimeout(wheelIdleTimer);
    wheelIdleTimer = setTimeout(() => {
      wheelActive = false;
      if (!railAnimating) rail.classList.remove('is-wheel-scrolling');
    }, 420);

    railTarget = clamp(railTarget + delta * 1.08, 0, maxScroll);
    requestRailAnimation();
    requestTick();
  }, { passive: false });
  rail?.addEventListener('scroll', () => {
    if (!railAnimating) railTarget = clamp(rail.scrollLeft, 0, maxRailScroll());
    requestTick();
  }, { passive: true });
  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', () => {
    railTarget = clamp(railTarget, 0, maxRailScroll());
    requestTick();
  });
  requestTick();
})();

// ---------- Tweaks panel ----------
(() => {
  const panel = document.getElementById('tweaks-panel');
  if (!panel) return;

  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "accent": "#c8f531",
    "grain": true
  }/*EDITMODE-END*/;

  const apply = (s) => {
    document.documentElement.style.setProperty('--accent', s.accent);
    const [r,g,b] = [1,3,5].map(i => parseInt(s.accent.slice(i, i+2), 16));
    document.documentElement.style.setProperty('--accent-dim', `rgba(${r},${g},${b},0.15)`);
    panel.querySelectorAll('.sw').forEach(el => el.classList.toggle('active', el.dataset.c === s.accent));
  };

  const state = { ...TWEAK_DEFAULTS };
  apply(state);

  const swatches = ['#c8f531', '#ff4a1c', '#ffd400', '#4a8dff', '#ff2bd6', '#ffffff'];
  panel.querySelector('.swatches').innerHTML = swatches
    .map(c => `<div class="sw" data-c="${c}" style="background:${c}"></div>`).join('');
  panel.querySelectorAll('.sw').forEach(el => {
    el.addEventListener('click', () => {
      state.accent = el.dataset.c;
      apply(state);
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { accent: state.accent } }, '*');
    });
  });

  window.addEventListener('message', (e) => {
    if (e.data?.type === '__activate_edit_mode') panel.classList.add('show');
    if (e.data?.type === '__deactivate_edit_mode') panel.classList.remove('show');
  });
  window.parent.postMessage({ type: '__edit_mode_available' }, '*');
})();
