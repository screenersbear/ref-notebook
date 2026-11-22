// New board's WHO IT'S FOR (round 2, connect/11), on the first step under
// Name, in the suite only: the person it's for (their photo, name and
// Change), the line on what that does, and NEXT TIME, FROM THE EYE (their
// latest lessons, with the shoot and day, to keep in mind: they don't go on
// the board, Starky, 21 Nov).
// Optional. Picking: components/person-picker.js; the notes and their next
// shoot: data/next-time.js; putting the board on it: data/board-for.js.
import { esc } from '../components/util.js';
import { pickPerson } from '../components/person-picker.js';
import { notesFor, noteSource } from '../data/next-time.js';
import { peopleOn, shootFor } from '../data/board-for.js';

const D = () => window.DFData;
const SOMEONE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="8.5" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0z"/></svg>';

// Boards for someone are only in the suite, where there's a list of people and The Eye.
export const whoHere = () => !!(D() && D().inSuite() && D().peopleAll);

// W.who, W.notes: the person picked and their notes.
export function whoHtml(W) {
  if (!whoHere()) return '';
  const p = W.who;
  const notes = W.notes || [];
  return `<p class="guide-label">Who it's for</p>
    <button type="button" class="who-row" data-who aria-label="${p ? `For ${esc(p.name)}. Change` : 'Pick who it\'s for'}">
      <span class="who-face">${p && p.photo ? `<img src="${esc(p.photo)}" alt="" />` : SOMEONE}</span>
      <span class="who-name${p ? '' : ' empty'}">${p ? esc(p.name || `@${p.instagram || p.tiktok}`) : 'Pick someone'}</span>
      <span class="who-change">${p ? 'Change' : 'Pick'}</span></button>
    <p class="who-hint">Pick someone, or add a new person. The board shows on their next shoot in The Eye.</p>
    ${notes.length ? `<p class="guide-label">Next time, from The Eye</p>
    <div class="who-notes">${notes.map((n) => `<div class="who-note"><p class="who-note-head">${window.DFConnect.miniHtml('the-eye')}<span>${esc(noteSource(n))}</span></p>
      <p class="who-note-text">${esc(n.text)}</p></div>`).join('')}
      <p class="who-note-foot">To keep in mind as you make it. They don't go on the board.</p></div>` : ''}`;
}

// Asks who it's for and fills in W.who, W.notes and W.shoot (their next
// shoot, if any). Resolves true when anything changed.
export async function chooseWho(W) {
  const got = await pickPerson({ picked: W.who && W.who.id });
  if (!got) return false;
  if (got === 'nobody') { Object.assign(W, { who: null, notes: [], shoot: null }); return true; }
  const on = await peopleOn();
  const st = D().eyeState() || {};
  const shoot = shootFor(got.id, on);
  W.who = got;
  W.shoot = shoot;
  W.notes = notesFor(st.shoots, on, got.id, shoot && shoot.category, (s) => D().eyeShootName(s, 'title'));
  return true;
}
