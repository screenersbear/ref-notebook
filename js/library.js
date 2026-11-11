// What's in the notebook, kept in memory for quick drawing, plus how each
// folder is sorted and filtered.
import * as db from './db.js';

export const lib = { photos: [], folders: [] };

export async function refresh() {
  const [photos, folders] = await Promise.all([db.listPhotos(), db.listFolders()]);
  lib.photos = photos;
  lib.folders = folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export const photoById = (id) => lib.photos.find((p) => p.id === id);

const thumbs = new Map();
export function thumbUrl(p) {
  if (!p?.thumb) return '';
  let u = thumbs.get(p.id);
  if (!u) { u = URL.createObjectURL(p.thumb); thumbs.set(p.id, u); }
  return u;
}

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

export const FILTERS = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'tall', label: 'Tall', test: (p) => p.shape === 'tall' },
  { key: 'wide', label: 'Wide', test: (p) => p.shape === 'wide' },
  { key: 'warm', label: 'Warm', test: (p) => p.tone === 'warm' },
  { key: 'cool', label: 'Cool', test: (p) => p.tone === 'cool' },
  { key: 'neutral', label: 'B&W', test: (p) => p.tone === 'neutral' },
];
