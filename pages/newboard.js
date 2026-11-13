// New mood board, step by step, like the desktop app's wizard:
//   1. Name and page size
//   2. Layout (and a cover page or not)
//   3. Start blank (just the layout, empty pages) or fill in sections, each
//      section named and drawing from the tags you pick
//   4. (filling only) Which photos come first, and how many pages each section gets
// In the round 2 look (07-new-board-layout): the short band with Back and
// Close, the step marks, each step's title and question, Back / Next at the
// foot. Its small pieces are in newboard-parts.js.
import * as db from '../data/db.js';
import { lib, photosIn, sortList, SPECIAL } from '../data/library.js';
import { STYLES, paginate, makeCover, styleTemplate } from '../data/templates.js';
import { toast } from '../components/toast.js';
import { withTextDefaults } from '../components/textsize.js';
import { ICONS } from '../components/icons.js';
import { shortBandHtml, CLOSE } from '../components/band.js';
import { esc, clamp } from '../components/util.js';
import { cardHtml } from '../components/option-card.js';
import { marksHtml, miniPage } from './newboard-parts.js';
import { defaultShape } from './options.js';

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

export function newBoardScreen(view) {
  const W = {
    step: 0, name: '', shape: defaultShape(), style: 'mosaic', cover: false,
    start: 'blank', blankPages: 3,
    sections: [{ name: '', tags: [], all: true }], order: 'newest', perSection: 3,
  };
  const sources = [SPECIAL[0], SPECIAL[1], ...lib.folders];
  const nameOf = (id) => sources.find((f) => f.id === id)?.name || '';
  const flow = () => (W.start === 'fill' ? [stepName, stepLayout, stepStart, stepPhotos] : [stepName, stepLayout, stepStart]);
  const TITLES = new Map([[stepName, 'Name and page size'], [stepLayout, 'Layout'], [stepStart, 'Start'], [stepPhotos, 'Which photos']]);
  const MARKS = new Map([[stepName, 'Name'], [stepLayout, 'Layout'], [stepStart, 'Start'], [stepPhotos, 'Photos']]);
  const ASKS = new Map([
    [stepName, 'What is it called, and how big are its pages?'],
    [stepLayout, 'How should the pages look? You can change any page later.'],
    [stepStart, 'Empty pages to fill yourself, or pages filled from your tags?'],
    [stepPhotos, 'Which photos come first, and how many pages each section gets.'],
  ]);

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
      <div class="screen new-board">
        ${shortBandHtml({ name: 'New board', backAttr: 'data-back', backLabel: W.step ? 'Back a step' : 'Back to mood boards', end: { label: 'Close', attr: 'data-close', svg: CLOSE } })}
        <div class="scroll form-page">
          ${marksHtml(steps.map((f) => MARKS.get(f)), W.step)}
          <h1 class="guide-title">${TITLES.get(step)}</h1>
          <p class="guide-ask">${ASKS.get(step)}</p>
          ${step()}
        </div>
        <div class="foot guide-foot">
          <button type="button" class="btn secondary" data-back>Back</button>
          <button type="button" class="btn primary" data-next>${last ? 'Make the board' : `Next: ${MARKS.get(steps[W.step + 1])}`}</button>
        </div>
      </div>`;
    if (keepScroll) view.querySelector('.screen').classList.add('still'); // a tap inside a step doesn't fade the page in again
    view.querySelector('.form-page').scrollTop = top;
    wire();
  }

  // ---------- 1. Name and page size ----------
  function stepName() {
    return `
      <label class="guide-field"><span class="guide-label">Name</span>
        <input class="guide-input" data-name value="${esc(W.name)}" placeholder="Name this board" maxlength="80" autocomplete="off" enterkeyhint="next" /></label>
      <p class="guide-label">Page size, the same for the whole board</p>
      <div class="opt-cards two" role="radiogroup" aria-label="Page size">${Object.entries(SHAPE_INFO).map(([k, sh]) => cardHtml({
        attr: `data-shape="${k}"`, on: W.shape === k, picture: `<span class="opt-shape ${k === 'wide-16x9' ? 'wide' : 'tall'}"></span>`, name: sh.name, blurb: sh.blurb,
      })).join('')}</div>`;
  }

  // ---------- 2. Layout ----------
  function stepLayout() {
    const w = W.shape === 'wide-16x9' ? 80 : 60;
    return `
      <div class="opt-cards" role="radiogroup" aria-label="Layout">${STYLES.map((st) => cardHtml({
        attr: `data-style="${st.id}"`, on: W.style === st.id, picture: miniPage(W.shape, styleTemplate(W.shape, st.id, 0), w), name: st.name,
      })).join('')}</div>
      <label class="switch-row"><span>Start with a cover page</span><input type="checkbox" class="switch" role="switch" data-cover${W.cover ? ' checked' : ''} /></label>`;
  }

  // ---------- 3. Start blank or fill in sections ----------
  function stepStart() {
    const w = W.shape === 'wide-16x9' ? 64 : 44;
    const page = (cls) => `<span class="opt-glyph${cls}">${miniPage(W.shape, styleTemplate(W.shape, W.style, 0), w)}</span>`;
    let out = `
      <div class="opt-cards two" role="radiogroup" aria-label="Start">
        ${cardHtml({ attr: 'data-start="blank"', on: W.start === 'blank', picture: page(''), name: 'Start blank', blurb: 'Just the layout, with empty pages. You put the photos in yourself.' })}
        ${cardHtml({ attr: 'data-start="fill"', on: W.start === 'fill', picture: page(' filled'), name: 'Fill in sections', blurb: 'Name sections and pick the tags each one fills from.' })}
      </div>`;
    if (W.start === 'blank') return out + stepperRow('Pages', 'blank', W.blankPages, 'pages');
    out += '<p class="guide-small">Each section gets its own pages, with its name as the first page\'s title.</p>';
    W.sections.forEach((sec, i) => {
      out += `
        <div class="guide-section" data-sec="${i}">
          <div class="guide-sechead"><span class="guide-secnum">${i + 1}</span>
            <input class="guide-input" data-secname="${i}" value="${esc(sec.name)}" placeholder="Section ${i + 1} name" maxlength="60" autocomplete="off" enterkeyhint="done" />
            ${W.sections.length > 1 ? `<button type="button" class="icon-btn" data-drop="${i}" aria-label="Remove section ${i + 1}">${ICONS.x}</button>` : ''}</div>
          <div class="pick-chips">${sources.map((f) => `<button type="button" class="pick${sec.tags.includes(f.id) ? ' on' : ''}" data-tag="${esc(f.id)}" data-in="${i}" aria-pressed="${sec.tags.includes(f.id)}">${esc(f.name)} ${photosIn(f.id).length}</button>`).join('')}</div>
          ${sec.tags.length > 1 ? `<label class="switch-row"><span>Only photos with all of these tags</span><input type="checkbox" class="switch" role="switch" data-all="${i}"${sec.all ? ' checked' : ''} /></label>` : ''}
          <p class="guide-small">${sec.tags.length ? `${photosOf(sec).length} photos` : 'Pick at least one tag.'}</p>
        </div>`;
    });
    return out + '<button type="button" class="btn secondary guide-add" data-addsec>Add section</button>';
  }
  // A number to set with − and +: data-<key> on the buttons.
  function stepperRow(name, key, n, word) {
    return `
      <div class="guide-stepper"><span>${name}</span>
        <span class="stepper"><button type="button" data-${key}="-1" aria-label="Fewer ${word}">−</button><b>${n}</b><button type="button" data-${key}="1" aria-label="More ${word}">+</button></span></div>`;
  }

  // ---------- 4. Which photos ----------
  function stepPhotos() {
    return `
      <div class="opt-cards two" role="radiogroup" aria-label="Which photos come first">${ORDERS.map(([k, name, blurb]) => cardHtml({ attr: `data-order="${k}"`, on: W.order === k, name, blurb })).join('')}</div>
      ${stepperRow('Pages per section', 'per', W.perSection, 'pages')}
      <div class="guide-summary">${W.sections.map((sec, i) => {
        const n = photosOf(sec).length;
        return `<div class="guide-sumrow"><span>${esc(titleOf(sec, i))}</span><span class="guide-sumcount">${n ? `${n} ${n === 1 ? 'photo' : 'photos'}` : 'none yet'}</span></div>`;
      }).join('')}</div>
      ${W.sections.every((sec) => !photosOf(sec).length) ? '<p class="guide-small">No photos match yet, so the board starts with empty pages.</p>' : ''}`;
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
    view.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => go(-1)));
    view.querySelector('[data-close]').addEventListener('click', () => { location.hash = '#/boards'; });
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
      else if ('addsec' in d) { W.sections.push({ name: '', tags: [], all: true }); draw(true); const all = view.querySelectorAll('[data-secname]'); all[all.length - 1]?.scrollIntoView({ block: 'center' }); return; }
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
