/* ── Chaz RR Archive — app.js ── */

const PAGE_SIZE = 60;

let allPhotos = [];        // full list from photos.json
let filteredPhotos = [];   // after filter applied
let displayedCount = 0;

let allOutfits = [];       // list of avatar outfit images
let outfitDescs = {};      // from descriptions.json

// lightbox state
let lbItems = [];          // current items array (photos or outfits)
let lbIndex = 0;           // current index in lbItems
let lbType = 'photo';      // 'photo' or 'outfit'

// filter state
let filterAfter = null;
let filterBefore = null;
let sortOrder = 'newest';

/* ──────────────────────────────────────────
   INIT
────────────────────────────────────────── */
async function init() {
  setupTabs();
  setupLightbox();
  await loadPhotos();
  await loadOutfits();
}

/* ──────────────────────────────────────────
   TABS
────────────────────────────────────────── */
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });
}

/* ──────────────────────────────────────────
   PHOTOS
────────────────────────────────────────── */
async function loadPhotos() {
  allPhotos = window.PHOTOS_DATA || [];
  setupFilter();
  applyFilter();
}

function setupFilter() {
  const toggle = document.getElementById('filterToggle');
  const panel  = document.getElementById('filterPanel');
  const useAfter  = document.getElementById('useAfter');
  const useBefore = document.getElementById('useBefore');
  const afterDate  = document.getElementById('afterDate');
  const beforeDate = document.getElementById('beforeDate');

  toggle.addEventListener('click', () => panel.classList.toggle('hidden'));
  document.getElementById('filterClose').addEventListener('click', () => panel.classList.add('hidden'));

  useAfter.addEventListener('change', () => { afterDate.disabled = !useAfter.checked; });
  useBefore.addEventListener('change', () => { beforeDate.disabled = !useBefore.checked; });

  document.getElementById('filterApply').addEventListener('click', () => {
    filterAfter  = (useAfter.checked  && afterDate.value)  ? afterDate.value  : null;
    filterBefore = (useBefore.checked && beforeDate.value) ? beforeDate.value : null;
    sortOrder    = document.getElementById('sortBy').value;
    applyFilter();
    panel.classList.add('hidden');
  });

  document.getElementById('filterReset').addEventListener('click', () => {
    useAfter.checked  = false; afterDate.disabled  = true; afterDate.value  = '';
    useBefore.checked = false; beforeDate.disabled = true; beforeDate.value = '';
    document.getElementById('sortBy').value = 'newest';
    filterAfter = null; filterBefore = null; sortOrder = 'newest';
    applyFilter();
  });

  document.getElementById('loadMoreBtn').addEventListener('click', renderNextPage);
}

const NUM_COLS = 3;

function applyFilter() {
  let list = [...allPhotos];

  if (filterAfter)  list = list.filter(p => p.iso >= filterAfter);
  if (filterBefore) list = list.filter(p => p.iso <= filterBefore + 'T23:59:59');

  if (sortOrder === 'oldest') {
    list.sort((a, b) => a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0);
  } else {
    list.sort((a, b) => b.iso < a.iso ? -1 : b.iso > a.iso ? 1 : 0);
  }

  filteredPhotos = list;
  displayedCount = 0;

  const grid = document.getElementById('photoGrid');
  grid.innerHTML = '';

  if (filteredPhotos.length === 0) {
    grid.innerHTML = '<div class="loading-msg">No photos match the filter.</div>';
    document.getElementById('photoCount').textContent = '0 photos';
    document.getElementById('loadMoreBtn').classList.add('hidden');
    return;
  }

  document.getElementById('photoCount').textContent = `${filteredPhotos.length} photo${filteredPhotos.length !== 1 ? 's' : ''}`;

  // create fixed column divs
  for (let i = 0; i < NUM_COLS; i++) {
    const col = document.createElement('div');
    col.className = 'photo-col';
    col.id = `photoCol${i}`;
    grid.appendChild(col);
  }

  lbItems = filteredPhotos;
  lbType = 'photo';

  renderNextPage();
}

function renderNextPage() {
  const batch = filteredPhotos.slice(displayedCount, displayedCount + PAGE_SIZE);

  batch.forEach((photo, batchIdx) => {
    const globalIdx = displayedCount + batchIdx;
    const col = document.getElementById(`photoCol${globalIdx % NUM_COLS}`);
    const card = makePhotoCard(photo, globalIdx);
    col.appendChild(card);
  });

  displayedCount += batch.length;

  const btn = document.getElementById('loadMoreBtn');
  if (displayedCount < filteredPhotos.length) {
    btn.classList.remove('hidden');
    btn.textContent = `Load More (${filteredPhotos.length - displayedCount} remaining)`;
  } else {
    btn.classList.add('hidden');
  }
}

