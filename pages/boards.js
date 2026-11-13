// Mood boards: every mood board on one page that scrolls.
import * as db from '../data/db.js';
import { lib, thumbUrl, photoById } from '../data/library.js';
import { remember, undoLast } from '../components/undo.js';
import { sendToShoot, boardShoots, keepUp } from '../data/sendshoot.js';
import { choiceSheet, confirmSheet, promptSheet } from '../components/dialogs.js';
import { toast } from '../components/toast.js';
import { ICONS } from '../components/icons.js';
import { esc, shortDate } from '../components/util.js';

export async function boardsScreen(view) {
  const boards = await db.listBoards();
  const onShoots = await boardShoots().catch(() => ({})); // inside Documenting Fictions: the shoots each board was sent to
  const firstPhoto = (b) => b.pages.flatMap((p) => p.images).map((im) => im && photoById(im.id)).find(Boolean);
  view.innerHTML = `
    <div class="screen">
      ${window.DF_SUITE ? `<h1 class="head head-add"><button type="button" class="icon-btn head-plus head-menu" data-app-menu aria-label="Menu">${ICONS.menu}</button>Mood boards</h1>` : '<h1 class="head">Mood boards</h1>'}
      <div class="scroll rows">
        ${boards.map((b) => { const p = firstPhoto(b); return `
          <div class="row" data-b>
            <a class="row-open" href="#/board/${esc(b.id)}">
              <span class="thumb">${p ? `<img src="${thumbUrl(p)}" alt="" />` : ''}</span>
              <span class="row-text"><span class="row-name">${esc(b.name)}</span><span class="row-meta">${b.pages.length} ${b.pages.length === 1 ? 'page' : 'pages'}, ${esc(shortDate(b.updatedAt))}</span>${onShoots[b.id] ? `<span class="row-meta row-shoots">For ${esc(onShoots[b.id].join(', '))}</span>` : ''}</span>
            </a>
            <button type="button" class="icon-btn" data-more="${esc(b.id)}" aria-label="More for ${esc(b.name)}">${ICONS.more}</button>
          </div>`; }).join('')}
        <a class="row row-open" href="#/new"><span class="thumb add">${ICONS.plus}</span><span class="row-name">New board</span></a>
        ${!lib.photos.length ? '<p class="note">Start in <a href="#/folder/incoming">Incoming</a>: bring in the photos you want to work with, then make a board from them.</p>' : ''}
      </div>
    </div>`;
  view.querySelectorAll('[data-more]').forEach((btn) => btn.addEventListener('click', async () => {
    const b = boards.find((x) => x.id === btn.dataset.more);
    const key = await choiceSheet({ title: b.name, options: [{ key: 'send', label: 'Send to shoot' }, { key: 'rename', label: 'Rename' }, { key: 'delete', label: 'Delete', danger: true }] });
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
