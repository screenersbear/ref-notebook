// Filing photos into folders. A photo can sit in several; one in none is in Incoming.
import * as db from './db.js';
import { lib, refresh, photoById } from './library.js';
import { openSheet, promptSheet, toast } from './ui.js';
import { esc } from './util.js';

export async function newFolder() {
  const name = await promptSheet({ title: 'New folder', label: 'Folder name', confirmLabel: 'Make it' });
  if (!name) return null;
  const f = await db.saveFolder({ name });
  await refresh();
  return f;
}

// One photo: its folders can be changed either way. Several: adds them to what you tick.
export function fileSheet(ids) {
  return new Promise((resolve) => {
    const single = ids.length === 1 ? photoById(ids[0]) : null;
    const ticked = new Set(single ? single.folderIds : []);
    let saved = false;
    const s = openSheet({
      title: single ? 'File in' : `File ${ids.length} photos in`,
      onClose: () => resolve(saved),
    });
    const draw = () => {
      s.body.innerHTML = `
        ${lib.folders.length > 8 ? '<input class="find" type="search" placeholder="Find a folder" autocomplete="off" />' : ''}
        <div class="tick-list">
          ${lib.folders.map((f) => `<label class="tick" data-name="${esc(f.name.toLowerCase())}"><input type="checkbox" value="${esc(f.id)}"${ticked.has(f.id) ? ' checked' : ''} /><span>${esc(f.name)}</span></label>`).join('')}
          <button type="button" class="tick add" data-new>+ New folder</button>
        </div>
        <div class="sheet-actions"><button type="button" class="btn secondary" data-close>Cancel</button><button type="button" class="btn primary" data-save>Save</button></div>`;
      s.body.querySelector('.find')?.addEventListener('input', (e) => {
        const q = e.target.value.trim().toLowerCase();
        s.body.querySelectorAll('.tick[data-name]').forEach((t) => { t.hidden = !t.dataset.name.includes(q); });
      });
    };
    draw();
    s.body.addEventListener('change', (e) => {
      if (e.target.type !== 'checkbox') return;
      if (e.target.checked) ticked.add(e.target.value); else ticked.delete(e.target.value);
    });
    s.body.addEventListener('click', async (e) => {
      if (e.target.closest('[data-new]')) {
        const f = await newFolder();
        if (f) { ticked.add(f.id); draw(); }
      } else if (e.target.closest('[data-save]')) {
        const list = ids.map(photoById).filter(Boolean).map((p) => ({
          ...p, folderIds: single ? [...ticked] : [...new Set([...p.folderIds, ...ticked])],
        }));
        await db.savePhotos(list);
        await refresh();
        saved = true;
        s.close();
        toast(ticked.size ? 'Filed' : 'Back in Incoming');
      }
    });
  });
}
