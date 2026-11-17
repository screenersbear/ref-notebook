// A PDF's pages as photos, for IMPORT on Mood boards (round 3,
// ref/08-new-and-import): each page drawn on the phone with pdf.js (lib/,
// loaded the first time a PDF comes in; nothing is uploaded), its long side
// 2400 px like every photo Ref keeps, as a JPEG file for the usual import
// (data/photos.js). One page at a time, so a phone never holds more.
import { canvasToBlob } from '../components/util.js';
import { baseName } from './import-board.js';

const LONG_SIDE = 2400;
let loading = null;

// pdf.js, from lib/ (its worker beside it), the same one every time.
function pdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  loading ||= new Promise((resolve, reject) => {
    const tag = document.createElement('script');
    tag.src = 'lib/pdf.min.js';
    tag.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    };
    tag.onerror = () => { loading = null; tag.remove(); reject(new Error("The PDF reader didn't load")); };
    document.head.appendChild(tag);
  });
  return loading;
}

// Resolves { files, wide }: a JPEG file for each page, first page first,
// and whether the first page is wider than it is tall. onPage(n, of) before
// each page is drawn.
export async function pdfPageFiles(file, onPage) {
  const lib = await pdfJs();
  // isEvalSupported off: a PDF from anywhere can't run its own code here.
  const doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
  const files = [];
  let wide = false;
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      if (onPage) onPage(n, doc.numPages);
      const page = await doc.getPage(n);
      const plain = page.getViewport({ scale: 1 });
      if (n === 1) wide = plain.width > plain.height;
      const vp = page.getViewport({ scale: LONG_SIDE / Math.max(plain.width, plain.height) });
      const c = document.createElement('canvas');
      c.width = Math.round(vp.width);
      c.height = Math.round(vp.height);
      const ctx = c.getContext('2d');
      // A page with nothing behind it is white, not black, once it's a JPEG.
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, c.width, c.height);
      // Drawn as for printing: the screen's way waits on the next frame,
      // which never comes while the app is in the background.
      await page.render({ canvasContext: ctx, viewport: vp, intent: 'print' }).promise;
      const blob = await canvasToBlob(c, 'image/jpeg', 0.92);
      c.width = c.height = 0; // iOS has a small budget for canvases
      page.cleanup();
      files.push(new File([blob], `${baseName(file.name)} ${n}.jpg`, { type: 'image/jpeg' }));
    }
  } finally {
    doc.destroy();
  }
  return { files, wide };
}
