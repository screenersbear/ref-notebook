// The band on top of Mood boards and Tags (round 2, DESIGN.md 9.1): the
// title in the partner colour, its two ring buttons (the notebooks button,
// only in the suite, and Options: 14 Nov, adding sits beside its list), the
// rising mark (the 2 x 2 board turned 45 degrees and cut by the band's foot,
// a peak 80 x 40: 14 Nov), and the label line: where you are, a hairline,
// today's date.
import { esc } from './util.js';

const ring = (label, attr, svg) => `<button type="button" class="ring-btn" ${attr} aria-label="${label}"><span>${svg}</span></button>`;
const line = (d) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const BOOKS = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="4.5" height="14" rx="1"/><rect x="9.5" y="3" width="4.5" height="16" rx="1"/><path d="M16 6.2l3.6-1 3 12.6-3.6 1z"/></svg>';
const MENU = line('<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>');
const MARK = '<svg class="band-mark" viewBox="0 0 80 40" aria-hidden="true"><g transform="translate(40 40) rotate(45) scale(1.41) translate(-20 -20)"><rect width="20" height="20" class="mk-p"/><rect x="20" width="20" height="20" class="mk-w"/><rect y="20" width="20" height="20" class="mk-w"/><rect x="20" y="20" width="20" height="20" class="mk-p"/></g></svg>';

// FRI 13 NOV (the capitals are the band's).
export const bandDate = (d = new Date()) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '');

// title: the band's big word; place: the label line's.
export function bandHtml({ title, place }) {
  return `
    <header class="band">
      <h1 class="band-title">${esc(title)}</h1>
      <div class="band-btns">${ring('Back to your notebooks', 'data-books', BOOKS)}${ring('Options', 'data-app-menu', MENU)}</div>
      ${MARK}
      <p class="band-line"><b>${esc(place)}</b><span class="band-rule"></span><span class="band-date">${bandDate()}</span></p>
    </header>`;
}

// The band's own button: the notebooks button shuts the notebook (inside
// the suite, back to the shelf). Options is app.js's ([data-app-menu]).
export function wireBand(view) {
  view.querySelector('[data-books]')?.addEventListener('click', () => { location.hash = '#/'; });
}

export const BACK = line('<polyline points="15 5 8 12 15 19"/>');
export const CLOSE = line('<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>');
export const FULL = line('<polyline points="4 9 4 4 9 4"/><polyline points="20 9 20 4 15 4"/><polyline points="4 15 4 20 9 20"/><polyline points="20 15 20 20 15 20"/>');
const MORE = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/></svg>';
// The short band on a page inside a section (a tag, a board, the new board
// guide): back, the name on the hairline, and a ring at the right.
//   back: where Back goes (a link), or backAttr: Back is a button with it;
//   more: the ... menu's name (none for Incoming, Favorites and All photos);
//   end: another ring at the right instead, { label, attr, svg }.
export function shortBandHtml({ name, back = '', backAttr = '', backLabel = 'Back', more = '', end = null }) {
  const left = backAttr ? ring(backLabel, backAttr, BACK) : `<a class="ring-btn" href="${back}" aria-label="${esc(backLabel)}"><span>${BACK}</span></a>`;
  const right = end ? ring(end.label, end.attr, end.svg) : more ? ring(more, 'data-band-more', MORE) : '<span class="ring-btn" aria-hidden="true"></span>';
  return `
    <header class="band band-short">
      ${left}
      <p class="band-line"><b>${esc(name)}</b><span class="band-rule"></span></p>
      ${right}
    </header>`;
}
