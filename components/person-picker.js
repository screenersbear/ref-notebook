// The Who it's for sheet (round 2, connect/11): everyone in the one list of
// people as rows (their photo from Rounds, their name and handle), a box to
// find someone in a long list, and Add someone new (a name and an Instagram
// handle; they join the list). Rows look like Send to shoot's. Resolves the
// person picked ({ id, name, instagram, tiktok, photo }), 'nobody' (Not for
// anyone, when someone was picked), or null when closed.
import { openSheet } from './sheet.js';
import { esc } from './util.js';
import { peopleMatching } from '../data/next-time.js';

const line = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const PLUS = line('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>');
const SOMEONE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="8.5" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0z"/></svg>';
const FIND_FROM = 7; // people before the find box shows
const D = () => window.DFData;

// Their photos: what Rounds keeps for each person, as addresses.
async function photosOf(records) {
  const out = new Map();
  for (const t of (await D().thingsAll()).filter((x) => x.app === 'rounds' && x.kind === 'person' && x.covers.length)) {
    const r = D().findPerson(records, t.people[0]);
    if (r && !out.has(r.id)) out.set(r.id, D().pictureUrl(t.covers[0]));
  }
  return out;
}

export async function pickPerson({ picked = null } = {}) {
  let records = await D().peopleAll();
  const photos = await photosOf(records);
  return new Promise((resolve) => {
    let answer = null;
    const row = (r) => `<button type="button" class="send-shoot who-pick" data-person="${esc(r.id)}"${r.id === picked ? ' aria-current="true"' : ''}>
      <span class="send-thumb">${photos.get(r.id) ? `<img src="${esc(photos.get(r.id))}" alt="" />` : SOMEONE}</span>
      <span class="send-words"><span class="send-name">${esc(r.name || `@${r.instagram || r.tiktok}`)}</span>${r.name && (r.instagram || r.tiktok) ? `<span class="send-line">@${esc(r.instagram || r.tiktok)}</span>` : ''}</span></button>`;
    const s = openSheet({
      title: "Who it's for",
      className: 'send-sheet who-sheet',
      body: `
        ${records.length >= FIND_FROM ? '<label class="field who-find"><span class="field-label">Find someone</span><input type="search" data-find placeholder="A name or handle" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" /></label>' : ''}
        <div class="send-list" data-list>${records.length ? '' : '<p class="send-lead">No one in your notebooks yet.</p>'}</div>
        <button type="button" class="send-new" data-add><span class="send-plus">${PLUS}</span>Add someone new</button>
        <form class="form who-add" data-new hidden>
          <label class="field"><span class="field-label">Name</span><input type="text" name="name" maxlength="80" autocomplete="off" enterkeyhint="next" /></label>
          <label class="field"><span class="field-label">Instagram</span><input type="text" name="instagram" placeholder="@handle" maxlength="60" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" /></label>
          <div class="sheet-actions one"><button type="submit" class="btn primary">Add them</button></div>
        </form>
        ${picked ? '<button type="button" class="btn secondary who-nobody" data-nobody>Not for anyone</button>' : ''}`,
      onClose: () => {
        photos.forEach((u, id) => { if (!answer || answer.id !== id) URL.revokeObjectURL(u); });
        resolve(answer);
      },
    });
    const list = s.body.querySelector('[data-list]');
    const find = s.body.querySelector('[data-find]');
    const paint = () => {
      const shown = peopleMatching(records, find ? find.value : '');
      if (records.length) list.innerHTML = shown.length ? shown.map(row).join('') : '<p class="send-lead">No one by that name.</p>';
    };
    paint();
    find?.addEventListener('input', paint);
    const pick = (r) => { answer = { id: r.id, name: r.name, instagram: r.instagram || '', tiktok: r.tiktok || '', photo: photos.get(r.id) || '' }; s.close(); };
    s.body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-person]');
      if (b) { pick(records.find((r) => r.id === b.dataset.person)); return; }
      if (e.target.closest('[data-nobody]')) { answer = 'nobody'; s.close(); return; }
      if (e.target.closest('[data-add]')) {
        s.body.querySelector('[data-add]').hidden = true;
        const form = s.body.querySelector('[data-new]');
        form.hidden = false;
        form.elements.name.value = find ? find.value.trim() : '';
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
