// The list screens: Table of contents (boards), Folders, and a single folder.
import * as db from './db.js';
import { lib, refresh, thumbUrl, photoById, photosIn, folderById, isSpecial, SORTS, FILTERS, sortOf, setSort, sortList } from './library.js';
import { importFiles, pickFiles } from './photos.js';
import { fileSheet, newFolder } from './filing.js';
import { openViewer } from './viewer.js';
import { choiceSheet, confirmSheet, promptSheet, toast } from './ui.js';
import { ICONS } from './icons.js';
import { esc, shortDate, isIOS, isStandalone } from './util.js';

export const nav = (active) => `
  <nav class="tools" aria-label="Sections">
    <a href="#/boards" class="tool${active === 'boards' ? ' on' : ''}" aria-label="Boards">${ICONS.boards}</a>
    <a href="#/folders" class="tool${active === 'folders' ? ' on' : ''}" aria-label="Folders">${ICONS.folders}</a>
    <a href="#/" class="tool" aria-label="Close the notebook">${ICONS.sun}</a>
  </nav>`;

// ---------- Boards ----------
export async function boardsScreen(view) {
  const boards = await db.listBoards();
  const firstPhoto = (b) => b.pages.flatMap((p) => p.images).map((im) => im && photoById(im.id)).find(Boolean);
  view.innerHTML = `
    <div class="screen">
      <h1 class="head">Table of contents</h1>
      <div class="scroll rows">
        ${boards.map((b) => { const p = firstPhoto(b); return `
          <div class="row">
            <a class="row-open" href="#/board/${esc(b.id)}">
              <span class="thumb">${p ? `<img src="${thumbUrl(p)}" alt="" />` : ''}</span>
              <span class="row-text"><span class="row-name">${esc(b.name)}</span><span class="row-meta">${b.pages.length} ${b.pages.length === 1 ? 'page' : 'pages'}, ${esc(shortDate(b.updatedAt))}</span></span>
            </a>
            <button type="button" class="icon-btn" data-more="${esc(b.id)}" aria-label="More for ${esc(b.name)}">${ICONS.more}</button>
          </div>`; }).join('')}
        <a class="row row-open" href="#/new"><span class="thumb add">${ICONS.plus}</span><span class="row-name">New board</span></a>
        ${!lib.photos.length ? '<p class="note">Start in <a href="#/folder/incoming">Incoming</a>: bring in the photos you want to work with, then make a board from them.</p>' : ''}
      </div>
      ${nav('boards')}
    </div>`;
  view.querySelectorAll('[data-more]').forEach((btn) => btn.addEventListener('click', async () => {
    const b = boards.find((x) => x.id === btn.dataset.more);
    const key = await choiceSheet({ title: b.name, options: [{ key: 'rename', label: 'Rename' }, { key: 'delete', label: 'Delete', danger: true }] });
    if (key === 'rename') {
      const name = await promptSheet({ title: 'Rename board', value: b.name });
      if (name) { await db.saveBoard({ ...b, name }); boardsScreen(view); }
    } else if (key === 'delete') {
      if (await confirmSheet({ title: 'Delete this board?', message: `<b>${esc(b.name)}</b> will be gone. Its photos stay in your folders.`, confirmLabel: 'Delete', danger: true })) {
        await db.deleteBoard(b.id);
        boardsScreen(view);
      }
    }
  }));
}

