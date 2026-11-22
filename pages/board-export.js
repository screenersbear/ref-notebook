// The board's Export (Starky, 21 Nov: images, not just a PDF). It asks which:
// IMAGES, each page a picture (saved to Photos or shared on a phone, a ZIP
// on a computer, as Layouts saves its slides), or a PDF, one file of them.
// Every page is drawn at full size from the photos, at its own size.
import { pageToCanvas } from '../components/board-page.js';
import { pageSize, exportWidth } from '../data/page-size.js';
import { makePdf } from '../data/pdf.js';
import { openSheet } from '../components/sheet.js';
import { choiceSheet } from '../components/dialogs.js';
import { toast, hideToast } from '../components/toast.js';
import { slug, canvasToBlob, downloadBlob } from '../components/util.js';

const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const shareable = (files) => { try { return !!navigator.canShare?.({ files }); } catch { return false; } };

export function addExport(ed) {
  Object.assign(ed, { exportBoard });

  async function exportBoard() {
    const n = ed.board.pages.length;
    const key = await choiceSheet({ title: 'Export', options: [
      { key: 'images', label: 'Images', detail: `${count(n, 'picture', 'pictures')}, one for each page. For Photos or to send` },
      { key: 'pdf', label: 'PDF', detail: 'One file of every page. To print or send' },
    ] });
    if (!key) return;
    await ed.persist.flush?.();
    const made = await drawPages(key === 'pdf' ? 0.88 : 0.92, key === 'pdf' ? 'PDF' : 'images');
    if (!made) return;
    if (key === 'pdf') ready(pdfFile(made), 'Your PDF is ready');
    else ready(made.map((m, i) => m.file(i)), 'Your images are ready');
  }

  // Each page as a JPEG: [{ blob, w, h (points), pxW, pxH, file(i) }], or null.
  async function drawPages(quality, word) {
    const out = [];
    const base = slug(ed.board.name);
    try {
      for (let i = 0; i < ed.board.pages.length; i++) {
        toast(`Making page ${i + 1} of ${ed.board.pages.length}`, { ms: 60000 });
        const page = ed.board.pages[i], s = pageSize(ed.board, page);
        const c = await pageToCanvas(ed.board, page, exportWidth(s));
        const blob = await canvasToBlob(c, 'image/jpeg', quality);
        out.push({ blob, w: s.W * 72, h: s.H * 72, pxW: c.width, pxH: c.height, file: (k) => new File([blob], `${base}-${String(k + 1).padStart(2, '0')}.jpg`, { type: 'image/jpeg' }) });
        c.width = c.height = 0;
      }
    } catch (e) {
      console.error(e);
      toast(`Could not make the ${word}`);
      return null;
    }
    hideToast();
    return out;
  }
  const pdfFile = (made) => [new File([makePdf(made.map((m) => ({ w: m.w, h: m.h, pxW: m.pxW, pxH: m.pxH, jpeg: m.blob })))], `${slug(ed.board.name)}.pdf`, { type: 'application/pdf' })];

  // A new tap to hand them over, because iOS won't open the share sheet after a long wait.
  function ready(files, title) {
    const mb = (files.reduce((t, f) => t + f.size, 0) / 1048576).toFixed(1);
    const pdf = files[0].type === 'application/pdf';
    const what = pdf ? count(ed.board.pages.length, 'page', 'pages') : count(files.length, 'image', 'images');
    const share = shareable(files);
    const label = share ? (pdf ? 'Save or share' : `Save ${files.length === 1 ? 'it' : `all ${files.length}`} or share`) : files.length > 1 ? `Download ${files.length} as ZIP` : 'Download';
    const sh = openSheet({ title, className: 'sheet-small', body: `<p class="sheet-message">${what}, ${mb} MB.</p><div class="sheet-actions one"><button type="button" class="btn primary" data-send>${label}</button></div>` });
    sh.body.querySelector('[data-send]').addEventListener('click', async () => {
      if (share) {
        try { await navigator.share({ files, title: ed.board.name }); } catch {}
      } else if (files.length === 1) downloadBlob(files[0], files[0].name);
      else downloadBlob(await zipFile(files), `${slug(ed.board.name)}.zip`);
      sh.close();
    });
  }
  // Several images as one ZIP, with the zip writer the backups use.
  async function zipFile(files) {
    const P = window.DFDataParts;
    const entries = [];
    for (const f of files) entries.push({ name: f.name, blob: f, crc: await P.crcOf(f) });
    return P.zipOf(entries);
  }
}
