// A board for a new client from Rounds (round 2, connect/06). A yes in
// Rounds (a 'new-client' link in df-links: their name, Instagram handle and
// pitch day) shows in Ref as one slip on Mood boards. START THE BOARD makes
// the board from it: named for them, their handle kept on it (board.client),
// with blank pages as New board's Start blank makes them. When it's sent to
// a new shoot, The Eye's shoot has them as its talent (data/sendshoot.js
// passes board.client on). Plain functions, no storage.
import { styleTemplate } from './templates.js';
import { withTextDefaults } from '../components/textsize.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const BLANK_PAGES = 3;
export const CLIENT_STYLE = 'mosaic';

// A day as the slip says it: 3 Nov ('' for none). Takes a day (2026-11-03,
// read as the phone's own day) or a time.
export function dayWords(v) {
  const s = String(v ?? '');
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
  return s && !Number.isNaN(d.getTime()) ? `${d.getDate()} ${MONTHS[d.getMonth()]}` : '';
}

const nameOf = (link) => String(link.name ?? '').trim();
const firstName = (name) => name.split(/\s+/)[0];

// The slip's words: "Dana Ortiz said yes", its line, the handle, and when.
export function clientSlip(link) {
  const name = nameOf(link) || 'Someone';
  const pitched = dayWords(link.pitched);
  const said = dayWords(link.createdAt);
  return {
    title: `${name} said yes`,
    line: `A new board for the shoot, named for ${firstName(name)}.`,
    handle: link.handle ? `@${link.handle}` : '',
    when: pitched ? `Pitched ${pitched}.` : said ? `Said yes ${said}.` : '',
  };
}

// The board for them, ready to save: shape is the default page size (the
// mosaic look has pages for both sizes).
export function clientBoard(link, shape) {
  const name = nameOf(link) || 'New client';
  const pages = Array.from({ length: BLANK_PAGES }, (_, n) => withTextDefaults({ template: styleTemplate(shape, CLIENT_STYLE, n), images: [] }));
  return { name, shape, style: CLIENT_STYLE, pages, client: { name, handle: link.handle || '', from: link.id } };
}

// The client a board passes on to a new shoot (null for a board of your own).
export function boardClient(board) {
  const c = board && board.client;
  return c && String(c.name ?? '').trim() ? { name: c.name.trim(), handle: c.handle || '' } : null;
}

// Offers waiting in Ref: yeses passed on whose board isn't started yet.
export const offersOf = (links) => (links || []).filter((l) => l && l.type === 'new-client' && !l.toId);
