// Made by tools/join.mjs from the files listed in files.txt. Never edit it: change those files, then run node tools/join.mjs.
// \0rolldown/runtime.js
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", {
	value,
	configurable: true
});

// components/keyboard-fit.js
const vv = window.visualViewport;
const html$1 = document.documentElement;
let leftoverTop = 0;
function fitViewport() {
	if (!vv) return;
	const a = document.activeElement;
	const typingNow = !!a && a.matches("input:not([type=\"checkbox\"]), textarea, [contenteditable]");
	if (!typingNow) leftoverTop = vv.offsetTop;
	html$1.style.setProperty("--vv-top", `${typingNow ? Math.max(0, vv.offsetTop - leftoverTop) : 0}px`);
	html$1.style.setProperty("--vv-height", `${typingNow ? vv.height : window.innerHeight}px`);
}
if (vv) {
	vv.addEventListener("resize", fitViewport);
	vv.addEventListener("scroll", fitViewport);
	document.addEventListener("focusin", fitViewport);
	document.addEventListener("focusout", () => setTimeout(fitViewport, 300));
	fitViewport();
}

// components/screen-fit.js
const html = document.documentElement;
const iPhoneApp = /iPhone|iPod/.test(navigator.userAgent) && (navigator.standalone === true || matchMedia("(display-mode: standalone)").matches);
const typing = () => !!document.activeElement && document.activeElement.matches("input, textarea, [contenteditable]");
let probe = null;
function screenGap(full = 0) {
	if (!document.body) return 0;
	if (!probe) {
		probe = document.createElement("div");
		probe.setAttribute("aria-hidden", "true");
		probe.style.cssText = "position: fixed; left: 0; bottom: 0; width: 1px; height: 0; visibility: hidden; pointer-events: none; padding-top: var(--test-safe-top, env(safe-area-inset-top));";
		document.body.appendChild(probe);
	}
	const portrait = Math.abs(window.innerWidth - screen.width) < 2;
	const real = full || (portrait ? screen.height : screen.width);
	html.style.setProperty("--screen-h", `${Math.round(real)}px`);
	const under = parseFloat(getComputedStyle(probe).paddingTop) > 0;
	const gap = Math.round(real - probe.getBoundingClientRect().bottom);
	if (under) return gap > 8 && gap < 120 ? gap : 0;
	return gap > 76 && gap < 150 ? Math.round(gap / 2) : 0;
}
let nudging = false;
function nudgeScreen(tries = 3, full = 0) {
	return new Promise((done) => {
		const go = (left) => {
			if (!left || !screenGap(full) || typing()) {
				nudging = false;
				done(screenGap(full));
				return;
			}
			nudging = true;
			html.classList.add("ios-nudge");
			setTimeout(() => {
				const y = window.scrollY;
				window.scrollTo(0, y + 1);
				setTimeout(() => {
					window.scrollTo(0, y);
					setTimeout(() => {
						html.classList.remove("ios-nudge");
						setTimeout(() => go(left - 1), 200);
					}, 120);
				}, 40);
			}, 30);
		};
		if (nudging) done(screenGap(full));
		else go(tries);
	});
}
let measured = false;
function markShort(gap) {
	html.classList.toggle("is-short", gap > 0);
	if (gap > 0) html.style.setProperty("--short-by", `${gap}px`);
	else html.style.removeProperty("--short-by");
}
if (iPhoneApp) {
	let soonTimer = 0;
	const soon = (ms) => clearTimeout(soonTimer) || (soonTimer = setTimeout(() => {
		if (!nudging && screenGap() > 0) html.classList.remove("settled");
		nudgeScreen().then(async (gap) => {
			if (gap > 0) {
				html.classList.add("ios-hold");
				await new Promise((r) => setTimeout(r, 40));
				window.scrollTo(0, 1);
				await new Promise((r) => setTimeout(r, 60));
				window.scrollTo(0, 0);
				await new Promise((r) => setTimeout(r, 200));
				gap = screenGap();
				if (gap > 0) html.classList.remove("ios-hold");
			}
			measured = true;
			markShort(gap);
			setAppHeight();
			html.classList.add("settled");
		});
	}, ms));
	window.addEventListener("load", () => soon(120));
	window.addEventListener("pageshow", () => soon(80));
	document.addEventListener("visibilitychange", () => {
		if (!document.hidden) soon(80);
	});
	window.addEventListener("orientationchange", () => soon(300));
}
let appH = 0;
function setBookHeight() {
	const portrait = Math.abs(window.innerWidth - screen.width) < 2;
	html.style.setProperty("--book-h", `${iPhoneApp ? portrait ? screen.height : screen.width : window.innerHeight}px`);
}
setBookHeight();
window.addEventListener("resize", setBookHeight);
function setAppHeight() {
	if (html.classList.contains("ios-nudge") || nudging || typing()) return;
	const h = window.innerHeight;
	if (Math.abs(h - appH) < 2) return;
	appH = h;
	html.style.setProperty("--app-h", `${h}px`);
	if (measured) markShort(screenGap());
	window.dispatchEvent(new Event("ref-layout"));
}
setAppHeight();
setTimeout(() => html.classList.add("settled"), iPhoneApp ? 3500 : 0);
window.addEventListener("resize", setAppHeight);
window.addEventListener("orientationchange", () => setTimeout(setAppHeight, 350));
document.addEventListener("visibilitychange", () => {
	if (!document.hidden) setTimeout(setAppHeight, 900);
});
window.addEventListener("load", () => setTimeout(setAppHeight, 900));
document.addEventListener("touchmove", (e) => {
	if (!html.classList.contains("ios-hold") || e.touches.length > 1) return;
	for (let el = e.target; el && el !== document.body; el = el.parentElement) {
		const st = getComputedStyle(el);
		if (/auto|scroll/.test(st.overflowY) && el.scrollHeight > el.clientHeight || /auto|scroll/.test(st.overflowX) && el.scrollWidth > el.clientWidth) return;
		if (st.touchAction === "none") return;
	}
	e.preventDefault();
}, { passive: false });

// components/no-zoom.js
document.addEventListener("gesturestart", (e) => e.preventDefault());
if (/iP(hone|ad|od)/.test(navigator.userAgent) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) {
	const meta = document.querySelector("meta[name=\"viewport\"]");
	if (meta && !/maximum-scale/.test(meta.content)) meta.content += ", maximum-scale=1";
}

// components/util.js
function uuid() {
	if (crypto.randomUUID) return crypto.randomUUID();
	const b = crypto.getRandomValues(new Uint8Array(16));
	b[6] = b[6] & 15 | 64;
	b[8] = b[8] & 63 | 128;
	const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
	return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
function nowISO() {
	return new Date().toISOString();
}
function esc(v) {
	return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const clone = (v) => JSON.parse(JSON.stringify(v));
function shortDate(iso) {
	const d = new Date(iso);
	const opts = {
		month: "short",
		day: "numeric"
	};
	if (d.getFullYear() !== new Date().getFullYear()) opts.year = "numeric";
	return d.toLocaleDateString(undefined, opts);
}
function slug(name) {
	const s = String(name || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
	return s || "post";
}
function debounce(fn, ms) {
	let t;
	const run = (...args) => {
		clearTimeout(t);
		t = setTimeout(() => fn(...args), ms);
	};
	run.flush = (...args) => {
		clearTimeout(t);
		return fn(...args);
	};
	run.cancel = () => clearTimeout(t);
	return run;
}
function downloadBlob(blob, name) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = name;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 6e4);
}
function canvasToBlob(canvas, type, quality) {
	try {
		const url = canvas.toDataURL(type, quality);
		const comma = url.indexOf(",");
		if (comma < 0 || url.length < 30) throw new Error("Could not make the image");
		const mime = url.slice(5, url.indexOf(";")) || type;
		const bin = atob(url.slice(comma + 1));
		const bytes = new Uint8Array(bin.length);
		for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
		return Promise.resolve(new Blob([bytes], { type: mime }));
	} catch (e) {
		return Promise.reject(e);
	}
}
const nextFrame = () => new Promise((r) => setTimeout(r, 0));
function loadImage$1(src) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.decoding = "async";
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error("Could not open the image"));
		img.src = src;
	});
}
__name(loadImage$1, "loadImage");
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
const isPhone = () => window.matchMedia("(pointer: coarse)").matches;

// data/db.js
const DB_NAME = "ref-notebook";
const STORES = [
	"photos",
	"thumbs",
	"files",
	"folders",
	"boards",
	"stickers",
	"meta"
];
const KEY = { meta: "key" };
let dbPromise = null;
function openDb() {
	if (dbPromise) return dbPromise;
	dbPromise = new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, 3);
		req.onupgradeneeded = () => {
			for (const s of STORES) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s, { keyPath: KEY[s] || "id" });
		};
		req.onsuccess = () => {
			req.result.onversionchange = () => req.result.close();
			resolve(req.result);
		};
		req.onerror = () => reject(req.error);
	});
	return dbPromise;
}
async function tx(stores, mode, fn) {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const t = db.transaction(stores, mode);
		let out;
		t.oncomplete = () => resolve(out);
		t.onabort = () => reject(t.error || new Error("Could not save. Your phone may be out of space."));
		Promise.resolve(fn(t, (v) => {
			out = v;
		})).catch(reject);
	});
}
const all = (store) => tx([store], "readonly", (t, set) => {
	t.objectStore(store).getAll().onsuccess = (e) => set(e.target.result);
});
const one = (store, id) => tx([store], "readonly", (t, set) => {
	t.objectStore(store).get(id).onsuccess = (e) => set(e.target.result);
});
const stamp = (r) => ({
	...r,
	id: r.id || uuid(),
	createdAt: r.createdAt || nowISO(),
	updatedAt: nowISO()
});
const listPhotos = () => all("photos");
const listFolders = () => all("folders");
const listBoards = async () => (await all("boards")).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
const getBoard = (id) => one("boards", id);
async function getFile(id) {
	const full = (await one("files", id))?.full;
	if (!full) return null;
	return new Blob([full instanceof Blob ? await full.arrayBuffer() : full], { type: "image/jpeg" });
}
const getThumb = async (id) => (await one("thumbs", id))?.bytes;
function getThumbs(ids) {
	return tx(["thumbs"], "readonly", (t, set) => {
		const out = new Map();
		set(out);
		ids.forEach((id) => {
			t.objectStore("thumbs").get(id).onsuccess = (e) => {
				if (e.target.result) out.set(id, e.target.result.bytes);
			};
		});
	});
}
function moveThumbOff(p, bytes) {
	const { thumb, ...rest } = p;
	return tx(["photos", "thumbs"], "readwrite", (t) => {
		t.objectStore("thumbs").put({
			id: p.id,
			bytes
		});
		t.objectStore("photos").put(rest);
	}).then(() => rest);
}
async function addPhoto(rec, full, thumb) {
	const r = stamp(rec);
	await tx([
		"photos",
		"thumbs",
		"files"
	], "readwrite", (t) => {
		t.objectStore("photos").put(r);
		t.objectStore("thumbs").put({
			id: r.id,
			bytes: thumb
		});
		t.objectStore("files").put({
			id: r.id,
			full
		});
	});
	return r;
}
function patchPhoto(id, fields) {
	return tx(["photos"], "readwrite", (t) => {
		const s = t.objectStore("photos");
		s.get(id).onsuccess = (e) => {
			if (e.target.result) s.put({
				...e.target.result,
				...fields
			});
		};
	});
}
function savePhotos(list) {
	const out = list.map(stamp);
	return tx(["photos"], "readwrite", (t, set) => {
		out.forEach((p) => t.objectStore("photos").put(p));
		set(out);
	});
}
async function keepForUndo(ids) {
	const [photos, boards] = await Promise.all([all("photos"), all("boards")]);
	const want = new Set(ids);
	const items = [];
	for (const p of photos.filter((x) => want.has(x.id))) {
		const f = (await one("files", p.id))?.full;
		items.push({
			p,
			thumb: await getThumb(p.id),
			full: f instanceof Blob ? await f.arrayBuffer() : f
		});
	}
	return {
		items,
		boards: boards.filter((b) => b.pages.some((pg) => pg.images.some((im) => im && want.has(im.id))))
	};
}
function putBack({ items, boards }) {
	return tx([
		"photos",
		"thumbs",
		"files",
		"boards"
	], "readwrite", (t) => {
		for (const { p, thumb, full } of items) {
			t.objectStore("photos").put(p);
			if (thumb) t.objectStore("thumbs").put({
				id: p.id,
				bytes: thumb
			});
			if (full) t.objectStore("files").put({
				id: p.id,
				full
			});
		}
		for (const b of boards) t.objectStore("boards").put(b);
	});
}
async function deletePhotos(ids) {
	const gone = new Set(ids);
	const boards = await all("boards");
	await tx([
		"photos",
		"thumbs",
		"files",
		"boards"
	], "readwrite", (t) => {
		for (const id of ids) {
			t.objectStore("photos").delete(id);
			t.objectStore("thumbs").delete(id);
			t.objectStore("files").delete(id);
		}
		for (const b of boards) {
			let changed = false;
			for (const p of b.pages) p.images = p.images.map((im) => {
				if (im && gone.has(im.id)) {
					changed = true;
					return null;
				}
				return im;
			});
			if (changed) t.objectStore("boards").put(stamp(b));
		}
	});
}
function saveFolder(f) {
	const r = stamp(f);
	return tx(["folders"], "readwrite", (t, set) => {
		t.objectStore("folders").put(r);
		set(r);
	});
}
async function deleteFolder(id) {
	const photos = (await all("photos")).filter((p) => p.folderIds.includes(id));
	await tx(["folders", "photos"], "readwrite", (t) => {
		t.objectStore("folders").delete(id);
		for (const p of photos) t.objectStore("photos").put(stamp({
			...p,
			folderIds: p.folderIds.filter((x) => x !== id)
		}));
	});
}
function saveBoard(b) {
	const r = stamp(b);
	return tx(["boards"], "readwrite", (t, set) => {
		t.objectStore("boards").put(r);
		set(r);
	});
}
function restoreFolder(f, photoIds) {
	return tx(["folders", "photos"], "readwrite", (t) => {
		t.objectStore("folders").put(f);
		const s = t.objectStore("photos");
		photoIds.forEach((id) => {
			s.get(id).onsuccess = (e) => {
				const p = e.target.result;
				if (p && !p.folderIds.includes(f.id)) s.put({
					...p,
					folderIds: [...p.folderIds, f.id]
				});
			};
		});
	});
}
const listStickers = () => all("stickers");
function saveSticker(s) {
	const r = stamp(s);
	return tx(["stickers"], "readwrite", (t, set) => {
		t.objectStore("stickers").put(r);
		set(r);
	});
}
const deleteSticker = (id) => tx(["stickers"], "readwrite", (t) => {
	t.objectStore("stickers").delete(id);
});
const deleteBoard = (id) => tx(["boards"], "readwrite", (t) => {
	t.objectStore("boards").delete(id);
});

