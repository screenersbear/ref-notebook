// A board's pages: swipe to turn, tap a spot, pull a photo in from the tray.
import * as db from './db.js';
import { showBoard } from './showboard.js';
import { sizeOf, stepSize, useDefault, saveDefault, isDefault, withTextDefaults, defaultSize } from './textsize.js';
import { lib, photoById, photosIn, thumbUrl, sortList, SPECIAL } from './library.js';
import { TEMPLATES, SHAPES, templateFor, styleTemplate, defaultTemplate } from './templates.js';
import { renderPage, pageTemplate, pageToCanvas, applyCrop, MAX_ZOOM } from './pages.js';
import { makePdf } from './pdf.js';
import { openSheet, choiceSheet, confirmSheet, promptSheet, toast, hideToast } from './ui.js';
import { ICONS } from './icons.js';
import { esc, clamp, clone, slug, canvasToBlob, downloadBlob, debounce } from './util.js';

export async function boardScreen(view, id) {
  let board = await db.getBoard(id);
  if (!board) { location.hash = '#/boards'; return () => {}; }
  let at = 0, sel = -1, tray = 'all', destroyed = false, drawToken = 0;
  let tsel = null, panel = null, lastTap = null; // the text box picked ('main' or a note's index), its menu
  const undo = [];
  const persist = debounce(() => db.saveBoard(board).then((b) => { board.updatedAt = b.updatedAt; }), 300);
  const snapshot = () => { undo.push(JSON.stringify(board.pages)); if (undo.length > 40) undo.shift(); paintUndo(); };
  const page = () => board.pages[at];

  view.innerHTML = `
    <div class="screen editor">
      <header class="folder-head">
        <a class="icon-btn" href="#/boards" aria-label="Back to boards">${ICONS.back}</a>
        <button type="button" class="hand board-name" data-sit="ename" data-rename></button>
        <span class="count" data-sit="ecount" data-at></span>
      </header>
      <div class="stage" data-stage></div>
      <div class="show-row"><button type="button" class="label-btn show-open" data-show>${ICONS.expand}<span>Full screen</span></button></div>
      <div class="tpanel" data-tpanel hidden></div>
      <div class="tray-head" data-tray-head></div>
      <div class="tray" data-tray></div>
      <nav class="tools" aria-label="Page tools">
        <button type="button" class="tool" data-t="layout" aria-label="Change layout">${ICONS.layout}</button>
        <button type="button" class="tool" data-t="text" aria-label="Edit text">${ICONS.text}</button>
        <button type="button" class="tool" data-t="add" aria-label="Add a page">${ICONS.page}</button>
        <button type="button" class="tool" data-t="undo" aria-label="Undo">${ICONS.undo}</button>
        <button type="button" class="tool" data-t="more" aria-label="More">${ICONS.more}</button>
        <button type="button" class="tool" data-t="pdf" aria-label="Save as PDF">${ICONS.share}</button>
      </nav>
    </div>`;
  const stage = view.querySelector('[data-stage]');
  const paintUndo = () => { view.querySelector('[data-t=undo]').disabled = !undo.length; };

  async function drawPage(turn = 0) {
    const token = ++drawToken;
    view.querySelector('[data-rename]').textContent = board.name;
    view.querySelector('[data-at]').textContent = `${at + 1} of ${board.pages.length}`;
    const el = await renderPage(board, page(), { selected: sel, editing: true });
    if (token !== drawToken || destroyed) return;
    fit(el);
    if (sel >= 0 && page().images[sel]) {
      const x = document.createElement('button');
      x.type = 'button'; x.className = 'slot-x'; x.setAttribute('aria-label', 'Take this photo off the page'); x.innerHTML = ICONS.x;
      el.querySelector(`.slot[data-index="${sel}"]`).append(x);
    }
    stage.replaceChildren(el);
    paintTsel(el);
    if (turn) { el.classList.add(turn > 0 ? 'turn-next' : 'turn-back'); }
  }
  // As big as the space allows, keeping the page's shape.
  function fit(el) {
    const s = SHAPES[board.shape];
    const k = Math.min(stage.clientWidth / s.W, stage.clientHeight / s.H);
    el.style.width = `${Math.floor(s.W * k)}px`;
  }
  function drawTray() {
    const sources = [{ id: 'all', name: 'All' }, SPECIAL[0], SPECIAL[1], ...lib.folders];
    view.querySelector('[data-tray-head]').innerHTML = sources.map((f) => `<button type="button" class="chip${tray === f.id ? ' on' : ''}" data-sit="chip" data-source="${esc(f.id)}">${esc(f.name)}</button>`).join('');
    const list = sortList(photosIn(tray), 'newest');
    const onPage = new Set(page().images.filter(Boolean).map((x) => x.id));
    view.querySelector('[data-tray]').innerHTML = list.length
      ? list.map((p) => `<button type="button" class="tray-photo${onPage.has(p.id) ? ' used' : ''}" data-photo="${esc(p.id)}" aria-label="${esc(p.name)}"><img src="${thumbUrl(p)}" alt="" loading="lazy" draggable="false" /></button>`).join('')
      : '<p class="note">No photos here yet.</p>';
  }

  function goTo(n, dir) {
    n = clamp(n, 0, board.pages.length - 1);
    if (n === at) return;
    at = n; sel = -1; tsel = null; closePanel();
    drawPage(dir);
    drawTray();
  }

  function place(photoId) {
    const t = pageTemplate(board, page());
    let spot = sel;
    if (spot < 0) { for (let i = 0; i < t.slots.length; i++) if (!page().images[i]) { spot = i; break; } }
    if (spot < 0) { toast('Tap a spot on the page first'); return; }
    snapshot();
    while (page().images.length <= spot) page().images.push(null);
    page().images[spot] = { id: photoId };
    persist();
    drawPage();
    drawTray();
  }

  // ---- Touching the page ----
  const pts = new Map();
  let gesture = null;
  const slotOf = (target) => target.closest?.('.slot');
  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.slot-x')) return;
    try { stage.setPointerCapture(e.pointerId); } catch {}
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    const handle = e.target.closest('.tbox-sel i'), boxEl = handle ? null : e.target.closest('[data-box]');
    if (pts.size === 1 && (handle || boxEl)) {
      const key = handle ? tsel : keyOf(boxEl.dataset.box);
      const pg = stage.querySelector('.page'), b = pg.querySelector(`[data-box="${key}"]`);
      gesture = { text: key, handle: handle?.dataset.h, x: e.clientX, y: e.clientY, moved: false, picked: key === tsel, r0: rectOf(b, pg), pw: pg.clientWidth, ph: pg.clientHeight };
      return;
    }
    if (pts.size === 1) {
      const slot = slotOf(e.target);
      const onSel = slot && +slot.dataset.index === sel && page().images[sel];
      gesture = { x: e.clientX, y: e.clientY, slot, crop: onSel ? { ...page().images[sel] } : null, moved: false };
    } else if (pts.size === 2 && gesture?.crop) {
      const [a, b] = [...pts.values()];
      gesture.pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), zoom: page().images[sel].zoom || 1 };
    }
  });
  stage.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId) || !gesture) return;
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    const dx = e.clientX - gesture.x, dy = e.clientY - gesture.y;
    if (Math.hypot(dx, dy) > 8) gesture.moved = true;
    if (gesture.text != null) { if (gesture.moved && (gesture.picked || gesture.handle)) dragBox(gesture, dx / gesture.pw, dy / gesture.ph); return; }
    if (!gesture.crop) return;
    const im = page().images[sel];
    const slotEl = stage.querySelector(`.slot[data-index="${sel}"]`);
    const img = slotEl?.querySelector('img');
    const rec = photoById(im.id);
    if (!img || !rec) return;
    if (pts.size === 2 && gesture.pinch) {
      const [a, b] = [...pts.values()];
      im.zoom = clamp((gesture.pinch.zoom * Math.hypot(a[0] - b[0], a[1] - b[1])) / gesture.pinch.d, 1, MAX_ZOOM);
    } else if (pts.size === 1 && !gesture.pinch) {
      const sw = slotEl.clientWidth, sh = slotEl.clientHeight;
      const scale = Math.max(sw / rec.width, sh / rec.height) * (im.zoom || 1);
      const spareX = rec.width * scale - sw, spareY = rec.height * scale - sh;
      const [fx, fy] = gesture.crop.focal || [0.5, 0.5];
      im.focal = [spareX > 0.5 ? clamp(fx - dx / spareX, 0, 1) : fx, spareY > 0.5 ? clamp(fy - dy / spareY, 0, 1) : fy];
    }
    applyCrop(img, im);
    gesture.changed = true;
  });
  const up = (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (pts.size || !gesture) return;
    const g = gesture;
    gesture = null;
    if (g.text != null) return endBoxGesture(g, e);
    if (g.crop) {
      if (g.changed) {
        undo.push(JSON.stringify(board.pages.map((p, i) => (i === at ? { ...p, images: p.images.map((x, n) => (n === sel ? g.crop : x)) } : p))));
        paintUndo();
        persist();
        return;
      }
    }
    const dx = e.clientX - g.x;
    if (g.moved && !g.crop) {
      if (Math.abs(dx) > 40) goTo(at + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      return;
    }
    if (g.moved) return;
    const i = g.slot ? +g.slot.dataset.index : -1;
    sel = sel === i ? -1 : i;
    if (tsel != null) { tsel = null; closePanel(); }
    drawPage();
  };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);
  stage.addEventListener('click', (e) => {
    if (!e.target.closest('.slot-x')) return;
    snapshot();
    page().images[sel] = null;
    sel = -1;
    persist(); drawPage(); drawTray();
  });

  // ---- Sheets ----
  function layoutSheet() {
    const s = SHAPES[board.shape], W = 60, H = (60 * s.H) / s.W;
    const list = TEMPLATES[board.shape].filter((t) => !t.guide);
    const sh = openSheet({
      title: 'Layout',
      body: `<div class="style-grid">${list.map((t) => `<button type="button" class="style${t.id === page().template ? ' on' : ''}" data-tpl="${esc(t.id)}"><svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><rect class="paper-r" width="${W}" height="${H}"/>${t.slots.map((b) => `<rect x="${b.x * W}" y="${b.y * H}" width="${b.w * W}" height="${b.h * H}"/>`).join('')}</svg><span>${esc(t.name)}</span></button>`).join('')}</div>`,
    });
    sh.body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tpl]');
      if (!b) return;
      snapshot();
      page().template = b.dataset.tpl;
      sel = -1;
      persist(); sh.close(); drawPage();
    });
  }
  // ---- Text boxes ----
  // 'main' is the page's own title and text; a number is a box added with T.
  const keyOf = (v) => (v === 'main' ? 'main' : +v);
  const noteOf = (key) => (key === 'main' ? null : page().notes?.[key]);
  function rectOf(b, pg) {
    return { x: b.offsetLeft / pg.clientWidth, y: b.offsetTop / pg.clientHeight, w: b.offsetWidth / pg.clientWidth, h: b.offsetHeight / pg.clientHeight };
  }
  function paintTsel(pg) {
    if (tsel == null) return;
    const b = pg.querySelector(`[data-box="${tsel}"]`);
    if (!b) { tsel = null; closePanel(); return; }
    let o = pg.querySelector('.tbox-sel');
    if (!o) { o = document.createElement('div'); o.className = 'tbox-sel'; o.innerHTML = ['nw', 'ne', 'sw', 'se'].map((h) => `<i data-h="${h}"></i>`).join(''); pg.append(o); }
    Object.assign(o.style, { left: `${b.offsetLeft}px`, top: `${b.offsetTop}px`, width: `${b.offsetWidth}px`, height: `${b.offsetHeight}px` });
  }
  // Moving it (drag inside) or resizing it (drag a corner), as the finger goes.
  function dragBox(g, fx, fy) {
    const r0 = g.r0, r = { ...r0 };
    const h = g.handle;
    if (!h) { r.x = r0.x + fx; r.y = r0.y + fy; }
    else {
      if (h.includes('w')) { r.x = r0.x + fx; r.w = r0.w - fx; }
      if (h.includes('e')) r.w = r0.w + fx;
      if (h.includes('n')) { r.y = r0.y + fy; r.h = r0.h - fy; }
      if (h.includes('s')) r.h = r0.h + fy;
      if (r.w < 0.12) { if (h.includes('w')) r.x -= 0.12 - r.w; r.w = 0.12; }
      if (r.h < 0.04) { if (h.includes('n')) r.y -= 0.04 - r.h; r.h = 0.04; }
    }
    r.w = Math.min(r.w, 1); r.h = Math.min(r.h, 1);
    r.x = clamp(r.x, 0, 1 - r.w); r.y = clamp(r.y, 0, 1 - r.h);
    if (!g.snap) { snapshot(); g.snap = true; }
    const target = g.text === 'main' ? (page().textBox ||= {}) : noteOf(g.text);
    Object.assign(target, r);
    const pg = stage.querySelector('.page'), b = pg.querySelector(`[data-box="${g.text}"]`);
    const pc = (v) => `${(v * 100).toFixed(3)}%`;
    if (g.text === 'main' && b.classList.contains('overlay')) Object.assign(b.style, { left: pc(r.x), top: pc(r.y), bottom: '', maxWidth: pc(r.w) });
    else Object.assign(b.style, { left: pc(r.x), top: pc(r.y), bottom: '', width: pc(r.w), height: pc(r.h) });
    paintTsel(pg);
  }
  function endBoxGesture(g, e) {
    if (g.moved && (g.picked || g.handle)) { if (g.snap) { persist(); drawPage(); } return; }
    if (g.moved) { // a swipe that started on text: turn the page as usual
      const dx = e.clientX - g.x;
      if (Math.abs(dx) > 40) goTo(at + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      return;
    }
    // A tap picks the box; a second tap on it opens its menu.
    const now = performance.now();
    if (g.picked && lastTap && lastTap.key === g.text && now - lastTap.t < 400) { lastTap = null; openPanel(g.text); return; }
    lastTap = { key: g.text, t: now };
    if (!g.picked) { tsel = g.text; sel = -1; if (panel != null && panel !== tsel) closePanel(); drawPage(); }
  }
  function addNote() {
    snapshot();
    const p = page();
    p.notes ||= [];
    p.notes.push({ x: 0.15, y: 0.4, w: 0.7, h: 0.1, text: '', size: defaultSize('note') * 1.6 });
    tsel = p.notes.length - 1; sel = -1;
    persist();
    drawPage();
    openPanel(tsel, true);
  }

  // The menu for a text box, smaller, in place of the photos at the bottom.
  const tpanel = view.querySelector('[data-tpanel]');
  function closePanel() {
    if (panel == null) return;
    const p = page(), n = panel === 'main' ? null : p?.notes?.[panel];
    panel = null;
    tpanel.hidden = true; tpanel.innerHTML = '';
    view.querySelectorAll('.show-row, [data-tray-head], [data-tray]').forEach((x) => { x.hidden = false; });
    if (n && !n.text.trim()) { p.notes.splice(p.notes.indexOf(n), 1); tsel = null; persist(); }
    drawPage();
  }
  function openPanel(key, focus = false) {
    const keep = key === 'main' ? 'main' : page().notes?.[key];
    closePanel(); // may drop an empty box, which moves the others along
    key = keep === 'main' ? 'main' : page().notes.indexOf(keep);
    if (key === -1) return;
    panel = key; tsel = key;
    const p = page(), t = pageTemplate(board, p), n = noteOf(key);
    view.querySelectorAll('.show-row, [data-tray-head], [data-tray]').forEach((x) => { x.hidden = true; });
    tpanel.hidden = false;
    tpanel.innerHTML = n ? `
        <textarea rows="2" data-note placeholder="Type here">${esc(n.text)}</textarea>
        ${sizeRow('note', 'text')}
        <div class="tp-actions"><button type="button" class="label-btn" data-tdel>Delete box</button><button type="button" class="label-btn tp-done" data-tdone>Done</button></div>` : `
        <input type="text" data-title value="${esc(p.title || '')}" placeholder="Title" maxlength="120" autocomplete="off" />
        ${sizeRow('title', 'title')}
        <textarea rows="2" data-body placeholder="Text">${esc(p.text || '')}</textarea>
        ${sizeRow('body', 'text')}
        <div class="tp-checks">${t.text.overlay ? `<label class="check"><input type="checkbox" data-fill${p.textFill === false ? '' : ' checked'} /> Background</label>` : ''}
          <label class="check"><input type="checkbox" data-palette${p.palette ? ' checked' : ''} /> Page colors</label></div>
        <div class="tp-actions"><button type="button" class="label-btn tp-done" data-tdone>Done</button></div>`;
    let first = true;
    const change = (fn) => { if (first) { snapshot(); first = false; } fn(); persist(); drawPage(); };
    const on = (sel2, ev, fn) => tpanel.querySelector(sel2)?.addEventListener(ev, fn);
    on('[data-note]', 'input', (e) => change(() => { n.text = e.target.value; }));
    on('[data-title]', 'input', (e) => change(() => { p.title = e.target.value; }));
    on('[data-body]', 'input', (e) => change(() => { p.text = e.target.value; }));
    on('[data-fill]', 'change', (e) => change(() => { p.textFill = e.target.checked; }));
    on('[data-palette]', 'change', (e) => change(() => { p.palette = e.target.checked; }));
    const targetOf = (kind) => (kind === 'note' ? n : p);
    const paintSizes = () => tpanel.querySelectorAll('[data-size]').forEach((row) => {
      const kind = row.dataset.size, o = targetOf(kind);
      row.querySelector('b').textContent = `${Math.round(sizeOf(o, kind) * 100)}%`;
      row.querySelector('[data-usedef]').disabled = isDefault(o, kind);
      row.querySelector('[data-savedef]').disabled = isDefault(o, kind);
    });
    paintSizes();
    tpanel.onclick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if ('tdone' in b.dataset) { tsel = null; closePanel(); drawPage(); return; }
      if ('tdel' in b.dataset) { snapshot(); p.notes.splice(key, 1); panel = null; tsel = null; closePanel(); tpanel.hidden = true; view.querySelectorAll('.show-row, [data-tray-head], [data-tray]').forEach((x) => { x.hidden = false; }); persist(); drawPage(); return; }
      const row = b.closest('[data-size]');
      if (!row) return;
      const kind = row.dataset.size, o = targetOf(kind), word = kind === 'title' ? 'Title' : 'Text';
      if (b.dataset.grow) change(() => stepSize(o, kind, +b.dataset.grow));
      else if ('usedef' in b.dataset) { change(() => useDefault(o, kind)); toast(`${word} back to your default size`); }
      else if ('savedef' in b.dataset) { saveDefault(o, kind); toast(`${word} size saved: new ones start with it`); }
      paintSizes();
    };
    drawPage(); // the page refits to the room left
    if (focus) tpanel.querySelector('textarea, input')?.focus();
  }
  function sizeRow(kind, word) {
    return `
      <div class="size-row" data-size="${kind}">
        <span class="label">Size</span>
        <span class="stepper"><button type="button" data-grow="-1" aria-label="Smaller ${word}">A−</button><b>100%</b><button type="button" data-grow="1" aria-label="Larger ${word}">A+</button></span>
        <span class="size-defs"><button type="button" class="label-btn" data-usedef>Use default</button><button type="button" class="label-btn" data-savedef>Save as default</button></span>
      </div>`;
  }
  function addPage() {
    snapshot();
    const n = at + 1;
    const tid = styleTemplate(board.shape, board.style, n) || defaultTemplate(board.shape, 1).id;
    board.pages.splice(n, 0, withTextDefaults({ template: tid, images: [], section: page().section }));
    persist();
    goTo(n, 1);
    drawPage(1);
  }
  async function moreSheet() {
    const key = await choiceSheet({
      title: `Page ${at + 1}`,
      options: [
        ...(at > 0 ? [{ key: 'up', label: 'Move earlier' }] : []),
        ...(at < board.pages.length - 1 ? [{ key: 'down', label: 'Move later' }] : []),
        { key: 'dup', label: 'Duplicate page' },
        ...(board.pages.length > 1 ? [{ key: 'delete', label: 'Delete page', danger: true }] : []),
      ],
    });
    if (!key) return;
    if (key === 'delete' && !(await confirmSheet({ title: 'Delete this page?', message: 'Its photos stay in the notebook.', confirmLabel: 'Delete', danger: true }))) return;
    snapshot();
    if (key === 'up' || key === 'down') {
      const j = key === 'up' ? at - 1 : at + 1;
      [board.pages[at], board.pages[j]] = [board.pages[j], board.pages[at]];
      at = j;
    } else if (key === 'dup') {
      board.pages.splice(at + 1, 0, clone(page()));
      at += 1;
    } else {
      board.pages.splice(at, 1);
      at = Math.min(at, board.pages.length - 1);
    }
    sel = -1;
    persist(); drawPage(); drawTray();
  }
  async function exportPdf() {
    const s = SHAPES[board.shape];
    const px = board.shape === 'wide-16x9' ? 2000 : 1700;
    const sheets = [];
    try {
      for (let i = 0; i < board.pages.length; i++) {
        toast(`Making page ${i + 1} of ${board.pages.length}`, { ms: 60000 });
        const c = await pageToCanvas(board, board.pages[i], px);
        sheets.push({ w: s.W * 72, h: s.H * 72, pxW: c.width, pxH: c.height, jpeg: await canvasToBlob(c, 'image/jpeg', 0.88) });
        c.width = c.height = 0;
      }
    } catch (e) {
      console.error(e);
      toast('Could not make the PDF');
      return;
    }
    hideToast();
    const blob = makePdf(sheets);
    const name = `${slug(board.name)}.pdf`;
    const mb = (blob.size / 1048576).toFixed(1);
    // A new tap, because iOS won't open the share sheet after a long wait.
    const sh = openSheet({ title: 'Your PDF is ready', className: 'sheet-small', body: `<p class="sheet-message">${board.pages.length} ${board.pages.length === 1 ? 'page' : 'pages'}, ${mb} MB.</p><div class="sheet-actions one"><button type="button" class="btn primary" data-send>Save or share</button></div>` });
    sh.body.querySelector('[data-send]').addEventListener('click', async () => {
      const file = new File([blob], name, { type: 'application/pdf' });
      if (navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: board.name }); } catch {}
      } else downloadBlob(blob, name);
      sh.close();
    });
  }

  view.querySelector('.tools').addEventListener('click', (e) => {
    const b = e.target.closest('[data-t]');
    if (!b) return;
    const k = b.dataset.t;
    if (k === 'layout') layoutSheet();
    else if (k === 'text') addNote();
    else if (k === 'add') addPage();
    else if (k === 'more') moreSheet();
    else if (k === 'pdf') exportPdf();
    else if (k === 'undo' && undo.length) {
      board.pages = JSON.parse(undo.pop());
      at = Math.min(at, board.pages.length - 1);
      sel = -1; tsel = null; closePanel();
      paintUndo(); persist(); drawPage(); drawTray();
    }
  });
  // The whole board full screen; leaving it comes back on the page you ended on.
  view.querySelector('[data-show]').addEventListener('click', () => {
    persist.flush?.();
    showBoard(board, at, (n) => { if (!destroyed && n !== at) goTo(n, n > at ? 1 : -1); });
  });
  view.querySelector('[data-tray-head]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-source]');
    if (b) { tray = b.dataset.source; drawTray(); }
  });
  view.querySelector('[data-tray]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-photo]');
    if (b) place(b.dataset.photo);
  });
  view.querySelector('[data-rename]').addEventListener('click', async () => {
    const name = await promptSheet({ title: 'Rename board', value: board.name });
    if (name) { board.name = name; persist(); drawPage(); }
  });
  const onResize = () => { const el = stage.querySelector('.page'); if (el) fit(el); };
  window.addEventListener('ref-layout', onResize);

  paintUndo();
  await drawPage();
  drawTray();
  return () => { destroyed = true; persist.flush(); window.removeEventListener('ref-layout', onResize); };
}
