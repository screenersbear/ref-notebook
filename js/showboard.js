// The whole mood board full screen: one page at a time, as big as the screen
// allows. Swipe (or use the arrows) to go through it; the cross goes back.
import { renderPage } from './pages.js';
import { SHAPES } from './templates.js';
import { ICONS } from './icons.js';

export function showBoard(board, start, onClose) {
  let at = start, busy = false;
  const el = document.createElement('div');
  el.className = 'show';
  el.innerHTML = `
    <div class="show-top">
      <button type="button" class="show-btn" data-close aria-label="Leave full screen">${ICONS.x}</button>
      <span class="show-count"></span>
    </div>
    <div class="show-stage"></div>
    <div class="show-foot">
      <button type="button" class="show-btn" data-go="-1" aria-label="Previous page">${ICONS.back}</button>
      <button type="button" class="show-btn flip" data-go="1" aria-label="Next page">${ICONS.back}</button>
    </div>`;
  document.body.append(el);
  const stage = el.querySelector('.show-stage');
  const count = el.querySelector('.show-count');

  async function pageEl(n) {
    const p = await renderPage(board, board.pages[n]);
    const s = SHAPES[board.shape];
    const k = Math.min(stage.clientWidth / s.W, stage.clientHeight / s.H);
    p.style.width = `${Math.floor(s.W * k)}px`;
    p.classList.add('show-page');
    return p;
  }
  function paint() {
    count.textContent = `${at + 1} of ${board.pages.length}`;
    el.querySelector('[data-go="-1"]').disabled = at === 0;
    el.querySelector('[data-go="1"]').disabled = at === board.pages.length - 1;
  }
  async function draw() {
    stage.replaceChildren(await pageEl(at));
    paint();
  }
  // The page slides off one side and the next comes in from the other.
  async function go(dir, from = 0) {
    const n = at + dir;
    const cur = stage.firstElementChild;
    if (busy || n < 0 || n >= board.pages.length) { if (cur) { cur.style.transition = 'transform .18s ease-out'; cur.style.transform = ''; } return; }
    busy = true;
    at = n;
    paint();
    const next = await pageEl(n);
    const w = stage.clientWidth;
    next.style.transform = `translateX(${dir * w}px)`;
    stage.append(next);
    void next.offsetWidth;
    const ease = 'transform .26s cubic-bezier(.25,.6,.3,1)';
    if (cur) { cur.style.transition = ease; cur.style.transform = `translateX(${-dir * w + 0}px)`; }
    next.style.transition = ease; next.style.transform = 'translateX(0)';
    const done = () => { if (!busy) return; busy = false; cur?.remove(); next.style.transition = ''; };
    next.addEventListener('transitionend', done, { once: true });
    setTimeout(done, 400); // a hidden page holds transitions up
  }

  let d = null;
  stage.addEventListener('pointerdown', (e) => {
    if (busy || e.button) return;
    d = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: 0, on: false };
  });
  stage.addEventListener('pointermove', (e) => {
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (!d.on) {
      if (Math.hypot(dx, dy) < 10) return;
      if (Math.abs(dy) > Math.abs(dx)) { d = null; return; }
      d.on = true;
      try { stage.setPointerCapture(e.pointerId); } catch {}
    }
    const end = (dx > 0 && at === 0) || (dx < 0 && at === board.pages.length - 1);
    d.x = end ? dx * 0.25 : dx; // nothing that way: only a little give
    const cur = stage.firstElementChild;
    if (cur) { cur.style.transition = ''; cur.style.transform = `translateX(${d.x}px)`; }
  });
  const up = (e) => {
    if (!d || e.pointerId !== d.id) return;
    const g = d; d = null;
    if (!g.on) return;
    if (e.type === 'pointerup' && Math.abs(g.x) > 50) go(g.x < 0 ? 1 : -1, g.x);
    else go(0);
  };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);

  function close() {
    document.removeEventListener('keydown', key);
    window.removeEventListener('resize', draw);
    el.remove();
    onClose?.(at);
  }
  const key = (e) => {
    if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', key);
  window.addEventListener('resize', draw);
  el.querySelector('[data-close]').addEventListener('click', close);
  el.querySelector('.show-foot').addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b) go(+b.dataset.go); });
  draw();
  return { close };
}
