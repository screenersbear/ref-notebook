// Routes: #/ shut, #/boards, #/folders, #/folder/<id>, #/new, #/board/<id>
import { refresh } from './library.js';
import { boardsScreen, foldersScreen, folderScreen } from './screens.js';
import { newBoardScreen } from './newboard.js';
import { boardScreen } from './editor.js';
import { closeAllSheets } from './ui.js';
import { carryOn } from './tagger.js';
import { esc } from './util.js';

const view = document.getElementById('view');
const book = document.getElementById('book');
const frame = document.getElementById('frame');
let destroyCurrent = null;
let token = 0;

document.getElementById('bookHit').addEventListener('click', () => { location.hash = '#/boards'; });

// The notebook floats shut on white, the same as Contact Sheet and Documenting
// Fictions. Tapped, its cover swings open and the right page grows to fill the
// frame behind it, then it leaves. Timers, not transition events: those don't
// fire if the app is put away mid-swing.
const RATIO = 1000 / 1360;
const STACK = 16;
const TURNED = (20 * Math.PI) / 180; // matches style.css
const PERSPECTIVE = 1100;            // matches .nb in style.css
const OPEN_MS = 900, ZOOM_MS = 760;
document.getElementById('bookStack').innerHTML =
  Array.from({ length: STACK }, (_, i) => `<i style="--i:${i + 1}"></i>`).join('') + `<b style="--i:${STACK + 1}"></b>`;

function measure() {
  const vw = window.innerWidth;
  const vh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-h')) || window.innerHeight;
  const W = Math.min(vw * 0.78, vh * 0.66 * RATIO, 460);
  const H = W / RATIO;
  const k = Math.min(1, (vw - 14) / (2 * W), (vh * 0.82) / H);
  const cos = Math.cos(TURNED), sin = Math.sin(TURNED);
  const depth = (STACK + 1) * W * 0.0112;
  const seen = [[-W / 2, 0], [W / 2, 0], [-W / 2, -depth], [W / 2, -depth * 0.8]].map(
    ([x, d]) => ((x * cos - d * sin) * PERSPECTIVE) / (PERSPECTIVE - (x * sin + d * cos)),
  );
  const f = frame.getBoundingClientRect();
  const set = (n, v) => book.style.setProperty(n, v);
  set('--W', `${W}px`); set('--H', `${H}px`); set('--k', String(k));
  set('--shut-x', `${-(Math.min(...seen) + Math.max(...seen)) / 2 / cos}px`);
  set('--zoom-x', `${f.left - vw / 2}px`);
  set('--zoom-y', `${(f.top + f.bottom) / 2 - vh / 2}px`);
  set('--zoom-sx', String(f.width / W));
  set('--zoom-sy', String(f.height / H));
}
window.addEventListener('ref-layout', measure);

const place = (mode) => { book.hidden = false; book.className = `nb no-anim ${mode}`; void book.offsetWidth; };
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
  measure();
  if (first) { if (open) book.hidden = true; else place('closed'); return; }
  if (open) {
    setMode('opened');
    bookTimer = setTimeout(() => {
      setMode('opened zoom-r');
      bookTimer = setTimeout(() => { book.hidden = true; }, ZOOM_MS);
    }, OPEN_MS);
  } else {
    place('opened zoom-r');
    setMode('closed');
  }
}

async function route() {
  const mine = ++token;
  if (destroyCurrent) { destroyCurrent(); destroyCurrent = null; }
  closeAllSheets();
  document.querySelectorAll('.viewer').forEach((v) => v.remove());
  const h = (location.hash || '#/').slice(1) || '/';
  setBook(h !== '/');
  if (h === '/') return;
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
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="screen"><p class="note center">Something went wrong. ${esc(e.message || 'Try reloading.')}</p></div>`;
  }
}

window.addEventListener('hashchange', route);
route().then(carryOn);

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(() => {});
