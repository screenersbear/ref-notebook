// A few cards on the first launch: how photos get in, and that the notebook
// keeps its own copy, so the ones on the phone can go. Options > How it works
// shows them again.
import { openSheet } from '../components/sheet.js';

const SEEN = 'ref-notebook-intro-seen';
const CARDS = [
  ['Bring your photos in', 'Open Incoming and pick photos from your phone. Tag them to sort them, then make mood boards from your tags.'],
  ['It keeps its own copy', 'Everything you add is saved inside Ref Notebook. Once a photo is in, you can delete it from your phone’s Photos to free up space, and it stays here in your boards and tags.'],
  ['Good to know', 'Photos are kept at a size made for boards and PDFs, not the full original. Your photos are saved inside the app, not in Photos. If you delete Ref Notebook from your home screen, its photos are deleted with it.'],
];

export const introSeen = () => { try { return localStorage.getItem(SEEN) === '1'; } catch { return true; } };

export function openIntro() {
  let at = 0;
  const s = openSheet({ title: CARDS[0][0], className: 'sheet-small intro', onClose: () => { try { localStorage.setItem(SEEN, '1'); } catch {} } });
  const draw = () => {
    const last = at === CARDS.length - 1;
    s.setTitle(CARDS[at][0]);
    s.body.innerHTML = `
      <p class="sheet-message">${CARDS[at][1]}</p>
      <span class="wz-dots intro-dots" aria-hidden="true">${CARDS.map((_, i) => `<i class="${i === at ? 'on' : ''}"></i>`).join('')}</span>
      <div class="sheet-actions${at ? '' : ' one'}">
        ${at ? '<button type="button" class="btn secondary" data-back>Back</button>' : ''}
        <button type="button" class="btn primary" data-next>${last ? 'Got it' : 'Next'}</button>
      </div>`;
  };
  s.body.addEventListener('click', (e) => {
    if (e.target.closest('[data-back]')) { at--; draw(); }
    else if (e.target.closest('[data-next]')) { if (at === CARDS.length - 1) s.close(); else { at++; draw(); } }
  });
  draw();
  return s;
}
