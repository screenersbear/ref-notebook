// Line icons on a 24 x 24 grid, in the current text color.
const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const ICONS = {
  back: svg('<path d="M14.5 5l-7 7 7 7"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  x: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  expand: svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  more: svg('<circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/>'),
  boards: svg('<rect x="4" y="3.5" width="16" height="17"/><path d="M4 13.5h16M10 13.5v7"/>'),
  folders: svg('<path d="M3.5 12.5v-8h8l9 9-8 8z"/><circle cx="8" cy="9" r="1.2"/>'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>'),
  heart: svg('<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z"/>'),
  heartOn: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z"/></svg>`,
  file: svg('<path d="M3.5 12.5v-8h8l9 9-8 8z"/><path d="M12.5 11v5M10 13.5h5"/>'),
  trash: svg('<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>'),
  layout: svg('<rect x="4" y="3.5" width="16" height="17"/><path d="M4 13.5h16M9.3 13.5v7M14.7 13.5v7"/>'),
  text: svg('<path d="M5 7V4.5h14V7M12 4.5v15M9 19.5h6"/>'),
  undo: svg('<path d="M8 5L4 9l4 4M4 9h10a5.5 5.5 0 0 1 0 11H9"/>'),
  share: svg('<path d="M12 15V3M8 7l4-4 4 4M6 11H4.5v10h15V11H18"/>'),
  page: svg('<rect x="5" y="3.5" width="14" height="17"/><path d="M12 8.5v7M8.5 12h7"/>'),
};
