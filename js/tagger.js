// Runs the worker that reads what's in each photo, by itself, whenever there
// are photos it hasn't seen. The first time downloads the model.
import * as db from './db.js';
import { lib, refresh } from './library.js';

const VERSION = 1;
const ON = 'ref-notebook-tags';
const BUSY = 'ref-notebook-tags-busy'; // set while the model is first loading
const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const del = (k) => { try { localStorage.removeItem(k); } catch {} };

export const scan = { state: 'off', done: 0, total: 0, pct: 0 };
const emit = (tagged = false) => window.dispatchEvent(new CustomEvent('ref-scan', { detail: { tagged } }));

let worker = null, running = false, nextId = 1;
const waiting = new Map();
const skip = new Set();
const todo = () => lib.photos.filter((p) => p.tagsV !== VERSION && !skip.has(p.id));
function ask(type, bytes) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    waiting.set(id, { resolve, reject });
    worker.postMessage({ id, type, bytes });
  });
}
const visible = () => new Promise((done) => {
  if (!document.hidden) return done();
  const on = () => { if (!document.hidden) { document.removeEventListener('visibilitychange', on); done(); } };
  document.addEventListener('visibilitychange', on);
});
// Put away while loading isn't the phone giving up.
document.addEventListener('visibilitychange', () => { if (document.hidden) del(BUSY); });

function fail(e) {
  console.error('Reading photos failed:', e);
  set(ON, 'failed');
  del(BUSY);
  scan.state = 'failed';
  worker?.terminate();
  worker = null;
  running = false;
  emit();
}

async function run() {
  if (running) return;
  if (!todo().length) { scan.state = 'done'; emit(); return; }
  running = true;
  scan.state = 'loading'; scan.pct = 0; scan.done = 0; scan.total = todo().length;
  emit();
  try {
    set(BUSY, '1');
    worker = new Worker(new URL('./tagger-worker.js', import.meta.url), { type: 'module' });
    worker.onerror = (e) => fail(e.message || 'worker error');
    worker.onmessage = ({ data }) => {
      if (data.progress !== undefined) { scan.pct = data.progress; emit(); return; }
      const w = waiting.get(data.id);
      if (!w) return;
      waiting.delete(data.id);
      if (data.ok) w.resolve(data); else w.reject(new Error(data.error));
    };
    await ask('load');
    scan.state = 'working';
    emit();
    let first = true;
    for (let p = todo()[0]; p; p = todo()[0]) {
      await visible();
      try {
        const bytes = await db.getThumb(p.id);
        if (!bytes) { skip.add(p.id); continue; }
        const { tags } = await ask('look', bytes.slice(0));
        await db.patchPhoto(p.id, { tags, tagsV: VERSION });
        const live = lib.photos.find((x) => x.id === p.id);
        if (live) { const i = lib.photos.indexOf(live); lib.photos[i] = { ...live, tags, tagsV: VERSION }; }
      } catch (e) {
        console.error(e);
        skip.add(p.id);
      }
      if (first) { del(BUSY); first = false; }
      scan.done++;
      scan.total = scan.done + todo().length;
      emit(scan.done % 4 === 0 || !todo().length);
    }
    worker.terminate();
    worker = null;
    running = false;
    scan.state = 'done';
    emit(true);
  } catch (e) {
    fail(e);
  }
}

export function turnOnTags() { set(ON, 'on'); del(BUSY); run(); }
// On opening, and after new photos come in.
export async function carryOn() {
  if (get(ON) === 'failed') { scan.state = 'failed'; emit(); return; }
  if (running) return;
  await refresh(); // the shut notebook hasn't loaded the photos yet
  if (get(BUSY)) { fail('the app closed while the model was loading'); return; } // it ran out of memory
  run();
}