// data/photos.js
const FULL_MAX = 2400;
const THUMB_MAX = 640;
function downscale(src, srcW, srcH, w, h) {
	let cur = src;
	let cw = srcW;
	let ch = srcH;
	const temps = [];
	while (cw / 2 >= w && ch / 2 >= h) {
		const c = document.createElement("canvas");
		c.width = Math.max(1, Math.round(cw / 2));
		c.height = Math.max(1, Math.round(ch / 2));
		const x = c.getContext("2d", { colorSpace: "srgb" });
		x.imageSmoothingQuality = "high";
		x.drawImage(cur, 0, 0, c.width, c.height);
		temps.push(c);
		cur = c;
		cw = c.width;
		ch = c.height;
	}
	const out = document.createElement("canvas");
	out.width = Math.max(1, Math.round(w));
	out.height = Math.max(1, Math.round(h));
	const ctx = out.getContext("2d", { colorSpace: "srgb" });
	ctx.imageSmoothingQuality = "high";
	ctx.drawImage(cur, 0, 0, out.width, out.height);
	temps.forEach((c) => {
		c.width = 0;
		c.height = 0;
	});
	return out;
}
const fit = (w, h, max) => {
	const k = Math.min(1, max / Math.max(w, h));
	return [Math.round(w * k), Math.round(h * k)];
};
const hex = (r, g, b) => `#${[
	r,
	g,
	b
].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
function readColors(canvas) {
	const s = document.createElement("canvas");
	s.width = 48;
	s.height = 48;
	const g = s.getContext("2d", { willReadFrequently: true });
	g.drawImage(canvas, 0, 0, 48, 48);
	const d = g.getImageData(0, 0, 48, 48).data;
	const buckets = new Map();
	let warmth = 0;
	let satSum = 0;
	for (let i = 0; i < d.length; i += 4) {
		const r = d[i];
		const gr = d[i + 1];
		const b = d[i + 2];
		const max = Math.max(r, gr, b);
		const min = Math.min(r, gr, b);
		const sat = max ? (max - min) / max : 0;
		satSum += sat;
		warmth += (r - b) * sat;
		const k = (r >> 5) * 64 + (gr >> 5) * 8 + (b >> 5);
		const e = buckets.get(k) || {
			n: 0,
			r: 0,
			g: 0,
			b: 0
		};
		e.n++;
		e.r += r;
		e.g += gr;
		e.b += b;
		buckets.set(k, e);
	}
	const total = 48 * 48;
	const picked = [];
	for (const e of [...buckets.values()].sort((a, b) => b.n - a.n)) {
		const c = [
			e.r / e.n,
			e.g / e.n,
			e.b / e.n
		];
		const same = picked.find((p) => Math.hypot(p.c[0] - c[0], p.c[1] - c[1], p.c[2] - c[2]) < 42);
		if (same) same.n += e.n;
		else if (picked.length < 5) picked.push({
			c,
			n: e.n
		});
	}
	picked.sort((a, b) => b.n - a.n);
	const palette = picked.map((p) => ({
		hex: hex(...p.c),
		w: p.n / total
	}));
	const avgSat = satSum / total;
	const tone = avgSat < .12 ? "neutral" : warmth > 0 ? "warm" : "cool";
	let hue = null;
	const main = picked.find((p) => {
		const mx = Math.max(...p.c);
		const mn = Math.min(...p.c);
		return mx > 30 && (mx - mn) / mx > .15;
	});
	if (main && tone !== "neutral") {
		const [r, gr, b] = main.c, mx = Math.max(r, gr, b), mn = Math.min(r, gr, b), dl = mx - mn;
		const h = mx === r ? (gr - b) / dl % 6 : mx === gr ? (b - r) / dl + 2 : (r - gr) / dl + 4;
		hue = (h * 60 + 360) % 360;
	}
	s.width = s.height = 0;
	return {
		palette,
		tone,
		hue
	};
}
async function importFile(file) {
	const url = URL.createObjectURL(file);
	try {
		const img = await loadImage$1(url);
		const width = img.naturalWidth;
		const height = img.naturalHeight;
		if (!width || !height) throw new Error("empty");
		const [fw, fh] = fit(width, height, FULL_MAX);
		const fc = downscale(img, width, height, fw, fh);
		const full = await (await canvasToBlob(fc, "image/jpeg", .86)).arrayBuffer();
		const [tw, th] = fit(width, height, THUMB_MAX);
		const tc = downscale(fc, fw, fh, tw, th);
		const thumb = await (await canvasToBlob(tc, "image/jpeg", .8)).arrayBuffer();
		const colors = readColors(tc);
		fc.width = fc.height = tc.width = tc.height = 0;
		img.src = "";
		return addPhoto({
			name: (file.name || "photo").replace(/\.[^.]+$/, ""),
			width: fw,
			height: fh,
			shape: fw > fh * 1.1 ? "wide" : fh > fw * 1.1 ? "tall" : "square",
			...colors,
			folderIds: [],
			favorite: false
		}, full, thumb);
	} finally {
		URL.revokeObjectURL(url);
	}
}
async function remakeThumb(id) {
	const blob = await getFile(id);
	if (!blob) return null;
	const url = URL.createObjectURL(blob);
	try {
		const img = await loadImage$1(url);
		const [tw, th] = fit(img.naturalWidth, img.naturalHeight, THUMB_MAX);
		const tc = downscale(img, img.naturalWidth, img.naturalHeight, tw, th);
		const bytes = await (await canvasToBlob(tc, "image/jpeg", .8)).arrayBuffer();
		tc.width = tc.height = 0;
		return bytes;
	} finally {
		URL.revokeObjectURL(url);
	}
}
async function importFiles(files, onProgress) {
	const photos = [];
	const failed = [];
	const list = [...files].filter((f) => !f.type || f.type.startsWith("image/"));
	for (let i = 0; i < list.length; i++) {
		if (onProgress) onProgress(i + 1, list.length);
		try {
			photos.push(await importFile(list[i]));
		} catch {
			failed.push(list[i].name || "photo");
		}
	}
	return {
		photos,
		failed
	};
}
function pickFiles(multiple = true) {
	return new Promise((resolve) => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = "image/*";
		input.multiple = multiple;
		input.style.display = "none";
		input.addEventListener("change", () => {
			const f = [...input.files || []];
			input.remove();
			resolve(f);
		});
		input.addEventListener("cancel", () => {
			input.remove();
			resolve([]);
		});
		document.body.appendChild(input);
		input.click();
	});
}

// data/library.js
const lib = {
	photos: [],
	folders: []
};
async function moveOldThumbs(photos) {
	for (let i = 0; i < photos.length; i++) {
		const p = photos[i];
		if (!("thumb" in p)) continue;
		let bytes = null;
		try {
			bytes = await remakeThumb(p.id);
		} catch {}
		if (!bytes) {
			try {
				bytes = await p.thumb.arrayBuffer();
			} catch {}
		}
		if (bytes) photos[i] = await moveThumbOff(p, bytes);
	}
}
const thumbs = new Map();
async function refresh() {
	const [photos, folders] = await Promise.all([listPhotos(), listFolders()]);
	await moveOldThumbs(photos);
	lib.photos = photos;
	lib.folders = folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
	const missing = photos.filter((p) => !thumbs.has(p.id)).map((p) => p.id);
	if (missing.length) {
		const got = await getThumbs(missing);
		for (const [id, bytes] of got) thumbs.set(id, URL.createObjectURL(new Blob([bytes], { type: "image/jpeg" })));
	}
	const here = new Set(photos.map((p) => p.id));
	for (const [id, u] of thumbs) if (!here.has(id)) {
		URL.revokeObjectURL(u);
		thumbs.delete(id);
	}
}
const photoById = (id) => lib.photos.find((p) => p.id === id);
const thumbUrl = (p) => p && thumbs.get(p.id) || "";
const fulls = new Map();
async function fullUrl(id) {
	if (fulls.has(id)) {
		const u = fulls.get(id);
		fulls.delete(id);
		fulls.set(id, u);
		return u;
	}
	const blob = await getFile(id);
	if (!blob) return "";
	const u = URL.createObjectURL(blob);
	fulls.set(id, u);
	if (fulls.size > 30) {
		const [k, old] = fulls.entries().next().value;
		fulls.delete(k);
		setTimeout(() => URL.revokeObjectURL(old), 5e3);
	}
	return u;
}
const SPECIAL = [
	{
		id: "incoming",
		name: "Incoming"
	},
	{
		id: "favorites",
		name: "Favorites"
	},
	{
		id: "all",
		name: "All photos"
	}
];
const isSpecial = (id) => SPECIAL.some((s) => s.id === id);
const folderById = (id) => SPECIAL.find((s) => s.id === id) || lib.folders.find((f) => f.id === id);
function photosIn(id) {
	if (id === "all") return lib.photos;
	if (id === "incoming") return lib.photos.filter((p) => !p.folderIds.length);
	if (id === "favorites") return lib.photos.filter((p) => p.favorite);
	return lib.photos.filter((p) => p.folderIds.includes(id));
}
const SORTS = [
	{
		key: "newest",
		label: "Newest added"
	},
	{
		key: "oldest",
		label: "Oldest added"
	},
	{
		key: "az",
		label: "Name A to Z"
	},
	{
		key: "za",
		label: "Name Z to A"
	},
	{
		key: "fav",
		label: "Favorites first"
	},
	{
		key: "color",
		label: "Color"
	}
];
const hueRank = (p) => p.hue === null || p.hue === undefined ? 1e3 : p.hue;
const byName = (a, b) => a.name.localeCompare(b.name, undefined, {
	numeric: true,
	sensitivity: "base"
});
const newest = (a, b) => b.createdAt.localeCompare(a.createdAt);
function sortList(list, key) {
	const out = [...list];
	if (key === "oldest") return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
	if (key === "az") return out.sort(byName);
	if (key === "za") return out.sort((a, b) => byName(b, a));
	if (key === "fav") return out.sort((a, b) => b.favorite - a.favorite || newest(a, b));
	if (key === "color") return out.sort((a, b) => hueRank(a) - hueRank(b) || newest(a, b));
	return out.sort(newest);
}
const SORT_KEY = "ref-notebook-sort";
function sortMemory() {
	try {
		return JSON.parse(localStorage.getItem(SORT_KEY)) || {};
	} catch {
		return {};
	}
}
const sortOf = (id) => sortMemory()[id] || "newest";
function setSort(id, key) {
	const m = sortMemory();
	if (key === "newest") delete m[id];
	else m[id] = key;
	try {
		localStorage.setItem(SORT_KEY, JSON.stringify(m));
	} catch {}
}
const rgbOf = (hex) => [
	1,
	3,
	5
].map((i) => parseInt(hex.slice(i, i + 2), 16));
function hsl([r, g, b]) {
	const R = r / 255;
	const G = g / 255;
	const B = b / 255;
	const mx = Math.max(R, G, B);
	const mn = Math.min(R, G, B);
	const d = mx - mn;
	const l = (mx + mn) / 2;
	const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
	const h = !d ? 0 : mx === R ? ((G - B) / d % 6 + 6) % 6 * 60 : mx === G ? ((B - R) / d + 2) * 60 : ((R - G) / d + 4) * 60;
	return [
		h,
		s,
		l
	];
}
function colorName(hex) {
	const [h, s, l] = hsl(rgbOf(hex));
	if (l < .13) return "black";
	if (l > .9 && s < .5) return "white";
	if (s < .14) return "gray";
	if (h >= 12 && h < 48 && l < .42) return "brown";
	if (h < 12 || h >= 345) return l > .72 ? "pink" : "red";
	if (h < 42) return "orange";
	if (h < 68) return "yellow";
	if (h < 165) return "green";
	if (h < 255) return "blue";
	if (h < 300) return "purple";
	return "pink";
}
function lab(hex) {
	const [x, y, z] = rgbOf(hex).map((v) => {
		const c = v / 255;
		return c > .04045 ? ((c + .055) / 1.055) ** 2.4 : c / 12.92;
	});
	const f = (t) => t > .008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
	const X = f((.4124 * x + .3576 * y + .1805 * z) / .95047);
	const Y = f(.2126 * x + .7152 * y + .0722 * z);
	const Z = f((.0193 * x + .1192 * y + .9505 * z) / 1.08883);
	return [
		116 * Y - 16,
		500 * (X - Y),
		200 * (Y - Z)
	];
}
function photosOfColor(hex) {
	const want = lab(hex);
	const out = [];
	for (const p of lib.photos) {
		let best = Infinity;
		for (const c of p.palette || []) {
			if (c.w < .05) continue;
			const v = lab(c.hex);
			best = Math.min(best, Math.hypot(v[0] - want[0], v[1] - want[1], v[2] - want[2]) - c.w * 10);
		}
		if (best < 16) out.push({
			p,
			best
		});
	}
	return out.sort((a, b) => a.best - b.best).map((x) => x.p);
}
const keyCache = new WeakMap();
function keysOf(p) {
	let k = keyCache.get(p);
	if (k) return k;
	k = new Set();
	for (const t of p.tags || []) k.add(`t:${t}`);
	for (const f of p.folderIds) k.add(`f:${f}`);
	let light = 0;
	let weight = 0;
	for (const c of p.palette || []) {
		if (c.w >= .14) k.add(`c:${colorName(c.hex)}`);
		light += hsl(rgbOf(c.hex))[2] * c.w;
		weight += c.w;
	}
	if (p.tone === "warm") k.add("m:warm");
	if (p.tone === "cool") k.add("m:cool");
	if (p.tone === "neutral") k.add("m:b&w");
	if (weight && light / weight < .24) k.add("m:dark");
	if (weight && light / weight > .68) k.add("m:bright");
	keyCache.set(p, k);
	return k;
}
const matches = (p, keys) => keys.every((k) => keysOf(p).has(k));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const RANK = {
	t: 0,
	f: 1,
	c: 2,
	m: 3
};
function chipsFor(photos, on, hereId) {
	const counts = new Map();
	for (const p of photos) for (const k of keysOf(p)) counts.set(k, (counts.get(k) || 0) + 1);
	const narrowed = photos.filter((p) => matches(p, on));
	const left = new Set(narrowed.flatMap((p) => [...keysOf(p)]));
	return [...counts.entries()].filter(([k]) => k !== `f:${hereId}` && (on.includes(k) || left.has(k))).filter(([k]) => k[0] !== "f" || lib.folders.some((f) => f.id === k.slice(2))).sort((a, b) => RANK[a[0][0]] - RANK[b[0][0]] || b[1] - a[1] || a[0].localeCompare(b[0])).map(([k]) => ({
		key: k,
		kind: k[0],
		label: k[0] === "f" ? lib.folders.find((f) => f.id === k.slice(2)).name : k === "m:b&w" ? "B&W" : cap(k.slice(2))
	}));
}

// components/toast.js
let toastTimer;
function toast(message, { action, ms = 3200 } = {}) {
	const el = document.getElementById("toast");
	el.innerHTML = `<span>${esc(message)}</span>${action ? `<button type="button" class="toast-action">${esc(action.label)}</button>` : ""}`;
	el.hidden = false;
	el.classList.remove("show");
	void el.offsetWidth;
	el.classList.add("show");
	if (action) {
		el.querySelector(".toast-action").addEventListener("click", () => {
			el.hidden = true;
			action.run();
		});
	}
	clearTimeout(toastTimer);
	toastTimer = setTimeout(() => {
		el.hidden = true;
	}, action ? ms + 2e3 : ms);
}
function hideToast() {
	clearTimeout(toastTimer);
	const el = document.getElementById("toast");
	if (el) el.hidden = true;
}

// components/undo.js
const stack = [];
const canUndo = () => stack.length > 0;
const changed = () => window.dispatchEvent(new Event("ref-undo"));
function remember(label, run) {
	stack.push({
		label,
		run
	});
	if (stack.length > 30) stack.shift();
	changed();
}
async function undoLast() {
	const last = stack.pop();
	if (!last) return false;
	try {
		await last.run();
		await refresh();
		toast(`Undid: ${last.label}`);
	} catch (e) {
		console.error(e);
		toast("Could not undo that");
	}
	changed();
	return true;
}

// data/templates.js
const SHAPES$1 = {
	"letter-portrait": {
		W: 8.5,
		H: 11,
		label: "Letter portrait (8.5 × 11)"
	},
	"wide-16x9": {
		W: 13.333,
		H: 7.5,
		label: "16:9 landscape"
	}
};
const G = .18;
function grid(cols, rows, b) {
	const w = (b.w - G * (cols - 1)) / cols;
	const h = (b.h - G * (rows - 1)) / rows;
	const out = [];
	for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push({
		x: b.x + c * (w + G),
		y: b.y + r * (h + G),
		w,
		h
	});
	return out;
}
const splitH = (b, frac) => {
	const w1 = (b.w - G) * frac;
	return [{
		...b,
		w: w1
	}, {
		...b,
		x: b.x + w1 + G,
		w: b.w - w1 - G
	}];
};
const splitV = (b, frac) => {
	const h1 = (b.h - G) * frac;
	return [{
		...b,
		h: h1
	}, {
		...b,
		y: b.y + h1 + G,
		h: b.h - h1 - G
	}];
};
function lp() {
	const W = 8.5;
	const H = 11;
	const M = .5;
	const textH = 1.05;
	const area = {
		x: M,
		y: M,
		w: W - 2 * M,
		h: H - 2 * M - textH - .15
	};
	const text = {
		x: M,
		y: H - M - textH,
		w: W - 2 * M,
		h: textH
	};
	const [top, bottom] = splitV(area, .62);
	const [left, right] = splitH(area, .6);
	return [
		{
			id: "lp-bleed",
			name: "Single, full bleed",
			slots: [{
				x: 0,
				y: 0,
				w: W,
				h: H
			}],
			text: {
				x: M,
				y: H - M - .6,
				w: 4.2,
				h: .6,
				overlay: true
			}
		},
		{
			id: "lp-single",
			name: "Single, framed",
			slots: [area],
			text
		},
		{
			id: "lp-two-stack",
			name: "Two, stacked",
			slots: grid(1, 2, area),
			text
		},
		{
			id: "lp-two-side",
			name: "Two, side by side",
			slots: grid(2, 1, area),
			text
		},
		{
			id: "lp-three-top",
			name: "Three, one dominant",
			slots: [top, ...grid(2, 1, bottom)],
			text
		},
		{
			id: "lp-three-left",
			name: "Three, tall left",
			slots: [left, ...grid(1, 2, right)],
			text
		},
		{
			id: "lp-grid-4",
			name: "Grid of four",
			slots: grid(2, 2, area),
			text
		},
		{
			id: "lp-five",
			name: "Five, one dominant",
			slots: [top, ...grid(4, 1, bottom)],
			text
		},
		{
			id: "lp-grid-6",
			name: "Grid of six",
			slots: grid(2, 3, area),
			text
		},
		{
			id: "lp-grid-9",
			name: "Grid of nine",
			slots: grid(3, 3, area),
			text
		},
		{
			id: "lp-cover",
			name: "Cover",
			cover: true,
			slots: [{
				x: M,
				y: M,
				w: W - 2 * M,
				h: 7.4
			}],
			text: {
				x: M,
				y: M + 7.4 + .4,
				w: W - 2 * M,
				h: H - 2 * M - 7.8
			}
		},
		{
			id: "lp-text",
			name: "One image, long text",
			slots: [{
				x: M,
				y: M,
				w: W - 2 * M,
				h: 5.6
			}],
			text: {
				x: M,
				y: M + 5.6 + .35,
				w: W - 2 * M,
				h: H - 2 * M - 5.95,
				size: 1.15
			}
		}
	].map((t) => norm(t, W, H));
}
function wide() {
	const W = 13.333;
	const H = 7.5;
	const M = .45;
	const textH = .8;
	const area = {
		x: M,
		y: M,
		w: W - 2 * M,
		h: H - 2 * M - textH - .12
	};
	const text = {
		x: M,
		y: H - M - textH,
		w: W - 2 * M,
		h: textH
	};
	const [left, right] = splitH(area, .62);
	const sideArea = {
		x: M,
		y: M,
		w: 8.9,
		h: H - 2 * M
	};
	const sideText = {
		x: M + 8.9 + .35,
		y: M,
		w: W - 2 * M - 8.9 - .35,
		h: H - 2 * M
	};
	return [
		{
			id: "w-bleed",
			name: "Single, full bleed",
			slots: [{
				x: 0,
				y: 0,
				w: W,
				h: H
			}],
			text: {
				x: M,
				y: H - M - .5,
				w: 5.5,
				h: .5,
				overlay: true
			}
		},
		{
			id: "w-cover",
			name: "Cover",
			cover: true,
			slots: [{
				x: 0,
				y: 0,
				w: 7.9,
				h: H
			}],
			text: {
				x: 7.9 + .6,
				y: M + 1.9,
				w: W - 7.9 - .6 - M,
				h: H - 2 * M - 1.9
			}
		},
		{
			id: "w-single-text",
			name: "Single, text beside",
			slots: [sideArea],
			text: sideText
		},
		{
			id: "w-two",
			name: "Two up",
			slots: grid(2, 1, area),
			text
		},
		{
			id: "w-three",
			name: "Three across",
			slots: grid(3, 1, area),
			text
		},
		{
			id: "w-three-left",
			name: "Three, one dominant",
			slots: [left, ...grid(1, 2, right)],
			text
		},
		{
			id: "w-grid-4",
			name: "Grid of four",
			slots: grid(2, 2, area),
			text
		},
		{
			id: "w-four-across",
			name: "Four across",
			slots: grid(4, 1, area),
			text
		},
		{
			id: "w-grid-6",
			name: "Grid of six",
			slots: grid(3, 2, area),
			text
		},
		{
			id: "w-grid-8",
			name: "Grid of eight",
			slots: grid(4, 2, area),
			text
		},
		{
			id: "w-grid-10",
			name: "Grid of ten",
			slots: grid(5, 2, area),
			text
		}
	].map((t) => norm(t, W, H));
}
function norm(t, W, H) {
	const f = (r) => ({
		...r,
		x: r.x / W,
		y: r.y / H,
		w: r.w / W,
		h: r.h / H
	});
	return {
		...t,
		slots: t.slots.map(f),
		text: f(t.text)
	};
}
const GUIDE_MIN = 4;
const GUIDE_MAX = 12;
const guideTemplateId = (shape, n, head) => `g-${shape === "wide-16x9" ? "w" : "lp"}-${n}${head ? "-head" : ""}`;
function guides(shape) {
	const { W, H } = SHAPES$1[shape], M = shape === "wide-16x9" ? .45 : .5, HEAD = .95;
	const out = [];
	for (let n = 4; n <= 12; n++) for (const head of [true, false]) {
		const area = {
			x: M,
			y: M + (head ? HEAD : 0),
			w: W - 2 * M,
			h: H - 2 * M - (head ? HEAD : 0)
		};
		let best = null;
		for (let cols = 1; cols <= n; cols++) {
			const rows = Math.ceil(n / cols);
			const cw = (area.w - G * (cols - 1)) / cols;
			const ch = (area.h - G * (rows - 1)) / rows;
			const cost = Math.abs(Math.log(cw / ch / .72)) + .35 * (cols * rows - n);
			if (!best || cost < best.cost) best = {
				cost,
				cols,
				rows
			};
		}
		out.push({
			id: guideTemplateId(shape, n, head),
			name: `Guide, ${n}${head ? " with heading" : ""}`,
			guide: true,
			slots: grid(best.cols, best.rows, area).slice(0, n),
			text: head ? {
				x: M,
				y: M,
				w: W - 2 * M,
				h: HEAD - .2
			} : {
				x: M,
				y: H - M - .5,
				w: 5,
				h: .5,
				overlay: true
			}
		});
	}
	return out.map((t) => norm(t, W, H));
}
const TEMPLATES = {
	"letter-portrait": [...lp(), ...guides("letter-portrait")],
	"wide-16x9": [...wide(), ...guides("wide-16x9")]
};
function templateFor(shape, id) {
	const list = TEMPLATES[shape] || [];
	return list.find((t) => t.id === id) || null;
}
function defaultTemplate(shape, n) {
	const list = TEMPLATES[shape].filter((t) => !t.guide && !t.cover);
	return list.find((t) => t.slots.length >= Math.max(1, n) && !t.id.endsWith("bleed")) || list.reduce((a, t) => t.slots.length > a.slots.length ? t : a);
}
const coverTemplateId = (shape) => shape === "wide-16x9" ? "w-cover" : "lp-cover";
function makeCover({ shape, name, categories = [] }, imageId = null) {
	const when = new Date().toLocaleDateString(undefined, {
		month: "long",
		year: "numeric"
	});
	return {
		template: coverTemplateId(shape),
		images: imageId ? [imageId] : [],
		cover: true,
		title: name || "Untitled board",
		titleSize: 3,
		text: [...categories.filter(Boolean), when].join(" · ")
	};
}
const STYLES = [
	{
		id: "grid",
		name: "Classic grid",
		blurb: "Even, uniform grids. Calm and easy to compare.",
		seq: {
			"letter-portrait": ["lp-grid-6", "lp-grid-4"],
			"wide-16x9": ["w-grid-6", "w-grid-8"]
		}
	},
	{
		id: "hero",
		name: "Hero + supporting",
		blurb: "One dominant image per page, with smaller ones around it.",
		seq: {
			"letter-portrait": [
				"lp-three-top",
				"lp-five",
				"lp-three-left"
			],
			"wide-16x9": [
				"w-three-left",
				"w-single-text",
				"w-three-left"
			]
		}
	},
	{
		id: "mosaic",
		name: "Varied mosaic",
		blurb: "Mixed sizes, every page different. Lively, magazine-like.",
		seq: {
			"letter-portrait": [
				"lp-three-left",
				"lp-grid-4",
				"lp-five",
				"lp-two-side",
				"lp-three-top",
				"lp-grid-9"
			],
			"wide-16x9": [
				"w-three-left",
				"w-grid-8",
				"w-two",
				"w-four-across",
				"w-grid-4",
				"w-three"
			]
		}
	},
	{
		id: "bleed",
		name: "Full-bleed story",
		blurb: "One image per page, edge to edge. For a slow, immersive sequence.",
		seq: {
			"letter-portrait": ["lp-bleed"],
			"wide-16x9": ["w-bleed"]
		}
	},
	{
		id: "editorial",
		name: "Editorial",
		blurb: "Images with room for words: notes, direction, references.",
		seq: {
			"letter-portrait": ["lp-text", "lp-single"],
			"wide-16x9": ["w-single-text", "w-two"]
		}
	},
	{
		id: "pairs",
		name: "Pairs",
		blurb: "Two images per page, for comparisons and before/after.",
		seq: {
			"letter-portrait": ["lp-two-stack", "lp-two-side"],
			"wide-16x9": ["w-two"]
		}
	}
];
const styleFor = (id) => STYLES.find((s) => s.id === id) || null;
function styleTemplate(shape, styleId, n) {
	const st = styleFor(styleId);
	const seq = st?.seq[shape];
	return seq?.length ? seq[n % seq.length] : null;
}
function paginate(shape, styleId, imageIds) {
	const pages = [];
	let i = 0;
	let n = 0;
	while (i < imageIds.length || !pages.length) {
		const tid = styleTemplate(shape, styleId, n) || defaultTemplate(shape, imageIds.length - i).id;
		const slots = templateFor(shape, tid).slots.length;
		pages.push({
			template: tid,
			images: imageIds.slice(i, i + slots)
		});
		i += slots;
		n++;
		if (n > 500) break;
	}
	return pages;
}

// components/board-page.js
const MAX_ZOOM = 6;
const TEXT_SIZE = .027;
const FONT = "\"Klee One\", \"Bradley Hand\", \"Noteworthy\", cursive";
const pct = (v) => `${(v * 100).toFixed(4)}%`;
const pageTemplate = (board, page) => templateFor(board.shape, page.template) || defaultTemplate(board.shape, page.images.filter(Boolean).length);
function applyCrop(img, im) {
	const [fx, fy] = im.focal || [.5, .5];
	const z = Math.max(1, Math.min(6, im.zoom || 1));
	img.style.objectPosition = `${fx * 100}% ${fy * 100}%`;
	img.style.transformOrigin = `${fx * 100}% ${fy * 100}%`;
	img.style.transform = z > 1 ? `scale(${z})` : "";
}
function pagePalette(page, t) {
	const seen = [];
	t.slots.forEach((s, i) => {
		const rec = page.images[i] && photoById(page.images[i].id);
		for (const c of rec?.palette || []) seen.push({
			hex: c.hex,
			w: c.w * s.w * s.h
		});
	});
	const rgb = (h) => {
		const n = parseInt(h.slice(1), 16);
		return [
			n >> 16 & 255,
			n >> 8 & 255,
			n & 255
		];
	};
	const near = (a, b) => {
		const x = rgb(a);
		const y = rgb(b);
		return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) < 42;
	};
	const picked = [];
	for (const c of seen.sort((a, b) => b.w - a.w)) {
		const same = picked.find((p) => near(p.hex, c.hex));
		if (same) same.w += c.w;
		else if (picked.length < 6) picked.push({ ...c });
	}
	return picked.sort((a, b) => b.w - a.w).map((c) => c.hex);
}
const textParts = (page) => [{
	kind: "title",
	text: page.title || "",
	scale: page.titleSize ?? 1.5,
	bold: true
}, {
	kind: "body",
	text: page.text || "",
	scale: page.textSize ?? 1,
	bold: false
}].filter((p) => p.text.trim());
async function renderPage(board, page, { selected = -1, editing = false, mainHint = false } = {}) {
	const shape = SHAPES$1[board.shape];
	const t = pageTemplate(board, page);
	const el = document.createElement("div");
	el.className = "page";
	el.style.aspectRatio = `${shape.W} / ${shape.H}`;
	await Promise.all(t.slots.map(async (s, i) => {
		const slot = document.createElement("div");
		slot.className = `slot${i === selected ? " sel" : ""}`;
		slot.dataset.index = i;
		Object.assign(slot.style, {
			left: pct(s.x),
			top: pct(s.y),
			width: pct(s.w),
			height: pct(s.h)
		});
		el.append(slot);
		const im = page.images[i];
		const rec = im && photoById(im.id);
		if (!rec) {
			if (editing) slot.innerHTML = "<span class=\"slot-hint\">Tap a photo below</span>";
			return;
		}
		const img = document.createElement("img");
		img.draggable = false;
		img.alt = "";
		img.src = s.w * s.h > .2 ? await fullUrl(im.id) || thumbUrl(rec) : thumbUrl(rec);
		applyCrop(img, im);
		slot.append(img);
		slot.classList.add("filled");
	}));
	const parts = textParts(page);
	const cols = page.palette ? pagePalette(page, t) : [];
	const hint = editing && mainHint && !parts.length;
	if (hint) parts.push({
		kind: "title empty",
		text: "Title",
		scale: page.titleSize ?? 1.5
	});
	if (parts.length || cols.length) {
		const tx = document.createElement("div");
		tx.className = `page-text${t.text.overlay ? " overlay" : ""}${page.textFill === false ? " nofill" : ""}`;
		tx.dataset.box = "main";
		if (t.text.size) tx.style.setProperty("--text-scale", t.text.size);
		const g = page.textBox;
		if (g && t.text.overlay) Object.assign(tx.style, {
			left: pct(g.x),
			top: pct(g.y),
			maxWidth: pct(g.w)
		});
		else if (g) Object.assign(tx.style, {
			left: pct(g.x),
			top: pct(g.y),
			width: pct(g.w),
			height: pct(g.h)
		});
		else if (t.text.overlay) Object.assign(tx.style, {
			left: pct(t.text.x),
			bottom: pct(1 - t.text.y - t.text.h),
			maxWidth: pct(t.text.w)
		});
		else Object.assign(tx.style, {
			left: pct(t.text.x),
			top: pct(t.text.y),
			width: pct(t.text.w),
			height: pct(t.text.h)
		});
		for (const p of parts) {
			const d = document.createElement("div");
			d.className = `pt-${p.kind}`;
			d.style.fontSize = `${p.scale}em`;
			d.textContent = p.text;
			tx.append(d);
		}
		if (cols.length) {
			const strip = document.createElement("div");
			strip.className = "pt-palette";
			for (const h of cols) {
				const sw = document.createElement("span");
				sw.style.background = h;
				strip.append(sw);
			}
			tx.append(strip);
		}
		el.append(tx);
	}
	(page.notes || []).forEach((n, i) => {
		if (!n.text?.trim() && !editing) return;
		const d = document.createElement("div");
		d.className = `page-note${n.text?.trim() ? "" : " empty"}`;
		d.dataset.box = String(i);
		Object.assign(d.style, {
			left: pct(n.x),
			top: pct(n.y),
			width: pct(n.w),
			height: pct(n.h)
		});
		d.style.setProperty("--note-scale", n.size || 1.6);
		d.textContent = n.text?.trim() ? n.text : "Text";
		el.append(d);
	});
	if (editing) el.classList.add("editing");
	return el;
}
function drawCover$1(ctx, img, x, y, w, h, fx, fy, zoom = 1) {
	const iw = img.naturalWidth;
	const ih = img.naturalHeight;
	const scale = Math.max(w / iw, h / ih) * Math.max(1, Math.min(6, zoom || 1));
	const sw = w / scale;
	const sh = h / scale;
	ctx.drawImage(img, (iw - sw) * fx, (ih - sh) * fy, sw, sh, x, y, w, h);
}
__name(drawCover$1, "drawCover");
function wrapLines(ctx, text, maxW) {
	const out = [];
	for (const para of String(text).split("\n")) {
		let line = "";
		for (const word of para.split(/(\s+)/)) {
			const test = line + word;
			if (ctx.measureText(test).width > maxW && line.trim()) {
				out.push(line.trimEnd());
				line = word.trimStart();
			} else line = test;
		}
		out.push(line);
	}
	return out;
}
async function pageToCanvas(board, page, pxWidth) {
	const shape = SHAPES$1[board.shape];
	const W = Math.round(pxWidth);
	const H = Math.round(pxWidth * shape.H / shape.W);
	const c = document.createElement("canvas");
	c.width = W;
	c.height = H;
	const ctx = c.getContext("2d");
	ctx.fillStyle = "#fff";
	ctx.fillRect(0, 0, W, H);
	ctx.imageSmoothingQuality = "high";
	const t = pageTemplate(board, page);
	for (let i = 0; i < t.slots.length; i++) {
		const s = t.slots[i];
		const im = page.images[i];
		if (!im || !photoById(im.id)) continue;
		const url = await fullUrl(im.id);
		if (!url) continue;
		const img = await loadImage$1(url);
		const [fx, fy] = im.focal || [.5, .5];
		drawCover$1(ctx, img, Math.round(s.x * W), Math.round(s.y * H), Math.round(s.w * W), Math.round(s.h * H), fx, fy, im.zoom);
		img.src = "";
	}
	try {
		await document.fonts.load("40px \"Klee One\"");
	} catch {}
	ctx.textBaseline = "top";
	for (const n of page.notes || []) {
		if (!n.text?.trim()) continue;
		const fs = W * TEXT_SIZE * (n.size || 1.6);
		ctx.font = `${fs}px ${FONT}`;
		ctx.fillStyle = "#000";
		wrapLines(ctx, n.text, n.w * W).forEach((l, k) => ctx.fillText(l, n.x * W, n.y * H + k * fs * 1.35));
	}
	const parts = textParts(page);
	const cols = page.palette ? pagePalette(page, t) : [];
	if (!parts.length && !cols.length) return c;
	const base = W * TEXT_SIZE * (t.text.size || 1);
	const pad = t.text.overlay ? base * .6 : 0;
	const box = page.textBox || t.text;
	const x = box.x * W;
	const y = box.y * H;
	const w = box.w * W;
	const lines = [];
	let total = 0;
	let widest = 0;
	parts.forEach((p, k) => {
		const fs = base * p.scale;
		const font = `${fs}px ${FONT}`;
		ctx.font = font;
		for (const l of wrapLines(ctx, p.text, w - pad * 2)) {
			lines.push({
				l,
				font,
				y: total
			});
			total += fs * 1.35;
			widest = Math.max(widest, ctx.measureText(l).width);
		}
		if (k < parts.length - 1) total += fs * .35;
	});
	const sq = base * 2.2;
	const gap = base * .35;
	const stripTop = total + (parts.length ? base * .6 : 0);
	if (cols.length) {
		total = stripTop + sq;
		widest = Math.max(widest, cols.length * sq + (cols.length - 1) * gap);
	}
	let top = y;
	if (t.text.overlay) {
		const boxH = total + pad * 2;
		top = page.textBox ? y : y + t.text.h * H - boxH;
		if (page.textFill !== false) {
			ctx.fillStyle = "#fff";
			ctx.fillRect(x, top, Math.min(w, widest + pad * 2), boxH);
		}
	}
	ctx.fillStyle = "#000";
	for (const ln of lines) {
		ctx.font = ln.font;
		ctx.fillText(ln.l, x + pad, top + pad + ln.y);
	}
	cols.forEach((h, k) => {
		ctx.fillStyle = h;
		ctx.fillRect(x + pad + k * (sq + gap), top + pad + stripTop, sq, sq);
	});
	return c;
}

// components/sheet.js
const X_ICON = "<svg class=\"x-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\" stroke-linecap=\"round\"><path d=\"M6 6l12 12M18 6L6 18\"/></svg>";
const open = [];
document.addEventListener("keydown", (e) => {
	if (e.key === "Escape" && open.length) {
		e.stopPropagation();
		open[open.length - 1].close();
	}
});
const sheetIsOpen = () => open.length > 0;
function openSheet({ title, body = "", className = "", onClose } = {}) {
	const opener = document.activeElement;
	const overlay = document.createElement("div");
	overlay.className = "sheet-overlay";
	overlay.style.zIndex = String(50 + open.length * 2);
	overlay.innerHTML = `
    <div class="sheet ${esc(className)}" role="dialog" aria-modal="true" aria-labelledby="sheetTitle${open.length}">
      <header class="sheet-header">
        <h2 id="sheetTitle${open.length}">${esc(title)}</h2>
        <button type="button" class="close-btn" data-close aria-label="Close">${X_ICON}</button>
      </header>
      <div class="sheet-body">${body}</div>
    </div>`;
	document.body.appendChild(overlay);
	document.body.classList.add("sheet-open");
	const el = overlay.querySelector(".sheet");
	const api = {
		el,
		overlay,
		body: el.querySelector(".sheet-body"),
		setTitle(t) {
			el.querySelector(".sheet-header h2").textContent = t;
		},
		close(result) {
			if (!overlay.isConnected) return;
			overlay.remove();
			open.splice(open.indexOf(api), 1);
			if (!open.length) document.body.classList.remove("sheet-open");
			if (opener && opener.isConnected && opener.focus) opener.focus({ preventScroll: true });
			if (onClose) onClose(result);
		}
	};
	open.push(api);
	const openedAt = performance.now();
	overlay.addEventListener("click", (e) => {
		if (performance.now() - openedAt < 450) {
			e.stopPropagation();
			e.preventDefault();
		}
	}, true);
	overlay.addEventListener("click", (e) => {
		if (e.target === overlay || e.target.closest("[data-close]")) api.close();
	});
	el.setAttribute("tabindex", "-1");
	el.focus({ preventScroll: true });
	return api;
}
function closeAllSheets() {
	while (open.length) open[open.length - 1].close();
}

// components/dialogs.js
function confirmSheet({ title, message = "", confirmLabel = "OK", cancelLabel = "Cancel", danger = false }) {
	return new Promise((resolve) => {
		let answer = false;
		const s = openSheet({
			title,
			className: "sheet-small",
			body: `
        ${message ? `<p class="sheet-message">${message}</p>` : ""}
        <div class="sheet-actions">
          <button type="button" class="btn secondary" data-no>${esc(cancelLabel)}</button>
          <button type="button" class="btn ${danger ? "danger" : "primary"}" data-yes>${esc(confirmLabel)}</button>
        </div>`,
			onClose: () => resolve(answer)
		});
		s.body.querySelector("[data-no]").addEventListener("click", () => s.close());
		s.body.querySelector("[data-yes]").addEventListener("click", () => {
			answer = true;
			s.close();
		});
	});
}
function choiceSheet({ title, message = "", options, footer = "" }) {
	return new Promise((resolve) => {
		let answer = null;
		const s = openSheet({
			title,
			className: "sheet-small",
			body: `
        ${message ? `<p class="sheet-message">${message}</p>` : ""}
        <div class="choice-list">
          ${options.map((o) => o.heading ? `<span class="field-label choice-heading">${esc(o.heading)}</span>` : `<button type="button" class="choice${o.current ? " current" : ""}${o.danger ? " is-danger" : ""}" data-key="${esc(o.key)}">
                ${o.icon || ""}<span class="choice-text"><span class="choice-label">${esc(o.label)}</span>
                ${o.detail ? `<span class="choice-detail">${esc(o.detail)}</span>` : ""}</span></button>`).join("")}
        </div>${footer}`,
			onClose: () => resolve(answer)
		});
		s.body.querySelectorAll(".choice").forEach((b) => b.addEventListener("click", () => {
			answer = b.dataset.key;
			s.close();
		}));
	});
}
function promptSheet({ title, label = "Name", value = "", confirmLabel = "Save", placeholder = "", allowEmpty = false }) {
	return new Promise((resolve) => {
		let answer = null;
		const s = openSheet({
			title,
			className: "sheet-small",
			body: `
        <form class="form" data-form>
          <label class="field">
            <span class="field-label">${esc(label)}</span>
            <input type="text" name="v" value="${esc(value)}" placeholder="${esc(placeholder)}" maxlength="80" autocomplete="off" enterkeyhint="done" />
          </label>
          <div class="sheet-actions">
            <button type="button" class="btn secondary" data-no>Cancel</button>
            <button type="submit" class="btn primary">${esc(confirmLabel)}</button>
          </div>
        </form>`,
			onClose: () => resolve(answer)
		});
		const form = s.body.querySelector("[data-form]");
		const input = form.querySelector("input");
		s.body.querySelector("[data-no]").addEventListener("click", () => s.close());
		form.addEventListener("submit", (e) => {
			e.preventDefault();
			const v = input.value.trim();
			if (!v && !allowEmpty) {
				input.focus();
				return;
			}
			answer = v;
			s.close();
		});
		setTimeout(() => {
			input.focus();
			input.select();
		}, 60);
	});
}

// components/shoot-picker.js
const line$1 = /* @__PURE__ */ __name((d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`, "line");
const PLUS$1 = line$1("<line x1=\"12\" y1=\"5\" x2=\"12\" y2=\"19\"/><line x1=\"5\" y1=\"12\" x2=\"19\" y2=\"12\"/>");
const CAMERA = line$1("<path d=\"M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z\"/><circle cx=\"12\" cy=\"13\" r=\"3.5\"/>");
function pickShoot({ boardName, shoots }) {
	return new Promise((resolve) => {
		let answer = null;
		let pick = shoots.find((x) => !x.has)?.id || null;
		const row = (x) => `
      <button type="button" class="send-shoot" role="radio" aria-checked="${x.id === pick}" data-shoot="${esc(x.id)}"${x.has ? " aria-disabled=\"true\"" : ""}>
        <span class="send-thumb">${x.photo ? `<img src="${esc(x.photo)}" alt="" />` : CAMERA}</span>
        <span class="send-words"><span class="send-name">${esc(x.name)}</span><span class="send-line">${esc(x.line)}</span></span>
        <span class="send-radio" aria-hidden="true"></span>
      </button>`;
		const s = openSheet({
			title: "Send to shoot",
			className: "send-sheet",
			body: `
        <p class="send-lead">"${esc(boardName)}" goes to the shoot and stays live until the shoot happens.</p>
        ${shoots.length ? "<span class=\"field-label choice-heading\">Upcoming in The Eye</span>" : "<p class=\"send-lead\">No shoots coming up in The Eye.</p>"}
        <div class="send-list" role="radiogroup" aria-label="Shoot">${shoots.map(row).join("")}</div>
        <button type="button" class="send-new" data-new><span class="send-plus">${PLUS$1}</span>New shoot from this board</button>
        ${shoots.length ? "<div class=\"sheet-actions one\"><button type=\"button\" class=\"btn primary\" data-send></button></div>" : ""}`,
			onClose: () => resolve(answer)
		});
		const send = s.body.querySelector("[data-send]");
		const paint = () => {
			s.body.querySelectorAll("[data-shoot]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.shoot === pick)));
			if (!send) return;
			const x = shoots.find((y) => y.id === pick);
			send.textContent = x ? `Send to ${x.name}` : "Send";
			send.disabled = !x;
		};
		paint();
		s.body.addEventListener("click", (e) => {
			const b = e.target.closest("[data-shoot]");
			if (b && !b.hasAttribute("aria-disabled")) {
				pick = b.dataset.shoot;
				paint();
				return;
			}
			if (e.target.closest("[data-new]")) {
				answer = "+new";
				s.close();
				return;
			}
			if (e.target.closest("[data-send]") && pick) {
				answer = pick;
				s.close();
			}
		});
	});
}

// data/sendshoot.js
const D = window.DFData;
const LONG_EDGE = 1600;
const COVER$1 = 800;
const BIG_FILE = 25 * 1048576;
const UPCOMING = [
	"prospect",
	"planning",
	"waiting_to_shoot",
	"rescheduled"
];
const STATUS = {
	prospect: "Prospect",
	planning: "Active planning",
	waiting_to_shoot: "Shoot ready",
	rescheduled: "Postponed"
};
function boardKey(b) {
	const str = JSON.stringify([
		b.name,
		b.shape,
		b.style,
		b.pages
	]);
	let h = 2166136261;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return `${(h >>> 0).toString(36)}.${str.length.toString(36)}`;
}
const photoIds = (board) => [...new Set(board.pages.flatMap((p) => p.images).filter((im) => im && photoById(im.id)).map((im) => im.id))];
const toPicture = async (c, q = .82) => {
	const b = await canvasToBlob(c, "image/jpeg", q);
	return {
		type: b.type,
		bytes: await b.arrayBuffer()
	};
};
function loadImage(src) {
	return new Promise((ok) => {
		const im = new Image();
		im.onload = () => ok(im);
		im.onerror = () => ok(null);
		im.src = src;
	});
}
function drawCrop(ctx, img, x, y, w, h) {
	const k = Math.max(w / img.naturalWidth, h / img.naturalHeight);
	const sw = w / k;
	const sh = h / k;
	ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}
async function drawCover(board, firstPage) {
	const imgs = (await Promise.all(photoIds(board).slice(0, 4).map((id) => loadImage(thumbUrl(photoById(id)))))).filter(Boolean);
	const c = document.createElement("canvas");
	c.width = c.height = COVER$1;
	const ctx = c.getContext("2d");
	ctx.fillStyle = "#fff";
	ctx.fillRect(0, 0, COVER$1, COVER$1);
	ctx.imageSmoothingQuality = "high";
	const g = 6;
	const h = COVER$1 / 2;
	if (!imgs.length) {
		const page = await loadImage(URL.createObjectURL(new Blob([firstPage.bytes], { type: firstPage.type })));
		if (page) drawCrop(ctx, page, 0, 0, COVER$1, COVER$1);
	} else if (imgs.length === 1) drawCrop(ctx, imgs[0], 0, 0, COVER$1, COVER$1);
	else if (imgs.length === 2) {
		drawCrop(ctx, imgs[0], 0, 0, h - g / 2, COVER$1);
		drawCrop(ctx, imgs[1], h + g / 2, 0, h - g / 2, COVER$1);
	} else if (imgs.length === 3) {
		drawCrop(ctx, imgs[0], 0, 0, h - g / 2, COVER$1);
		drawCrop(ctx, imgs[1], h + g / 2, 0, h - g / 2, h - g / 2);
		drawCrop(ctx, imgs[2], h + g / 2, h + g / 2, h - g / 2, h - g / 2);
	} else imgs.forEach((im, i) => drawCrop(ctx, im, i % 2 * (h + g / 2), Math.floor(i / 2) * (h + g / 2), h - g / 2, h - g / 2));
	return toPicture(c, .8);
}
async function drawBoard(board, say) {
	const s = SHAPES$1[board.shape] || SHAPES$1["letter-portrait"];
	const px = s.W >= s.H ? LONG_EDGE : Math.round(LONG_EDGE * s.W / s.H);
	const pages = [];
	for (let i = 0; i < board.pages.length; i++) {
		if (say) say(i);
		const c = await pageToCanvas(board, board.pages[i], px);
		pages.push(await toPicture(c));
		c.width = c.height = 0;
	}
	const cover = await drawCover(board, pages[0]);
	return {
		about: {
			id: board.id,
			name: board.name,
			pageCount: pages.length,
			photoCount: photoIds(board).length,
			updatedAt: board.updatedAt
		},
		pictures: {
			cover,
			pages
		}
	};
}
function eyeShoots() {
	const st = D.eyeState();
	if (!st || !Array.isArray(st.shoots)) return {
		shoots: [],
		mode: null
	};
	return {
		shoots: st.shoots.filter((s) => s && s.id),
		mode: st.titleDisplayMode
	};
}
const dateOf = (ymd) => {
	const [y, m, d] = String(ymd).split("-").map(Number);
	return new Date(y, m - 1, d);
};
function shootDay(ymd) {
	if (!ymd) return "Date not set";
	const d = dateOf(ymd);
	const opts = {
		weekday: "short",
		day: "numeric",
		month: "short"
	};
	if (d.getFullYear() !== new Date().getFullYear()) opts.year = "numeric";
	return d.toLocaleDateString("en-GB", opts).replace(",", "");
}
function upcomingShoots() {
	const { shoots, mode } = eyeShoots();
	return shoots.filter((s) => !s.archived && UPCOMING.includes(s.status || "prospect")).sort((a, b) => (a.date ? 0 : 1) - (b.date ? 0 : 1) || String(a.date || "").localeCompare(String(b.date || ""))).map((s) => {
		const name = D.eyeShootName(s, mode);
		const other = D.eyeShootName(s, mode === "title" ? "talent" : "title");
		return {
			id: s.id,
			name,
			other: other !== name ? other : "",
			date: s.date || "",
			status: STATUS[s.status || "prospect"],
			photo: s.projectPhoto || ""
		};
	});
}
async function boardShoots() {
	if (!D || !D.inSuite()) return {};
	const { shoots, mode } = eyeShoots();
	const byId = new Map(shoots.map((s) => [s.id, s]));
	const out = {};
	for (const l of await D.linksWhere({
		fromApp: "ref",
		toApp: "the-eye",
		type: "moodboard"
	})) {
		const s = byId.get(l.toId);
		if (s) (out[l.fromId] = out[l.fromId] || []).push(D.eyeShootName(s, mode));
	}
	return out;
}
async function sendToShoot(board) {
	if (!D) return;
	if (!D.inSuite()) {
		await sendAsFile(board);
		return;
	}
	const links = await D.linksWhere({
		fromApp: "ref",
		fromId: board.id,
		toApp: "the-eye",
		type: "moodboard"
	});
	const has = new Set(links.map((l) => l.toId));
	const shoots = upcomingShoots();
	const key = await pickShoot({
		boardName: board.name,
		shoots: shoots.map((s) => ({
			id: s.id,
			name: s.name,
			photo: s.photo,
			has: has.has(s.id),
			line: [
				shootDay(s.date),
				s.status,
				has.has(s.id) ? "Has this board" : ""
			].filter(Boolean).join(" · ")
		}))
	});
	if (!key) return;
	let drawn;
	try {
		drawn = await drawBoard(board, (i) => toast(`Getting page ${i + 1} of ${board.pages.length} ready`, { ms: 6e4 }));
	} catch (e) {
		console.error(e);
		toast("The board couldn't be sent");
		return;
	}
	hideToast();
	const link = {
		fromApp: "ref",
		fromId: board.id,
		toApp: "the-eye",
		toId: key === "+new" ? null : key,
		type: "moodboard",
		name: board.name,
		pageCount: drawn.about.pageCount,
		photoCount: drawn.about.photoCount,
		drawnAt: D.nowIso(),
		drawnOf: boardKey(board),
		frozenAt: null,
		importedAt: null,
		pending: key === "+new"
	};
	const saved = await D.saveLink(link, drawn.pictures);
	if (key === "+new") {
		location.href = D.notebookUrl("the-eye", { newShootFromBoard: saved.id });
		return;
	}
	const shoot = shoots.find((s) => s.id === key);
	const sh = openSheet({
		title: "Sent",
		className: "sheet-small",
		body: `<p class="sheet-message"><b>${esc(board.name)}</b> is on <b>${esc(shoot.name)}</b>${shoot.date ? ` (${esc(shootDay(shoot.date))})` : ""} in The Eye. It keeps up with your changes here until the shoot is shot.</p>
      <div class="sheet-actions"><button type="button" class="btn secondary" data-done>Done</button><button type="button" class="btn primary" data-open>Open the shoot</button></div>`
	});
	sh.body.querySelector("[data-done]").addEventListener("click", () => sh.close());
	sh.body.querySelector("[data-open]").addEventListener("click", () => {
		location.href = D.notebookUrl("the-eye", { shoot: key });
	});
}
async function sendAsFile(board) {
	let file;
	try {
		const drawn = await drawBoard(board, (i) => toast(`Getting page ${i + 1} of ${board.pages.length} ready`, { ms: 6e4 }));
		file = await D.boardFile(drawn.about, drawn.pictures);
	} catch (e) {
		console.error(e);
		toast("The board couldn't be made into a file");
		return;
	}
	hideToast();
	const mb = (file.size / 1048576).toFixed(1);
	if (file.size > BIG_FILE && !await confirmSheet({
		title: "This is a big file",
		message: `${mb} MB. AirDrop and Files take it; Messages and email may not.`,
		confirmLabel: "Share it anyway"
	})) return;
	const sh = openSheet({
		title: "Send to a shoot",
		className: "sheet-small",
		body: `<p class="sheet-message">${board.pages.length} ${board.pages.length === 1 ? "page" : "pages"}, ${mb} MB. In The Eye, open the shoot and tap <b>+ Import board</b>.</p><div class="sheet-actions one"><button type="button" class="btn primary" data-send>Save or share</button></div>`
	});
	sh.body.querySelector("[data-send]").addEventListener("click", async () => {
		const how = await D.saveFile(file);
		if (how !== "cancelled") sh.close();
	});
}
let running$1 = Promise.resolve();
function keepUp(boardId) {
	if (!D || !D.inSuite()) return running$1;
	running$1 = running$1.then(() => catchUp(boardId)).catch((e) => console.error(e));
	return running$1;
}
async function catchUp(boardId) {
	const live = (await D.linksWhere({
		fromApp: "ref",
		toApp: "the-eye",
		type: "moodboard"
	})).filter((l) => !l.frozenAt && !l.importedAt && !l.pending && (!boardId || l.fromId === boardId));
	const drawnFor = new Map();
	for (const l of live) {
		const board = await getBoard(l.fromId);
		if (!board || !board.pages.length) continue;
		if (l.drawnOf ? l.drawnOf === boardKey(board) : l.drawnAt && board.updatedAt <= l.drawnAt) continue;
		if (!drawnFor.has(board.id)) drawnFor.set(board.id, await drawBoard(board));
		const drawn = drawnFor.get(board.id);
		const now = await D.getLink(l.id);
		if (!now || now.frozenAt) continue;
		await D.saveLink({
			...now,
			name: board.name,
			pageCount: drawn.about.pageCount,
			photoCount: drawn.about.photoCount,
			drawnAt: D.nowIso(),
			drawnOf: boardKey(board)
		}, drawn.pictures);
	}
}

// components/icons.js
const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONS = {
	back: svg("<path d=\"M14.5 5l-7 7 7 7\"/>"),
	plus: svg("<path d=\"M12 5v14M5 12h14\"/>"),
	x: svg("<path d=\"M6 6l12 12M18 6L6 18\"/>"),
	expand: svg("<path d=\"M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5\"/>"),
	more: svg("<circle cx=\"5\" cy=\"12\" r=\"1.5\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"12\" cy=\"12\" r=\"1.5\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"19\" cy=\"12\" r=\"1.5\" fill=\"currentColor\" stroke=\"none\"/>"),
	boards: svg("<rect x=\"4\" y=\"3.5\" width=\"16\" height=\"17\"/><path d=\"M4 13.5h16M10 13.5v7\"/>"),
	folders: svg("<path d=\"M3.5 12.5v-8h8l9 9-8 8z\"/><circle cx=\"8\" cy=\"9\" r=\"1.2\"/>"),
	menu: svg("<path d=\"M4 7h16M4 12h16M4 17h16\"/>"),
	sun: svg("<circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4\"/>"),
	heart: svg("<path d=\"M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z\"/>"),
	heartOn: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z"/></svg>`,
	file: svg("<path d=\"M3.5 12.5v-8h8l9 9-8 8z\"/><path d=\"M12.5 11v5M10 13.5h5\"/>"),
	trash: svg("<path d=\"M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13\"/>"),
	layout: svg("<rect x=\"4\" y=\"3.5\" width=\"16\" height=\"17\"/><path d=\"M4 13.5h16M9.3 13.5v7M14.7 13.5v7\"/>"),
	text: svg("<path d=\"M5 7V4.5h14V7M12 4.5v15M9 19.5h6\"/>"),
	undo: svg("<path d=\"M8 5L4 9l4 4M4 9h10a5.5 5.5 0 0 1 0 11H9\"/>"),
	share: svg("<path d=\"M12 15V3M8 7l4-4 4 4M6 11H4.5v10h15V11H18\"/>"),
	download: svg("<path d=\"M12 4v11M7.5 10.5L12 15l4.5-4.5M5 20h14\"/>"),
	page: svg("<rect x=\"5\" y=\"3.5\" width=\"14\" height=\"17\"/><path d=\"M12 8.5v7M8.5 12h7\"/>")
};

// components/band.js
const ring = (label, attr, svg) => `<button type="button" class="ring-btn" ${attr} aria-label="${label}"><span>${svg}</span></button>`;
const line = (d) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const BOOKS = "<svg viewBox=\"0 0 24 24\" width=\"19\" height=\"19\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"3\" y=\"5\" width=\"4.5\" height=\"14\" rx=\"1\"/><rect x=\"9.5\" y=\"3\" width=\"4.5\" height=\"16\" rx=\"1\"/><path d=\"M16 6.2l3.6-1 3 12.6-3.6 1z\"/></svg>";
const MENU = line("<line x1=\"4\" y1=\"7\" x2=\"20\" y2=\"7\"/><line x1=\"4\" y1=\"12\" x2=\"20\" y2=\"12\"/><line x1=\"4\" y1=\"17\" x2=\"20\" y2=\"17\"/>");
const MARK = "<svg class=\"band-mark\" viewBox=\"0 0 80 40\" aria-hidden=\"true\"><g transform=\"translate(40 40) rotate(45) scale(1.41) translate(-20 -20)\"><rect width=\"20\" height=\"20\" class=\"mk-p\"/><rect x=\"20\" width=\"20\" height=\"20\" class=\"mk-w\"/><rect y=\"20\" width=\"20\" height=\"20\" class=\"mk-w\"/><rect x=\"20\" y=\"20\" width=\"20\" height=\"20\" class=\"mk-p\"/></g></svg>";
const bandDate = (d = new Date()) => d.toLocaleDateString("en-GB", {
	weekday: "short",
	day: "numeric",
	month: "short"
}).replace(",", "");
function bandHtml({ title, place }) {
	return `
    <header class="band">
      <h1 class="band-title">${esc(title)}</h1>
      <div class="band-btns">${ring("Back to your notebooks", "data-books", BOOKS)}${ring("Options", "data-app-menu", MENU)}</div>
      ${MARK}
      <p class="band-line"><b>${esc(place)}</b><span class="band-rule"></span><span class="band-date">${bandDate()}</span></p>
    </header>`;
}
function wireBand(view) {
	view.querySelector("[data-books]")?.addEventListener("click", () => {
		location.hash = "#/";
	});
}
const BACK = line("<polyline points=\"15 5 8 12 15 19\"/>");
const CLOSE = line("<line x1=\"6\" y1=\"6\" x2=\"18\" y2=\"18\"/><line x1=\"18\" y1=\"6\" x2=\"6\" y2=\"18\"/>");
const FULL = line("<polyline points=\"4 9 4 4 9 4\"/><polyline points=\"20 9 20 4 15 4\"/><polyline points=\"4 15 4 20 9 20\"/><polyline points=\"20 15 20 20 15 20\"/>");
const MORE = "<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" aria-hidden=\"true\"><circle cx=\"5\" cy=\"12\" r=\"1.6\" fill=\"currentColor\"/><circle cx=\"12\" cy=\"12\" r=\"1.6\" fill=\"currentColor\"/><circle cx=\"19\" cy=\"12\" r=\"1.6\" fill=\"currentColor\"/></svg>";
function shortBandHtml({ name, back = "", backAttr = "", backLabel = "Back", more = "", end = null }) {
	const left = backAttr ? ring(backLabel, backAttr, BACK) : `<a class="ring-btn" href="${back}" aria-label="${esc(backLabel)}"><span>${BACK}</span></a>`;
	const right = end ? ring(end.label, end.attr, end.svg) : more ? ring(more, "data-band-more", MORE) : "<span class=\"ring-btn\" aria-hidden=\"true\"></span>";
	return `
    <header class="band band-short">
      ${left}
      <p class="band-line"><b>${esc(name)}</b><span class="band-rule"></span></p>
      ${right}
    </header>`;
}

// pages/boards.js
async function boardsScreen(view) {
	const boards = await listBoards();
	const onShoots = await boardShoots().catch(() => ({}));
	const firstPhoto = (b) => b.pages.flatMap((p) => p.images).map((im) => im && photoById(im.id)).find(Boolean);
	const card = (b) => {
		const p = firstPhoto(b);
		const href = `#/board/${esc(b.id)}`;
		const flags = (onShoots[b.id] || []).map((s) => `<span class="flag">For ${esc(s)}</span>`).join("");
		return `
      <div class="board-card" data-b>
        <a class="card-cover" href="${href}" aria-label="Open ${esc(b.name)}">${p ? `<img src="${thumbUrl(p)}" alt="" />` : ""}</a>
        <div class="card-info">
          <a class="card-words" href="${href}">
            <span class="card-name">${esc(b.name)}</span>
            <span class="card-meta">${b.pages.length} ${b.pages.length === 1 ? "page" : "pages"} · ${esc(shortDate(b.updatedAt))}</span>
            ${flags ? `<span class="flags">${flags}</span>` : ""}
          </a>
          <button type="button" class="icon-btn card-more" data-more="${esc(b.id)}" aria-label="More for ${esc(b.name)}">${ICONS.more}</button>
        </div>
      </div>`;
	};
	view.innerHTML = `
    <div class="screen has-band">
      <div class="scroll">
        ${bandHtml({
		title: "Ref",
		place: "Mood boards"
	})}
        <div class="list-head"><h2>Boards <span>${boards.length}</span></h2><a class="list-act" href="#/new">${ICONS.plus}New board</a></div>
        <div class="list-rule"></div>
        ${boards.map(card).join("")}
        ${!lib.photos.length ? "<p class=\"note\">Start in <a href=\"#/folder/incoming\">Incoming</a>: bring in the photos you want to work with, then make a board from them.</p>" : ""}
      </div>
    </div>`;
	wireBand(view);
	view.querySelectorAll("[data-more]").forEach((btn) => btn.addEventListener("click", async () => {
		const b = boards.find((x) => x.id === btn.dataset.more);
		const key = await choiceSheet({
			title: b.name,
			options: [
				{
					key: "send",
					label: "Send to shoot"
				},
				{
					key: "rename",
					label: "Rename"
				},
				{
					key: "delete",
					label: "Delete",
					danger: true
				}
			]
		});
		if (key === "send") {
			await sendToShoot(b);
			if ((location.hash || "") === "#/boards") boardsScreen(view);
		} else if (key === "rename") {
			const name = await promptSheet({
				title: "Rename board",
				value: b.name
			});
			if (name) {
				await saveBoard({
					...b,
					name
				});
				boardsScreen(view);
				keepUp(b.id);
			}
		} else if (key === "delete") {
			if (await confirmSheet({
				title: "Delete this board?",
				message: `<b>${esc(b.name)}</b> will be gone. Its photos stay in the notebook.`,
				confirmLabel: "Delete",
				danger: true
			})) {
				await deleteBoard(b.id);
				boardsScreen(view);
				const back = async () => {
					await saveBoard(b);
				};
				remember("deleting a board", back);
				toast("Board deleted", { action: {
					label: "Undo",
					run: () => undoLast().then(() => boardsScreen(view))
				} });
			}
		}
	}));
}

// components/filing.js
const PLUS = "<svg viewBox=\"0 0 24 24\" width=\"24\" height=\"24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" aria-hidden=\"true\"><line x1=\"12\" y1=\"5\" x2=\"12\" y2=\"19\"/><line x1=\"5\" y1=\"12\" x2=\"19\" y2=\"12\"/></svg>";
async function newFolder() {
	const name = await promptSheet({
		title: "New tag",
		label: "Tag name",
		confirmLabel: "Make it"
	});
	if (!name) return null;
	const f = await saveFolder({ name });
	await refresh();
	return f;
}
async function relabel(p, tags) {
	const before = {
		tags: p.tags,
		tagsEdited: p.tagsEdited
	};
	await patchPhoto(p.id, {
		tags,
		tagsEdited: true
	});
	await refresh();
	remember("changing what is in it", () => patchPhoto(p.id, before));
}
async function changePhotos(photos, change, label) {
	const before = photos.map((p) => ({
		id: p.id,
		folderIds: p.folderIds,
		favorite: p.favorite
	}));
	await savePhotos(photos.map((p) => ({
		...p,
		...change(p)
	})));
	await refresh();
	remember(label, async () => {
		for (const b of before) await patchPhoto(b.id, {
			folderIds: b.folderIds,
			favorite: b.favorite
		});
	});
}
function fileSheet(ids) {
	return new Promise((resolve) => {
		const photos = ids.map(photoById).filter(Boolean);
		const inCount = (id) => photos.filter((p) => p.folderIds.includes(id)).length;
		const changes = new Map();
		let saved = false;
		const s = openSheet({
			title: photos.length === 1 ? "Tag this photo" : `Tag ${photos.length} photos`,
			onClose: () => resolve(saved)
		});
		const draw = () => {
			s.body.innerHTML = `
        ${lib.folders.length > 8 ? "<input class=\"find\" type=\"search\" placeholder=\"Find a folder\" autocomplete=\"off\" />" : ""}
        <div class="tick-list">
          ${lib.folders.map((f) => {
				const on = changes.has(f.id) ? changes.get(f.id) : inCount(f.id) === photos.length;
				return `<label class="tick" data-name="${esc(f.name.toLowerCase())}"><input type="checkbox" value="${esc(f.id)}"${on ? " checked" : ""} /><span>${esc(f.name)}</span></label>`;
			}).join("")}
          <button type="button" class="tick add" data-new>${PLUS}New tag</button>
        </div>
        <div class="sheet-actions one"><button type="button" class="btn primary" data-save>Done</button></div>`;
			s.body.querySelectorAll(".tick input").forEach((box) => {
				const n = inCount(box.value);
				box.indeterminate = !changes.has(box.value) && n > 0 && n < photos.length;
			});
			s.body.querySelector(".find")?.addEventListener("input", (e) => {
				const q = e.target.value.trim().toLowerCase();
				s.body.querySelectorAll(".tick[data-name]").forEach((t) => {
					t.hidden = !t.dataset.name.includes(q);
				});
			});
		};
		draw();
		s.body.addEventListener("change", (e) => {
			if (e.target.type === "checkbox") changes.set(e.target.value, e.target.checked);
		});
		s.body.addEventListener("click", async (e) => {
			if (e.target.closest("[data-new]")) {
				const f = await newFolder();
				if (f) {
					changes.set(f.id, true);
					draw();
				}
			} else if (e.target.closest("[data-save]")) {
				if (!changes.size) {
					s.close();
					return;
				}
				const apply = (p) => {
					const next = new Set(p.folderIds);
					for (const [id, on] of changes) {
						if (on) next.add(id);
						else next.delete(id);
					}
					return { folderIds: [...next] };
				};
				try {
					await changePhotos(photos, apply, "filing");
				} catch (err) {
					console.error(err);
					toast("Could not save that. Try once more.");
					return;
				}
				saved = true;
				s.close();
				const home = photos.every((p) => !apply(p).folderIds.length);
				toast(home ? "Back in Incoming" : "Filed");
			}
		});
	});
}

// pages/folders.js
const CHEVRON$1 = "<svg class=\"chevron\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><polyline points=\"9 5 16 12 9 19\"/></svg>";
const SEARCH = "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"11\" cy=\"11\" r=\"6.5\"/><line x1=\"16\" y1=\"16\" x2=\"20.5\" y2=\"20.5\"/></svg>";
function foldersScreen(view) {
	const row = (f, cls = "") => {
		const list = sortList(photosIn(f.id), "newest");
		return `
      <a class="tag-row ${cls}" href="#/folder/${esc(f.id)}" data-t data-name="${esc(f.name.toLowerCase())}">
        <span class="tag-thumb">${list[0] ? `<img src="${thumbUrl(list[0])}" alt="" loading="lazy" />` : ""}</span>
        <span class="tag-name">${esc(f.name)}</span>
        <span class="tag-count" aria-label="${list.length} ${list.length === 1 ? "photo" : "photos"}">${list.length.toLocaleString()}</span>
        ${CHEVRON$1}
      </a>`;
	};
	view.innerHTML = `
    <div class="screen has-band">
      <div class="scroll tag-rows">
        ${bandHtml({
		title: "Tags",
		place: "Ref"
	})}
        ${lib.folders.length > 8 ? `<label class="find-box">${SEARCH}<input class="find" type="search" placeholder="Find a tag" autocomplete="off" /></label>` : ""}
        <div class="list-rule tag-top"></div>
        ${row(folderById("incoming"), "special")}
        ${row(folderById("favorites"), "special")}
        ${row(folderById("all"), "special")}
        <div class="list-head tag-mine-head" data-mine><h2>Your tags <span>${lib.folders.length}</span></h2><button type="button" class="list-act" data-new>${ICONS.plus}New tag</button></div>
        <div class="list-rule" data-mine></div>
        ${lib.folders.map((f) => row(f, "mine")).join("")}
      </div>
    </div>`;
	const rows = [...view.querySelectorAll("[data-t]")];
	const make = async () => {
		if (await newFolder()) foldersScreen(view);
	};
	wireBand(view);
	view.querySelector("[data-new]")?.addEventListener("click", make);
	view.querySelector(".find")?.addEventListener("input", (e) => {
		const q = e.target.value.trim().toLowerCase();
		rows.forEach((r) => {
			r.hidden = !!q && !r.dataset.name.includes(q);
		});
	});
}

// data/tagger.js
const VERSION = 1;
const ON = "ref-notebook-tags";
const BUSY = "ref-notebook-tags-busy";
const get = (k) => {
	try {
		return localStorage.getItem(k);
	} catch {
		return null;
	}
};
const set = (k, v) => {
	try {
		localStorage.setItem(k, v);
	} catch {}
};
const del = (k) => {
	try {
		localStorage.removeItem(k);
	} catch {}
};
const isOff = () => get(ON) === "off";
const tagsOn = () => !isOff();
const scan = {
	state: "off",
	done: 0,
	total: 0,
	pct: 0
};
const emit = (tagged = false) => window.dispatchEvent(new CustomEvent("ref-scan", { detail: { tagged } }));
let worker = null;
let running = false;
let nextId = 1;
let runs = 0;
const waiting = new Map();
const skip = new Set();
const todo = () => lib.photos.filter((p) => p.tagsV !== VERSION && !p.tagsEdited && !skip.has(p.id));
function ask(type, bytes) {
	return new Promise((resolve, reject) => {
		const id = nextId++;
		waiting.set(id, {
			resolve,
			reject
		});
		worker.postMessage({
			id,
			type,
			bytes
		});
	});
}
const visible = () => new Promise((done) => {
	if (!document.hidden) return done();
	const on = () => {
		if (!document.hidden) {
			document.removeEventListener("visibilitychange", on);
			done();
		}
	};
	document.addEventListener("visibilitychange", on);
});
document.addEventListener("visibilitychange", () => {
	if (document.hidden) del(BUSY);
});
function fail(e) {
	console.error("Reading photos failed:", e);
	set(ON, "failed");
	del(BUSY);
	scan.state = "failed";
	worker?.terminate();
	worker = null;
	running = false;
	emit();
}
async function run() {
	if (running) return;
	if (!todo().length) {
		scan.state = "done";
		emit();
		return;
	}
	running = true;
	const me = ++runs;
	const stopped = () => isOff() || me !== runs;
	scan.state = "loading";
	scan.pct = 0;
	scan.done = 0;
	scan.total = todo().length;
	emit();
	try {
		set(BUSY, "1");
		worker = new Worker(new URL("../data/tagger-worker.js", import.meta.url), { type: "module" });
		worker.onerror = (e) => fail(e.message || "worker error");
		worker.onmessage = ({ data }) => {
			if (data.progress !== undefined) {
				scan.pct = data.progress;
				emit();
				return;
			}
			const w = waiting.get(data.id);
			if (!w) return;
			waiting.delete(data.id);
			if (data.ok) w.resolve(data);
			else w.reject(new Error(data.error));
		};
		await ask("load");
		scan.state = "working";
		emit();
		let first = true;
		for (let p = todo()[0]; p && !stopped(); p = todo()[0]) {
			await visible();
			try {
				const bytes = await getThumb(p.id);
				if (!bytes) {
					skip.add(p.id);
					continue;
				}
				const { tags } = await ask("look", bytes.slice(0));
				await patchPhoto(p.id, {
					tags,
					tagsV: VERSION
				});
				const live = lib.photos.find((x) => x.id === p.id);
				if (live) {
					const i = lib.photos.indexOf(live);
					lib.photos[i] = {
						...live,
						tags,
						tagsV: VERSION
					};
				}
			} catch (e) {
				if (stopped()) break;
				console.error(e);
				skip.add(p.id);
			}
			if (first) {
				del(BUSY);
				first = false;
			}
			scan.done++;
			scan.total = scan.done + todo().length;
			emit(scan.done % 4 === 0 || !todo().length);
		}
		if (stopped()) return;
		worker.terminate();
		worker = null;
		running = false;
		scan.state = "done";
		emit(true);
	} catch (e) {
		if (!stopped()) fail(e);
	}
}
function turnOnTags() {
	set(ON, "on");
	del(BUSY);
	run();
}
function turnOffTags() {
	set(ON, "off");
	del(BUSY);
	runs++;
	worker?.terminate();
	worker = null;
	for (const w of waiting.values()) w.reject(new Error("turned off"));
	waiting.clear();
	running = false;
	scan.state = "off";
	emit();
}
async function carryOn() {
	if (get(ON) === "failed") {
		scan.state = "failed";
		emit();
		return;
	}
	if (isOff()) {
		scan.state = "off";
		emit();
		return;
	}
	if (running) return;
	await refresh();
	if (get(BUSY)) {
		fail("the app closed while the model was loading");
		return;
	}
	run();
}

// pages/viewer.js
const X = "<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" aria-hidden=\"true\"><line x1=\"6\" y1=\"6\" x2=\"18\" y2=\"18\"/><line x1=\"18\" y1=\"6\" x2=\"6\" y2=\"18\"/></svg>";
const SMALL_X = "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><line x1=\"7\" y1=\"7\" x2=\"17\" y2=\"17\"/><line x1=\"17\" y1=\"7\" x2=\"7\" y2=\"17\"/></svg>";
const SMALL_PLUS = "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><line x1=\"12\" y1=\"6\" x2=\"12\" y2=\"18\"/><line x1=\"6\" y1=\"12\" x2=\"18\" y2=\"12\"/></svg>";
function openViewer(ids, start, onChange) {
	let list = [...ids];
	let i = start;
	let scale = 1;
	let tx = 0;
	let ty = 0;
	let changed = false;
	const el = document.createElement("div");
	el.className = "viewer";
	el.innerHTML = `
    <div class="v-top">
      <button type="button" class="ring-btn v-close" data-close aria-label="Close"><span>${X}</span></button>
      <span class="v-count"></span>
      <span class="v-top-gap" aria-hidden="true"></span>
    </div>
    <div class="v-stage"><img class="v-img" alt="" draggable="false" /></div>
    <div class="v-info">
      <p class="v-label">Tags</p>
      <div class="v-chips v-tags"></div>
      <p class="v-label">What is in it <span>(found by Ref, edit any)</span></p>
      <div class="v-chips v-found"></div>
      <div class="v-palette"></div>
      <p class="v-hint">Tap a color to see every photo with it</p>
    </div>
    <nav class="v-tools">
      <button type="button" data-v="fav"></button>
      <button type="button" data-v="file" aria-label="Tag this photo">${ICONS.file}<span aria-hidden="true">Tag</span></button>
      <button type="button" data-v="undo"${canUndo() ? "" : " disabled"}>${ICONS.undo}<span>Undo</span></button>
      <button type="button" data-v="delete">${ICONS.trash}<span>Delete</span></button>
    </nav>`;
	document.body.append(el);
	const img = el.querySelector(".v-img");
	const stage = el.querySelector(".v-stage");
	const place = (dx = 0) => {
		img.style.transform = `translate(${tx + dx}px, ${ty}px) scale(${scale})`;
	};
	async function show() {
		const p = photoById(list[i]);
		if (!p) return close();
		scale = 1;
		tx = 0;
		ty = 0;
		place();
		img.src = thumbUrl(p);
		const tags = p.folderIds.map((id) => lib.folders.find((f) => f.id === id)?.name).filter(Boolean);
		el.querySelector(".v-tags").innerHTML = (tags.length ? tags : ["Incoming"]).map((t) => `<span class="v-chip">${esc(t)}</span>`).join("");
		el.querySelector(".v-found").innerHTML = (p.tags || []).map((t) => `<button type="button" class="v-chip found" data-untag="${esc(t)}" aria-label="Remove ${esc(t)}">${esc(t)}${SMALL_X}</button>`).join("") + `<button type="button" class="v-chip add" data-addtag>${SMALL_PLUS}Add</button>`;
		el.querySelector(".v-count").textContent = `${i + 1} of ${list.length}`;
		el.querySelector(".v-palette").innerHTML = (p.palette || []).map((c) => `<button type="button" data-color="${esc(c.hex)}" aria-label="Photos with this color" style="background:${esc(c.hex)};flex:${c.w}"></button>`).join("");
		el.querySelector("[data-v=fav]").innerHTML = `${p.favorite ? ICONS.heartOn : ICONS.heart}<span>Favorite</span>`;
		el.querySelector("[data-v=fav]").setAttribute("aria-pressed", String(!!p.favorite));
		const want = list[i];
		const u = await fullUrl(want);
		if (u && want === list[i]) img.src = u;
	}
	const paintUndo = () => {
		el.querySelector("[data-v=undo]").disabled = !canUndo();
	};
	window.addEventListener("ref-undo", paintUndo);
	function close() {
		window.removeEventListener("ref-undo", paintUndo);
		el.remove();
		if (changed) onChange?.();
	}
	function again() {
		changed = true;
		list = list.filter((x) => photoById(x));
		if (!list.length) return close();
		i = Math.min(i, list.length - 1);
		show();
	}
	el.querySelector(".v-palette").addEventListener("click", (e) => {
		const b = e.target.closest("[data-color]");
		if (b) openColorPage(b.dataset.color, again);
	});
	el.querySelector("[data-close]").addEventListener("click", () => close());
	el.querySelector(".v-found").addEventListener("click", async (e) => {
		const p = photoById(list[i]);
		if (!p) return;
		const now = p.tags || [];
		let next = null;
		const gone = e.target.closest("[data-untag]");
		if (gone) next = now.filter((t) => t !== gone.dataset.untag);
		else if (e.target.closest("[data-addtag]")) {
			const word = (await promptSheet({
				title: "What is in it",
				label: "A word for something in the photo",
				confirmLabel: "Add"
			}))?.trim().toLowerCase();
			if (word && !now.includes(word)) next = [...now, word];
		}
		if (!next) return;
		try {
			await relabel(p, next);
			changed = true;
			show();
		} catch (err) {
			console.error(err);
			toast("Could not save that. Try once more.");
		}
	});
	const go = (d) => {
		const n = i + d;
		if (n >= 0 && n < list.length) {
			i = n;
			show();
		} else {
			place();
		}
	};
	el.querySelector(".v-tools").addEventListener("click", async (e) => {
		const b = e.target.closest("[data-v]");
		if (!b) return;
		const p = photoById(list[i]);
		if (b.dataset.v === "undo") {
			const gone = list[i];
			await undoLast();
			changed = true;
			if (photoById(gone)) show();
			else again();
		} else if (b.dataset.v === "fav") {
			try {
				await changePhotos([p], () => ({ favorite: !p.favorite }), "favorite");
				changed = true;
				show();
			} catch (err) {
				console.error(err);
				toast("Could not save that. Try once more.");
			}
		} else if (b.dataset.v === "file") {
			if (await fileSheet([p.id])) {
				changed = true;
				show();
			}
		} else if (b.dataset.v === "delete") {
			const ok = await confirmSheet({
				title: "Delete this photo?",
				message: "It leaves this notebook and any boards it's on. Ref Notebook keeps its own copy, so if it's no longer on your phone, this is the last one.",
				confirmLabel: "Delete",
				danger: true
			});
			if (!ok) return;
			const kept = await keepForUndo([p.id]);
			await deletePhotos([p.id]);
			await refresh();
			changed = true;
			remember("deleting", () => putBack(kept));
			list.splice(i, 1);
			if (!list.length) return close();
			i = Math.min(i, list.length - 1);
			show();
		}
	});
	const pts = new Map();
	let start0 = null;
	let pinch = null;
	let lastTap = 0;
	const clampPan = () => {
		const r = stage.getBoundingClientRect();
		const mx = r.width * (scale - 1) / 2;
		const my = r.height * (scale - 1) / 2;
		tx = clamp(tx, -mx, mx);
		ty = clamp(ty, -my, my);
	};
	stage.addEventListener("pointerdown", (e) => {
		try {
			stage.setPointerCapture(e.pointerId);
		} catch {}
		pts.set(e.pointerId, [e.clientX, e.clientY]);
		if (pts.size === 1) start0 = {
			x: e.clientX,
			y: e.clientY,
			tx,
			ty,
			t: performance.now()
		};
		if (pts.size === 2) {
			const [a, b] = [...pts.values()];
			pinch = {
				d: Math.hypot(a[0] - b[0], a[1] - b[1]),
				scale
			};
		}
	});
	stage.addEventListener("pointermove", (e) => {
		if (!pts.has(e.pointerId)) return;
		pts.set(e.pointerId, [e.clientX, e.clientY]);
		if (pts.size === 2 && pinch) {
			const [a, b] = [...pts.values()];
			scale = clamp(pinch.scale * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d, 1, 6);
			clampPan();
			place();
		} else if (pts.size === 1 && start0) {
			const dx = e.clientX - start0.x;
			const dy = e.clientY - start0.y;
			if (scale > 1) {
				tx = start0.tx + dx;
				ty = start0.ty + dy;
				clampPan();
				place();
			} else place(dx);
		}
	});
	const up = (e) => {
		if (!pts.has(e.pointerId)) return;
		pts.delete(e.pointerId);
		if (pts.size) {
			pinch = null;
			start0 = null;
			return;
		}
		if (!start0) {
			if (scale <= 1) {
				scale = 1;
				tx = ty = 0;
				place();
			}
			return;
		}
		const dx = e.clientX - start0.x;
		const dy = e.clientY - start0.y;
		const still = Math.hypot(dx, dy) < 10;
		if (still) {
			const now = performance.now();
			if (now - lastTap < 300) {
				scale = scale > 1 ? 1 : 2.5;
				tx = ty = 0;
				place();
				lastTap = 0;
			} else lastTap = now;
		} else if (scale === 1) {
			if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
			else place();
		}
		start0 = null;
	};
	stage.addEventListener("pointerup", up);
	stage.addEventListener("pointercancel", up);
	const key = (e) => {
		if (!el.isConnected) return document.removeEventListener("keydown", key);
		if (sheetIsOpen() || [...document.querySelectorAll(".viewer")].pop() !== el) return;
		if (e.key === "ArrowRight") go(1);
		else if (e.key === "ArrowLeft") go(-1);
		else if (e.key === "Escape") close();
	};
	document.addEventListener("keydown", key);
	show();
	return { close };
}
function openColorPage(hex, onBack) {
	const el = document.createElement("div");
	el.className = "viewer color-page";
	let list = [];
	const draw = () => {
		list = photosOfColor(hex);
		el.innerHTML = `
      <header class="band band-short">
        <button type="button" class="ring-btn" data-back aria-label="Back to the photo"><span>${BACK}</span></button>
        <p class="band-line"><span class="color-swatch" style="background:${esc(hex)}"></span><b class="count">${list.length} ${list.length === 1 ? "photo" : "photos"}</b></p>
        <span class="ring-btn" aria-hidden="true"></span>
      </header>
      <div class="scroll"><div class="grid">
        ${list.map((p, n) => `<button type="button" class="tile" data-i="${n}" aria-label="${esc(p.name)}"><img src="${thumbUrl(p)}" alt="" decoding="async" draggable="false" /></button>`).join("")}
      </div></div>`;
	};
	draw();
	document.body.append(el);
	el.addEventListener("click", (e) => {
		if (e.target.closest("[data-back]")) {
			el.remove();
			onBack();
			return;
		}
		const t = e.target.closest("[data-i]");
		if (t) openViewer(list.map((p) => p.id), +t.dataset.i, draw);
	});
}

// pages/folder.js
const SORT_ICON = "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" aria-hidden=\"true\"><line x1=\"4\" y1=\"7\" x2=\"20\" y2=\"7\"/><line x1=\"7\" y1=\"12\" x2=\"17\" y2=\"12\"/><line x1=\"10\" y1=\"17\" x2=\"14\" y2=\"17\"/></svg>";
const TICK$1 = "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><polyline points=\"5 12.5 10 17 19 7\"/></svg>";
const filterMemory = {};
let stopListening = null;
function folderScreen(view, id) {
	const folder = folderById(id);
	if (!folder) {
		location.hash = "#/folders";
		return;
	}
	const incoming = id === "incoming";
	let selecting = false;
	let current = [];
	const sel = new Set();
	const on = () => filterMemory[id] ||= [];
	const shown = () => sortList(photosIn(id).filter((p) => matches(p, on())), sortOf(id));
	async function bringIn(files) {
		if (!files.length) return;
		try {
			await navigator.storage?.persist?.();
		} catch {}
		const r = await importFiles(files, (n, total) => toast(`Bringing in ${n} of ${total}`, { ms: 6e4 }));
		await refresh();
		toast(r.failed.length ? `${r.photos.length} added, ${r.failed.length} could not be read` : `${r.photos.length} ${r.photos.length === 1 ? "photo" : "photos"} added`);
		draw();
		carryOn();
	}
	const openPhone = () => pickFiles().then(bringIn);
	const chipsHtml = () => chipsFor(photosIn(id), on(), id).map((c) => `<button type="button" class="chip kind-${c.kind}${on().includes(c.key) ? " on" : ""}" data-filter="${esc(c.key)}">${esc(c.label)}</button>`).join("");
	const gridHtml = () => {
		const total = photosIn(id).length;
		if (!total && incoming) return `
      <button type="button" class="open-phone" data-phone>
        <span class="big-plus">${ICONS.plus}</span>
        <span class="big-words">Open your phone's photos</span>
        <span class="row-meta">Pick the ones you want to use. They wait here until you file them.</span>
      </button>
      ${isIOS() && !isStandalone() ? "<p class=\"note\">Add this to your Home Screen to keep your photos safe. Safari can clear what sites have saved if they go unused.</p>" : ""}`;
		if (!total) return `<p class="note center">${id === "favorites" ? "Tap the heart on a photo to keep it here." : "Nothing here yet. File photos in from Incoming."}</p>`;
		return `<div class="grid">
      ${incoming && !selecting ? `<button type="button" class="tile add" data-phone aria-label="Add from your phone">${ICONS.plus}<span>Add from<br />your phone</span></button>` : ""}
      ${current.map((p, i) => `<button type="button" class="tile${sel.has(p.id) ? " sel" : ""}" data-i="${i}" aria-label="${esc(p.name)}"><img src="${thumbUrl(p)}" alt="" decoding="async" draggable="false" />${p.favorite ? `<span class="fav">${ICONS.heartOn}</span>` : ""}${selecting ? `<span class="tile-tick">${TICK$1}</span>` : ""}</button>`).join("")}
    </div>`;
	};
	const countText = () => {
		const total = photosIn(id).length;
		const sort = SORTS.find((s) => s.key === sortOf(id)).label;
		return `${current.length === total ? "" : `${current.length} of `}${total} ${total === 1 ? "photo" : "photos"} · ${sort}`;
	};
	const scanHtml = () => {
		if (!photosIn(id).length) return "";
		if (scan.state === "failed") return "<button type=\"button\" class=\"scan-btn\" data-scan>This phone couldn't read them. Try again</button>";
		const line = (pct, words) => `<p class="scan-line"><span class="scan-bar" aria-hidden="true"><span style="width:${Math.max(0, Math.min(100, pct))}%"></span></span>${words}</p>`;
		if (scan.state === "loading") return line(scan.pct, `Getting ready, ${scan.pct}%`);
		if (scan.state === "working") return line(scan.total ? scan.done / scan.total * 100 : 0, `Looking at your photos, ${scan.done} of ${scan.total}`);
		return "";
	};
	function paintList() {
		current = shown();
		const chips = view.querySelector(".chips");
		if (chips) {
			const x = chips.scrollLeft;
			chips.innerHTML = chipsHtml();
			chips.scrollLeft = x;
		}
		const scroll = view.querySelector(".scroll");
		if (scroll) {
			const y = scroll.scrollTop;
			scroll.innerHTML = gridHtml();
			scroll.scrollTop = y;
		}
		const count = view.querySelector(".count");
		if (count) count.textContent = countText();
	}
	const paintScan = () => {
		const el = view.querySelector(".scan");
		if (el) {
			el.innerHTML = scanHtml();
			el.hidden = !el.innerHTML;
		}
	};
	const paintUndo = () => {
		const b = view.querySelector("[data-undo]");
		if (b) b.disabled = !canUndo();
	};
	function draw() {
		const oldScroll = view.querySelector(".scroll")?.scrollTop || 0;
		const oldChips = view.querySelector(".chips")?.scrollLeft || 0;
		const stay = view.querySelector(".screen")?.dataset.folder === id;
		current = shown();
		const empty = !photosIn(id).length;
		view.innerHTML = `
      <div class="screen in-tag${stay ? " still" : ""}" data-folder="${esc(id)}">
        ${shortBandHtml({
			name: folder.name,
			back: "#/folders",
			backLabel: "Back to tags",
			more: isSpecial(id) ? "" : "Tag options"
		})}
        ${empty ? "" : `
          <div class="bar">
            <span class="count">${countText()}</span>
            <span class="bar-btns">
              <button type="button" class="bar-icon" data-sort aria-label="Sort">${SORT_ICON}</button>
              <button type="button" class="bar-icon" data-undo aria-label="Undo"${canUndo() ? "" : " disabled"}>${ICONS.undo}</button>
              <button type="button" class="bar-text" data-select>${selecting ? "Done" : "Select"}</button>
            </span>
          </div>
          <div class="chips">${chipsHtml()}</div>`}
        <div class="scan"${scanHtml() ? "" : " hidden"}>${scanHtml()}</div>
        <div class="scroll photos">${gridHtml()}</div>
        ${selecting ? `
          <nav class="tools" aria-label="Selection">
            <span class="sel-count">${sel.size} picked</span>
            <button type="button" class="tool" data-act="file"${sel.size ? "" : " disabled"}>${ICONS.file}<span>Tag</span></button>
            <button type="button" class="tool" data-act="fav"${sel.size ? "" : " disabled"}>${ICONS.heart}<span>Favorite</span></button>
            <button type="button" class="tool" data-act="delete"${sel.size ? "" : " disabled"}>${ICONS.trash}<span>Delete</span></button>
          </nav>` : ""}
      </div>`;
		const sc = view.querySelector(".scroll");
		if (sc) sc.scrollTop = oldScroll;
		const ch = view.querySelector(".chips");
		if (ch) ch.scrollLeft = oldChips;
		wire();
	}
	function wire() {
		view.querySelector("[data-select]")?.addEventListener("click", () => {
			selecting = !selecting;
			sel.clear();
			draw();
		});
		view.querySelector("[data-undo]")?.addEventListener("click", async () => {
			await undoLast();
			draw();
		});
		view.querySelector("[data-sort]")?.addEventListener("click", async () => {
			const key = await choiceSheet({
				title: "Sort by",
				options: SORTS.map((s) => ({
					key: s.key,
					label: s.label,
					current: s.key === sortOf(id)
				}))
			});
			if (key) {
				setSort(id, key);
				paintList();
			}
		});
		view.querySelector(".chips")?.addEventListener("click", (e) => {
			const b = e.target.closest("[data-filter]");
			if (!b) return;
			const k = b.dataset.filter;
			if (!k) filterMemory[id] = [];
			else filterMemory[id] = on().includes(k) ? on().filter((x) => x !== k) : [...on(), k];
			paintList();
		});
		view.querySelector(".scan")?.addEventListener("click", (e) => {
			if (e.target.closest("[data-scan]")) turnOnTags();
		});
		view.querySelector(".scroll")?.addEventListener("click", (e) => {
			if (e.target.closest("[data-phone]")) {
				openPhone();
				return;
			}
			const t = e.target.closest("[data-i]");
			if (!t) return;
			const p = current[+t.dataset.i];
			if (selecting) {
				if (sel.has(p.id)) sel.delete(p.id);
				else sel.add(p.id);
				t.classList.toggle("sel", sel.has(p.id));
				view.querySelector(".sel-count").textContent = `${sel.size} picked`;
				view.querySelectorAll("[data-act]").forEach((b) => {
					b.disabled = !sel.size;
				});
			} else openViewer(current.map((x) => x.id), +t.dataset.i, draw);
		});
		view.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", async () => {
			const ids = [...sel];
			try {
				if (b.dataset.act === "file") {
					if (!await fileSheet(ids)) return;
				} else if (b.dataset.act === "fav") {
					const turnOn = !ids.every((x) => photoById(x).favorite);
					await changePhotos(ids.map(photoById), () => ({ favorite: turnOn }), "favorites");
				} else {
					const ok = await confirmSheet({
						title: `Delete ${ids.length} ${ids.length === 1 ? "photo" : "photos"}?`,
						message: "They leave this notebook and any boards they're on. Ref Notebook keeps its own copies, so any that are no longer on your phone will be gone for good.",
						confirmLabel: "Delete",
						danger: true
					});
					if (!ok) return;
					const kept = await keepForUndo(ids);
					await deletePhotos(ids);
					await refresh();
					remember("deleting", () => putBack(kept));
				}
			} catch (err) {
				console.error(err);
				toast("Could not save that. Try once more.");
				return;
			}
			selecting = false;
			sel.clear();
			draw();
		}));
		view.querySelector("[data-band-more]")?.addEventListener("click", async () => {
			const key = await choiceSheet({
				title: folder.name,
				options: [{
					key: "rename",
					label: "Rename"
				}, {
					key: "delete",
					label: "Delete tag",
					danger: true
				}]
			});
			if (key === "rename") {
				const name = await promptSheet({
					title: "Rename tag",
					value: folder.name
				});
				if (name) {
					await saveFolder({
						...folder,
						name
					});
					await refresh();
					folder.name = name;
					draw();
				}
			} else if (key === "delete") {
				if (await confirmSheet({
					title: "Delete this tag?",
					message: `<b>${esc(folder.name)}</b> will be gone. Its photos stay in the notebook.`,
					confirmLabel: "Delete",
					danger: true
				})) {
					const had = photosIn(id).map((p) => p.id);
					const copy = { ...folder };
					await deleteFolder(id);
					await refresh();
					remember("deleting a tag", () => restoreFolder(copy, had));
					location.hash = "#/folders";
					toast("Tag deleted", { action: {
						label: "Undo",
						run: () => undoLast().then(() => {
							location.hash = `#/folder/${encodeURIComponent(id)}`;
						})
					} });
				}
			}
		});
	}
	stopListening?.();
	const onScan = (e) => {
		paintScan();
		if (e.detail?.tagged && !selecting) paintList();
	};
	window.addEventListener("ref-scan", onScan);
	window.addEventListener("ref-undo", paintUndo);
	stopListening = () => {
		window.removeEventListener("ref-scan", onScan);
		window.removeEventListener("ref-undo", paintUndo);
	};
	draw();
}

