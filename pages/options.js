// Options (the ≡ in the band, and the sun on the shut notebook), in the round
// 2 look (09-options): the notebook's colour as swatches, then rows for the
// boards (default page size, recognizing what's in new photos), backups and
// help. On its own (not in the suite) also where it starts and the stickers.
// Backups are in options-backup.js, stickers in options-stickers.js.
import { openSheet } from '../components/sheet.js';
import { choiceSheet } from '../components/dialogs.js';
import { tagsOn, turnOnTags, turnOffTags } from '../data/tagger.js';
import { openIntro } from './intro.js';
import { saveBackup, restoreBackup } from './options-backup.js';
import { stickerSheet } from './options-stickers.js';

const BOOK_KEY = 'ref-notebook-book'; // also read in index.html, before the first paint
const START_KEY = 'ref-notebook-start';
export const SHAPE_KEY = 'ref-notebook-shape'; // the new board guide starts with it
const COLORS = [['mango', 'Mango'], ['orange', 'Orange'], ['berry', 'Berry'], ['fern', 'Fern'], ['ocean', 'Ocean'], ['leaf', 'Leaf'], ['ink', 'Black']];
const SHAPES = [['letter-portrait', 'Tall'], ['wide-16x9', 'Wide']];
const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const startsOpen = () => read(START_KEY) === 'open';
export const startPage = () => (startsOpen() ? '#/boards' : '');
export const defaultShape = () => (SHAPES.some(([k]) => k === read(SHAPE_KEY)) ? read(SHAPE_KEY) : 'letter-portrait');

const TICK = '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="5 12.5 10 17 19 7"/></svg>';
const CHEVRON = '<svg class="opt-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg>';
const recognizeLine = () => (tagsOn() ? 'On. Runs on this phone, nothing is uploaded' : 'Off. New photos are not looked at');

function useBook(name) {
  document.documentElement.dataset.book = name;
  write(BOOK_KEY, name);
}

// A swatch for each colour: the band with its partner's line and half circle,
// ticked when it's the one.
function colorsHtml() {
  const now = document.documentElement.dataset.book || 'ocean';
  return `<div class="opt-colors" role="radiogroup" aria-label="Notebook color">${COLORS.map(([key, name]) => `
    <button type="button" class="opt-color" role="radio" data-color="${key}" aria-checked="${key === now}">
      <span class="opt-swatch" data-swatch="${key}"><span class="opt-swatch-line"></span><span class="opt-swatch-sun"></span>${key === now ? `<span class="opt-swatch-tick">${TICK}</span>` : ''}</span>
      <span class="opt-color-name">${name}</span>
    </button>`).join('')}</div>`;
}
const row = (attr, name, sub = '') => `<button type="button" class="opt-row" ${attr}><span class="opt-row-words"><span class="opt-row-name">${name}</span>${sub ? `<span class="opt-row-sub">${sub}</span>` : ''}</span>${CHEVRON}</button>`;

export function openOptions() {
  const alone = !window.DF_SUITE;
  const shapeName = () => SHAPES.find(([k]) => k === defaultShape())[1];
  const s = openSheet({
    title: 'Options',
    className: 'opt-sheet',
    body: `
      <span class="opt-label">Notebook color</span>
      <div data-colors>${colorsHtml()}</div>
      ${alone ? `<span class="opt-label opt-gap">Always start</span>
      <div class="opt-seg">
        <button type="button" data-start="shut"${startsOpen() ? '' : ' class="on"'}>In the notebook</button>
        <button type="button" data-start="open"${startsOpen() ? ' class="on"' : ''}>On the first page</button>
      </div>` : ''}
      <span class="opt-label opt-gap">Boards</span>
      <div class="opt-rows">
        ${row('data-shape-row', 'Default page size', `<span data-shape-now>${shapeName()}</span>`)}
        <label class="opt-row opt-switch-row"><span class="opt-row-words"><span class="opt-row-name">Recognize what's in new photos</span><span class="opt-row-sub" data-recognize-line>${recognizeLine()}</span></span>
          <input type="checkbox" class="switch" role="switch" data-recognize${tagsOn() ? ' checked' : ''} /></label>
      </div>
      ${alone ? `<span class="opt-label opt-gap">Cover</span><div class="opt-rows">${row('data-stickers', 'Stickers')}</div>` : ''}
      <span class="opt-label opt-gap">Backups</span>
      <div class="opt-rows">${row('data-save-backup', 'Save a backup')}${row('data-restore-backup', 'Restore a backup')}</div>
      <span class="opt-label opt-gap">Help</span>
      <div class="opt-rows">${row('data-intro', 'How it works')}</div>`,
  });
  s.body.addEventListener('click', async (e) => {
    const c = e.target.closest('[data-color]');
    if (c) { useBook(c.dataset.color); s.body.querySelector('[data-colors]').innerHTML = colorsHtml(); return; }
    const st = e.target.closest('[data-start]');
    if (st) {
      write(START_KEY, st.dataset.start);
      s.body.querySelectorAll('[data-start]').forEach((b) => b.classList.toggle('on', b === st));
    }
    if (e.target.closest('[data-shape-row]')) {
      const key = await choiceSheet({ title: 'Default page size', options: SHAPES.map(([k, name]) => ({ key: k, label: name, current: k === defaultShape(), detail: k === 'wide-16x9' ? 'For screens and sharing' : 'For printing and bringing to a shoot' })) });
      if (key) { write(SHAPE_KEY, key); s.body.querySelector('[data-shape-now]').textContent = shapeName(); }
    }
    if (e.target.closest('[data-stickers]')) stickerSheet(s);
    if (e.target.closest('[data-intro]')) { s.close(); openIntro(); }
    if (e.target.closest('[data-save-backup]')) saveBackup();
    if (e.target.closest('[data-restore-backup]')) restoreBackup(() => s.close(), BOOK_KEY);
  });
  s.body.querySelector('[data-recognize]').addEventListener('change', (e) => {
    if (e.target.checked) turnOnTags(); else turnOffTags();
    s.body.querySelector('[data-recognize-line]').textContent = recognizeLine();
  });
}
