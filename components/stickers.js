// Stickers on the notebook's cover: a photo cut to a circle, square or
// rectangle, a little creased, stuck on the cover so it swings open with it.
// Past an edge it folds over: shaded where it bends, and on the right it runs
// on across the edge of the pages. Newest on top.
import * as db from '../data/db.js';
import { toast } from './toast.js';
import { loadImage, canvasToBlob } from './util.js';

export const ASPECT = { circle: 1, square: 1, rect: 2 / 3 }; // height over width
const COVER = 1000 / 1360; // the cover's width over its height
const book = document.getElementById('book');
const flap = document.getElementById('stickerFlap');
const front = () => book.querySelector('.nb-front');
const urls = new Map();
const urlOf = (s) => {
  if (!urls.has(s.id)) urls.set(s.id, URL.createObjectURL(new Blob([s.bytes], { type: 'image/jpeg' })));
  return urls.get(s.id);
};
export let stickers = [];

// Seeded, so a sticker keeps its own creases from one launch to the next.
function randomFrom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const seedOf = (s) => s.seed ?? [...String(s.id)].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);
const creases = new Map();
function creaseArt(seed, aspect) {
  const key = `${seed}:${aspect}`;
  if (creases.has(key)) return creases.get(key);
  const W = 480, H = Math.round(W * aspect), r = randomFrom(seed);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  // Soft shadows lying on the paper, mostly around its edge.
  for (let i = 0, n = 3 + Math.floor(r() * 3); i < n; i++) {
    const side = Math.floor(r() * 4), along = r();
    const x = side === 0 ? 0 : side === 1 ? W : along * W, y = side === 2 ? 0 : side === 3 ? H : along * H;
    const rad = W * (0.18 + r() * 0.24);
    const shade = g.createRadialGradient(x, y, 0, x, y, rad);
    shade.addColorStop(0, `rgba(58, 50, 42, ${0.13 + r() * 0.12})`);
    shade.addColorStop(1, 'rgba(58, 50, 42, 0)');
    g.fillStyle = shade;
    g.fillRect(0, 0, W, H);
  }
  // Creases: soft, wide bends rather than lines. Each one is a gentle curve
  // from an edge, drawn only as blurred light and shade either side of it, so
  // it reads as the paper rising and falling, not as a cut.
  const edgePoint = (side) => {
    const t = 0.1 + r() * 0.8;
    return [[t * W, 0], [W, t * H], [t * W, H], [0, t * H]][side];
  };
  // Blurs a stroke by drawing it off the canvas and letting only its shadow land.
  const soft = (path, width, blur, color, dx, dy) => {
    const far = W * 4;
    g.save();
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.lineWidth = width;
    g.strokeStyle = '#000';
    g.shadowColor = color;
    g.shadowBlur = blur;
    g.shadowOffsetX = far + dx; g.shadowOffsetY = dy;
    g.translate(-far, 0);
    path();
    g.stroke();
    g.restore();
  };
  for (let i = 0, n = 2 + Math.floor(r() * 3); i < n; i++) {
    const side = Math.floor(r() * 4);
    const [ax, ay] = edgePoint(side);
    let [bx, by] = edgePoint((side + 1 + Math.floor(r() * 3)) % 4);
    const reach = 0.45 + r() * 0.55;
    bx = ax + (bx - ax) * reach; by = ay + (by - ay) * reach;
    const len = Math.hypot(bx - ax, by - ay), nx = -(by - ay) / len, ny = (bx - ax) / len;
    const bow = (r() - 0.5) * len * 0.18;
    const cx = (ax + bx) / 2 + nx * bow, cy = (ay + by) / 2 + ny * bow;
    const path = () => { g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(cx, cy, bx, by); };
    const depth = 0.55 + r() * 0.45;
    const spread = W * (0.035 + r() * 0.035);
    // the shaded side falls away from the light, top left
    const sx = nx > 0 ? 1 : -1, sy = ny > 0 ? 1 : -1;
    const ox = sx * Math.abs(nx), oy = sy * Math.abs(ny);
    soft(path, spread * 0.9, spread * 1.3, `rgba(52, 44, 38, ${0.16 * depth})`, ox * spread * 0.6, oy * spread * 0.6);
    soft(path, spread * 0.35, spread * 0.6, `rgba(52, 44, 38, ${0.1 * depth})`, ox * spread * 0.25, oy * spread * 0.25);
    soft(path, spread * 0.7, spread * 1.1, `rgba(255, 255, 255, ${0.32 * depth})`, -ox * spread * 0.55, -oy * spread * 0.55);
  }
  const url = c.toDataURL('image/png');
  c.width = c.height = 0;
  creases.set(key, url);
  return url;
}

