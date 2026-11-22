// Photos picked on the phone, brought into the notebook (Incoming, the usual
// way: data/photos.js, their colours now, what's in them soon after). Ref's
// one way in from the phone: a tag's page, Tags, the first visit and a
// board's + PHOTOS. Resolves { photos, failed }.
import { importFiles } from '../data/photos.js';
import { refresh } from '../data/library.js';
import { carryOn } from '../data/tagger.js';
import { toast } from './toast.js';

export const addedWords = (r) => (r.failed.length ? `${r.photos.length} added, ${r.failed.length} could not be read` : `${r.photos.length} ${r.photos.length === 1 ? 'photo' : 'photos'} added`);

// say: show how many came in (or leave the words to the caller).
export async function bringIn(files, { say = true } = {}) {
  if (!files || !files.length) return { photos: [], failed: [] };
  try { await navigator.storage?.persist?.(); } catch {}
  const r = await importFiles(files, (n, total) => toast(`Bringing in ${n} of ${total}`, { ms: 60000 }));
  await refresh();
  carryOn();
  if (say) toast(addedWords(r));
  return r;
}
