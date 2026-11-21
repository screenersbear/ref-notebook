// The first visit's walk through Incoming (data/first-guide.js keeps the
// step): starting it, and the note on Incoming saying what to do next.
import { guideStep, setGuide, wantsGuide, guideWords } from '../data/first-guide.js';
import { lib } from '../data/library.js';
import { esc } from './util.js';

const store = () => { try { return window.localStorage; } catch { return null; } };
export const currentGuide = () => guideStep(store());
export const moveGuide = (step) => setGuide(store(), step);

// After the first cards: someone with no photos yet goes to Incoming, on step 1.
export function startGuide() {
  if (!wantsGuide(lib.photos.length)) return;
  moveGuide('pick');
  if (location.hash === '#/folder/incoming') window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = '#/folder/incoming';
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
