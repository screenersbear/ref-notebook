// New mood board, step by step, like the desktop app's wizard:
//   1. Name and page size
//   2. Layout (and a cover page or not)
//   3. Start blank (just the layout, empty pages) or fill in sections, each
//      section named and drawing from the tags you pick
//   4. (filling only) Which photos come first, and how many pages each section gets
import * as db from './db.js';
import { lib, photosIn, sortList, SPECIAL } from './library.js';
import { STYLES, SHAPES, paginate, makeCover, templateFor, styleTemplate } from './templates.js';
import { toast } from './ui.js';
import { withTextDefaults } from './textsize.js';
import { ICONS } from './icons.js';
import { esc, clamp } from './util.js';

const SHAPE_INFO = {
  'letter-portrait': { name: 'Tall', blurb: 'For printing and bringing to a shoot.' },
  'wide-16x9': { name: 'Wide', blurb: 'For screens and sharing.' },
};
const ORDERS = [
  ['newest', 'Newest first', 'The photos you brought in most lately.'],
  ['oldest', 'Oldest first', 'From the first ones you saved.'],
  ['fav', 'Favorites first', 'Hearted photos lead each section.'],
  ['random', 'Random', 'A fresh mix each time.'],
];

function miniPage(shape, tid, w) {
  const s = SHAPES[shape], t = templateFor(shape, tid);
  const W = 60, H = (60 * s.H) / s.W;
  const r = (t?.slots || []).map((b) => `<rect x="${b.x * W}" y="${b.y * H}" width="${b.w * W}" height="${b.h * H}"/>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" style="width:${w}px" aria-hidden="true"><rect class="paper-r" width="${W}" height="${H}"/>${r}</svg>`;
}

export function newBoardScreen(view) {
  const W = {
    step: 0, name: '', shape: 'letter-portrait', style: 'mosaic', cover: false,
    start: 'blank', blankPages: 3,
    sections: [{ name: '', tags: [], all: true }], order: 'newest', perSection: 3,
  };
  const sources = [SPECIAL[0], SPECIAL[1], ...lib.folders];
  const nameOf = (id) => sources.find((f) => f.id === id)?.name || '';
  const flow = () => (W.start === 'fill' ? [stepName, stepLayout, stepStart, stepPhotos] : [stepName, stepLayout, stepStart]);
  const TITLES = new Map([[stepName, 'Name and page size'], [stepLayout, 'Layout'], [stepStart, 'Start'], [stepPhotos, 'Which photos']]);

  // A section's photos: with "all of these" on, a photo needs every tag it picked.
  const photosOf = (sec) => {
    if (!sec.tags.length) return [];
    if (sec.all && sec.tags.length > 1) return lib.photos.filter((p) => sec.tags.every((t) => photosIn(t).includes(p)));
    return [...new Set(sec.tags.flatMap((t) => photosIn(t)))];
  };
  const titleOf = (sec, i) => sec.name.trim() || sec.tags.map(nameOf).join(' · ') || `Section ${i + 1}`;

  function draw(keepScroll = false) {
    const top = keepScroll ? view.querySelector('.form-page')?.scrollTop || 0 : 0;
    const steps = flow(), step = steps[W.step], last = W.step === steps.length - 1;
    view.innerHTML = `
      <div class="screen">
        <h1 class="head"><span data-sit="head">New board</span></h1>
        <p class="wz-step" data-sit="wzstep">${W.step + 1} of ${steps.length}: ${TITLES.get(step)}</p>
        <div class="scroll form-page">${step()}</div>
        <div class="foot">
          <button type="button" class="icon-btn" data-back aria-label="${W.step ? 'Back a step' : 'Back to mood boards'}">${ICONS.back}</button>
          <span class="wz-dots" aria-hidden="true">${steps.map((_, i) => `<i class="${i === W.step ? 'on' : ''}"></i>`).join('')}</span>
          <button type="button" class="cta" data-next>${last ? 'Make the board' : 'Next'}</button>
        </div>
      </div>`;
    if (keepScroll) view.querySelector('.screen').classList.add('still'); // a tap inside a step doesn't fade the page in again
    view.querySelector('.form-page').scrollTop = top;
    wire();
  }

  // ---------- 1. Name and page size ----------
  function stepName() {
    return `
      <label class="group"><span class="label" data-sit="label">Name</span>
        <input class="hand-input" data-sit="input" data-name value="${esc(W.name)}" placeholder="Name this board" maxlength="80" autocomplete="off" enterkeyhint="next" /></label>
      <div class="group"><span class="label" data-sit="label">Page size, the same for the whole board</span>
        <div class="wz-cards" data-snap>${Object.entries(SHAPE_INFO).map(([k, s]) => `
          <button type="button" class="wz-card${W.shape === k ? ' on' : ''}" data-shape="${k}">
            <span class="wz-shape ${k === 'wide-16x9' ? 'wide' : 'tall'}"></span>
            <strong>${s.name}</strong><span>${s.blurb}</span></button>`).join('')}</div>
      </div>`;
  }

  // ---------- 2. Layout ----------
  function stepLayout() {
    const big = W.shape === 'wide-16x9' ? 30 : 22;
    return `
      <p class="small" data-sit="small">Pick a general approach. Any page can still change layout afterwards.</p>
      <div class="wz-cards" data-snap>${STYLES.map((st) => `
        <button type="button" class="wz-card${W.style === st.id ? ' on' : ''}" data-style="${st.id}">
          <span class="wz-pages">${[0, 1, 2].map((n) => miniPage(W.shape, styleTemplate(W.shape, st.id, n), big)).join('')}</span>
          <strong>${esc(st.name)}</strong><span>${esc(st.blurb)}</span></button>`).join('')}</div>
      <label class="check" data-sit="check"><input type="checkbox" data-cover${W.cover ? ' checked' : ''} /> Start with a cover page: the board's name, big, with its first photo</label>`;
  }

  // ---------- 3. Start blank or fill in sections ----------
  function stepStart() {
    let out = `
      <div class="wz-cards" data-snap>
        <button type="button" class="wz-card${W.start === 'blank' ? ' on' : ''}" data-start="blank">
          <span class="wz-glyph">${miniPage(W.shape, styleTemplate(W.shape, W.style, 0), W.shape === 'wide-16x9' ? 40 : 28)}</span>
          <strong>Start blank</strong><span>Just the layout, with empty pages. You put the photos in yourself.</span></button>
        <button type="button" class="wz-card${W.start === 'fill' ? ' on' : ''}" data-start="fill">
          <span class="wz-glyph wz-glyph-fill">${miniPage(W.shape, styleTemplate(W.shape, W.style, 0), W.shape === 'wide-16x9' ? 40 : 28)}</span>
          <strong>Fill in sections</strong><span>Name sections and pick the tags each one fills from.</span></button>
      </div>`;
    if (W.start === 'blank') {
      return out + `
        <div class="group row-group"><span class="label" data-sit="label">Pages</span>
          <span class="stepper"><button type="button" data-blank="-1" aria-label="Fewer pages">−</button><b>${W.blankPages}</b><button type="button" data-blank="1" aria-label="More pages">+</button></span></div>`;
    }
    out += '<p class="small" data-sit="small">Each section gets its own pages, with its name as the first page\'s title.</p>';
    W.sections.forEach((sec, i) => {
      out += `
        <div class="wz-section" data-snap data-sec="${i}">
          <div class="wz-sechead"><span class="wz-secnum">${i + 1}</span>
            <input class="hand-input wz-secname" data-sit="secname" data-secname="${i}" value="${esc(sec.name)}" placeholder="Section ${i + 1} name" maxlength="60" autocomplete="off" enterkeyhint="done" />
            ${W.sections.length > 1 ? `<button type="button" class="icon-btn" data-drop="${i}" aria-label="Remove section ${i + 1}">${ICONS.x}</button>` : ''}</div>
          <div class="pick-chips" data-snap>${sources.map((f) => `<button type="button" class="pick${sec.tags.includes(f.id) ? ' on' : ''}" data-tag="${esc(f.id)}" data-in="${i}">${esc(f.name)} ${photosIn(f.id).length}</button>`).join('')}</div>
          ${sec.tags.length > 1 ? `<label class="check" data-sit="check"><input type="checkbox" data-all="${i}"${sec.all ? ' checked' : ''} /> Only photos with all of these tags</label>` : ''}
          <p class="small" data-sit="small">${sec.tags.length ? `${photosOf(sec).length} photos` : 'Pick at least one tag.'}</p>
        </div>`;
    });
    return out + '<button type="button" class="label-btn wz-add" data-addsec>+ Add section</button>';
  }

  // ---------- 4. Which photos ----------
  function stepPhotos() {
    return `
      <div class="wz-cards" data-snap>${ORDERS.map(([k, name, blurb]) => `
        <button type="button" class="wz-card${W.order === k ? ' on' : ''}" data-order="${k}"><strong>${name}</strong><span>${blurb}</span></button>`).join('')}</div>
      <div class="group row-group"><span class="label" data-sit="label">Pages per section</span>
        <span class="stepper"><button type="button" data-per="-1" aria-label="Fewer pages">−</button><b>${W.perSection}</b><button type="button" data-per="1" aria-label="More pages">+</button></span></div>
      <div class="wz-summary">${W.sections.map((sec, i) => {
        const n = photosOf(sec).length;
        return `<div class="wz-sumrow"><span data-sit="sum">${esc(titleOf(sec, i))}</span><span class="row-meta" data-sit="summeta">${n ? `${n} ${n === 1 ? 'photo' : 'photos'}` : 'none yet'}</span></div>`;
      }).join('')}</div>
      ${W.sections.every((s) => !photosOf(s).length) ? '<p class="small" data-sit="small">No photos match yet, so the board starts with empty pages.</p>' : ''}`;
  }

  function ok() {
    const step = flow()[W.step];
    if (step === stepStart && W.start === 'fill') {
      const empty = W.sections.findIndex((s) => !s.tags.length);
      if (empty >= 0) { toast(`Pick a tag for ${titleOf(W.sections[empty], empty)}, or start blank`); return false; }
    }
    return true;
  }
  function go(d) {
    if (d > 0 && !ok()) return;
    if (d > 0 && W.step === flow().length - 1) return make();
    if (d < 0 && W.step === 0) { location.hash = '#/boards'; return; }
    W.step = clamp(W.step + d, 0, flow().length - 1);
    draw();
  }

  function wire() {
    view.querySelector('[data-back]').addEventListener('click', () => go(-1));
    view.querySelector('[data-next]').addEventListener('click', () => go(1));
    const name = view.querySelector('[data-name]');
    name?.addEventListener('input', () => { W.name = name.value; });
    name?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); name.blur(); } });
    view.querySelectorAll('[data-secname]').forEach((el) => el.addEventListener('input', () => { W.sections[+el.dataset.secname].name = el.value; }));
    view.querySelector('[data-cover]')?.addEventListener('change', (e) => { W.cover = e.target.checked; });
    view.querySelectorAll('[data-all]').forEach((el) => el.addEventListener('change', () => { W.sections[+el.dataset.all].all = el.checked; draw(true); }));
    view.querySelector('.form-page').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const d = b.dataset;
      if (d.shape) W.shape = d.shape;
      else if (d.style) W.style = d.style;
      else if (d.start) W.start = d.start;
      else if (d.blank) W.blankPages = clamp(W.blankPages + +d.blank, 1, 20);
      else if (d.per) W.perSection = clamp(W.perSection + +d.per, 1, 20);
      else if (d.order) W.order = d.order;
      else if (d.tag) { const sec = W.sections[+d.in]; sec.tags = sec.tags.includes(d.tag) ? sec.tags.filter((x) => x !== d.tag) : [...sec.tags, d.tag]; }
      else if (d.drop) W.sections.splice(+d.drop, 1);
      else if ('addsec' in d) { W.sections.push({ name: '', tags: [], all: true }); draw(true); const all = view.querySelectorAll('.wz-secname'); all[all.length - 1]?.scrollIntoView({ block: 'center' }); return; }
      else return;
      draw(true);
    });
  }

  const shuffle = (list) => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  async function make() {
    const name = W.name.trim() || 'Untitled board';
    let pages = [];
    if (W.start === 'blank') {
      pages = Array.from({ length: W.blankPages }, (_, n) => ({ template: styleTemplate(W.shape, W.style, n) || paginate(W.shape, W.style, [])[0].template, images: [] }));
    } else {
      const used = new Set();
      W.sections.forEach((sec, i) => {
        const list = photosOf(sec);
        const all = (W.order === 'random' ? shuffle(list) : sortList(list, W.order)).map((p) => p.id);
        // Photos no earlier section used come first; used ones only fill what's left.
        const pool = [...all.filter((x) => !used.has(x)), ...all.filter((x) => used.has(x))];
        const own = paginate(W.shape, W.style, pool).slice(0, W.perSection);
        while (own.length < W.perSection) own.push({ template: styleTemplate(W.shape, W.style, own.length) || own[0].template, images: [] });
        own.forEach((p) => p.images.forEach((x) => used.add(x)));
        const title = titleOf(sec, i);
        own[0].title = title;
        own.forEach((p) => { p.section = title; });
        pages.push(...own);
      });
    }
    if (W.cover) pages.unshift(makeCover({ shape: W.shape, name }, pages.flatMap((p) => p.images).find(Boolean) || null));
    pages = pages.map((p) => withTextDefaults({ ...p, images: p.images.map((x) => (x ? { id: x } : null)) }));
    const b = await db.saveBoard({ name, shape: W.shape, style: W.style, pages });
    location.hash = `#/board/${b.id}`;
  }
  draw();
}
