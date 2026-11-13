// Filing photos into folders. A photo can sit in several; one in none is in Incoming.
import * as db from '../data/db.js';
import { lib, refresh, photoById } from '../data/library.js';
import { openSheet } from './sheet.js';
import { promptSheet } from './dialogs.js';
import { toast } from './toast.js';
import { remember } from './undo.js';
import { esc } from './util.js';

const PLUS = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';

export async function newFolder() {
  const name = await promptSheet({ title: 'New tag', label: 'Tag name', confirmLabel: 'Make it' });
  if (!name) return null;
  const f = await db.saveFolder({ name });
  await refresh();
  return f;
}

// What Ref found in a photo, changed by hand in the viewer: saved, kept
// from the tagger from now on, and undoable.
export async function relabel(p, tags) {
  const before = { tags: p.tags, tagsEdited: p.tagsEdited };
  await db.patchPhoto(p.id, { tags, tagsEdited: true });
  await refresh();
  remember('changing what is in it', () => db.patchPhoto(p.id, before));
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
      title: photos.length === 1 ? 'Tag this photo' : `Tag ${photos.length} photos`,
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
          <button type="button" class="tick add" data-new>${PLUS}New tag</button>
        </div>
        <div class="sheet-actions one"><button type="button" class="btn primary" data-save>Done</button></div>`;
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
