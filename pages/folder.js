// One folder (tag): its photos, sorted and filtered, with picking, filing
// and sending them on.
import * as db from '../data/db.js';
import { refresh, thumbUrl, photoById, photosIn, folderById, isSpecial, SORTS, sortOf, setSort, sortList, chipsFor, matches } from '../data/library.js';
import { importFiles, pickFiles } from '../data/photos.js';
import { fileSheet, changePhotos } from '../components/filing.js';
import { remember, canUndo, undoLast } from '../components/undo.js';
import { scan, turnOnTags, carryOn } from '../data/tagger.js';
import { openViewer } from './viewer.js';
import { choiceSheet, confirmSheet, promptSheet } from '../components/dialogs.js';
import { toast } from '../components/toast.js';
import { ICONS } from '../components/icons.js';
import { esc, isIOS, isStandalone } from '../components/util.js';
import { shortBandHtml } from '../components/band.js';

const SORT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="4" y1="7" x2="20" y2="7"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="10" y1="17" x2="14" y2="17"/></svg>';
const TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="5 12.5 10 17 19 7"/></svg>';

const filterMemory = {}; // per folder, for this visit
let stopListening = null; // the folder on screen listens for tags arriving

export function folderScreen(view, id) {
  const folder = folderById(id);
  if (!folder) { location.hash = '#/folders'; return; }
  const incoming = id === 'incoming';
  let selecting = false;
  let current = [];
  const sel = new Set();
  const on = () => (filterMemory[id] ||= []);
  const shown = () => sortList(photosIn(id).filter((p) => matches(p, on())), sortOf(id));

  async function bringIn(files) {
    if (!files.length) return;
    try { await navigator.storage?.persist?.(); } catch {}
    const r = await importFiles(files, (n, total) => toast(`Bringing in ${n} of ${total}`, { ms: 60000 }));
    await refresh();
    toast(r.failed.length ? `${r.photos.length} added, ${r.failed.length} could not be read` : `${r.photos.length} ${r.photos.length === 1 ? 'photo' : 'photos'} added`);
    draw();
    carryOn();
  }
  const openPhone = () => pickFiles().then(bringIn); // straight from the tap, or iOS blocks it

  // The filters; tap one again to let it go (round 2 has no All chip).
  const chipsHtml = () => chipsFor(photosIn(id), on(), id)
    .map((c) => `<button type="button" class="chip kind-${c.kind}${on().includes(c.key) ? ' on' : ''}" data-filter="${esc(c.key)}">${esc(c.label)}</button>`).join('');
  const gridHtml = () => {
    const total = photosIn(id).length;
    if (!total && incoming) return `
      <button type="button" class="open-phone" data-phone>
        <span class="big-plus">${ICONS.plus}</span>
        <span class="big-words">Open your phone's photos</span>
        <span class="row-meta">Pick the ones you want to use. They wait here until you file them.</span>
      </button>
      ${isIOS() && !isStandalone() ? '<p class="note">Add this to your Home Screen to keep your photos safe. Safari can clear what sites have saved if they go unused.</p>' : ''}`;
    if (!total) return `<p class="note center">${id === 'favorites' ? 'Tap the heart on a photo to keep it here.' : 'Nothing here yet. File photos in from Incoming.'}</p>`;
    return `<div class="grid">
      ${incoming && !selecting ? `<button type="button" class="tile add" data-phone aria-label="Add from your phone">${ICONS.plus}<span>Add from<br />your phone</span></button>` : ''}
      ${current.map((p, i) => `<button type="button" class="tile${sel.has(p.id) ? ' sel' : ''}" data-i="${i}" aria-label="${esc(p.name)}"><img src="${thumbUrl(p)}" alt="" decoding="async" draggable="false" />${p.favorite ? `<span class="fav">${ICONS.heartOn}</span>` : ''}${selecting ? `<span class="tile-tick">${TICK}</span>` : ''}</button>`).join('')}
    </div>`;
  };
  // 14 photos · Newest added, or 3 of 14 photos · Newest added while filtered.
  const countText = () => {
    const total = photosIn(id).length;
    const sort = SORTS.find((s) => s.key === sortOf(id)).label;
    return `${current.length === total ? '' : `${current.length} of `}${total} ${total === 1 ? 'photo' : 'photos'} · ${sort}`;
  };
  const scanHtml = () => {
    if (!photosIn(id).length) return '';
    if (scan.state === 'failed') return '<button type="button" class="scan-btn" data-scan>This phone couldn\'t read them. Try again</button>';
    const line = (pct, words) => `<p class="scan-line"><span class="scan-bar" aria-hidden="true"><span style="width:${Math.max(0, Math.min(100, pct))}%"></span></span>${words}</p>`;
    if (scan.state === 'loading') return line(scan.pct, `Getting ready, ${scan.pct}%`);
    if (scan.state === 'working') return line(scan.total ? (scan.done / scan.total) * 100 : 0, `Looking at your photos, ${scan.done} of ${scan.total}`);
    return '';
  };
  // Just the filters and the photos, so nothing else on the page moves.
  function paintList() {
    current = shown();
    const chips = view.querySelector('.chips');
    if (chips) { const x = chips.scrollLeft; chips.innerHTML = chipsHtml(); chips.scrollLeft = x; }
    const scroll = view.querySelector('.scroll');
    if (scroll) { const y = scroll.scrollTop; scroll.innerHTML = gridHtml(); scroll.scrollTop = y; }
    const count = view.querySelector('.count');
    if (count) count.textContent = countText();
  }
  const paintScan = () => { const el = view.querySelector('.scan'); if (el) { el.innerHTML = scanHtml(); el.hidden = !el.innerHTML; } };
  const paintUndo = () => { const b = view.querySelector('[data-undo]'); if (b) b.disabled = !canUndo(); };

  function draw() {
    const oldScroll = view.querySelector('.scroll')?.scrollTop || 0;
    const oldChips = view.querySelector('.chips')?.scrollLeft || 0;
    const stay = view.querySelector('.screen')?.dataset.folder === id;
    current = shown();
    const empty = !photosIn(id).length;
    view.innerHTML = `
      <div class="screen in-tag${stay ? ' still' : ''}" data-folder="${esc(id)}">
        ${shortBandHtml({ name: folder.name, back: '#/folders', backLabel: 'Back to tags', more: isSpecial(id) ? '' : 'Tag options' })}
        ${empty ? '' : `
          <div class="bar">
            <span class="count">${countText()}</span>
            <span class="bar-btns">
              <button type="button" class="bar-icon" data-sort aria-label="Sort">${SORT_ICON}</button>
              <button type="button" class="bar-icon" data-undo aria-label="Undo"${canUndo() ? '' : ' disabled'}>${ICONS.undo}</button>
              <button type="button" class="bar-text" data-select>${selecting ? 'Done' : 'Select'}</button>
            </span>
          </div>
          <div class="chips">${chipsHtml()}</div>`}
        <div class="scan"${scanHtml() ? '' : ' hidden'}>${scanHtml()}</div>
        <div class="scroll photos">${gridHtml()}</div>
        ${selecting ? `
          <nav class="tools" aria-label="Selection">
            <span class="sel-count">${sel.size} picked</span>
            <button type="button" class="tool" data-act="file"${sel.size ? '' : ' disabled'}>${ICONS.file}<span>Tag</span></button>
            <button type="button" class="tool" data-act="fav"${sel.size ? '' : ' disabled'}>${ICONS.heart}<span>Favorite</span></button>
            <button type="button" class="tool" data-act="delete"${sel.size ? '' : ' disabled'}>${ICONS.trash}<span>Delete</span></button>
          </nav>` : ''}
      </div>`;
    const sc = view.querySelector('.scroll'); if (sc) sc.scrollTop = oldScroll;
    const ch = view.querySelector('.chips'); if (ch) ch.scrollLeft = oldChips;
    wire();
  }

  function wire() {
    view.querySelector('[data-select]')?.addEventListener('click', () => { selecting = !selecting; sel.clear(); draw(); });
    view.querySelector('[data-undo]')?.addEventListener('click', async () => { await undoLast(); draw(); });
    view.querySelector('[data-sort]')?.addEventListener('click', async () => {
      const key = await choiceSheet({ title: 'Sort by', options: SORTS.map((s) => ({ key: s.key, label: s.label, current: s.key === sortOf(id) })) });
      if (key) { setSort(id, key); paintList(); }
    });
    view.querySelector('.chips')?.addEventListener('click', (e) => {
      const b = e.target.closest('[data-filter]');
      if (!b) return;
      const k = b.dataset.filter;
      if (!k) filterMemory[id] = [];
      else filterMemory[id] = on().includes(k) ? on().filter((x) => x !== k) : [...on(), k];
      paintList();
    });
    view.querySelector('.scan')?.addEventListener('click', (e) => { if (e.target.closest('[data-scan]')) turnOnTags(); });
    view.querySelector('.scroll')?.addEventListener('click', (e) => {
      if (e.target.closest('[data-phone]')) { openPhone(); return; }
      const t = e.target.closest('[data-i]');
      if (!t) return;
      const p = current[+t.dataset.i];
      if (selecting) {
        if (sel.has(p.id)) sel.delete(p.id); else sel.add(p.id);
        t.classList.toggle('sel', sel.has(p.id));
        view.querySelector('.sel-count').textContent = `${sel.size} picked`;
        view.querySelectorAll('[data-act]').forEach((b) => { b.disabled = !sel.size; });
      } else openViewer(current.map((x) => x.id), +t.dataset.i, draw);
    });
    view.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', async () => {
      const ids = [...sel];
      try {
        if (b.dataset.act === 'file') {
          if (!(await fileSheet(ids))) return;
        } else if (b.dataset.act === 'fav') {
          const turnOn = !ids.every((x) => photoById(x).favorite);
          await changePhotos(ids.map(photoById), () => ({ favorite: turnOn }), 'favorites');
        } else {
          const ok = await confirmSheet({ title: `Delete ${ids.length} ${ids.length === 1 ? 'photo' : 'photos'}?`, message: 'They leave this notebook and any boards they\'re on. Ref Notebook keeps its own copies, so any that are no longer on your phone will be gone for good.', confirmLabel: 'Delete', danger: true });
          if (!ok) return;
          const kept = await db.keepForUndo(ids);
          await db.deletePhotos(ids);
          await refresh();
          remember('deleting', () => db.putBack(kept));
        }
      } catch (err) {
        console.error(err);
        toast('Could not save that. Try once more.');
        return;
      }
      selecting = false; sel.clear(); draw();
    }));
    view.querySelector('[data-band-more]')?.addEventListener('click', async () => {
      const key = await choiceSheet({ title: folder.name, options: [{ key: 'rename', label: 'Rename' }, { key: 'delete', label: 'Delete tag', danger: true }] });
      if (key === 'rename') {
        const name = await promptSheet({ title: 'Rename tag', value: folder.name });
        if (name) { await db.saveFolder({ ...folder, name }); await refresh(); folder.name = name; draw(); }
      } else if (key === 'delete') {
        if (await confirmSheet({ title: 'Delete this tag?', message: `<b>${esc(folder.name)}</b> will be gone. Its photos stay in the notebook.`, confirmLabel: 'Delete', danger: true })) {
          const had = photosIn(id).map((p) => p.id);
          const copy = { ...folder };
          await db.deleteFolder(id);
          await refresh();
          remember('deleting a tag', () => db.restoreFolder(copy, had));
          location.hash = '#/folders';
          toast('Tag deleted', { action: { label: 'Undo', run: () => undoLast().then(() => { location.hash = `#/folder/${encodeURIComponent(id)}`; }) } });
        }
      }
    });
  }
  stopListening?.();
  const onScan = (e) => { paintScan(); if (e.detail?.tagged && !selecting) paintList(); };
  window.addEventListener('ref-scan', onScan);
  window.addEventListener('ref-undo', paintUndo);
  stopListening = () => { window.removeEventListener('ref-scan', onScan); window.removeEventListener('ref-undo', paintUndo); };
  draw();
}
