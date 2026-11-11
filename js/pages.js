// Draws a mood board page: on screen and onto a canvas for the PDF, from the
// same numbers (the same layouts and crop maths as the Mac app).
import { templateFor, defaultTemplate, SHAPES } from './templates.js';
import { photoById, thumbUrl, fullUrl } from './library.js';
import { loadImage } from './util.js';

export const MAX_ZOOM = 6;
export const TEXT_SIZE = 0.0165;
const FONT = '"Courier New", Courier, monospace';
const pct = (v) => `${(v * 100).toFixed(4)}%`;

export const pageTemplate = (board, page) =>
  templateFor(board.shape, page.template) || defaultTemplate(board.shape, page.images.filter(Boolean).length);

export function applyCrop(img, im) {
  const [fx, fy] = im.focal || [0.5, 0.5];
  const z = Math.max(1, Math.min(MAX_ZOOM, im.zoom || 1));
  img.style.objectPosition = `${fx * 100}% ${fy * 100}%`;
  img.style.transformOrigin = `${fx * 100}% ${fy * 100}%`;
  img.style.transform = z > 1 ? `scale(${z})` : '';
}

// The page's main colors, weighted by how much of the page each photo covers.
export function pagePalette(page, t) {
  const seen = [];
  t.slots.forEach((s, i) => {
    const rec = page.images[i] && photoById(page.images[i].id);
    for (const c of rec?.palette || []) seen.push({ hex: c.hex, w: c.w * s.w * s.h });
  });
  const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const near = (a, b) => { const x = rgb(a), y = rgb(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) < 42; };
  const picked = [];
  for (const c of seen.sort((a, b) => b.w - a.w)) {
    const same = picked.find((p) => near(p.hex, c.hex));
    if (same) same.w += c.w; else if (picked.length < 6) picked.push({ ...c });
  }
  return picked.sort((a, b) => b.w - a.w).map((c) => c.hex);
}

const textParts = (page) => [
  { kind: 'title', text: page.title || '', scale: page.titleSize ?? 1.5, bold: true },
  { kind: 'body', text: page.text || '', scale: 1, bold: false },
].filter((p) => p.text.trim());

export async function renderPage(board, page, { selected = -1 } = {}) {
  const shape = SHAPES[board.shape];
  const t = pageTemplate(board, page);
  const el = document.createElement('div');
  el.className = 'page';
  el.style.aspectRatio = `${shape.W} / ${shape.H}`;
  await Promise.all(t.slots.map(async (s, i) => {
    const slot = document.createElement('div');
    slot.className = `slot${i === selected ? ' sel' : ''}`;
    slot.dataset.index = i;
    Object.assign(slot.style, { left: pct(s.x), top: pct(s.y), width: pct(s.w), height: pct(s.h) });
    el.append(slot);
    const im = page.images[i], rec = im && photoById(im.id);
    if (!rec) return;
    const img = document.createElement('img');
    img.draggable = false;
    img.alt = '';
    img.src = s.w * s.h > 0.2 ? (await fullUrl(im.id)) || thumbUrl(rec) : thumbUrl(rec);
    applyCrop(img, im);
    slot.append(img);
    slot.classList.add('filled');
  }));
  const parts = textParts(page);
  const cols = page.palette ? pagePalette(page, t) : [];
  if (parts.length || cols.length) {
    const tx = document.createElement('div');
    tx.className = `page-text${t.text.overlay ? ' overlay' : ''}${page.textFill === false ? ' nofill' : ''}`;
    if (t.text.size) tx.style.setProperty('--text-scale', t.text.size);
    if (t.text.overlay) Object.assign(tx.style, { left: pct(t.text.x), bottom: pct(1 - t.text.y - t.text.h), maxWidth: pct(t.text.w) });
    else Object.assign(tx.style, { left: pct(t.text.x), top: pct(t.text.y), width: pct(t.text.w), height: pct(t.text.h) });
    for (const p of parts) {
      const d = document.createElement('div');
      d.className = `pt-${p.kind}`;
      d.style.fontSize = `${p.scale}em`;
      d.style.fontWeight = p.bold ? 'bold' : 'normal';
      d.textContent = p.text;
      tx.append(d);
    }
    if (cols.length) {
      const strip = document.createElement('div');
      strip.className = 'pt-palette';
      for (const h of cols) { const sw = document.createElement('span'); sw.style.background = h; strip.append(sw); }
      tx.append(strip);
    }
    el.append(tx);
  }
  return el;
}

