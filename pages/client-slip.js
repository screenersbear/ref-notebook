// A yes from Rounds on Mood boards (round 2, connect/06): one slip at the
// top, FROM ROUNDS, "Dana Ortiz said yes", their photo, handle and pitch
// day, then START THE BOARD (a board named for them: data/client-board.js)
// or NOT NOW, which tucks it away: the offer stays in Options, under
// Boards, until the board's started. Rounds' OPEN (?client=<link id>)
// starts it too, or opens it once it's there.
import * as db from '../data/db.js';
import { clientSlip, clientBoard, offersOf } from '../data/client-board.js';
import { esc } from '../components/util.js';

const D = () => window.DFData;
const C = () => window.DFConnect;
const ready = () => !!(D() && C() && D().linksWhere);

// The yeses whose board isn't started (offers), newest first.
export async function clientOffers() {
  if (!ready()) return [];
  return offersOf(await D().linksWhere({ toApp: 'ref', type: 'new-client' })).reverse();
}

// Their photo, as Rounds passed it on ('' for none), as an address kept in urls.
async function photoUrl(link, urls) {
  const pics = await D().linkPictures(link.id).catch(() => null);
  const url = pics && pics.cover ? D().pictureUrl(pics.cover) : '';
  if (url) urls.push(url);
  return url;
}

// Every slip waiting here, as markup (photo addresses go in urls).
export async function clientSlipsHtml(urls) {
  if (!ready()) return '';
  const waiting = (await C().slipsFor('ref')).filter((l) => l.type === 'new-client' && !l.toId);
  const out = [];
  for (const link of waiting) {
    const w = clientSlip(link);
    const url = await photoUrl(link, urls);
    out.push(C().slipHtml({
      link,
      title: w.title,
      line: w.line,
      body: `<div class="ref-slip-who"><span class="ref-slip-photo" aria-hidden="true">${url ? `<img src="${url}" alt="" />` : ''}</span>
        <span class="ref-slip-words">${w.handle ? `<span class="ref-slip-handle">${esc(w.handle)}</span>` : ''}${w.when ? `<span class="ref-slip-when">${esc(w.when)}</span>` : ''}</span></div>`,
      main: 'Start the board',
    }));
  }
  return out.join('');
}

// The board for a yes: made once (the link keeps its id), then opened.
// shape: the default page size (Options).
export async function startClientBoard(linkId, shape) {
  const link = await D().getLink(linkId);
  if (!link) return null;
  const had = link.toId ? await db.getBoard(link.toId) : null;
  const board = had || (await db.saveBoard(clientBoard(link, shape)));
  if (!had || !link.openedAt) await D().saveLink({ ...link, toId: board.id, openedAt: link.openedAt || D().nowIso() });
  location.hash = `#/board/${encodeURIComponent(board.id)}`;
  return board;
}

// START THE BOARD, or NOT NOW (tucked away; the offer stays in Options).
export function wireClientSlips(root, redraw, shape) {
  root.querySelectorAll('.df-slip[data-slip]').forEach((slip) => slip.addEventListener('click', async (e) => {
    const go = e.target.closest('[data-slip-open]');
    if (!go && !e.target.closest('[data-slip-later]')) return;
    if (go) { await startClientBoard(slip.dataset.slip, shape); return; }
    const link = await D().getLink(slip.dataset.slip);
    if (link) await C().tuckSlip(link);
    slip.remove();
    redraw();
  }));
}
