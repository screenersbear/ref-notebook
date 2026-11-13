// Ref starts here. Routes: #/ shut, #/boards, #/folders, #/folder/<id>, #/new,
// #/board/<id>.
// Set up once, before anything else: sheets above the keyboard, the iPhone's
// screen, no page zoom.
import './components/keyboard-fit.js';
import './components/screen-fit.js';
import './components/no-zoom.js';
import { refresh } from './data/library.js';
import { boardsScreen } from './pages/boards.js';
import { foldersScreen } from './pages/folders.js';
import { folderScreen } from './pages/folder.js';
import { newBoardScreen } from './pages/newboard.js';
import { boardScreen } from './pages/board.js';
import { setBook } from './pages/cover.js';
import { openOptions, startPage } from './pages/options.js';
import { introSeen, openIntro } from './pages/intro.js';
import { welcome } from './pages/welcome.js';
import { closeAllSheets } from './components/sheet.js';
import { carryOn } from './data/tagger.js';
import { showSection } from './components/navbar.js';
import { sideOf } from './components/spread.js';
import { paintStickers } from './components/stickers.js';
import { esc } from './components/util.js';
import { keepUp } from './data/sendshoot.js';
import './components/pull-shut.js';

const view = document.getElementById('view');
const frame = document.getElementById('frame');
let destroyCurrent = null;
let token = 0;
// Inside Documenting Fictions (../suite.js) the shelf is the shut notebook,
// and Options are in the menu at the top of Mood boards.
const suite = window.DF_SUITE;
document.addEventListener('click', (e) => { if (e.target.closest('[data-app-menu]')) openOptions(); });
const titleR = document.getElementById('titleR');
const titleL = document.getElementById('titleL');

async function route() {
  const mine = ++token;
  if (destroyCurrent) { destroyCurrent(); destroyCurrent = null; }
  closeAllSheets();
  document.querySelectorAll('.viewer').forEach((v) => v.remove());
  const h = (location.hash || '#/').slice(1) || '/';
  if (suite && h === '/') { suite.home(); return; }
  const section = h === '/boards' ? 0 : h === '/folders' || h.startsWith('/folder/') ? 1 : -1;
  if (h !== '/') {
    frame.dataset.side = sideOf(section);
    titleL.textContent = section === 0 ? 'Mood boards' : '';
    titleR.textContent = section === 1 ? 'Tags' : '';
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

window.addEventListener('hashchange', route);
// ?board=<id>: The Eye's Open in Ref, straight to that board.
if (suite && suite.get('board')) history.replaceState(null, '', `#/board/${encodeURIComponent(suite.get('board'))}`);
else if (suite && (location.hash || '#/') === '#/') history.replaceState(null, '', suite.at === 'tags' ? '#/folders' : '#/boards');
else if (!suite && startPage() && (location.hash || '#/') === '#/') history.replaceState(null, '', startPage());
route().then(() => { setTimeout(carryOn, 2500); setTimeout(() => keepUp(), 4000); }); // once the notebook is on screen; then any sent board changed elsewhere is drawn again
// The first launch: the cards on how it works. Inside Documenting Fictions,
// first how to get back to the shelf, and the cards only if they're wanted.
if (suite) { if (suite.firstVisit) setTimeout(() => { if (!document.querySelector('.sheet-overlay')) welcome('Ref', openIntro); }, 900); }
else if (!introSeen()) setTimeout(() => { if (!document.querySelector('.sheet-overlay')) openIntro(); }, 1200);
paintStickers().catch(console.error);

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(() => {});

// Always upright. Where the browser allows a web app to hold the screen this
// asks quietly, and says nothing if it can't.
const holdUpright = () => { try { screen.orientation?.lock?.('portrait').catch(() => {}); } catch {} };
holdUpright();
document.addEventListener('visibilitychange', () => { if (!document.hidden) holdUpright(); });
