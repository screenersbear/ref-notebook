// IMPORT on Mood boards (round 3, ref/08-new-and-import), the parts that
// are only words and lists (unit tested: tests/unit/ref/import-board.test.mjs).
// A board from a PDF has each page of the PDF as one page of the board, at
// its full size (data/page-size.js), and says "(from PDF)" after its name
// in the list until it's renamed (board.fromPdf).

// A PDF by its type, or by its name when the phone gives no type.
export const isPdf = (f) => !!f && (f.type === 'application/pdf' || (!f.type && /\.pdf$/i.test(f.name || '')));

// A PDF's name without .pdf: the board's name to start with.
export const baseName = (name) => String(name || '').replace(/\.pdf$/i, '').trim() || 'PDF';

// A board's name as the list shows it.
export const listName = (b) => (b.fromPdf ? `${b.name} (from PDF)` : b.name);

// What the toast says once the photos are in: how many couldn't be read, if any.
export const failedWords = (n) => (n ? `${n} ${n === 1 ? "file couldn't" : "files couldn't"} be read` : '');
