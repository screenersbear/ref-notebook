// A page's size, and the layouts that fit it. Most boards have one size for
// every page (SHAPES in templates.js). A board brought in with IMPORT keeps
// each picture whole, at its full size (Starky, 21 Nov: a phone-size story
// came in cropped): its shape is 'own' ("As imported") and each page has a
// size of its own, the shape of its picture, its long side 11 inches like
// a letter page. Its layouts are the tall or wide ones, by that shape, and
// 'own', the picture edge to edge.
import { SHAPES, TEMPLATES, templateFor, defaultTemplate } from './templates.js';

export const OWN = 'own';
export const LONG_SIDE = 11;
const TALL = 'letter-portrait', WIDE = 'wide-16x9';

// The layout an imported page starts with: its picture, the whole page.
export const OWN_TEMPLATE = {
  id: 'own', name: 'As imported',
  slots: [{ x: 0, y: 0, w: 1, h: 1 }],
  text: { x: 0.06, y: 0.84, w: 0.6, h: 0.1, overlay: true },
};

const real = (v) => Number.isFinite(v) && v > 0;
const isSize = (s) => !!s && real(s.W) && real(s.H);

// A picture's pixels as a page size: { W, H } in inches, the long side 11.
// null when they aren't two sizes above zero.
export function sizeOfPicture(w, h) {
  if (!real(w) || !real(h)) return null;
  const k = LONG_SIDE / Math.max(w, h);
  return { W: Math.round(w * k * 1000) / 1000, H: Math.round(h * k * 1000) / 1000 };
}

// The page's size in inches: its own, else its board's (letter for anything unknown).
export function pageSize(board, page) {
  if (isSize(page && page.size)) return { W: page.size.W, H: page.size.H };
  const s = SHAPES[board && board.shape] || SHAPES[TALL];
  return { W: s.W, H: s.H };
}

// Which list of layouts a page uses: its board's, or for an imported page,
// tall or wide by its own shape.
export function pageKind(board, page) {
  if (SHAPES[board && board.shape]) return board.shape;
  const s = pageSize(board, page);
  return s.W > s.H ? WIDE : TALL;
}

// The layouts to pick from for a page (no guides): an imported board's
// pages can go back to As imported.
export function layoutsFor(board, page) {
  const list = TEMPLATES[pageKind(board, page)].filter((t) => !t.guide);
  return board && board.shape === OWN ? [OWN_TEMPLATE, ...list] : list;
}

// The layout a page is drawn with: As imported, the one it names, or the
// best one for how many photos it has.
export function templateOf(board, page) {
  if (page && page.template === OWN) return OWN_TEMPLATE;
  const kind = pageKind(board, page);
  const n = (page && Array.isArray(page.images) ? page.images : []).filter(Boolean).length;
  return templateFor(kind, page && page.template) || defaultTemplate(kind, n);
}

// The pages of an imported board: a page for each photo, its own size,
// the photo on it whole. photos: [{ id, width, height }].
export function ownPages(photos) {
  return (Array.isArray(photos) ? photos : []).filter((p) => p && p.id).map((p) => ({
    template: OWN, images: [p.id], size: sizeOfPicture(p.width, p.height) || { W: SHAPES[TALL].W, H: SHAPES[TALL].H },
  }));
}

// The size for a new page added after this one: an imported page's own, so
// a board of stories gets another story; nothing for other boards.
export const nextSize = (board, page) => (board && board.shape === OWN ? pageSize(board, page) : null);

// How wide a page is drawn for Export, in pixels: a wide page 2000, a tall
// one so its long side is 2200 (a letter page 1700, as the PDF always had).
export const exportWidth = (size) => (isSize(size) && size.H > size.W ? Math.round((2200 * size.W) / size.H) : 2000);
