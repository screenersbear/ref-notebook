// What Ref tells the one list of people (round 2, connect/08): each mood
// board, with who it's for and who was on the shoots it went to, for the
// person page and search on the shelf (the suite's shared files, window.
// DFData, keep the list: shared/data/people-things.js). With them, the
// boards made each year, for the year page (shared/data/year.js). Read only:
// nothing here changes a board.
import { listBoards, getThumbs, onBoardsChange } from './db.js';

const D = () => window.DFData;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
// The photos on a board's pages, each once, in order.
const photosOn = (board) => [...new Set((board.pages || []).flatMap((p) => p.images || []).filter((im) => im && im.id).map((im) => im.id))];

// A board as the list keeps it: its name, "6 pages · for Rooftop portraits",
// the person it's for, everyone on the shoots it was sent to (shoots, from
// The Eye), and its first three photos (asked for only when they change).
export function boardThing(board, shoots = []) {
  const ids = photosOn(board).slice(0, 3);
  const c = board.client;
  const forShoot = shoots[0] ? D().eyeShootName(shoots[0], 'title') : '';
  return {
    id: board.id,
    kind: 'board',
    title: String(board.name || '').trim() || 'Mood board',
    line: [plural((board.pages || []).length, 'page', 'pages'), forShoot && `for ${forShoot}`].filter(Boolean).join(' · '),
    day: String(board.updatedAt || '').slice(0, 10),
    people: [...(c && c.name ? [{ name: c.name, instagram: c.handle || '' }] : []), ...shoots.flatMap((s) => D().shootPeople(s))],
    params: { board: board.id },
    more: { made: board.createdAt || '' },
    coverKey: ids.join(','),
    covers: async () => {
      const thumbs = await getThumbs(ids);
      return ids.filter((id) => thumbs.has(id)).map((id) => ({ type: 'image/jpeg', bytes: new Uint8Array(thumbs.get(id)).slice().buffer }));
    },
  };
}

// The shoots in The Eye each board was sent to: { boardId: [shoot] }.
async function shootsOf() {
  const state = D().eyeState();
  const byId = new Map(((state && state.shoots) || []).map((s) => [s.id, s]));
  const out = {};
  for (const l of await D().linksWhere({ fromApp: 'ref', toApp: 'the-eye', type: 'moodboard' })) {
    const s = byId.get(l.toId);
    if (s) (out[l.fromId] = out[l.fromId] || []).push(s);
  }
  return out;
}

// Tells the list, a moment after the last change; from the start, after
// every board saved or deleted too.
let soon = null;
export function tellPeople(wait = 1500) {
  if (!D() || !D().publishThings) return;
  clearTimeout(soon);
  soon = setTimeout(async () => {
    try {
      const [boards, sent] = await Promise.all([listBoards(), shootsOf()]);
      const Y = window.DFYear;
      if (Y) Y.publishYear('ref', Y.byYear({ boards: Y.countByYear(boards, (b) => b.createdAt) }));
      await D().publishThings('ref', boards.map((b) => boardThing(b, sent[b.id] || [])));
    } catch (e) { /* the list just doesn't hear this time */ }
  }, wait);
}
export const tellPeopleFromNowOn = () => onBoardsChange(() => tellPeople());
