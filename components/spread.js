// Open, the notebook is plain pages the size of the screen. Going between its
// two sections, Mood boards and Tags, is a plain slide (Starky, 14 Nov;
// DESIGN.md 9.4): the other section is drawn beside the page and the two
// move together, under the finger while it's on the glass, then settling in
// 240ms on the curve (.4, 0, .2, 1), no bounce or curl. With Reduce Motion,
// a 150ms crossfade. Everything in a section scrolls.
import { boardsScreen } from '../pages/boards.js';
import { foldersScreen } from '../pages/folders.js';

const frame = document.getElementById('frame');
const view = document.getElementById('view');
const SLIDE_MS = 240, FADE_MS = 150, EASE = 'cubic-bezier(.4, 0, .2, 1)';
export const sideOf = (i) => (i === 1 ? 'right' : 'left'); // which page of the shut book opens: Mood boards left, Tags right
const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const at = (x) => `translate3d(${x}px, 0px, 0px)`;

// Where the frame sits under the finger: x along, toward the section beside
// (dir 1: it's on the right, so the page goes left), never past a page.
export const slideOffset = (x, dir, width) => (dir > 0 ? Math.max(-width, Math.min(0, x)) : Math.min(width, Math.max(0, x)));

// The other section, drawn in a leaf a page along from this one (dir 1: to
// the right), inside the frame, so it moves with it.
let beside = null;
export async function drawBeside(i, dir) {
  if (beside && beside.i === i && beside.dir === dir) return beside.ready;
  dropBeside();
  const leaf = document.createElement('div');
  leaf.className = 'slide-leaf';
  leaf.setAttribute('aria-hidden', 'true');
  leaf.inert = true;
  leaf.style.transform = `translate3d(${dir * 100}%, 0px, 0px)`;
  leaf.innerHTML = '<div class="paper"></div>';
  frame.append(leaf);
  const page = leaf.firstChild;
  const ready = (i === 0 ? boardsScreen(page) : Promise.resolve(foldersScreen(page))).then(() => page.querySelector('.screen')?.classList.add('still'));
  beside = { leaf, i, dir, ready };
  return ready;
}
function dropBeside() {
  beside?.leaf.remove();
  beside = null;
}

// The frame, held under the finger (x 0: back where it was).
let settling = null;
export const dragFrame = (x) => { settling?.cancel(); settling = null; frame.style.transform = x ? at(x) : ''; };
// Let go short of the next section, or with nowhere to go: back to 0, then
// the section beside is put away.
export function settleFrame(from) {
  frame.style.transform = '';
  settling?.cancel();
  settling = null;
  if (!from) { dropBeside(); return; }
  settling = frame.animate([{ transform: at(from) }, { transform: at(0) }], { duration: SLIDE_MS, easing: EASE });
  const done = settling;
  done.onfinish = () => { if (settling === done) { settling = null; dropBeside(); } };
}

let turning = false;
export const isTurning = () => turning;

// The animation's end, or a little after it at the latest (the phone can hold one up).
const ended = (a, ms) => new Promise((done) => {
  let gone = false;
  const off = () => { if (!gone) { gone = true; done(); } };
  a.onfinish = off;
  setTimeout(off, ms + 300);
});

// Goes to section i (dir 1: on, the page goes left; -1: back), from x along
// if a finger has already moved it. go() changes the route and resolves once
// the new screen is drawn.
export async function turnTo(i, dir, go, from = 0) {
  if (turning) return;
  turning = true;
  settling?.cancel();
  settling = null;
  if (still()) await crossfade(go);
  else {
    await drawBeside(i, dir);
    const a = frame.animate([{ transform: at(from) }, { transform: at(-dir * frame.offsetWidth) }], { duration: SLIDE_MS, easing: EASE, fill: 'forwards' });
    await ended(a, SLIDE_MS);
    // The real screen goes in while the leaf is showing, then the frame comes
    // back to 0 with it: the same picture, so nothing jumps.
    await go();
    a.cancel();
    frame.style.transform = '';
    dropBeside();
  }
  view.querySelector('.screen')?.classList.add('still');
  turning = false;
}

// With Reduce Motion: a picture of the page fades out over the new one.
async function crossfade(go) {
  dropBeside();
  frame.style.transform = '';
  const leaf = document.createElement('div');
  leaf.className = 'slide-leaf slide-fade';
  leaf.setAttribute('aria-hidden', 'true');
  leaf.innerHTML = '<div class="paper"></div>';
  const old = view.firstElementChild;
  if (old) leaf.firstChild.append(old.cloneNode(true));
  frame.append(leaf);
  // A copy doesn't keep where its lists were scrolled to.
  const from = old ? [...old.querySelectorAll('.scroll')] : [];
  leaf.querySelectorAll('.scroll').forEach((el, k) => { el.scrollTop = from[k]?.scrollTop || 0; });
  await go();
  await ended(leaf.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_MS, easing: 'linear', fill: 'forwards' }), FADE_MS);
  leaf.remove();
}
