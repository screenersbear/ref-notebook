// People's photos from The Eye (Starky, 21 Nov: someone added to a shoot in
// The Eye showed up in Ref's Who it's for without their photo). Ref took
// photos only from Rounds; The Eye keeps a talent's photo in its own
// database (starky-moodboards, under '<shoot id>__talent_<talent id>'), so
// Ref reads it there too, the way Rounds does (rounds/data/eye.js), and
// never changes it. Unit tested: tests/unit/ref/eye-faces.test.mjs.

const EYE_PHOTOS = 'starky-moodboards';
const text = (v) => (typeof v === 'string' ? v.trim() : '');
const handleOn = (list, platform) => text(((Array.isArray(list) ? list : []).find((h) => h && h.platform === platform) || {}).handle).replace(/^@/, '');

// Every talent with a photo place, newest shoot first:
// [{ who: { name, instagram, tiktok }, key }].
export function talentKeys(shoots) {
  const list = (Array.isArray(shoots) ? shoots : []).filter((s) => s && text(s.id) && Array.isArray(s.talents));
  const when = (s) => text(s.date) || text(s.updatedAt) || '';
  const out = [];
  for (const s of [...list].sort((a, b) => when(b).localeCompare(when(a)))) {
    for (const t of s.talents) {
      if (!t || !text(t.id)) continue;
      const who = { name: text(t.name), instagram: handleOn(t.socialHandles, 'instagram'), tiktok: handleOn(t.socialHandles, 'tiktok') };
      if (who.name || who.instagram || who.tiktok) out.push({ who, key: `${s.id}__talent_${t.id}` });
    }
  }
  return out;
}

// The pictures kept under these keys, as The Eye keeps them (a list whose
// first is the picture, or its { src }): Map key -> address, the ones with
// none left out. Opened the way The Eye opens it (version 1, its one store),
// so it's never left without that store if Ref happens to open it first.
export function readEyePhotos(keys, idb = globalThis.indexedDB) {
  return new Promise((done) => {
    const out = new Map();
    const want = [...new Set((Array.isArray(keys) ? keys : []).filter((k) => text(k)))];
    if (!want.length || !idb) { done(out); return; }
    let req;
    try { req = idb.open(EYE_PHOTOS, 1); } catch { done(out); return; }
    req.onupgradeneeded = () => req.result.createObjectStore('images');
    req.onerror = () => done(out);
    req.onblocked = () => done(out);
    req.onsuccess = () => {
      const db = req.result;
      try {
        const store = db.transaction('images').objectStore('images');
        let left = want.length;
        const one = () => { left -= 1; if (!left) { db.close(); done(out); } };
        for (const k of want) {
          const get = store.get(k);
          get.onsuccess = () => {
            const v = get.result;
            const first = Array.isArray(v) ? v[0] : null;
            const src = typeof first === 'string' ? first : first && typeof first.src === 'string' ? first.src : '';
            if (src) out.set(k, src);
            one();
          };
          get.onerror = one;
        }
      } catch { db.close(); done(out); }
    };
  });
}

// Each person in records with a photo in The Eye and none in have: Map
// person id -> address. find: DFData.findPerson.
export async function eyeFaces(records, shoots, find, have = new Map(), read = readEyePhotos) {
  const keyOf = new Map();
  for (const { who, key } of talentKeys(shoots)) {
    const r = find(records, who);
    if (r && !have.has(r.id) && !keyOf.has(r.id)) keyOf.set(r.id, key);
  }
  const got = await read([...keyOf.values()]);
  const out = new Map();
  for (const [person, key] of keyOf) if (got.has(key)) out.set(person, got.get(key));
  return out;
}
