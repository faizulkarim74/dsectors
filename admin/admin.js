/* ============================================================
   DSECTORS CMS — ADMIN APP
   ============================================================ */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var state = {
    content: { nodes: {}, sections: {}, theme: {} },
    dirty: false,
    current: null,        // { key | sectionKey, isImage }
    frameReady: false
  };

  /* ---------- boot ---------- */
  fetch('/api/session', { credentials: 'same-origin' })
    .then(function (r) { return r.json(); })
    .then(function (j) { if (j.authed) startApp(); else showLogin(); })
    .catch(showLogin);

  /* ---------- login ---------- */
  function showLogin() {
    $('#login').hidden = false;
    $('#app').hidden = true;
  }
  $('#login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = $('#login-btn');
    btn.disabled = true;
    $('#login-error').textContent = '';
    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ password: $('#login-password').value })
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.j.error || 'Login failed');
        startApp();
      })
      .catch(function (err) { $('#login-error').textContent = err.message; })
      .finally(function () { btn.disabled = false; });
  });

  $('#logout-btn').addEventListener('click', function () {
    fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }).then(function () {
      location.reload();
    });
  });

  /* ---------- app start ---------- */
  function startApp() {
    $('#login').hidden = true;
    $('#app').hidden = false;
    fetch('/api/content?t=' + Date.now(), { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (doc) {
        state.content = normalize(doc);
        loadPage($('#page-select').value);
      });
    loadLeads();
  }

  function normalize(doc) {
    doc = doc || {};
    return { nodes: doc.nodes || {}, sections: doc.sections || {}, theme: doc.theme || {} };
  }

  /* ---------- tabs ---------- */
  $$('.tab').forEach(function (t) {
    t.addEventListener('click', function () {
      $$('.tab').forEach(function (x) { x.classList.remove('is-active'); });
      t.classList.add('is-active');
      var tab = t.getAttribute('data-tab');
      $('.workspace[data-panel="design"]').hidden = tab !== 'design';
      $('.workspace[data-panel="leads"]').hidden = tab !== 'leads';
      if (tab === 'leads') loadLeads();
    });
  });

  /* ---------- preview iframe ---------- */
  var frame = $('#preview');
  $('#page-select').addEventListener('change', function () { loadPage(this.value); });

  function loadPage(path) {
    state.frameReady = false;
    clearInspector();
    var sep = path.indexOf('?') > -1 ? '&' : '?';
    frame.src = path + sep + 'cmsedit=1&t=' + Date.now();
  }

  window.addEventListener('message', function (e) {
    var m = e.data || {};
    if (m.type === 'cms:ready') {
      state.frameReady = true;
      // Push current (possibly unsaved) working content into the frame.
      frame.contentWindow.postMessage({ type: 'cms:rerender', content: state.content }, '*');
    } else if (m.type === 'cms:select') {
      openInspector(m);
    }
  });

  /* ---------- inspector ---------- */
  function clearInspector() {
    state.current = null;
    $('#inspector-empty').hidden = false;
    $('#inspector-body').hidden = true;
  }

  function openInspector(m) {
    state.current = m;
    $('#inspector-empty').hidden = true;
    $('#inspector-body').hidden = false;

    var isSection = !!m.sectionKey;
    $('#inspector-target').textContent =
      (m.key ? 'element: ' + m.key : '') +
      (m.sectionKey ? '  section: ' + m.sectionKey : '');

    var node = (m.key && state.content.nodes[m.key]) || {};
    var style = node.style || {};

    // Text
    $('#grp-text').hidden = m.isImage || !m.key;
    $('#in-text').value = node.text != null ? node.text : m.text || '';

    // Image
    $('#grp-image').hidden = !m.isImage;
    if (m.isImage) {
      var src = node.src || m.src || '';
      $('#in-img-preview').src = src;
      $('#in-img-url').value = node.src || '';
    }

    // Appearance (only for element nodes)
    $('#grp-style').hidden = !m.key;
    $('#in-color').value = style.color || m.computed.color || '#000000';
    $('#in-bg').value = style.backgroundColor && style.backgroundColor !== 'transparent'
      ? style.backgroundColor : '#ffffff';
    var size = parseFloat(style.fontSize) || m.computed.fontSize || 16;
    $('#in-size').value = size;
    $('#in-size-out').textContent = Math.round(size) + 'px';
    $('#in-weight').value = style.fontWeight || '';
    $('#in-align').value = style.textAlign || '';

    // Animation (only for sections)
    $('#grp-anim').hidden = !isSection;
    if (isSection) {
      var anim = (state.content.sections[m.sectionKey] && state.content.sections[m.sectionKey].animation) || {};
      $('#in-anim').value = anim.type || 'none';
      $('#in-dur').value = anim.duration || 700;
      $('#in-dur-out').textContent = ($('#in-dur').value) + 'ms';
      $('#in-delay').value = anim.delay || 0;
      $('#in-delay-out').textContent = ($('#in-delay').value) + 'ms';
    }
  }

  /* ----- editing handlers ----- */
  function ensureNode() {
    var k = state.current.key;
    if (!state.content.nodes[k]) state.content.nodes[k] = {};
    return state.content.nodes[k];
  }
  function ensureSection() {
    var k = state.current.sectionKey;
    if (!state.content.sections[k]) state.content.sections[k] = {};
    if (!state.content.sections[k].animation) state.content.sections[k].animation = {};
    return state.content.sections[k];
  }
  function ensureStyle() {
    var n = ensureNode();
    if (!n.style) n.style = {};
    return n.style;
  }
  function previewNode() {
    frame.contentWindow.postMessage(
      { type: 'cms:preview', key: state.current.key, node: state.content.nodes[state.current.key] },
      '*'
    );
    markDirty();
  }
  function previewSection() {
    frame.contentWindow.postMessage(
      { type: 'cms:preview', sectionKey: state.current.sectionKey, animation: ensureSection().animation },
      '*'
    );
    markDirty();
  }

  $('#in-text').addEventListener('input', function () {
    if (!state.current || !state.current.key) return;
    ensureNode().text = this.value;
    previewNode();
  });
  $('#in-color').addEventListener('input', function () {
    ensureStyle().color = this.value;
    previewNode();
  });
  $('#in-bg').addEventListener('input', function () {
    ensureStyle().backgroundColor = this.value;
    previewNode();
  });
  $('#in-size').addEventListener('input', function () {
    $('#in-size-out').textContent = this.value + 'px';
    ensureStyle().fontSize = this.value + 'px';
    previewNode();
  });
  $('#in-weight').addEventListener('change', function () {
    ensureStyle().fontWeight = this.value;
    previewNode();
  });
  $('#in-align').addEventListener('change', function () {
    ensureStyle().textAlign = this.value;
    previewNode();
  });
  $('#in-img-url').addEventListener('change', function () {
    if (!this.value) return;
    ensureNode().src = this.value;
    $('#in-img-preview').src = this.value;
    previewNode();
  });

  ['in-anim', 'in-dur', 'in-delay'].forEach(function (id) {
    $('#' + id).addEventListener('input', function () {
      if (!state.current || !state.current.sectionKey) return;
      var a = ensureSection().animation;
      a.type = $('#in-anim').value;
      a.duration = parseInt($('#in-dur').value, 10);
      a.delay = parseInt($('#in-delay').value, 10);
      $('#in-dur-out').textContent = a.duration + 'ms';
      $('#in-delay-out').textContent = a.delay + 'ms';
      previewSection();
    });
  });
  $('#anim-replay').addEventListener('click', function () {
    if (state.current && state.current.sectionKey) previewSection();
  });

  $('#reset-el').addEventListener('click', function () {
    if (!state.current) return;
    if (state.current.key) delete state.content.nodes[state.current.key];
    if (state.current.sectionKey) delete state.content.sections[state.current.sectionKey];
    markDirty();
    // Reload the frame to drop the override cleanly.
    frame.contentWindow.postMessage({ type: 'cms:rerender', content: state.content }, '*');
    clearInspector();
  });

  /* ----- image upload ----- */
  $('#in-img-file').addEventListener('change', function () {
    var file = this.files && this.files[0];
    if (!file || !state.current) return;
    setStatus('Uploading image…');
    compressImage(file, 1600, 0.85)
      .then(function (dataUrl) {
        return fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ filename: file.name, dataUrl: dataUrl })
        });
      })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.j.error || 'Upload failed');
        ensureNode().src = res.j.url;
        $('#in-img-preview').src = res.j.url;
        $('#in-img-url').value = res.j.url;
        previewNode();
        setStatus('Image uploaded ✓');
      })
      .catch(function (err) { setStatus(''); alert('Upload failed: ' + err.message); });
  });

  function compressImage(file, maxDim, quality) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var w = img.width, h = img.height;
        var scale = Math.min(1, maxDim / Math.max(w, h));
        var c = document.createElement('canvas');
        c.width = Math.round(w * scale);
        c.height = Math.round(h * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        var type = /png/i.test(file.type) ? 'image/png' : 'image/jpeg';
        resolve(c.toDataURL(type, quality));
      };
      img.onerror = reject;
      var fr = new FileReader();
      fr.onload = function () { img.src = fr.result; };
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  /* ---------- save / discard ---------- */
  function markDirty() {
    state.dirty = true;
    $('#save-btn').disabled = false;
    $('#discard-btn').hidden = false;
    setStatus('Unsaved changes');
  }
  function setStatus(msg) { $('#save-status').textContent = msg; }

  $('#save-btn').addEventListener('click', function () {
    setStatus('Saving…');
    $('#save-btn').disabled = true;
    fetch('/api/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(state.content)
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.j.error || 'Save failed');
        state.dirty = false;
        $('#discard-btn').hidden = true;
        setStatus('Saved ✓ ' + new Date().toLocaleTimeString());
      })
      .catch(function (err) { $('#save-btn').disabled = false; setStatus(''); alert('Save failed: ' + err.message); });
  });

  $('#discard-btn').addEventListener('click', function () {
    if (!confirm('Discard all unsaved changes?')) return;
    fetch('/api/content?t=' + Date.now(), { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (doc) {
        state.content = normalize(doc);
        state.dirty = false;
        $('#save-btn').disabled = true;
        $('#discard-btn').hidden = true;
        setStatus('');
        loadPage($('#page-select').value);
      });
  });

  window.addEventListener('beforeunload', function (e) {
    if (state.dirty) { e.preventDefault(); e.returnValue = ''; }
  });

  /* ---------- leads ---------- */
  var LEADS = [];
  function loadLeads() {
    fetch('/api/leads', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : { leads: [] }; })
      .then(function (j) { LEADS = j.leads || []; renderLeads(); });
  }
  $('#leads-refresh').addEventListener('click', loadLeads);
  $('#leads-search').addEventListener('input', renderLeads);

  function renderLeads() {
    var q = ($('#leads-search').value || '').toLowerCase();
    var list = $('#leads-list');
    list.innerHTML = '';
    var filtered = LEADS.filter(function (l) {
      return !q || JSON.stringify(l).toLowerCase().indexOf(q) > -1;
    });
    var unread = LEADS.filter(function (l) { return !l.read; }).length;
    var badge = $('#leads-badge');
    badge.hidden = unread === 0;
    badge.textContent = unread;
    $('#leads-empty').hidden = filtered.length > 0;

    filtered.forEach(function (l) {
      var el = document.createElement('div');
      el.className = 'lead' + (l.read ? '' : ' is-unread');
      var chips = [];
      if (l.inquiryType) chips.push(l.inquiryType);
      if (l.organisation) chips.push(l.organisation);
      if (l.service) chips.push(l.service);
      if (l.source) chips.push(l.source);
      el.innerHTML =
        '<div class="lead__top"><span class="lead__name">' + esc(l.name) + '</span>' +
        '<span class="lead__meta">' + new Date(l.createdAt).toLocaleString() + '</span></div>' +
        '<div class="lead__contact">' +
        '<a href="mailto:' + esc(l.email) + '">' + esc(l.email) + '</a>' +
        (l.phone ? ' · <a href="tel:' + esc(l.phone) + '">' + esc(l.phone) + '</a>' : '') +
        '</div>' +
        (chips.length ? '<div class="lead__chips">' + chips.map(function (c) { return '<span class="chip">' + esc(c) + '</span>'; }).join('') + '</div>' : '') +
        '<div class="lead__msg">' + esc(l.message) + '</div>' +
        '<div class="lead__actions">' +
        '<button class="btn btn--ghost btn--sm" data-act="toggle">' + (l.read ? 'Mark unread' : 'Mark read') + '</button>' +
        '<button class="btn btn--ghost btn--sm" data-act="delete" style="color:#a8443c">Delete</button>' +
        '</div>';
      el.querySelector('[data-act="toggle"]').addEventListener('click', function () {
        updateLead(l.id, { read: !l.read });
      });
      el.querySelector('[data-act="delete"]').addEventListener('click', function () {
        if (confirm('Delete this lead permanently?')) updateLead(l.id, { delete: true });
      });
      list.appendChild(el);
    });
  }

  function updateLead(id, patch) {
    fetch('/api/lead-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(Object.assign({ id: id }, patch))
    }).then(loadLeads);
  }

  $('#leads-export').addEventListener('click', function () {
    if (!LEADS.length) return;
    var cols = ['createdAt', 'name', 'email', 'phone', 'organisation', 'inquiryType', 'service', 'message', 'source', 'read'];
    var rows = [cols.join(',')].concat(
      LEADS.map(function (l) {
        return cols.map(function (c) {
          var v = l[c] == null ? '' : String(l[c]);
          return '"' + v.replace(/"/g, '""') + '"';
        }).join(',');
      })
    );
    var blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'dsectors-leads-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
  });

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
})();
