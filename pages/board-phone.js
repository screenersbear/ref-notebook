// + PHOTOS at the start of a board's tray (Starky, 21 Nov), as Layouts has
// it: photos picked from the phone come into the notebook (Incoming, the
// usual way: data/photos.js) and fill the page's empty spots in order; the
// rest wait in the tray, which turns to All so they're there first.
import { pickFiles } from '../data/photos.js';
import { bringIn } from '../components/bring-in.js';
import { pageTemplate } from '../components/board-page.js';
import { toast } from '../components/toast.js';

export function addFromPhone(ed) {
  Object.assign(ed, { fromPhone });

  async function fromPhone() {
    const files = await pickFiles(); // straight from the tap, or iOS blocks it
    if (!files.length) return;
    const r = await bringIn(files, { say: false });
    const placed = fill(r.photos.map((p) => p.id));
    ed.setTray('all');
    const n = r.photos.length;
    const words = [`${n} ${n === 1 ? 'photo' : 'photos'} added`, placed ? `${placed} on this page` : '', r.failed.length ? `${r.failed.length} could not be read` : ''];
    toast(words.filter(Boolean).join(', '));
  }

  // The page's empty spots, in order, take the new photos. How many it took.
  function fill(ids) {
    const page = ed.page(), t = pageTemplate(ed.board, page);
    const empty = t.slots.map((_, i) => i).filter((i) => !page.images[i]);
    const n = Math.min(empty.length, ids.length);
    if (!n) return 0;
    ed.snapshot();
    for (let k = 0; k < n; k++) {
      while (page.images.length <= empty[k]) page.images.push(null);
      page.images[empty[k]] = { id: ids[k] };
    }
    ed.sel = -1;
    ed.persist();
    ed.drawPage();
    return n;
  }
}
