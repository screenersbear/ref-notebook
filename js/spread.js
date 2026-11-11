// The notebook lies open on two pages with a fold between them: Mood boards
// on the left, Tags on the right. A phone shows one page at a time, with the
// fold and a sliver of the other page at the side.
import { boardsScreen, foldersScreen, boardPager } from './screens.js';

const frame = document.getElementById('frame');
const view = document.getElementById('view');
const TURN_MS = 560, PAN_MS = 240;
export const sideOf = (i) => (i === 0 ? 'left' : 'right');

let other = null, moving = null, settling = null;
const stopSettling = () => { settling?.cancel(); settling = null; };

// How far the page has to travel for the fold to reach the other side.
export function panDistance() {
  const r = frame.getBoundingClientRect();
  const m = new DOMMatrix(getComputedStyle(frame).transform).m41;
  const vw = window.innerWidth;
  return frame.dataset.side === 'left' ? vw - 2 * (r.right - m) : vw - 2 * (r.left - m);
}

// Draws the section on the facing page, so it's there as the book slides over.
export async function showOther(i) {
  if (other) return;
  other = document.createElement('div');
  other.className = 'page-other';
  frame.append(other);
  const el = other;
  if (i === 0) await boardsScreen(el); else foldersScreen(el);
  el.querySelector('.screen')?.classList.add('still');
}
export function dropOther() { other?.remove(); other = null; }
export const dragFrame = (x) => { stopSettling(); frame.style.transform = x ? `translate3d(${x}px, 0, 0)` : ''; };

// Slides the book over, then leaves it there until the new screen is drawn.
export function panOver(from, done) {
  const to = panDistance();
  stopSettling();
  frame.style.transform = '';
  moving?.cancel();
  moving = frame.animate([{ transform: `translate3d(${from}px, 0, 0)` }, { transform: `translate3d(${to}px, 0, 0)` }], { duration: PAN_MS, easing: 'cubic-bezier(.25,.6,.3,1)', fill: 'forwards' });
  let gone = false;
  const off = () => { if (!gone) { gone = true; done(); } };
  moving.onfinish = off;
  setTimeout(off, PAN_MS + 120); // the phone can hold an animation up
}
// The new screen is in place: show it where it belongs, in the same moment.
export function landOn(i) {
  frame.dataset.side = sideOf(i);
  moving?.cancel(); moving = null;
  stopSettling();
  frame.style.transform = '';
  dropOther();
}
export function settleFrame(from) {
  frame.style.transform = '';
  stopSettling();
  if (from) {
    settling = frame.animate([{ transform: `translate3d(${from}px, 0, 0)` }, { transform: 'none' }], { duration: 180, easing: 'ease-out' });
    const a = settling;
    a.onfinish = () => { if (settling === a) settling = null; dropOther(); };
  }
  else dropOther();
}
export const isPanning = () => !!moving;

// Turns a page of the mood boards over the fold.
let turning = false;
export const canTurn = (dir) => { const n = boardPager.page + dir; return n >= 0 && n < boardPager.pages; };
export async function turnPage(dir) {
  if (turning || !canTurn(dir)) return;
  turning = true;
  const leaf = document.createElement('div');
  leaf.className = 'turn-leaf';
  const shade = document.createElement('i');
  const target = boardPager.page + dir;
  // On the left page the leaves swing over the fold on its right.
  const left = frame.dataset.side === 'left';
  if (left) leaf.classList.add('is-left');
  if (left ? dir < 0 : dir > 0) {
    leaf.append(view.firstElementChild.cloneNode(true));
    leaf.append(shade);
    frame.append(leaf);
    await boardsScreen(view, target);
    view.querySelector('.screen')?.classList.add('still');
  } else {
    frame.append(leaf);
    await boardsScreen(leaf, target); // the page coming back, drawn on the leaf
    leaf.querySelector('.screen')?.classList.add('still');
    leaf.append(shade);
  }
  const flat = 'perspective(1500px) rotateY(0deg)', over = `perspective(1500px) rotateY(${left ? 180 : -180}deg)`;
  const oldOnLeaf = left ? dir < 0 : dir > 0;
  const a = leaf.animate(oldOnLeaf ? [{ transform: flat }, { transform: over }] : [{ transform: over }, { transform: flat }], { duration: TURN_MS, easing: 'cubic-bezier(.45,.05,.35,1)', fill: 'forwards' });
  shade.animate([{ opacity: 0 }, { opacity: .3 }, { opacity: 0 }], { duration: TURN_MS });
  let gone = false;
  const off = async () => {
    if (gone) return;
    gone = true;
    if (!oldOnLeaf) { await boardsScreen(view, target); view.querySelector('.screen')?.classList.add('still'); }
    a.cancel();
    leaf.remove();
    turning = false;
  };
  a.onfinish = off;
  setTimeout(off, TURN_MS + 300);
}
