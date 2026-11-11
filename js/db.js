// Storage. The only file that knows about IndexedDB.
//
//   photos   one record per photo: details, folderIds, favorite, small thumb
//   files    the big picture for each photo, kept apart so lists stay light
//   folders  your folders. Incoming isn't stored: it's photos in no folder
//   boards   mood boards and their pages
//   meta     small settings
import { uuid, nowISO } from './util.js';

const DB_NAME = 'ref-notebook';
const STORES = ['photos', 'files', 'folders', 'boards', 'meta'];
const KEY = { meta: 'key' };

let dbPromise = null;
function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
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
    t.onerror = () => reject(t.error);
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
export const getFile = async (id) => (await one('files', id))?.full;

export async function addPhoto(rec, full) {
  const r = stamp(rec);
  await tx(['photos', 'files'], 'readwrite', (t) => {
    t.objectStore('photos').put(r);
    t.objectStore('files').put({ id: r.id, full });
  });
  return r;
}
export function savePhotos(list) {
  const out = list.map(stamp);
  return tx(['photos'], 'readwrite', (t, set) => { out.forEach((p) => t.objectStore('photos').put(p)); set(out); });
}
// Also takes the photos off any board pages they're on.
export async function deletePhotos(ids) {
  const gone = new Set(ids);
  const boards = await all('boards');
  await tx(['photos', 'files', 'boards'], 'readwrite', (t) => {
    for (const id of ids) { t.objectStore('photos').delete(id); t.objectStore('files').delete(id); }
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
export const deleteBoard = (id) => tx(['boards'], 'readwrite', (t) => { t.objectStore('boards').delete(id); });
