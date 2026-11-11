// The undo button: one list for filing, favorites and deleting, newest last.
import { refresh } from './library.js';
import { toast } from './ui.js';

const stack = [];
export const canUndo = () => stack.length > 0;
const changed = () => window.dispatchEvent(new Event('ref-undo'));

export function remember(label, run) {
  stack.push({ label, run });
  if (stack.length > 30) stack.shift();
  changed();
}
export async function undoLast() {
  const last = stack.pop();
  if (!last) return false;
  try {
    await last.run();
    await refresh();
    toast(`Undid: ${last.label}`);
  } catch (e) {
    console.error(e);
    toast('Could not undo that');
  }
  changed();
  return true;
}
