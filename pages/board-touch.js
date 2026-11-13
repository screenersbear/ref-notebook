// Touching a board's page: tap a spot, swipe to turn the page, drag or pinch
// a photo to crop it, drag a text box to move or resize it.
import { photoById } from '../data/library.js';
import { applyCrop, MAX_ZOOM } from '../components/board-page.js';
import { clamp } from '../components/util.js';

export function addTouch(ed) {
  // ---- Touching the page ----
  const pts = new Map();
  let gesture = null;
  const slotOf = (target) => target.closest?.('.slot');
  ed.stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.slot-x')) return;
    try { ed.stage.setPointerCapture(e.pointerId); } catch {}
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    const handle = e.target.closest('.tbox-sel i'), boxEl = handle ? null : e.target.closest('[data-box]');
    if (pts.size === 1 && (handle || boxEl)) {
      const key = handle ? ed.tsel : ed.keyOf(boxEl.dataset.box);
      const pg = ed.stage.querySelector('.page'), b = pg.querySelector(`[data-box="${key}"]`);
      gesture = { text: key, handle: handle?.dataset.h, x: e.clientX, y: e.clientY, moved: false, picked: key === ed.tsel, r0: ed.rectOf(b, pg), pw: pg.clientWidth, ph: pg.clientHeight };
      return;
    }
    if (pts.size === 1) {
      const slot = slotOf(e.target);
      const onSel = slot && +slot.dataset.index === ed.sel && ed.page().images[ed.sel];
      gesture = { x: e.clientX, y: e.clientY, slot, crop: onSel ? { ...ed.page().images[ed.sel] } : null, moved: false };
    } else if (pts.size === 2 && gesture?.crop) {
      const [a, b] = [...pts.values()];
      gesture.pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), zoom: ed.page().images[ed.sel].zoom || 1 };
    }
  });
  ed.stage.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId) || !gesture) return;
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    const dx = e.clientX - gesture.x, dy = e.clientY - gesture.y;
    if (Math.hypot(dx, dy) > 8) gesture.moved = true;
    if (gesture.text != null) { if (gesture.moved && (gesture.picked || gesture.handle)) ed.dragBox(gesture, dx / gesture.pw, dy / gesture.ph); return; }
    if (!gesture.crop) return;
    const im = ed.page().images[ed.sel];
    const slotEl = ed.stage.querySelector(`.slot[data-index="${ed.sel}"]`);
    const img = slotEl?.querySelector('img');
    const rec = photoById(im.id);
    if (!img || !rec) return;
    if (pts.size === 2 && gesture.pinch) {
      const [a, b] = [...pts.values()];
      im.zoom = clamp((gesture.pinch.zoom * Math.hypot(a[0] - b[0], a[1] - b[1])) / gesture.pinch.d, 1, MAX_ZOOM);
    } else if (pts.size === 1 && !gesture.pinch) {
      const sw = slotEl.clientWidth, sh = slotEl.clientHeight;
      const scale = Math.max(sw / rec.width, sh / rec.height) * (im.zoom || 1);
      const spareX = rec.width * scale - sw, spareY = rec.height * scale - sh;
      const [fx, fy] = gesture.crop.focal || [0.5, 0.5];
      im.focal = [spareX > 0.5 ? clamp(fx - dx / spareX, 0, 1) : fx, spareY > 0.5 ? clamp(fy - dy / spareY, 0, 1) : fy];
    }
    applyCrop(img, im);
    gesture.changed = true;
  });
  const up = (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (pts.size || !gesture) return;
    const g = gesture;
    gesture = null;
    if (g.text != null) return ed.endBoxGesture(g, e);
    if (g.crop) {
      if (g.changed) {
        ed.undo.push(JSON.stringify(ed.board.pages.map((p, i) => (i === ed.at ? { ...p, images: p.images.map((x, n) => (n === ed.sel ? g.crop : x)) } : p))));
        ed.paintUndo();
        ed.persist();
        return;
      }
    }
    const dx = e.clientX - g.x;
    if (g.moved && !g.crop) {
      if (Math.abs(dx) > 40) ed.goTo(ed.at + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      return;
    }
    if (g.moved) return;
    const i = g.slot ? +g.slot.dataset.index : -1;
    ed.sel = ed.sel === i ? -1 : i;
    if (ed.tsel != null) { ed.tsel = null; ed.closePanel(); }
    ed.drawPage();
  };
  ed.stage.addEventListener('pointerup', up);
  ed.stage.addEventListener('pointercancel', up);
  ed.stage.addEventListener('click', (e) => {
    if (!e.target.closest('.slot-x')) return;
    ed.snapshot();
    ed.page().images[ed.sel] = null;
    ed.sel = -1;
    ed.persist(); ed.drawPage(); ed.drawTray();
  });
}