// ---------- Folders ----------
export function foldersScreen(view) {
  const row = (f, cls = '') => {
    const list = sortList(photosIn(f.id), 'newest');
    return `
      <a class="row row-open ${cls}" href="#/folder/${esc(f.id)}" data-name="${esc(f.name.toLowerCase())}">
        <span class="thumb">${list[0] ? `<img src="${thumbUrl(list[0])}" alt="" loading="lazy" />` : ''}</span>
        <span class="row-text"><span class="row-name">${esc(f.name)}</span><span class="row-meta">${list.length} ${list.length === 1 ? 'photo' : 'photos'}</span></span>
      </a>`;
  };
  view.innerHTML = `
    <div class="screen">
      <h1 class="head">Folders</h1>
      <div class="scroll rows">
        ${row(folderById('incoming'), 'marked')}
        ${row(folderById('favorites'))}
        ${row(folderById('all'))}
        ${lib.folders.length > 8 ? '<input class="find" type="search" placeholder="Find a folder" autocomplete="off" />' : ''}
        ${lib.folders.map((f) => row(f, 'mine')).join('')}
        <button type="button" class="row row-open" data-new><span class="thumb add">${ICONS.plus}</span><span class="row-name">New folder</span></button>
      </div>
      ${nav('folders')}
    </div>`;
  view.querySelector('[data-new]').addEventListener('click', async () => { if (await newFolder()) foldersScreen(view); });
  view.querySelector('.find')?.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    view.querySelectorAll('.row.mine').forEach((r) => { r.hidden = !r.dataset.name.includes(q); });
  });
}

// ---------- One folder ----------
const filterMemory = {}; // per folder, for this visit