// components/textsize.js
const KEYS = {
	title: {
		size: "titleSize",
		def: 1.5
	},
	body: {
		size: "textSize",
		def: 1
	},
	note: {
		size: "size",
		def: 1.6
	}
};
const TEXT_STEPS = [
	.6,
	.75,
	.9,
	1,
	1.15,
	1.3,
	1.5,
	1.75,
	2,
	2.5,
	3,
	4
];
const STORE = "ref-notebook-text-defaults";
function savedDefaults() {
	try {
		return JSON.parse(localStorage.getItem(STORE)) || {};
	} catch {
		return {};
	}
}
const defaultSize = (kind) => Number(savedDefaults()[kind]) > 0 ? Number(savedDefaults()[kind]) : 1;
const sizeOf = (page, kind) => (page?.[KEYS[kind].size] ?? KEYS[kind].def) / KEYS[kind].def;
function setSize(page, kind, rel) {
	const k = KEYS[kind];
	const v = Math.round(rel * k.def * 1e3) / 1e3;
	if (v === k.def) delete page[k.size];
	else page[k.size] = v;
}
function stepSize(page, kind, dir) {
	const cur = sizeOf(page, kind);
	const on = TEXT_STEPS.findIndex((v) => Math.abs(v - cur) < 1e-7);
	const above = TEXT_STEPS.filter((v) => v < cur).length;
	const k = on !== -1 ? on + dir : dir > 0 ? above + dir - 1 : above + dir;
	setSize(page, kind, TEXT_STEPS[Math.max(0, Math.min(TEXT_STEPS.length - 1, k))]);
}
const useDefault = (page, kind) => setSize(page, kind, defaultSize(kind));
function saveDefault(page, kind) {
	const all = savedDefaults();
	all[kind] = sizeOf(page, kind);
	try {
		localStorage.setItem(STORE, JSON.stringify(all));
	} catch {}
}
const isDefault = (page, kind) => Math.abs(sizeOf(page, kind) - defaultSize(kind)) < 1e-6;
function withTextDefaults(page) {
	for (const kind of ["title", "body"]) {
		if (page[KEYS[kind].size] !== undefined) continue;
		const d = defaultSize(kind);
		if (d !== 1) setSize(page, kind, d);
	}
	return page;
}

