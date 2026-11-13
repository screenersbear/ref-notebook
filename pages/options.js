// The sun on the shut notebook (inside Documenting Fictions, the menu at the
// top of Mood boards): how the app looks and where it opens.
import { openSheet } from '../components/sheet.js';
import { confirmSheet } from '../components/dialogs.js';
import { toast } from '../components/toast.js';
import { pickFiles } from '../data/photos.js';
import { stickers, cropSticker, placeSticker, removeSticker, stickerThumb } from '../components/stickers.js';
import { esc } from '../components/util.js';
import { openIntro } from './intro.js';

const BOOK_KEY = 'ref-notebook-book'; // also read in index.html, before the first paint
const START_KEY = 'ref-notebook-start';
const COLORS = [['orange', 'Orange'], ['mango', 'Mango'], ['berry', 'Berry'], ['fern', 'Fern'], ['ocean', 'Ocean'], ['ink', 'Black']];
const startsOpen = () => { try { return localStorage.getItem(START_KEY) === 'open'; } catch { return false; } };
export const startPage = () => (startsOpen() ? '#/boards' : '');

function useBook(name) {
  document.documentElement.dataset.book = name;
  try { localStorage.setItem(BOOK_KEY, name); } catch {}
}

export function openOptions() {
  const now = document.documentElement.dataset.book;
  const s = openSheet({
    title: 'Options',
    body: `
      <span class="field-label">App color</span>
      <div class="opt-colors">
        ${COLORS.map(([key, name]) => `
          <button type="button" class="opt-color" data-color="${key}" aria-pressed="${key === now}">
            <span class="opt-book" style="background-image:url(art/${key}-cover.webp)"></span>
            <span>${name}</span>
          </button>`).join('')}
      </div>
      ${window.DF_SUITE ? '' : `<span class="field-label opt-gap">Stickers</span>
      <button type="button" class="btn secondary opt-wide" data-stickers>Stickers</button>`}
      ${window.DF_SUITE ? '' : `<span class="field-label opt-gap">Always start</span>
      <div class="seg opt-seg">
        <button type="button" data-start="shut"${startsOpen() ? '' : ' class="on"'}>In the notebook</button>
        <button type="button" data-start="open"${startsOpen() ? ' class="on"' : ''}>On the first page</button>
      </div>`}
      <span class="field-label opt-gap">Backup</span>
      <button type="button" class="btn secondary opt-wide" data-save-backup>Save a backup</button>
      <button type="button" class="btn secondary opt-wide" data-restore-backup>Restore a backup</button>
      <button type="button" class="btn secondary opt-wide opt-gap" data-intro>How it works</button>`,
  });
  s.body.addEventListener('click', (e) => {
    const c = e.target.closest('[data-color]');
    if (c) {
      useBook(c.dataset.color);
      s.body.querySelectorAll('[data-color]').forEach((b) => b.setAttribute('aria-pressed', String(b === c)));
    }
    const st = e.target.closest('[data-start]');
    if (st) {
      try { localStorage.setItem(START_KEY, st.dataset.start); } catch {}
      s.body.querySelectorAll('[data-start]').forEach((b) => b.classList.toggle('on', b === st));
    }
    if (e.target.closest('[data-stickers]')) stickerSheet(s);
    if (e.target.closest('[data-intro]')) { s.close(); openIntro(); }
    if (e.target.closest('[data-save-backup]')) saveBackup();
    if (e.target.closest('[data-restore-backup]')) restoreBackup(() => s.close());
  });
}

