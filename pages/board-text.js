// A board page's text boxes: its own title and text, and boxes added with T.
// Picking one, moving it, and its menu in place of the photos at the bottom.
import { sizeOf, stepSize, useDefault, saveDefault, isDefault, defaultSize } from '../components/textsize.js';
import { pageTemplate } from '../components/board-page.js';
import { toast } from '../components/toast.js';
import { choiceSheet } from '../components/dialogs.js';
import { esc, clamp } from '../components/util.js';

export function addTextBoxes(ed) {
  Object.assign(ed, { rectOf, paintTsel, dragBox, endBoxGesture, addNote, closePanel, textSheet });
  // ---- Text boxes ----
  // 'main' is the page's own title and text; a number is a box added with T.
  const keyOf = (v) => (v === 'main' ? 'main' : +v); ed.keyOf = keyOf;
  const noteOf = (key) => (key === 'main' ? null : ed.page().notes?.[key]);
  function rectOf(b, pg) {
    return { x: b.offsetLeft / pg.clientWidth, y: b.offsetTop / pg.clientHeight, w: b.offsetWidth / pg.clientWidth, h: b.offsetHeight / pg.clientHeight };
  }
  function paintTsel(pg) {
    if (ed.tsel == null) return;
    const b = pg.querySelector(`[data-box="${ed.tsel}"]`);
    if (!b) { ed.tsel = null; closePanel(); return; }
    let o = pg.querySelector('.tbox-sel');
    if (!o) { o = document.createElement('div'); o.className = 'tbox-sel'; o.innerHTML = ['nw', 'ne', 'sw', 'se'].map((h) => `<i data-h="${h}"></i>`).join(''); pg.append(o); }
    Object.assign(o.style, { left: `${b.offsetLeft}px`, top: `${b.offsetTop}px`, width: `${b.offsetWidth}px`, height: `${b.offsetHeight}px` });
  }
  // Moving it (drag inside) or resizing it (drag a corner), as the finger goes.
  function dragBox(g, fx, fy) {
    const r0 = g.r0, r = { ...r0 };
    const h = g.handle;
    if (!h) { r.x = r0.x + fx; r.y = r0.y + fy; }
    else {
      if (h.includes('w')) { r.x = r0.x + fx; r.w = r0.w - fx; }
      if (h.includes('e')) r.w = r0.w + fx;
      if (h.includes('n')) { r.y = r0.y + fy; r.h = r0.h - fy; }
      if (h.includes('s')) r.h = r0.h + fy;
      if (r.w < 0.12) { if (h.includes('w')) r.x -= 0.12 - r.w; r.w = 0.12; }
      if (r.h < 0.04) { if (h.includes('n')) r.y -= 0.04 - r.h; r.h = 0.04; }
    }
    r.w = Math.min(r.w, 1); r.h = Math.min(r.h, 1);
    r.x = clamp(r.x, 0, 1 - r.w); r.y = clamp(r.y, 0, 1 - r.h);
    if (!g.snap) { ed.snapshot(); g.snap = true; }
    const target = g.text === 'main' ? (ed.page().textBox ||= {}) : noteOf(g.text);
    Object.assign(target, r);
    const pg = ed.stage.querySelector('.page'), b = pg.querySelector(`[data-box="${g.text}"]`);
    const pc = (v) => `${(v * 100).toFixed(3)}%`;
    if (g.text === 'main' && b.classList.contains('overlay')) Object.assign(b.style, { left: pc(r.x), top: pc(r.y), bottom: '', maxWidth: pc(r.w) });
    else Object.assign(b.style, { left: pc(r.x), top: pc(r.y), bottom: '', width: pc(r.w), height: pc(r.h) });
    paintTsel(pg);
  }
  function endBoxGesture(g, e) {
    if (g.moved && (g.picked || g.handle)) { if (g.snap) { ed.persist(); ed.drawPage(); } return; }
    if (g.moved) { // a swipe that started on text: turn the page as usual
      const dx = e.clientX - g.x;
      if (Math.abs(dx) > 40) ed.goTo(ed.at + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      return;
    }
    // A tap picks the box; a second tap on it opens its menu.
    const now = performance.now();
    if (g.picked && ed.lastTap && ed.lastTap.key === g.text && now - ed.lastTap.t < 400) { ed.lastTap = null; openPanel(g.text); return; }
    ed.lastTap = { key: g.text, t: now };
    if (!g.picked) { ed.tsel = g.text; ed.sel = -1; if (ed.panel != null && ed.panel !== ed.tsel) closePanel(); ed.drawPage(); }
  }
  function addNote() {
    ed.snapshot();
    const p = ed.page();
    p.notes ||= [];
    p.notes.push({ x: 0.15, y: 0.4, w: 0.7, h: 0.1, text: '', size: defaultSize('note') * 1.6 });
    ed.tsel = p.notes.length - 1; ed.sel = -1;
    ed.persist();
    ed.drawPage();
    openPanel(ed.tsel, true);
  }

  // The T tool: the page's own title (any page can have one), or a box of
  // words anywhere on it.
  async function textSheet() {
    const key = await choiceSheet({ title: 'Add text', options: [
      { key: 'title', label: 'Title', detail: ed.page().title?.trim() ? 'This page\'s title' : 'A title for this page' },
      { key: 'text', label: 'Text', detail: 'A box of words, anywhere on the page' },
    ] });
    if (key === 'title') { ed.sel = -1; openPanel('main', true); } else if (key === 'text') addNote();
  }

  // The menu for a text box, smaller, in place of the photos at the bottom.
  const tpanel = ed.view.querySelector('[data-tpanel]'), trayBox = ed.view.querySelector('[data-tray-box]');
  function closePanel() {
    if (ed.panel == null) return;
    const p = ed.page(), n = ed.panel === 'main' ? null : p?.notes?.[ed.panel];
    ed.panel = null;
    tpanel.hidden = true; tpanel.innerHTML = '';
    trayBox.hidden = false;
    if (n && !n.text.trim()) { p.notes.splice(p.notes.indexOf(n), 1); ed.tsel = null; ed.persist(); }
    ed.drawPage();
  }
  function openPanel(key, focus = false) {
    const keep = key === 'main' ? 'main' : ed.page().notes?.[key];
    closePanel(); // may drop an empty box, which moves the others along
    key = keep === 'main' ? 'main' : ed.page().notes.indexOf(keep);
    if (key === -1) return;
    ed.panel = key; ed.tsel = key;
    const p = ed.page(), t = pageTemplate(ed.board, p), n = noteOf(key);
    trayBox.hidden = true;
    tpanel.hidden = false;
    tpanel.innerHTML = n ? `
        <textarea rows="2" data-note placeholder="Type here">${esc(n.text)}</textarea>
        ${sizeRow('note', 'text')}
        <div class="tp-actions"><button type="button" class="label-btn" data-tdel>Delete box</button><button type="button" class="label-btn tp-done" data-tdone>Done</button></div>` : `
        <input type="text" data-title value="${esc(p.title || '')}" placeholder="Title" maxlength="120" autocomplete="off" />
        ${sizeRow('title', 'title')}
        <textarea rows="2" data-body placeholder="Text">${esc(p.text || '')}</textarea>
        ${sizeRow('body', 'text')}
        <div class="tp-checks">${t.text.overlay ? `<label class="check"><input type="checkbox" data-fill${p.textFill === false ? '' : ' checked'} /> Background</label>` : ''}
          <label class="check"><input type="checkbox" data-palette${p.palette ? ' checked' : ''} /> Page colors</label></div>
        <div class="tp-actions"><button type="button" class="label-btn tp-done" data-tdone>Done</button></div>`;
    let first = true;
    const change = (fn) => { if (first) { ed.snapshot(); first = false; } fn(); ed.persist(); ed.drawPage(); };
    const on = (sel2, ev, fn) => tpanel.querySelector(sel2)?.addEventListener(ev, fn);
    on('[data-note]', 'input', (e) => change(() => { n.text = e.target.value; }));
    on('[data-title]', 'input', (e) => change(() => { p.title = e.target.value; }));
    on('[data-body]', 'input', (e) => change(() => { p.text = e.target.value; }));
    on('[data-fill]', 'change', (e) => change(() => { p.textFill = e.target.checked; }));
    on('[data-palette]', 'change', (e) => change(() => { p.palette = e.target.checked; }));
    const targetOf = (kind) => (kind === 'note' ? n : p);
    const paintSizes = () => tpanel.querySelectorAll('[data-size]').forEach((row) => {
      const kind = row.dataset.size, o = targetOf(kind);
      row.querySelector('b').textContent = `${Math.round(sizeOf(o, kind) * 100)}%`;
      row.querySelector('[data-usedef]').disabled = isDefault(o, kind);
      row.querySelector('[data-savedef]').disabled = isDefault(o, kind);
    });
    paintSizes();
    tpanel.onclick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if ('tdone' in b.dataset) { ed.tsel = null; closePanel(); ed.drawPage(); return; }
      if ('tdel' in b.dataset) { ed.snapshot(); p.notes.splice(key, 1); ed.panel = null; ed.tsel = null; closePanel(); tpanel.hidden = true; trayBox.hidden = false; ed.persist(); ed.drawPage(); return; }
      const row = b.closest('[data-size]');
      if (!row) return;
      const kind = row.dataset.size, o = targetOf(kind), word = kind === 'title' ? 'Title' : 'Text';
      if (b.dataset.grow) change(() => stepSize(o, kind, +b.dataset.grow));
      else if ('usedef' in b.dataset) { change(() => useDefault(o, kind)); toast(`${word} back to your default size`); }
      else if ('savedef' in b.dataset) { saveDefault(o, kind); toast(`${word} size saved: new ones start with it`); }
      paintSizes();
    };
    ed.drawPage(); // the page refits to the room left
    if (focus) tpanel.querySelector('textarea, input')?.focus();
  }
  function sizeRow(kind, word) {
    return `
      <div class="size-row" data-size="${kind}">
        <span class="label">Size</span>
        <span class="stepper"><button type="button" data-grow="-1" aria-label="Smaller ${word}">A−</button><b>100%</b><button type="button" data-grow="1" aria-label="Larger ${word}">A+</button></span>
        <span class="size-defs"><button type="button" class="label-btn" data-usedef>Use default</button><button type="button" class="label-btn" data-savedef>Save as default</button></span>
      </div>`;
  }
}
