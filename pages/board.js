// A board's pages: swipe to turn, tap a spot, pull a photo in from the tray.
// This file draws the board and its tray; touching the page, the text boxes
// and the tools bar's sheets are in the board-*.js files beside it.
import * as db from '../data/db.js';
import { showBoard } from './showboard.js';
import { lib, photosIn, thumbUrl, sortList, SPECIAL } from '../data/library.js';
import { SHAPES } from '../data/templates.js';
import { renderPage, pageTemplate } from '../components/board-page.js';
import { keepUp } from '../data/sendshoot.js';
import { promptSheet } from '../components/dialogs.js';
import { toast } from '../components/toast.js';
import { ICONS } from '../components/icons.js';
import { shortBandHtml, FULL } from '../components/band.js';
import { esc, clamp, debounce } from '../components/util.js';
import { addTouch } from './board-touch.js';
import { addTools } from './board-tools.js';
import { addTextBoxes } from './board-text.js';

export async function boardScreen(view, id) {
  const ed = { view }; // what this screen's parts share (see the files it adds)
  Object.assign(ed, { drawPage, drawTray, goTo });
  let board = await db.getBoard(id); ed.board = board;
  if (!board) { location.hash = '#/boards'; return () => {}; }
  ed.at = 0; ed.sel = -1; let tray = 'all'; let destroyed = false; let drawToken = 0;
  ed.tsel = null; ed.panel = null; ed.lastTap = null; // the text box picked ('main' or a note's index), its menu
  const undo = []; ed.undo = undo;
  const persist = debounce(() => db.saveBoard(board).then((b) => { board.updatedAt = b.updatedAt; }), 300); ed.persist = persist;
  const snapshot = () => { undo.push(JSON.stringify(board.pages)); if (undo.length > 40) undo.shift(); paintUndo(); }; ed.snapshot = snapshot;
  const page = () => board.pages[ed.at]; ed.page = page;
  const asOpened = JSON.stringify([board.name, board.pages]); // to tell, on leaving, whether it changed

  // Round 2 (08-board-editor): the short band with Back and Full screen, the
  // board's name (tap to rename) and the page, the tray, the labelled tools.
  const tool = (t, icon, label) => `<button type="button" class="tool" data-t="${t}">${ICONS[icon]}<span>${label}</span></button>`;
  view.innerHTML = `
    <div class="screen editor">
      ${shortBandHtml({ name: 'Mood boards', back: '#/boards', backLabel: 'Back to mood boards', end: { label: 'Full screen', attr: 'data-show', svg: FULL } })}
      <div class="board-head">
        <button type="button" class="board-name" data-rename></button>
        <span class="count" data-at></span>
      </div>
      <div class="stage" data-stage></div>
      <div class="tpanel" data-tpanel hidden></div>
      <div class="tray-box" data-tray-box>
        <div class="tray-head" data-tray-head></div>
        <div class="tray" data-tray></div>
      </div>
      <nav class="tools" aria-label="Page tools">
        ${tool('layout', 'layout', 'Layout')}${tool('text', 'text', 'Text')}${tool('add', 'page', 'Add page')}${tool('undo', 'undo', 'Undo')}${tool('more', 'more', 'More')}${tool('pdf', 'download', 'PDF')}
      </nav>
    </div>`;
  const stage = view.querySelector('[data-stage]'); ed.stage = stage;
  const paintUndo = () => { view.querySelector('[data-t=undo]').disabled = !undo.length; }; ed.paintUndo = paintUndo;

  async function drawPage(turn = 0) {
    const token = ++drawToken;
    view.querySelector('[data-rename]').textContent = board.name;
    view.querySelector('[data-at]').textContent = `Page ${ed.at + 1} of ${board.pages.length}`;
    const el = await renderPage(board, page(), { selected: ed.sel, editing: true, mainHint: ed.tsel === 'main' });
    if (token !== drawToken || destroyed) return;
    fit(el);
    if (ed.sel >= 0 && page().images[ed.sel]) {
      const x = document.createElement('button');
      x.type = 'button'; x.className = 'slot-x'; x.setAttribute('aria-label', 'Take this photo off the page'); x.innerHTML = ICONS.x;
      // On the spot's top right corner, half off the photo, so it covers little of it.
      const spot = el.querySelector(`.slot[data-index="${ed.sel}"]`).style;
      Object.assign(x.style, { left: `min(calc(${spot.left} + ${spot.width}), calc(100% - 16px))`, top: `max(${spot.top}, 16px)` });
      el.append(x);
    }
    stage.replaceChildren(el);
    ed.paintTsel(el);
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
    if (n === ed.at) return;
    ed.at = n; ed.sel = -1; ed.tsel = null; ed.closePanel();
    drawPage(dir);
    drawTray();
  }

  function place(photoId) {
    const t = pageTemplate(board, page());
    let spot = ed.sel;
    if (spot < 0) { for (let i = 0; i < t.slots.length; i++) if (!page().images[i]) { spot = i; break; } }
    if (spot < 0) { toast('Tap a spot on the page first'); return; }
    snapshot();
    while (page().images.length <= spot) page().images.push(null);
    page().images[spot] = { id: photoId };
    persist();
    drawPage();
    drawTray();
  }
  addTouch(ed);
  addTools(ed);
  addTextBoxes(ed);

  view.querySelector('.tools').addEventListener('click', (e) => {
    const b = e.target.closest('[data-t]');
    if (!b) return;
    const k = b.dataset.t;
    if (k === 'layout') ed.layoutSheet();
    else if (k === 'text') ed.textSheet();
    else if (k === 'add') ed.addPage();
    else if (k === 'more') ed.moreSheet();
    else if (k === 'pdf') ed.exportPdf();
    else if (k === 'undo' && undo.length) {
      board.pages = JSON.parse(undo.pop());
      ed.at = Math.min(ed.at, board.pages.length - 1);
      ed.sel = -1; ed.tsel = null; ed.closePanel();
      paintUndo(); persist(); drawPage(); drawTray();
    }
  });
  // The whole board full screen; leaving it comes back on the page you ended on.
  view.querySelector('[data-show]').addEventListener('click', () => {
    persist.flush?.();
    showBoard(board, ed.at, (n) => { if (!destroyed && n !== ed.at) goTo(n, n > ed.at ? 1 : -1); });
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
  // Leaving a board that changed: a shoot it was sent to gets its pages drawn again.
  return () => {
    destroyed = true;
    const changed = JSON.stringify([board.name, board.pages]) !== asOpened;
    Promise.resolve(persist.flush()).then(() => { if (changed) keepUp(board.id); });
    window.removeEventListener('ref-layout', onResize);
  };
}
