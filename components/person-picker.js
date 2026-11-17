// The Who it's for sheet (round 3, ref/09-who-its-for; first made in round
// 2, connect/11): ADD A NEW PERSON first (a name and an Instagram handle;
// they join the one list of people), then the search, then RECENT people as
// rows like Send to shoot's (their photo from Rounds, their name and a short
// line: data/who-lines.js), and "No one, it's just for me" at the end.
// Resolves the person picked ({ id, name, instagram, tiktok, photo }),
// 'nobody', or null when closed.
import { openSheet } from './sheet.js';
import { esc } from './util.js';
import { peopleMatching } from '../data/next-time.js';
import { whoLine, aboutPerson, recentFirst, RECENT_MOST } from '../data/who-lines.js';

const line = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const PLUS = line('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>');
const SEARCH = line('<circle cx="11" cy="11" r="6.5"/><line x1="16" y1="16" x2="20.5" y2="20.5"/>');
const SOMEONE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="8.5" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0z"/></svg>';
const D = () => window.DFData;

// Their photos: what Rounds keeps for each person, as addresses.
async function photosOf(records, things) {
  const out = new Map();
  for (const t of things.filter((x) => x.app === 'rounds' && x.kind === 'person' && x.covers.length)) {
    const r = D().findPerson(records, t.people[0]);
    if (r && !out.has(r.id)) out.set(r.id, D().pictureUrl(t.covers[0]));
  }
  return out;
}

export async function pickPerson({ picked = null } = {}) {
  let records = await D().peopleAll();
  const things = await D().thingsAll();
  const photos = await photosOf(records, things);
  const about = new Map(records.map((r) => [r.id, aboutPerson(r, D().thingsFor(r, things), D().roleOf(r, things))]));
  return new Promise((resolve) => {
    let answer = null;
    const row = (r) => {
      const words = whoLine(about.get(r.id));
      return `<button type="button" class="send-shoot who-pick" data-person="${esc(r.id)}"${r.id === picked ? ' aria-current="true"' : ''}>
      <span class="send-thumb">${photos.get(r.id) ? `<img src="${esc(photos.get(r.id))}" alt="" />` : SOMEONE}</span>
      <span class="send-words"><span class="send-name">${esc(r.name || `@${r.instagram || r.tiktok}`)}</span>${words ? `<span class="send-line">${esc(words)}</span>` : ''}</span></button>`;
    };
    const s = openSheet({
      title: "Who it's for",
      className: 'send-sheet who-sheet',
      body: `
        <button type="button" class="big-btn big-btn-book who-add-btn" data-add><span class="big-btn-plus">${PLUS}</span><span class="big-btn-words"><b>Add a new person</b><span>Name and handle</span></span></button>
        <form class="form who-add" data-new hidden>
          <label class="field"><span class="field-label">Name</span><input type="text" name="name" maxlength="80" autocomplete="off" enterkeyhint="next" /></label>
          <label class="field"><span class="field-label">Instagram</span><input type="text" name="instagram" placeholder="@handle" maxlength="60" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" /></label>
          <div class="sheet-actions one"><button type="submit" class="btn primary">Add them</button></div>
        </form>
        <label class="who-search">${SEARCH}<input type="search" data-find placeholder="Search people" aria-label="Search people" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" /></label>
        <p class="who-recent" data-head>Recent</p>
        <div class="send-list" data-list></div>
        <button type="button" class="who-nobody" data-nobody>No one, it's just for me</button>`,
      onClose: () => {
        photos.forEach((u, id) => { if (!answer || answer.id !== id) URL.revokeObjectURL(u); });
        resolve(answer);
      },
    });
    const list = s.body.querySelector('[data-list]');
    const find = s.body.querySelector('[data-find]');
    const head = s.body.querySelector('[data-head]');
    // Nothing typed: the most recent. Something typed: everyone it finds.
    const paint = () => {
      const q = find.value.trim();
      const shown = q ? peopleMatching(records, q) : recentFirst(records.map((r) => ({ record: r, ...about.get(r.id) }))).slice(0, RECENT_MOST).map((x) => x.record);
      head.hidden = !!q || !shown.length;
      list.innerHTML = shown.length ? shown.map(row).join('') : `<p class="send-lead">${q ? 'No one by that name.' : 'No one in your notebooks yet.'}</p>`;
    };
    paint();
    find.addEventListener('input', paint);
    const pick = (r) => { answer = { id: r.id, name: r.name, instagram: r.instagram || '', tiktok: r.tiktok || '', photo: photos.get(r.id) || '' }; s.close(); };
    s.body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-person]');
      if (b) { pick(records.find((r) => r.id === b.dataset.person)); return; }
      if (e.target.closest('[data-nobody]')) { answer = 'nobody'; s.close(); return; }
      if (e.target.closest('[data-add]')) {
        s.body.querySelector('[data-add]').hidden = true;
        const form = s.body.querySelector('[data-new]');
        form.hidden = false;
        form.elements.name.value = find.value.trim();
        form.elements.name.focus();
      }
    });
    s.body.querySelector('[data-new]').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = { name: e.target.elements.name.value.trim(), instagram: D().cleanHandle(e.target.elements.instagram.value) };
      if (!f.name && !f.instagram) { e.target.elements.name.focus(); return; }
      records = await D().gatherPeople([f]);
      pick(D().findPerson(records, f));
    });
  });
}
