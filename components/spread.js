// Open, the notebook is plain pages the size of the screen. Going between its
// two sections, Mood boards and Tags, turns a page over at its left edge: the
// only page turn once the book is open. Everything in a section scrolls.
import { boardsScreen } from '../pages/boards.js';
import { foldersScreen } from '../pages/folders.js';

const frame = document.getElementById('frame');
const view = document.getElementById('view');
const TURN_MS = 560;
export const sideOf = (i) => (i === 1 ? 'right' : 'left'); // which page of the shut book opens: Mood boards left, Tags right

// A little give when a swipe has nowhere to go, or before it shuts the book.
let settling = null;
export const dragFrame = (x) => { settling?.cancel(); settling = null; frame.style.transform = x ? `translate3d(${x}px, 0, 0)` : ''; };
export function settleFrame(from) {
  frame.style.transform = '';
  settling?.cancel();
  settling = from ? frame.animate([{ transform: `translate3d(${from}px, 0, 0)` }, { transform: 'none' }], { duration: 180, easing: 'ease-out' }) : null;
}

let turning = false;
export const isTurning = () => turning;

// Turns to section i. Forward (dir 1) the page you're on turns away to the
// left with the next section under it; back (dir -1) the section before comes
// back over from the left. go() changes the route and resolves once the new
// screen is drawn.
export async function turnTo(i, dir, go) {
  if (turning) return;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still) { await go(); return; }
  turning = true;
  const leaf = document.createElement('div');
  leaf.className = 'turn-leaf';
  const shade = document.createElement('i');
  if (dir > 0) {
    const old = view.firstElementChild;
    if (old) leaf.append(old.cloneNode(true));
    leaf.append(shade);
    frame.append(leaf);
    // A copy doesn't keep where its lists were scrolled to.
    const from = old ? [...old.querySelectorAll('.scroll')] : [];
    leaf.querySelectorAll('.scroll').forEach((el, k) => { el.scrollTop = from[k]?.scrollTop || 0; });
    leaf.querySelector('.screen')?.classList.add('still');
    await go();
  } else {
    if (i === 0) await boardsScreen(leaf); else foldersScreen(leaf);
    leaf.querySelector('.screen')?.classList.add('still');
    leaf.append(shade);
    leaf.style.transform = 'perspective(1500px) rotateY(-180deg)';
    frame.append(leaf);
  }
  const flat = 'perspective(1500px) rotateY(0deg)', over = 'perspective(1500px) rotateY(-180deg)';
  const a = leaf.animate(dir > 0 ? [{ transform: flat }, { transform: over }] : [{ transform: over }, { transform: flat }], { duration: TURN_MS, easing: 'cubic-bezier(.45,.05,.3,1)', fill: 'forwards' });
  shade.animate([{ opacity: 0 }, { opacity: 0.25 }, { opacity: 0 }], { duration: TURN_MS });
  await new Promise((done) => {
    let gone = false;
    const off = () => { if (!gone) { gone = true; done(); } };
    a.onfinish = off;
    setTimeout(off, TURN_MS + 300); // the phone can hold an animation up
  });
  if (dir < 0) await go();
  view.querySelector('.screen')?.classList.add('still');
  leaf.remove();
  turning = false;
}
