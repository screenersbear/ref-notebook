// Options' stickers (on its own, not in the suite): a photo cut to a circle,
// a square or a rectangle and stuck on the shut notebook, and taking one off.
import { openSheet } from '../components/sheet.js';
import { toast } from '../components/toast.js';
import { pickFiles } from '../data/photos.js';
import { stickers, cropSticker, placeSticker, removeSticker, stickerThumb } from '../components/stickers.js';
import { esc } from '../components/util.js';

export function stickerSheet(options) {
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
