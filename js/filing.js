// Filing photos into folders. A photo can sit in several; one in none is in Incoming.
import * as db from './db.js';
import { lib, refresh, photoById } from './library.js';
import { openSheet, promptSheet, toast } from './ui.js';
import { remember } from './undo.js';
import { esc } from './util.js';

export async function newFolder() {
  const name = await promptSheet({ title: 'New folder', label: 'Folder name', confirmLabel: 'Make it' });
  if (!name) return null;
  const f = await db.saveFolder({ name });
  await refresh();
  return f;
}

// Saves new folders or favorites for some photos, and remembers how to undo it.
export async function changePhotos(photos, change, label) {
  const before = photos.map((p) => ({ id: p.id, folderIds: p.folderIds, favorite: p.favorite }));
  await db.savePhotos(photos.map((p) => ({ ...p, ...change(p) })));
  await refresh();
  remember(label, async () => { for (const b of before) await db.patchPhoto(b.id, { folderIds: b.folderIds, favorite: b.favorite }); });
}

// Ticked: every picked photo is in that folder. A dash: only some are. Only
// the boxes you change do anything, so the others stay as they were.
export function fileSheet(ids) {
  return new Promise((resolve) => {
    const photos = ids.map(photoById).filter(Boolean);
    const inCount = (id) => photos.filter((p) => p.folderIds.includes(id)).length;
    const changes = new Map(); // folder id -> true (put in) / false (take out)
    let saved = false;
    const s = openSheet({
      title: photos.length === 1 ? 'File in' : `File ${photos.length} photos in`,
      onClose: () => resolve(saved),
    });
    const draw = () => {
      s.body.innerHTML = `
        ${lib.folders.length > 8 ? '<input class="find" type="search" placeholder="Find a folder" autocomplete="off" />' : ''}
        <div class="tick-list">
          ${lib.folders.map((f) => {
            const on = changes.has(f.id) ? changes.get(f.id) : inCount(f.id) === photos.length;
            return `<label class="tick" data-name="${esc(f.name.toLowerCase())}"><input type="checkbox" value="${esc(f.id)}"${on ? ' checked' : ''} /><span>${esc(f.name)}</span></label>`;
          }).join('')}
          <button type="button" class="tick add" data-new>+ New folder</button>
        </div>
        <div class="sheet-actions"><button type="button" class="btn secondary" data-close>Cancel</button><button type="button" class="btn primary" data-save>Save</button></div>`;
      s.body.querySelectorAll('.tick input').forEach((box) => {
        const n = inCount(box.value);
        box.indeterminate = !changes.has(box.value) && n > 0 && n < photos.length;
      });
      s.body.querySelector('.find')?.addEventListener('input', (e) => {
        const q = e.target.value.trim().toLowerCase();
        s.body.querySelectorAll('.tick[data-name]').forEach((t) => { t.hidden = !t.dataset.name.includes(q); });
      });
    };
    draw();
    s.body.addEventListener('change', (e) => {
      if (e.target.type === 'checkbox') changes.set(e.target.value, e.target.checked);
    });
    s.body.addEventListener('click', async (e) => {
      if (e.target.closest('[data-new]')) {
        const f = await newFolder();
        if (f) { changes.set(f.id, true); draw(); }
      } else if (e.target.closest('[data-save]')) {
        if (!changes.size) { s.close(); return; }
        const apply = (p) => {
          const next = new Set(p.folderIds);
          for (const [id, on] of changes) { if (on) next.add(id); else next.delete(id); }
          return { folderIds: [...next] };
        };
        try {
          await changePhotos(photos, apply, 'filing');
        } catch (err) {
          console.error(err);
          toast('Could not save that. Try once more.');
          return;
        }
        saved = true;
        s.close();
        const home = photos.every((p) => !apply(p).folderIds.length);
        toast(home ? 'Back in Incoming' : 'Filed');
      }
    });
  });
}