function make(s, src, onFlap) {
  const el = document.createElement('div');
  el.className = `sticker ${s.shape}`;
  el.innerHTML = `<img class="photo" alt="" draggable="false" /><img class="crease" alt="" draggable="false" />${onFlap ? '' : '<i class="fold r" hidden></i><i class="fold l" hidden></i><i class="fold t" hidden></i><i class="fold b" hidden></i>'}`;
  el.querySelector('.photo').src = src;
  el.querySelector('.crease').src = creaseArt(seedOf(s), ASPECT[s.shape]);
  (onFlap ? placeOnFlap : place)(el, s);
  return el;
}

// Where the sticker sits, and the shading wherever it bends over an edge.
const BEND = 0.075; // how far in the bend's shading reaches, of the cover's width
function place(el, s) {
  el.style.left = `${s.x * 100}%`;
  el.style.top = `${s.y * 100}%`;
  el.style.width = `${s.size * 100}%`;
  const w = s.size, h = s.size * ASPECT[s.shape] * COVER;
  const left = s.x - w / 2, top = s.y - h / 2;
  const across = (BEND / w) * 100, down = ((BEND * COVER) / h) * 100;
  const set = (cls, on, css) => { const f = el.querySelector(`.fold.${cls}`); f.hidden = !on; if (on) Object.assign(f.style, css); };
  set('r', left + w > 1, { left: `${((1 - left) / w) * 100 - across}%`, width: `${across}%` });
  set('l', left < 0, { left: `${(-left / w) * 100}%`, width: `${across}%` });
  set('b', top + h > 1, { top: `${((1 - top) / h) * 100 - down}%`, height: `${down}%` });
  set('t', top < 0, { top: `${(-top / h) * 100}%`, height: `${down}%` });
}
const placeOnFlap = (el, s) => {
  el.style.left = `calc(${s.x - 1} * var(--W))`;
  el.style.top = `calc(${s.y} * var(--H))`;
  el.style.width = `calc(${s.size} * var(--W))`;
};

