// The toast: a short message at the bottom of the screen, with an optional
// button (like Undo).
import { esc } from './util.js';

let toastTimer;
export function toast(message, { action, ms = 3200 } = {}) {
  const el = document.getElementById('toast');
  el.innerHTML = `<span>${esc(message)}</span>${action ? `<button type="button" class="toast-action">${esc(action.label)}</button>` : ''}`;
  el.hidden = false;
  // Its own name for the fade: .show is the slideshow's (styles/showboard.css).
  el.classList.remove('toast-in');
  void el.offsetWidth;
  el.classList.add('toast-in');
  if (action) {
    el.querySelector('.toast-action').addEventListener('click', () => {
      el.hidden = true;
      action.run();
    });
  }
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.hidden = true;
  }, action ? ms + 2000 : ms);
}

export function hideToast() {
  clearTimeout(toastTimer);
  const el = document.getElementById('toast');
  if (el) el.hidden = true;
}