// Everything in the notebook as one file, and back: the notebooks' zip
// (df-data.js), put together from what's stored so the phone never has to
// hold the notebook in memory. Made first, then saved from a tap of its
// own, as an iPhone only shares a file straight from a tap. Backups made
// the first way (one .json) still go back in, and so does this notebook's
// part of a backup of all four from the shelf.
function saveBackup() {
  const D = window.DFData;
  let open = true;
  let made = null;
  const s = openSheet({
    title: 'Save a backup',
    className: 'sheet-small',
    body: '<p class="sheet-message" data-msg>Putting it together</p>',
    onClose: () => { open = false; if (made) made.done(); },
  });
  const msg = s.body.querySelector('[data-msg]');
  D.zipBackup({
    app: 'ref',
    databases: ['ref-notebook'],
    extra: { book: document.documentElement.dataset.book || '' },
    filename: `ref-backup-${D.todayStr()}.zip`,
    onProgress: (f) => { if (open) msg.textContent = `Putting it together, ${Math.floor(f * 100)}%`; },
  }).then((m) => {
    made = m;
    if (!open) { if (m) m.done(); return; }
    if (!m) { msg.textContent = 'There is nothing to back up yet.'; return; }
    const steps = D.backupSteps(m); // one file, or a few on a phone: a tap each
    msg.textContent = steps.note;
    msg.insertAdjacentHTML('afterend', `<button type="button" class="btn secondary opt-wide" data-save>${steps.label}</button>`);
    const btn = s.body.querySelector('[data-save]');
    btn.addEventListener('click', async () => {
      try {
        if (!(await steps.tap())) { btn.textContent = steps.label; return; }
        s.close();
        toast('Backup saved');
      } catch (err) {
        console.error(err);
        toast(err.message || 'The backup wasn\'t saved.');
      }
    });
  }).catch((err) => {
    console.error(err);
    if (open) msg.textContent = err.message || 'The backup couldn\'t be made.';
  });
}
async function restoreBackup(close) {
  const D = window.DFData;
  const files = await D.pickFiles('.zip,application/zip,.json,application/json'); // straight from the tap, or iOS won't open the picker
  if (!files.length) return;
  if (!(await confirmSheet({ title: 'Restore backup', message: 'Everything in ref now is swapped for what\'s in the file.', confirmLabel: 'Restore', danger: true }))) return;
  toast('Restoring the backup', { ms: 600000 });
  try {
    const r = (await D.isZipFile(files[0]))
      ? await D.restoreZip(files, { databases: ['ref-notebook'] }) // a backup saved as a few files comes back as all of them
      : await D.importDb(files[0], 'ref-notebook', { app: 'ref', replace: true });
    const book = (r.extra && r.extra.book) || (r.local ? await r.local(BOOK_KEY) : null);
    if (book) { try { localStorage.setItem(BOOK_KEY, book); } catch {} }
    close();
    toast('Backup restored');
    setTimeout(() => location.reload(), 700); // everything on screen read fresh
  } catch (err) {
    console.error(err);
    toast(err.message || 'That backup couldn\'t be restored.');
  }
}

function stickerSheet(options) {
  const s = openSheet({
    title: 'Stickers',
    body: `
      <div class="sticker-kinds">
        <button type="button" class="sticker-kind" data-shape="circle"><span class="shape circle"></span><span>Circle</span></button>
        <button type="button" class="sticker-kind" data-shape="square"><span class="shape square"></span><span>Square</span></button>
        <button type="button" class="sticker-kind" data-shape="rect"><span class="shape rect"></span><span>Rectangle</span></button>
      </div>
      ${stickers.length ? '<button type="button" class="btn secondary opt-wide" data-remove>Remove sticker</button>' : ''}`,
  });
  s.body.addEventListener('click', (e) => {
    const k = e.target.closest('[data-shape]');
    if (k) {
      pickFiles(false).then(async ([file]) => { // straight from the tap, or iOS blocks it
        if (!file) return;
        try {
          s.close();
          options.close();
          const bytes = await cropSticker(file, k.dataset.shape);
          if (bytes) placeSticker(k.dataset.shape, bytes);
        } catch (err) {
          console.error(err);
          toast('Could not read that photo');
        }
      });
    }
    if (e.target.closest('[data-remove]')) { s.close(); removeSheet(); }
  });
}

function removeSheet() {
  const s = openSheet({ title: 'Remove sticker', onClose: () => window.removeEventListener('ref-stickers', draw) });
  function draw() {
    if (!stickers.length) { s.close(); return; }
    s.body.innerHTML = `<div class="sticker-list">${[...stickers].reverse().map((st) => `<button type="button" class="sticker-pick ${esc(st.shape)}" data-id="${esc(st.id)}" aria-label="Remove this sticker"><img src="${stickerThumb(st)}" alt="" /></button>`).join('')}</div>`;
  }
  window.addEventListener('ref-stickers', draw); // Undo brings one back
  draw();
  s.body.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-id]');
    if (!b) return;
    await removeSticker(stickers.find((x) => x.id === b.dataset.id));
  });
}
