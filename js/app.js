// Routes: #/ shut, #/boards, #/folders, #/folder/<id>, #/new, #/board/<id>
import { refresh } from './library.js';
import { boardsScreen, foldersScreen, folderScreen, boardPager } from './screens.js';
import { newBoardScreen } from './newboard.js';
import { boardScreen } from './editor.js';
import { closeAllSheets } from './ui.js';
import { carryOn } from './tagger.js';
import { showSection, setPuller } from './navbar.js';
import { isPanning, sideOf } from './spread.js';
import { paintStickers } from './stickers.js';
import { openOptions, startPage } from './options.js';
import { ICONS } from './icons.js';
import { esc } from './util.js';

const view = document.getElementById('view');
const book = document.getElementById('book');
const frame = document.getElementById('frame');
let destroyCurrent = null;
let token = 0;

document.getElementById('bookHit').addEventListener('click', () => { location.hash = '#/boards'; });
const sun = document.getElementById('bookSun');
sun.innerHTML = ICONS.sun;
sun.addEventListener('click', openOptions);
const titleR = document.getElementById('titleR');
const titleL = document.getElementById('titleL');
const tabHits = document.getElementById('bookTabHits');
tabHits.addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b) location.hash = b.dataset.go; });

// The notebook floats shut on white, the same as Contact Sheet and Documenting
// Fictions. Tapped, its cover swings open and the right page grows to fill the
// frame behind it, then it leaves. Timers, not transition events: those don't
// fire if the app is put away mid-swing.
const RATIO = 1000 / 1360; // same size as Documenting Fictions' notebook
const TAB_OUT = 0.08;      // how far the side tabs stick out, of the book's width
const STACK = 16;
const TURNED = (20 * Math.PI) / 180; // matches style.css
const PERSPECTIVE = 1100;            // matches .nb in style.css
const OPEN_MS = 900, ZOOM_MS = 760;
document.getElementById('bookStack').innerHTML =
  Array.from({ length: STACK }, (_, i) => `<i style="--i:${i + 1}"></i>`).join('') + `<b style="--i:${STACK + 1}"></b>`;

function measure() {
  const vw = window.innerWidth;
  const vh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--book-h')) || window.innerHeight;
  const W = Math.min(vw * 0.78, vh * 0.66 * RATIO, 460);
  const H = W / RATIO;
  const k = Math.min(1, (vw - 14) / (2 * W), (vh * 0.82) / H);
  const cos = Math.cos(TURNED), sin = Math.sin(TURNED);
  const depth = (STACK + 1) * W * 0.0112;
  const seen = [[-W / 2, 0], [W / 2, 0], [-W / 2, -depth], [W / 2 + W * TAB_OUT, -depth * 0.8]].map(
    ([x, d]) => ((x * cos - d * sin) * PERSPECTIVE) / (PERSPECTIVE - (x * sin + d * cos)),
  );
  const f = frame.getBoundingClientRect();
  const set = (n, v) => book.style.setProperty(n, v);
  set('--W', `${W}px`); set('--H', `${H}px`); set('--k', String(k));
  set('--shut-x', `${-(Math.min(...seen) + Math.max(...seen)) / 2 / cos}px`);
  set('--zoom-x', `${(frame.dataset.side === 'left' ? f.right : f.left) - vw / 2}px`); // the fold lands on the frame's fold
  set('--zoom-y', `${(f.top + f.bottom) / 2 - vh / 2}px`);
  set('--zoom-sx', String(f.width / W));
  set('--zoom-sy', String(f.height / H));
  // The title on the blank page ends up exactly over the screen's own heading.
  set('--title-fs', `${32 / (f.width / W)}px`);
  set('--title-top', `${17 / (f.height / H)}px`);
  set('--title-sq', String((f.width / W) / (f.height / H)));
}
// Where the side tabs land on screen with the book shut, for the buttons laid
// flat over them. Measured in that pose before anything paints.
function placeTabHits() {
  const before = book.className;
  book.className = 'nb no-anim closed';
  const rects = [...document.getElementById('bookSideTabs').children].map((el) => el.getBoundingClientRect());
  [...tabHits.children].forEach((hit, i) => {
    const r = rects[i];
    hit.style.cssText = `left:${r.left - 14}px;right:0;top:${r.top - 3}px;height:${r.height + 6}px`;
  });
  book.className = before;
  void book.offsetWidth;
}
window.addEventListener('ref-layout', () => { measure(); if (!book.hidden && book.classList.contains('closed')) placeTabHits(); });