function drawCover(ctx, img, x, y, w, h, fx, fy, zoom = 1) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const scale = Math.max(w / iw, h / ih) * Math.max(1, Math.min(MAX_ZOOM, zoom || 1));
  const sw = w / scale, sh = h / scale;
  ctx.drawImage(img, (iw - sw) * fx, (ih - sh) * fy, sw, sh, x, y, w, h);
}

function wrapLines(ctx, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(/(\s+)/)) {
      const test = line + word;
      if (ctx.measureText(test).width > maxW && line.trim()) { out.push(line.trimEnd()); line = word.trimStart(); } else line = test;
    }
    out.push(line);
  }
  return out;
}

export async function pageToCanvas(board, page, pxWidth) {
  const shape = SHAPES[board.shape];
  const W = Math.round(pxWidth), H = Math.round((pxWidth * shape.H) / shape.W);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingQuality = 'high';
  const t = pageTemplate(board, page);
  for (let i = 0; i < t.slots.length; i++) {
    const s = t.slots[i], im = page.images[i];
    if (!im || !photoById(im.id)) continue;
    const url = await fullUrl(im.id);
    if (!url) continue;
    const img = await loadImage(url);
    const [fx, fy] = im.focal || [0.5, 0.5];
    drawCover(ctx, img, Math.round(s.x * W), Math.round(s.y * H), Math.round(s.w * W), Math.round(s.h * H), fx, fy, im.zoom);
    img.src = '';
  }
  const parts = textParts(page);
  const cols = page.palette ? pagePalette(page, t) : [];
  if (!parts.length && !cols.length) return c;
  const base = W * TEXT_SIZE * (t.text.size || 1);
  const pad = t.text.overlay ? base * 0.6 : 0;
  const x = t.text.x * W, y = t.text.y * H, w = t.text.w * W;
  ctx.textBaseline = 'top';
  const lines = [];
  let total = 0, widest = 0;
  parts.forEach((p, k) => {
    const fs = base * p.scale;
    const font = `${p.bold ? 'bold ' : ''}${fs}px ${FONT}`;
    ctx.font = font;
    for (const l of wrapLines(ctx, p.text, w - pad * 2)) { lines.push({ l, font, y: total }); total += fs * 1.35; widest = Math.max(widest, ctx.measureText(l).width); }
    if (k < parts.length - 1) total += fs * 0.35;
  });
  const sq = base * 2.2, gap = base * 0.35;
  const stripTop = total + (parts.length ? base * 0.6 : 0);
  if (cols.length) { total = stripTop + sq; widest = Math.max(widest, cols.length * sq + (cols.length - 1) * gap); }
  let top = y;
  if (t.text.overlay) {
    const boxH = total + pad * 2;
    top = y + t.text.h * H - boxH;
    if (page.textFill !== false) { ctx.fillStyle = '#fff'; ctx.fillRect(x, top, Math.min(w, widest + pad * 2), boxH); }
  }
  ctx.fillStyle = '#000';
  for (const ln of lines) { ctx.font = ln.font; ctx.fillText(ln.l, x + pad, top + pad + ln.y); }
  cols.forEach((h, k) => { ctx.fillStyle = h; ctx.fillRect(x + pad + k * (sq + gap), top + pad + stripTop, sq, sq); });
  return c;
}
