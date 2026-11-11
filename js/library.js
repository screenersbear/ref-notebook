// What's in the notebook, kept in memory for quick drawing, plus how each
// folder is sorted and filtered.
import * as db from './db.js';
import { remakeThumb } from './photos.js';

export const lib = { photos: [], folders: [] };

// Photos from the first version carry their thumb on the record. Their big
// pictures were never touched, so each thumb is made again from that.
async function moveOldThumbs(photos) {
  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    if (!('thumb' in p)) continue;
    let bytes = null;
    try { bytes = await remakeThumb(p.id); } catch {}
    if (!bytes) { try { bytes = await p.thumb.arrayBuffer(); } catch {} }
    if (bytes) photos[i] = await db.moveThumbOff(p, bytes);
  }
}

const thumbs = new Map(); // id -> url of a picture held in memory, made once
export async function refresh() {
  const [photos, folders] = await Promise.all([db.listPhotos(), db.listFolders()]);
  await moveOldThumbs(photos);
  lib.photos = photos;
  lib.folders = folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  const missing = photos.filter((p) => !thumbs.has(p.id)).map((p) => p.id);
  if (missing.length) {
    const got = await db.getThumbs(missing);
    for (const [id, bytes] of got) thumbs.set(id, URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' })));
  }
  const here = new Set(photos.map((p) => p.id));
  for (const [id, u] of thumbs) if (!here.has(id)) { URL.revokeObjectURL(u); thumbs.delete(id); }
}

export const photoById = (id) => lib.photos.find((p) => p.id === id);
export const thumbUrl = (p) => (p && thumbs.get(p.id)) || '';

const fulls = new Map(); // id -> url, newest last; only the last few stay open
export async function fullUrl(id) {
  if (fulls.has(id)) { const u = fulls.get(id); fulls.delete(id); fulls.set(id, u); return u; }
  const blob = await db.getFile(id);
  if (!blob) return '';
  const u = URL.createObjectURL(blob);
  fulls.set(id, u);
  if (fulls.size > 30) { const [k, old] = fulls.entries().next().value; fulls.delete(k); setTimeout(() => URL.revokeObjectURL(old), 5000); }
  return u;
}

export const SPECIAL = [
  { id: 'incoming', name: 'Incoming' },
  { id: 'favorites', name: 'Favorites' },
  { id: 'all', name: 'All photos' },
];
export const isSpecial = (id) => SPECIAL.some((s) => s.id === id);
export const folderById = (id) => SPECIAL.find((s) => s.id === id) || lib.folders.find((f) => f.id === id);

export function photosIn(id) {
  if (id === 'all') return lib.photos;
  if (id === 'incoming') return lib.photos.filter((p) => !p.folderIds.length);
  if (id === 'favorites') return lib.photos.filter((p) => p.favorite);
  return lib.photos.filter((p) => p.folderIds.includes(id));
}

export const SORTS = [
  { key: 'newest', label: 'Newest added' },
  { key: 'oldest', label: 'Oldest added' },
  { key: 'az', label: 'Name A to Z' },
  { key: 'za', label: 'Name Z to A' },
  { key: 'fav', label: 'Favorites first' },
  { key: 'color', label: 'Color' },
];
const hueRank = (p) => (p.hue === null || p.hue === undefined ? 1000 : p.hue);
const byName = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
const newest = (a, b) => b.createdAt.localeCompare(a.createdAt);
export function sortList(list, key) {
  const out = [...list];
  if (key === 'oldest') return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (key === 'az') return out.sort(byName);
  if (key === 'za') return out.sort((a, b) => byName(b, a));
  if (key === 'fav') return out.sort((a, b) => (b.favorite - a.favorite) || newest(a, b));
  if (key === 'color') return out.sort((a, b) => (hueRank(a) - hueRank(b)) || newest(a, b));
  return out.sort(newest);
}

// Each folder remembers its own sort.
const SORT_KEY = 'ref-notebook-sort';
function sortMemory() { try { return JSON.parse(localStorage.getItem(SORT_KEY)) || {}; } catch { return {}; } }
export const sortOf = (id) => sortMemory()[id] || 'newest';
export function setSort(id, key) {
  const m = sortMemory();
  if (key === 'newest') delete m[id]; else m[id] = key;
  try { localStorage.setItem(SORT_KEY, JSON.stringify(m)); } catch {}
}

// ---------- Colors ----------
const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
function hsl([r, g, b]) {
  const R = r / 255, G = g / 255, B = b / 255, mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn, l = (mx + mn) / 2;
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  const h = !d ? 0 : mx === R ? (((G - B) / d) % 6 + 6) % 6 * 60 : mx === G ? ((B - R) / d + 2) * 60 : ((R - G) / d + 4) * 60;
  return [h, s, l];
}
function colorName(hex) {
  const [h, s, l] = hsl(rgbOf(hex));
  if (l < 0.13) return 'black';
  if (l > 0.9 && s < 0.5) return 'white';
  if (s < 0.14) return 'gray';
  if (h >= 12 && h < 48 && l < 0.42) return 'brown';
  if (h < 12 || h >= 345) return l > 0.72 ? 'pink' : 'red';
  if (h < 42) return 'orange';
  if (h < 68) return 'yellow';
  if (h < 165) return 'green';
  if (h < 255) return 'blue';
  if (h < 300) return 'purple';
  return 'pink';
}
function lab(hex) {
  const [x, y, z] = rgbOf(hex).map((v) => { const c = v / 255; return c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92; });
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const X = f((0.4124 * x + 0.3576 * y + 0.1805 * z) / 0.95047), Y = f(0.2126 * x + 0.7152 * y + 0.0722 * z), Z = f((0.0193 * x + 0.1192 * y + 0.9505 * z) / 1.08883);
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
}
// Photos with a real share of this color, closest and most of it first.
export function photosOfColor(hex) {
  const want = lab(hex);
  const out = [];
  for (const p of lib.photos) {
    let best = Infinity;
    for (const c of p.palette || []) {
      if (c.w < 0.05) continue;
      const v = lab(c.hex);
      best = Math.min(best, Math.hypot(v[0] - want[0], v[1] - want[1], v[2] - want[2]) - c.w * 10);
    }
    if (best < 16) out.push({ p, best });
  }
  return out.sort((a, b) => a.best - b.best).map((x) => x.p);
}

// ---------- The swipeable row of filters ----------
// Keys: t: what's in the photo, f: a folder it's in, c: a color, m: the mood of its light.
const keyCache = new WeakMap();
function keysOf(p) {
  let k = keyCache.get(p);
  if (k) return k;
  k = new Set();
  for (const t of p.tags || []) k.add(`t:${t}`);
  for (const f of p.folderIds) k.add(`f:${f}`);
  let light = 0, weight = 0;
  for (const c of p.palette || []) {
    if (c.w >= 0.14) k.add(`c:${colorName(c.hex)}`);
    light += hsl(rgbOf(c.hex))[2] * c.w; weight += c.w;
  }
  if (p.tone === 'warm') k.add('m:warm');
  if (p.tone === 'cool') k.add('m:cool');
  if (p.tone === 'neutral') k.add('m:b&w');
  if (weight && light / weight < 0.24) k.add('m:dark');
  if (weight && light / weight > 0.68) k.add('m:bright');
  keyCache.set(p, k);
  return k;
}
export const matches = (p, keys) => keys.every((k) => keysOf(p).has(k));

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const RANK = { t: 0, f: 1, c: 2, m: 3 }; // what's in the photos first, then the rest
// Every filter the photos can use, most photos first within each kind. With
// some already on, only ones that still leave something are offered.
export function chipsFor(photos, on, hereId) {
  const counts = new Map();
  for (const p of photos) for (const k of keysOf(p)) counts.set(k, (counts.get(k) || 0) + 1);
  const narrowed = photos.filter((p) => matches(p, on));
  const left = new Set(narrowed.flatMap((p) => [...keysOf(p)]));
  return [...counts.entries()]
    .filter(([k]) => k !== `f:${hereId}` && (on.includes(k) || left.has(k)))
    .filter(([k]) => k[0] !== 'f' || lib.folders.some((f) => f.id === k.slice(2)))
    .sort((a, b) => (RANK[a[0][0]] - RANK[b[0][0]]) || (b[1] - a[1]) || a[0].localeCompare(b[0]))
    .map(([k]) => ({ key: k, kind: k[0], label: k[0] === 'f' ? lib.folders.find((f) => f.id === k.slice(2)).name : k === 'm:b&w' ? 'B&W' : cap(k.slice(2)) }));
}
