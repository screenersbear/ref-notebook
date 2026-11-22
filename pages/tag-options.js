// A tag page's options: Rename (your own tags) and Delete tag, which asks
// what goes (Starky, 21 Nov): just the tag, its photos staying in the
// notebook, or the tag and every photo in it. A found tag (what Ref found in
// the photos, data/found-tags.js) is taken off its photos and not found again.
// Both can be undone.
import * as db from '../data/db.js';
import { refresh, photosIn } from '../data/library.js';
import { withoutLabel } from '../data/found-tags.js';
import { choiceSheet, promptSheet } from '../components/dialogs.js';
import { remember, undoLast } from '../components/undo.js';
import { toast } from '../components/toast.js';

const photosWord = (n) => `${n} ${n === 1 ? 'photo' : 'photos'}`;

// renamed(name): the page shows the new name.
export async function tagOptions(folder, renamed) {
  const options = [...(folder.found ? [] : [{ key: 'rename', label: 'Rename' }]), { key: 'delete', label: 'Delete tag', danger: true }];
  const key = await choiceSheet({ title: folder.name, options });
  if (key === 'rename') {
    const name = await promptSheet({ title: 'Rename tag', value: folder.name });
    if (name) { await db.saveFolder({ ...folder, name }); await refresh(); renamed(name); }
  } else if (key === 'delete') await deleteTag(folder);
}

async function deleteTag(folder) {
  const had = photosIn(folder.id);
  const n = had.length;
  const how = await choiceSheet({ title: `Delete ${folder.name}?`, options: [
    { key: 'tag', label: 'Just the tag', detail: `Its ${photosWord(n)} stay in the notebook${folder.found ? '' : ', without this tag'}` },
    ...(n ? [{ key: 'photos', label: `The tag and its ${photosWord(n)}`, detail: 'They leave this notebook and any boards they are on', danger: true }] : []),
  ] });
  if (!how) return;
  try {
    if (how === 'photos') await withPhotos(folder, had.map((p) => p.id));
    else if (folder.found) await untagFound(folder, had);
    else await justTheTag(folder, had.map((p) => p.id));
  } catch (err) {
    console.error(err);
    toast('Could not save that. Try once more.');
    return;
  }
  location.hash = '#/folders';
  toast(how === 'photos' ? `Tag and ${photosWord(n)} deleted` : 'Tag deleted', { action: { label: 'Undo', run: () => undoLast().then(() => { location.hash = `#/folder/${encodeURIComponent(folder.id)}`; }) } });
}

async function justTheTag(folder, ids) {
  const copy = { ...folder };
  await db.deleteFolder(folder.id);
  await refresh();
  remember('deleting a tag', () => db.restoreFolder(copy, ids));
}

// Off every photo, and kept off: the tagger leaves a photo changed by hand alone.
async function untagFound(folder, photos) {
  const before = photos.map((p) => ({ id: p.id, tags: p.tags, tagsEdited: p.tagsEdited }));
  await db.savePhotos(photos.map((p) => ({ ...p, tags: withoutLabel(p, folder.label), tagsEdited: true })));
  await refresh();
  remember('deleting a tag', async () => { for (const b of before) await db.patchPhoto(b.id, { tags: b.tags, tagsEdited: b.tagsEdited }); });
}

async function withPhotos(folder, ids) {
  const kept = await db.keepForUndo(ids);
  await db.deletePhotos(ids);
  if (!folder.found) await db.deleteFolder(folder.id);
  await refresh();
  const copy = { ...folder };
  remember('deleting a tag and its photos', async () => {
    await db.putBack(kept);
    if (!copy.found) await db.restoreFolder(copy, ids);
  });
}
