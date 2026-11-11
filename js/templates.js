// Page layout templates. Authored in inches on the real page, converted to
// fractions of the page so the same template renders at any size: on the
// canvas, in the PDF, and in flat image export.
//
// A template: { id, name, slots: [{x,y,w,h}], text: {x,y,w,h, overlay?, size?} }

export const SHAPES = {
  'letter-portrait': { W: 8.5, H: 11, label: 'Letter portrait (8.5 × 11)' },
  'wide-16x9': { W: 13.333, H: 7.5, label: '16:9 landscape' },
};

const G = 0.18; // gutter, inches

function grid(cols, rows, b) {
  const w = (b.w - G * (cols - 1)) / cols, h = (b.h - G * (rows - 1)) / rows;
  const out = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push({ x: b.x + c * (w + G), y: b.y + r * (h + G), w, h });
  return out;
}
const splitH = (b, frac) => { const w1 = (b.w - G) * frac; return [{ ...b, w: w1 }, { ...b, x: b.x + w1 + G, w: b.w - w1 - G }]; };
const splitV = (b, frac) => { const h1 = (b.h - G) * frac; return [{ ...b, h: h1 }, { ...b, y: b.y + h1 + G, h: b.h - h1 - G }]; };

function lp() {
  const W = 8.5, H = 11, M = 0.5;
  const textH = 1.05; // room for a title line plus two or three lines of text
  const area = { x: M, y: M, w: W - 2 * M, h: H - 2 * M - textH - 0.15 };
  const text = { x: M, y: H - M - textH, w: W - 2 * M, h: textH };
  const [top, bottom] = splitV(area, 0.62);
  const [left, right] = splitH(area, 0.6);
  return [
    { id: 'lp-bleed', name: 'Single, full bleed', slots: [{ x: 0, y: 0, w: W, h: H }], text: { x: M, y: H - M - 0.6, w: 4.2, h: 0.6, overlay: true } },
    { id: 'lp-single', name: 'Single, framed', slots: [area], text },
    { id: 'lp-two-stack', name: 'Two, stacked', slots: grid(1, 2, area), text },
    { id: 'lp-two-side', name: 'Two, side by side', slots: grid(2, 1, area), text },
    { id: 'lp-three-top', name: 'Three, one dominant', slots: [top, ...grid(2, 1, bottom)], text },
    { id: 'lp-three-left', name: 'Three, tall left', slots: [left, ...grid(1, 2, right)], text },
    { id: 'lp-grid-4', name: 'Grid of four', slots: grid(2, 2, area), text },
    { id: 'lp-five', name: 'Five, one dominant', slots: [top, ...grid(4, 1, bottom)], text },
    { id: 'lp-grid-6', name: 'Grid of six', slots: grid(2, 3, area), text },
    { id: 'lp-grid-9', name: 'Grid of nine', slots: grid(3, 3, area), text },
    // A board's cover (makeCover below): one big image, the name large under it.
    { id: 'lp-cover', name: 'Cover', cover: true, slots: [{ x: M, y: M, w: W - 2 * M, h: 7.4 }], text: { x: M, y: M + 7.4 + 0.4, w: W - 2 * M, h: H - 2 * M - 7.8 } },
    { id: 'lp-text', name: 'One image, long text', slots: [{ x: M, y: M, w: W - 2 * M, h: 5.6 }], text: { x: M, y: M + 5.6 + 0.35, w: W - 2 * M, h: H - 2 * M - 5.95, size: 1.15 } },
  ].map((t) => norm(t, W, H));
}

