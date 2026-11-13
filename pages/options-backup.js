// Options' backups: Save a backup (the notebook as one zip, a few on a
// phone) and Restore a backup (a zip, a few, or an older .json).
import { openSheet } from '../components/sheet.js';
import { confirmSheet } from '../components/dialogs.js';
import { toast } from '../components/toast.js';

// Everything in the notebook as one file, and back: the notebooks' zip
// (df-data.js), put together from what's stored so the phone never has to
// hold the notebook in memory. Made first, then saved from a tap of its
// own, as an iPhone only shares a file straight from a tap. Backups made
// the first way (one .json) still go back in, and so does this notebook's
// part of a backup of all four from the shelf.
export function saveBackup() {
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
export async function restoreBackup(close, BOOK_KEY) {
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
