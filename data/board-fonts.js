// The fonts a board's words are in (Starky, 21 Nov: the fonts of the Ref app
// on the Mac, and a way to change them). One for the board's titles, one for
// its text (the page's text and the boxes added with T), kept on the board as
// board.fonts { title, text }. The Mac app's list, in its order, Courier New
// first, as there: these are on every iPhone and Mac except Michroma, which
// comes with Ref (fonts/). Then Klee One, the handwriting the phone's pages
// were in: a board from before fonts could be picked stays in it.

export const BOARD_FONTS = [
  { id: 'courier', name: 'Courier New', stack: '"Courier New", Courier, monospace' },
  { id: 'typewriter', name: 'American Typewriter', stack: '"American Typewriter", "Courier New", serif' },
  { id: 'helvetica', name: 'Helvetica Neue', stack: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  { id: 'avenir', name: 'Avenir Next', stack: '"Avenir Next", "Segoe UI", Arial, sans-serif' },
  { id: 'futura', name: 'Futura', stack: 'Futura, "Century Gothic", "Trebuchet MS", sans-serif' },
  { id: 'gill', name: 'Gill Sans', stack: '"Gill Sans", "Gill Sans MT", Calibri, sans-serif' },
  { id: 'georgia', name: 'Georgia', stack: 'Georgia, "Times New Roman", serif' },
  { id: 'baskerville', name: 'Baskerville', stack: 'Baskerville, "Baskerville Old Face", Georgia, serif' },
  { id: 'didot', name: 'Didot', stack: 'Didot, "Bodoni MT", "Times New Roman", serif' },
  { id: 'michroma', name: 'Michroma', stack: '"Michroma", "Avenir Next", sans-serif' },
  { id: 'menlo', name: 'Menlo', stack: 'Menlo, Consolas, monospace' },
  { id: 'klee', name: 'Klee One', stack: '"Klee One", "Bradley Hand", "Noteworthy", cursive' },
];
export const KINDS = ['title', 'text'];
// A new board's words, as the Mac app starts them.
export const NEW_FONTS = { title: 'courier', text: 'courier' };
const OLD = 'klee';

export const fontById = (id) => BOARD_FONTS.find((f) => f.id === id) || null;

// What a part of a page is: its title is 'title'; the page's text and the
// boxes added with T are 'text'.
export const kindOf = (part) => (part === 'title' ? 'title' : 'text');

// The font the board's titles or text are in.
export function boardFont(board, kind) {
  const id = board && board.fonts && board.fonts[kindOf(kind)];
  return fontById(id) || fontById(OLD);
}
export const fontStack = (board, kind) => boardFont(board, kind).stack;

// Changes it, for every page of the board; the other stays as it is (an old
// board's text stays in Klee One when its titles change). False for a font
// it doesn't have.
export function setBoardFont(board, kind, id) {
  if (!board || !fontById(id)) return false;
  board.fonts = { title: boardFont(board, 'title').id, text: boardFont(board, 'text').id, [kindOf(kind)]: id };
  return true;
}

// A board being made: in the new fonts, unless it has some already.
export function withNewFonts(board) {
  return board && !board.fonts ? { ...board, fonts: { ...NEW_FONTS } } : board;
}

// Every font the board uses, as the canvas asks for them before drawing.
export const fontsToLoad = (board) => [...new Set(KINDS.map((k) => fontStack(board, k)))];
