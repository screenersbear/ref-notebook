// Back to The Eye (Starky, 21 Nov): a board opened from a shoot's Open in
// Ref (?board=<id>&shoot=<id>) goes back to that shoot, not to Mood boards.
// Kept for this visit only (sessionStorage), so a reload on the board still
// goes back; opening anything else in Ref ends it. Only the words and the
// store (unit tested: tests/unit/ref/eye-return.test.mjs).

const KEY = 'ref-back-to-eye';
const id = (v) => (typeof v === 'string' && v.trim() ? v.trim() : '');

// The board and the shoot it came from. False when either is missing or the
// store can't be written.
export function noteReturn(store, board, shoot) {
  if (!id(board) || !id(shoot)) return false;
  try { store.setItem(KEY, JSON.stringify({ board: id(board), shoot: id(shoot) })); return true; } catch { return false; }
}

// The shoot to go back to from this board, or ''.
export function returnFor(store, board) {
  try {
    const v = JSON.parse(store.getItem(KEY));
    return v && id(v.board) && v.board === board && id(v.shoot) ? v.shoot : '';
  } catch { return ''; }
}

// Ends it, unless the route is still that board's page (#/board/<id>).
export function keepReturn(store, hash) {
  try {
    const v = JSON.parse(store.getItem(KEY));
    if (v && hash === `#/board/${encodeURIComponent(v.board)}`) return true;
    store.removeItem(KEY);
  } catch {}
  return false;
}