export function folderScreen(view, id) {
  const folder = folderById(id);
  if (!folder) { location.hash = '#/folders'; return; }
  const incoming = id === 'incoming';
  let selecting = false;
  const sel = new Set();
  const shown = () => {
    const f = FILTERS.find((x) => x.key === (filterMemory[id] || 'all'));
    return sortList(photosIn(id).filter(f.test), sortOf(id));
  };

  async function bringIn(files) {
    if (!files.length) return;
    try { await navigator.storage?.persist?.(); } catch {}
    const r = await importFiles(files, (n, total) => toast(`Bringing in ${n} of ${total}`, { ms: 60000 }));
    await refresh();
    toast(r.failed.length ? `${r.photos.length} added, ${r.failed.length} could not be read` : `${r.photos.length} ${r.photos.length === 1 ? 'photo' : 'photos'} added`);
    draw();
  }
  const openPhone = () => pickFiles().then(bringIn); // straight from the tap, or iOS blocks it

  function draw() {
    const list = shown();
    const total = photosIn(id).length;
    const sortLabel = SORTS.find((s) => s.key === sortOf(id)).label;
    const empty = !total;
    view.innerHTML = `
      <div class="screen">
        <header class="folder-head">
          <a class="icon-btn" href="#/folders" aria-label="Back to folders">${ICONS.back}</a>
          <h1 class="hand"><span class="under">${esc(folder.name)}</span></h1>
          ${isSpecial(id) ? '<span class="icon-btn" aria-hidden="true"></span>' : `<button type="button" class="icon-btn" data-folder-more aria-label="Folder options">${ICONS.more}</button>`}
        </header>
        ${empty ? '' : `
          <div class="bar">
            <button type="button" class="label-btn" data-sort>${esc(sortLabel)}</button>
            <button type="button" class="label-btn" data-select>${selecting ? 'Done' : 'Select'}</button>
            <span class="count">${list.length === total ? total : `${list.length} of ${total}`}</span>
          </div>
          <div class="chips">${FILTERS.map((f) => `<button type="button" class="chip${(filterMemory[id] || 'all') === f.key ? ' on' : ''}" data-filter="${f.key}">${esc(f.label)}</button>`).join('')}</div>`}
        <div class="scroll">
          ${empty && incoming ? `
            <button type="button" class="open-phone" data-phone>
              <span class="big-plus">${ICONS.plus}</span>
              <span class="hand">Open your phone's photos</span>
              <span class="row-meta">Pick the ones you want to use. They wait here until you file them.</span>
            </button>
            ${isIOS() && !isStandalone() ? '<p class="note">Add this to your Home Screen to keep your photos safe. Safari can clear what sites have saved if they go unused.</p>' : ''}`
            : empty ? `<p class="note center">${id === 'favorites' ? 'Tap the heart on a photo to keep it here.' : 'Nothing here yet. File photos in from Incoming.'}</p>`
            : `<div class="grid">
                ${incoming && !selecting ? `<button type="button" class="tile add" data-phone aria-label="Add from your phone">${ICONS.plus}</button>` : ''}
                ${list.map((p, i) => `<button type="button" class="tile${sel.has(p.id) ? ' sel' : ''}" data-i="${i}" aria-label="${esc(p.name)}"><img src="${thumbUrl(p)}" alt="" loading="lazy" draggable="false" />${p.favorite ? `<span class="fav">${ICONS.heartOn}</span>` : ''}</button>`).join('')}
              </div>`}
        </div>
        ${selecting ? `
          <nav class="tools" aria-label="Selection">
            <span class="sel-count">${sel.size} picked</span>
            <button type="button" class="tool" data-act="file" aria-label="File in a folder"${sel.size ? '' : ' disabled'}>${ICONS.file}</button>
            <button type="button" class="tool" data-act="fav" aria-label="Favorite"${sel.size ? '' : ' disabled'}>${ICONS.heart}</button>
            <button type="button" class="tool" data-act="delete" aria-label="Delete"${sel.size ? '' : ' disabled'}>${ICONS.trash}</button>
          </nav>` : nav('folders')}
      </div>`;
    wire(list);
  }

  function wire(list) {
    view.querySelectorAll('[data-phone]').forEach((b) => b.addEventListener('click', openPhone));
    view.querySelector('[data-select]')?.addEventListener('click', () => { selecting = !selecting; sel.clear(); draw(); });
    view.querySelector('[data-sort]')?.addEventListener('click', async () => {
      const key = await choiceSheet({ title: 'Sort by', options: SORTS.map((s) => ({ key: s.key, label: s.label, current: s.key === sortOf(id) })) });
      if (key) { setSort(id, key); draw(); }
    });
    view.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => { filterMemory[id] = b.dataset.filter; draw(); }));
    view.querySelector('.grid')?.addEventListener('click', (e) => {
      const t = e.target.closest('[data-i]');
      if (!t) return;
      const p = list[+t.dataset.i];
      if (selecting) {
        if (sel.has(p.id)) sel.delete(p.id); else sel.add(p.id);
        t.classList.toggle('sel', sel.has(p.id));
        view.querySelector('.sel-count').textContent = `${sel.size} picked`;
        view.querySelectorAll('[data-act]').forEach((b) => { b.disabled = !sel.size; });
      } else openViewer(list.map((x) => x.id), +t.dataset.i, draw);
    });
    view.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', async () => {
      const ids = [...sel];
      if (b.dataset.act === 'file') {
        if (!(await fileSheet(ids))) return;
      } else if (b.dataset.act === 'fav') {
        const on = !ids.every((x) => photoById(x).favorite);
        await db.savePhotos(ids.map((x) => ({ ...photoById(x), favorite: on })));
        await refresh();
      } else {
        const ok = await confirmSheet({ title: `Delete ${ids.length} ${ids.length === 1 ? 'photo' : 'photos'}?`, message: 'They leave this notebook and any boards they\'re on. The ones on your phone stay.', confirmLabel: 'Delete', danger: true });
        if (!ok) return;
        await db.deletePhotos(ids);
        await refresh();
      }
      selecting = false; sel.clear(); draw();
    }));
    view.querySelector('[data-folder-more]')?.addEventListener('click', async () => {
      const key = await choiceSheet({ title: folder.name, options: [{ key: 'rename', label: 'Rename' }, { key: 'delete', label: 'Delete folder', danger: true }] });
      if (key === 'rename') {
        const name = await promptSheet({ title: 'Rename folder', value: folder.name });
        if (name) { await db.saveFolder({ ...folder, name }); await refresh(); folder.name = name; draw(); }
      } else if (key === 'delete') {
        if (await confirmSheet({ title: 'Delete this folder?', message: `<b>${esc(folder.name)}</b> will be gone. Its photos stay in the notebook.`, confirmLabel: 'Delete', danger: true })) {
          await db.deleteFolder(id);
          await refresh();
          location.hash = '#/folders';
        }
      }
    });
  }
  draw();
}