// components/option-card.js
function cardHtml({ attr, on, picture = "", name, blurb = "" }) {
	return `<button type="button" class="opt-card" role="radio" aria-checked="${on}" ${attr}>${picture}<span class="opt-name">${esc(name)}</span>${blurb ? `<span class="opt-blurb">${esc(blurb)}</span>` : ""}</button>`;
}

// pages/newboard-parts.js
function marksHtml(names, at) {
	const last = names.length - 1;
	const marks = names.map((_, i) => {
		const line = i ? `<span class="guide-line${i <= at ? " inked" : ""}"></span>` : "";
		return `${line}<span class="guide-mark${i === at ? " now" : i < at ? " done" : ""}"></span>`;
	}).join("");
	const words = names.map((n, i) => {
		const where = i === 0 ? "left:0" : i === last ? "right:0" : `left:${i / last * 100}%`;
		return `<span class="guide-mark-name${i <= at ? " reached" : ""}${i && i < last ? " mid" : ""}" style="${where}">${esc(n)}</span>`;
	}).join("");
	return `<div class="guide-marks" role="img" aria-label="Step ${at + 1} of ${names.length}: ${esc(names[at])}"><div class="guide-mark-row">${marks}</div><div class="guide-mark-names" aria-hidden="true">${words}</div></div>`;
}
function miniPage(shape, tid, w) {
	const s = SHAPES$1[shape];
	const t = templateFor(shape, tid);
	const W = 60;
	const H = 60 * s.H / s.W;
	const r = (t?.slots || []).map((b) => `<rect x="${b.x * W}" y="${b.y * H}" width="${b.w * W}" height="${b.h * H}"/>`).join("");
	return `<svg viewBox="0 0 ${W} ${H}" style="width:${w}px" aria-hidden="true"><rect class="paper-r" width="${W}" height="${H}"/>${r}</svg>`;
}

