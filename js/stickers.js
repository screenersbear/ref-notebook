// Stickers on the notebook's cover. Each is a photo cut to a circle or square,
// stuck on the cover itself, so it swings open with it and gets cropped at the
// cover's edges. Newest on top.
import * as db from './db.js';
import { toast } from './ui.js';

const book = document.getElementById('book');
const front = () => book.querySelector('.nb-front');
const urls = new Map();
const urlOf = (s) => {
  if (!urls.has(s.id)) urls.set(s.id, URL.createObjectURL(new Blob([s.bytes], { type: 'image/jpeg' })));
  return urls.get(s.id);
};
export let stickers = [];

function make(s, src) {
  const el = document.createElement('div');
  el.className = `sticker ${s.shape}`;
  el.innerHTML = '<img alt="" draggable="false" />';
  el.firstChild.src = src;
  place(el, s);
  return el;
}
const place = (el, s) => { el.style.left = `${s.x * 100}%`; el.style.top = `${s.y * 100}%`; el.style.width = `${s.size * 100}%`; };

export async function paintStickers() {
  stickers = (await db.listStickers()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  front().querySelectorAll('.sticker').forEach((e) => e.remove());
  for (const s of stickers) front().append(make(s, urlOf(s)));
  window.dispatchEvent(new Event('ref-stickers'));
}
export const stickerThumb = urlOf;

export async function removeSticker(s) {
  await db.deleteSticker(s.id);
  await paintStickers();
  toast('Sticker removed', { action: { label: 'Undo', run: async () => { await db.saveSticker(s); await paintStickers(); } } });
}

// Puts a new sticker on the cover to drag and pinch, until Okay or Cancel.
export function placeSticker(shape, bytes) {
  const draft = { shape, x: 0.5, y: 0.42, size: 0.44 };
  const url = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
  book.className = 'nb placing';
  const el = make(draft, url);
  front().append(el);

  const layer = document.createElement('div');
  layer.className = 'place-layer';
  layer.innerHTML = `
    <div class="place-foot">
      <button type="button" class="btn secondary" data-no>Cancel</button>
      <button type="button" class="btn primary" data-yes>Okay</button>
    </div>`;
  document.body.append(layer);

  const clampAll = () => {
    draft.size = Math.min(1.5, Math.max(0.12, draft.size));
    draft.x = Math.min(1.1, Math.max(-0.1, draft.x)); // past an edge it's cropped, but never lost
    draft.y = Math.min(1.1, Math.max(-0.1, draft.y));
    place(el, draft);
  };
  const pts = new Map();
  let grab = null;
  const start = () => {
    const r = front().getBoundingClientRect();
    const list = [...pts.values()];
    const mx = list.reduce((a, p) => a + p[0], 0) / list.length, my = list.reduce((a, p) => a + p[1], 0) / list.length;
    grab = { w: r.width, h: r.height, mx, my, x: draft.x, y: draft.y, size: draft.size, d: list.length > 1 ? Math.hypot(list[0][0] - list[1][0], list[0][1] - list[1][1]) : 0 };
  };
  layer.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.place-foot')) return;
    try { layer.setPointerCapture(e.pointerId); } catch {}
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    start();
  });
  layer.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    const list = [...pts.values()];
    const mx = list.reduce((a, p) => a + p[0], 0) / list.length, my = list.reduce((a, p) => a + p[1], 0) / list.length;
    draft.x = grab.x + (mx - grab.mx) / grab.w;
    draft.y = grab.y + (my - grab.my) / grab.h;
    if (list.length > 1 && grab.d) draft.size = grab.size * (Math.hypot(list[0][0] - list[1][0], list[0][1] - list[1][1]) / grab.d);
    clampAll();
  });
  const up = (e) => { if (pts.delete(e.pointerId) && pts.size) start(); };
  layer.addEventListener('pointerup', up);
  layer.addEventListener('pointercancel', up);
  layer.addEventListener('wheel', (e) => { e.preventDefault(); draft.size *= e.deltaY < 0 ? 1.05 : 0.95; clampAll(); }, { passive: false });

  const done = () => { layer.remove(); book.className = 'nb closed'; URL.revokeObjectURL(url); };
  layer.querySelector('[data-no]').addEventListener('click', () => { el.remove(); done(); });
  layer.querySelector('[data-yes]').addEventListener('click', async () => {
    try {
      await db.saveSticker({ ...draft, bytes });
      done();
      await paintStickers();
    } catch (err) {
      console.error(err);
      toast('Could not save that. Try once more.');
    }
  });
}
