// IMPORT on Mood boards (round 3, ref/08-new-and-import): a board from a PDF
// (each page a page of the board) or from photos picked on the phone.
// Everything picked comes in as photos the usual way (data/photos.js: their
// colours now, what's in them soon after), then New board asks for the
// rest (pages/newboard.js): a PDF's board its name and who it's for, a
// board of photos its layout too.
import { importFiles, pickFiles } from '../data/photos.js';
import { pdfPageFiles } from '../data/pdf-pages.js';
import { isPdf, pdfShape, failedWords } from '../data/import-board.js';
import { refresh } from '../data/library.js';
import { carryOn } from '../data/tagger.js';
import { toast, hideToast } from '../components/toast.js';

let waiting = null; // what New board starts from: { ids, pdf, shape }

// New board takes what's waiting (once).
export function takeImport() {
  const w = waiting;
  waiting = null;
  return w;
}

export async function importBoard() {
  const files = await pickFiles(true, 'image/*,application/pdf,.pdf'); // straight from the tap, or iOS blocks it
  if (!files.length) return;
  try { await navigator.storage?.persist?.(); } catch {}
  const pdf = files.find(isPdf) || null;
  const photos = [];
  let wide = false;
  for (const f of files) {
    if (!isPdf(f)) { photos.push(f); continue; }
    try {
      const got = await pdfPageFiles(f, (n, of) => toast(`Getting page ${n} of ${of} ready`, { ms: 60000 }));
      if (f === pdf) wide = got.wide;
      photos.push(...got.files);
    } catch (e) {
      console.error(e);
      toast(`${f.name || 'That PDF'} couldn't be opened. Is it a PDF without a password?`);
      return;
    }
  }
  const r = await importFiles(photos, (n, total) => toast(`Bringing in ${n} of ${total}`, { ms: 60000 }));
  await refresh();
  if (r.failed.length) toast(failedWords(r.failed.length));
  else hideToast();
  if (!r.photos.length) return;
  carryOn();
  waiting = { ids: r.photos.map((p) => p.id), pdf: pdf ? pdf.name : null, shape: pdf ? pdfShape(wide) : null };
  location.hash = '#/new';
}
