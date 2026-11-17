// Who it's for (round 3, ref/09-who-its-for): RECENT people first, each
// with a short line. A person's things in the notebooks in, rows out (no
// page, no saved data), so it's unit tested (tests/unit/ref/who-lines.test.mjs).

// How many show under RECENT before anything is typed in the search.
export const RECENT_MOST = 12;

const label = (r) => r.name || r.instagram || r.tiktok || '';

// What the line under a name says: their group in Rounds or their role on
// a shoot, then how many shoots they're on in The Eye, or else their handle.
// "Talent · 4 shoots", "Client · @lindsey.t".
export function whoLine({ group = '', role = '', shoots = 0, handle = '' } = {}) {
  const after = shoots ? `${shoots} ${shoots === 1 ? 'shoot' : 'shoots'}` : handle ? `@${handle}` : '';
  return [group || role, after].filter(Boolean).join(' · ');
}

// What the sheet knows of someone, from their things by notebook (as
// DFData.thingsFor gives them) and their role. `last`: the day of their
// newest shoot or board (Rounds' day is when something's due, so it's left out).
export function aboutPerson(record, byApp = {}, role = '') {
  const rounds = (byApp.rounds || []).find((t) => t.kind === 'person');
  const days = Object.entries(byApp).filter(([app]) => app !== 'rounds').flatMap(([, list]) => list.map((t) => t.day)).filter(Boolean).sort();
  return {
    group: (rounds && rounds.more && rounds.more.group) || '',
    role,
    shoots: (byApp['the-eye'] || []).filter((t) => t.kind === 'shoot').length,
    handle: record.instagram || record.tiktok || '',
    last: days[days.length - 1] || '',
  };
}

// The newest first; those with nothing yet after them, by name.
export function recentFirst(rows) {
  return [...rows].sort((a, b) => (b.last || '').localeCompare(a.last || '') || label(a.record).localeCompare(label(b.record), undefined, { sensitivity: 'base' }));
}
