// A board's pages: swipe to turn, tap a spot, pull a photo in from the tray.
import * as db from './db.js';
import { sizeOf, stepSize, useDefault, saveDefault, isDefault, withTextDefaults } from './textsize.js';
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
  const undo = [];
  const persist = debounce(() => db.saveBoard(board).then((b) => { board.updatedAt = b.updatedAt; }), 300);
  const snapshot = () => { undo.push(JSON.stringify(board.pages)); if (undo.length > 40) undo.shift(); paintUndo(); };
  const page = () => board.pages[at];

  view.innerHTML = `
    <div class="screen editor">
      <header class="folder-head">
        <a class="icon-btn" href="#/boards" aria-label="Back to boards">${ICONS.back}</a>
        <button type="button" class="hand board-name" data-rename></button>
        <span class="count" data-at></span>
      </header>
      <div class="stage" data-stage></div>
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
    const el = await renderPage(board, page(), { selected: sel });
    if (token !== drawToken || destroyed) return;
    fit(el);
    if (sel >= 0 && page().images[sel]) {
      const x = document.createElement('button');
      x.type = 'button'; x.className = 'slot-x'; x.setAttribute('aria-label', 'Take this photo off the page'); x.innerHTML = ICONS.x;
      el.querySelector(`.slot[data-index="${sel}"]`).append(x);
    }
    stage.replaceChildren(el);
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
    view.querySelector('[data-tray-head]').innerHTML = sources.map((f) => `<button type="button" class="chip${tray === f.id ? ' on' : ''}" data-source="${esc(f.id)}">${esc(f.name)}</button>`).join('');
    const list = sortList(photosIn(tray), 'newest');
    const onPage = new Set(page().images.filter(Boolean).map((x) => x.id));
    view.querySelector('[data-tray]').innerHTML = list.length
      ? list.map((p) => `<button type="button" class="tray-photo${onPage.has(p.id) ? ' used' : ''}" data-photo="${esc(p.id)}" aria-label="${esc(p.name)}"><img src="${thumbUrl(p)}" alt="" loading="lazy" draggable="false" /></button>`).join('')
      : '<p class="note">No photos here yet.</p>';
  }

  function goTo(n, dir) {
    n = clamp(n, 0, board.pages.length - 1);
    if (n === at) return;
    at = n; sel = -1;
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
  function textSheet() {
    const p = page(), t = pageTemplate(board, p);
    const sh = openSheet({
      title: 'Page text',
      body: `
        <label class="field"><span class="label">Title</span><input type="text" data-title value="${esc(p.title || '')}" maxlength="120" autocomplete="off" /></label>
        ${sizeRow('title', 'title')}
        <label class="field"><span class="label">Text</span><textarea rows="4" data-body>${esc(p.text || '')}</textarea></label>
        ${sizeRow('body', 'text')}
        ${t.text.overlay ? `<label class="check"><input type="checkbox" data-fill${p.textFill === false ? '' : ' checked'} /> Background behind text</label>` : ''}
        <label class="check"><input type="checkbox" data-palette${p.palette ? ' checked' : ''} /> Show this page's colors</label>
        <div class="sheet-actions one"><button type="button" class="btn primary" data-close>Done</button></div>`,
    });
    let first = true;
    const change = (fn) => { if (first) { snapshot(); first = false; } fn(); persist(); drawPage(); };
    sh.body.querySelector('[data-title]').addEventListener('input', (e) => change(() => { p.title = e.target.value; }));
    sh.body.querySelector('[data-body]').addEventListener('input', (e) => change(() => { p.text = e.target.value; }));
    sh.body.querySelector('[data-fill]')?.addEventListener('change', (e) => change(() => { p.textFill = e.target.checked; }));
    sh.body.querySelector('[data-palette]').addEventListener('change', (e) => change(() => { p.palette = e.target.checked; }));
    const paintSizes = () => sh.body.querySelectorAll('[data-size]').forEach((row) => {
      const kind = row.dataset.size;
      row.querySelector('b').textContent = `${Math.round(sizeOf(p, kind) * 100)}%`;
      row.querySelector('[data-usedef]').disabled = isDefault(p, kind);
      row.querySelector('[data-savedef]').disabled = isDefault(p, kind);
    });
    paintSizes();
    sh.body.addEventListener('click', (e) => {
      const b = e.target.closest('button'), row = b?.closest('[data-size]');
      if (!row) return;
      const kind = row.dataset.size, word = kind === 'title' ? 'Title' : 'Text';
      if (b.dataset.grow) change(() => stepSize(p, kind, +b.dataset.grow));
      else if ('usedef' in b.dataset) { change(() => useDefault(p, kind)); toast(`${word} back to your default size`); }
      else if ('savedef' in b.dataset) { saveDefault(p, kind); toast(`${word} size saved: new pages start with it`); }
      paintSizes();
    });
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
    else if (k === 'text') textSheet();
    else if (k === 'add') addPage();
    else if (k === 'more') moreSheet();
    else if (k === 'pdf') exportPdf();
    else if (k === 'undo' && undo.length) {
      board.pages = JSON.parse(undo.pop());
      at = Math.min(at, board.pages.length - 1);
      sel = -1;
      paintUndo(); persist(); drawPage(); drawTray();
    }
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