// pages/intro.js
const SEEN = "ref-notebook-intro-seen";
const CARDS = [
	["Bring your photos in", "Open Incoming and pick photos from your phone. Tag them to sort them, then make mood boards from your tags."],
	["It keeps its own copy", "Everything you add is saved inside Ref Notebook. Once a photo is in, you can delete it from your phone’s Photos to free up space, and it stays here in your boards and tags."],
	["Good to know", "Photos are kept at a size made for boards and PDFs, not the full original. Your photos are saved inside the app, not in Photos. If you delete Ref Notebook from your home screen, its photos are deleted with it."]
];
const introSeen = () => {
	try {
		return localStorage.getItem(SEEN) === "1";
	} catch {
		return true;
	}
};
function openIntro() {
	let at = 0;
	const s = openSheet({
		title: CARDS[0][0],
		className: "sheet-small intro",
		onClose: () => {
			try {
				localStorage.setItem(SEEN, "1");
			} catch {}
		}
	});
	const draw = () => {
		const last = at === CARDS.length - 1;
		s.setTitle(CARDS[at][0]);
		s.body.innerHTML = `
      <p class="sheet-message">${CARDS[at][1]}</p>
      <span class="wz-dots intro-dots" aria-hidden="true">${CARDS.map((_, i) => `<i class="${i === at ? "on" : ""}"></i>`).join("")}</span>
      <div class="sheet-actions${at ? "" : " one"}">
        ${at ? "<button type=\"button\" class=\"btn secondary\" data-back>Back</button>" : ""}
        <button type="button" class="btn primary" data-next>${last ? "Got it" : "Next"}</button>
      </div>`;
	};
	s.body.addEventListener("click", (e) => {
		if (e.target.closest("[data-back]")) {
			at--;
			draw();
		} else if (e.target.closest("[data-next]")) {
			if (at === CARDS.length - 1) s.close();
			else {
				at++;
				draw();
			}
		}
	});
	draw();
	return s;
}

// pages/options-backup.js
function saveBackup() {
	const D = window.DFData;
	let open = true;
	let made = null;
	const s = openSheet({
		title: "Save a backup",
		className: "sheet-small",
		body: "<p class=\"sheet-message\" data-msg>Putting it together</p>",
		onClose: () => {
			open = false;
			if (made) made.done();
		}
	});
	const msg = s.body.querySelector("[data-msg]");
	D.zipBackup({
		app: "ref",
		databases: ["ref-notebook"],
		extra: { book: document.documentElement.dataset.book || "" },
		filename: `ref-backup-${D.todayStr()}.zip`,
		onProgress: (f) => {
			if (open) msg.textContent = `Putting it together, ${Math.floor(f * 100)}%`;
		}
	}).then((m) => {
		made = m;
		if (!open) {
			if (m) m.done();
			return;
		}
		if (!m) {
			msg.textContent = "There is nothing to back up yet.";
			return;
		}
		const steps = D.backupSteps(m);
		msg.textContent = steps.note;
		msg.insertAdjacentHTML("afterend", `<button type="button" class="btn secondary opt-wide" data-save>${steps.label}</button>`);
		const btn = s.body.querySelector("[data-save]");
		btn.addEventListener("click", async () => {
			try {
				if (!await steps.tap()) {
					btn.textContent = steps.label;
					return;
				}
				s.close();
				toast("Backup saved");
			} catch (err) {
				console.error(err);
				toast(err.message || "The backup wasn't saved.");
			}
		});
	}).catch((err) => {
		console.error(err);
		if (open) msg.textContent = err.message || "The backup couldn't be made.";
	});
}
async function restoreBackup(close, BOOK_KEY) {
	const D = window.DFData;
	const files = await D.pickFiles(".zip,application/zip,.json,application/json");
	if (!files.length) return;
	if (!await confirmSheet({
		title: "Restore backup",
		message: "Everything in ref now is swapped for what's in the file.",
		confirmLabel: "Restore",
		danger: true
	})) return;
	toast("Restoring the backup", { ms: 6e5 });
	try {
		const r = await D.isZipFile(files[0]) ? await D.restoreZip(files, { databases: ["ref-notebook"] }) : await D.importDb(files[0], "ref-notebook", {
			app: "ref",
			replace: true
		});
		const book = r.extra && r.extra.book || (r.local ? await r.local(BOOK_KEY) : null);
		if (book) {
			try {
				localStorage.setItem(BOOK_KEY, book);
			} catch {}
		}
		close();
		toast("Backup restored");
		setTimeout(() => location.reload(), 700);
	} catch (err) {
		console.error(err);
		toast(err.message || "That backup couldn't be restored.");
	}
}

