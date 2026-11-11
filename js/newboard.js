// New board: name it, pick folders to pull from, pick a layout, and the pages fill.
import * as db from './db.js';
import { lib, photosIn, sortList, SPECIAL } from './library.js';
import { STYLES, SHAPES, paginate, makeCover, templateFor, styleTemplate } from './templates.js';
import { ICONS } from './icons.js';
import { esc, clamp } from './util.js';

function mini(shape, style) {
  const s = SHAPES[shape], t = templateFor(shape, styleTemplate(shape, style, 0));
  const W = 60, H = (60 * s.H) / s.W;
  const r = t.slots.map((b) => `<rect x="${b.x * W}" y="${b.y * H}" width="${b.w * W}" height="${b.h * H}"/>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><rect class="paper-r" width="${W}" height="${H}"/>${r}</svg>`;
}

export function newBoardScreen(view) {
  const W = { name: '', folders: [], matchAll: false, style: 'hero', shape: 'letter-portrait', pages: 3, cover: true };
  const sources = [SPECIAL[0], SPECIAL[1], ...lib.folders];
  const matched = () => lib.photos.filter((p) => W.folders.every((f) => photosIn(f).includes(p)));

  function draw() {
    view.innerHTML = `
      <div class="screen">
        <h1 class="head">New board</h1>
        <div class="scroll form-page">
          <label class="group"><span class="label">Name</span>
            <input class="hand-input" data-name value="${esc(W.name)}" placeholder="Name this board" maxlength="80" autocomplete="off" enterkeyhint="done" /></label>
          <div class="group"><span class="label">Pull from</span>
            <p class="small">Each tag becomes a section with its title on the page.</p>
            <div class="pick-chips">${sources.map((f) => `<button type="button" class="pick${W.folders.includes(f.id) ? ' on' : ''}" data-folder="${esc(f.id)}">${esc(f.name)} ${photosIn(f.id).length}</button>`).join('')}</div>
            ${W.folders.length > 1 ? `<label class="check"><input type="checkbox" data-match${W.matchAll ? ' checked' : ''} /> Only photos in all of these (${matched().length})</label>` : ''}
          </div>
          <div class="group"><span class="label">Layout</span>
            <div class="style-grid">${STYLES.map((s) => `<button type="button" class="style${W.style === s.id ? ' on' : ''}" data-style="${s.id}">${mini(W.shape, s.id)}<span>${esc(s.name)}</span></button>`).join('')}</div>
          </div>
          <div class="group row-group"><span class="label">Page shape</span>
            <span class="seg">${Object.entries({ 'letter-portrait': 'Tall', 'wide-16x9': 'Wide' }).map(([k, v]) => `<button type="button" class="${W.shape === k ? 'on' : ''}" data-shape="${k}">${v}</button>`).join('')}</span></div>
          <div class="group row-group"><span class="label">${W.folders.length > 1 && !W.matchAll ? 'Pages per section' : 'Pages'}</span>
            <span class="stepper"><button type="button" data-step="-1" aria-label="Fewer pages">${'−'}</button><b>${W.pages}</b><button type="button" data-step="1" aria-label="More pages">+</button></span></div>
          <label class="check"><input type="checkbox" data-cover${W.cover ? ' checked' : ''} /> Start with a cover page</label>
        </div>
        <div class="foot">
          <a class="icon-btn" href="#/boards" aria-label="Back">${ICONS.back}</a>
          <button type="button" class="cta" data-make>${W.folders.length ? 'Fill the pages' : 'Start blank'}</button>
        </div>
      </div>`;
    const name = view.querySelector('[data-name]');
    name.addEventListener('input', () => { W.name = name.value; });
    view.querySelector('.form-page').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.folder) W.folders = W.folders.includes(b.dataset.folder) ? W.folders.filter((x) => x !== b.dataset.folder) : [...W.folders, b.dataset.folder];
      else if (b.dataset.style) W.style = b.dataset.style;
      else if (b.dataset.shape) W.shape = b.dataset.shape;
      else if (b.dataset.step) W.pages = clamp(W.pages + +b.dataset.step, 1, 20);
      else return;
      const top = view.querySelector('.form-page').scrollTop;
      draw();
      view.querySelector('.form-page').scrollTop = top;
    });
    view.querySelector('[data-match]')?.addEventListener('change', (e) => { W.matchAll = e.target.checked; const top = view.querySelector('.form-page').scrollTop; draw(); view.querySelector('.form-page').scrollTop = top; });
    view.querySelector('[data-cover]').addEventListener('change', (e) => { W.cover = e.target.checked; });
    view.querySelector('[data-make]').addEventListener('click', make);
  }

  const nameOf = (id) => sources.find((f) => f.id === id).name;
  async function make() {
    const name = W.name.trim() || 'Untitled board';
    const sections = W.matchAll && W.folders.length > 1
      ? [{ title: W.folders.map(nameOf).join(' · '), photos: matched() }]
      : W.folders.map((id) => ({ title: nameOf(id), photos: photosIn(id) }));
    const used = new Set();
    let pages = [];
    for (const sec of sections) {
      // Photos no earlier section used come first; used ones only fill what's left.
      const all = sortList(sec.photos, 'newest').map((p) => p.id);
      const pool = [...all.filter((x) => !used.has(x)), ...all.filter((x) => used.has(x))];
      const own = paginate(W.shape, W.style, pool).slice(0, W.pages);
      own.forEach((p) => p.images.forEach((x) => used.add(x)));
      if (own[0] && sec.title) own[0].title = sec.title;
      own.forEach((p) => { p.section = sec.title; });
      pages.push(...own);
    }
    if (!pages.length) pages = paginate(W.shape, W.style, []);
    if (W.cover) pages.unshift(makeCover({ shape: W.shape, name }, pages.flatMap((p) => p.images).find(Boolean) || null));
    pages = pages.map((p) => ({ ...p, images: p.images.map((x) => (x ? { id: x } : null)) }));
    const b = await db.saveBoard({ name, shape: W.shape, style: W.style, pages });
    location.hash = `#/board/${b.id}`;
  }
  draw();
}
