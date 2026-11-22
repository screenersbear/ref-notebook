// The first visit's walk through Incoming (data/first-guide.js keeps the
// step): starting it, and the note on Incoming saying what to do next.
import { guideStep, setGuide, wantsGuide, guideWords, afterImport } from '../data/first-guide.js';
import { lib } from '../data/library.js';
import { pickFiles } from '../data/photos.js';
import { openSheet } from './sheet.js';
import { bringIn } from './bring-in.js';
import { esc } from './util.js';

const store = () => { try { return window.localStorage; } catch { return null; } };
export const currentGuide = () => guideStep(store());
export const moveGuide = (step) => setGuide(store(), step);

const toIncoming = () => {
  if (location.hash === '#/folder/incoming') window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = '#/folder/incoming';
};

// After the first cards: someone with no photos yet is asked to bring their
// own in (Starky, 21 Nov), then goes to Incoming, on step 1 (or 2, with photos).
export function startGuide() {
  if (!wantsGuide(lib.photos.length)) return;
  moveGuide('pick');
  const sh = openSheet({
    title: 'Bring your photos in', className: 'sheet-small', onClose: toIncoming,
    body: `<p class="sheet-message">Ref works best with your own photos in it. Pick the ones you love from your phone. Ref keeps its own copy.</p>
      <div class="sheet-actions"><button type="button" class="btn secondary" data-no>Later</button><button type="button" class="btn primary" data-yes>Open your photos</button></div>`,
  });
  sh.body.querySelector('[data-no]').addEventListener('click', () => sh.close());
  sh.body.querySelector('[data-yes]').addEventListener('click', () => {
    const picked = pickFiles(); // straight from the tap, or iOS blocks it
    sh.close();
    picked.then(async (files) => {
      if (!files.length) return;
      const r = await bringIn(files);
      moveGuide(afterImport(currentGuide(), r.photos.length));
      toIncoming();
    });
  });
}

// The note for the step it's on, or nothing.
export function guideNoteHtml() {
  const w = guideWords(currentGuide());
  if (!w) return '';
  return `<div class="guide-note" data-guide-note>
    <span class="guide-count">${esc(w.count)}</span>
    <b class="guide-title">${esc(w.title)}</b>
    <span class="guide-line">${esc(w.line)}</span>
    <button type="button" class="guide-done" data-guide-done>${esc(w.done)}</button>
  </div>`;
}

// Skip or Got it ends the walk and takes the note away.
export function wireGuideNote(view) {
  view.querySelector('[data-guide-done]')?.addEventListener('click', () => {
    moveGuide('');
    view.querySelector('[data-guide-note]')?.remove();
  });
}
