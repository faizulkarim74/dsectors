/* ============================================================
   DSECTORS — MAIN JAVASCRIPT
   Animations, Interactions, Particles, Modals
   ============================================================ */

'use strict';

/* ─── Utilities ─── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function throttle(fn, ms) {
  let t = 0;
  return (...a) => { const n = Date.now(); if (n - t >= ms) { t = n; fn(...a); } };
}

function lerp(a, b, t) { return a + (b - a) * t; }

/* ═══════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════ */
function initNav() {
  const nav = $('#main-nav');
  if (!nav) return;

  // Scroll
  const onScroll = throttle(() => {
    nav.classList.toggle('scrolled', window.scrollY > 30);
  }, 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Active link
  const currentFile = location.pathname.split('/').pop() || 'index.html';
  $$('.nav__link[data-page]', nav).forEach(a => {
    if (a.dataset.page === currentFile) a.classList.add('active');
  });

  // Hamburger
  const ham   = $('#nav-ham');
  const mob   = $('#nav-mobile');
  if (ham && mob) {
    ham.addEventListener('click', () => {
      const open = mob.classList.toggle('open');
      ham.classList.toggle('open', open);
      ham.setAttribute('aria-expanded', String(open));
    });
    $$('a', mob).forEach(a => a.addEventListener('click', () => {
      mob.classList.remove('open');
      ham.classList.remove('open');
    }));
  }
}

/* ═══════════════════════════════════════
   SCROLL REVEAL
═══════════════════════════════════════ */
function initReveal() {
  const els = $$('.reveal');
  if (!els.length) return;

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });

  els.forEach(el => io.observe(el));
}

/* ═══════════════════════════════════════
   ANIMATED COUNTERS
═══════════════════════════════════════ */
function animateNum(el) {
  const target  = parseFloat(el.dataset.target);
  const suffix  = el.dataset.suffix  || '';
  const prefix  = el.dataset.prefix  || '';
  const dur     = 2000;
  const start   = performance.now();

  const run = now => {
    const p = Math.min((now - start) / dur, 1);
    const ease = 1 - Math.pow(1 - p, 4);
    const cur = target * ease;
    el.textContent = prefix + (Number.isInteger(target) ? Math.round(cur) : cur.toFixed(1)) + suffix;
    if (p < 1) requestAnimationFrame(run);
  };
  requestAnimationFrame(run);
}

function initCounters() {
  const els = $$('[data-counter]');
  if (!els.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { animateNum(e.target); io.unobserve(e.target); }
    });
  }, { threshold: 0.5 });
  els.forEach(el => io.observe(el));
}

/* ═══════════════════════════════════════
   TICKER DUPLICATE
═══════════════════════════════════════ */
function initTicker() {
  const track = $('.ticker-track');
  if (!track) return;
  track.innerHTML += track.innerHTML;
}

/* ═══════════════════════════════════════
   DIRECTOR MODAL
═══════════════════════════════════════ */
function initModals() {
  const backdrop = $('#modal-backdrop');
  if (!backdrop || typeof DIRECTORS === 'undefined') return;

  function open(id) {
    const d = DIRECTORS[id];
    if (!d) return;

    // Photo
    const img = backdrop.querySelector('.modal__photo');
    if (img) { img.src = d.photo; img.alt = d.name; }

    // Sidebar
    set('[data-m="name"]',        d.name);
    set('[data-m="role"]',        d.role);
    set('[data-m="title"]',       d.title);
    set('[data-m="institution"]', d.institution);
    set('[data-m="exp"]',         d.exp + ' Years Experience');

    // Chips
    const chips = backdrop.querySelector('[data-m="chips"]');
    if (chips) chips.innerHTML = d.tags.map(t => `<div class="modal__sidebar-chip">${t}</div>`).join('');

    // Bio
    set('[data-m="bio"]', d.bio);

    // Engagements
    const eng = backdrop.querySelector('[data-m="engagements"]');
    if (eng) eng.innerHTML = d.engagements.map(e => `
      <div class="modal__achievement">${e}</div>
    `).join('');

    // Timeline
    const tl = backdrop.querySelector('[data-m="timeline"]');
    if (tl) tl.innerHTML = d.career.map(c => `
      <div class="modal__t-item">
        <div class="modal__t-period">${c.period}</div>
        <div class="modal__t-role">${c.role}</div>
        <div class="modal__t-org">${c.org}</div>
      </div>
    `).join('');

    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  function set(selector, text) {
    const el = backdrop.querySelector(selector);
    if (el) el.textContent = text;
  }

  $$('[data-open-dir]').forEach(btn =>
    btn.addEventListener('click', () => open(btn.dataset.openDir))
  );

  backdrop.querySelector('.modal__close')?.addEventListener('click', close);
  backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

/* ═══════════════════════════════════════
   CONTACT FORM
═══════════════════════════════════════ */
function initForm() {
  const form = $('#contact-form');
  if (!form) return;

  // NOTE: Actual submission (lead capture → /api/leads) is handled by
  // js/cms-runtime.js. Here we only keep the floating-label UX.
  $$('.form-control', form).forEach(input => {
    input.addEventListener('focus', () => input.closest('.form-group')?.classList.add('focused'));
    input.addEventListener('blur',  () => input.closest('.form-group')?.classList.remove('focused'));
  });
}

/* ═══════════════════════════════════════
   SMOOTH SCROLL
═══════════════════════════════════════ */
function initScroll() {
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const t = document.querySelector(a.getAttribute('href'));
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
    });
  });
}

/* ═══════════════════════════════════════
   CURSOR GLOW
═══════════════════════════════════════ */
function initCursorGlow() {
  const hero = $('.hero');
  if (!hero || window.matchMedia('(pointer:coarse)').matches) return;

  const glow = document.createElement('div');
  glow.style.cssText = `
    position:absolute;width:400px;height:400px;border-radius:50%;
    background:radial-gradient(circle,rgba(26,111,216,0.06) 0%,transparent 70%);
    pointer-events:none;transform:translate(-50%,-50%);transition:opacity 0.3s;
    left:-9999px;top:-9999px;z-index:1;`;
  hero.style.position = 'relative';
  hero.appendChild(glow);

  let cx = 0, cy = 0, tx = 0, ty = 0;
  hero.addEventListener('mousemove', e => {
    const r = hero.getBoundingClientRect();
    tx = e.clientX - r.left;
    ty = e.clientY - r.top;
    glow.style.opacity = '1';
  });
  hero.addEventListener('mouseleave', () => { glow.style.opacity = '0'; });

  (function animate() {
    cx = lerp(cx, tx, 0.08);
    cy = lerp(cy, ty, 0.08);
    glow.style.left = cx + 'px';
    glow.style.top  = cy + 'px';
    requestAnimationFrame(animate);
  })();
}

/* ═══════════════════════════════════════
   INIT
═══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initReveal();
  initCounters();
  initTicker();
  initModals();
  initForm();
  initScroll();
  initCursorGlow();
});
