// Names changed elsewhere coming into Ref (refining round, 21 Nov): someone
// renamed, or given a new handle, on their person page or in Rounds (both
// mark the one list of people's record as edited: shared/data/people.js).
// A board for them (board.client: who it's for) takes the new name and
// handle, and a board still named for them takes the new name too (one
// renamed to something else keeps its own). The Eye and Rounds do the same
// with their own copies (their people-out files).
import { listBoards, saveBoard } from './db.js';

const D = () => window.DFData;
const TAKEN = 'df-people-taken-ref'; // the newest change already taken
const said = (v) => String(v ?? '').trim();

// A board as it is after the record's change (the same board when nothing changed).
export function boardAfter(board, r) {
  const c = board.client;
  const name = said(r.name) || said(c.name); // never blank
  const handle = said(r.instagram);
  if (name === said(c.name) && handle === said(c.handle)) return board;
  return { ...board, client: { ...c, name, handle }, ...(said(board.name) === said(c.name) ? { name } : {}) };
}

// Each board for someone changed since: taken. Gives the boards changed.
export async function takePeopleEdits() {
  if (!D() || !D().peopleAll) return [];
  let taken = '';
  try { taken = localStorage.getItem(TAKEN) || ''; } catch (e) { /* private mode */ }
  const records = await D().peopleAll();
  const edited = records.filter((r) => r.editedAt && r.editedAt > taken);
  if (!edited.length) return [];
  const changed = [];
  for (const b of await listBoards()) {
    if (!b.client || !said(b.client.name)) continue;
    const r = D().findPerson(records, { name: b.client.name, instagram: b.client.handle || '' });
    if (!r || !edited.includes(r)) continue;
    const next = boardAfter(b, r);
    if (next !== b) changed.push(await saveBoard(next));
  }
  try { localStorage.setItem(TAKEN, edited.map((r) => r.editedAt).sort().pop()); } catch (e) { /* private mode */ }
  return changed;
}
