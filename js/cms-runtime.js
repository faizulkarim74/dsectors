/* ============================================================
   DSECTORS CMS — PUBLIC RUNTIME
   Loads on every page. Responsibilities:
     1. Fetch /api/content and apply overrides to [data-cms] elements
        (text / html / image src / link href / color / size / style)
        and animations to [data-cms-section] elements.
     2. Editor bridge: when embedded in the admin editor iframe
        (URL has ?cmsedit=1), enable click-to-select + live preview.
     3. Capture the contact form as a lead via /api/leads.
   The site works fully even if the API is unreachable (graceful).
   ============================================================ */
(function () {
  'use strict';

  var EDIT_MODE = /[?&]cmsedit=1/.test(location.search);

  /* ---- Animation library (injected once) ---- */
  var ANIM_CSS = [
    '[data-cms-anim]{opacity:0;will-change:transform,opacity}',
    '[data-cms-anim].cms-in{opacity:1}',
    '[data-cms-anim="fade-in"]{transition:opacity var(--cms-dur,700ms) var(--cms-ease,cubic-bezier(.16,1,.3,1)) var(--cms-delay,0ms)}',
    '[data-cms-anim="fade-up"]{transform:translateY(40px);transition:opacity var(--cms-dur,700ms) var(--cms-ease,cubic-bezier(.16,1,.3,1)) var(--cms-delay,0ms),transform var(--cms-dur,700ms) var(--cms-ease,cubic-bezier(.16,1,.3,1)) var(--cms-delay,0ms)}',
    '[data-cms-anim="fade-up"].cms-in{transform:translateY(0)}',
    '[data-cms-anim="fade-down"]{transform:translateY(-40px);transition:opacity var(--cms-dur,700ms) var(--cms-ease) var(--cms-delay,0ms),transform var(--cms-dur,700ms) var(--cms-ease) var(--cms-delay,0ms)}',
    '[data-cms-anim="fade-down"].cms-in{transform:translateY(0)}',
    '[data-cms-anim="slide-left"]{transform:translateX(60px);transition:opacity var(--cms-dur,700ms) var(--cms-ease) var(--cms-delay,0ms),transform var(--cms-dur,700ms) var(--cms-ease) var(--cms-delay,0ms)}',
    '[data-cms-anim="slide-left"].cms-in{transform:translateX(0)}',
    '[data-cms-anim="slide-right"]{transform:translateX(-60px);transition:opacity var(--cms-dur,700ms) var(--cms-ease) var(--cms-delay,0ms),transform var(--cms-dur,700ms) var(--cms-ease) var(--cms-delay,0ms)}',
    '[data-cms-anim="slide-right"].cms-in{transform:translateX(0)}',
    '[data-cms-anim="zoom-in"]{transform:scale(.9);transition:opacity var(--cms-dur,700ms) var(--cms-ease) var(--cms-delay,0ms),transform var(--cms-dur,700ms) var(--cms-ease) var(--cms-delay,0ms)}',
    '[data-cms-anim="zoom-in"].cms-in{transform:scale(1)}'
  ].join('');

  function injectOnce(id, css) {
    if (document.getElementById(id)) return;
    var s = document.createElement('style');
    s.id = id;
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }

  /* ---- Style keys we allow the CMS to override inline ---- */
  var STYLE_KEYS = [
    'color', 'backgroundColor', 'fontSize', 'fontWeight', 'lineHeight',
    'letterSpacing', 'textAlign', 'fontStyle', 'textTransform', 'padding', 'margin'
  ];

  function applyNode(el, node) {
    if (!node) return;
    if (typeof node.html === 'string') el.innerHTML = node.html;
    else if (typeof node.text === 'string') el.textContent = node.text;

    if (node.src) {
      if (el.tagName === 'IMG') el.src = node.src;
      else el.style.backgroundImage = 'url("' + node.src + '")';
    }
    if (node.href && 'href' in el) el.href = node.href;

    if (node.style) {
      STYLE_KEYS.forEach(function (k) {
        if (node.style[k] != null && node.style[k] !== '') el.style[k] = node.style[k];
      });
    }
  }

  function applyAnimation(el, anim) {
    if (!anim || !anim.type || anim.type === 'none') {
      el.removeAttribute('data-cms-anim');
      el.classList.add('cms-in');
      return;
    }
    el.setAttribute('data-cms-anim', anim.type);
    if (anim.duration) el.style.setProperty('--cms-dur', anim.duration + 'ms');
    if (anim.delay) el.style.setProperty('--cms-delay', anim.delay + 'ms');
    if (anim.easing) el.style.setProperty('--cms-ease', anim.easing);
    el.classList.remove('cms-in');
    observer.observe(el);
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('cms-in');
          observer.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  var CONTENT = { nodes: {}, sections: {} };

  function render(content) {
    CONTENT = content || CONTENT;
    injectOnce('cms-anim-css', ANIM_CSS);

    // Text / image / style overrides
    document.querySelectorAll('[data-cms]').forEach(function (el) {
      var key = el.getAttribute('data-cms');
      if (CONTENT.nodes && CONTENT.nodes[key]) applyNode(el, CONTENT.nodes[key]);
    });

    // Section animations
    document.querySelectorAll('[data-cms-section]').forEach(function (el) {
      var key = el.getAttribute('data-cms-section');
      var section = CONTENT.sections && CONTENT.sections[key];
      applyAnimation(el, section && section.animation);
    });
  }

  function load() {
    injectOnce('cms-anim-css', ANIM_CSS);
    // Cache-bust so edits appear immediately after saving.
    fetch('/api/content?t=' + Date.now(), { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (doc) { if (doc) render(doc); })
      .catch(function () { /* offline / not deployed yet — keep static content */ });
  }

  /* ============================================================
     CONTACT FORM → LEAD CAPTURE
     ============================================================ */
  function wireContactForm() {
    var form = document.getElementById('contact-form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('[type="submit"]');
      var orig = btn ? btn.innerHTML : '';
      if (btn) { btn.disabled = true; btn.innerHTML = 'Sending…'; }

      var data = {
        name: val('cf-name'),
        email: val('cf-email'),
        organisation: val('cf-org'),
        phone: val('cf-phone'),
        inquiryType: val('cf-inquiry'),
        service: val('cf-service'),
        message: val('cf-message'),
        source: 'contact-page'
      };

      fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error(res.j && res.j.error ? res.j.error : 'Failed');
          if (btn) {
            btn.innerHTML = '✓ Message Sent — We’ll Be in Touch';
            btn.style.background = 'var(--olive, #3f5c48)';
          }
          form.reset();
          setTimeout(function () {
            if (btn) { btn.disabled = false; btn.innerHTML = orig; btn.style.background = ''; }
          }, 4000);
        })
        .catch(function (err) {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = orig;
          }
          alert('Sorry, we could not send your message: ' + err.message);
        });

      function val(id) {
        var el = document.getElementById(id);
        return el ? el.value : '';
      }
    });
  }

  /* ============================================================
     EDITOR BRIDGE (only active inside the admin iframe)
     ============================================================ */
  function initEditorBridge() {
    injectOnce(
      'cms-edit-css',
      '.cms-hover{outline:2px dashed #2c8983!important;outline-offset:2px;cursor:pointer!important}' +
        '.cms-selected{outline:2px solid #a8443c!important;outline-offset:2px}'
    );
    document.documentElement.setAttribute('data-cms-editing', '1');

    var selected = null;

    function editable(el) {
      return el && el.closest && el.closest('[data-cms],[data-cms-section]');
    }

    document.addEventListener(
      'mouseover',
      function (e) {
        var t = editable(e.target);
        if (t) t.classList.add('cms-hover');
      },
      true
    );
    document.addEventListener(
      'mouseout',
      function (e) {
        var t = editable(e.target);
        if (t) t.classList.remove('cms-hover');
      },
      true
    );

    document.addEventListener(
      'click',
      function (e) {
        var t = editable(e.target);
        if (!t) return;
        e.preventDefault();
        e.stopPropagation();
        if (selected) selected.classList.remove('cms-selected');
        selected = t;
        t.classList.add('cms-selected');

        var cs = getComputedStyle(t);
        var isImg = t.tagName === 'IMG';
        parent.postMessage(
          {
            type: 'cms:select',
            key: t.getAttribute('data-cms'),
            sectionKey: t.getAttribute('data-cms-section'),
            tag: t.tagName,
            isImage: isImg,
            text: isImg ? '' : t.textContent,
            src: isImg ? t.src : '',
            computed: {
              color: rgbToHex(cs.color),
              backgroundColor: rgbToHex(cs.backgroundColor),
              fontSize: parseFloat(cs.fontSize),
              fontWeight: cs.fontWeight,
              textAlign: cs.textAlign,
              lineHeight: cs.lineHeight,
              letterSpacing: cs.letterSpacing
            }
          },
          '*'
        );
      },
      true
    );

    // Receive live-preview updates + save commands from the admin.
    window.addEventListener('message', function (e) {
      var m = e.data || {};
      if (m.type === 'cms:preview') {
        var el = m.key
          ? document.querySelector('[data-cms="' + cssEsc(m.key) + '"]')
          : document.querySelector('[data-cms-section="' + cssEsc(m.sectionKey) + '"]');
        if (!el) return;
        if (m.node) applyNode(el, m.node);
        if (m.animation) {
          el.classList.remove('cms-in');
          applyAnimation(el, m.animation);
          // For editor feedback, trigger it immediately.
          requestAnimationFrame(function () { el.classList.add('cms-in'); });
        }
      } else if (m.type === 'cms:rerender' && m.content) {
        render(m.content);
      }
    });

    parent.postMessage({ type: 'cms:ready' }, '*');
  }

  function cssEsc(s) {
    return String(s).replace(/"/g, '\\"');
  }
  function rgbToHex(rgb) {
    if (!rgb) return '';
    var m = rgb.match(/\d+/g);
    if (!m) return '';
    if (m.length >= 3 && m[3] === '0') return 'transparent';
    return (
      '#' +
      m
        .slice(0, 3)
        .map(function (n) {
          return ('0' + parseInt(n, 10).toString(16)).slice(-2);
        })
        .join('')
    );
  }

  /* ---- boot ---- */
  function boot() {
    load();
    wireContactForm();
    if (EDIT_MODE) initEditorBridge();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Expose a tiny hook the admin can call cross-frame if needed.
  window.__cmsRender = render;
})();
