// Turning the shut notebook by hand, like the head in Callback: drag sideways
// to spin it, up and down to tip it. Harder the further it goes; let go and it
// swings back.
const book = document.getElementById('book');

const SPIN_AWAY = 0.75, SPIN_TOWARD = 0.95, TILT = 0.42;
const softSpin = (raw) => (raw < 0 ? SPIN_AWAY * Math.tanh(raw / SPIN_AWAY) : SPIN_TOWARD * Math.tanh(raw / SPIN_TOWARD));
const softTilt = (raw) => TILT * Math.tanh(raw / TILT);
const held = { spin: 0, spinV: 0, spinGoal: 0, tilt: 0, tiltV: 0, tiltGoal: 0, drag: null, raf: 0, last: 0, ended: 0 };
const showTurn = () => {
  book.style.setProperty('--spin', `${(held.spin * 180) / Math.PI}deg`);
  book.style.setProperty('--tilt', `${(held.tilt * 180) / Math.PI}deg`);
};
export function stopTurning() {
  cancelAnimationFrame(held.raf);
  Object.assign(held, { spin: 0, spinV: 0, spinGoal: 0, tilt: 0, tiltV: 0, tiltGoal: 0, drag: null, raf: 0, last: 0 });
  showTurn();
}
function turnStep(now) {
  const dt = Math.min(0.033, (now - (held.last || now - 16)) / 1000);
  held.last = now;
  const on = !!(held.drag && held.drag.moved);
  const goalS = on ? held.spinGoal : 0, goalT = on ? held.tiltGoal : 0;
  held.spinV += (-(on ? 40 : 14) * (held.spin - goalS) - (on ? 12 : 7.5) * held.spinV) * dt;
  held.tiltV += (-(on ? 40 : 30) * (held.tilt - goalT) - (on ? 12 : 10) * held.tiltV) * dt;
  held.spin += held.spinV * dt;
  held.tilt += held.tiltV * dt;
  showTurn();
  if (!held.drag && Math.abs(held.spin) + Math.abs(held.tilt) < 2e-3 && Math.abs(held.spinV) + Math.abs(held.tiltV) < 1e-2) {
    held.spin = held.tilt = held.spinV = held.tiltV = 0;
    held.raf = 0; held.last = 0;
    showTurn();
    return;
  }
  held.raf = requestAnimationFrame(turnStep);
}
book.addEventListener('pointerdown', (e) => {
  if (e.button || !book.classList.contains('closed') || book.classList.contains('placing') || e.target.closest('.nb-sun')) return;
  held.drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, spin0: held.spin, tilt0: held.tilt, moved: false };
});
book.addEventListener('pointermove', (e) => {
  const d = held.drag;
  if (!d || d.id !== e.pointerId) return;
  const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
  if (!d.moved && Math.hypot(dx, dy) > 6) {
    d.moved = true;
    try { book.setPointerCapture(e.pointerId); } catch {}
    if (!held.raf) held.raf = requestAnimationFrame(turnStep);
  }
  if (!d.moved) return;
  const k = 0.0056;
  held.spinGoal = softSpin(d.spin0 + dx * k);
  held.tiltGoal = softTilt(d.tilt0 - dy * k);
});
const letGo = (e) => {
  const d = held.drag;
  if (!d || d.id !== e.pointerId) return;
  held.drag = null;
  if (d.moved) held.ended = performance.now();
};
book.addEventListener('pointerup', letGo);
book.addEventListener('pointercancel', letGo);
book.addEventListener('click', (e) => { if (performance.now() - held.ended < 350) { e.preventDefault(); e.stopPropagation(); } }, true);
