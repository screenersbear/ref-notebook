// The bottom bar, the same idea as Callback's: the section you're in as one
// icon with a little triangle on each side that has another section. Tap a
// triangle or swipe along the bar and the page slides over. The sun, on the
// left, shuts the notebook.
import { ICONS } from './icons.js';

const SECTIONS = [
  { href: '#/boards', name: 'Mood boards', icon: ICONS.boards },
  { href: '#/folders', name: 'Folders', icon: ICONS.folders },
];
const STEP = 46; // px from one icon to the next on the strip
const SLIDE_MS = 190;
const tri = '<svg viewBox="0 0 10 12" aria-hidden="true"><path d="M2.3 1.5Q5.6 3.8 8.7 6.1 5.5 8.3 2.2 10.5 2.5 6 2.3 1.5Z" fill="currentColor" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>';

const bar = document.getElementById('navbar');
const view = document.getElementById('view');
bar.innerHTML = `
  <a href="#/" class="tool nav-sun" aria-label="Close the notebook">${ICONS.sun}</a>
  <div class="slider">
    <button type="button" class="slide-arrow is-prev">${tri}</button>
    <a class="slide-now"><span class="slide-strip" aria-hidden="true">${SECTIONS.map((s) => `<span class="slide-icon">${s.icon}</span>`).join('')}</span></a>
    <button type="button" class="slide-arrow is-next">${tri}</button>
  </div>`;
const strip = bar.querySelector('.slide-strip');
const now = bar.querySelector('.slide-now');
const prev = bar.querySelector('.is-prev');
const next = bar.querySelector('.is-next');

let at = 0, busy = false, coming = 0, exit = null, swiped = 0;
const stripTo = (i, moving) => { strip.classList.toggle('is-moving', !!moving); strip.style.transform = `translateX(${-i * STEP}px)`; };

// Called after each route: which section it's in, or -1 for none.
export function showSection(i) {
  bar.hidden = i < 0;
  // Screens without this bar pin their own tools to the page, which a slide still running would drag along.
  if (i < 0) { view.getAnimations().forEach((an) => an.cancel()); view.style.transform = ''; coming = 0; busy = false; exit = null; }
  if (i >= 0) {
    at = i;
    const s = SECTIONS[i], p = SECTIONS[i - 1], n = SECTIONS[i + 1];
    now.setAttribute('href', s.href);
    now.setAttribute('aria-label', s.name);
    prev.classList.toggle('is-off', !p); next.classList.toggle('is-off', !n);
    prev.disabled = !p; next.disabled = !n;
    prev.setAttribute('aria-label', p ? `Previous: ${p.name}` : 'Nothing before this');
    next.setAttribute('aria-label', n ? `Next: ${n.name}` : 'Nothing after this');
    if (!busy) stripTo(i);
  }
  if (coming) {
    const dir = coming, w = view.offsetWidth;
    coming = 0;
    exit?.cancel(); exit = null;
    view.animate([{ transform: `translate3d(${dir * w}px, 0, 0)` }, { transform: 'none' }], { duration: SLIDE_MS, easing: 'cubic-bezier(.25,.6,.3,1)' });
    busy = false;
  }
}

function go(dir, from = 0) {
  const t = SECTIONS[at + dir];
  if (!t || busy) { settle(from); return; }
  busy = true;
  stripTo(at + dir, true);
  const w = view.offsetWidth;
  view.style.transform = '';
  exit = view.animate([{ transform: `translate3d(${from}px, 0, 0)` }, { transform: `translate3d(${-dir * w}px, 0, 0)` }], { duration: SLIDE_MS, easing: 'cubic-bezier(.25,.6,.3,1)', fill: 'forwards' });
  let gone = false;
  const off = () => {
    if (gone) return;
    gone = true;
    coming = dir;
    location.hash = t.href;
    setTimeout(() => { if (coming) { coming = 0; exit?.cancel(); exit = null; busy = false; stripTo(at); } }, 900);
  };
  exit.onfinish = off;
  setTimeout(off, SLIDE_MS + 120); // the phone can hold an animation up
}
function settle(from) {
  view.style.transform = '';
  stripTo(at, true);
  if (from) view.animate([{ transform: `translate3d(${from}px, 0, 0)` }, { transform: 'none' }], { duration: 180, easing: 'ease-out' });
}

prev.addEventListener('click', () => go(-1));
next.addEventListener('click', () => go(1));

let drag = null;
bar.addEventListener('pointerdown', (e) => { if (!busy && !e.button) drag = { id: e.pointerId, x0: e.clientX, x: 0, moved: false }; });
bar.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x0;
  if (!drag.moved) {
    if (Math.abs(dx) < 8) return;
    drag.moved = true;
    try { bar.setPointerCapture(e.pointerId); } catch {}
  }
  const has = SECTIONS[at + (dx < 0 ? 1 : -1)];
  drag.x = has ? dx : dx * 0.25; // nothing that way: it gives a little, then stops
  view.style.transform = `translate3d(${drag.x}px, 0, 0)`;
  strip.classList.remove('is-moving');
  strip.style.transform = `translateX(${-at * STEP + (drag.x / view.offsetWidth) * STEP}px)`;
});
const end = (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag;
  drag = null;
  if (!d.moved) return;
  swiped = performance.now();
  const dir = d.x < 0 ? 1 : -1;
  if (e.type === 'pointerup' && SECTIONS[at + dir] && Math.abs(d.x) > view.offsetWidth * 0.2) go(dir, d.x); else settle(d.x);
};
bar.addEventListener('pointerup', end);
bar.addEventListener('pointercancel', end);
// A swipe that ends on an icon isn't a tap on it.
bar.addEventListener('click', (e) => { if (performance.now() - swiped < 350) { e.preventDefault(); e.stopPropagation(); } }, true);
