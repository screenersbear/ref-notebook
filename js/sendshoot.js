// Send to shoot: a board onto a shoot's page in The Eye.
//
// Inside Documenting Fictions the board goes straight onto the shoot: a link
// in df-links (df-data.js) with the board's pages drawn as pictures. While
// the shoot is still to come, Ref draws them again whenever the board changes
// (keepUp); once the shoot is shot, The Eye freezes them. On its own (a Ref
// installed by itself can't see The Eye's shoots) the board becomes a file
// to share, which The Eye takes in with + Import board.
import * as db from './db.js';
import { photoById, thumbUrl } from './library.js';
import { pageToCanvas } from './pages.js';
import { SHAPES } from './templates.js';
import { openSheet, choiceSheet, confirmSheet, toast, hideToast } from './ui.js';
import { esc, canvasToBlob } from './util.js';

const D = window.DFData;
const LONG_EDGE = 1600;      // each page picture, on its longer side
const COVER = 800;           // the cover, square
const BIG_FILE = 25 * 1048576; // a file this big gets a word first
const UPCOMING = ['prospect', 'planning', 'waiting_to_shoot', 'rescheduled'];

// ---------- Drawing a board ----------
// What a board looks like, as a short key: its pictures are drawn again only
// when this changes (opening a board saves it again, changed or not).
function boardKey(b) {
  const str = JSON.stringify([b.name, b.shape, b.style, b.pages]);
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return `${(h >>> 0).toString(36)}.${str.length.toString(36)}`;
}
const photoIds = (board) => [...new Set(board.pages.flatMap((p) => p.images).filter((im) => im && photoById(im.id)).map((im) => im.id))];
const toPicture = async (c, q = 0.82) => { const b = await canvasToBlob(c, 'image/jpeg', q); return { type: b.type, bytes: await b.arrayBuffer() }; };
function loadImage(src) {
  return new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = src; });
}
function drawCrop(ctx, img, x, y, w, h) {
  const k = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / k, sh = h / k;
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}
// The cover: up to four of the board's photos together, else its first page.
async function drawCover(board, firstPage) {
  const imgs = (await Promise.all(photoIds(board).slice(0, 4).map((id) => loadImage(thumbUrl(photoById(id)))))).filter(Boolean);
  const c = document.createElement('canvas');
  c.width = c.height = COVER;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, COVER, COVER);
  ctx.imageSmoothingQuality = 'high';
  const g = 6, h = COVER / 2;
  if (!imgs.length) {
    const page = await loadImage(URL.createObjectURL(new Blob([firstPage.bytes], { type: firstPage.type })));
    if (page) drawCrop(ctx, page, 0, 0, COVER, COVER);
  } else if (imgs.length === 1) drawCrop(ctx, imgs[0], 0, 0, COVER, COVER);
  else if (imgs.length === 2) { drawCrop(ctx, imgs[0], 0, 0, h - g / 2, COVER); drawCrop(ctx, imgs[1], h + g / 2, 0, h - g / 2, COVER); }
  else if (imgs.length === 3) { drawCrop(ctx, imgs[0], 0, 0, h - g / 2, COVER); drawCrop(ctx, imgs[1], h + g / 2, 0, h - g / 2, h - g / 2); drawCrop(ctx, imgs[2], h + g / 2, h + g / 2, h - g / 2, h - g / 2); }
  else imgs.forEach((im, i) => drawCrop(ctx, im, (i % 2) * (h + g / 2), Math.floor(i / 2) * (h + g / 2), h - g / 2, h - g / 2));
  return toPicture(c, 0.8);
}
// Every page as a picture, plus the cover and what the shoot's page shows.
async function drawBoard(board, say) {
  const s = SHAPES[board.shape] || SHAPES['letter-portrait'];
  const px = s.W >= s.H ? LONG_EDGE : Math.round((LONG_EDGE * s.W) / s.H);
  const pages = [];
  for (let i = 0; i < board.pages.length; i++) {
    if (say) say(i);
    const c = await pageToCanvas(board, board.pages[i], px);
    pages.push(await toPicture(c));
    c.width = c.height = 0;
  }
  const cover = await drawCover(board, pages[0]);
  return {
    about: { id: board.id, name: board.name, pageCount: pages.length, photoCount: photoIds(board).length, updatedAt: board.updatedAt },
    pictures: { cover, pages },
  };
}