function wide() {
  const W = 13.333, H = 7.5, M = 0.45;
  const textH = 0.8;
  const area = { x: M, y: M, w: W - 2 * M, h: H - 2 * M - textH - 0.12 };
  const text = { x: M, y: H - M - textH, w: W - 2 * M, h: textH };
  const [left, right] = splitH(area, 0.62);
  const sideArea = { x: M, y: M, w: 8.9, h: H - 2 * M };
  const sideText = { x: M + 8.9 + 0.35, y: M, w: W - 2 * M - 8.9 - 0.35, h: H - 2 * M };
  return [
    { id: 'w-bleed', name: 'Single, full bleed', slots: [{ x: 0, y: 0, w: W, h: H }], text: { x: M, y: H - M - 0.5, w: 5.5, h: 0.5, overlay: true } },
    { id: 'w-cover', name: 'Cover', cover: true, slots: [{ x: 0, y: 0, w: 7.9, h: H }], text: { x: 7.9 + 0.6, y: M + 1.9, w: W - 7.9 - 0.6 - M, h: H - 2 * M - 1.9 } },
    { id: 'w-single-text', name: 'Single, text beside', slots: [sideArea], text: sideText },
    { id: 'w-two', name: 'Two up', slots: grid(2, 1, area), text },
    { id: 'w-three', name: 'Three across', slots: grid(3, 1, area), text },
    { id: 'w-three-left', name: 'Three, one dominant', slots: [left, ...grid(1, 2, right)], text },
    { id: 'w-grid-4', name: 'Grid of four', slots: grid(2, 2, area), text },
    { id: 'w-four-across', name: 'Four across', slots: grid(4, 1, area), text },
    { id: 'w-grid-6', name: 'Grid of six', slots: grid(3, 2, area), text },
    { id: 'w-grid-8', name: 'Grid of eight', slots: grid(4, 2, area), text },
    { id: 'w-grid-10', name: 'Grid of ten', slots: grid(5, 2, area), text },
  ].map((t) => norm(t, W, H));
}

function norm(t, W, H) {
  const f = (r) => ({ ...r, x: r.x / W, y: r.y / H, w: r.w / W, h: r.h / H });
  return { ...t, slots: t.slots.map(f), text: f(t.text) };
}

// --- Guide pages ---------------------------------------------------------------
// A guide (renderer/js/guide.js) is a numbered grid of 4 to 12 photos per
// page; the first page of each section has a heading strip on top for the
// section's title. The grid is picked so the cells come out close to the
// shape of a portrait photo, with as few empty cells as possible.
// Ids: g-<shape>-<n>-head and g-<shape>-<n>.
export const GUIDE_MIN = 4, GUIDE_MAX = 12;
export const guideTemplateId = (shape, n, head) => `g-${shape === 'wide-16x9' ? 'w' : 'lp'}-${n}${head ? '-head' : ''}`;
function guides(shape) {
  const { W, H } = SHAPES[shape], M = shape === 'wide-16x9' ? 0.45 : 0.5, HEAD = 0.95;
  const out = [];
  for (let n = GUIDE_MIN; n <= GUIDE_MAX; n++) for (const head of [true, false]) {
    const area = { x: M, y: M + (head ? HEAD : 0), w: W - 2 * M, h: H - 2 * M - (head ? HEAD : 0) };
    let best = null;
    for (let cols = 1; cols <= n; cols++) {
      const rows = Math.ceil(n / cols);
      const cw = (area.w - G * (cols - 1)) / cols, ch = (area.h - G * (rows - 1)) / rows;
      const cost = Math.abs(Math.log(cw / ch / 0.72)) + 0.35 * (cols * rows - n);
      if (!best || cost < best.cost) best = { cost, cols, rows };
    }
    out.push({ id: guideTemplateId(shape, n, head), name: `Guide, ${n}${head ? ' with heading' : ''}`, guide: true,
      slots: grid(best.cols, best.rows, area).slice(0, n),
      text: head ? { x: M, y: M, w: W - 2 * M, h: HEAD - 0.2 } : { x: M, y: H - M - 0.5, w: 5, h: 0.5, overlay: true } });
  }
  return out.map((t) => norm(t, W, H));
}

export const TEMPLATES = { 'letter-portrait': [...lp(), ...guides('letter-portrait')], 'wide-16x9': [...wide(), ...guides('wide-16x9')] };

