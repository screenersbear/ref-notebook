// The new board guide's small pieces (round 2, 07-new-board-layout): the
// step marks along its top, and a page drawn small.
import { SHAPES, templateFor } from '../data/templates.js';
import { esc } from '../components/util.js';

// The steps as marks on a hairline, named underneath: done ones solid, this
// one larger with a dot in the notebook's colour, the rest open rings. The
// line is inked up to this step.
export function marksHtml(names, at) {
  const last = names.length - 1;
  const marks = names.map((_, i) => {
    const line = i ? `<span class="guide-line${i <= at ? ' inked' : ''}"></span>` : '';
    return `${line}<span class="guide-mark${i === at ? ' now' : i < at ? ' done' : ''}"></span>`;
  }).join('');
  const words = names.map((n, i) => {
    const where = i === 0 ? 'left:0' : i === last ? 'right:0' : `left:${(i / last) * 100}%`;
    return `<span class="guide-mark-name${i <= at ? ' reached' : ''}${i && i < last ? ' mid' : ''}" style="${where}">${esc(n)}</span>`;
  }).join('');
  return `<div class="guide-marks" role="img" aria-label="Step ${at + 1} of ${names.length}: ${esc(names[at])}"><div class="guide-mark-row">${marks}</div><div class="guide-mark-names" aria-hidden="true">${words}</div></div>`;
}

// A page of a layout, drawn small: the page and its photo spots.
export function miniPage(shape, tid, w) {
  const s = SHAPES[shape], t = templateFor(shape, tid);
  const W = 60, H = (60 * s.H) / s.W;
  const r = (t?.slots || []).map((b) => `<rect x="${b.x * W}" y="${b.y * H}" width="${b.w * W}" height="${b.h * H}"/>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" style="width:${w}px" aria-hidden="true"><rect class="paper-r" width="${W}" height="${H}"/>${r}</svg>`;
}
