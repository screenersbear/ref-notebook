// The list screens: Mood boards, Folders, and a single folder.
import * as db from './db.js';
import { lib, refresh, thumbUrl, photoById, photosIn, folderById, isSpecial, SORTS, sortOf, setSort, sortList, chipsFor, matches } from './library.js';
import { importFiles, pickFiles } from './photos.js';
import { fileSheet, newFolder, changePhotos } from './filing.js';
import { remember, canUndo, undoLast } from './undo.js';
import { scan, turnOnTags, carryOn } from './tagger.js';
import { openViewer } from './viewer.js';
import { sendToShoot, boardShoots, keepUp } from './sendshoot.js';
import { choiceSheet, confirmSheet, promptSheet, toast } from './ui.js';
import { ICONS } from './icons.js';
import { esc, shortDate, isIOS, isStandalone } from './util.js';

// ---------- Boards ----------
// Every mood board on one page that scrolls.
export async function boardsScreen(view) {
  const boards = await db.listBoards();
  const onShoots = await boardShoots().catch(() => ({})); // inside Documenting Fictions: the shoots each board was sent to
  const firstPhoto = (b) => b.pages.flatMap((p) => p.images).map((im) => im && photoById(im.id)).find(Boolean);
  view.innerHTML = `
    <div class="screen">
      <h1 class="head">Mood boards</h1>
      <div class="scroll rows">
        ${boards.map((b) => { const p = firstPhoto(b); return `
          <div class="row" data-b>
            <a class="row-open" href="#/board/${esc(b.id)}">
              <span class="thumb">${p ? `<img src="${thumbUrl(p)}" alt="" />` : ''}</span>
              <span class="row-text"><span class="row-name">${esc(b.name)}</span><span class="row-meta">${b.pages.length} ${b.pages.length === 1 ? 'page' : 'pages'}, ${esc(shortDate(b.updatedAt))}</span>${onShoots[b.id] ? `<span class="row-meta row-shoots">For ${esc(onShoots[b.id].join(', '))}</span>` : ''}</span>
            </a>
            <button type="button" class="icon-btn" data-more="${esc(b.id)}" aria-label="More for ${esc(b.name)}">${ICONS.more}</button>
          </div>`; }).join('')}
        <a class="row row-open" href="#/new"><span class="thumb add">${ICONS.plus}</span><span class="row-name">New board</span></a>
        ${!lib.photos.length ? '<p class="note">Start in <a href="#/folder/incoming">Incoming</a>: bring in the photos you want to work with, then make a board from them.</p>' : ''}
      </div>
    </div>`;
  view.querySelectorAll('[data-more]').forEach((btn) => btn.addEventListener('click', async () => {
    const b = boards.find((x) => x.id === btn.dataset.more);
    const key = await choiceSheet({ title: b.name, options: [{ key: 'send', label: 'Send to shoot' }, { key: 'rename', label: 'Rename' }, { key: 'delete', label: 'Delete', danger: true }] });
    if (key === 'send') {
      await sendToShoot(b);
      if ((location.hash || '') === '#/boards') boardsScreen(view);
    } else if (key === 'rename') {
      const name = await promptSheet({ title: 'Rename board', value: b.name });
      if (name) { await db.saveBoard({ ...b, name }); boardsScreen(view); keepUp(b.id); }
    } else if (key === 'delete') {
      if (await confirmSheet({ title: 'Delete this board?', message: `<b>${esc(b.name)}</b> will be gone. Its photos stay in the notebook.`, confirmLabel: 'Delete', danger: true })) {
        await db.deleteBoard(b.id);
        boardsScreen(view);
        const back = async () => { await db.saveBoard(b); };
        remember('deleting a board', back);
        toast('Board deleted', { action: { label: 'Undo', run: () => undoLast().then(() => boardsScreen(view)) } });
      }
    }
  }));
}

