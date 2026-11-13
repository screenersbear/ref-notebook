// Keeps sheets above the iPhone keyboard (runs once, when the app starts).

// On an iPhone the keyboard covers the bottom of the screen without
// shrinking the page, so a bottom sheet would slide under it. The visible
// area is tracked here (as --vv-top and --vv-height) and sheets keep inside it.
const vv = window.visualViewport;
const html = document.documentElement;
// Follow the visible area only while typing: once the keyboard is down iOS can
// leave a stuck offset behind, which would push the next sheet off screen.
let leftoverTop = 0;
function fitViewport() {
  if (!vv) return;
  const a = document.activeElement;
  const typingNow = !!a && a.matches('input:not([type="checkbox"]), textarea, [contenteditable]');
  if (!typingNow) leftoverTop = vv.offsetTop;
  html.style.setProperty('--vv-top', `${typingNow ? Math.max(0, vv.offsetTop - leftoverTop) : 0}px`);
  html.style.setProperty('--vv-height', `${typingNow ? vv.height : window.innerHeight}px`);
}
if (vv) {
  vv.addEventListener('resize', fitViewport);
  vv.addEventListener('scroll', fitViewport);
  document.addEventListener('focusin', fitViewport);
  document.addEventListener('focusout', () => setTimeout(fitViewport, 300));
  fitViewport();
}
