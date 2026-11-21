// The first time Ref is opened (user, 11-20): a walk through bringing photos
// into Incoming, then tagging them. Which step it's on is kept on this phone;
// these are only that and the words (unit tested: tests/unit/ref/first-guide.test.mjs).

const KEY = 'ref-first-photos';
export const STEPS = ['pick', 'tag'];

// The step it's on ('pick' or 'tag'), or '' when it's not on (or the store can't be read).
export function guideStep(store) {
  try {
    const v = store && store.getItem(KEY);
    return STEPS.includes(v) ? v : '';
  } catch { return ''; }
}

// Puts it on a step, or ends it for anything else. False when the store can't be written.
export function setGuide(store, step) {
  try {
    if (STEPS.includes(step)) store.setItem(KEY, step);
    else store.removeItem(KEY);
    return true;
  } catch { return false; }
}

// Only someone with no photos in yet is walked through.
export const wantsGuide = (photoCount) => photoCount === 0;

// Once photos come in on the first step, the second.
export const afterImport = (step, added) => (step === 'pick' && Number.isFinite(added) && added > 0 ? 'tag' : step);

// What the note says on each step; null on none.
const WORDS = {
  pick: { count: 'Step 1 of 2', title: 'Bring your photos in', line: 'Tap Open your phone’s photos and pick a few. Ref keeps its own copy.', done: 'Skip' },
  tag: { count: 'Step 2 of 2', title: 'Now tag them', line: 'Tap Select, pick some photos, then Tag. Your tags are where mood boards come from.', done: 'Got it' },
};
export const guideWords = (step) => (Object.hasOwn(WORDS, String(step)) ? WORDS[step] : null);
