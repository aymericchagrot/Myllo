(() => {
  'use strict';

  /* ============================================================
     Constants & helpers
     ============================================================ */

  const STORAGE_KEY = 'myllo.v1';
  const STATUSES = ['todo', 'doing', 'done'];
  const STATUS_LABEL = { todo: 'À faire', doing: 'En cours', done: 'Fait' };
  const PRIORITIES = {
    urgent: { label: 'Urgente', rank: 0 },
    high: { label: 'Haute', rank: 1 },
    medium: { label: 'Moyenne', rank: 2 },
    low: { label: 'Basse', rank: 3 },
  };
  const EMPTY_TEXT = {
    todo: ['inbox', 'Rien à faire pour l’instant.', 'Ajoute une tâche pour commencer.'],
    doing: ['play', 'Aucune tâche en cours.', 'Glisse une carte ici pour la démarrer.'],
    done: ['checkCircle', 'Rien de terminé… encore.', 'Les tâches finies arriveront ici.'],
  };

  const ICONS = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    check: '<path d="m9 11 3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/>',
    tick: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>',
    sort: '<path d="m3 16 4 4 4-4M7 20V4M21 8l-4-4-4 4M17 4v16"/>',
    download: '<path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
    upload: '<path d="M12 15V3m0 0L8 7m4-4 4 4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    play: '<circle cx="12" cy="12" r="9"/><path d="m10 8.5 5 3.5-5 3.5z"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  };

  const icon = (name, size = 16) =>
    `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE = 'cubic-bezier(.2,.8,.2,1)';

  function h(tag, props = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'value') el.value = v;
      else el.setAttribute(k, v);
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  }

  const isoDate = (offsetDays = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Links typed in a task (details or sub-tasks), shown as clickable chips on the card.
  const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;
  const trimUrl = u => u.replace(/[.,;:!?)\]}»]+$/, '');

  function linksOf(t) {
    const found = [t.desc, ...t.checklist.map(c => c.text)].flatMap(s => s.match(URL_RE) || []);
    const seen = new Set();
    const links = [];
    for (const raw of found) {
      const text = trimUrl(raw);
      let url;
      try { url = new URL(/^www\./i.test(text) ? `https://${text}` : text); } catch { continue; }
      if (seen.has(url.href)) continue;
      seen.add(url.href);
      let path = url.pathname + url.search;
      try { path = decodeURI(path); } catch { /* keep it encoded */ }
      path = path.replace(/\/$/, '');
      links.push({ href: url.href, host: url.hostname.replace(/^www\./, ''), path });
    }
    return links;
  }

  /* ============================================================
     State
     ============================================================ */

  let state = load();
  const filter = { q: '', prio: 'all' };
  const justCreated = new Set();
  const prevCounts = {};

  function normalize(t) {
    return {
      id: String(t.id || uid()),
      title: String(t.title || 'Sans titre'),
      desc: String(t.desc || ''),
      priority: PRIORITIES[t.priority] ? t.priority : 'medium',
      status: STATUSES.includes(t.status) ? t.status : 'todo',
      due: /^\d{4}-\d{2}-\d{2}$/.test(t.due || '') ? t.due : '',
      checklist: Array.isArray(t.checklist)
        ? t.checklist.map(c => ({ id: String(c.id || uid()), text: String(c.text || ''), done: !!c.done }))
        : [],
      createdAt: Number(t.createdAt) || Date.now(),
      doneAt: t.doneAt ? Number(t.doneAt) : null,
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data.tasks)) return { tasks: data.tasks.map(normalize) };
      }
    } catch { /* storage unavailable or corrupt: start fresh */ }
    return { tasks: seed() };
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }

  function seed() {
    const c = (text, done = false) => ({ text, done });
    return [
      { title: 'Bienvenue sur Myllo 👋', priority: 'medium', status: 'todo',
        desc: 'Glisse les cartes d’une colonne à l’autre, clique pour les modifier. Raccourcis : N pour une nouvelle tâche, / pour chercher.',
        checklist: [c('Ouvrir Myllo', true), c('Créer ma première tâche'), c('Glisser une carte vers « En cours »'), c('Terminer une tâche')] },
      { title: 'Préparer la réunion de lundi', priority: 'high', status: 'todo', due: isoDate(2),
        desc: 'Ordre du jour, points bloquants, démo.' },
      { title: 'Mettre à jour la documentation', priority: 'low', status: 'todo' },
      { title: 'Corriger le bug de connexion', priority: 'urgent', status: 'doing', due: isoDate(0),
        desc: 'Le token expire trop tôt sur mobile.',
        checklist: [c('Reproduire', true), c('Écrire un test'), c('Corriger')] },
      { title: 'Installer Myllo', priority: 'low', status: 'done', doneAt: Date.now() },
    ].map(normalize);
  }

  const find = id => state.tasks.find(t => t.id === id);
  const cardById = id => $(`.card[data-id="${CSS.escape(id)}"]:not(.ghost)`);

  function setStatus(t, status) {
    if (status === 'done' && t.status !== 'done') t.doneAt = Date.now();
    else if (status !== 'done') t.doneAt = null;
    t.status = status;
  }

  // Remove the task from the list and put it at the top of its (new) column.
  function moveToTop(t) {
    state.tasks.splice(state.tasks.indexOf(t), 1);
    const first = state.tasks.findIndex(x => x.status === t.status);
    state.tasks.splice(first < 0 ? state.tasks.length : first, 0, t);
  }

  /* ============================================================
     Rendering
     ============================================================ */

  const board = $('#board');
  const searchInput = $('#search');

  function matches(t) {
    if (filter.prio !== 'all' && t.priority !== filter.prio) return false;
    if (!filter.q) return true;
    const q = filter.q.toLowerCase();
    return t.title.toLowerCase().includes(q)
      || t.desc.toLowerCase().includes(q)
      || t.checklist.some(c => c.text.toLowerCase().includes(q));
  }

  function dueInfo(t) {
    if (!t.due) return null;
    const [y, m, d] = t.due.split('-').map(Number);
    const due = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((due - today) / 86400000);
    const label = due.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    if (t.status === 'done') return { label, cls: '' };
    if (diff < 0) return { label: `En retard · ${label}`, cls: 'overdue' };
    if (diff === 0) return { label: 'Aujourd’hui', cls: 'soon' };
    if (diff === 1) return { label: 'Demain', cls: 'soon' };
    return { label, cls: '' };
  }

  function cardEl(t) {
    const p = PRIORITIES[t.priority];
    const idx = STATUSES.indexOf(t.status);
    const total = t.checklist.length;
    const doneCount = t.checklist.filter(c => c.done).length;
    const due = dueInfo(t);
    const links = linksOf(t);
    // Links already get their own block: keep the description readable without them.
    const desc = links.length ? t.desc.replace(URL_RE, '').replace(/[ 	]{2,}/g, ' ').trim() : t.desc;

    return h('article', {
      class: `card prio-${t.priority}`,
      'data-id': t.id,
      tabindex: 0,
      'aria-label': `${t.title} — priorité ${p.label.toLowerCase()}`,
    },
      h('div', { class: 'card-top' },
        h('span', { class: 'prio-pill' }, h('i'), p.label),
        h('div', { class: 'card-actions' },
          idx > 0 && h('button', {
            class: 'mini-btn', 'data-act': 'left', html: icon('left', 14),
            title: `Déplacer vers « ${STATUS_LABEL[STATUSES[idx - 1]]} »`, 'aria-label': `Déplacer vers ${STATUS_LABEL[STATUSES[idx - 1]]}`,
          }),
          idx < STATUSES.length - 1 && h('button', {
            class: 'mini-btn', 'data-act': 'right', html: icon('right', 14),
            title: `Déplacer vers « ${STATUS_LABEL[STATUSES[idx + 1]]} »`, 'aria-label': `Déplacer vers ${STATUS_LABEL[STATUSES[idx + 1]]}`,
          }),
        ),
      ),
      h('h3', { class: 'card-title' }, t.title),
      desc && h('p', { class: 'card-desc' }, desc),
      links.length > 0 && h('div', { class: 'card-links' },
        links.map(l => h('a', {
          class: 'link-chip', href: l.href, target: '_blank', rel: 'noopener noreferrer', title: l.href,
        },
          h('span', { class: 'link-ic', html: icon('link', 13) }),
          h('span', { class: 'link-text' }, h('strong', {}, l.host), l.path && h('span', {}, l.path)),
          h('span', { class: 'link-go', html: icon('external', 12) }),
        )),
      ),
      (due || total > 0) && h('div', { class: 'card-meta' },
        due && h('span', { class: `meta ${due.cls}`, html: icon('calendar', 13) }, due.label),
        total > 0 && h('span', { class: `meta ${doneCount === total ? 'complete' : ''}`, html: icon('check', 13) }, `${doneCount}/${total}`),
      ),
      total > 0 && h('div', { class: 'mini-progress' }, h('span', { style: `width:${(doneCount / total) * 100}%` })),
    );
  }

  function emptyEl(status, hasHidden) {
    const [ic, line1, line2] = EMPTY_TEXT[status];
    return h('div', { class: 'empty' },
      h('span', { class: 'empty-ic', html: icon(hasHidden ? 'search' : ic, 20) }),
      h('div', {},
        h('strong', { style: 'color:var(--muted);font-weight:600' }, hasHidden ? 'Aucune tâche ne correspond.' : line1),
        h('br'),
        hasHidden ? 'Essaie un autre filtre.' : line2,
      ),
    );
  }

  function snapshot() {
    const map = new Map();
    for (const el of $$('.card[data-id]:not(.ghost)', board)) map.set(el.dataset.id, el.getBoundingClientRect());
    return map;
  }

  function render({ animate = true } = {}) {
    if (drag?.started || settling) return;
    const first = animate && !reduceMotion ? snapshot() : null;

    for (const status of STATUSES) {
      const body = $(`.col-body[data-status="${status}"]`, board);
      const tasks = state.tasks.filter(t => t.status === status);
      const visible = tasks.filter(matches);
      body.replaceChildren(...visible.map(cardEl));
      if (!visible.length) body.append(emptyEl(status, tasks.length > 0));

      const countEl = $(`[data-count="${status}"]`, board);
      countEl.textContent = tasks.length;
      if (prevCounts[status] !== undefined && prevCounts[status] !== tasks.length && !reduceMotion) {
        countEl.classList.remove('bump');
        void countEl.offsetWidth;
        countEl.classList.add('bump');
      }
      prevCounts[status] = tasks.length;
    }

    if (first) {
      for (const el of $$('.card[data-id]', board)) {
        const id = el.dataset.id;
        const old = first.get(id);
        if (justCreated.has(id)) { el.classList.add('enter'); continue; }
        if (!old) {
          el.animate([{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: EASE });
          continue;
        }
        const now = el.getBoundingClientRect();
        const dx = old.left - now.left, dy = old.top - now.top;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          el.animate(
            [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
            { duration: 420, easing: 'cubic-bezier(.2,.85,.25,1)' },
          );
        }
      }
    }
    justCreated.clear();
    updateHeader();
  }

  function updateHeader() {
    const total = state.tasks.length;
    const done = state.tasks.filter(t => t.status === 'done').length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    $('#ringFg').style.strokeDasharray = `${pct} 100`;
    $('#progressLabel').textContent = `${pct}%`;

    const left = total - done;
    let date = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    date = date.charAt(0).toUpperCase() + date.slice(1);
    $('#subtitle').textContent = `${date} · ${left ? `${left} tâche${left > 1 ? 's' : ''} en attente` : total ? 'Tout est fait 🎉' : 'Tableau vide'}`;
  }

  /* ============================================================
     Effects
     ============================================================ */

  function celebrate(el) {
    if (!el) return;
    el.classList.remove('celebrate');
    void el.offsetWidth;
    el.classList.add('celebrate');
    if (reduceMotion) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const colors = ['#34d399', '#a78bfa', '#f472b6', '#fbbf24', '#60a5fa', '#ffffff'];
    for (let i = 0; i < 28; i++) {
      const size = 4 + Math.random() * 6;
      const p = h('span', {
        class: 'particle',
        style: `left:${cx}px;top:${cy}px;width:${size}px;height:${Math.random() > 0.5 ? size : size * 0.4}px;background:${colors[i % colors.length]};${Math.random() > 0.6 ? 'border-radius:50%;' : ''}`,
      });
      document.body.append(p);
      const angle = Math.random() * Math.PI * 2;
      const dist = 70 + Math.random() * 110;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist * 0.75 - 20;
      p.animate([
        { transform: 'translate(-50%, -50%) scale(1) rotate(0deg)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx * 0.85}px), calc(-50% + ${dy * 0.85}px)) scale(1) rotate(${Math.random() * 360}deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 50}px)) scale(.3) rotate(${Math.random() * 720}deg)`, opacity: 0 },
      ], { duration: 900 + Math.random() * 600, easing: 'cubic-bezier(.15,.7,.3,1)' }).onfinish = () => p.remove();
    }
  }

  function shake(el) {
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
    el.addEventListener('animationend', () => el.classList.remove('shake'), { once: true });
  }

  function toast(message, { action, onAction, duration = 4500 } = {}) {
    const el = h('div', { class: 'toast glass', role: 'status', style: `--d:${duration}ms` }, h('span', {}, message));
    let timer;
    const dismiss = () => {
      clearTimeout(timer);
      if (el.classList.contains('leaving')) return;
      el.classList.add('leaving');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    };
    if (action) {
      const btn = h('button', { class: 'toast-btn', type: 'button' }, action);
      btn.addEventListener('click', () => { onAction(); dismiss(); });
      el.append(btn);
    }
    $('#toasts').append(el);
    timer = setTimeout(dismiss, duration);
  }

  /* ============================================================
     Task actions
     ============================================================ */

  function moveTask(id, dir) {
    const t = find(id);
    const next = STATUSES[STATUSES.indexOf(t.status) + dir];
    if (!next) return;
    setStatus(t, next);
    moveToTop(t);
    save();
    render();
    const el = cardById(id);
    if (next === 'done') setTimeout(() => celebrate(cardById(id)), 380);
    else el?.classList.add('landed');
  }

  function deleteTask(id) {
    const backup = state.tasks.slice();
    const el = cardById(id);
    const finish = () => {
      state.tasks = state.tasks.filter(t => t.id !== id);
      save();
      render();
      toast('Tâche supprimée', {
        action: 'Annuler',
        onAction: () => { state.tasks = backup; justCreated.add(id); save(); render(); },
      });
    };
    if (el && !reduceMotion) {
      el.animate(
        [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.9) translateY(-6px)', filter: 'blur(4px)' }],
        { duration: 220, easing: 'ease-in', fill: 'forwards' },
      ).onfinish = finish;
    } else finish();
  }

  async function clearDone() {
    const done = state.tasks.filter(t => t.status === 'done');
    if (!done.length) { toast('La colonne « Fait » est déjà vide'); return; }
    const backup = state.tasks.slice();
    if (!reduceMotion) {
      const els = $$('.col-body[data-status="done"] .card', board);
      await Promise.all(els.map((el, i) => el.animate(
        [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(40px) scale(.95)' }],
        { duration: 260, delay: i * 45, easing: 'ease-in', fill: 'forwards' },
      ).finished));
    }
    state.tasks = state.tasks.filter(t => t.status !== 'done');
    save();
    render();
    toast(`${done.length} tâche${done.length > 1 ? 's' : ''} supprimée${done.length > 1 ? 's' : ''}`, {
      action: 'Annuler',
      onAction: () => { state.tasks = backup; done.forEach(t => justCreated.add(t.id)); save(); render(); },
    });
  }

  function sortColumn(status) {
    const positions = [];
    const items = [];
    state.tasks.forEach((t, i) => { if (t.status === status) { positions.push(i); items.push(t); } });
    const sorted = [...items].sort((a, b) =>
      PRIORITIES[a.priority].rank - PRIORITIES[b.priority].rank
      || (a.due || '9999').localeCompare(b.due || '9999'));
    if (sorted.every((t, i) => t === items[i])) { toast('Colonne déjà triée par priorité'); return; }
    positions.forEach((pos, i) => { state.tasks[pos] = sorted[i]; });
    save();
    render();
  }

  /* ============================================================
     Drag & drop (pointer based, works with mouse and touch)
     ============================================================ */

  let drag = null;
  let settling = false;

  board.addEventListener('pointerdown', e => {
    const card = e.target.closest('.card');
    if (!card || settling || drag || e.button !== 0 || e.target.closest('button, a')) return;
    const r = card.getBoundingClientRect();
    drag = {
      card,
      id: card.dataset.id,
      pointerType: e.pointerType,
      startX: e.clientX, startY: e.clientY,
      px: e.clientX, py: e.clientY, lastPx: e.clientX,
      offX: e.clientX - r.left, offY: e.clientY - r.top,
      started: false, tilt: 0, scale: 1,
    };
    if (e.pointerType === 'touch') {
      drag.timer = setTimeout(() => {
        if (drag && !drag.started) { startDrag(); navigator.vibrate?.(12); }
      }, 320);
    }
  });

  window.addEventListener('pointermove', e => {
    if (!drag) return;
    drag.px = e.clientX;
    drag.py = e.clientY;
    if (!drag.started) {
      const dist = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);
      if (drag.pointerType === 'touch') {
        if (dist > 8) { clearTimeout(drag.timer); drag = null; } // the user is scrolling
        return;
      }
      if (dist < 6) return;
      startDrag();
    }
  });

  window.addEventListener('pointerup', e => {
    if (!drag) return;
    clearTimeout(drag.timer);
    if (drag.started) { endDrag(); return; }
    const { card, id } = drag;
    drag = null;
    if (e.target.closest('.card') === card) openModal(id);
  });

  window.addEventListener('pointercancel', () => {
    if (!drag) return;
    clearTimeout(drag.timer);
    if (drag.started) endDrag(); else drag = null;
  });

  // Keep touch drags from scrolling the page.
  document.addEventListener('touchmove', e => { if (drag?.started) e.preventDefault(); }, { passive: false });
  board.addEventListener('contextmenu', e => { if (e.target.closest('.card')) e.preventDefault(); });
  board.addEventListener('dragstart', e => e.preventDefault());

  function startDrag() {
    const { card } = drag;
    const r = card.getBoundingClientRect();
    const ghost = card.cloneNode(true);
    ghost.classList.add('ghost');
    ghost.classList.remove('enter', 'landed', 'celebrate');
    ghost.removeAttribute('tabindex');
    ghost.setAttribute('aria-hidden', 'true');
    Object.assign(ghost.style, {
      width: `${r.width}px`,
      height: `${r.height}px`,
      transformOrigin: `${drag.offX}px ${drag.offY}px`,
      transform: `translate3d(${r.left}px, ${r.top}px, 0)`,
    });
    document.body.append(ghost);
    card.getAnimations().forEach(a => a.cancel());
    card.classList.add('placeholder');
    document.body.classList.add('dragging');
    window.getSelection()?.removeAllRanges();
    drag.ghost = ghost;
    drag.started = true;
    drag.raf = requestAnimationFrame(tick);
  }

  function tick() {
    if (!drag?.started) return;
    const vx = drag.px - drag.lastPx;
    drag.lastPx = drag.px;
    const targetTilt = reduceMotion ? 0 : clamp(vx * 0.9, -14, 14);
    drag.tilt += (targetTilt - drag.tilt) * 0.18;
    drag.scale += ((reduceMotion ? 1 : 1.045) - drag.scale) * 0.22;
    drag.ghost.style.transform =
      `translate3d(${drag.px - drag.offX}px, ${drag.py - drag.offY}px, 0) rotate(${drag.tilt.toFixed(2)}deg) scale(${drag.scale.toFixed(3)})`;

    autoScroll();
    updatePlacement();
    drag.raf = requestAnimationFrame(tick);
  }

  function autoScroll() {
    const edge = 60;
    const body = drag.overCol && $('.col-body', drag.overCol);
    if (body) {
      const r = body.getBoundingClientRect();
      if (drag.py < r.top + edge) body.scrollTop -= Math.ceil((r.top + edge - drag.py) / 4);
      else if (drag.py > r.bottom - edge) body.scrollTop += Math.ceil((drag.py - (r.bottom - edge)) / 4);
    }
    if (board.scrollWidth > board.clientWidth) {
      const r = board.getBoundingClientRect();
      if (drag.px < r.left + 40) board.scrollLeft -= 12;
      else if (drag.px > r.right - 40) board.scrollLeft += 12;
    }
  }

  function updatePlacement() {
    const col = document.elementFromPoint(drag.px, drag.py)?.closest('.column');
    if (!col) return;
    if (drag.overCol !== col) {
      drag.overCol?.classList.remove('drop-target');
      col.classList.add('drop-target');
      drag.overCol = col;
    }

    const body = $('.col-body', col);
    const ph = drag.card;
    const cards = $$('.card:not(.placeholder)', body);
    // Use layout positions (not transformed rects) so in-flight animations don't cause jitter.
    const top = body.getBoundingClientRect().top + body.clientTop - body.scrollTop;
    let idx = cards.length;
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      if (drag.py < top + c.offsetTop + c.offsetHeight / 2) { idx = i; break; }
    }

    const fromBody = ph.parentElement;
    if (fromBody === body) {
      const current = cards.filter(c => c.compareDocumentPosition(ph) & Node.DOCUMENT_POSITION_FOLLOWING).length;
      if (current === idx) return;
    }

    const affected = new Set([...$$('.card', fromBody), ...$$('.card', body)]);
    const before = new Map([...affected].map(el => [el, el.getBoundingClientRect()]));

    if (idx < cards.length) body.insertBefore(ph, cards[idx]);
    else if (cards.length) cards[cards.length - 1].after(ph);
    else body.prepend(ph);

    if (reduceMotion) return;
    for (const [el, old] of before) {
      el.getAnimations().forEach(a => a.cancel());
      const now = el.getBoundingClientRect();
      const dx = old.left - now.left, dy = old.top - now.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
      el.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
        { duration: 260, easing: EASE },
      );
    }
  }

  function endDrag() {
    const d = drag;
    drag = null;
    settling = true;
    cancelAnimationFrame(d.raf);
    d.overCol?.classList.remove('drop-target');
    document.body.classList.remove('dragging');

    d.card.getAnimations().forEach(a => a.cancel());
    const r = d.card.getBoundingClientRect();
    const finish = () => {
      d.ghost.remove();
      settling = false;
      commitDrop(d);
    };
    if (reduceMotion) { finish(); return; }
    d.ghost.animate(
      [
        { transform: d.ghost.style.transform },
        { transform: `translate3d(${r.left}px, ${r.top}px, 0) rotate(0deg) scale(1)` },
      ],
      { duration: 300, easing: 'cubic-bezier(.2,.9,.3,1.15)', fill: 'forwards' },
    ).onfinish = finish;
  }

  function commitDrop(d) {
    const ph = d.card;
    const body = ph.parentElement;
    const status = body.dataset.status;
    const t = find(d.id);
    const was = t.status;

    const sibling = (el, dir) => {
      let s = el[dir];
      while (s && !s.classList.contains('card')) s = s[dir];
      return s;
    };
    const next = sibling(ph, 'nextElementSibling');
    const prev = sibling(ph, 'previousElementSibling');

    state.tasks.splice(state.tasks.indexOf(t), 1);
    setStatus(t, status);
    if (next) state.tasks.splice(state.tasks.findIndex(x => x.id === next.dataset.id), 0, t);
    else if (prev) state.tasks.splice(state.tasks.findIndex(x => x.id === prev.dataset.id) + 1, 0, t);
    else state.tasks.push(t);

    save();
    render({ animate: false });

    const el = cardById(t.id);
    if (status === 'done' && was !== 'done') celebrate(el);
    else el?.classList.add('landed');
    el?.focus({ preventScroll: true });
  }

  /* ============================================================
     Modal
     ============================================================ */

  const modal = $('#modal');
  const form = $('#taskForm');
  const f = {
    heading: $('#modalTitle'),
    title: $('#fTitle'),
    desc: $('#fDesc'),
    due: $('#fDue'),
    list: $('#fChecklist'),
    checkNew: $('#fCheckNew'),
    checkCount: $('#fCheckCount'),
    del: $('#fDelete'),
  };
  let draft = null;
  let lastFocus = null;

  const isModalOpen = () => modal.classList.contains('open');

  function openModal(id, status = 'todo') {
    const t = id ? find(id) : null;
    draft = t
      ? JSON.parse(JSON.stringify(t))
      : { id: uid(), title: '', desc: '', priority: 'medium', status, due: '', checklist: [], createdAt: Date.now(), doneAt: null };

    f.heading.textContent = t ? 'Modifier la tâche' : 'Nouvelle tâche';
    f.title.value = draft.title;
    f.desc.value = draft.desc;
    f.due.value = draft.due;
    f.checkNew.value = '';
    form.elements.priority.value = draft.priority;
    form.elements.status.value = draft.status;
    f.del.hidden = !t;
    renderChecklist();

    lastFocus = document.activeElement;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    modal.scrollTop = 0;
    autosize();
    setTimeout(() => f.title.focus(), 60);
  }

  function closeModal() {
    if (!isModalOpen()) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    const id = draft?.id;
    draft = null;
    const target = (id && cardById(id)) || (lastFocus?.isConnected ? lastFocus : null);
    target?.focus({ preventScroll: true });
  }

  function autosize() {
    f.desc.style.height = 'auto';
    f.desc.style.height = `${Math.min(f.desc.scrollHeight + 2, 260)}px`;
  }

  function renderChecklist(newId) {
    f.list.replaceChildren(...draft.checklist.map(c => h('li', {
      class: `check-item${c.done ? ' done' : ''}${c.id === newId ? ' enter' : ''}`,
      'data-cid': c.id,
    },
      h('button', {
        type: 'button', class: 'check-box', 'data-cact': 'toggle', html: icon('tick', 13),
        'aria-pressed': String(c.done), 'aria-label': 'Fait',
      }),
      h('input', { class: 'check-text', value: c.text, 'data-cact': 'edit', 'aria-label': 'Sous-tâche' }),
      h('button', { type: 'button', class: 'icon-btn sm', 'data-cact': 'remove', html: icon('x', 14), 'aria-label': 'Supprimer la sous-tâche' }),
    )));
    updateCheckCount();
  }

  function updateCheckCount() {
    const total = draft.checklist.length;
    f.checkCount.textContent = total ? `${draft.checklist.filter(c => c.done).length}/${total}` : '';
  }

  function addChecklistItem() {
    const text = f.checkNew.value.trim();
    if (!text) return;
    const item = { id: uid(), text, done: false };
    draft.checklist.push(item);
    f.checkNew.value = '';
    renderChecklist(item.id);
  }

  function removeChecklistItem(li, focusPrev) {
    const i = draft.checklist.findIndex(c => c.id === li.dataset.cid);
    if (i < 0) return;
    const prevInput = li.previousElementSibling?.querySelector('.check-text');
    draft.checklist.splice(i, 1);
    const done = () => {
      renderChecklist();
      if (focusPrev && prevInput) {
        const input = $(`[data-cid="${CSS.escape(prevInput.closest('li').dataset.cid)}"] .check-text`, f.list);
        input?.focus();
        input?.setSelectionRange(input.value.length, input.value.length);
      } else if (focusPrev) f.checkNew.focus();
    };
    if (reduceMotion) { done(); return; }
    li.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(12px)' }], { duration: 160, easing: 'ease-in', fill: 'forwards' }).onfinish = done;
  }

  f.list.addEventListener('click', e => {
    const btn = e.target.closest('[data-cact]');
    if (!btn) return;
    const li = btn.closest('li');
    const item = draft.checklist.find(c => c.id === li.dataset.cid);
    if (btn.dataset.cact === 'toggle') {
      item.done = !item.done;
      li.classList.toggle('done', item.done);
      btn.setAttribute('aria-pressed', String(item.done));
      updateCheckCount();
    } else if (btn.dataset.cact === 'remove') {
      removeChecklistItem(li, false);
    }
  });

  f.list.addEventListener('input', e => {
    if (!e.target.matches('.check-text')) return;
    const item = draft.checklist.find(c => c.id === e.target.closest('li').dataset.cid);
    if (item) item.text = e.target.value;
  });

  f.list.addEventListener('keydown', e => {
    if (!e.target.matches('.check-text')) return;
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const nextInput = e.target.closest('li').nextElementSibling?.querySelector('.check-text');
      (nextInput || f.checkNew).focus();
    } else if (e.key === 'Backspace' && e.target.value === '') {
      e.preventDefault();
      removeChecklistItem(e.target.closest('li'), true);
    }
  });

  f.checkNew.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      addChecklistItem();
    }
  });

  f.desc.addEventListener('input', autosize);

  function saveDraft() {
    if (!draft) return;
    const title = f.title.value.trim();
    if (!title) { shake(f.title); f.title.focus(); return; }

    const status = form.elements.status.value || 'todo';
    const fields = {
      title,
      desc: f.desc.value.trim(),
      due: f.due.value,
      priority: form.elements.priority.value || 'medium',
      checklist: draft.checklist.map(c => ({ ...c, text: c.text.trim() })).filter(c => c.text),
    };

    const existing = find(draft.id);
    const target = existing || normalize(draft);
    const was = existing ? existing.status : null;
    Object.assign(target, fields);

    if (!existing) {
      target.status = null;
      setStatus(target, status);
      state.tasks.push(target);
      moveToTop(target);
      justCreated.add(target.id);
    } else if (was !== status) {
      setStatus(target, status);
      moveToTop(target);
    }

    save();
    render();
    closeModal();

    const becameDone = status === 'done' && was !== 'done';
    if (becameDone) setTimeout(() => celebrate(cardById(target.id)), existing ? 400 : 250);
    toast(existing ? 'Tâche mise à jour' : 'Tâche créée', { duration: 2200 });
  }

  form.addEventListener('submit', e => { e.preventDefault(); saveDraft(); });
  modal.addEventListener('mousedown', e => { if (e.target === modal) closeModal(); });
  $$('[data-close]', modal).forEach(b => b.addEventListener('click', closeModal));
  f.del.addEventListener('click', () => {
    const id = draft.id;
    closeModal();
    setTimeout(() => deleteTask(id), 120);
  });

  function trapFocus(e) {
    const focusables = $$('button:not([hidden]), input, textarea', form).filter(el => el.offsetParent !== null && !el.disabled);
    const firstEl = focusables[0], lastEl = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
    else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
  }

  /* ============================================================
     Board interactions
     ============================================================ */

  board.addEventListener('click', e => {
    const act = e.target.closest('[data-act]');
    if (act) { moveTask(act.closest('.card').dataset.id, act.dataset.act === 'left' ? -1 : 1); return; }
    const add = e.target.closest('[data-add]');
    if (add) { openModal(null, add.dataset.add); return; }
    const sort = e.target.closest('[data-sort]');
    if (sort) { sortColumn(sort.dataset.sort); return; }
    if (e.target.closest('[data-clear]')) clearDone();
  });

  board.addEventListener('keydown', e => {
    const card = e.target.closest('.card');
    if (!card || e.target !== card) return;
    const id = card.dataset.id;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(id); }
    else if (e.key === 'Delete') { e.preventDefault(); deleteTask(id); }
    else if (e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      e.preventDefault();
      moveTask(id, e.key === 'ArrowRight' ? 1 : -1);
      cardById(id)?.focus({ preventScroll: true });
    }
  });

  board.addEventListener('animationend', e => {
    if (e.target.classList.contains('card')) e.target.classList.remove('enter', 'landed', 'celebrate');
  });

  // Spotlight that follows the cursor on cards.
  board.addEventListener('pointermove', e => {
    if (drag?.started) return;
    const card = e.target.closest('.card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  });

  /* ============================================================
     Top bar
     ============================================================ */

  $('#newTask').addEventListener('click', () => openModal(null, 'todo'));

  searchInput.addEventListener('input', () => {
    filter.q = searchInput.value.trim();
    render();
  });

  $('#filters').addEventListener('click', e => {
    const chip = e.target.closest('[data-prio]');
    if (!chip) return;
    const prio = chip.dataset.prio === filter.prio ? 'all' : chip.dataset.prio;
    filter.prio = prio;
    for (const c of $$('[data-prio]', e.currentTarget)) {
      const on = c.dataset.prio === prio;
      c.classList.toggle('active', on);
      c.setAttribute('aria-pressed', String(on));
    }
    render();
  });

  $('#exportBtn').addEventListener('click', () => {
    const data = JSON.stringify({ app: 'myllo', version: 1, exportedAt: new Date().toISOString(), tasks: state.tasks }, null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const a = h('a', { href: url, download: `myllo-${isoDate()}.json` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Export téléchargé', { duration: 2200 });
  });

  const importFile = $('#importFile');
  $('#importBtn').addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', async () => {
    const file = importFile.files[0];
    importFile.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const tasks = Array.isArray(data) ? data : data.tasks;
      if (!Array.isArray(tasks)) throw new Error('format');
      if (!confirm(`Remplacer les ${state.tasks.length} tâches actuelles par les ${tasks.length} du fichier ?`)) return;
      const backup = state.tasks.slice();
      state.tasks = tasks.map(normalize);
      state.tasks.forEach(t => justCreated.add(t.id));
      save();
      render();
      toast(`${tasks.length} tâche${tasks.length > 1 ? 's' : ''} importée${tasks.length > 1 ? 's' : ''}`, {
        action: 'Annuler',
        onAction: () => { state.tasks = backup; save(); render(); },
      });
    } catch {
      toast('Fichier invalide : impossible de l’importer');
    }
  });

  /* ============================================================
     Keyboard shortcuts
     ============================================================ */

  document.addEventListener('keydown', e => {
    if (isModalOpen()) {
      if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
      else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveDraft(); }
      else if (e.key === 'Tab') trapFocus(e);
      return;
    }
    if (e.key === 'Escape' && document.activeElement === searchInput) {
      searchInput.value = '';
      filter.q = '';
      searchInput.blur();
      render();
      return;
    }
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
    if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); openModal(null, 'todo'); }
    else if (e.key === '/') { e.preventDefault(); searchInput.focus(); }
  });

  // Keep state in sync if Myllo is open in several tabs.
  window.addEventListener('storage', e => {
    if (e.key !== STORAGE_KEY || drag || isModalOpen()) return;
    state = load();
    render();
  });

  /* ============================================================
     Boot
     ============================================================ */

  $$('[data-icon]').forEach(el => el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon, el.classList.contains('col-icon') ? 16 : 17)));
  state.tasks.forEach(t => justCreated.add(t.id));
  render({ animate: !reduceMotion });
  // Stagger the first appearance of cards.
  $$('.card.enter', board).forEach((el, i) => { el.style.animationDelay = `${180 + i * 50}ms`; });
  setTimeout(() => $$('.card', board).forEach(el => { el.style.animationDelay = ''; }), 2000);
  // Refresh "today / overdue" labels around midnight.
  setInterval(() => { if (!drag && !isModalOpen()) render({ animate: false }); }, 5 * 60 * 1000);
})();
