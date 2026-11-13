// The Send to shoot sheet (round 2, 02-send-to-shoot): what sending does,
// The Eye's upcoming shoots as rows (the shoot's photo, its name, the day
// and its status, a radio), New shoot from this board, and the button that
// names the pick. Resolves the shoot's id, '+new', or null when closed.
// A shoot that has the board already can't be picked again.
import { openSheet } from './sheet.js';
import { esc } from './util.js';

const line = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const PLUS = line('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>');
const CAMERA = line('<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>');

// shoots: [{ id, name, line, photo, has }]
export function pickShoot({ boardName, shoots }) {
  return new Promise((resolve) => {
    let answer = null;
    let pick = shoots.find((x) => !x.has)?.id || null;
    const row = (x) => `
      <button type="button" class="send-shoot" role="radio" aria-checked="${x.id === pick}" data-shoot="${esc(x.id)}"${x.has ? ' aria-disabled="true"' : ''}>
        <span class="send-thumb">${x.photo ? `<img src="${esc(x.photo)}" alt="" />` : CAMERA}</span>
        <span class="send-words"><span class="send-name">${esc(x.name)}</span><span class="send-line">${esc(x.line)}</span></span>
        <span class="send-radio" aria-hidden="true"></span>
      </button>`;
    const s = openSheet({
      title: 'Send to shoot',
      className: 'send-sheet',
      body: `
        <p class="send-lead">"${esc(boardName)}" goes to the shoot and stays live until the shoot happens.</p>
        ${shoots.length ? '<span class="field-label choice-heading">Upcoming in The Eye</span>' : '<p class="send-lead">No shoots coming up in The Eye.</p>'}
        <div class="send-list" role="radiogroup" aria-label="Shoot">${shoots.map(row).join('')}</div>
        <button type="button" class="send-new" data-new><span class="send-plus">${PLUS}</span>New shoot from this board</button>
        ${shoots.length ? '<div class="sheet-actions one"><button type="button" class="btn primary" data-send></button></div>' : ''}`,
      onClose: () => resolve(answer),
    });
    const send = s.body.querySelector('[data-send]');
    const paint = () => {
      s.body.querySelectorAll('[data-shoot]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.shoot === pick)));
      if (!send) return;
      const x = shoots.find((y) => y.id === pick);
      send.textContent = x ? `Send to ${x.name}` : 'Send';
      send.disabled = !x;
    };
    paint();
    s.body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-shoot]');
      if (b && !b.hasAttribute('aria-disabled')) { pick = b.dataset.shoot; paint(); return; }
      if (e.target.closest('[data-new]')) { answer = '+new'; s.close(); return; }
      if (e.target.closest('[data-send]') && pick) { answer = pick; s.close(); }
    });
  });
}
