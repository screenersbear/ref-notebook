// The photo viewer (round 2, dark): full screen, swipe between photos, pinch
// or double-tap to zoom. Under the photo, the tags it's in, what Ref found in
// it (take any away, add more), and its colors: tapping one opens every
// photo with that color. Favorite, Tag, Undo and Delete at the foot.
import * as db from '../data/db.js';
import { photoById, thumbUrl, fullUrl, refresh, lib, photosOfColor } from '../data/library.js';
import { fileSheet, changePhotos, relabel } from '../components/filing.js';
import { remember, canUndo, undoLast } from '../components/undo.js';
import { confirmSheet, promptSheet } from '../components/dialogs.js';
import { sheetIsOpen } from '../components/sheet.js';
import { toast } from '../components/toast.js';
import { ICONS } from '../components/icons.js';
import { esc, clamp } from '../components/util.js';
import { BACK } from '../components/band.js';

const X = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>';
const SMALL_X = '<svg viewBox="0 0 24 24" aria-hidden="true"><line x1="7" y1="7" x2="17" y2="17"/><line x1="17" y1="7" x2="7" y2="17"/></svg>';
const SMALL_PLUS = '<svg viewBox="0 0 24 24" aria-hidden="true"><line x1="12" y1="6" x2="12" y2="18"/><line x1="6" y1="12" x2="18" y2="12"/></svg>';