function makePhotoCard(photo, idx) {
  const card = document.createElement('div');
  card.className = 'photo-card';
  card.innerHTML = `
    <img src="RRphotos/${photo.file}" alt="" loading="lazy" />
    <div class="photo-card-overlay">
      <span class="photo-card-date">${photo.display}</span>
    </div>
  `;
  card.addEventListener('click', () => openLightbox(idx, 'photo', filteredPhotos));
  return card;
}

/* ──────────────────────────────────────────
   OUTFITS
────────────────────────────────────────── */
async function loadOutfits() {
  outfitDescs = window.OUTFIT_DESCS || {};
  allOutfits  = window.OUTFITS_DATA || [];

  const grid = document.getElementById('outfitGrid');
  grid.innerHTML = '';

  if (allOutfits.length === 0) {
    grid.innerHTML = '<div class="loading-msg">No outfit photos yet — drop images into the avatarphotos/ folder.</div>';
    return;
  }

  for (let i = 0; i < NUM_COLS; i++) {
    const col = document.createElement('div');
    col.className = 'photo-col';
    grid.appendChild(col);
  }

  allOutfits.forEach((file, idx) => {
    const name = file.replace(/\.[^.]+$/, '');
    const card = document.createElement('div');
    card.className = 'photo-card';
    card.innerHTML = `
      <img src="avatarphotos/${file}" alt="${name}" loading="lazy" />
      <div class="photo-card-overlay">
        <span class="photo-card-date">${name}</span>
      </div>
    `;
    card.addEventListener('click', () => openLightbox(idx, 'outfit', allOutfits));
    grid.children[idx % NUM_COLS].appendChild(card);
  });
}

/* ──────────────────────────────────────────
   LIGHTBOX
────────────────────────────────────────── */
function setupLightbox() {
  document.getElementById('lightboxOverlay').addEventListener('click', closeLightbox);
  document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
  document.getElementById('lightboxPrev').addEventListener('click', () => shiftLightbox(-1));
  document.getElementById('lightboxNext').addEventListener('click', () => shiftLightbox(+1));

  document.addEventListener('keydown', e => {
    const lb = document.getElementById('lightbox');
    if (lb.classList.contains('hidden')) return;
    if (e.key === 'Escape')      closeLightbox();
    if (e.key === 'ArrowLeft')   shiftLightbox(-1);
    if (e.key === 'ArrowRight')  shiftLightbox(+1);
  });
}

function openLightbox(idx, type, items) {
  lbItems = items;
  lbIndex = idx;
  lbType  = type;
  renderLightbox();
  document.getElementById('lightbox').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  document.getElementById('lightbox').classList.add('hidden');
  document.body.style.overflow = '';
}

function shiftLightbox(delta) {
  lbIndex = (lbIndex + delta + lbItems.length) % lbItems.length;
  renderLightbox();
}

function renderLightbox() {
  const img  = document.getElementById('lightboxImg');
  const meta = document.getElementById('lightboxMeta');

  if (lbType === 'photo') {
    const photo = lbItems[lbIndex];
    img.src = `RRphotos/${photo.file}`;
    img.alt = photo.file;
    meta.innerHTML = `
      <span class="meta-name">${photo.file}</span>
      ${photo.display ? `<span>Taken: ${photo.display}</span>` : ''}
      <span style="color:#666;font-size:0.75rem;margin-top:2px;display:block">${lbIndex + 1} / ${lbItems.length}</span>
    `;
  } else {
    // outfit
    const file = lbItems[lbIndex];
    const name = file.replace(/\.[^.]+$/, '');
    const desc = outfitDescs[name] || '';
    img.src = `avatarphotos/${file}`;
    img.alt = name;
    meta.innerHTML = `
      <span class="meta-name">${name}</span>
      ${desc ? `<span class="meta-desc">${desc}</span>` : ''}
      <span style="color:#666;font-size:0.75rem;margin-top:2px;display:block">${lbIndex + 1} / ${lbItems.length}</span>
    `;
  }
}

/* ──────────────────────────────────────────
   UTILS
────────────────────────────────────────── */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

/* ──────────────────────────────────────────
   START
────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', init);