const zoomed = () => (frame.dataset.side === 'left' ? 'opened zoom-l' : 'opened zoom-r');
const place = (mode) => { book.hidden = false; placeTabHits(); book.className = `nb no-anim ${mode}`; void book.offsetWidth; };
const setMode = (mode) => { book.className = `nb ${mode}`; };
let firstRoute = true;
let isOpen = false;
let bookTimer = 0;
function setBook(open) {
  const first = firstRoute;
  firstRoute = false;
  if (open === isOpen && !first) return;
  isOpen = open;
  clearTimeout(bookTimer);
  stopTurning();
  measure();
  if (first) { if (open) book.hidden = true; else place('closed'); return; }
  if (open) {
    setMode('opened');
    bookTimer = setTimeout(() => {
      setMode(zoomed());
      bookTimer = setTimeout(() => { book.hidden = true; }, ZOOM_MS);
    }, OPEN_MS);
  } else {
    place(zoomed());
    setMode('closed');
  }
}

async function route() {
  const mine = ++token;
  if (destroyCurrent) { destroyCurrent(); destroyCurrent = null; }
  closeAllSheets();
  document.querySelectorAll('.viewer').forEach((v) => v.remove());
  const h = (location.hash || '#/').slice(1) || '/';
  const section = h === '/boards' ? 1 : h === '/folders' || h.startsWith('/folder/') ? 0 : -1;
  if (h !== '/') {
    if (!isPanning()) frame.dataset.side = sideOf(section);
    titleR.textContent = section === 1 ? 'Mood boards' : '';
    titleL.textContent = section === 0 ? 'Tags' : '';
    if (!isOpen && h === '/boards') boardPager.page = 0;
  }
  setBook(h !== '/');
  if (h === '/') { showSection(-1); return; }
  try {
    await refresh();
    if (mine !== token) return;
    let m;
    if (h === '/boards') await boardsScreen(view);
    else if (h === '/folders') foldersScreen(view);
    else if (h === '/new') newBoardScreen(view);
    else if ((m = h.match(/^\/folder\/(.+)$/))) folderScreen(view, decodeURIComponent(m[1]));
    else if ((m = h.match(/^\/board\/(.+)$/))) {
      const destroy = await boardScreen(view, decodeURIComponent(m[1]));
      if (mine !== token) destroy(); else destroyCurrent = destroy;
    } else location.hash = '#/boards';
    if (mine === token) showSection(section, h === '/boards' || h === '/folders');
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="screen"><p class="note center">Something went wrong. ${esc(e.message || 'Try reloading.')}</p></div>`;
  }
}

// A big swipe in from the right edge shuts the notebook: the cover follows the
// finger across the page, and letting go past the middle closes it.
const pull = document.getElementById('pull');
const EDGE = 26;
let edge = null;
const canPull = () => isOpen && frame.dataset.side === 'right' && !document.querySelector('.viewer, .sheet-overlay');
let pulled = 0;
const pullStart = () => { pull.classList.remove('back'); pull.hidden = false; pulled = 0; };
const pullMove = (w) => { pulled = w; pull.style.width = `${w}px`; };
function pullEnd() {
  if (pulled > window.innerWidth * 0.45) {
    pull.hidden = true;
    pull.style.width = '0';
    location.hash = '#/';
  } else {
    pull.classList.add('back');
    pull.style.width = '0';
    setTimeout(() => { pull.hidden = true; }, 200);
  }
}
setPuller({ start: pullStart, move: pullMove, end: pullEnd });
document.addEventListener('touchstart', (e) => {
  edge = null;
  const t = e.touches[0];
  if (e.touches.length !== 1 || t.clientX < window.innerWidth - EDGE || !canPull()) return;
  edge = { id: t.identifier, x0: t.clientX, y0: t.clientY, on: false, w: 0 };
}, { passive: true, capture: true });
document.addEventListener('touchmove', (e) => {
  if (!edge) return;
  const t = [...e.touches].find((x) => x.identifier === edge.id);
  if (!t) return;
  const dx = edge.x0 - t.clientX, dy = Math.abs(t.clientY - edge.y0);
  if (!edge.on) {
    if (dx < 10 && dy < 10) return;
    if (dy > dx) { edge = null; return; }
    edge.on = true;
    pullStart();
  }
  e.preventDefault();
  e.stopPropagation();
  pullMove(Math.max(0, window.innerWidth - t.clientX));
}, { passive: false, capture: true });
function endPull() {
  if (!edge) return;
  const { on } = edge;
  edge = null;
  if (on) pullEnd();
}
document.addEventListener('touchend', endPull, { capture: true });
document.addEventListener('touchcancel', endPull, { capture: true });

// Turning the shut notebook by hand, like the head in Callback: drag sideways
// to spin it, up and down to tip it. Harder the further it goes; let go and it
// swings back.
const SPIN_AWAY = 0.75, SPIN_TOWARD = 0.95, TILT = 0.42;
const softSpin = (raw) => (raw < 0 ? SPIN_AWAY * Math.tanh(raw / SPIN_AWAY) : SPIN_TOWARD * Math.tanh(raw / SPIN_TOWARD));
const softTilt = (raw) => TILT * Math.tanh(raw / TILT);
const held = { spin: 0, spinV: 0, spinGoal: 0, tilt: 0, tiltV: 0, tiltGoal: 0, drag: null, raf: 0, last: 0, ended: 0 };
const showTurn = () => {
  book.style.setProperty('--spin', `${(held.spin * 180) / Math.PI}deg`);
  book.style.setProperty('--tilt', `${(held.tilt * 180) / Math.PI}deg`);
};
function stopTurning() {
  cancelAnimationFrame(held.raf);
  Object.assign(held, { spin: 0, spinV: 0, spinGoal: 0, tilt: 0, tiltV: 0, tiltGoal: 0, drag: null, raf: 0, last: 0 });
  showTurn();
}
function turnStep(now) {
  const dt = Math.min(0.033, (now - (held.last || now - 16)) / 1000);
  held.last = now;
  const on = !!(held.drag && held.drag.moved);
  const goalS = on ? held.spinGoal : 0, goalT = on ? held.tiltGoal : 0;
  held.spinV += (-(on ? 40 : 14) * (held.spin - goalS) - (on ? 12 : 7.5) * held.spinV) * dt;
  held.tiltV += (-(on ? 40 : 30) * (held.tilt - goalT) - (on ? 12 : 10) * held.tiltV) * dt;
  held.spin += held.spinV * dt;
  held.tilt += held.tiltV * dt;
  showTurn();
  if (!held.drag && Math.abs(held.spin) + Math.abs(held.tilt) < 2e-3 && Math.abs(held.spinV) + Math.abs(held.tiltV) < 1e-2) {
    held.spin = held.tilt = held.spinV = held.tiltV = 0;
    held.raf = 0; held.last = 0;
    showTurn();
    return;
  }
  held.raf = requestAnimationFrame(turnStep);
}
book.addEventListener('pointerdown', (e) => {
  if (e.button || !book.classList.contains('closed') || book.classList.contains('placing') || e.target.closest('.nb-sun')) return;
  held.drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, spin0: held.spin, tilt0: held.tilt, moved: false };
});
book.addEventListener('pointermove', (e) => {
  const d = held.drag;
  if (!d || d.id !== e.pointerId) return;
  const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
  if (!d.moved && Math.hypot(dx, dy) > 6) {
    d.moved = true;
    try { book.setPointerCapture(e.pointerId); } catch {}
    if (!held.raf) held.raf = requestAnimationFrame(turnStep);
  }
  if (!d.moved) return;
  const k = 0.0056;
  held.spinGoal = softSpin(d.spin0 + dx * k);
  held.tiltGoal = softTilt(d.tilt0 - dy * k);
});
const letGo = (e) => {
  const d = held.drag;
  if (!d || d.id !== e.pointerId) return;
  held.drag = null;
  if (d.moved) held.ended = performance.now();
};
book.addEventListener('pointerup', letGo);
book.addEventListener('pointercancel', letGo);
book.addEventListener('click', (e) => { if (performance.now() - held.ended < 350) { e.preventDefault(); e.stopPropagation(); } }, true);

window.addEventListener('hashchange', route);
if (startPage() && (location.hash || '#/') === '#/') history.replaceState(null, '', startPage());
route().then(() => setTimeout(carryOn, 2500)); // once the notebook is on screen
paintStickers().catch(console.error);

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(() => {});
