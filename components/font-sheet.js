// Picking the font for a board's titles or its text (data/board-fonts.js):
// each one's name written in itself, the one in use ticked. Resolves the
// font's id, or null when closed.
import { openSheet } from './sheet.js';
import { BOARD_FONTS } from '../data/board-fonts.js';
import { esc } from './util.js';

export function fontSheet({ title, current }) {
  return new Promise((resolve) => {
    let answer = null;
    const s = openSheet({
      title,
      className: 'sheet-small',
      body: `<p class="sheet-message">For every page of this board.</p>
        <div class="choice-list font-list">${BOARD_FONTS.map((f) => `<button type="button" class="choice${f.id === current ? ' current' : ''}" data-font="${esc(f.id)}"><span class="choice-text"><span class="choice-label" style="font-family:${esc(f.stack)}">${esc(f.name)}</span></span></button>`).join('')}</div>`,
      onClose: () => resolve(answer),
    });
    s.body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-font]');
      if (!b) return;
      answer = b.dataset.font;
      s.close();
    });
  });
}
