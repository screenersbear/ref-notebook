// The board picker for The Eye's FROM REF (round 7, the-eye/16): Ref's
// boards as rows like Send to shoot's (the board's first photo, its name,
// its pages and day, a radio), and the button that sends the pick to the
// shoot. A board on that shoot already can't be picked again. Resolves the
// board's id, or null when closed.
import { openSheet } from './sheet.js';
import { esc } from './util.js';

const BOARD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>';

// boards: [{ id, name, line, photo, has }]
export function pickBoard({ shootName, boards }) {
  return new Promise((resolve) => {
    let answer = null;
    let pick = boards.find((x) => !x.has)?.id || null;
    const row = (x) => `
      <button type="button" class="send-shoot" role="radio" aria-checked="${x.id === pick}" data-board="${esc(x.id)}"${x.has ? ' aria-disabled="true"' : ''}>
        <span class="send-thumb">${x.photo ? `<img src="${esc(x.photo)}" alt="" />` : BOARD}</span>
        <span class="send-words"><span class="send-name">${esc(x.name)}</span><span class="send-line">${esc(x.line)}</span></span>
        <span class="send-radio" aria-hidden="true"></span>
      </button>`;
    const s = openSheet({
      title: 'From Ref',
      className: 'send-sheet',
      body: `
        <p class="send-lead">A board for "${esc(shootName)}" in The Eye. It stays live until the shoot happens.</p>
        ${boards.length ? '<span class="field-label choice-heading">Your boards</span>' : '<p class="send-lead">No boards in Ref yet.</p>'}
        <div class="send-list" role="radiogroup" aria-label="Board">${boards.map(row).join('')}</div>
        ${boards.length ? '<div class="sheet-actions one"><button type="button" class="btn primary" data-send></button></div>' : ''}`,
      onClose: () => resolve(answer),
    });
    const send = s.body.querySelector('[data-send]');
    const paint = () => {
      s.body.querySelectorAll('[data-board]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.board === pick)));
      if (!send) return;
      send.textContent = `Send to ${shootName}`;
      send.disabled = !pick;
    };
    paint();
    s.body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-board]');
      if (b && !b.hasAttribute('aria-disabled')) { pick = b.dataset.board; paint(); return; }
      if (e.target.closest('[data-send]') && pick) { answer = pick; s.close(); }
    });
  });
}
