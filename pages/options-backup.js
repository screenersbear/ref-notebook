// Options' backups: Back up (the sheet every notebook shares,
// shared/components/backup-sheet.js: just Ref, or all four) and Restore a
// backup (a zip, a few, or an older .json).
import { confirmSheet } from '../components/dialogs.js';
import { toast } from '../components/toast.js';

// Just this notebook, or all four notebooks, as one zip (a few on a phone).
export function backUp() {
  window.DFBackupSheet.open({ here: 'ref' });
}

// Everything in the notebook swapped for a backup's. A backup of all four
// asks first (shared/components/restore-sheet.js): just Ref's part, the
// other notebooks left as they are, or all four. Backups made the first way
// (one .json) still go back in.
export async function restoreBackup(close, BOOK_KEY) {
  const D = window.DFData;
  const R = window.DFRestore;
  let files = await D.pickFiles(R.PICK); // straight from the tap, or iOS won't open the picker
  if (!files.length) return;
  const pick = await R.which(files, 'ref');
  if (!pick) return;
  if (pick.all) { close(); R.confirm(files); return; }
  files = pick.files;
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
