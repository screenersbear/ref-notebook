// The shut notebook, floating on white: its cover, side tabs and sun, and
// how it swings open (and shut) when the route changes.
import { openOptions } from './options.js';
import { stopTurning } from './cover-spin.js';
import { ICONS } from '../components/icons.js';

const book = document.getElementById('book');
const frame = document.getElementById('frame');

document.getElementById('bookHit').addEventListener('click', () => { location.hash = '#/boards'; });
const sun = document.getElementById('bookSun');
sun.innerHTML = ICONS.sun;
sun.addEventListener('click', openOptions);
const tabHits = document.getElementById('bookTabHits');
tabHits.addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b) location.hash = b.dataset.go; });

// The notebook floats shut on white, the same as Contact Sheet and Documenting
// Fictions. Tapped, its cover swings open and the page grows until its paper
// covers the whole screen, then it leaves. Timers, not transition events: those don't
// fire if the app is put away mid-swing.
const RATIO = 1000 / 1360; // same size as Documenting Fictions' notebook
const TAB_OUT = 0.08;      // how far the side tabs stick out, of the book's width
const STACK = 16;
const TURNED = (20 * Math.PI) / 180; // matches style.css
const PERSPECTIVE = 1100;            // matches .nb in style.css
const OPEN_MS = 900, ZOOM_MS = 760;
const OVER = 12; // zoomed in, the white of the page reaches this far past the screen's edges
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
  // Zoomed in, the spine lies along one side of the screen and the page's
  // white (inside its coloured edge: 1.4% out, 0.7% top and bottom) covers the
  // rest, OVER past the edges so even its round corners are off the screen.
  const pw = (vw + OVER) / 0.986, ph = (vh + 2 * OVER) / 0.986;
  const sx = pw / W, sy = ph / H;
  set('--zoom-x', `${frame.dataset.side === 'left' ? vw / 2 : -vw / 2}px`);
  set('--zoom-y', '0px');
  set('--zoom-sx', String(sx));
  set('--zoom-sy', String(sy));
  // The title on the blank page ends up exactly over the screen's own heading,
  // in the middle of the frame, its letters 12px down it.
  set('--title-fs', `${24 / sx}px`);
  set('--title-top', `${(f.top + 12 - (vh - ph) / 2) / sy}px`);
  set('--title-sq', String(sx / sy));
  // The page is a little wider than the screen, so the title is pushed in from
  // the page's outer edge to sit over the middle of the frame.
  const c = (f.left + f.right) / 2;
  set('--title-out', `${Math.max(0, frame.dataset.side === 'left' ? 2 * c - 2 * vw + pw : pw - 2 * c) / sx}px`);
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
export function setBook(open) {
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
