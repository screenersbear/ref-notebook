// Tags: every folder (tag), a notebook page at a time.
import { lib, thumbUrl, photosIn, folderById, sortList } from '../data/library.js';
import { newFolder } from '../components/filing.js';
import { ICONS } from '../components/icons.js';
import { esc } from '../components/util.js';

// Tags come a notebook page at a time too; swipe to the next one.
export function foldersScreen(view) {
  const row = (f, cls = '') => {
    const list = sortList(photosIn(f.id), 'newest');
    return `
      <a class="row row-open ${cls}" href="#/folder/${esc(f.id)}" data-t data-name="${esc(f.name.toLowerCase())}">
        <span class="thumb">${list[0] ? `<img src="${thumbUrl(list[0])}" alt="" loading="lazy" />` : ''}</span>
        <span class="row-text"><span class="row-name">${esc(f.name)}</span><span class="row-meta">${list.length} ${list.length === 1 ? 'photo' : 'photos'}</span></span>
      </a>`;
  };
  view.innerHTML = `
    <div class="screen">
      <h1 class="head head-add">Tags<button type="button" class="icon-btn head-plus" data-new aria-label="New tag">${ICONS.plus}</button></h1>
      <div class="scroll rows tag-rows">
        ${lib.folders.length > 8 ? '<input class="find" type="search" placeholder="Find a tag" autocomplete="off" />' : ''}
        ${row(folderById('incoming'), 'marked')}
        ${row(folderById('favorites'))}
        ${row(folderById('all'))}
        ${lib.folders.map((f) => row(f, 'mine')).join('')}
      </div>
    </div>`;
  const rows = [...view.querySelectorAll('[data-t]')];
  view.querySelector('[data-new]').addEventListener('click', async () => { if (await newFolder()) foldersScreen(view); });
  // Finding shows only the tags that match.
  view.querySelector('.find')?.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    rows.forEach((r) => { r.hidden = !!q && !r.dataset.name.includes(q); });
  });
}