export function templateFor(shape, id) {
  const list = TEMPLATES[shape] || [];
  return list.find((t) => t.id === id) || null;
}

// Sensible default for a page with n images.
export function defaultTemplate(shape, n) {
  const list = TEMPLATES[shape].filter((t) => !t.guide && !t.cover);
  return list.find((t) => t.slots.length >= Math.max(1, n) && !t.id.endsWith('bleed')) || list[list.length - 1];
}

// A cover page for a board: its first image big, the board's name as a large
// title, and its project type(s) and the month under it (all editable).
export const coverTemplateId = (shape) => (shape === 'wide-16x9' ? 'w-cover' : 'lp-cover');
export function makeCover({ shape, name, categories = [] }, imageId = null) {
  const when = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  return { template: coverTemplateId(shape), images: imageId ? [imageId] : [], cover: true,
    title: name || 'Untitled board', titleSize: 3, text: [...categories.filter(Boolean), when].join(' · ') };
}

// --- Layout approaches -------------------------------------------------------
// Chosen in the new-board wizard. Each is a cycle of templates per page shape;
// page n of a board uses sequence[n % length], and pages added later continue
// the cycle.
export const STYLES = [
  { id: 'grid', name: 'Classic grid', blurb: 'Even, uniform grids. Calm and easy to compare.',
    seq: { 'letter-portrait': ['lp-grid-6', 'lp-grid-4'], 'wide-16x9': ['w-grid-6', 'w-grid-8'] } },
  { id: 'hero', name: 'Hero + supporting', blurb: 'One dominant image per page, with smaller ones around it.',
    seq: { 'letter-portrait': ['lp-three-top', 'lp-five', 'lp-three-left'], 'wide-16x9': ['w-three-left', 'w-single-text', 'w-three-left'] } },
  { id: 'mosaic', name: 'Varied mosaic', blurb: 'Mixed sizes, every page different. Lively, magazine-like.',
    seq: { 'letter-portrait': ['lp-three-left', 'lp-grid-4', 'lp-five', 'lp-two-side', 'lp-three-top', 'lp-grid-9'], 'wide-16x9': ['w-three-left', 'w-grid-8', 'w-two', 'w-four-across', 'w-grid-4', 'w-three'] } },
  { id: 'bleed', name: 'Full-bleed story', blurb: 'One image per page, edge to edge. For a slow, immersive sequence.',
    seq: { 'letter-portrait': ['lp-bleed'], 'wide-16x9': ['w-bleed'] } },
  { id: 'editorial', name: 'Editorial', blurb: 'Images with room for words: notes, direction, references.',
    seq: { 'letter-portrait': ['lp-text', 'lp-single'], 'wide-16x9': ['w-single-text', 'w-two'] } },
  { id: 'pairs', name: 'Pairs', blurb: 'Two images per page, for comparisons and before/after.',
    seq: { 'letter-portrait': ['lp-two-stack', 'lp-two-side'], 'wide-16x9': ['w-two'] } },
];

export const styleFor = (id) => STYLES.find((s) => s.id === id) || null;

// Template for page `n` of a board in a given style (or null for "no style").
export function styleTemplate(shape, styleId, n) {
  const st = styleFor(styleId);
  const seq = st?.seq[shape];
  return seq?.length ? seq[n % seq.length] : null;
}

// Pour images into pages following the style's cycle. Returns [{template, images}].
export function paginate(shape, styleId, imageIds) {
  const pages = [];
  let i = 0, n = 0;
  while (i < imageIds.length || !pages.length) {
    const tid = styleTemplate(shape, styleId, n) || defaultTemplate(shape, imageIds.length - i).id;
    const slots = templateFor(shape, tid).slots.length;
    pages.push({ template: tid, images: imageIds.slice(i, i + slots) });
    i += slots; n++;
    if (n > 500) break;
  }
  return pages;
}
