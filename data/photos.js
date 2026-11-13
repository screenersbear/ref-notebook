// Bringing photos in from the phone. Each is saved as one big JPEG (plenty for
// boards and PDFs, far smaller than the original) and a small thumb. Colors
// are read once, here, so folders can filter and sort by them.
import { addPhoto, getFile } from './db.js';
import { loadImage, canvasToBlob } from '../components/util.js';

const FULL_MAX = 2400;
const THUMB_MAX = 640;

function downscale(src, srcW, srcH, w, h) {
  let cur = src, cw = srcW, ch = srcH;
  const temps = [];
  while (cw / 2 >= w && ch / 2 >= h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(cw / 2));
    c.height = Math.max(1, Math.round(ch / 2));
    const x = c.getContext('2d', { colorSpace: 'srgb' });
    x.imageSmoothingQuality = 'high';
    x.drawImage(cur, 0, 0, c.width, c.height);
    temps.push(c);
    cur = c; cw = c.width; ch = c.height;
  }
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(w));
  out.height = Math.max(1, Math.round(h));
  const ctx = out.getContext('2d', { colorSpace: 'srgb' });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(cur, 0, 0, out.width, out.height);
  temps.forEach((c) => { c.width = 0; c.height = 0; }); // iOS has a small budget for canvases
  return out;
}
const fit = (w, h, max) => { const k = Math.min(1, max / Math.max(w, h)); return [Math.round(w * k), Math.round(h * k)]; };
const hex = (r, g, b) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

// What the app notices: main colors, warm / cool / neutral, a hue to sort by.
export function readColors(canvas) {
  const s = document.createElement('canvas');
  s.width = 48; s.height = 48;
  const g = s.getContext('2d', { willReadFrequently: true });
  g.drawImage(canvas, 0, 0, 48, 48);
  const d = g.getImageData(0, 0, 48, 48).data;
  const buckets = new Map();
  let warmth = 0, satSum = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], gr = d[i + 1], b = d[i + 2];
    const max = Math.max(r, gr, b), min = Math.min(r, gr, b), sat = max ? (max - min) / max : 0;
    satSum += sat;
    warmth += (r - b) * sat;
    const k = (r >> 5) * 64 + (gr >> 5) * 8 + (b >> 5);
    const e = buckets.get(k) || { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += r; e.g += gr; e.b += b;
    buckets.set(k, e);
  }
  const total = 48 * 48;
  const picked = [];
  for (const e of [...buckets.values()].sort((a, b) => b.n - a.n)) {
    const c = [e.r / e.n, e.g / e.n, e.b / e.n];
    const same = picked.find((p) => Math.hypot(p.c[0] - c[0], p.c[1] - c[1], p.c[2] - c[2]) < 42);
    if (same) same.n += e.n; else if (picked.length < 5) picked.push({ c, n: e.n });
  }
  picked.sort((a, b) => b.n - a.n);
  const palette = picked.map((p) => ({ hex: hex(...p.c), w: p.n / total }));
  const avgSat = satSum / total;
  const tone = avgSat < 0.12 ? 'neutral' : warmth > 0 ? 'warm' : 'cool';
  let hue = null;
  const main = picked.find((p) => { const mx = Math.max(...p.c), mn = Math.min(...p.c); return mx > 30 && (mx - mn) / mx > 0.15; });
  if (main && tone !== 'neutral') {
    const [r, gr, b] = main.c, mx = Math.max(r, gr, b), mn = Math.min(r, gr, b), dl = mx - mn;
    const h = mx === r ? ((gr - b) / dl) % 6 : mx === gr ? (b - r) / dl + 2 : (r - gr) / dl + 4;
    hue = (h * 60 + 360) % 360;
  }
  s.width = s.height = 0;
  return { palette, tone, hue };
}

async function importFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const width = img.naturalWidth, height = img.naturalHeight;
    if (!width || !height) throw new Error('empty');
    const [fw, fh] = fit(width, height, FULL_MAX);
    const fc = downscale(img, width, height, fw, fh);
    const full = await (await canvasToBlob(fc, 'image/jpeg', 0.86)).arrayBuffer();
    const [tw, th] = fit(width, height, THUMB_MAX);
    const tc = downscale(fc, fw, fh, tw, th);
    const thumb = await (await canvasToBlob(tc, 'image/jpeg', 0.8)).arrayBuffer();
    const colors = readColors(tc);
    fc.width = fc.height = tc.width = tc.height = 0;
    img.src = '';
    return addPhoto({
      name: (file.name || 'photo').replace(/\.[^.]+$/, ''),
      width: fw, height: fh,
      shape: fw > fh * 1.1 ? 'wide' : fh > fw * 1.1 ? 'tall' : 'square',
      ...colors, folderIds: [], favorite: false,
    }, full, thumb);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// A new small picture made from the big one.
export async function remakeThumb(id) {
  const blob = await getFile(id);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const [tw, th] = fit(img.naturalWidth, img.naturalHeight, THUMB_MAX);
    const tc = downscale(img, img.naturalWidth, img.naturalHeight, tw, th);
    const bytes = await (await canvasToBlob(tc, 'image/jpeg', 0.8)).arrayBuffer();
    tc.width = tc.height = 0;
    return bytes;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// One at a time, so a phone never holds more than one full-size photo.
export async function importFiles(files, onProgress) {
  const photos = [], failed = [];
  const list = [...files].filter((f) => !f.type || f.type.startsWith('image/'));
  for (let i = 0; i < list.length; i++) {
    if (onProgress) onProgress(i + 1, list.length);
    try { photos.push(await importFile(list[i])); } catch { failed.push(list[i].name || 'photo'); }
  }
  return { photos, failed };
}

// Opens the phone's photos. Must be called straight from a tap.
export function pickFiles(multiple = true) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = multiple;
    input.style.display = 'none';
    input.addEventListener('change', () => { const f = [...(input.files || [])]; input.remove(); resolve(f); });
    input.addEventListener('cancel', () => { input.remove(); resolve([]); });
    document.body.appendChild(input);
    input.click();
  });
}