// ---------- The Eye's shoots, read from where it keeps them ----------
function eyeShoots() {
  const st = D.eyeState();
  if (!st || !Array.isArray(st.shoots)) return { shoots: [], mode: null };
  return { shoots: st.shoots.filter((s) => s && s.id), mode: st.titleDisplayMode };
}
const dateOf = (ymd) => { const [y, m, d] = String(ymd).split('-').map(Number); return new Date(y, m - 1, d); };
function shootDay(ymd) {
  if (!ymd) return 'No date yet';
  const d = dateOf(ymd);
  const opts = { weekday: 'short', month: 'short', day: 'numeric' };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString(undefined, opts);
}
// Still to come, soonest first; no date yet at the end.
function upcomingShoots() {
  const { shoots, mode } = eyeShoots();
  return shoots
    .filter((s) => !s.archived && UPCOMING.includes(s.status || 'prospect'))
    .sort((a, b) => (a.date ? 0 : 1) - (b.date ? 0 : 1) || String(a.date || '').localeCompare(String(b.date || '')))
    .map((s) => {
      const name = D.eyeShootName(s, mode);
      const other = D.eyeShootName(s, mode === 'title' ? 'talent' : 'title'); // the shoot's title under a talent's name, or the other way round
      return { id: s.id, name, other: other !== name ? other : '', date: s.date || '' };
    });
}
const shortDay = (ymd) => (ymd ? dateOf(ymd).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '');
// The shoots each board is on: { boardId: ['Ana Rivera', ...] }. Shoots since deleted are left out.
export async function boardShoots() {
  if (!D || !D.inSuite()) return {};
  const { shoots, mode } = eyeShoots();
  const byId = new Map(shoots.map((s) => [s.id, s]));
  const out = {};
  for (const l of await D.linksWhere({ fromApp: 'ref', toApp: 'the-eye', type: 'moodboard' })) {
    const s = byId.get(l.toId);
    if (s) (out[l.fromId] = out[l.fromId] || []).push(`${D.eyeShootName(s, mode)}${s.date ? ` (${shortDay(s.date)})` : ''}`);
  }
  return out;
}

// ---------- Send to shoot ----------
export async function sendToShoot(board) {
  if (!D) return;
  if (!D.inSuite()) { await sendAsFile(board); return; }
  const links = await D.linksWhere({ fromApp: 'ref', fromId: board.id, toApp: 'the-eye', type: 'moodboard' });
  const has = new Set(links.map((l) => l.toId));
  const shoots = upcomingShoots();
  const key = await choiceSheet({
    title: 'Send to which shoot?',
    message: shoots.length ? '' : 'No shoots coming up in The Eye.',
    options: [
      ...shoots.map((s) => ({ key: s.id, label: s.name, detail: [shootDay(s.date), s.other, has.has(s.id) ? 'Has this board' : ''].filter(Boolean).join(' · '), current: has.has(s.id) })),
      { key: '+new', label: '+ New shoot from this board' },
    ],
  });
  if (!key) return;
  if (key !== '+new' && has.has(key)) { toast('That shoot has this board already'); return; }
  let drawn;
  try {
    drawn = await drawBoard(board, (i) => toast(`Getting page ${i + 1} of ${board.pages.length} ready`, { ms: 60000 }));
  } catch (e) {
    console.error(e);
    toast("The board couldn't be sent");
    return;
  }
  hideToast();
  const link = {
    fromApp: 'ref', fromId: board.id, toApp: 'the-eye', toId: key === '+new' ? null : key, type: 'moodboard',
    name: board.name, pageCount: drawn.about.pageCount, photoCount: drawn.about.photoCount,
    drawnAt: D.nowIso(), drawnOf: boardKey(board), frozenAt: null, importedAt: null, pending: key === '+new',
  };
  const saved = await D.saveLink(link, drawn.pictures);
  // A new shoot is made by The Eye itself, with this board on it.
  if (key === '+new') { location.href = D.notebookUrl('the-eye', { newShootFromBoard: saved.id }); return; }
  const shoot = shoots.find((s) => s.id === key);
  const sh = openSheet({
    title: 'Sent',
    className: 'sheet-small',
    body: `<p class="sheet-message"><b>${esc(board.name)}</b> is on <b>${esc(shoot.name)}</b>${shoot.date ? ` (${esc(shootDay(shoot.date))})` : ''} in The Eye. It keeps up with your changes here until the shoot is shot.</p>
      <div class="sheet-actions"><button type="button" class="btn secondary" data-done>Done</button><button type="button" class="btn primary" data-open>Open the shoot</button></div>`,
  });
  sh.body.querySelector('[data-done]').addEventListener('click', () => sh.close());
  sh.body.querySelector('[data-open]').addEventListener('click', () => { location.href = D.notebookUrl('the-eye', { shoot: key }); });
}

