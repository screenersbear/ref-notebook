// Page title and page text sizes, like the desktop app: each steps from 60% to
// 400% of its normal size, stored per page as titleSize / textSize. "Save as
// default" keeps a size for new pages; "Use default" puts a page back to it.
export const KEYS = { title: { size: 'titleSize', def: 1.5 }, body: { size: 'textSize', def: 1 }, note: { size: 'size', def: 1.6 } }; // note: a text box's own size, bigger than page text so it reads on a phone
export const TEXT_STEPS = [0.6, 0.75, 0.9, 1, 1.15, 1.3, 1.5, 1.75, 2, 2.5, 3, 4];
const STORE = 'ref-notebook-text-defaults';

export function savedDefaults() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } }
// The size a kind of text starts at: your saved one, or the built-in one.
export const defaultSize = (kind) => Number(savedDefaults()[kind]) > 0 ? Number(savedDefaults()[kind]) : 1;
// Sizes are kept as a share of the built-in size, so 1 = 100%.
export const sizeOf = (page, kind) => (page?.[KEYS[kind].size] ?? KEYS[kind].def) / KEYS[kind].def;

export function setSize(page, kind, rel) {
  const k = KEYS[kind], v = Math.round(rel * k.def * 1000) / 1000;
  if (v === k.def) delete page[k.size]; else page[k.size] = v;
}
export function stepSize(page, kind, dir) {
  const cur = sizeOf(page, kind);
  let k = TEXT_STEPS.findIndex((v) => v >= cur - 1e-6);
  if (k === -1) k = TEXT_STEPS.length - 1;
  if (TEXT_STEPS[k] !== cur && dir < 0) k++; // between steps: round toward the tap
  setSize(page, kind, TEXT_STEPS[Math.max(0, Math.min(TEXT_STEPS.length - 1, k + dir))]);
}
export const useDefault = (page, kind) => setSize(page, kind, defaultSize(kind));
export function saveDefault(page, kind) {
  const all = savedDefaults();
  all[kind] = sizeOf(page, kind);
  try { localStorage.setItem(STORE, JSON.stringify(all)); } catch {}
}
export const isDefault = (page, kind) => Math.abs(sizeOf(page, kind) - defaultSize(kind)) < 1e-6;

// A new page starts at your saved sizes (a cover keeps its own big title).
export function withTextDefaults(page) {
  for (const kind of ['title', 'body']) {
    if (page[KEYS[kind].size] !== undefined) continue;
    const d = defaultSize(kind);
    if (d !== 1) setSize(page, kind, d);
  }
  return page;
}
