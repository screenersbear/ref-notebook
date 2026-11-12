// The bottom bar, the same idea as Callback's: the section you're in as one
// icon with a little triangle each side. Mood boards comes first, then Tags;
// before Mood boards, the left triangle shuts the notebook. A swipe on the page
// does the same as one on the bar, and going between the two turns a page.
import { ICONS } from './icons.js';
import { dragFrame, settleFrame, turnTo, isTurning } from './spread.js';

const SECTIONS = [
  { href: '#/boards', name: 'Mood boards', icon: ICONS.boards },
  { href: '#/folders', name: 'Tags', icon: ICONS.folders },
];
const STEP = 46; // px from one icon to the next on the strip
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

let at = 0, busy = false, swiped = 0, onList = false, puller = null, landed = null;
let docked = null; // the row of every section, while a finger holds the icon (below)
export const setPuller = (p) => { puller = p; };
const stripTo = (i, moving) => { strip.classList.toggle('is-moving', !!moving); strip.style.transform = `translateX(${-i * STEP}px)`; };

// Called after each route: which section it's in, or -1 for none. list: it's
// that section's own first screen, where swiping the page moves through the book.
export function showSection(i, list = false) {
  bar.hidden = i < 0;
  onList = list;
  frame.dataset.swipe = list ? '1' : '';
  if (landed) { landed(); landed = null; }
  if (i < 0) { frame.style.transform = ''; busy = false; return; }
  at = i;
  const s = SECTIONS[i], p = SECTIONS[i - 1], n = SECTIONS[i + 1];
  now.setAttribute('href', s.href);
  now.setAttribute('aria-label', s.name);
  prev.setAttribute('aria-label', p ? `Previous: ${p.name}` : 'Shut the notebook');
  next.classList.toggle('is-off', !n);
  next.disabled = !n;
  next.setAttribute('aria-label', n ? `Next: ${n.name}` : 'Nothing after this');
  if (!busy) stripTo(i);
}

// Changes the route; resolves once the new screen is on the page.
const navigate = (href) => new Promise((done) => {
  landed = done;
  location.hash = href;
  setTimeout(() => { if (landed === done) { landed = null; done(); } }, 1500);
});

async function go(dir, from = 0) {
  if (busy || isTurning()) return settle(from);
  if (dir < 0 && at === 0) { settle(from); location.hash = '#/'; return; }
  const target = at + dir;
  const t = SECTIONS[target];
  if (!t) return settle(from);
  busy = true;
  dragFrame(0);
  stripTo(target, true);
  await turnTo(target, Math.sign(dir), () => navigate(t.href));
  busy = false;
  stripTo(at);
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
    if (busy || isTurning() || e.button || (fromPage && !onList)) return;
    d = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: 0, moved: false, kind: '' };
  });
  el.addEventListener('pointermove', (e) => {
    if (!d || e.pointerId !== d.id) return;
    if (docked) { d = null; return; } // the held icon's row has the finger now
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < 10) return;
      if (fromPage && Math.abs(dy) > Math.abs(dx)) { d = null; return; }
      d.moved = true;
      try { el.setPointerCapture(e.pointerId); } catch {}
      const dir = dx < 0 ? 1 : -1;
      d.dir = dir;
      if (SECTIONS[at + dir]) d.kind = 'turn';
      else if (dir < 0 && at === 0) d.kind = 'shut';
      else d.kind = 'stop';
    }
    d.x = dx;
    if (d.kind === 'turn') { // the bar's icons follow the finger; the page turns when you let go
      const x = dx * d.dir > 0 ? 0 : Math.max(-frame.offsetWidth, Math.min(frame.offsetWidth, dx));
      strip.classList.remove('is-moving');
      strip.style.transform = `translateX(${-at * STEP + (x / frame.offsetWidth) * STEP}px)`;
    }
    else if (d.kind === 'shut') { d.x = Math.max(0, dx); dragFrame(Math.min(d.x * 0.3, 60)); } // a little give, then it shuts all the way
  });
  const end = (e) => {
    if (!d || e.pointerId !== d.id) return;
    const g = d;
    d = null;
    if (!g.moved) return;
    swiped = performance.now();
    const up = e.type === 'pointerup', w = frame.offsetWidth;
    if (g.kind === 'turn') { if (up && g.x * g.dir < 0 && Math.abs(g.x) > Math.min(60, w * 0.15)) go(g.dir); else stripTo(at, true); }
    else if (g.kind === 'shut') { if (up && g.x > 50) { dragFrame(0); location.hash = '#/'; } else settle(Math.min(g.x * 0.3, 60)); }
    // nowhere to go that way: the page stays put
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  // A swipe that ends on something isn't a tap on it.
  el.addEventListener('click', (e) => { if (performance.now() - swiped < 350) { e.preventDefault(); e.stopPropagation(); } }, true);
}
wire(bar, false);
wire(frame, true);

