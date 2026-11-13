// An option card (round 2, 07-new-board-layout): one choice of several,
// drawn by styles/option-cards.css. The new board guide and the Layout sheet.
import { esc } from './util.js';

// One choice of several: a card with a picture, a name and maybe a line
// under it, ringed when it's the one. attr is its data-* attribute.
export function cardHtml({ attr, on, picture = '', name, blurb = '' }) {
  return `<button type="button" class="opt-card" role="radio" aria-checked="${on}" ${attr}>${picture}<span class="opt-name">${esc(name)}</span>${blurb ? `<span class="opt-blurb">${esc(blurb)}</span>` : ''}</button>`;
}