// On its own: the board as a file for The Eye's + Import board.
async function sendAsFile(board) {
  let file;
  try {
    const drawn = await drawBoard(board, (i) => toast(`Getting page ${i + 1} of ${board.pages.length} ready`, { ms: 60000 }));
    file = await D.boardFile(drawn.about, drawn.pictures);
  } catch (e) {
    console.error(e);
    toast("The board couldn't be made into a file");
    return;
  }
  hideToast();
  const mb = (file.size / 1048576).toFixed(1);
  if (file.size > BIG_FILE && !(await confirmSheet({ title: 'This is a big file', message: `${mb} MB. AirDrop and Files take it; Messages and email may not.`, confirmLabel: 'Share it anyway' }))) return;
  // A new tap, because iOS won't open the share sheet after a long wait.
  const sh = openSheet({
    title: 'Send to a shoot',
    className: 'sheet-small',
    body: `<p class="sheet-message">${board.pages.length} ${board.pages.length === 1 ? 'page' : 'pages'}, ${mb} MB. In The Eye, open the shoot and tap <b>+ Import board</b>.</p><div class="sheet-actions one"><button type="button" class="btn primary" data-send>Save or share</button></div>`,
  });
  sh.body.querySelector('[data-send]').addEventListener('click', async () => {
    const how = await D.saveFile(file);
    if (how !== 'cancelled') sh.close();
  });
}

// ---------- Keeping sent boards up to date ----------
// A board still on its way to a shoot (not frozen, not a file) is drawn
// again once it has changed since its pictures were made. One run at a time.
let running = Promise.resolve();
export function keepUp(boardId) {
  if (!D || !D.inSuite()) return running;
  running = running.then(() => catchUp(boardId)).catch((e) => console.error(e));
  return running;
}
async function catchUp(boardId) {
  const live = (await D.linksWhere({ fromApp: 'ref', toApp: 'the-eye', type: 'moodboard' }))
    .filter((l) => !l.frozenAt && !l.importedAt && !l.pending && (!boardId || l.fromId === boardId));
  const drawnFor = new Map(); // a board on two shoots is drawn once
  for (const l of live) {
    const board = await db.getBoard(l.fromId);
    if (!board || !board.pages.length) continue; // deleted in Ref: the shoot keeps the last pictures
    if (l.drawnOf ? l.drawnOf === boardKey(board) : l.drawnAt && board.updatedAt <= l.drawnAt) continue;
    if (!drawnFor.has(board.id)) drawnFor.set(board.id, await drawBoard(board));
    const drawn = drawnFor.get(board.id);
    const now = await D.getLink(l.id); // The Eye may have frozen or dropped it meanwhile
    if (!now || now.frozenAt) continue;
    await D.saveLink({ ...now, name: board.name, pageCount: drawn.about.pageCount, photoCount: drawn.about.photoCount, drawnAt: D.nowIso(), drawnOf: boardKey(board) }, drawn.pictures);
  }
}