// Held still for a moment, the icon swells into a row of every section, the
// way the Mac's Dock grows under the pointer (as in The Eye). Slide along it
// and let go on one to go there; let go without sliding and nothing changes.
// No card around the row (user, 11-12): only the icons, on a soft white haze
// so they still read over a photo.
const DOCK_SLOT = 46; // px from one icon to the next
const DOCK_PAD = 10;  // the row's padding, each side
const dock = document.createElement('div');
dock.className = 'nav-dock';
dock.setAttribute('aria-hidden', 'true');
dock.innerHTML = SECTIONS.map((s) => `<span class="nav-dock-slot"><span class="nav-dock-icon">${s.icon}</span></span>`).join('')
  + '<span class="nav-dock-label"></span>';
bar.appendChild(dock);
const dockSlots = [...dock.querySelectorAll('.nav-dock-slot')];
const dockIcons = [...dock.querySelectorAll('.nav-dock-icon')];
const dockLabel = dock.querySelector('.nav-dock-label');
let hold = null;
// Biggest under the finger, its neighbours a little, the rest as they are.
function dockShow(x) {
  const fx = x === null ? docked.centers[at] : x;
  let near = at;
  if (x !== null) {
    let best = Infinity;
    docked.centers.forEach((c, i) => { if (Math.abs(fx - c) < best) { best = Math.abs(fx - c); near = i; } });
  }
  docked.at = near;
  dockIcons.forEach((icon, i) => {
    const grow = Math.max(0, 1 - Math.abs(fx - docked.centers[i]) / (DOCK_SLOT * 1.8));
    icon.style.transform = `scale(${(1 + 0.55 * grow).toFixed(3)})`;
  });
  dockLabel.textContent = SECTIONS[near].name;
  dockLabel.style.left = `${(docked.centers[near] - docked.left).toFixed(1)}px`;
}
function openDock(h) {
  hold = null;
  if (busy || isTurning() || bar.hidden) return;
  const r = bar.getBoundingClientRect();
  const w = SECTIONS.length * DOCK_SLOT + DOCK_PAD * 2;
  const vw = window.innerWidth;
  // The section you're on sits right over the finger, as far as the screen allows.
  const left = Math.max(8, Math.min(vw - 8 - w, h.x - DOCK_PAD - (at + 0.5) * DOCK_SLOT));
  docked = { id: h.id, x0: h.x, y0: h.y, moved: false, at, left, centers: SECTIONS.map((s, i) => left + DOCK_PAD + (i + 0.5) * DOCK_SLOT) };
  stripTo(at, true); // the bar's own icon goes back if a slide had nudged it
  dock.style.left = `${(left - r.left).toFixed(1)}px`;
  dock.style.transformOrigin = `${(h.x - left).toFixed(1)}px 100%`;
  dockSlots.forEach((slot, i) => slot.classList.toggle('is-here', i === at));
  dockShow(null);
  dock.classList.add('is-open');
  bar.classList.add('is-docked');
  try { bar.setPointerCapture(h.id); } catch {}
}
now.addEventListener('pointerdown', (e) => {
  if (e.button || !e.isPrimary) return;
  if (hold) clearTimeout(hold.timer);
  const h = { id: e.pointerId, x: e.clientX, y: e.clientY };
  h.timer = setTimeout(() => { if (hold === h) openDock(h); }, 380);
  hold = h;
});
// A long press on a link would bring up iOS's preview of it.
now.addEventListener('contextmenu', (e) => e.preventDefault());
bar.addEventListener('pointermove', (e) => {
  if (hold && e.pointerId === hold.id && Math.hypot(e.clientX - hold.x, e.clientY - hold.y) >= 8) { clearTimeout(hold.timer); hold = null; }
  if (!docked || e.pointerId !== docked.id) return;
  if (!docked.moved && Math.hypot(e.clientX - docked.x0, e.clientY - docked.y0) < 10) return;
  docked.moved = true;
  dockShow(e.clientX);
});
const dockEnd = (e) => {
  if (hold && e.pointerId === hold.id) { clearTimeout(hold.timer); hold = null; }
  if (!docked || e.pointerId !== docked.id) return;
  const { moved, at: to } = docked;
  docked = null;
  dock.classList.remove('is-open');
  bar.classList.remove('is-docked');
  swiped = performance.now(); // the icon's own tap stands down
  if (e.type === 'pointerup' && moved && to !== at) go(to - at);
};
bar.addEventListener('pointerup', dockEnd);
bar.addEventListener('pointercancel', dockEnd);
