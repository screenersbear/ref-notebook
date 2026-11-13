// Storage. The only file that knows about IndexedDB.
//
//   photos   one small record per photo: details, folderIds, favorite, tags
//   thumbs   the small picture for each photo
//   files    the big picture for each photo
//
// Pictures live apart from the records and are stored as plain bytes, never
// Blobs. Safari keeps stored Blobs as files on disk: saving a record again
// (filing it, favoriting it) replaced that file, which broke the thumbnail on
// screen and could make the next save fail.
//   folders  your folders. Incoming isn't stored: it's photos in no folder
//   boards   mood boards and their pages
//   stickers the stickers on the notebook's cover
//   meta     small settings
import { uuid, nowISO } from './util.js';

const DB_NAME = 'ref-notebook';
const STORES = ['photos', 'thumbs', 'files', 'folders', 'boards', 'stickers', 'meta'];
const KEY = { meta: 'key' };

let dbPromise = null;
function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 3);
    req.onupgradeneeded = () => {
      for (const s of STORES) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s, { keyPath: KEY[s] || 'id' });
    };
    req.onsuccess = () => {
      req.result.onversionchange = () => req.result.close();
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx(stores, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(stores, mode);
    let out;
    t.oncomplete = () => resolve(out);
    // A failed write aborts the transaction, which then carries that write's error.
    t.onabort = () => reject(t.error || new Error('Could not save. Your phone may be out of space.'));
    Promise.resolve(fn(t, (v) => { out = v; })).catch(reject);
  });
}
const all = (store) => tx([store], 'readonly', (t, set) => { t.objectStore(store).getAll().onsuccess = (e) => set(e.target.result); });
const one = (store, id) => tx([store], 'readonly', (t, set) => { t.objectStore(store).get(id).onsuccess = (e) => set(e.target.result); });
const stamp = (r) => ({ ...r, id: r.id || uuid(), createdAt: r.createdAt || nowISO(), updatedAt: nowISO() });

export const listPhotos = () => all('photos');
export const listFolders = () => all('folders');
export const listBoards = async () => (await all('boards')).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
export const getBoard = (id) => one('boards', id);
// Always a fresh Blob in memory, whichever way the picture was stored.
export async function getFile(id) {
  const full = (await one('files', id))?.full;
  if (!full) return null;
  return new Blob([full instanceof Blob ? await full.arrayBuffer() : full], { type: 'image/jpeg' });
}
export const getThumb = async (id) => (await one('thumbs', id))?.bytes;
export function getThumbs(ids) {
  return tx(['thumbs'], 'readonly', (t, set) => {
    const out = new Map();
    set(out);
    ids.forEach((id) => { t.objectStore('thumbs').get(id).onsuccess = (e) => { if (e.target.result) out.set(id, e.target.result.bytes); }; });
  });
}
// Photos saved by the first version kept their thumb on the record.
export function moveThumbOff(p, bytes) {
  const { thumb, ...rest } = p;
  return tx(['photos', 'thumbs'], 'readwrite', (t) => {
    t.objectStore('thumbs').put({ id: p.id, bytes });
    t.objectStore('photos').put(rest);
  }).then(() => rest);
}

export async function addPhoto(rec, full, thumb) {
  const r = stamp(rec);
  await tx(['photos', 'thumbs', 'files'], 'readwrite', (t) => {
    t.objectStore('photos').put(r);
    t.objectStore('thumbs').put({ id: r.id, bytes: thumb });
    t.objectStore('files').put({ id: r.id, full });
  });
  return r;
}
// Changes a few fields on one photo, whatever else has changed on it since.
export function patchPhoto(id, fields) {
  return tx(['photos'], 'readwrite', (t) => {
    const s = t.objectStore('photos');
    s.get(id).onsuccess = (e) => { if (e.target.result) s.put({ ...e.target.result, ...fields }); };
  });
}
export function savePhotos(list) {
  const out = list.map(stamp);
  return tx(['photos'], 'readwrite', (t, set) => { out.forEach((p) => t.objectStore('photos').put(p)); set(out); });
}
// Everything needed to put deleted photos back.
export async function keepForUndo(ids) {
  const [photos, boards] = await Promise.all([all('photos'), all('boards')]);
  const want = new Set(ids);
  const items = [];
  for (const p of photos.filter((x) => want.has(x.id))) {
    const f = (await one('files', p.id))?.full;
    items.push({ p, thumb: await getThumb(p.id), full: f instanceof Blob ? await f.arrayBuffer() : f });
  }
  return { items, boards: boards.filter((b) => b.pages.some((pg) => pg.images.some((im) => im && want.has(im.id)))) };
}
export function putBack({ items, boards }) {
  return tx(['photos', 'thumbs', 'files', 'boards'], 'readwrite', (t) => {
    for (const { p, thumb, full } of items) {
      t.objectStore('photos').put(p);
      if (thumb) t.objectStore('thumbs').put({ id: p.id, bytes: thumb });
      if (full) t.objectStore('files').put({ id: p.id, full });
    }
    for (const b of boards) t.objectStore('boards').put(b);
  });
}
// Also takes the photos off any board pages they're on.
export async function deletePhotos(ids) {
  const gone = new Set(ids);
  const boards = await all('boards');
  await tx(['photos', 'thumbs', 'files', 'boards'], 'readwrite', (t) => {
    for (const id of ids) { t.objectStore('photos').delete(id); t.objectStore('thumbs').delete(id); t.objectStore('files').delete(id); }
    for (const b of boards) {
      let changed = false;
      for (const p of b.pages) p.images = p.images.map((im) => { if (im && gone.has(im.id)) { changed = true; return null; } return im; });
      if (changed) t.objectStore('boards').put(stamp(b));
    }
  });
}
export function saveFolder(f) {
  const r = stamp(f);
  return tx(['folders'], 'readwrite', (t, set) => { t.objectStore('folders').put(r); set(r); });
}
// The folder goes; its photos stay (any left in no folder return to Incoming).
export async function deleteFolder(id) {
  const photos = (await all('photos')).filter((p) => p.folderIds.includes(id));
  await tx(['folders', 'photos'], 'readwrite', (t) => {
    t.objectStore('folders').delete(id);
    for (const p of photos) t.objectStore('photos').put(stamp({ ...p, folderIds: p.folderIds.filter((x) => x !== id) }));
  });
}
export function saveBoard(b) {
  const r = stamp(b);
  return tx(['boards'], 'readwrite', (t, set) => { t.objectStore('boards').put(r); set(r); });
}
// Puts a deleted folder back and its photos in it.
export function restoreFolder(f, photoIds) {
  return tx(['folders', 'photos'], 'readwrite', (t) => {
    t.objectStore('folders').put(f);
    const s = t.objectStore('photos');
    photoIds.forEach((id) => { s.get(id).onsuccess = (e) => { const p = e.target.result; if (p && !p.folderIds.includes(f.id)) s.put({ ...p, folderIds: [...p.folderIds, f.id] }); }; });
  });
}
export const listStickers = () => all('stickers');
export function saveSticker(s) {
  const r = stamp(s);
  return tx(['stickers'], 'readwrite', (t, set) => { t.objectStore('stickers').put(r); set(r); });
}
export const deleteSticker = (id) => tx(['stickers'], 'readwrite', (t) => { t.objectStore('stickers').delete(id); });
export const deleteBoard = (id) => tx(['boards'], 'readwrite', (t) => { t.objectStore('boards').delete(id); });
