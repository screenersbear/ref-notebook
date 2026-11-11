// The bottom bar, the same idea as Callback's: the section you're in as one
// icon with a little triangle each side. Tags is the left page, Mood boards the
// right; past Mood boards, the right triangle shuts the notebook. A swipe on
// the page does the same as one on the bar, and turns the mood boards' pages.
import { ICONS } from './icons.js';
import { showOther, dropOther, dragFrame, panOver, landOn, settleFrame, canTurn, turnPage, isPanning } from './spread.js';

const SECTIONS = [
  { href: '#/folders', name: 'Tags', icon: ICONS.folders },
  { href: '#/boards', name: 'Mood boards', icon: ICONS.boards },
];
const LAST = SECTIONS.length - 1;
const STEP = 46; // px from one icon to the next on the strip
const EDGE = 26; // the right edge belongs to the swipe that shuts the book
const tri = '<svg viewBox="0 0 10 12" aria-hidden="true"><path d="M2.3 1.5Q5.6 3.8 8.7 6.1 5.5 8.3 2.2 10.5 2.5 6 2.3 1.5Z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>';

const bar = document.getElementById('navbar');
const frame = document.getElementById('frame');
bar.innerHTML = `
  <div class="slider">
    <button type="button" class="slide-arrow is-prev">${tri}</button>
    <a class="slide-now"><span class="slide-strip" aria-hidden="true">${SECTIONS.map((s) => `<span class="slide-icon">${s.icon}</span>`).join('')}</span></a>
    <button type="button" class="slide-arrow is-next">${tri}</button>
  </div>`;
const strip = bar.querySelector('.slide-strip');
const now = bar.querySelector('.slide-now');
const prev = bar.querySelector('.is-prev');
const next = bar.querySelector('.is-next');

let at = 1, busy = false, coming = -1, swiped = 0, onList = false, puller = null;
export const setPuller = (p) => { puller = p; };
const stripTo = (i, moving) => { strip.classList.toggle('is-moving', !!moving); strip.style.transform = `translateX(${-i * STEP}px)`; };

// Called after each route: which section it's in, or -1 for none. list: it's
// that section's own first screen, where swiping the page moves through the book.
export function showSection(i, list = false) {
  bar.hidden = i < 0;
  onList = list;
  frame.dataset.swipe = list ? '1' : '';
  if (i < 0) { if (isPanning()) landOn(at); dropOther(); frame.style.transform = ''; coming = -1; busy = false; return; }
  at = i;
  const s = SECTIONS[i], p = SECTIONS[i - 1], n = SECTIONS[i + 1];
  now.setAttribute('href', s.href);
  now.setAttribute('aria-label', s.name);
  prev.classList.toggle('is-off', !p);
  prev.disabled = !p;
  prev.setAttribute('aria-label', p ? `Previous: ${p.name}` : 'Nothing before this');
  next.setAttribute('aria-label', n ? `Next: ${n.name}` : 'Shut the notebook');
  if (coming >= 0) { coming = -1; landOn(i); busy = false; }
  if (!busy) stripTo(i);
}

async function go(dir, from = 0) {
  if (busy) return settle(from);
  if (dir > 0 && at === LAST) { settle(from); location.hash = '#/'; return; }
  const t = SECTIONS[at + dir];
  if (!t) return settle(from);
  busy = true;
  stripTo(at + dir, true);
  await showOther(at + dir);
  const target = at + dir;
  panOver(from, () => {
    coming = target;
    location.hash = t.href;
    setTimeout(() => { if (coming >= 0) { coming = -1; landOn(at); busy = false; stripTo(at); } }, 900);
  });
}
function settle(from) {
  settleFrame(from);
  stripTo(at, true);
}

prev.addEventListener('click', () => go(-1));
next.addEventListener('click', () => go(1));

// One finger across the bar or the page.
function wire(el, fromPage) {
  let d = null;
  el.addEventListener('pointerdown', (e) => {
    d = null;
    if (busy || e.button || (fromPage && (!onList || document.querySelector('.turn-leaf')))) return;
    if (fromPage && at === LAST && e.clientX > window.innerWidth - EDGE) return;
    d = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: 0, moved: false, kind: '' };
  });
  el.addEventListener('pointermove', (e) => {
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < 10) return;
      if (fromPage && Math.abs(dy) > Math.abs(dx)) { d = null; return; }
      d.moved = true;
      try { el.setPointerCapture(e.pointerId); } catch {}
      const dir = dx < 0 ? 1 : -1;
      d.dir = dir;
      if (fromPage && at === LAST && canTurn(dir)) d.kind = 'turn';
      else if (SECTIONS[at + dir]) { d.kind = 'pan'; showOther(at + dir); }
      else if (!fromPage && dir > 0 && at === LAST) { d.kind = 'shut'; puller?.start(); }
      else d.kind = 'stop';
    }
    d.x = dx;
    if (d.kind === 'pan') {
      if (dx * d.dir > 0) { d.x = 0; dragFrame(0); return; } // came back past where it started
      dragFrame(dx);
      strip.classList.remove('is-moving');
      strip.style.transform = `translateX(${-at * STEP + (dx / frame.offsetWidth) * STEP}px)`;
    } else if (d.kind === 'stop') dragFrame(dx * 0.12);
    else if (d.kind === 'shut') puller?.move(Math.max(0, -dx * 1.8));
  });
  const end = (e) => {
    if (!d || e.pointerId !== d.id) return;
    const g = d;
    d = null;
    if (!g.moved) return;
    swiped = performance.now();
    const up = e.type === 'pointerup', w = frame.offsetWidth;
    if (g.kind === 'turn') { if (up && Math.abs(g.x) > 36) turnPage(g.dir); }
    else if (g.kind === 'pan') { if (up && Math.abs(g.x) > w * 0.2) go(g.dir, g.x); else settle(g.x); }
    else if (g.kind === 'shut') puller?.end();
    else settle(g.x * 0.12);
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  // A swipe that ends on something isn't a tap on it.
  el.addEventListener('click', (e) => { if (performance.now() - swiped < 350) { e.preventDefault(); e.stopPropagation(); } }, true);
}
wire(bar, false);
wire(frame, true);