// ---------- Folders (Tags) ----------
// Tags come a notebook page at a time too; swipe to the next one.
export function foldersScreen(view) {
  const row = (f, cls = '') => {
    const list = sortList(photosIn(f.id), 'newest');
    return `
      <a class="row row-open ${cls}" href="#/folder/${esc(f.id)}" data-t data-name="${esc(f.name.toLowerCase())}">
        <span class="thumb">${list[0] ? `<img src="${thumbUrl(list[0])}" alt="" loading="lazy" />` : ''}</span>
        <span class="row-text"><span class="row-name">${esc(f.name)}</span><span class="row-meta">${list.length} ${list.length === 1 ? 'photo' : 'photos'}</span></span>
      </a>`;
  };
  view.innerHTML = `
    <div class="screen">
      <h1 class="head head-add">Tags<button type="button" class="icon-btn head-plus" data-new aria-label="New tag">${ICONS.plus}</button></h1>
      <div class="scroll rows tag-rows">
        ${lib.folders.length > 8 ? '<input class="find" type="search" placeholder="Find a tag" autocomplete="off" />' : ''}
        ${row(folderById('incoming'), 'marked')}
        ${row(folderById('favorites'))}
        ${row(folderById('all'))}
        ${lib.folders.map((f) => row(f, 'mine')).join('')}
      </div>
    </div>`;
  const rows = [...view.querySelectorAll('[data-t]')];
  view.querySelector('[data-new]').addEventListener('click', async () => { if (await newFolder()) foldersScreen(view); });
  // Finding shows only the tags that match.
  view.querySelector('.find')?.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    rows.forEach((r) => { r.hidden = !!q && !r.dataset.name.includes(q); });
  });
}

// ---------- One folder ----------
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

  const chipsHtml = () => {
    const chips = chipsFor(photosIn(id), on(), id);
    return `<button type="button" class="chip${on().length ? '' : ' on'}" data-filter="">All</button>${chips.map((c) => `<button type="button" class="chip kind-${c.kind}${on().includes(c.key) ? ' on' : ''}" data-filter="${esc(c.key)}">${esc(c.label)}</button>`).join('')}`;
  };
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
      ${incoming && !selecting ? `<button type="button" class="tile add" data-phone aria-label="Add from your phone">${ICONS.plus}</button>` : ''}
      ${current.map((p, i) => `<button type="button" class="tile${sel.has(p.id) ? ' sel' : ''}" data-i="${i}" aria-label="${esc(p.name)}"><img src="${thumbUrl(p)}" alt="" decoding="async" draggable="false" />${p.favorite ? `<span class="fav">${ICONS.heartOn}</span>` : ''}</button>`).join('')}
    </div>`;
  };
  const countText = () => { const total = photosIn(id).length; return current.length === total ? `${total}` : `${current.length} of ${total}`; };
  const scanHtml = () => {
    if (!photosIn(id).length) return '';
    if (scan.state === 'failed') return '<button type="button" class="scan-btn" data-scan>This phone couldn\'t read them. Try again</button>';
    if (scan.state === 'loading') return `<span class="scan-text">Getting ready, ${scan.pct}%</span>`;
    if (scan.state === 'working') return `<span class="scan-text">Looking at your photos, ${scan.done} of ${scan.total}</span>`;
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
    const sortLabel = SORTS.find((s) => s.key === sortOf(id)).label;
    view.innerHTML = `
      <div class="screen${stay ? ' still' : ''}" data-folder="${esc(id)}">
        <header class="folder-head">
          <a class="icon-btn" href="#/folders" aria-label="Back to tags">${ICONS.back}</a>
          <h1><span class="under">${esc(folder.name)}</span></h1>
          ${isSpecial(id) ? '<span class="icon-btn" aria-hidden="true"></span>' : `<button type="button" class="icon-btn" data-folder-more aria-label="Folder options">${ICONS.more}</button>`}
        </header>
        ${empty ? '' : `
          <div class="bar">
            <button type="button" class="label-btn" data-sort>${esc(sortLabel)}</button>
            <button type="button" class="label-btn" data-select>${selecting ? 'Done' : 'Select'}</button>
            <button type="button" class="undo-btn" data-undo aria-label="Undo"${canUndo() ? '' : ' disabled'}>${ICONS.undo}</button>
            <span class="count">${countText()}</span>
          </div>
          <div class="chips">${chipsHtml()}</div>`}
        <div class="scan"${scanHtml() ? '' : ' hidden'}>${scanHtml()}</div>
        <div class="scroll">${gridHtml()}</div>
        ${selecting ? `
          <nav class="tools" aria-label="Selection">
            <span class="sel-count">${sel.size} picked</span>
            <button type="button" class="tool" data-act="file" aria-label="Tag these"${sel.size ? '' : ' disabled'}>${ICONS.file}</button>
            <button type="button" class="tool" data-act="fav" aria-label="Favorite"${sel.size ? '' : ' disabled'}>${ICONS.heart}</button>
            <button type="button" class="tool" data-act="delete" aria-label="Delete"${sel.size ? '' : ' disabled'}>${ICONS.trash}</button>
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
    view.querySelector('[data-folder-more]')?.addEventListener('click', async () => {
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
