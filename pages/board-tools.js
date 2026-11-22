// The board's tools bar and the page's own buttons: the layout sheet, a new
// page (its layout picked first, as in Layouts: Starky, 21 Nov), deleting a
// page (its x, or More), and the page's menu (move, duplicate, delete, and
// Send to shoot for the whole board, so a board just made goes on from where
// it was made: refining round, 21 Nov). Export is in board-export.js.
import { withTextDefaults } from '../components/textsize.js';
import { pageSize, layoutsFor, nextSize } from '../data/page-size.js';
import { openSheet } from '../components/sheet.js';
import { choiceSheet, confirmSheet } from '../components/dialogs.js';
import { esc, clone } from '../components/util.js';
import { cardHtml } from '../components/option-card.js';
import { sendToShoot } from '../data/sendshoot.js';

// Send to shoot is left out while Mood boards is switched off (the shelf's HOW THEY CONNECT), as on Mood boards.
const sending = () => !window.DFConnect || window.DFConnect.connectOn('moodboards');

// A layout drawn small, for a page of this size.
function layoutPicture(size, t) {
  const W = 60, H = (60 * size.H) / size.W;
  return `<svg viewBox="0 0 ${W} ${H}" style="width:${size.W > size.H ? 80 : 60}px" aria-hidden="true"><rect class="paper-r" width="${W}" height="${H}"/>${t.slots.map((b) => `<rect x="${b.x * W}" y="${b.y * H}" width="${b.w * W}" height="${b.h * H}"/>`).join('')}</svg>`;
}

export function addTools(ed) {
  Object.assign(ed, { layoutSheet, addPage, deletePage, moreSheet });
  // The layouts for a page as cards (the one it has, on); first, any put
  // ahead of them ({ id, name, t }), with none on.
  const cards = (page, on, first = []) => {
    const size = pageSize(ed.board, page);
    const list = [...first, ...layoutsFor(ed.board, page).map((t) => ({ id: t.id, name: t.name, t }))];
    return `<div class="opt-cards" role="radiogroup" aria-label="Layout">${list.map((o, n) => cardHtml({
      attr: `data-tpl="${esc(o.id)}" data-n="${n}"`, on: !first.length && o.id === on,
      picture: layoutPicture(size, o.t), name: o.name,
    })).join('')}</div>`;
  };
  // ---- Sheets ----
  function layoutSheet() {
    const sh = openSheet({ title: 'Layout', body: cards(ed.page(), ed.page().template) });
    sh.body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tpl]');
      if (!b) return;
      ed.snapshot();
      ed.page().template = b.dataset.tpl;
      ed.sel = -1;
      ed.persist(); sh.close(); ed.drawPage();
    });
  }
  // ADD A PAGE: which layout first (like this page, or any), then the page,
  // after the one on screen. An imported board's new page is this page's size.
  function addPage() {
    const cur = ed.page();
    const size = nextSize(ed.board, cur);
    const probe = size ? { size, images: [] } : { images: [] };
    const like = layoutsFor(ed.board, probe).find((t) => t.id === cur.template) || layoutsFor(ed.board, probe)[0];
    const n = ed.at + 1;
    const sh = openSheet({ title: 'New page', body: cards(probe, null, [{ id: like.id, name: 'Like this page', t: like }]) });
    sh.body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tpl]');
      if (!b) return;
      ed.snapshot();
      const page = withTextDefaults({ template: b.dataset.tpl, images: [], section: cur.section, ...(size ? { size } : {}) });
      ed.board.pages.splice(n, 0, page);
      ed.persist(); sh.close();
      ed.goTo(n, 1);
    });
  }
  // The page's x (or More, Delete page): asks first, and Undo brings it back.
  async function deletePage() {
    if (ed.board.pages.length < 2) return;
    if (!(await confirmSheet({ title: `Delete page ${ed.at + 1}?`, message: 'Its photos stay in the notebook.', confirmLabel: 'Delete', danger: true }))) return;
    ed.snapshot();
    ed.board.pages.splice(ed.at, 1);
    ed.at = Math.min(ed.at, ed.board.pages.length - 1);
    ed.sel = -1; ed.tsel = null; ed.closePanel();
    ed.persist(); ed.drawPage(); ed.drawTray();
  }
  async function moreSheet() {
    const key = await choiceSheet({
      title: `Page ${ed.at + 1}`,
      options: [
        ...(ed.at > 0 ? [{ key: 'up', label: 'Move earlier' }] : []),
        ...(ed.at < ed.board.pages.length - 1 ? [{ key: 'down', label: 'Move later' }] : []),
        { key: 'dup', label: 'Duplicate page' },
        ...(ed.board.pages.length > 1 ? [{ key: 'delete', label: 'Delete page', danger: true }] : []),
        ...(sending() ? [{ key: 'send', label: 'Send to shoot' }] : []),
      ],
    });
    if (!key) return;
    if (key === 'send') { await ed.persist.flush(); await sendToShoot(ed.board); return; }
    if (key === 'delete') { await deletePage(); return; }
    ed.snapshot();
    if (key === 'up' || key === 'down') {
      const j = key === 'up' ? ed.at - 1 : ed.at + 1;
      [ed.board.pages[ed.at], ed.board.pages[j]] = [ed.board.pages[j], ed.board.pages[ed.at]];
      ed.at = j;
    } else if (key === 'dup') {
      ed.board.pages.splice(ed.at + 1, 0, clone(ed.page()));
      ed.at += 1;
    }
    ed.sel = -1;
    ed.persist(); ed.drawPage(); ed.drawTray();
  }
}