export function openViewer(ids, start, onChange) {
  let list = [...ids];
  let i = start;
  let scale = 1, tx = 0, ty = 0;
  let changed = false;
  const el = document.createElement('div');
  el.className = 'viewer';
  el.innerHTML = `
    <div class="v-top">
      <button type="button" class="ring-btn v-close" data-close aria-label="Close"><span>${X}</span></button>
      <span class="v-count"></span>
      <span class="v-top-gap" aria-hidden="true"></span>
    </div>
    <div class="v-stage"><img class="v-img" alt="" draggable="false" /></div>
    <div class="v-info">
      <p class="v-label">Tags</p>
      <div class="v-chips v-tags"></div>
      <p class="v-label">What is in it <span>(found by Ref, edit any)</span></p>
      <div class="v-chips v-found"></div>
      <div class="v-palette"></div>
      <p class="v-hint">Tap a color to see every photo with it</p>
    </div>
    <nav class="v-tools">
      <button type="button" data-v="fav"></button>
      <button type="button" data-v="file" aria-label="Tag this photo">${ICONS.file}<span aria-hidden="true">Tag</span></button>
      <button type="button" data-v="undo"${canUndo() ? '' : ' disabled'}>${ICONS.undo}<span>Undo</span></button>
      <button type="button" data-v="delete">${ICONS.trash}<span>Delete</span></button>
    </nav>`;
  document.body.append(el);
  const img = el.querySelector('.v-img');
  const stage = el.querySelector('.v-stage');
  const place = (dx = 0) => { img.style.transform = `translate(${tx + dx}px, ${ty}px) scale(${scale})`; };

  async function show() {
    const p = photoById(list[i]);
    if (!p) return close();
    scale = 1; tx = 0; ty = 0; place();
    img.src = thumbUrl(p);
    const tags = p.folderIds.map((id) => lib.folders.find((f) => f.id === id)?.name).filter(Boolean);
    el.querySelector('.v-tags').innerHTML = (tags.length ? tags : ['Incoming']).map((t) => `<span class="v-chip">${esc(t)}</span>`).join('');
    el.querySelector('.v-found').innerHTML = (p.tags || []).map((t) => `<button type="button" class="v-chip found" data-untag="${esc(t)}" aria-label="Remove ${esc(t)}">${esc(t)}${SMALL_X}</button>`).join('')
      + `<button type="button" class="v-chip add" data-addtag>${SMALL_PLUS}Add</button>`;
    el.querySelector('.v-count').textContent = `${i + 1} of ${list.length}`;
    el.querySelector('.v-palette').innerHTML = (p.palette || []).map((c) => `<button type="button" data-color="${esc(c.hex)}" aria-label="Photos with this color" style="background:${esc(c.hex)};flex:${c.w}"></button>`).join('');
    el.querySelector('[data-v=fav]').innerHTML = `${p.favorite ? ICONS.heartOn : ICONS.heart}<span>Favorite</span>`;
    el.querySelector('[data-v=fav]').setAttribute('aria-pressed', String(!!p.favorite));
    const want = list[i];
    const u = await fullUrl(want);
    if (u && want === list[i]) img.src = u;
  }
  const paintUndo = () => { el.querySelector('[data-v=undo]').disabled = !canUndo(); };
  window.addEventListener('ref-undo', paintUndo);
  function close() {
    window.removeEventListener('ref-undo', paintUndo);
    el.remove();
    if (changed) onChange?.();
  }
  // After something changed under this photo: it may have gone or come back.
  function again() {
    changed = true;
    list = list.filter((x) => photoById(x));
    if (!list.length) return close();
    i = Math.min(i, list.length - 1);
    show();
  }
  el.querySelector('.v-palette').addEventListener('click', (e) => {
    const b = e.target.closest('[data-color]');
    if (b) openColorPage(b.dataset.color, again);
  });
  el.querySelector('[data-close]').addEventListener('click', () => close());
  // What Ref found: tap one to take it away, Add for one more.
  el.querySelector('.v-found').addEventListener('click', async (e) => {
    const p = photoById(list[i]);
    if (!p) return;
    const now = p.tags || [];
    let next = null;
    const gone = e.target.closest('[data-untag]');
    if (gone) next = now.filter((t) => t !== gone.dataset.untag);
    else if (e.target.closest('[data-addtag]')) {
      const word = (await promptSheet({ title: 'What is in it', label: 'A word for something in the photo', confirmLabel: 'Add' }))?.trim().toLowerCase();
      if (word && !now.includes(word)) next = [...now, word];
    }
    if (!next) return;
    try { await relabel(p, next); changed = true; show(); }
    catch (err) { console.error(err); toast('Could not save that. Try once more.'); }
  });
  const go = (d) => { const n = i + d; if (n >= 0 && n < list.length) { i = n; show(); } else { place(); } };

  el.querySelector('.v-tools').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-v]');
    if (!b) return;
    const p = photoById(list[i]);
    if (b.dataset.v === 'undo') {
      const gone = list[i];
      await undoLast();
      changed = true;
      if (photoById(gone)) show(); else again();
    } else if (b.dataset.v === 'fav') {
      try { await changePhotos([p], () => ({ favorite: !p.favorite }), 'favorite'); changed = true; show(); }
      catch (err) { console.error(err); toast('Could not save that. Try once more.'); }
    } else if (b.dataset.v === 'file') {
      if (await fileSheet([p.id])) { changed = true; show(); }
    } else if (b.dataset.v === 'delete') {
      const ok = await confirmSheet({ title: 'Delete this photo?', message: 'It leaves this notebook and any boards it\'s on. Ref Notebook keeps its own copy, so if it\'s no longer on your phone, this is the last one.', confirmLabel: 'Delete', danger: true });
      if (!ok) return;
      const kept = await db.keepForUndo([p.id]);
      await db.deletePhotos([p.id]);
      await refresh(); changed = true;
      remember('deleting', () => db.putBack(kept));
      list.splice(i, 1);
      if (!list.length) return close();
      i = Math.min(i, list.length - 1);
      show();
    }
  });

  const pts = new Map();
  let start0 = null, pinch = null, lastTap = 0;
  const clampPan = () => {
    const r = stage.getBoundingClientRect();
    const mx = (r.width * (scale - 1)) / 2, my = (r.height * (scale - 1)) / 2;
    tx = clamp(tx, -mx, mx); ty = clamp(ty, -my, my);
  };
  stage.addEventListener('pointerdown', (e) => {
    try { stage.setPointerCapture(e.pointerId); } catch {}
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 1) start0 = { x: e.clientX, y: e.clientY, tx, ty, t: performance.now() };
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), scale };
    }
  });
  stage.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2 && pinch) {
      const [a, b] = [...pts.values()];
      scale = clamp((pinch.scale * Math.hypot(a[0] - b[0], a[1] - b[1])) / pinch.d, 1, 6);
      clampPan(); place();
    } else if (pts.size === 1 && start0) {
      const dx = e.clientX - start0.x, dy = e.clientY - start0.y;
      if (scale > 1) { tx = start0.tx + dx; ty = start0.ty + dy; clampPan(); place(); } else place(dx);
    }
  });
  const up = (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (pts.size) { pinch = null; start0 = null; return; }
    if (!start0) { if (scale <= 1) { scale = 1; tx = ty = 0; place(); } return; }
    const dx = e.clientX - start0.x, dy = e.clientY - start0.y;
    const still = Math.hypot(dx, dy) < 10;
    if (still) {
      const now = performance.now();
      if (now - lastTap < 300) { scale = scale > 1 ? 1 : 2.5; tx = ty = 0; place(); lastTap = 0; } else lastTap = now;
    } else if (scale === 1) {
      if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); else place();
    }
    start0 = null;
  };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);
  const key = (e) => {
    if (!el.isConnected) return document.removeEventListener('keydown', key);
    if (sheetIsOpen() || [...document.querySelectorAll('.viewer')].pop() !== el) return;
    if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', key);
  show();
  return { close };
}

// Every photo with this color. The arrow goes back to the photo you came from.
function openColorPage(hex, onBack) {
  const el = document.createElement('div');
  el.className = 'viewer color-page';
  let list = [];
  const draw = () => {
    list = photosOfColor(hex);
    el.innerHTML = `
      <header class="band band-short">
        <button type="button" class="ring-btn" data-back aria-label="Back to the photo"><span>${BACK}</span></button>
        <p class="band-line"><span class="color-swatch" style="background:${esc(hex)}"></span><b class="count">${list.length} ${list.length === 1 ? 'photo' : 'photos'}</b></p>
        <span class="ring-btn" aria-hidden="true"></span>
      </header>
      <div class="scroll"><div class="grid">
        ${list.map((p, n) => `<button type="button" class="tile" data-i="${n}" aria-label="${esc(p.name)}"><img src="${thumbUrl(p)}" alt="" decoding="async" draggable="false" /></button>`).join('')}
      </div></div>`;
  };
  draw();
  document.body.append(el);
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-back]')) { el.remove(); onBack(); return; }
    const t = e.target.closest('[data-i]');
    if (t) openViewer(list.map((p) => p.id), +t.dataset.i, draw);
  });
}
