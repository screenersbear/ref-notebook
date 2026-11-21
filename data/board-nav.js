// Getting around a board's pages (user, 11-20): its pages in order for the
// tray's PAGES, which page a photo is on, and when a swipe turns the page.
// Only words and lists (unit tested: tests/unit/ref/board-nav.test.mjs).

// One for each page with a photo on it, first page first: the page's first
// photo and the page's number (from 1).
export function pageThumbs(pages) {
  const out = [];
  (Array.isArray(pages) ? pages : []).forEach((p, i) => {
    const first = (p && Array.isArray(p.images) ? p.images : []).find((x) => x && x.id);
    if (first) out.push({ id: first.id, page: i + 1 });
  });
  return out;
}

// The page a photo is on (from 0), the nearest after `from` first, then
// from the start; -1 when it's on none.
export function pageOf(pages, id, from = -1) {
  const list = Array.isArray(pages) ? pages : [];
  const has = (p) => !!p && Array.isArray(p.images) && p.images.some((x) => x && x.id === id);
  for (let i = from + 1; i < list.length; i++) if (has(list[i])) return i;
  for (let i = 0; i <= Math.min(from, list.length - 1); i++) if (has(list[i])) return i;
  return -1;
}

// Where the tray starts: a board from a PDF on its pages, any other on All.
export const trayStart = (board) => (board && board.fromPdf ? 'pages' : 'all');

// A drag on a picked photo turns the page when it goes more sideways than
// up or down and the photo has no room to move sideways in its spot (a PDF's
// page fills its spot), so it couldn't be a crop.
export function swipeTurns(dx, dy, spareX) {
  if (![dx, dy, spareX].every(Number.isFinite)) return false;
  return Math.abs(dx) > Math.abs(dy) && spareX <= 0.5;
}