// components/stickers.js
const ASPECT = {
	circle: 1,
	square: 1,
	rect: 2 / 3
};
const COVER = 1e3 / 1360;
const book$2 = document.getElementById("book");
const flap = document.getElementById("stickerFlap");
const front = () => book$2.querySelector(".nb-front");
const urls = new Map();
const urlOf = (s) => {
	if (!urls.has(s.id)) urls.set(s.id, URL.createObjectURL(new Blob([s.bytes], { type: "image/jpeg" })));
	return urls.get(s.id);
};
let stickers = [];
function randomFrom(seed) {
	let a = seed >>> 0;
	return () => {
		a = a + 1831565813 >>> 0;
		let t = Math.imul(a ^ a >>> 15, 1 | a);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
const seedOf = (s) => s.seed ?? [...String(s.id)].reduce((h, c) => Math.imul(h, 31) + c.charCodeAt(0) | 0, 7);
const creases = new Map();
function creaseArt(seed, aspect) {
	const key = `${seed}:${aspect}`;
	if (creases.has(key)) return creases.get(key);
	const W = 480;
	const H = Math.round(W * aspect);
	const r = randomFrom(seed);
	const c = document.createElement("canvas");
	c.width = W;
	c.height = H;
	const g = c.getContext("2d");
	for (let i = 0, n = 3 + Math.floor(r() * 3); i < n; i++) {
		const side = Math.floor(r() * 4);
		const along = r();
		const x = side === 0 ? 0 : side === 1 ? W : along * W;
		const y = side === 2 ? 0 : side === 3 ? H : along * H;
		const rad = W * (.18 + r() * .24);
		const shade = g.createRadialGradient(x, y, 0, x, y, rad);
		shade.addColorStop(0, `rgba(58, 50, 42, ${.13 + r() * .12})`);
		shade.addColorStop(1, "rgba(58, 50, 42, 0)");
		g.fillStyle = shade;
		g.fillRect(0, 0, W, H);
	}
	const edgePoint = (side) => {
		const t = .1 + r() * .8;
		return [
			[t * W, 0],
			[W, t * H],
			[t * W, H],
			[0, t * H]
		][side];
	};
	const soft = (path, width, blur, color, dx, dy) => {
		const far = W * 4;
		g.save();
		g.lineCap = "round";
		g.lineJoin = "round";
		g.lineWidth = width;
		g.strokeStyle = "#000";
		g.shadowColor = color;
		g.shadowBlur = blur;
		g.shadowOffsetX = far + dx;
		g.shadowOffsetY = dy;
		g.translate(-far, 0);
		path();
		g.stroke();
		g.restore();
	};
	for (let i = 0, n = 2 + Math.floor(r() * 3); i < n; i++) {
		const side = Math.floor(r() * 4);
		const [ax, ay] = edgePoint(side);
		let [bx, by] = edgePoint((side + 1 + Math.floor(r() * 3)) % 4);
		const reach = .45 + r() * .55;
		bx = ax + (bx - ax) * reach;
		by = ay + (by - ay) * reach;
		const len = Math.hypot(bx - ax, by - ay);
		const nx = -(by - ay) / len;
		const ny = (bx - ax) / len;
		const bow = (r() - .5) * len * .18;
		const cx = (ax + bx) / 2 + nx * bow;
		const cy = (ay + by) / 2 + ny * bow;
		const path = () => {
			g.beginPath();
			g.moveTo(ax, ay);
			g.quadraticCurveTo(cx, cy, bx, by);
		};
		const depth = .55 + r() * .45;
		const spread = W * (.035 + r() * .035);
		const sx = nx > 0 ? 1 : -1;
		const sy = ny > 0 ? 1 : -1;
		const ox = sx * Math.abs(nx);
		const oy = sy * Math.abs(ny);
		soft(path, spread * .9, spread * 1.3, `rgba(52, 44, 38, ${.16 * depth})`, ox * spread * .6, oy * spread * .6);
		soft(path, spread * .35, spread * .6, `rgba(52, 44, 38, ${.1 * depth})`, ox * spread * .25, oy * spread * .25);
		soft(path, spread * .7, spread * 1.1, `rgba(255, 255, 255, ${.32 * depth})`, -ox * spread * .55, -oy * spread * .55);
	}
	const url = c.toDataURL("image/png");
	c.width = c.height = 0;
	creases.set(key, url);
	return url;
}
function make(s, src, onFlap) {
	const el = document.createElement("div");
	el.className = `sticker ${s.shape}`;
	el.innerHTML = `<img class="photo" alt="" draggable="false" /><img class="crease" alt="" draggable="false" />${onFlap ? "" : "<i class=\"fold r\" hidden></i><i class=\"fold l\" hidden></i><i class=\"fold t\" hidden></i><i class=\"fold b\" hidden></i>"}`;
	el.querySelector(".photo").src = src;
	el.querySelector(".crease").src = creaseArt(seedOf(s), ASPECT[s.shape]);
	(onFlap ? placeOnFlap : place$1)(el, s);
	return el;
}
const BEND = .075;
function place$1(el, s) {
	el.style.left = `${s.x * 100}%`;
	el.style.top = `${s.y * 100}%`;
	el.style.width = `${s.size * 100}%`;
	const w = s.size;
	const h = s.size * ASPECT[s.shape] * COVER;
	const left = s.x - w / 2;
	const top = s.y - h / 2;
	const across = BEND / w * 100;
	const down = BEND * COVER / h * 100;
	const set = (cls, on, css) => {
		const f = el.querySelector(`.fold.${cls}`);
		f.hidden = !on;
		if (on) Object.assign(f.style, css);
	};
	set("r", left + w > 1, {
		left: `${(1 - left) / w * 100 - across}%`,
		width: `${across}%`
	});
	set("l", left < 0, {
		left: `${-left / w * 100}%`,
		width: `${across}%`
	});
	set("b", top + h > 1, {
		top: `${(1 - top) / h * 100 - down}%`,
		height: `${down}%`
	});
	set("t", top < 0, {
		top: `${-top / h * 100}%`,
		height: `${down}%`
	});
}
__name(place$1, "place");
const placeOnFlap = (el, s) => {
	el.style.left = `calc(${s.x - 1} * var(--W))`;
	el.style.top = `calc(${s.y} * var(--H))`;
	el.style.width = `calc(${s.size} * var(--W))`;
};
async function paintStickers() {
	stickers = (await listStickers()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
	front().querySelectorAll(".sticker").forEach((e) => e.remove());
	flap.innerHTML = "";
	for (const s of stickers) {
		front().append(make(s, urlOf(s)));
		flap.append(make(s, urlOf(s), true));
	}
	window.dispatchEvent(new Event("ref-stickers"));
}
const stickerThumb = urlOf;
async function removeSticker(s) {
	await deleteSticker(s.id);
	await paintStickers();
	toast("Sticker removed", { action: {
		label: "Undo",
		run: async () => {
			await saveSticker(s);
			await paintStickers();
		}
	} });
}
const twoFingers = (list) => list.length > 1 ? Math.hypot(list[0][0] - list[1][0], list[0][1] - list[1][1]) : 0;
const middle = (list) => [list.reduce((a, p) => a + p[0], 0) / list.length, list.reduce((a, p) => a + p[1], 0) / list.length];
async function cropSticker(file, shape) {
	const url = URL.createObjectURL(file);
	let img;
	try {
		img = await loadImage$1(url);
	} finally {
		URL.revokeObjectURL(url);
	}
	const fit = Math.min(1, 2e3 / Math.max(img.naturalWidth, img.naturalHeight));
	const pic = document.createElement("canvas");
	pic.width = Math.round(img.naturalWidth * fit);
	pic.height = Math.round(img.naturalHeight * fit);
	const pg = pic.getContext("2d", { colorSpace: "srgb" });
	pg.imageSmoothingQuality = "high";
	pg.drawImage(img, 0, 0, pic.width, pic.height);
	return new Promise((resolve) => {
		const layer = document.createElement("div");
		layer.className = "crop-layer";
		layer.innerHTML = `
      <div class="crop-win ${shape}"></div>
      <div class="place-foot">
        <button type="button" class="btn secondary" data-no>Cancel</button>
        <button type="button" class="btn primary" data-yes>Okay</button>
      </div>`;
		layer.prepend(pic);
		document.body.append(layer);
		const box = layer.getBoundingClientRect();
		const footTop = layer.querySelector(".place-foot").getBoundingClientRect().top - box.top;
		const ww = Math.min(box.width - 48, (footTop - 48) / ASPECT[shape], 420);
		const wh = ww * ASPECT[shape];
		const wx = (box.width - ww) / 2;
		const wy = (footTop - wh) / 2;
		Object.assign(layer.querySelector(".crop-win").style, {
			left: `${wx}px`,
			top: `${wy}px`,
			width: `${ww}px`,
			height: `${wh}px`
		});
		const least = Math.max(ww / pic.width, wh / pic.height);
		let k = least;
		let tx = wx + (ww - pic.width * k) / 2;
		let ty = wy + (wh - pic.height * k) / 2;
		const draw = () => {
			k = Math.min(least * 6, Math.max(least, k));
			tx = Math.min(wx, Math.max(wx + ww - pic.width * k, tx));
			ty = Math.min(wy, Math.max(wy + wh - pic.height * k, ty));
			pic.style.transform = `translate(${tx}px, ${ty}px) scale(${k})`;
		};
		draw();
		const pts = new Map();
		let grab = null;
		const start = () => {
			const list = [...pts.values()], [mx, my] = middle(list);
			grab = {
				mx,
				my,
				k,
				px: (mx - tx) / k,
				py: (my - ty) / k,
				d: twoFingers(list)
			};
		};
		layer.addEventListener("pointerdown", (e) => {
			if (e.target.closest(".place-foot")) return;
			try {
				layer.setPointerCapture(e.pointerId);
			} catch {}
			pts.set(e.pointerId, [e.clientX, e.clientY]);
			start();
		});
		layer.addEventListener("pointermove", (e) => {
			if (!pts.has(e.pointerId)) return;
			pts.set(e.pointerId, [e.clientX, e.clientY]);
			const list = [...pts.values()], [mx, my] = middle(list);
			if (list.length > 1 && grab.d) k = grab.k * (twoFingers(list) / grab.d);
			tx = mx - grab.px * k;
			ty = my - grab.py * k;
			draw();
		});
		const up = (e) => {
			if (pts.delete(e.pointerId) && pts.size) start();
		};
		layer.addEventListener("pointerup", up);
		layer.addEventListener("pointercancel", up);
		layer.addEventListener("wheel", (e) => {
			e.preventDefault();
			k *= e.deltaY < 0 ? 1.05 : .95;
			draw();
		}, { passive: false });
		const finish = (bytes) => {
			layer.remove();
			pic.width = pic.height = 0;
			resolve(bytes);
		};
		layer.querySelector("[data-no]").addEventListener("click", () => finish(null));
		layer.querySelector("[data-yes]").addEventListener("click", async () => {
			const sw = ww / k;
			const sh = wh / k;
			const out = Math.min(1e3, Math.round(sw));
			const c = document.createElement("canvas");
			c.width = out;
			c.height = Math.round(out * ASPECT[shape]);
			const g = c.getContext("2d", { colorSpace: "srgb" });
			g.imageSmoothingQuality = "high";
			g.drawImage(pic, (wx - tx) / k, (wy - ty) / k, sw, sh, 0, 0, c.width, c.height);
			const bytes = await (await canvasToBlob(c, "image/jpeg", .88)).arrayBuffer();
			c.width = c.height = 0;
			finish(bytes);
		});
	});
}
function placeSticker(shape, bytes) {
	const draft = {
		shape,
		x: .5,
		y: .42,
		size: .44,
		seed: Math.floor(Math.random() * 2 ** 31)
	};
	const url = URL.createObjectURL(new Blob([bytes], { type: "image/jpeg" }));
	book$2.className = "nb closed placing";
	const el = make(draft, url);
	const onFlap = make(draft, url, true);
	front().append(el);
	flap.append(onFlap);
	const layer = document.createElement("div");
	layer.className = "place-layer";
	layer.innerHTML = `
    <div class="place-foot">
      <button type="button" class="btn secondary" data-no>Cancel</button>
      <button type="button" class="btn primary" data-yes>Okay</button>
    </div>`;
	document.body.append(layer);
	const clampAll = () => {
		draft.size = Math.min(1.5, Math.max(.12, draft.size));
		draft.x = Math.min(1.1, Math.max(-.1, draft.x));
		draft.y = Math.min(1.1, Math.max(-.1, draft.y));
		place$1(el, draft);
		placeOnFlap(onFlap, draft);
	};
	const pts = new Map();
	let grab = null;
	const start = () => {
		const list = [...pts.values()], [mx, my] = middle(list);
		grab = {
			w: front().offsetWidth,
			h: front().offsetHeight,
			mx,
			my,
			x: draft.x,
			y: draft.y,
			size: draft.size,
			d: twoFingers(list)
		};
	};
	layer.addEventListener("pointerdown", (e) => {
		if (e.target.closest(".place-foot")) return;
		try {
			layer.setPointerCapture(e.pointerId);
		} catch {}
		pts.set(e.pointerId, [e.clientX, e.clientY]);
		start();
	});
	layer.addEventListener("pointermove", (e) => {
		if (!pts.has(e.pointerId)) return;
		pts.set(e.pointerId, [e.clientX, e.clientY]);
		const list = [...pts.values()], [mx, my] = middle(list);
		draft.x = grab.x + (mx - grab.mx) / grab.w;
		draft.y = grab.y + (my - grab.my) / grab.h;
		if (list.length > 1 && grab.d) draft.size = grab.size * (twoFingers(list) / grab.d);
		clampAll();
	});
	const up = (e) => {
		if (pts.delete(e.pointerId) && pts.size) start();
	};
	layer.addEventListener("pointerup", up);
	layer.addEventListener("pointercancel", up);
	layer.addEventListener("wheel", (e) => {
		e.preventDefault();
		draft.size *= e.deltaY < 0 ? 1.05 : .95;
		clampAll();
	}, { passive: false });
	const done = () => {
		layer.remove();
		book$2.className = "nb closed";
		URL.revokeObjectURL(url);
	};
	layer.querySelector("[data-no]").addEventListener("click", () => {
		el.remove();
		onFlap.remove();
		done();
	});
	layer.querySelector("[data-yes]").addEventListener("click", async () => {
		try {
			await saveSticker({
				...draft,
				bytes
			});
			done();
			await paintStickers();
		} catch (err) {
			console.error(err);
			toast("Could not save that. Try once more.");
		}
	});
}

// pages/options-stickers.js
function stickerSheet(options) {
	const s = openSheet({
		title: "Stickers",
		body: `
      <div class="sticker-kinds">
        <button type="button" class="sticker-kind" data-shape="circle"><span class="shape circle"></span><span>Circle</span></button>
        <button type="button" class="sticker-kind" data-shape="square"><span class="shape square"></span><span>Square</span></button>
        <button type="button" class="sticker-kind" data-shape="rect"><span class="shape rect"></span><span>Rectangle</span></button>
      </div>
      ${stickers.length ? "<button type=\"button\" class=\"btn secondary opt-wide\" data-remove>Remove sticker</button>" : ""}`
	});
	s.body.addEventListener("click", (e) => {
		const k = e.target.closest("[data-shape]");
		if (k) {
			pickFiles(false).then(async ([file]) => {
				if (!file) return;
				try {
					s.close();
					options.close();
					const bytes = await cropSticker(file, k.dataset.shape);
					if (bytes) placeSticker(k.dataset.shape, bytes);
				} catch (err) {
					console.error(err);
					toast("Could not read that photo");
				}
			});
		}
		if (e.target.closest("[data-remove]")) {
			s.close();
			removeSheet();
		}
	});
}
function removeSheet() {
	const s = openSheet({
		title: "Remove sticker",
		onClose: () => window.removeEventListener("ref-stickers", draw)
	});
	function draw() {
		if (!stickers.length) {
			s.close();
			return;
		}
		s.body.innerHTML = `<div class="sticker-list">${[...stickers].reverse().map((st) => `<button type="button" class="sticker-pick ${esc(st.shape)}" data-id="${esc(st.id)}" aria-label="Remove this sticker"><img src="${stickerThumb(st)}" alt="" /></button>`).join("")}</div>`;
	}
	window.addEventListener("ref-stickers", draw);
	draw();
	s.body.addEventListener("click", async (e) => {
		const b = e.target.closest("[data-id]");
		if (!b) return;
		await removeSticker(stickers.find((x) => x.id === b.dataset.id));
	});
}

// pages/options.js
const BOOK_KEY = "ref-notebook-book";
const START_KEY = "ref-notebook-start";
const SHAPE_KEY = "ref-notebook-shape";
const COLORS = [
	["mango", "Mango"],
	["orange", "Orange"],
	["berry", "Berry"],
	["fern", "Fern"],
	["ocean", "Ocean"],
	["leaf", "Leaf"],
	["ink", "Black"]
];
const SHAPES = [["letter-portrait", "Tall"], ["wide-16x9", "Wide"]];
const read = (k) => {
	try {
		return localStorage.getItem(k);
	} catch {
		return null;
	}
};
const write = (k, v) => {
	try {
		localStorage.setItem(k, v);
	} catch {}
};
const startsOpen = () => read(START_KEY) === "open";
const startPage = () => startsOpen() ? "#/boards" : "";
const defaultShape = () => SHAPES.some(([k]) => k === read("ref-notebook-shape")) ? read(SHAPE_KEY) : "letter-portrait";
const TICK = "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><polyline points=\"5 12.5 10 17 19 7\"/></svg>";
const CHEVRON = "<svg class=\"opt-chevron\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><polyline points=\"9 5 16 12 9 19\"/></svg>";
const recognizeLine = () => tagsOn() ? "On. Runs on this phone, nothing is uploaded" : "Off. New photos are not looked at";
function useBook(name) {
	document.documentElement.dataset.book = name;
	write(BOOK_KEY, name);
}
function colorsHtml() {
	const now = document.documentElement.dataset.book || "ocean";
	return `<div class="opt-colors" role="radiogroup" aria-label="Notebook color">${COLORS.map(([key, name]) => `
    <button type="button" class="opt-color" role="radio" data-color="${key}" aria-checked="${key === now}">
      <span class="opt-swatch" data-swatch="${key}"><span class="opt-swatch-line"></span><span class="opt-swatch-sun"></span>${key === now ? `<span class="opt-swatch-tick">${TICK}</span>` : ""}</span>
      <span class="opt-color-name">${name}</span>
    </button>`).join("")}</div>`;
}
const row = (attr, name, sub = "") => `<button type="button" class="opt-row" ${attr}><span class="opt-row-words"><span class="opt-row-name">${name}</span>${sub ? `<span class="opt-row-sub">${sub}</span>` : ""}</span>${CHEVRON}</button>`;
function openOptions() {
	const alone = !window.DF_SUITE;
	const shapeName = () => SHAPES.find(([k]) => k === defaultShape())[1];
	const s = openSheet({
		title: "Options",
		className: "opt-sheet",
		body: `
      <span class="opt-label">Notebook color</span>
      <div data-colors>${colorsHtml()}</div>
      ${alone ? `<span class="opt-label opt-gap">Always start</span>
      <div class="opt-seg">
        <button type="button" data-start="shut"${startsOpen() ? "" : " class=\"on\""}>In the notebook</button>
        <button type="button" data-start="open"${startsOpen() ? " class=\"on\"" : ""}>On the first page</button>
      </div>` : ""}
      <span class="opt-label opt-gap">Boards</span>
      <div class="opt-rows">
        ${row("data-shape-row", "Default page size", `<span data-shape-now>${shapeName()}</span>`)}
        <label class="opt-row opt-switch-row"><span class="opt-row-words"><span class="opt-row-name">Recognize what's in new photos</span><span class="opt-row-sub" data-recognize-line>${recognizeLine()}</span></span>
          <input type="checkbox" class="switch" role="switch" data-recognize${tagsOn() ? " checked" : ""} /></label>
      </div>
      ${alone ? `<span class="opt-label opt-gap">Cover</span><div class="opt-rows">${row("data-stickers", "Stickers")}</div>` : ""}
      <span class="opt-label opt-gap">Backups</span>
      <div class="opt-rows">${row("data-save-backup", "Save a backup")}${row("data-restore-backup", "Restore a backup")}</div>
      <span class="opt-label opt-gap">Help</span>
      <div class="opt-rows">${row("data-intro", "How it works")}</div>`
	});
	s.body.addEventListener("click", async (e) => {
		const c = e.target.closest("[data-color]");
		if (c) {
			useBook(c.dataset.color);
			s.body.querySelector("[data-colors]").innerHTML = colorsHtml();
			return;
		}
		const st = e.target.closest("[data-start]");
		if (st) {
			write(START_KEY, st.dataset.start);
			s.body.querySelectorAll("[data-start]").forEach((b) => b.classList.toggle("on", b === st));
		}
		if (e.target.closest("[data-shape-row]")) {
			const key = await choiceSheet({
				title: "Default page size",
				options: SHAPES.map(([k, name]) => ({
					key: k,
					label: name,
					current: k === defaultShape(),
					detail: k === "wide-16x9" ? "For screens and sharing" : "For printing and bringing to a shoot"
				}))
			});
			if (key) {
				write(SHAPE_KEY, key);
				s.body.querySelector("[data-shape-now]").textContent = shapeName();
			}
		}
		if (e.target.closest("[data-stickers]")) stickerSheet(s);
		if (e.target.closest("[data-intro]")) {
			s.close();
			openIntro();
		}
		if (e.target.closest("[data-save-backup]")) saveBackup();
		if (e.target.closest("[data-restore-backup]")) restoreBackup(() => s.close(), BOOK_KEY);
	});
	s.body.querySelector("[data-recognize]").addEventListener("change", (e) => {
		if (e.target.checked) turnOnTags();
		else turnOffTags();
		s.body.querySelector("[data-recognize-line]").textContent = recognizeLine();
	});
}

// pages/newboard.js
const SHAPE_INFO = {
	"letter-portrait": {
		name: "Tall",
		blurb: "For printing and bringing to a shoot."
	},
	"wide-16x9": {
		name: "Wide",
		blurb: "For screens and sharing."
	}
};
const ORDERS = [
	[
		"newest",
		"Newest first",
		"The photos you brought in most lately."
	],
	[
		"oldest",
		"Oldest first",
		"From the first ones you saved."
	],
	[
		"fav",
		"Favorites first",
		"Hearted photos lead each section."
	],
	[
		"random",
		"Random",
		"A fresh mix each time."
	]
];
function newBoardScreen(view) {
	const W = {
		step: 0,
		name: "",
		shape: defaultShape(),
		style: "mosaic",
		cover: false,
		start: "blank",
		blankPages: 3,
		sections: [{
			name: "",
			tags: [],
			all: true
		}],
		order: "newest",
		perSection: 3
	};
	const sources = [
		SPECIAL[0],
		SPECIAL[1],
		...lib.folders
	];
	const nameOf = (id) => sources.find((f) => f.id === id)?.name || "";
	const flow = () => W.start === "fill" ? [
		stepName,
		stepLayout,
		stepStart,
		stepPhotos
	] : [
		stepName,
		stepLayout,
		stepStart
	];
	const TITLES = new Map([
		[stepName, "Name and page size"],
		[stepLayout, "Layout"],
		[stepStart, "Start"],
		[stepPhotos, "Which photos"]
	]);
	const MARKS = new Map([
		[stepName, "Name"],
		[stepLayout, "Layout"],
		[stepStart, "Start"],
		[stepPhotos, "Photos"]
	]);
	const ASKS = new Map([
		[stepName, "What is it called, and how big are its pages?"],
		[stepLayout, "How should the pages look? You can change any page later."],
		[stepStart, "Empty pages to fill yourself, or pages filled from your tags?"],
		[stepPhotos, "Which photos come first, and how many pages each section gets."]
	]);
	const photosOf = (sec) => {
		if (!sec.tags.length) return [];
		if (sec.all && sec.tags.length > 1) return lib.photos.filter((p) => sec.tags.every((t) => photosIn(t).includes(p)));
		return [...new Set(sec.tags.flatMap((t) => photosIn(t)))];
	};
	const titleOf = (sec, i) => sec.name.trim() || sec.tags.map(nameOf).join(" · ") || `Section ${i + 1}`;
	function draw(keepScroll = false) {
		const top = keepScroll ? view.querySelector(".form-page")?.scrollTop || 0 : 0;
		const steps = flow();
		const step = steps[W.step];
		const last = W.step === steps.length - 1;
		view.innerHTML = `
      <div class="screen new-board">
        ${shortBandHtml({
			name: "New board",
			backAttr: "data-back",
			backLabel: W.step ? "Back a step" : "Back to mood boards",
			end: {
				label: "Close",
				attr: "data-close",
				svg: CLOSE
			}
		})}
        <div class="scroll form-page">
          ${marksHtml(steps.map((f) => MARKS.get(f)), W.step)}
          <h1 class="guide-title">${TITLES.get(step)}</h1>
          <p class="guide-ask">${ASKS.get(step)}</p>
          ${step()}
        </div>
        <div class="foot guide-foot">
          <button type="button" class="btn secondary" data-back>Back</button>
          <button type="button" class="btn primary" data-next>${last ? "Make the board" : `Next: ${MARKS.get(steps[W.step + 1])}`}</button>
        </div>
      </div>`;
		if (keepScroll) view.querySelector(".screen").classList.add("still");
		view.querySelector(".form-page").scrollTop = top;
		wire();
	}
	function stepName() {
		return `
      <label class="guide-field"><span class="guide-label">Name</span>
        <input class="guide-input" data-name value="${esc(W.name)}" placeholder="Name this board" maxlength="80" autocomplete="off" enterkeyhint="next" /></label>
      <p class="guide-label">Page size, the same for the whole board</p>
      <div class="opt-cards two" role="radiogroup" aria-label="Page size">${Object.entries(SHAPE_INFO).map(([k, sh]) => cardHtml({
			attr: `data-shape="${k}"`,
			on: W.shape === k,
			picture: `<span class="opt-shape ${k === "wide-16x9" ? "wide" : "tall"}"></span>`,
			name: sh.name,
			blurb: sh.blurb
		})).join("")}</div>`;
	}
	function stepLayout() {
		const w = W.shape === "wide-16x9" ? 80 : 60;
		return `
      <div class="opt-cards" role="radiogroup" aria-label="Layout">${STYLES.map((st) => cardHtml({
			attr: `data-style="${st.id}"`,
			on: W.style === st.id,
			picture: miniPage(W.shape, styleTemplate(W.shape, st.id, 0), w),
			name: st.name
		})).join("")}</div>
      <label class="switch-row"><span>Start with a cover page</span><input type="checkbox" class="switch" role="switch" data-cover${W.cover ? " checked" : ""} /></label>`;
	}
	function stepStart() {
		const w = W.shape === "wide-16x9" ? 64 : 44;
		const page = (cls) => `<span class="opt-glyph${cls}">${miniPage(W.shape, styleTemplate(W.shape, W.style, 0), w)}</span>`;
		let out = `
      <div class="opt-cards two" role="radiogroup" aria-label="Start">
        ${cardHtml({
			attr: "data-start=\"blank\"",
			on: W.start === "blank",
			picture: page(""),
			name: "Start blank",
			blurb: "Just the layout, with empty pages. You put the photos in yourself."
		})}
        ${cardHtml({
			attr: "data-start=\"fill\"",
			on: W.start === "fill",
			picture: page(" filled"),
			name: "Fill in sections",
			blurb: "Name sections and pick the tags each one fills from."
		})}
      </div>`;
		if (W.start === "blank") return out + stepperRow("Pages", "blank", W.blankPages, "pages");
		out += "<p class=\"guide-small\">Each section gets its own pages, with its name as the first page's title.</p>";
		W.sections.forEach((sec, i) => {
			out += `
        <div class="guide-section" data-sec="${i}">
          <div class="guide-sechead"><span class="guide-secnum">${i + 1}</span>
            <input class="guide-input" data-secname="${i}" value="${esc(sec.name)}" placeholder="Section ${i + 1} name" maxlength="60" autocomplete="off" enterkeyhint="done" />
            ${W.sections.length > 1 ? `<button type="button" class="icon-btn" data-drop="${i}" aria-label="Remove section ${i + 1}">${ICONS.x}</button>` : ""}</div>
          <div class="pick-chips">${sources.map((f) => `<button type="button" class="pick${sec.tags.includes(f.id) ? " on" : ""}" data-tag="${esc(f.id)}" data-in="${i}" aria-pressed="${sec.tags.includes(f.id)}">${esc(f.name)} ${photosIn(f.id).length}</button>`).join("")}</div>
          ${sec.tags.length > 1 ? `<label class="switch-row"><span>Only photos with all of these tags</span><input type="checkbox" class="switch" role="switch" data-all="${i}"${sec.all ? " checked" : ""} /></label>` : ""}
          <p class="guide-small">${sec.tags.length ? `${photosOf(sec).length} photos` : "Pick at least one tag."}</p>
        </div>`;
		});
		return out + "<button type=\"button\" class=\"btn secondary guide-add\" data-addsec>Add section</button>";
	}
	function stepperRow(name, key, n, word) {
		return `
      <div class="guide-stepper"><span>${name}</span>
        <span class="stepper"><button type="button" data-${key}="-1" aria-label="Fewer ${word}">−</button><b>${n}</b><button type="button" data-${key}="1" aria-label="More ${word}">+</button></span></div>`;
	}
	function stepPhotos() {
		return `
      <div class="opt-cards two" role="radiogroup" aria-label="Which photos come first">${ORDERS.map(([k, name, blurb]) => cardHtml({
			attr: `data-order="${k}"`,
			on: W.order === k,
			name,
			blurb
		})).join("")}</div>
      ${stepperRow("Pages per section", "per", W.perSection, "pages")}
      <div class="guide-summary">${W.sections.map((sec, i) => {
			const n = photosOf(sec).length;
			return `<div class="guide-sumrow"><span>${esc(titleOf(sec, i))}</span><span class="guide-sumcount">${n ? `${n} ${n === 1 ? "photo" : "photos"}` : "none yet"}</span></div>`;
		}).join("")}</div>
      ${W.sections.every((sec) => !photosOf(sec).length) ? "<p class=\"guide-small\">No photos match yet, so the board starts with empty pages.</p>" : ""}`;
	}
	function ok() {
		const step = flow()[W.step];
		if (step === stepStart && W.start === "fill") {
			const empty = W.sections.findIndex((s) => !s.tags.length);
			if (empty >= 0) {
				toast(`Pick a tag for ${titleOf(W.sections[empty], empty)}, or start blank`);
				return false;
			}
		}
		return true;
	}
	function go(d) {
		if (d > 0 && !ok()) return;
		if (d > 0 && W.step === flow().length - 1) return make();
		if (d < 0 && W.step === 0) {
			location.hash = "#/boards";
			return;
		}
		W.step = clamp(W.step + d, 0, flow().length - 1);
		draw();
	}
	function wire() {
		view.querySelectorAll("[data-back]").forEach((b) => b.addEventListener("click", () => go(-1)));
		view.querySelector("[data-close]").addEventListener("click", () => {
			location.hash = "#/boards";
		});
		view.querySelector("[data-next]").addEventListener("click", () => go(1));
		const name = view.querySelector("[data-name]");
		name?.addEventListener("input", () => {
			W.name = name.value;
		});
		name?.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				name.blur();
			}
		});
		view.querySelectorAll("[data-secname]").forEach((el) => el.addEventListener("input", () => {
			W.sections[+el.dataset.secname].name = el.value;
		}));
		view.querySelector("[data-cover]")?.addEventListener("change", (e) => {
			W.cover = e.target.checked;
		});
		view.querySelectorAll("[data-all]").forEach((el) => el.addEventListener("change", () => {
			W.sections[+el.dataset.all].all = el.checked;
			draw(true);
		}));
		view.querySelector(".form-page").addEventListener("click", (e) => {
			const b = e.target.closest("button");
			if (!b) return;
			const d = b.dataset;
			if (d.shape) W.shape = d.shape;
			else if (d.style) W.style = d.style;
			else if (d.start) W.start = d.start;
			else if (d.blank) W.blankPages = clamp(W.blankPages + +d.blank, 1, 20);
			else if (d.per) W.perSection = clamp(W.perSection + +d.per, 1, 20);
			else if (d.order) W.order = d.order;
			else if (d.tag) {
				const sec = W.sections[+d.in];
				sec.tags = sec.tags.includes(d.tag) ? sec.tags.filter((x) => x !== d.tag) : [...sec.tags, d.tag];
			} else if (d.drop) W.sections.splice(+d.drop, 1);
			else if ("addsec" in d) {
				W.sections.push({
					name: "",
					tags: [],
					all: true
				});
				draw(true);
				const all = view.querySelectorAll("[data-secname]");
				all[all.length - 1]?.scrollIntoView({ block: "center" });
				return;
			} else return;
			draw(true);
		});
	}
	const shuffle = (list) => {
		const a = [...list];
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	};
	async function make() {
		const name = W.name.trim() || "Untitled board";
		let pages = [];
		if (W.start === "blank") {
			pages = Array.from({ length: W.blankPages }, (_, n) => ({
				template: styleTemplate(W.shape, W.style, n) || paginate(W.shape, W.style, [])[0].template,
				images: []
			}));
		} else {
			const used = new Set();
			W.sections.forEach((sec, i) => {
				const list = photosOf(sec);
				const all = (W.order === "random" ? shuffle(list) : sortList(list, W.order)).map((p) => p.id);
				const pool = [...all.filter((x) => !used.has(x)), ...all.filter((x) => used.has(x))];
				const own = paginate(W.shape, W.style, pool).slice(0, W.perSection);
				while (own.length < W.perSection) own.push({
					template: styleTemplate(W.shape, W.style, own.length) || own[0].template,
					images: []
				});
				own.forEach((p) => p.images.forEach((x) => used.add(x)));
				const title = titleOf(sec, i);
				own[0].title = title;
				own.forEach((p) => {
					p.section = title;
				});
				pages.push(...own);
			});
		}
		if (W.cover) pages.unshift(makeCover({
			shape: W.shape,
			name
		}, pages.flatMap((p) => p.images).find(Boolean) || null));
		pages = pages.map((p) => withTextDefaults({
			...p,
			images: p.images.map((x) => x ? { id: x } : null)
		}));
		const b = await saveBoard({
			name,
			shape: W.shape,
			style: W.style,
			pages
		});
		location.hash = `#/board/${b.id}`;
	}
	draw();
}

// pages/showboard.js
function showBoard(board, start, onClose) {
	let at = start;
	let busy = false;
	const el = document.createElement("div");
	el.className = "show";
	el.innerHTML = `
    <div class="show-top">
      <button type="button" class="show-btn" data-close aria-label="Leave full screen">${ICONS.x}</button>
      <span class="show-count"></span>
    </div>
    <div class="show-stage"></div>
    <div class="show-foot">
      <button type="button" class="show-btn" data-go="-1" aria-label="Previous page">${ICONS.back}</button>
      <button type="button" class="show-btn flip" data-go="1" aria-label="Next page">${ICONS.back}</button>
    </div>`;
	document.body.append(el);
	const stage = el.querySelector(".show-stage");
	const count = el.querySelector(".show-count");
	async function pageEl(n) {
		const p = await renderPage(board, board.pages[n]);
		const s = SHAPES$1[board.shape];
		const k = Math.min(stage.clientWidth / s.W, stage.clientHeight / s.H);
		p.style.width = `${Math.floor(s.W * k)}px`;
		p.classList.add("show-page");
		return p;
	}
	function paint() {
		count.textContent = `${at + 1} of ${board.pages.length}`;
		el.querySelector("[data-go=\"-1\"]").disabled = at === 0;
		el.querySelector("[data-go=\"1\"]").disabled = at === board.pages.length - 1;
	}
	async function draw() {
		stage.replaceChildren(await pageEl(at));
		paint();
	}
	async function go(dir, from = 0) {
		const n = at + dir;
		const cur = stage.firstElementChild;
		if (busy || n < 0 || n >= board.pages.length) {
			if (cur) {
				cur.style.transition = "transform .18s ease-out";
				cur.style.transform = "";
			}
			return;
		}
		busy = true;
		at = n;
		paint();
		const next = await pageEl(n);
		const w = stage.clientWidth;
		next.style.transform = `translateX(${dir * w}px)`;
		stage.append(next);
		void next.offsetWidth;
		const ease = "transform .26s cubic-bezier(.25,.6,.3,1)";
		if (cur) {
			cur.style.transition = ease;
			cur.style.transform = `translateX(${-dir * w + 0}px)`;
		}
		next.style.transition = ease;
		next.style.transform = "translateX(0)";
		const done = () => {
			if (!busy) return;
			busy = false;
			cur?.remove();
			next.style.transition = "";
		};
		next.addEventListener("transitionend", done, { once: true });
		setTimeout(done, 400);
	}
	let d = null;
	stage.addEventListener("pointerdown", (e) => {
		if (busy || e.button) return;
		d = {
			id: e.pointerId,
			x0: e.clientX,
			y0: e.clientY,
			x: 0,
			on: false
		};
	});
	stage.addEventListener("pointermove", (e) => {
		if (!d || e.pointerId !== d.id) return;
		const dx = e.clientX - d.x0;
		const dy = e.clientY - d.y0;
		if (!d.on) {
			if (Math.hypot(dx, dy) < 10) return;
			if (Math.abs(dy) > Math.abs(dx)) {
				d = null;
				return;
			}
			d.on = true;
			try {
				stage.setPointerCapture(e.pointerId);
			} catch {}
		}
		const end = dx > 0 && at === 0 || dx < 0 && at === board.pages.length - 1;
		d.x = end ? dx * .25 : dx;
		const cur = stage.firstElementChild;
		if (cur) {
			cur.style.transition = "";
			cur.style.transform = `translateX(${d.x}px)`;
		}
	});
	const up = (e) => {
		if (!d || e.pointerId !== d.id) return;
		const g = d;
		d = null;
		if (!g.on) return;
		if (e.type === "pointerup" && Math.abs(g.x) > 50) go(g.x < 0 ? 1 : -1, g.x);
		else go(0);
	};
	stage.addEventListener("pointerup", up);
	stage.addEventListener("pointercancel", up);
	function close() {
		document.removeEventListener("keydown", key);
		window.removeEventListener("resize", draw);
		el.remove();
		onClose?.(at);
	}
	const key = (e) => {
		if (e.key === "ArrowRight") go(1);
		else if (e.key === "ArrowLeft") go(-1);
		else if (e.key === "Escape") close();
	};
	document.addEventListener("keydown", key);
	window.addEventListener("resize", draw);
	el.querySelector("[data-close]").addEventListener("click", close);
	el.querySelector(".show-foot").addEventListener("click", (e) => {
		const b = e.target.closest("[data-go]");
		if (b) go(+b.dataset.go);
	});
	draw();
	return { close };
}

