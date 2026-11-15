// Finals from The Eye (round 2, connect/18). When finals are sent from a
// shoot in The Eye (Send finals to Ref?), they wait as a 'finals-ref' link
// in df-links with their pictures and the tags picked there. Ref brings them
// in the next time it opens, as it brings in photos from the phone (a big
// copy and a small thumb, its colours read; what's in them is found as
// usual, data/tagger.js), filed under each of those tags: Ref's own tag of
// that name, or a new one. Then the link keeps when they came in, and its
// pictures are let go, as the photos are Ref's own now.
import * as db from './db.js';
import { importFiles } from './photos.js';

const D = () => window.DFData;

// The tags by name, as ids: Ref's own of that name (whatever its case), or new ones.
export async function tagIds(names) {
  const folders = await db.listFolders();
  const ids = [];
  for (const name of names || []) {
    const n = String(name ?? '').trim();
    if (!n) continue;
    let f = folders.find((x) => String(x.name || '').trim().toLowerCase() === n.toLowerCase());
    if (!f) { f = await db.saveFolder({ name: n }); folders.push(f); }
    if (!ids.includes(f.id)) ids.push(f.id);
  }
  return ids;
}

// Brings in every send still waiting. Resolves how many photos came in.
export async function takeFinals() {
  if (!D() || !D().inSuite() || !D().linksWhere) return 0;
  const waiting = (await D().linksWhere({ toApp: 'ref', type: 'finals-ref' })).filter((l) => !l.importedAt);
  let n = 0;
  for (const l of waiting) {
    const pics = await D().linkPictures(l.id);
    const files = ((pics && pics.photos) || []).map((p, i) => new File([p.bytes], `${p.name || `Final ${i + 1}`}.jpg`, { type: p.type || 'image/jpeg' }));
    const { photos } = await importFiles(files);
    const ids = await tagIds(l.tags);
    if (photos.length && ids.length) await db.savePhotos(photos.map((p) => ({ ...p, folderIds: ids })));
    await D().saveLink({ ...l, importedAt: D().nowIso(), photoIds: photos.map((p) => p.id) }, { photos: [] });
    n += photos.length;
  }
  return n;
}