export async function paintStickers() {
  stickers = (await db.listStickers()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  front().querySelectorAll('.sticker').forEach((e) => e.remove());
  flap.innerHTML = '';
  for (const s of stickers) { front().append(make(s, urlOf(s))); flap.append(make(s, urlOf(s), true)); }
  window.dispatchEvent(new Event('ref-stickers'));
}
export const stickerThumb = urlOf;

export async function removeSticker(s) {
  await db.deleteSticker(s.id);
  await paintStickers();
  toast('Sticker removed', { action: { label: 'Undo', run: async () => { await db.saveSticker(s); await paintStickers(); } } });
}

const twoFingers = (list) => (list.length > 1 ? Math.hypot(list[0][0] - list[1][0], list[0][1] - list[1][1]) : 0);
const middle = (list) => [list.reduce((a, p) => a + p[0], 0) / list.length, list.reduce((a, p) => a + p[1], 0) / list.length];

// Fit the photo in the shape: drag and pinch it behind the window. Resolves
// with the picture's bytes, or null if cancelled.
export async function cropSticker(file, shape) {
  const url = URL.createObjectURL(file);
  let img;
  try { img = await loadImage(url); } finally { URL.revokeObjectURL(url); }
  const fit = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight));
  const pic = document.createElement('canvas');
  pic.width = Math.round(img.naturalWidth * fit);
  pic.height = Math.round(img.naturalHeight * fit);
  const pg = pic.getContext('2d', { colorSpace: 'srgb' });
  pg.imageSmoothingQuality = 'high';
  pg.drawImage(img, 0, 0, pic.width, pic.height);

  return new Promise((resolve) => {
    const layer = document.createElement('div');
    layer.className = 'crop-layer';
    layer.innerHTML = `
      <div class="crop-win ${shape}"></div>
      <div class="place-foot">
        <button type="button" class="btn secondary" data-no>Cancel</button>
        <button type="button" class="btn primary" data-yes>Okay</button>
      </div>`;
    layer.prepend(pic);
    document.body.append(layer);
    const box = layer.getBoundingClientRect();
    const footTop = layer.querySelector('.place-foot').getBoundingClientRect().top - box.top;
    const ww = Math.min(box.width - 48, (footTop - 48) / ASPECT[shape], 420), wh = ww * ASPECT[shape];
    const wx = (box.width - ww) / 2, wy = (footTop - wh) / 2;
    Object.assign(layer.querySelector('.crop-win').style, { left: `${wx}px`, top: `${wy}px`, width: `${ww}px`, height: `${wh}px` });
    const least = Math.max(ww / pic.width, wh / pic.height);
    let k = least, tx = wx + (ww - pic.width * k) / 2, ty = wy + (wh - pic.height * k) / 2;
    const draw = () => {
      k = Math.min(least * 6, Math.max(least, k));
      tx = Math.min(wx, Math.max(wx + ww - pic.width * k, tx));
      ty = Math.min(wy, Math.max(wy + wh - pic.height * k, ty));
      pic.style.transform = `translate(${tx}px, ${ty}px) scale(${k})`;
    };
    draw();
    const pts = new Map();
    let grab = null;
    const start = () => {
      const list = [...pts.values()], [mx, my] = middle(list);
      grab = { mx, my, k, px: (mx - tx) / k, py: (my - ty) / k, d: twoFingers(list) };
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
      const list = [...pts.values()], [mx, my] = middle(list);
      if (list.length > 1 && grab.d) k = grab.k * (twoFingers(list) / grab.d);
      tx = mx - grab.px * k; ty = my - grab.py * k;
      draw();
    });
    const up = (e) => { if (pts.delete(e.pointerId) && pts.size) start(); };
    layer.addEventListener('pointerup', up);
    layer.addEventListener('pointercancel', up);
    layer.addEventListener('wheel', (e) => { e.preventDefault(); k *= e.deltaY < 0 ? 1.05 : 0.95; draw(); }, { passive: false });
    const finish = (bytes) => { layer.remove(); pic.width = pic.height = 0; resolve(bytes); };
    layer.querySelector('[data-no]').addEventListener('click', () => finish(null));
    layer.querySelector('[data-yes]').addEventListener('click', async () => {
      const sw = ww / k, sh = wh / k, out = Math.min(1000, Math.round(sw));
      const c = document.createElement('canvas');
      c.width = out; c.height = Math.round(out * ASPECT[shape]);
      const g = c.getContext('2d', { colorSpace: 'srgb' });
      g.imageSmoothingQuality = 'high';
      g.drawImage(pic, (wx - tx) / k, (wy - ty) / k, sw, sh, 0, 0, c.width, c.height);
      const bytes = await (await canvasToBlob(c, 'image/jpeg', 0.88)).arrayBuffer();
      c.width = c.height = 0;
      finish(bytes);
    });
  });
}

// Puts a new sticker on the cover to drag and pinch, until Okay or Cancel.
export function placeSticker(shape, bytes) {
  const draft = { shape, x: 0.5, y: 0.42, size: 0.44, seed: Math.floor(Math.random() * 2 ** 31) };
  const url = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
  book.className = 'nb closed placing';
  const el = make(draft, url);
  const onFlap = make(draft, url, true);
  front().append(el);
  flap.append(onFlap);

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
    draft.x = Math.min(1.1, Math.max(-0.1, draft.x)); // past an edge it folds, but it's never lost
    draft.y = Math.min(1.1, Math.max(-0.1, draft.y));
    place(el, draft);
    placeOnFlap(onFlap, draft);
  };
  const pts = new Map();
  let grab = null;
  const start = () => {
    const list = [...pts.values()], [mx, my] = middle(list);
    grab = { w: front().offsetWidth, h: front().offsetHeight, mx, my, x: draft.x, y: draft.y, size: draft.size, d: twoFingers(list) };
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
    const list = [...pts.values()], [mx, my] = middle(list);
    draft.x = grab.x + (mx - grab.mx) / grab.w;
    draft.y = grab.y + (my - grab.my) / grab.h;
    if (list.length > 1 && grab.d) draft.size = grab.size * (twoFingers(list) / grab.d);
    clampAll();
  });
  const up = (e) => { if (pts.delete(e.pointerId) && pts.size) start(); };
  layer.addEventListener('pointerup', up);
  layer.addEventListener('pointercancel', up);
  layer.addEventListener('wheel', (e) => { e.preventDefault(); draft.size *= e.deltaY < 0 ? 1.05 : 0.95; clampAll(); }, { passive: false });

  const done = () => { layer.remove(); book.className = 'nb closed'; URL.revokeObjectURL(url); };
  layer.querySelector('[data-no]').addEventListener('click', () => { el.remove(); onFlap.remove(); done(); });
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
