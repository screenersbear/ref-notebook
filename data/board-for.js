// A board for someone goes on their next shoot in The Eye by itself (round
// 2, connect/11). New board's WHO IT'S FOR keeps the person on the board
// (board.client: name, handle, personId). If they have a shoot coming, the
// board is drawn and put on it, just as Send to shoot does (then it keeps up
// with changes the same way, data/sendshoot.js). If they have none, it waits
// on them (client.waiting) and goes on once a shoot with them is made, the
// next time Ref opens: only Ref can draw a board's pages. No empty shoots are
// made for it. Who's on a shoot: The Eye's talent and team, found in the one
// list of people (shared/data/people.js).
import * as db from './db.js';
import { drawBoard, boardKey } from './sendshoot.js';
import { boardClient } from './client-board.js';
import { nextShootFor } from './next-time.js';

const D = () => window.DFData;
const eyeShoots = () => (((D().eyeState() || {}).shoots) || []).filter((s) => s && s.id);

// on(shoot): the ids of the people on it, from the list as it is now.
export async function peopleOn() {
  const records = await D().peopleAll();
  return (s) => D().shootPeople(s).map((f) => D().findPerson(records, f)).filter(Boolean).map((r) => r.id);
}

// The shoot the board would go on now (null for none).
export const shootFor = (personId, on) => nextShootFor(eyeShoots(), on, personId, D().todayStr());

// Puts the board on that shoot (once: a shoot that has it already keeps it).
export async function attachTo(board, shoot) {
  const had = await D().linksWhere({ fromApp: 'ref', fromId: board.id, toApp: 'the-eye', toId: shoot.id, type: 'moodboard' });
  if (had.length) return;
  const drawn = await drawBoard(board);
  await D().saveLink({
    fromApp: 'ref', fromId: board.id, toApp: 'the-eye', toId: shoot.id, type: 'moodboard',
    name: board.name, pageCount: drawn.about.pageCount, photoCount: drawn.about.photoCount,
    drawnAt: D().nowIso(), drawnOf: boardKey(board), frozenAt: null, importedAt: null, pending: false,
    client: boardClient(board),
  }, drawn.pictures);
}

// Notes on the board, as it is now (it may have been changed meanwhile),
// whether it's waiting; a board since deleted is left gone.
async function markWaiting(id, waiting) {
  const now = await db.getBoard(id);
  if (now && now.client) await db.keepBoard({ ...now, client: { ...now.client, waiting } });
}

// A new board for someone, just saved (waiting when they had no shoot): on
// their shoot now. Resolves the shoot, or null when it waits.
export async function placeBoard(board, shoot) {
  if (!shoot) return null;
  try {
    await attachTo(board, shoot);
    return shoot;
  } catch (e) {
    console.error(e); // couldn't be drawn: it waits, and goes on next time
    await markWaiting(board.id, true);
    return null;
  }
}

// Boards waiting on someone go on their shoot once they have one. Run as
// Ref starts, after the notebook is on screen.
export async function attachWaiting() {
  if (!D() || !D().inSuite() || !window.DFConnect.connectOn('moodboards')) return;
  const waiting = (await db.listBoards()).filter((b) => b.client && b.client.personId && b.client.waiting && b.pages.length);
  if (!waiting.length) return;
  const on = await peopleOn();
  for (const b of waiting) {
    const shoot = shootFor(b.client.personId, on);
    if (!shoot) continue;
    await attachTo(b, shoot);
    await markWaiting(b.id, false);
  }
}
