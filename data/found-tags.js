// What Ref found in the photos (p.tags, from the tagger), as tags of their
// own on the Tags screen (Starky, 21 Nov: they showed on the photos but not
// in Tags). A found tag's id is 'found:<what>'. Only the words and the lists
// (unit tested: tests/unit/ref/found-tags.test.mjs).

export const FOUND = 'found:';
export const isFound = (id) => typeof id === 'string' && id.startsWith(FOUND) && id.length > FOUND.length;
export const labelOf = (id) => (isFound(id) ? id.slice(FOUND.length) : '');
export const foundId = (label) => `${FOUND}${label}`;
export const foundName = (label) => (label ? label.charAt(0).toUpperCase() + label.slice(1) : '');

const labels = (p) => (p && Array.isArray(p.tags) ? p.tags.filter((t) => typeof t === 'string' && t) : []);

// The photos Ref found this in.
export const withLabel = (photos, label) => (Array.isArray(photos) ? photos : []).filter((p) => labels(p).includes(label));

// Every found tag, most photos first, then A to Z: [{ id, name, label, count }].
export function foundTags(photos) {
  const counts = new Map();
  for (const p of Array.isArray(photos) ? photos : []) for (const t of new Set(labels(p))) counts.set(t, (counts.get(t) || 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
    .map(([label, count]) => ({ id: foundId(label), name: foundName(label), label, count }));
}

// The found tag for an id, while some photo still has it; else null.
export function foundFolder(photos, id) {
  const label = labelOf(id);
  return label && withLabel(photos, label).length ? { id, name: foundName(label), label, found: true } : null;
}

// A photo's found tags without this one (for "just the tag").
export const withoutLabel = (p, label) => labels(p).filter((t) => t !== label);
