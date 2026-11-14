// Tags: Incoming, Favorites and All photos, then your own tags, each with
// its newest photo and how many it holds, on one page that scrolls.
import { lib, thumbUrl, photosIn, folderById, sortList } from '../data/library.js';
import { newFolder } from '../components/filing.js';
import { ICONS } from '../components/icons.js';
import { esc } from '../components/util.js';
import { bandHtml, wireBand } from '../components/band.js';

const CHEVRON = '<svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg>';
const SEARCH = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><line x1="16" y1="16" x2="20.5" y2="20.5"/></svg>';

export function foldersScreen(view) {
  const row = (f, cls = '') => {
    const list = sortList(photosIn(f.id), 'newest');
    return `
      <a class="tag-row ${cls}" href="#/folder/${esc(f.id)}" data-t data-name="${esc(f.name.toLowerCase())}">
        <span class="tag-thumb">${list[0] ? `<img src="${thumbUrl(list[0])}" alt="" loading="lazy" />` : ''}</span>
        <span class="tag-name">${esc(f.name)}</span>
        <span class="tag-count" aria-label="${list.length} ${list.length === 1 ? 'photo' : 'photos'}">${list.length.toLocaleString()}</span>
        ${CHEVRON}
      </a>`;
  };
  view.innerHTML = `
    <div class="screen has-band">
      <div class="scroll tag-rows">
        ${bandHtml({ title: 'Tags', place: 'Ref' })}
        ${lib.folders.length > 8 ? `<label class="find-box">${SEARCH}<input class="find" type="search" placeholder="Find a tag" autocomplete="off" /></label>` : ''}
        <div class="list-rule tag-top"></div>
        ${row(folderById('incoming'), 'special')}
        ${row(folderById('favorites'), 'special')}
        ${row(folderById('all'), 'special')}
        <div class="list-head tag-mine-head" data-mine><h2>Your tags <span>${lib.folders.length}</span></h2><button type="button" class="list-act" data-new>${ICONS.plus}New tag</button></div>
        <div class="list-rule" data-mine></div>
        ${lib.folders.map((f) => row(f, 'mine')).join('')}
      </div>
    </div>`;
  const rows = [...view.querySelectorAll('[data-t]')];
  const make = async () => { if (await newFolder()) foldersScreen(view); };
  wireBand(view);
  view.querySelector('[data-new]')?.addEventListener('click', make);
  // Finding shows only the tags that match.
  view.querySelector('.find')?.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    rows.forEach((r) => { r.hidden = !!q && !r.dataset.name.includes(q); });
  });
}
