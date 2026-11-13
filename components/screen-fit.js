// Fits the app to the iPhone's screen when it's installed on the home screen
// (runs once, when the app starts; screenGap and nudgeScreen are for tests).
const html = document.documentElement;

// iOS 26 home-screen app on an iPhone: right after it opens, iOS can leave
// the screen about a status bar short at the bottom. It won't draw anything
// pinned below that edge, so the bars can't simply be moved down. Instead
// iOS is made to measure again: for a moment the page is taller than the
// screen and scrolled a pixel and back (the fix proven in Callback). Never
// while typing.
const iPhoneApp = /iPhone|iPod/.test(navigator.userAgent) && (navigator.standalone === true || matchMedia('(display-mode: standalone)').matches);
const typing = () => !!document.activeElement && document.activeElement.matches('input, textarea, [contenteditable]');
let probe = null;
// How far short of the screen's real bottom iOS has its bottom edge, in px
// (0 when it's right). `full` stands in for the screen's height in tests.
export function screenGap(full = 0) {
  if (!document.body) return 0;
  if (!probe) {
    probe = document.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position: fixed; left: 0; bottom: 0; width: 1px; height: 0; visibility: hidden; pointer-events: none; padding-top: var(--test-safe-top, env(safe-area-inset-top));';
    document.body.appendChild(probe);
  }
  const portrait = Math.abs(window.innerWidth - screen.width) < 2;
  const real = full || (portrait ? screen.height : screen.width);
  html.style.setProperty('--screen-h', `${Math.round(real)}px`);
  const under = parseFloat(getComputedStyle(probe).paddingTop) > 0;
  const gap = Math.round(real - probe.getBoundingClientRect().bottom);
  // Drawn under the status bar, the page's top is the screen's top, so any
  // gap is missing screen. Below the status bar, one bar's height is normal
  // and twice that means a bar's height is missing.
  if (under) return gap > 8 && gap < 120 ? gap : 0;
  return gap > 76 && gap < 150 ? Math.round(gap / 2) : 0;
}
let nudging = false;
// For tests: `full` as in screenGap. Resolves with the gap left after it.
export function nudgeScreen(tries = 3, full = 0) {
  return new Promise((done) => {
    const go = (left) => {
      if (!left || !screenGap(full) || typing()) {
        nudging = false;
        done(screenGap(full));
        return;
      }
      nudging = true;
      html.classList.add('ios-nudge');
      // Timers, not animation frames: those stop while the app is put away.
      setTimeout(() => {
        const y = window.scrollY;
        window.scrollTo(0, y + 1);
        setTimeout(() => {
          window.scrollTo(0, y);
          setTimeout(() => {
            html.classList.remove('ios-nudge');
            setTimeout(() => go(left - 1), 200);
          }, 120);
        }, 40);
      }, 30);
    };
    if (nudging) done(screenGap(full));
    else go(tries);
  });
}
// How far short iOS has the screen, kept up to date: the bar comes down by
// that much less, so its icon sits where it does in the other notebooks.
// Measured again whenever the height changes, since iOS can give the strip
// back later (a class left on from before put the icon below everyone else's).
let measured = false;
function markShort(gap) {
  html.classList.toggle('is-short', gap > 0);
  if (gap > 0) html.style.setProperty('--short-by', `${gap}px`);
  else html.style.removeProperty('--short-by');
}
if (iPhoneApp) {
  let soonTimer = 0; // load, pageshow and coming back can all land together
  const soon = (ms) => clearTimeout(soonTimer) || (soonTimer = setTimeout(() => {
    // Short again (coming back): the bars go out of sight while it's put right.
    if (!nudging && screenGap() > 0) html.classList.remove('settled');
    nudgeScreen().then(async (gap) => {
      // This page doesn't scroll, and iOS can fall short again the moment it
      // can't. If so, leave it scrollable: everything on screen is pinned,
      // so nothing shows, and holdStill below keeps a finger from moving it.
      if (gap > 0) {
        html.classList.add('ios-hold');
        await new Promise((r) => setTimeout(r, 40));
        window.scrollTo(0, 1);
        await new Promise((r) => setTimeout(r, 60));
        window.scrollTo(0, 0);
        await new Promise((r) => setTimeout(r, 200));
        gap = screenGap();
        if (gap > 0) html.classList.remove('ios-hold');
      }
      measured = true;
      markShort(gap);
      setAppHeight();
      html.classList.add('settled');
    });
  }, ms));
  window.addEventListener('load', () => soon(120));
  window.addEventListener('pageshow', () => soon(80));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) soon(80); });
  window.addEventListener('orientationchange', () => soon(300));
}
// The height everything is laid out from. It only changes when the screen
// really does (turning the phone), so the bottom of the page can't jump while
// iOS measures itself or the keyboard comes and goes.
let appH = 0;
// The floating notebook centers on the real screen, known from the first
// moment, so it can't jump when iOS corrects its measurement a second later.
function setBookHeight() {
  const portrait = Math.abs(window.innerWidth - screen.width) < 2;
  html.style.setProperty('--book-h', `${iPhoneApp ? (portrait ? screen.height : screen.width) : window.innerHeight}px`);
}
setBookHeight();
window.addEventListener('resize', setBookHeight);
function setAppHeight() {
  if (html.classList.contains('ios-nudge') || nudging || typing()) return;
  const h = window.innerHeight;
  if (Math.abs(h - appH) < 2) return;
  appH = h;
  html.style.setProperty('--app-h', `${h}px`);
  if (measured) markShort(screenGap());
  window.dispatchEvent(new Event('ref-layout'));
}
setAppHeight();
// Things pinned near the bottom wait until iOS has settled its measurement.
setTimeout(() => html.classList.add('settled'), iPhoneApp ? 3500 : 0);
window.addEventListener('resize', setAppHeight);
window.addEventListener('orientationchange', () => setTimeout(setAppHeight, 350));
document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(setAppHeight, 900); });
window.addEventListener('load', () => setTimeout(setAppHeight, 900));
// While the page is left scrollable, only things that really scroll may move.
document.addEventListener('touchmove', (e) => {
  if (!html.classList.contains('ios-hold') || e.touches.length > 1) return;
  for (let el = e.target; el && el !== document.body; el = el.parentElement) {
    const st = getComputedStyle(el);
    if ((/auto|scroll/.test(st.overflowY) && el.scrollHeight > el.clientHeight) || (/auto|scroll/.test(st.overflowX) && el.scrollWidth > el.clientWidth)) return;
    if (st.touchAction === 'none') return;
  }
  e.preventDefault();
}, { passive: false });
