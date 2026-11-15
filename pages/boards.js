// Mood boards: every mood board on one page that scrolls, each a big cover
// (its first photo) with its name, pages, date and the shoots it's on (or,
// for a client's board not sent yet, their handle). A yes from Rounds shows
// as a slip at the top (pages/client-slip.js). Send to shoot is left out
// while Mood boards is switched off (the shelf's HOW THEY CONNECT).
import * as db from '../data/db.js';
import { lib, thumbUrl, photoById } from '../data/library.js';
import { remember, undoLast } from '../components/undo.js';
import { sendToShoot, boardShoots, keepUp } from '../data/sendshoot.js';
import { choiceSheet, confirmSheet, promptSheet } from '../components/dialogs.js';
import { toast } from '../components/toast.js';
import { ICONS } from '../components/icons.js';
import { esc, shortDate } from '../components/util.js';
import { bandHtml, wireBand } from '../components/band.js';
import { clientSlipsHtml, wireClientSlips } from './client-slip.js';
import { defaultShape } from './options.js';

const sending = () => !window.DFConnect || window.DFConnect.connectOn('moodboards');
let slipUrls = [];

export async function boardsScreen(view) {
  const boards = await db.listBoards();
  const onShoots = await boardShoots().catch(() => ({})); // inside Documenting Fictions: the shoots each board was sent to
  slipUrls.forEach((u) => URL.revokeObjectURL(u));
  slipUrls = [];
  const slips = await clientSlipsHtml(slipUrls).catch(() => '');
  const firstPhoto = (b) => b.pages.flatMap((p) => p.images).map((im) => im && photoById(im.id)).find(Boolean);
  const card = (b) => {
    const p = firstPhoto(b);
    const href = `#/board/${esc(b.id)}`;
    const shoots = (onShoots[b.id] || []).map((s) => `<span class="flag">For ${esc(s)}</span>`).join('');
    const c = b.client || {};
    const who = c.handle ? `<span class="flag flag-handle">@${esc(c.handle)}</span>` : c.personId && c.name ? `<span class="flag">For ${esc(c.name)}</span>` : ''; // for someone, on no shoot yet
    const flags = shoots || who;
    return `
      <div class="board-card" data-b>
        <a class="card-cover" href="${href}" aria-label="Open ${esc(b.name)}">${p ? `<img src="${thumbUrl(p)}" alt="" />` : ''}</a>
        <div class="card-info">
          <a class="card-words" href="${href}">
            <span class="card-name">${esc(b.name)}</span>
            <span class="card-meta">${b.pages.length} ${b.pages.length === 1 ? 'page' : 'pages'} · ${esc(shortDate(b.updatedAt))}</span>
            ${flags ? `<span class="flags">${flags}</span>` : ''}
          </a>
          <button type="button" class="icon-btn card-more" data-more="${esc(b.id)}" aria-label="More for ${esc(b.name)}">${ICONS.more}</button>
        </div>
      </div>`;
  };
  view.innerHTML = `
    <div class="screen has-band">
      <div class="scroll">
        ${bandHtml({ title: 'Ref', place: 'Mood boards' })}
        ${slips}
        <div class="list-head"><h2>Boards <span>${boards.length}</span></h2><a class="list-act" href="#/new">${ICONS.plus}New board</a></div>
        <div class="list-rule"></div>
        ${boards.map(card).join('')}
        ${!lib.photos.length ? '<p class="note">Start in <a href="#/folder/incoming">Incoming</a>: bring in the photos you want to work with, then make a board from them.</p>' : ''}
      </div>
    </div>`;
  wireBand(view);
  wireClientSlips(view, () => boardsScreen(view), defaultShape());
  view.querySelectorAll('[data-more]').forEach((btn) => btn.addEventListener('click', async () => {
    const b = boards.find((x) => x.id === btn.dataset.more);
    const key = await choiceSheet({ title: b.name, options: [...(sending() ? [{ key: 'send', label: 'Send to shoot' }] : []), { key: 'rename', label: 'Rename' }, { key: 'delete', label: 'Delete', danger: true }] });
    if (key === 'send') {
      await sendToShoot(b);
      if ((location.hash || '') === '#/boards') boardsScreen(view);
    } else if (key === 'rename') {
      const name = await promptSheet({ title: 'Rename board', value: b.name });
      if (name) { await db.saveBoard({ ...b, name }); boardsScreen(view); keepUp(b.id); }
    } else if (key === 'delete') {
      if (await confirmSheet({ title: 'Delete this board?', message: `<b>${esc(b.name)}</b> will be gone. Its photos stay in the notebook.`, confirmLabel: 'Delete', danger: true })) {
        await db.deleteBoard(b.id);
        boardsScreen(view);
        const back = async () => { await db.saveBoard(b); };
        remember('deleting a board', back);
        toast('Board deleted', { action: { label: 'Undo', run: () => undoLast().then(() => boardsScreen(view)) } });
      }
    }
  }));
}
