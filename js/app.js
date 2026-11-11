// Routes: #/ shut, #/boards, #/folders, #/folder/<id>, #/new, #/board/<id>
import { refresh } from './library.js';
import { boardsScreen, foldersScreen, folderScreen } from './screens.js';
import { newBoardScreen } from './newboard.js';
import { boardScreen } from './editor.js';
import { closeAllSheets } from './ui.js';
import { esc } from './util.js';

const view = document.getElementById('view');
const book = document.getElementById('book');
let destroyCurrent = null;
let token = 0;

document.getElementById('cover').addEventListener('click', () => { location.hash = '#/boards'; });

// The cover swings open, then leaves the page. Timers, not transition events:
// those don't fire if the app is put away mid-swing. Opening straight into
// a page (reloading, say) skips the swing.
let firstRoute = true;
let coverTimer = 0;
function setCover(open) {
  clearTimeout(coverTimer);
  if (firstRoute) book.classList.add('no-anim');
  book.classList.toggle('gone', false);
  void book.offsetWidth;
  book.classList.toggle('open', open);
  if (open) coverTimer = setTimeout(() => book.classList.add('gone'), firstRoute ? 0 : 750);
  if (firstRoute) { void book.offsetWidth; book.classList.remove('no-anim'); firstRoute = false; }
}

async function route() {
  const mine = ++token;
  if (destroyCurrent) { destroyCurrent(); destroyCurrent = null; }
  closeAllSheets();
  document.querySelectorAll('.viewer').forEach((v) => v.remove());
  const h = (location.hash || '#/').slice(1) || '/';
  setCover(h !== '/');
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
route();

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(() => {});
