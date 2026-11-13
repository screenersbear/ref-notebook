// The board's tools bar: the layout sheet, adding a page, the page's menu
// (move, duplicate, delete) and saving the board as a PDF.
import { withTextDefaults } from '../components/textsize.js';
import { TEMPLATES, SHAPES, styleTemplate, defaultTemplate } from '../data/templates.js';
import { pageToCanvas } from '../components/board-page.js';
import { makePdf } from '../data/pdf.js';
import { openSheet } from '../components/sheet.js';
import { choiceSheet, confirmSheet } from '../components/dialogs.js';
import { toast, hideToast } from '../components/toast.js';
import { esc, clone, slug, canvasToBlob, downloadBlob } from '../components/util.js';

export function addTools(ed) {
  Object.assign(ed, { layoutSheet, addPage, moreSheet, exportPdf });
  // ---- Sheets ----
  function layoutSheet() {
    const s = SHAPES[ed.board.shape], W = 60, H = (60 * s.H) / s.W;
    const list = TEMPLATES[ed.board.shape].filter((t) => !t.guide);
    const sh = openSheet({
      title: 'Layout',
      body: `<div class="style-grid">${list.map((t) => `<button type="button" class="style${t.id === ed.page().template ? ' on' : ''}" data-tpl="${esc(t.id)}"><svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><rect class="paper-r" width="${W}" height="${H}"/>${t.slots.map((b) => `<rect x="${b.x * W}" y="${b.y * H}" width="${b.w * W}" height="${b.h * H}"/>`).join('')}</svg><span>${esc(t.name)}</span></button>`).join('')}</div>`,
    });
    sh.body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tpl]');
      if (!b) return;
      ed.snapshot();
      ed.page().template = b.dataset.tpl;
      ed.sel = -1;
      ed.persist(); sh.close(); ed.drawPage();
    });
  }
  function addPage() {
    ed.snapshot();
    const n = ed.at + 1;
    const tid = styleTemplate(ed.board.shape, ed.board.style, n) || defaultTemplate(ed.board.shape, 1).id;
    ed.board.pages.splice(n, 0, withTextDefaults({ template: tid, images: [], section: ed.page().section }));
    ed.persist();
    ed.goTo(n, 1);
    ed.drawPage(1);
  }
  async function moreSheet() {
    const key = await choiceSheet({
      title: `Page ${ed.at + 1}`,
      options: [
        ...(ed.at > 0 ? [{ key: 'up', label: 'Move earlier' }] : []),
        ...(ed.at < ed.board.pages.length - 1 ? [{ key: 'down', label: 'Move later' }] : []),
        { key: 'dup', label: 'Duplicate page' },
        ...(ed.board.pages.length > 1 ? [{ key: 'delete', label: 'Delete page', danger: true }] : []),
      ],
    });
    if (!key) return;
    if (key === 'delete' && !(await confirmSheet({ title: 'Delete this page?', message: 'Its photos stay in the notebook.', confirmLabel: 'Delete', danger: true }))) return;
    ed.snapshot();
    if (key === 'up' || key === 'down') {
      const j = key === 'up' ? ed.at - 1 : ed.at + 1;
      [ed.board.pages[ed.at], ed.board.pages[j]] = [ed.board.pages[j], ed.board.pages[ed.at]];
      ed.at = j;
    } else if (key === 'dup') {
      ed.board.pages.splice(ed.at + 1, 0, clone(ed.page()));
      ed.at += 1;
    } else {
      ed.board.pages.splice(ed.at, 1);
      ed.at = Math.min(ed.at, ed.board.pages.length - 1);
    }
    ed.sel = -1;
    ed.persist(); ed.drawPage(); ed.drawTray();
  }
  async function exportPdf() {
    const s = SHAPES[ed.board.shape];
    const px = ed.board.shape === 'wide-16x9' ? 2000 : 1700;
    const sheets = [];
    try {
      for (let i = 0; i < ed.board.pages.length; i++) {
        toast(`Making page ${i + 1} of ${ed.board.pages.length}`, { ms: 60000 });
        const c = await pageToCanvas(ed.board, ed.board.pages[i], px);
        sheets.push({ w: s.W * 72, h: s.H * 72, pxW: c.width, pxH: c.height, jpeg: await canvasToBlob(c, 'image/jpeg', 0.88) });
        c.width = c.height = 0;
      }
    } catch (e) {
      console.error(e);
      toast('Could not make the PDF');
      return;
    }
    hideToast();
    const blob = makePdf(sheets);
    const name = `${slug(ed.board.name)}.pdf`;
    const mb = (blob.size / 1048576).toFixed(1);
    // A new tap, because iOS won't open the share sheet after a long wait.
    const sh = openSheet({ title: 'Your PDF is ready', className: 'sheet-small', body: `<p class="sheet-message">${ed.board.pages.length} ${ed.board.pages.length === 1 ? 'page' : 'pages'}, ${mb} MB.</p><div class="sheet-actions one"><button type="button" class="btn primary" data-send>Save or share</button></div>` });
    sh.body.querySelector('[data-send]').addEventListener('click', async () => {
      const file = new File([blob], name, { type: 'application/pdf' });
      if (navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: ed.board.name }); } catch {}
      } else downloadBlob(blob, name);
      sh.close();
    });
  }
}
