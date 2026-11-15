// A board for someone (round 2, connect/10 and 11). New board's WHO IT'S
// FOR picks a person from the one list of people; their latest Lessons for
// next time from The Eye's reflections come with them (a shoot kept to
// itself is left out), and, when they have a shoot coming, the latest from
// another shoot of that kind too: NEXT TIME, FROM THE EYE, the board's first
// page. The board goes on their next shoot in The Eye; with none yet it
// waits on them (data/board-for.js). Plain functions, no storage: The Eye's
// shoots as it keeps them, and on(shoot), the ids of the people on it.
import { withTextDefaults } from '../components/textsize.js';
import { dayWords } from './client-board.js';

const UPCOMING = ['prospect', 'planning', 'waiting_to_shoot', 'rescheduled'];
const SHOT = ['captured', 'waiting_for_selects', 'editing', 'rough_cut', 'client_review', 'revisions', 'delivered'];
const has = (v) => typeof v === 'string' && v.trim() !== '';
const byDateDown = (a, b) => String(b.date || '').localeCompare(String(a.date || ''));

// Their next shoot still to come: the soonest from today, else one with no
// date yet; null for none.
export function nextShootFor(shoots, on, personId, today) {
  const theirs = (shoots || []).filter((s) => s && s.id && !s.archived && UPCOMING.includes(s.status || 'prospect') && on(s).includes(personId));
  const dated = theirs.filter((s) => s.date && s.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  return dated[0] || theirs.find((s) => !s.date) || null;
}

// Their latest lessons, then (kind: the category of the shoot the board goes
// on) the latest from another shoot of that kind: [{ shootId, title, day,
// text }], at most two. title: the shoot as The Eye names it (nameOf).
export function notesFor(shoots, on, personId, kind, nameOf) {
  const shot = (shoots || []).filter((s) => s && SHOT.includes(s.status) && s.lessonsToRef !== false && has(s.lessonsLearned)).sort(byDateDown);
  const theirs = shot.find((s) => on(s).includes(personId)) || null;
  const ofKind = kind ? shot.find((s) => s.category === kind && s !== theirs) || null : null;
  return [theirs, ofKind].filter(Boolean).map((s) => ({ shootId: s.id, title: nameOf(s), day: s.date || '', text: s.lessonsLearned.trim() }));
}

// "Rooftop portraits, 7 Nov"
export const noteSource = (n) => [n.title, dayWords(n.day)].filter(Boolean).join(', ');

// The board's first page: NEXT TIME, each note with where it's from, on the
// layout with room for words (and a photo, if one's put in).
export function notesPage(notes, shape) {
  return withTextDefaults({
    template: shape === 'wide-16x9' ? 'w-single-text' : 'lp-text', images: [], nextTime: true,
    title: 'Next time', text: notes.map((n) => `${n.text} (${noteSource(n)})`).join('\n\n'),
  });
}

// The people to pick from, by name; q finds a name or handle.
export function peopleMatching(records, q) {
  const find = String(q ?? '').trim().toLowerCase().replace(/^@/, '');
  const label = (r) => r.name || r.instagram || r.tiktok || '';
  return (records || [])
    .filter((r) => r && label(r) && (!find || [r.name, r.instagram, r.tiktok].some((v) => String(v || '').toLowerCase().includes(find))))
    .sort((a, b) => label(a).localeCompare(label(b), undefined, { sensitivity: 'base' }));
}