// pages/board-touch.js
function addTouch(ed) {
	const pts = new Map();
	let gesture = null;
	const slotOf = (target) => target.closest?.(".slot");
	ed.stage.addEventListener("pointerdown", (e) => {
		if (e.target.closest(".slot-x")) return;
		try {
			ed.stage.setPointerCapture(e.pointerId);
		} catch {}
		pts.set(e.pointerId, [e.clientX, e.clientY]);
		const handle = e.target.closest(".tbox-sel i");
		const boxEl = handle ? null : e.target.closest("[data-box]");
		if (pts.size === 1 && (handle || boxEl)) {
			const key = handle ? ed.tsel : ed.keyOf(boxEl.dataset.box);
			const pg = ed.stage.querySelector(".page");
			const b = pg.querySelector(`[data-box="${key}"]`);
			gesture = {
				text: key,
				handle: handle?.dataset.h,
				x: e.clientX,
				y: e.clientY,
				moved: false,
				picked: key === ed.tsel,
				r0: ed.rectOf(b, pg),
				pw: pg.clientWidth,
				ph: pg.clientHeight
			};
			return;
		}
		if (pts.size === 1) {
			const slot = slotOf(e.target);
			const onSel = slot && +slot.dataset.index === ed.sel && ed.page().images[ed.sel];
			gesture = {
				x: e.clientX,
				y: e.clientY,
				slot,
				crop: onSel ? { ...ed.page().images[ed.sel] } : null,
				moved: false
			};
		} else if (pts.size === 2 && gesture?.crop) {
			const [a, b] = [...pts.values()];
			gesture.pinch = {
				d: Math.hypot(a[0] - b[0], a[1] - b[1]),
				zoom: ed.page().images[ed.sel].zoom || 1
			};
		}
	});
	ed.stage.addEventListener("pointermove", (e) => {
		if (!pts.has(e.pointerId) || !gesture) return;
		pts.set(e.pointerId, [e.clientX, e.clientY]);
		const dx = e.clientX - gesture.x;
		const dy = e.clientY - gesture.y;
		if (Math.hypot(dx, dy) > 8) gesture.moved = true;
		if (gesture.text != null) {
			if (gesture.moved && (gesture.picked || gesture.handle)) ed.dragBox(gesture, dx / gesture.pw, dy / gesture.ph);
			return;
		}
		if (!gesture.crop) return;
		const im = ed.page().images[ed.sel];
		const slotEl = ed.stage.querySelector(`.slot[data-index="${ed.sel}"]`);
		const img = slotEl?.querySelector("img");
		const rec = photoById(im.id);
		if (!img || !rec) return;
		if (pts.size === 2 && gesture.pinch) {
			const [a, b] = [...pts.values()];
			im.zoom = clamp(gesture.pinch.zoom * Math.hypot(a[0] - b[0], a[1] - b[1]) / gesture.pinch.d, 1, 6);
		} else if (pts.size === 1 && !gesture.pinch) {
			const sw = slotEl.clientWidth;
			const sh = slotEl.clientHeight;
			const scale = Math.max(sw / rec.width, sh / rec.height) * (im.zoom || 1);
			const spareX = rec.width * scale - sw;
			const spareY = rec.height * scale - sh;
			const [fx, fy] = gesture.crop.focal || [.5, .5];
			im.focal = [spareX > .5 ? clamp(fx - dx / spareX, 0, 1) : fx, spareY > .5 ? clamp(fy - dy / spareY, 0, 1) : fy];
		}
		applyCrop(img, im);
		gesture.changed = true;
	});
	const up = (e) => {
		if (!pts.has(e.pointerId)) return;
		pts.delete(e.pointerId);
		if (pts.size || !gesture) return;
		const g = gesture;
		gesture = null;
		if (g.text != null) return ed.endBoxGesture(g, e);
		if (g.crop) {
			if (g.changed) {
				ed.undo.push(JSON.stringify(ed.board.pages.map((p, i) => i === ed.at ? {
					...p,
					images: p.images.map((x, n) => n === ed.sel ? g.crop : x)
				} : p)));
				ed.paintUndo();
				ed.persist();
				return;
			}
		}
		const dx = e.clientX - g.x;
		if (g.moved && !g.crop) {
			if (Math.abs(dx) > 40) ed.goTo(ed.at + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
			return;
		}
		if (g.moved) return;
		const i = g.slot ? +g.slot.dataset.index : -1;
		ed.sel = ed.sel === i ? -1 : i;
		if (ed.tsel != null) {
			ed.tsel = null;
			ed.closePanel();
		}
		ed.drawPage();
	};
	ed.stage.addEventListener("pointerup", up);
	ed.stage.addEventListener("pointercancel", up);
	ed.stage.addEventListener("click", (e) => {
		if (!e.target.closest(".slot-x")) return;
		ed.snapshot();
		ed.page().images[ed.sel] = null;
		ed.sel = -1;
		ed.persist();
		ed.drawPage();
		ed.drawTray();
	});
}

// data/pdf.js
const enc = new TextEncoder();
function makePdf(sheets) {
	const parts = [];
	const offsets = [];
	let size = 0;
	const put = (v) => {
		const b = typeof v === "string" ? enc.encode(v) : v;
		parts.push(b);
		size += b instanceof Blob ? b.size : b.length;
	};
	const obj = (id, write) => {
		offsets[id] = size;
		put(`${id} 0 obj\n`);
		write();
		put("\nendobj\n");
	};
	const ids = sheets.map((_, i) => 3 + i * 3);
	const next = 3 + sheets.length * 3;
	put("%PDF-1.4\n");
	put(new Uint8Array([
		37,
		226,
		227,
		207,
		211,
		10
	]));
	obj(1, () => put("<< /Type /Catalog /Pages 2 0 R >>"));
	obj(2, () => put(`<< /Type /Pages /Count ${sheets.length} /Kids [${ids.map((id) => `${id + 1} 0 R`).join(" ")}] >>`));
	sheets.forEach((s, i) => {
		const im = ids[i];
		obj(im, () => {
			put(`<< /Type /XObject /Subtype /Image /Width ${s.pxW} /Height ${s.pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${s.jpeg.size} >>\nstream\n`);
			put(s.jpeg);
			put("\nendstream");
		});
		obj(im + 1, () => put(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${s.w.toFixed(2)} ${s.h.toFixed(2)}] /Contents ${im + 2} 0 R /Resources << /XObject << /Im ${im} 0 R >> >> >>`));
		const stream = enc.encode(`q ${s.w.toFixed(2)} 0 0 ${s.h.toFixed(2)} 0 0 cm /Im Do Q\n`);
		obj(im + 2, () => {
			put(`<< /Length ${stream.length} >>\nstream\n`);
			put(stream);
			put("\nendstream");
		});
	});
	const xref = size;
	let table = `xref\n0 ${next}\n0000000000 65535 f \n`;
	for (let id = 1; id < next; id++) table += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
	put(table);
	put(`trailer\n<< /Size ${next} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
	return new Blob(parts, { type: "application/pdf" });
}

// pages/board-tools.js
function addTools(ed) {
	Object.assign(ed, {
		layoutSheet,
		addPage,
		moreSheet,
		exportPdf
	});
	function layoutSheet() {
		const s = SHAPES$1[ed.board.shape];
		const W = 60;
		const H = 60 * s.H / s.W;
		const list = TEMPLATES[ed.board.shape].filter((t) => !t.guide);
		const sh = openSheet({
			title: "Layout",
			body: `<div class="opt-cards" role="radiogroup" aria-label="Layout">${list.map((t) => cardHtml({
				attr: `data-tpl="${esc(t.id)}"`,
				on: t.id === ed.page().template,
				picture: `<svg viewBox="0 0 ${W} ${H}" style="width:${s.W > s.H ? 80 : 60}px" aria-hidden="true"><rect class="paper-r" width="${W}" height="${H}"/>${t.slots.map((b) => `<rect x="${b.x * W}" y="${b.y * H}" width="${b.w * W}" height="${b.h * H}"/>`).join("")}</svg>`,
				name: t.name
			})).join("")}</div>`
		});
		sh.body.addEventListener("click", (e) => {
			const b = e.target.closest("[data-tpl]");
			if (!b) return;
			ed.snapshot();
			ed.page().template = b.dataset.tpl;
			ed.sel = -1;
			ed.persist();
			sh.close();
			ed.drawPage();
		});
	}
	function addPage() {
		ed.snapshot();
		const n = ed.at + 1;
		const tid = styleTemplate(ed.board.shape, ed.board.style, n) || defaultTemplate(ed.board.shape, 1).id;
		ed.board.pages.splice(n, 0, withTextDefaults({
			template: tid,
			images: [],
			section: ed.page().section
		}));
		ed.persist();
		ed.goTo(n, 1);
		ed.drawPage(1);
	}
	async function moreSheet() {
		const key = await choiceSheet({
			title: `Page ${ed.at + 1}`,
			options: [
				...ed.at > 0 ? [{
					key: "up",
					label: "Move earlier"
				}] : [],
				...ed.at < ed.board.pages.length - 1 ? [{
					key: "down",
					label: "Move later"
				}] : [],
				{
					key: "dup",
					label: "Duplicate page"
				},
				...ed.board.pages.length > 1 ? [{
					key: "delete",
					label: "Delete page",
					danger: true
				}] : []
			]
		});
		if (!key) return;
		if (key === "delete" && !await confirmSheet({
			title: "Delete this page?",
			message: "Its photos stay in the notebook.",
			confirmLabel: "Delete",
			danger: true
		})) return;
		ed.snapshot();
		if (key === "up" || key === "down") {
			const j = key === "up" ? ed.at - 1 : ed.at + 1;
			[ed.board.pages[ed.at], ed.board.pages[j]] = [ed.board.pages[j], ed.board.pages[ed.at]];
			ed.at = j;
		} else if (key === "dup") {
			ed.board.pages.splice(ed.at + 1, 0, clone(ed.page()));
			ed.at += 1;
		} else {
			ed.board.pages.splice(ed.at, 1);
			ed.at = Math.min(ed.at, ed.board.pages.length - 1);
		}
		ed.sel = -1;
		ed.persist();
		ed.drawPage();
		ed.drawTray();
	}
	async function exportPdf() {
		const s = SHAPES$1[ed.board.shape];
		const px = ed.board.shape === "wide-16x9" ? 2e3 : 1700;
		const sheets = [];
		try {
			for (let i = 0; i < ed.board.pages.length; i++) {
				toast(`Making page ${i + 1} of ${ed.board.pages.length}`, { ms: 6e4 });
				const c = await pageToCanvas(ed.board, ed.board.pages[i], px);
				sheets.push({
					w: s.W * 72,
					h: s.H * 72,
					pxW: c.width,
					pxH: c.height,
					jpeg: await canvasToBlob(c, "image/jpeg", .88)
				});
				c.width = c.height = 0;
			}
		} catch (e) {
			console.error(e);
			toast("Could not make the PDF");
			return;
		}
		hideToast();
		const blob = makePdf(sheets);
		const name = `${slug(ed.board.name)}.pdf`;
		const mb = (blob.size / 1048576).toFixed(1);
		const sh = openSheet({
			title: "Your PDF is ready",
			className: "sheet-small",
			body: `<p class="sheet-message">${ed.board.pages.length} ${ed.board.pages.length === 1 ? "page" : "pages"}, ${mb} MB.</p><div class="sheet-actions one"><button type="button" class="btn primary" data-send>Save or share</button></div>`
		});
		sh.body.querySelector("[data-send]").addEventListener("click", async () => {
			const file = new File([blob], name, { type: "application/pdf" });
			if (navigator.canShare?.({ files: [file] })) {
				try {
					await navigator.share({
						files: [file],
						title: ed.board.name
					});
				} catch {}
			} else downloadBlob(blob, name);
			sh.close();
		});
	}
}

// pages/board-text.js
function addTextBoxes(ed) {
	Object.assign(ed, {
		rectOf,
		paintTsel,
		dragBox,
		endBoxGesture,
		addNote,
		closePanel,
		textSheet
	});
	const keyOf = (v) => v === "main" ? "main" : +v;
	ed.keyOf = keyOf;
	const noteOf = (key) => key === "main" ? null : ed.page().notes?.[key];
	function rectOf(b, pg) {
		return {
			x: b.offsetLeft / pg.clientWidth,
			y: b.offsetTop / pg.clientHeight,
			w: b.offsetWidth / pg.clientWidth,
			h: b.offsetHeight / pg.clientHeight
		};
	}
	function paintTsel(pg) {
		if (ed.tsel == null) return;
		const b = pg.querySelector(`[data-box="${ed.tsel}"]`);
		if (!b) {
			ed.tsel = null;
			closePanel();
			return;
		}
		let o = pg.querySelector(".tbox-sel");
		if (!o) {
			o = document.createElement("div");
			o.className = "tbox-sel";
			o.innerHTML = [
				"nw",
				"ne",
				"sw",
				"se"
			].map((h) => `<i data-h="${h}"></i>`).join("");
			pg.append(o);
		}
		Object.assign(o.style, {
			left: `${b.offsetLeft}px`,
			top: `${b.offsetTop}px`,
			width: `${b.offsetWidth}px`,
			height: `${b.offsetHeight}px`
		});
	}
	function dragBox(g, fx, fy) {
		const r0 = g.r0;
		const r = { ...r0 };
		const h = g.handle;
		if (!h) {
			r.x = r0.x + fx;
			r.y = r0.y + fy;
		} else {
			if (h.includes("w")) {
				r.x = r0.x + fx;
				r.w = r0.w - fx;
			}
			if (h.includes("e")) r.w = r0.w + fx;
			if (h.includes("n")) {
				r.y = r0.y + fy;
				r.h = r0.h - fy;
			}
			if (h.includes("s")) r.h = r0.h + fy;
			if (r.w < .12) {
				if (h.includes("w")) r.x -= .12 - r.w;
				r.w = .12;
			}
			if (r.h < .04) {
				if (h.includes("n")) r.y -= .04 - r.h;
				r.h = .04;
			}
		}
		r.w = Math.min(r.w, 1);
		r.h = Math.min(r.h, 1);
		r.x = clamp(r.x, 0, 1 - r.w);
		r.y = clamp(r.y, 0, 1 - r.h);
		if (!g.snap) {
			ed.snapshot();
			g.snap = true;
		}
		const target = g.text === "main" ? ed.page().textBox ||= {} : noteOf(g.text);
		Object.assign(target, r);
		const pg = ed.stage.querySelector(".page");
		const b = pg.querySelector(`[data-box="${g.text}"]`);
		const pc = (v) => `${(v * 100).toFixed(3)}%`;
		if (g.text === "main" && b.classList.contains("overlay")) Object.assign(b.style, {
			left: pc(r.x),
			top: pc(r.y),
			bottom: "",
			maxWidth: pc(r.w)
		});
		else Object.assign(b.style, {
			left: pc(r.x),
			top: pc(r.y),
			bottom: "",
			width: pc(r.w),
			height: pc(r.h)
		});
		paintTsel(pg);
	}
	function endBoxGesture(g, e) {
		if (g.moved && (g.picked || g.handle)) {
			if (g.snap) {
				ed.persist();
				ed.drawPage();
			}
			return;
		}
		if (g.moved) {
			const dx = e.clientX - g.x;
			if (Math.abs(dx) > 40) ed.goTo(ed.at + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
			return;
		}
		const now = performance.now();
		if (g.picked && ed.lastTap && ed.lastTap.key === g.text && now - ed.lastTap.t < 400) {
			ed.lastTap = null;
			openPanel(g.text);
			return;
		}
		ed.lastTap = {
			key: g.text,
			t: now
		};
		if (!g.picked) {
			ed.tsel = g.text;
			ed.sel = -1;
			if (ed.panel != null && ed.panel !== ed.tsel) closePanel();
			ed.drawPage();
		}
	}
	function addNote() {
		ed.snapshot();
		const p = ed.page();
		p.notes ||= [];
		p.notes.push({
			x: .15,
			y: .4,
			w: .7,
			h: .1,
			text: "",
			size: defaultSize("note") * 1.6
		});
		ed.tsel = p.notes.length - 1;
		ed.sel = -1;
		ed.persist();
		ed.drawPage();
		openPanel(ed.tsel, true);
	}
	async function textSheet() {
		const key = await choiceSheet({
			title: "Add text",
			options: [{
				key: "title",
				label: "Title",
				detail: ed.page().title?.trim() ? "This page's title" : "A title for this page"
			}, {
				key: "text",
				label: "Text",
				detail: "A box of words, anywhere on the page"
			}]
		});
		if (key === "title") {
			ed.sel = -1;
			openPanel("main", true);
		} else if (key === "text") addNote();
	}
	const tpanel = ed.view.querySelector("[data-tpanel]");
	const trayBox = ed.view.querySelector("[data-tray-box]");
	function closePanel() {
		if (ed.panel == null) return;
		const p = ed.page();
		const n = ed.panel === "main" ? null : p?.notes?.[ed.panel];
		ed.panel = null;
		tpanel.hidden = true;
		tpanel.innerHTML = "";
		trayBox.hidden = false;
		if (n && !n.text.trim()) {
			p.notes.splice(p.notes.indexOf(n), 1);
			ed.tsel = null;
			ed.persist();
		}
		ed.drawPage();
	}
	function openPanel(key, focus = false) {
		const keep = key === "main" ? "main" : ed.page().notes?.[key];
		closePanel();
		key = keep === "main" ? "main" : ed.page().notes.indexOf(keep);
		if (key === -1) return;
		ed.panel = key;
		ed.tsel = key;
		const p = ed.page();
		const t = pageTemplate(ed.board, p);
		const n = noteOf(key);
		trayBox.hidden = true;
		tpanel.hidden = false;
		tpanel.innerHTML = n ? `
        <textarea rows="2" data-note placeholder="Type here">${esc(n.text)}</textarea>
        ${sizeRow("note", "text")}
        <div class="tp-actions"><button type="button" class="label-btn" data-tdel>Delete box</button><button type="button" class="label-btn tp-done" data-tdone>Done</button></div>` : `
        <input type="text" data-title value="${esc(p.title || "")}" placeholder="Title" maxlength="120" autocomplete="off" />
        ${sizeRow("title", "title")}
        <textarea rows="2" data-body placeholder="Text">${esc(p.text || "")}</textarea>
        ${sizeRow("body", "text")}
        <div class="tp-checks">${t.text.overlay ? `<label class="check"><input type="checkbox" data-fill${p.textFill === false ? "" : " checked"} /> Background</label>` : ""}
          <label class="check"><input type="checkbox" data-palette${p.palette ? " checked" : ""} /> Page colors</label></div>
        <div class="tp-actions"><button type="button" class="label-btn tp-done" data-tdone>Done</button></div>`;
		let first = true;
		const change = (fn) => {
			if (first) {
				ed.snapshot();
				first = false;
			}
			fn();
			ed.persist();
			ed.drawPage();
		};
		const on = (sel2, ev, fn) => tpanel.querySelector(sel2)?.addEventListener(ev, fn);
		on("[data-note]", "input", (e) => change(() => {
			n.text = e.target.value;
		}));
		on("[data-title]", "input", (e) => change(() => {
			p.title = e.target.value;
		}));
		on("[data-body]", "input", (e) => change(() => {
			p.text = e.target.value;
		}));
		on("[data-fill]", "change", (e) => change(() => {
			p.textFill = e.target.checked;
		}));
		on("[data-palette]", "change", (e) => change(() => {
			p.palette = e.target.checked;
		}));
		const targetOf = (kind) => kind === "note" ? n : p;
		const paintSizes = () => tpanel.querySelectorAll("[data-size]").forEach((row) => {
			const kind = row.dataset.size;
			const o = targetOf(kind);
			row.querySelector("b").textContent = `${Math.round(sizeOf(o, kind) * 100)}%`;
			row.querySelector("[data-usedef]").disabled = isDefault(o, kind);
			row.querySelector("[data-savedef]").disabled = isDefault(o, kind);
		});
		paintSizes();
		tpanel.onclick = (e) => {
			const b = e.target.closest("button");
			if (!b) return;
			if ("tdone" in b.dataset) {
				ed.tsel = null;
				closePanel();
				ed.drawPage();
				return;
			}
			if ("tdel" in b.dataset) {
				ed.snapshot();
				p.notes.splice(key, 1);
				ed.panel = null;
				ed.tsel = null;
				closePanel();
				tpanel.hidden = true;
				trayBox.hidden = false;
				ed.persist();
				ed.drawPage();
				return;
			}
			const row = b.closest("[data-size]");
			if (!row) return;
			const kind = row.dataset.size;
			const o = targetOf(kind);
			const word = kind === "title" ? "Title" : "Text";
			if (b.dataset.grow) change(() => stepSize(o, kind, +b.dataset.grow));
			else if ("usedef" in b.dataset) {
				change(() => useDefault(o, kind));
				toast(`${word} back to your default size`);
			} else if ("savedef" in b.dataset) {
				saveDefault(o, kind);
				toast(`${word} size saved: new ones start with it`);
			}
			paintSizes();
		};
		ed.drawPage();
		if (focus) tpanel.querySelector("textarea, input")?.focus();
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

// pages/board.js
async function boardScreen(view, id) {
	const ed = { view };
	Object.assign(ed, {
		drawPage,
		drawTray,
		goTo
	});
	let board = await getBoard(id);
	ed.board = board;
	if (!board) {
		location.hash = "#/boards";
		return () => {};
	}
	ed.at = 0;
	ed.sel = -1;
	let tray = "all";
	let destroyed = false;
	let drawToken = 0;
	ed.tsel = null;
	ed.panel = null;
	ed.lastTap = null;
	const undo = [];
	ed.undo = undo;
	const persist = debounce(() => saveBoard(board).then((b) => {
		board.updatedAt = b.updatedAt;
	}), 300);
	ed.persist = persist;
	const snapshot = () => {
		undo.push(JSON.stringify(board.pages));
		if (undo.length > 40) undo.shift();
		paintUndo();
	};
	ed.snapshot = snapshot;
	const page = () => board.pages[ed.at];
	ed.page = page;
	const asOpened = JSON.stringify([board.name, board.pages]);
	const tool = (t, icon, label) => `<button type="button" class="tool" data-t="${t}">${ICONS[icon]}<span>${label}</span></button>`;
	view.innerHTML = `
    <div class="screen editor">
      ${shortBandHtml({
		name: "Mood boards",
		back: "#/boards",
		backLabel: "Back to mood boards",
		end: {
			label: "Full screen",
			attr: "data-show",
			svg: FULL
		}
	})}
      <div class="board-head">
        <button type="button" class="board-name" data-rename></button>
        <span class="count" data-at></span>
      </div>
      <div class="stage" data-stage></div>
      <div class="tpanel" data-tpanel hidden></div>
      <div class="tray-box" data-tray-box>
        <div class="tray-head" data-tray-head></div>
        <div class="tray" data-tray></div>
      </div>
      <nav class="tools" aria-label="Page tools">
        ${tool("layout", "layout", "Layout")}${tool("text", "text", "Text")}${tool("add", "page", "Add page")}${tool("undo", "undo", "Undo")}${tool("more", "more", "More")}${tool("pdf", "download", "PDF")}
      </nav>
    </div>`;
	const stage = view.querySelector("[data-stage]");
	ed.stage = stage;
	const paintUndo = () => {
		view.querySelector("[data-t=undo]").disabled = !undo.length;
	};
	ed.paintUndo = paintUndo;
	async function drawPage(turn = 0) {
		const token = ++drawToken;
		view.querySelector("[data-rename]").textContent = board.name;
		view.querySelector("[data-at]").textContent = `Page ${ed.at + 1} of ${board.pages.length}`;
		const el = await renderPage(board, page(), {
			selected: ed.sel,
			editing: true,
			mainHint: ed.tsel === "main"
		});
		if (token !== drawToken || destroyed) return;
		fit(el);
		if (ed.sel >= 0 && page().images[ed.sel]) {
			const x = document.createElement("button");
			x.type = "button";
			x.className = "slot-x";
			x.setAttribute("aria-label", "Take this photo off the page");
			x.innerHTML = ICONS.x;
			const spot = el.querySelector(`.slot[data-index="${ed.sel}"]`).style;
			Object.assign(x.style, {
				left: `min(calc(${spot.left} + ${spot.width}), calc(100% - 16px))`,
				top: `max(${spot.top}, 16px)`
			});
			el.append(x);
		}
		stage.replaceChildren(el);
		ed.paintTsel(el);
		if (turn) {
			el.classList.add(turn > 0 ? "turn-next" : "turn-back");
		}
	}
	function fit(el) {
		const s = SHAPES$1[board.shape];
		const k = Math.min(stage.clientWidth / s.W, stage.clientHeight / s.H);
		el.style.width = `${Math.floor(s.W * k)}px`;
	}
	function drawTray() {
		const sources = [
			{
				id: "all",
				name: "All"
			},
			SPECIAL[0],
			SPECIAL[1],
			...lib.folders
		];
		view.querySelector("[data-tray-head]").innerHTML = sources.map((f) => `<button type="button" class="chip${tray === f.id ? " on" : ""}" data-source="${esc(f.id)}">${esc(f.name)}</button>`).join("");
		const list = sortList(photosIn(tray), "newest");
		const onPage = new Set(page().images.filter(Boolean).map((x) => x.id));
		view.querySelector("[data-tray]").innerHTML = list.length ? list.map((p) => `<button type="button" class="tray-photo${onPage.has(p.id) ? " used" : ""}" data-photo="${esc(p.id)}" aria-label="${esc(p.name)}"><img src="${thumbUrl(p)}" alt="" loading="lazy" draggable="false" /></button>`).join("") : "<p class=\"note\">No photos here yet.</p>";
	}
	function goTo(n, dir) {
		n = clamp(n, 0, board.pages.length - 1);
		if (n === ed.at) return;
		ed.at = n;
		ed.sel = -1;
		ed.tsel = null;
		ed.closePanel();
		drawPage(dir);
		drawTray();
	}
	function place(photoId) {
		const t = pageTemplate(board, page());
		let spot = ed.sel;
		if (spot < 0) {
			for (let i = 0; i < t.slots.length; i++) if (!page().images[i]) {
				spot = i;
				break;
			}
		}
		if (spot < 0) {
			toast("Tap a spot on the page first");
			return;
		}
		snapshot();
		while (page().images.length <= spot) page().images.push(null);
		page().images[spot] = { id: photoId };
		persist();
		drawPage();
		drawTray();
	}
	addTouch(ed);
	addTools(ed);
	addTextBoxes(ed);
	view.querySelector(".tools").addEventListener("click", (e) => {
		const b = e.target.closest("[data-t]");
		if (!b) return;
		const k = b.dataset.t;
		if (k === "layout") ed.layoutSheet();
		else if (k === "text") ed.textSheet();
		else if (k === "add") ed.addPage();
		else if (k === "more") ed.moreSheet();
		else if (k === "pdf") ed.exportPdf();
		else if (k === "undo" && undo.length) {
			board.pages = JSON.parse(undo.pop());
			ed.at = Math.min(ed.at, board.pages.length - 1);
			ed.sel = -1;
			ed.tsel = null;
			ed.closePanel();
			paintUndo();
			persist();
			drawPage();
			drawTray();
		}
	});
	view.querySelector("[data-show]").addEventListener("click", () => {
		persist.flush?.();
		showBoard(board, ed.at, (n) => {
			if (!destroyed && n !== ed.at) goTo(n, n > ed.at ? 1 : -1);
		});
	});
	view.querySelector("[data-tray-head]").addEventListener("click", (e) => {
		const b = e.target.closest("[data-source]");
		if (b) {
			tray = b.dataset.source;
			drawTray();
		}
	});
	view.querySelector("[data-tray]").addEventListener("click", (e) => {
		const b = e.target.closest("[data-photo]");
		if (b) place(b.dataset.photo);
	});
	view.querySelector("[data-rename]").addEventListener("click", async () => {
		const name = await promptSheet({
			title: "Rename board",
			value: board.name
		});
		if (name) {
			board.name = name;
			persist();
			drawPage();
		}
	});
	const onResize = () => {
		const el = stage.querySelector(".page");
		if (el) fit(el);
	};
	window.addEventListener("ref-layout", onResize);
	paintUndo();
	await drawPage();
	drawTray();
	return () => {
		destroyed = true;
		const changed = JSON.stringify([board.name, board.pages]) !== asOpened;
		Promise.resolve(persist.flush()).then(() => {
			if (changed) keepUp(board.id);
		});
		window.removeEventListener("ref-layout", onResize);
	};
}

// pages/cover-spin.js
const book$1 = document.getElementById("book");
const SPIN_AWAY = .75;
const SPIN_TOWARD = .95;
const TILT = .42;
const softSpin = (raw) => raw < 0 ? SPIN_AWAY * Math.tanh(raw / SPIN_AWAY) : SPIN_TOWARD * Math.tanh(raw / SPIN_TOWARD);
const softTilt = (raw) => TILT * Math.tanh(raw / TILT);
const held = {
	spin: 0,
	spinV: 0,
	spinGoal: 0,
	tilt: 0,
	tiltV: 0,
	tiltGoal: 0,
	drag: null,
	raf: 0,
	last: 0,
	ended: 0
};
const showTurn = () => {
	book$1.style.setProperty("--spin", `${held.spin * 180 / Math.PI}deg`);
	book$1.style.setProperty("--tilt", `${held.tilt * 180 / Math.PI}deg`);
};
function stopTurning() {
	cancelAnimationFrame(held.raf);
	Object.assign(held, {
		spin: 0,
		spinV: 0,
		spinGoal: 0,
		tilt: 0,
		tiltV: 0,
		tiltGoal: 0,
		drag: null,
		raf: 0,
		last: 0
	});
	showTurn();
}
function turnStep(now) {
	const dt = Math.min(.033, (now - (held.last || now - 16)) / 1e3);
	held.last = now;
	const on = !!(held.drag && held.drag.moved);
	const goalS = on ? held.spinGoal : 0;
	const goalT = on ? held.tiltGoal : 0;
	held.spinV += (-(on ? 40 : 14) * (held.spin - goalS) - (on ? 12 : 7.5) * held.spinV) * dt;
	held.tiltV += (-(on ? 40 : 30) * (held.tilt - goalT) - (on ? 12 : 10) * held.tiltV) * dt;
	held.spin += held.spinV * dt;
	held.tilt += held.tiltV * dt;
	showTurn();
	if (!held.drag && Math.abs(held.spin) + Math.abs(held.tilt) < .002 && Math.abs(held.spinV) + Math.abs(held.tiltV) < .01) {
		held.spin = held.tilt = held.spinV = held.tiltV = 0;
		held.raf = 0;
		held.last = 0;
		showTurn();
		return;
	}
	held.raf = requestAnimationFrame(turnStep);
}
book$1.addEventListener("pointerdown", (e) => {
	if (e.button || !book$1.classList.contains("closed") || book$1.classList.contains("placing") || e.target.closest(".nb-sun")) return;
	held.drag = {
		id: e.pointerId,
		x0: e.clientX,
		y0: e.clientY,
		spin0: held.spin,
		tilt0: held.tilt,
		moved: false
	};
});
book$1.addEventListener("pointermove", (e) => {
	const d = held.drag;
	if (!d || d.id !== e.pointerId) return;
	const dx = e.clientX - d.x0;
	const dy = e.clientY - d.y0;
	if (!d.moved && Math.hypot(dx, dy) > 6) {
		d.moved = true;
		try {
			book$1.setPointerCapture(e.pointerId);
		} catch {}
		if (!held.raf) held.raf = requestAnimationFrame(turnStep);
	}
	if (!d.moved) return;
	const k = .0056;
	held.spinGoal = softSpin(d.spin0 + dx * k);
	held.tiltGoal = softTilt(d.tilt0 - dy * k);
});
const letGo = (e) => {
	const d = held.drag;
	if (!d || d.id !== e.pointerId) return;
	held.drag = null;
	if (d.moved) held.ended = performance.now();
};
book$1.addEventListener("pointerup", letGo);
book$1.addEventListener("pointercancel", letGo);
book$1.addEventListener("click", (e) => {
	if (performance.now() - held.ended < 350) {
		e.preventDefault();
		e.stopPropagation();
	}
}, true);

// pages/cover.js
const book = document.getElementById("book");
const frame$3 = document.getElementById("frame");
document.getElementById("bookHit").addEventListener("click", () => {
	location.hash = "#/boards";
});
const sun = document.getElementById("bookSun");
sun.innerHTML = ICONS.sun;
sun.addEventListener("click", openOptions);
const tabHits = document.getElementById("bookTabHits");
tabHits.addEventListener("click", (e) => {
	const b = e.target.closest("[data-go]");
	if (b) location.hash = b.dataset.go;
});
const RATIO = 1e3 / 1360;
const TAB_OUT = .08;
const STACK = 16;
const TURNED = 20 * Math.PI / 180;
const PERSPECTIVE = 1100;
const OPEN_MS = 900;
const ZOOM_MS = 760;
const OVER = 12;
document.getElementById("bookStack").innerHTML = Array.from({ length: STACK }, (_, i) => `<i style="--i:${i + 1}"></i>`).join("") + `<b style="--i:${STACK + 1}"></b>`;
function measure() {
	const vw = window.innerWidth;
	const vh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--book-h")) || window.innerHeight;
	const W = Math.min(vw * .78, vh * .66 * RATIO, 460);
	const H = W / RATIO;
	const k = Math.min(1, (vw - 14) / (2 * W), vh * .82 / H);
	const cos = Math.cos(TURNED);
	const sin = Math.sin(TURNED);
	const depth = (STACK + 1) * W * .0112;
	const seen = [
		[-W / 2, 0],
		[W / 2, 0],
		[-W / 2, -depth],
		[W / 2 + W * TAB_OUT, -depth * .8]
	].map(([x, d]) => (x * cos - d * sin) * PERSPECTIVE / (PERSPECTIVE - (x * sin + d * cos)));
	const f = frame$3.getBoundingClientRect();
	const set = (n, v) => book.style.setProperty(n, v);
	set("--W", `${W}px`);
	set("--H", `${H}px`);
	set("--k", String(k));
	set("--shut-x", `${-(Math.min(...seen) + Math.max(...seen)) / 2 / cos}px`);
	const pw = (vw + OVER) / .986;
	const ph = (vh + 2 * OVER) / .986;
	const sx = pw / W;
	const sy = ph / H;
	set("--zoom-x", `${frame$3.dataset.side === "left" ? vw / 2 : -vw / 2}px`);
	set("--zoom-y", "0px");
	set("--zoom-sx", String(sx));
	set("--zoom-sy", String(sy));
	set("--title-fs", `${24 / sx}px`);
	set("--title-top", `${(f.top + 12 - (vh - ph) / 2) / sy}px`);
	set("--title-sq", String(sx / sy));
	const c = (f.left + f.right) / 2;
	set("--title-out", `${Math.max(0, frame$3.dataset.side === "left" ? 2 * c - 2 * vw + pw : pw - 2 * c) / sx}px`);
}
function placeTabHits() {
	const before = book.className;
	book.className = "nb no-anim closed";
	const rects = [...document.getElementById("bookSideTabs").children].map((el) => el.getBoundingClientRect());
	[...tabHits.children].forEach((hit, i) => {
		const r = rects[i];
		hit.style.cssText = `left:${r.left - 14}px;right:0;top:${r.top - 3}px;height:${r.height + 6}px`;
	});
	book.className = before;
	void book.offsetWidth;
}
window.addEventListener("ref-layout", () => {
	measure();
	if (!book.hidden && book.classList.contains("closed")) placeTabHits();
});
const zoomed = () => frame$3.dataset.side === "left" ? "opened zoom-l" : "opened zoom-r";
const place = (mode) => {
	book.hidden = false;
	placeTabHits();
	book.className = `nb no-anim ${mode}`;
	void book.offsetWidth;
};
const setMode = (mode) => {
	book.className = `nb ${mode}`;
};
let firstRoute = true;
let isOpen = false;
let bookTimer = 0;
function setBook(open) {
	const first = firstRoute;
	firstRoute = false;
	if (open === isOpen && !first) return;
	isOpen = open;
	clearTimeout(bookTimer);
	stopTurning();
	measure();
	if (first) {
		if (open) book.hidden = true;
		else place("closed");
		return;
	}
	if (open) {
		setMode("opened");
		bookTimer = setTimeout(() => {
			setMode(zoomed());
			bookTimer = setTimeout(() => {
				book.hidden = true;
			}, ZOOM_MS);
		}, OPEN_MS);
	} else {
		place(zoomed());
		setMode("closed");
	}
}

// pages/welcome.js
function welcome(name, openTour) {
	const suite = window.DF_SUITE;
	if (!suite || !suite.firstVisit) return false;
	const w = suite.words(name);
	let step = "back";
	let toured = false;
	const s = openSheet({
		title: w.back[0],
		className: "sheet-small intro",
		onClose: () => {
			suite.welcomed();
			if (toured) setTimeout(openTour, 60);
		}
	});
	const say = (text) => `<p class="sheet-message">${text}</p>`;
	const one = (label, step) => `<div class="sheet-actions one"><button type="button" class="btn primary" data-step="${step}">${label}</button></div>`;
	const draw = () => {
		if (step === "back") {
			s.setTitle(w.back[0]);
			s.body.innerHTML = say(w.back[1]) + one("Next", "next");
		} else if (step === "ask") {
			s.setTitle(w.ask[0]);
			s.body.innerHTML = say(w.ask[1]) + `<div class="sheet-actions">
        <button type="button" class="btn secondary" data-step="no">${w.ask[3]}</button>
        <button type="button" class="btn primary" data-step="yes">${w.ask[2]}</button>
      </div>`;
		} else {
			s.setTitle(w.later[0]);
			s.body.innerHTML = say(w.later[1]) + one(w.later[2], "done");
		}
	};
	s.body.addEventListener("click", (e) => {
		const b = e.target.closest("[data-step]");
		if (!b) return;
		const k = b.dataset.step;
		if (k === "next") {
			step = "ask";
			draw();
		} else if (k === "no") {
			step = "later";
			draw();
		} else {
			toured = k === "yes";
			s.close();
		}
	});
	draw();
	return true;
}

// components/spread.js
const frame$2 = document.getElementById("frame");
const view$1 = document.getElementById("view");
const SLIDE_MS = 240;
const FADE_MS = 150;
const EASE = "cubic-bezier(.4, 0, .2, 1)";
const sideOf = (i) => i === 1 ? "right" : "left";
const still = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const at$1 = /* @__PURE__ */ __name((x) => `translate3d(${x}px, 0px, 0px)`, "at");
const slideOffset = (x, dir, width) => dir > 0 ? Math.max(-width, Math.min(0, x)) : Math.min(width, Math.max(0, x));
let beside = null;
async function drawBeside(i, dir) {
	if (beside && beside.i === i && beside.dir === dir) return beside.ready;
	dropBeside();
	const leaf = document.createElement("div");
	leaf.className = "slide-leaf";
	leaf.setAttribute("aria-hidden", "true");
	leaf.inert = true;
	leaf.style.transform = `translate3d(${dir * 100}%, 0px, 0px)`;
	leaf.innerHTML = "<div class=\"paper\"></div>";
	frame$2.append(leaf);
	const page = leaf.firstChild;
	const ready = (i === 0 ? boardsScreen(page) : Promise.resolve(foldersScreen(page))).then(() => page.querySelector(".screen")?.classList.add("still"));
	beside = {
		leaf,
		i,
		dir,
		ready
	};
	return ready;
}
function dropBeside() {
	beside?.leaf.remove();
	beside = null;
}
let settling = null;
const dragFrame = (x) => {
	settling?.cancel();
	settling = null;
	frame$2.style.transform = x ? at$1(x) : "";
};
function settleFrame(from) {
	frame$2.style.transform = "";
	settling?.cancel();
	settling = null;
	if (!from) {
		dropBeside();
		return;
	}
	settling = frame$2.animate([{ transform: at$1(from) }, { transform: at$1(0) }], {
		duration: SLIDE_MS,
		easing: EASE
	});
	const done = settling;
	done.onfinish = () => {
		if (settling === done) {
			settling = null;
			dropBeside();
		}
	};
}
let turning = false;
const isTurning = () => turning;
const ended = (a, ms) => new Promise((done) => {
	let gone = false;
	const off = () => {
		if (!gone) {
			gone = true;
			done();
		}
	};
	a.onfinish = off;
	setTimeout(off, ms + 300);
});
async function turnTo(i, dir, go, from = 0) {
	if (turning) return;
	turning = true;
	settling?.cancel();
	settling = null;
	if (still()) await crossfade(go);
	else {
		await drawBeside(i, dir);
		const a = frame$2.animate([{ transform: at$1(from) }, { transform: at$1(-dir * frame$2.offsetWidth) }], {
			duration: SLIDE_MS,
			easing: EASE,
			fill: "forwards"
		});
		await ended(a, SLIDE_MS);
		await go();
		a.cancel();
		frame$2.style.transform = "";
		dropBeside();
	}
	view$1.querySelector(".screen")?.classList.add("still");
	turning = false;
}
async function crossfade(go) {
	dropBeside();
	frame$2.style.transform = "";
	const leaf = document.createElement("div");
	leaf.className = "slide-leaf slide-fade";
	leaf.setAttribute("aria-hidden", "true");
	leaf.innerHTML = "<div class=\"paper\"></div>";
	const old = view$1.firstElementChild;
	if (old) leaf.firstChild.append(old.cloneNode(true));
	frame$2.append(leaf);
	const from = old ? [...old.querySelectorAll(".scroll")] : [];
	leaf.querySelectorAll(".scroll").forEach((el, k) => {
		el.scrollTop = from[k]?.scrollTop || 0;
	});
	await go();
	await ended(leaf.animate([{ opacity: 1 }, { opacity: 0 }], {
		duration: FADE_MS,
		easing: "linear",
		fill: "forwards"
	}), FADE_MS);
	leaf.remove();
}

// components/navbar.js
const q = (d, cls) => `<path class="${cls}" d="M12 12 ${d} Z"/>`;
const MARKS = {
	boards: `<svg viewBox="0 0 24 24" aria-hidden="true">${q("L0 12 A12 12 0 0 1 12 0", "mk-1")}${q("L12 0 A12 12 0 0 1 24 12", "mk-2")}${q("L24 12 A12 12 0 0 1 12 24", "mk-1")}${q("L12 24 A12 12 0 0 1 0 12", "mk-2")}</svg>`,
	tags: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path class=\"mk-1\" d=\"M0 12 A12 12 0 0 1 24 12 Z\"/><circle class=\"mk-2\" cx=\"12\" cy=\"18\" r=\"4\"/></svg>"
};
const SECTIONS = [{
	href: "#/boards",
	name: "Mood boards",
	key: "boards",
	icon: MARKS.boards
}, {
	href: "#/folders",
	name: "Tags",
	key: "tags",
	icon: MARKS.tags
}];
const bar = document.getElementById("navbar");
const frame$1 = document.getElementById("frame");
bar.innerHTML = `<div class="sec-row">${SECTIONS.map((s, i) => `<a class="sec sec-${s.key}" href="${s.href}" data-sec="${i}">${s.icon}<span>${s.name}</span></a>`).join("")}</div>`;
const links = [...bar.querySelectorAll(".sec")];
let at = 0;
let busy = false;
let swiped = 0;
let onList = false;
let puller = null;
let landed = null;
let docked = null;
const setPuller = (p) => {
	puller = p;
};
function showSection(i, list = false) {
	bar.hidden = i < 0;
	onList = list;
	frame$1.dataset.swipe = list ? "1" : "";
	if (landed) {
		landed();
		landed = null;
	}
	if (i < 0) {
		frame$1.style.transform = "";
		busy = false;
		return;
	}
	at = i;
	links.forEach((a, k) => {
		if (k === i) a.setAttribute("aria-current", "page");
		else a.removeAttribute("aria-current");
	});
}
const navigate = (href) => new Promise((done) => {
	landed = done;
	location.hash = href;
	setTimeout(() => {
		if (landed === done) {
			landed = null;
			done();
		}
	}, 1500);
});
async function go(dir, from = 0) {
	if (busy || isTurning()) return settle(from);
	if (dir < 0 && at === 0) {
		settle(from);
		location.hash = "#/";
		return;
	}
	const target = at + dir;
	const t = SECTIONS[target];
	if (!t) return settle(from);
	busy = true;
	await turnTo(target, Math.sign(dir), () => navigate(t.href), from);
	busy = false;
}
const settle = (from) => settleFrame(from);
links.forEach((a, k) => a.addEventListener("click", (e) => {
	e.preventDefault();
	if (k !== at) go(k - at);
	else frame$1.querySelector(".scroll")?.scrollTo({
		top: 0,
		behavior: "smooth"
	});
}));
function wire(el, fromPage) {
	let d = null;
	el.addEventListener("pointerdown", (e) => {
		d = null;
		if (busy || isTurning() || e.button || fromPage && !onList) return;
		d = {
			id: e.pointerId,
			x0: e.clientX,
			y0: e.clientY,
			x: 0,
			moved: false,
			kind: ""
		};
	});
	el.addEventListener("pointermove", (e) => {
		if (!d || e.pointerId !== d.id) return;
		if (docked) {
			d = null;
			return;
		}
		const dx = e.clientX - d.x0;
		const dy = e.clientY - d.y0;
		if (!d.moved) {
			if (Math.hypot(dx, dy) < 10) return;
			if (fromPage && Math.abs(dy) > Math.abs(dx)) {
				d = null;
				return;
			}
			d.moved = true;
			try {
				el.setPointerCapture(e.pointerId);
			} catch {}
			const dir = dx < 0 ? 1 : -1;
			d.dir = dir;
			if (SECTIONS[at + dir]) {
				d.kind = "turn";
				drawBeside(at + dir, dir);
			} else if (dir < 0 && at === 0) d.kind = "shut";
			else d.kind = "stop";
		}
		d.x = dx;
		if (d.kind === "turn") {
			d.x = slideOffset(dx, d.dir, frame$1.offsetWidth);
			dragFrame(d.x);
		}
		if (d.kind === "shut") {
			d.x = Math.max(0, dx);
			dragFrame(Math.min(d.x * .3, 60));
		}
	});
	const end = (e) => {
		if (!d || e.pointerId !== d.id) return;
		const g = d;
		d = null;
		if (!g.moved) return;
		swiped = performance.now();
		const up = e.type === "pointerup";
		const w = frame$1.offsetWidth;
		if (g.kind === "turn") {
			if (up && g.x * g.dir < 0 && Math.abs(g.x) > Math.min(60, w * .15)) go(g.dir, g.x);
			else settle(g.x);
		} else if (g.kind === "shut") {
			if (up && g.x > 50) {
				dragFrame(0);
				location.hash = "#/";
			} else settle(Math.min(g.x * .3, 60));
		}
	};
	el.addEventListener("pointerup", end);
	el.addEventListener("pointercancel", end);
	el.addEventListener("click", (e) => {
		if (performance.now() - swiped < 350) {
			e.preventDefault();
			e.stopPropagation();
		}
	}, true);
}
wire(bar, false);
wire(frame$1, true);
const DOCK_SLOT = 46;
const DOCK_PAD = 10;
const dock = document.createElement("div");
dock.className = "nav-dock";
dock.setAttribute("aria-hidden", "true");
dock.innerHTML = SECTIONS.map((s) => `<span class="nav-dock-slot"><span class="nav-dock-icon">${s.icon}</span></span>`).join("") + "<span class=\"nav-dock-label\"></span>";
bar.appendChild(dock);
const dockSlots = [...dock.querySelectorAll(".nav-dock-slot")];
const dockIcons = [...dock.querySelectorAll(".nav-dock-icon")];
const dockLabel = dock.querySelector(".nav-dock-label");
let hold = null;
function dockShow(x) {
	const fx = x === null ? docked.centers[at] : x;
	let near = at;
	if (x !== null) {
		let best = Infinity;
		docked.centers.forEach((c, i) => {
			if (Math.abs(fx - c) < best) {
				best = Math.abs(fx - c);
				near = i;
			}
		});
	}
	docked.at = near;
	dockIcons.forEach((icon, i) => {
		const grow = Math.max(0, 1 - Math.abs(fx - docked.centers[i]) / (DOCK_SLOT * 1.8));
		icon.style.transform = `scale(${(1 + .55 * grow).toFixed(3)})`;
	});
	dockLabel.textContent = SECTIONS[near].name;
	dockLabel.style.left = `${(docked.centers[near] - docked.left).toFixed(1)}px`;
}
function openDock(h) {
	hold = null;
	if (busy || isTurning() || bar.hidden) return;
	const r = bar.getBoundingClientRect();
	const w = SECTIONS.length * DOCK_SLOT + DOCK_PAD * 2;
	const vw = window.innerWidth;
	const left = Math.max(8, Math.min(vw - 8 - w, h.x - DOCK_PAD - (at + .5) * DOCK_SLOT));
	docked = {
		id: h.id,
		x0: h.x,
		y0: h.y,
		moved: false,
		at,
		left,
		centers: SECTIONS.map((s, i) => left + DOCK_PAD + (i + .5) * DOCK_SLOT)
	};
	dock.style.left = `${(left - r.left).toFixed(1)}px`;
	dock.style.transformOrigin = `${(h.x - left).toFixed(1)}px 100%`;
	dockSlots.forEach((slot, i) => slot.classList.toggle("is-here", i === at));
	dockShow(null);
	dock.classList.add("is-open");
	bar.classList.add("is-docked");
	try {
		bar.setPointerCapture(h.id);
	} catch {}
}
bar.addEventListener("pointerdown", (e) => {
	if (e.button || !e.isPrimary) return;
	if (hold) clearTimeout(hold.timer);
	const h = {
		id: e.pointerId,
		x: e.clientX,
		y: e.clientY
	};
	h.timer = setTimeout(() => {
		if (hold === h) openDock(h);
	}, 380);
	hold = h;
});
bar.addEventListener("contextmenu", (e) => e.preventDefault());
bar.addEventListener("pointermove", (e) => {
	if (hold && e.pointerId === hold.id && Math.hypot(e.clientX - hold.x, e.clientY - hold.y) >= 8) {
		clearTimeout(hold.timer);
		hold = null;
	}
	if (!docked || e.pointerId !== docked.id) return;
	if (!docked.moved && Math.hypot(e.clientX - docked.x0, e.clientY - docked.y0) < 10) return;
	docked.moved = true;
	dockShow(e.clientX);
});
const dockEnd = (e) => {
	if (hold && e.pointerId === hold.id) {
		clearTimeout(hold.timer);
		hold = null;
	}
	if (!docked || e.pointerId !== docked.id) return;
	const { moved, at: to } = docked;
	docked = null;
	dock.classList.remove("is-open");
	bar.classList.remove("is-docked");
	swiped = performance.now();
	if (e.type === "pointerup" && moved && to !== at) go(to - at);
};
bar.addEventListener("pointerup", dockEnd);
bar.addEventListener("pointercancel", dockEnd);

// components/pull-shut.js
const pull = document.getElementById("pull");
let pulled = 0;
const pullStart = () => {
	pull.classList.remove("back");
	pull.hidden = false;
	pulled = 0;
};
const pullMove = (w) => {
	pulled = Math.min(w, window.innerWidth);
	pull.style.width = `${pulled}px`;
};
function pullEnd() {
	if (pulled > window.innerWidth * .45) {
		pull.hidden = true;
		pull.style.width = "0";
		location.hash = "#/";
	} else {
		pull.classList.add("back");
		pull.style.width = "0";
		setTimeout(() => {
			pull.hidden = true;
		}, 200);
	}
}
setPuller({
	start: pullStart,
	move: pullMove,
	end: pullEnd
});

// app.js
const view = document.getElementById("view");
const frame = document.getElementById("frame");
let destroyCurrent = null;
let token = 0;
const suite = window.DF_SUITE;
document.addEventListener("click", (e) => {
	if (e.target.closest("[data-app-menu]")) openOptions();
});
const titleR = document.getElementById("titleR");
const titleL = document.getElementById("titleL");
async function route() {
	const mine = ++token;
	if (destroyCurrent) {
		destroyCurrent();
		destroyCurrent = null;
	}
	closeAllSheets();
	document.querySelectorAll(".viewer").forEach((v) => v.remove());
	const h = (location.hash || "#/").slice(1) || "/";
	if (suite && h === "/") {
		suite.home();
		return;
	}
	const section = h === "/boards" ? 0 : h === "/folders" || h.startsWith("/folder/") ? 1 : -1;
	if (h !== "/") {
		frame.dataset.side = sideOf(section);
		titleL.textContent = section === 0 ? "Mood boards" : "";
		titleR.textContent = section === 1 ? "Tags" : "";
	}
	setBook(h !== "/");
	if (h === "/") {
		showSection(-1);
		return;
	}
	try {
		await refresh();
		if (mine !== token) return;
		let m;
		if (h === "/boards") await boardsScreen(view);
		else if (h === "/folders") foldersScreen(view);
		else if (h === "/new") newBoardScreen(view);
		else if (m = h.match(/^\/folder\/(.+)$/)) folderScreen(view, decodeURIComponent(m[1]));
		else if (m = h.match(/^\/board\/(.+)$/)) {
			const destroy = await boardScreen(view, decodeURIComponent(m[1]));
			if (mine !== token) destroy();
			else destroyCurrent = destroy;
		} else location.hash = "#/boards";
		if (mine === token) showSection(section, h === "/boards" || h === "/folders");
	} catch (e) {
		console.error(e);
		view.innerHTML = `<div class="screen"><p class="note center">Something went wrong. ${esc(e.message || "Try reloading.")}</p></div>`;
	}
}
window.addEventListener("hashchange", route);
if (suite && suite.get("board")) history.replaceState(null, "", `#/board/${encodeURIComponent(suite.get("board"))}`);
else if (suite && (location.hash || "#/") === "#/") history.replaceState(null, "", suite.at === "tags" ? "#/folders" : "#/boards");
else if (!suite && startPage() && (location.hash || "#/") === "#/") history.replaceState(null, "", startPage());
route().then(() => {
	setTimeout(carryOn, 2500);
	setTimeout(() => keepUp(), 4e3);
});
if (suite) {
	if (suite.firstVisit) setTimeout(() => {
		if (!document.querySelector(".sheet-overlay")) welcome("Ref", openIntro);
	}, 900);
} else if (!introSeen()) setTimeout(() => {
	if (!document.querySelector(".sheet-overlay")) openIntro();
}, 1200);
paintStickers().catch(console.error);
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("./sw.js").catch(() => {});
const holdUpright = () => {
	try {
		screen.orientation?.lock?.("portrait").catch(() => {});
	} catch {}
};
holdUpright();
document.addEventListener("visibilitychange", () => {
	if (!document.hidden) holdUpright();
});
