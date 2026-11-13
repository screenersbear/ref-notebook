// Swiping right on Mood boards (or on the bar) shuts the notebook: the cover
// follows the finger in from the left, and letting go past the middle closes it.
import { setPuller } from './navbar.js';

const pull = document.getElementById('pull');
let pulled = 0;
const pullStart = () => { pull.classList.remove('back'); pull.hidden = false; pulled = 0; };
const pullMove = (w) => { pulled = Math.min(w, window.innerWidth); pull.style.width = `${pulled}px`; };
function pullEnd() {
  if (pulled > window.innerWidth * 0.45) {
    pull.hidden = true;
    pull.style.width = '0';
    location.hash = '#/';
  } else {
    pull.classList.add('back');
    pull.style.width = '0';
    setTimeout(() => { pull.hidden = true; }, 200);
  }
}
setPuller({ start: pullStart, move: pullMove, end: pullEnd });
