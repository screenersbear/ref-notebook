// Looks at one photo at a time and says what's in it, on the phone itself: no
// photo leaves it. SigLIP (Google, Apache-2.0; Xenova's ONNX conversion) run by
// transformers.js (Apache-2.0), the same model as the Mac app. A worker, so
// the screen never waits on it.
import { env, AutoProcessor, SiglipVisionModel, RawImage } from '../ml/transformers.min.js';

const base = new URL('../ml/', import.meta.url).href;
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.useBrowserCache = true; // downloaded once, then kept
env.localModelPath = `${base}models/`;
env.backends.onnx.wasm.wasmPaths = base;
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.proxy = false;

const MODEL = 'Xenova/siglip-base-patch16-224';
let processor, vision, labels;

function vectors({ vectors: list, typical }) {
  return Object.entries(list).map(([tag, b64]) => {
    const raw = atob(b64), bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return { tag, typical: typical[tag], vec: new Float32Array(bytes.buffer) };
  });
}

async function load(id) {
  const seen = new Map();
  const progress_callback = (p) => {
    if (p.status !== 'progress' || !p.total) return;
    seen.set(p.file, [p.loaded, p.total]);
    let a = 0, b = 0;
    for (const [l, t] of seen.values()) { a += l; b += t; }
    self.postMessage({ progress: Math.round((a / b) * 100) });
  };
  labels = vectors(await (await fetch(`${base}labels.json`)).json());
  [processor, vision] = await Promise.all([
    AutoProcessor.from_pretrained(MODEL),
    SiglipVisionModel.from_pretrained(MODEL, { dtype: 'q8', device: 'wasm', progress_callback }),
  ]);
  self.postMessage({ id, ok: true });
}

// A tag fits when it scores clearly better than it does on photos in general
// (some wordings score high on almost anything) and is a decent match outright.
const LIFT = 0.04, FLOOR = 0.02, MOST = 4;
const pick = (scored) => scored
  .filter((l) => l.score - l.typical >= LIFT && l.score >= FLOOR)
  .sort((a, b) => (b.score - b.typical) - (a.score - a.typical))
  .slice(0, MOST)
  .map((l) => l.tag);

async function look(id, bytes) {
  const img = await RawImage.fromBlob(new Blob([bytes], { type: 'image/jpeg' }));
  const { pooler_output: { data } } = await vision(await processor(img));
  let n = 0;
  for (const v of data) n += v * v;
  n = Math.sqrt(n) || 1;
  const scored = labels.map(({ tag, typical, vec }) => {
    let s = 0;
    for (let i = 0; i < vec.length; i++) s += vec[i] * data[i];
    return { tag, typical, score: s / n };
  });
  self.postMessage({ id, ok: true, tags: pick(scored) });
}

self.onmessage = async ({ data: { id, type, bytes } }) => {
  try {
    if (type === 'load') await load(id); else await look(id, bytes);
  } catch (e) {
    self.postMessage({ id, ok: false, error: String(e?.message || e) });
  }
};
