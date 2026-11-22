// Grids with thin lines between the photos, or none at all, and grids that
// run edge to edge (Starky, 21 Nov: "more template variety, especially some
// with grids having thinner or no lines of division"). Authored in inches,
// like the layouts in templates.js, which adds these after its own. Each is
// marked extra, so a page with no layout picked never starts on one.

export const THIN = 0.05; // inches between photos; the usual gutter is 0.18
export const NONE = 0;

// cols x rows boxes filling b, gap inches apart.
export function gridGap(cols, rows, b, gap) {
  const w = (b.w - gap * (cols - 1)) / cols, h = (b.h - gap * (rows - 1)) / rows;
  const out = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push({ x: b.x + c * (w + gap), y: b.y + r * (h + gap), w, h });
  return out;
}
// b cut in two, top and bottom (frac to the top) or side by side (frac to the left).
const splitV = (b, frac, gap) => { const h1 = (b.h - gap) * frac; return [{ ...b, h: h1 }, { ...b, y: b.y + h1 + gap, h: b.h - h1 - gap }]; };
const splitH = (b, frac, gap) => { const w1 = (b.w - gap) * frac; return [{ ...b, w: w1 }, { ...b, x: b.x + w1 + gap, w: b.w - w1 - gap }]; };

// The page's words over the photos, bottom left, for the edge to edge grids.
const overlay = (W, H, M, w) => ({ x: M, y: H - M - 0.6, w: Math.min(w, W - 2 * M), h: 0.6, overlay: true });

// Tall pages. area: where the photos go, above text, the page's words.
export function tallGrids(W, H, M, area, text) {
  const page = { x: 0, y: 0, w: W, h: H };
  const [top, bottom] = splitV(area, 0.62, THIN);
  return [
    { id: 'lp-grid-4-thin', name: 'Grid of four, thin lines', slots: gridGap(2, 2, area, THIN), text },
    { id: 'lp-grid-4-none', name: 'Grid of four, no lines', slots: gridGap(2, 2, area, NONE), text },
    { id: 'lp-grid-6-thin', name: 'Grid of six, thin lines', slots: gridGap(2, 3, area, THIN), text },
    { id: 'lp-grid-6-none', name: 'Grid of six, no lines', slots: gridGap(2, 3, area, NONE), text },
    { id: 'lp-grid-9-thin', name: 'Grid of nine, thin lines', slots: gridGap(3, 3, area, THIN), text },
    { id: 'lp-grid-9-none', name: 'Grid of nine, no lines', slots: gridGap(3, 3, area, NONE), text },
    { id: 'lp-grid-12-thin', name: 'Grid of twelve, thin lines', slots: gridGap(3, 4, area, THIN), text },
    { id: 'lp-two-stack-none', name: 'Two, stacked, no lines', slots: gridGap(1, 2, area, NONE), text },
    { id: 'lp-three-top-thin', name: 'Three, one dominant, thin lines', slots: [top, ...gridGap(2, 1, bottom, THIN)], text },
    { id: 'lp-strip-3', name: 'Three tall, thin lines', slots: gridGap(3, 1, area, THIN), text },
    { id: 'lp-edge-4', name: 'Grid of four, edge to edge', slots: gridGap(2, 2, page, NONE), text: overlay(W, H, M, 4.2) },
    { id: 'lp-edge-9', name: 'Grid of nine, edge to edge', slots: gridGap(3, 3, page, NONE), text: overlay(W, H, M, 4.2) },
  ].map((t) => ({ ...t, extra: true }));
}

// Wide pages, the same way.
export function wideGrids(W, H, M, area, text) {
  const page = { x: 0, y: 0, w: W, h: H };
  const [left, right] = splitH(area, 0.62, THIN);
  return [
    { id: 'w-grid-4-thin', name: 'Grid of four, thin lines', slots: gridGap(2, 2, area, THIN), text },
    { id: 'w-grid-4-none', name: 'Grid of four, no lines', slots: gridGap(2, 2, area, NONE), text },
    { id: 'w-grid-6-thin', name: 'Grid of six, thin lines', slots: gridGap(3, 2, area, THIN), text },
    { id: 'w-grid-6-none', name: 'Grid of six, no lines', slots: gridGap(3, 2, area, NONE), text },
    { id: 'w-grid-8-thin', name: 'Grid of eight, thin lines', slots: gridGap(4, 2, area, THIN), text },
    { id: 'w-two-none', name: 'Two up, no lines', slots: gridGap(2, 1, area, NONE), text },
    { id: 'w-three-none', name: 'Three across, no lines', slots: gridGap(3, 1, area, NONE), text },
    { id: 'w-four-across-thin', name: 'Four across, thin lines', slots: gridGap(4, 1, area, THIN), text },
    { id: 'w-three-left-thin', name: 'Three, one dominant, thin lines', slots: [left, ...gridGap(1, 2, right, THIN)], text },
    { id: 'w-edge-6', name: 'Grid of six, edge to edge', slots: gridGap(3, 2, page, NONE), text: overlay(W, H, M, 5.5) },
    { id: 'w-edge-8', name: 'Grid of eight, edge to edge', slots: gridGap(4, 2, page, NONE), text: overlay(W, H, M, 5.5) },
  ].map((t) => ({ ...t, extra: true }));
}
