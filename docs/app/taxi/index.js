// docs/app/taxi/index.js
// Page script for /app/taxi/index.html
// Uses functions from ../../libs/lib.js

import {
  fetchAllAds,
  collectRegionsAndDistricts,
  escapeHtml,
  fmtDate,
  safeNum
} from '../../libs/lib.js';

let ALL_ADS = [];
let FILTERED = [];
let currentPage = 1;
let pageSize = 10;

const searchInput = document.getElementById('searchInput');
const fromRegion = document.getElementById('fromRegion');
const fromDistrict = document.getElementById('fromDistrict');
const toRegion = document.getElementById('toRegion');
const toDistrict = document.getElementById('toDistrict');
const minPrice = document.getElementById('minPrice');
const maxPrice = document.getElementById('maxPrice');
const sortBy = document.getElementById('sortBy');
const filterBtn = document.getElementById('filterBtn');
const resetBtn = document.getElementById('resetBtn');
const adsBody = document.getElementById('adsBody');
const loadingEl = document.getElementById('loading');
const adsTableWrap = document.getElementById('adsTableWrap');
const emptyEl = document.getElementById('empty');
const paginationInfo = document.getElementById('paginationInfo');
const prevPage = document.getElementById('prevPage');
const nextPage = document.getElementById('nextPage');

async function init() {
  showLoading(true);
  ALL_ADS = await fetchAllAds(); // from libs
  showLoading(false);

  populateFilters(ALL_ADS);
  applyFilters();
  attachEvents();
}

function showLoading(flag) {
  loadingEl.style.display = flag ? 'block' : 'none';
  adsTableWrap.style.display = flag ? 'none' : 'block';
}

function populateFilters(adItems) {
  const { fromRegions, toRegions, fromDistricts, toDistricts } = collectRegionsAndDistricts(adItems);

  function fill(sel, arr, label) {
    // keep existing selected value if any
    const cur = sel.value || '';
    sel.innerHTML = `<option value="">${label}</option>`;
    arr.forEach(v => {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = v;
      sel.appendChild(o);
    });
    try { sel.value = cur; } catch(e) {}
  }

  fill(fromRegion, fromRegions, 'Barchasi');
  fill(toRegion, toRegions, 'Barchasi');
  fill(fromDistrict, fromDistricts, 'From district');
  fill(toDistrict, toDistricts, 'To district');
}

function applyFilters(resetPage = true) {
  const q = (searchInput.value || '').trim().toLowerCase();
  const fr = (fromRegion.value || '').trim().toLowerCase();
  const tr = (toRegion.value || '').trim().toLowerCase();
  const fd = (fromDistrict.value || '').trim().toLowerCase();
  const td = (toDistrict.value || '').trim().toLowerCase();
  const minP = safeNum(minPrice.value, 0);
  const maxP = safeNum(maxPrice.value, Number.MAX_SAFE_INTEGER);
  const sortVal = sortBy.value || 'createdAt_desc';

  FILTERED = ALL_ADS.filter(item => {
    const d = item.data || {};

    if (q) {
      const haystack = [
        d.comment || '',
        d.fromRegion || '',
        d.toRegion || '',
        d.fromDistrict || '',
        d.toDistrict || '',
        d.userId || '',
        d.price || ''
      ].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (fr && !((d.fromRegion || '').toLowerCase().includes(fr))) return false;
    if (tr && !((d.toRegion || '').toLowerCase().includes(tr))) return false;
    if (fd && !((d.fromDistrict || '').toLowerCase().includes(fd))) return false;
    if (td && !((d.toDistrict || '').toLowerCase().includes(td))) return false;

    const priceVal = safeNum(d.price, 0);
    if (priceVal < minP) return false;
    if (priceVal > maxP) return false;

    return true;
  });

  // sort
  const [field, dir] = sortVal.split('_');
  FILTERED.sort((a, b) => {
    const A = (a.data && a.data[field]) ? a.data[field] : 0;
    const B = (b.data && b.data[field]) ? b.data[field] : 0;
    if (field === 'price' || field === 'createdAt') {
      const na = safeNum(A, 0);
      const nb = safeNum(B, 0);
      return dir === 'asc' ? na - nb : nb - na;
    } else {
      const sa = String(A || '').toLowerCase();
      const sb = String(B || '').toLowerCase();
      return dir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
    }
  });

  if (resetPage) currentPage = 1;
  renderPage();
}

function renderPage() {
  const total = FILTERED.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * pageSize;
  const pageSlice = FILTERED.slice(start, start + pageSize);

  adsBody.innerHTML = '';

  if (!pageSlice || pageSlice.length === 0) {
    emptyEl.style.display = 'block';
    adsTableWrap.style.display = 'none';
    paginationInfo.textContent = `${currentPage} / ${totalPages} — ${total} e'lon`;
    return;
  }

  emptyEl.style.display = 'none';
  adsTableWrap.style.display = 'block';

  pageSlice.forEach((item, idx) => {
    const d = item.data || {};
    const tr = document.createElement('tr');

    const created = fmtDate(d.createdAt);
    const cat = d.category || d.type || 'taxi';
    const seats = d.seats || d.driverSeats || '';
    const price = d.price || '';

    tr.innerHTML = `
      <td>${start + idx + 1}</td>
      <td>${escapeHtml(d.fromRegion || '')}<div class="muted">${escapeHtml(d.fromDistrict || '')}</div></td>
      <td>${escapeHtml(d.toRegion || '')}<div class="muted">${escapeHtml(d.toDistrict || '')}</div></td>
      <td>${escapeHtml(seats)}</td>
      <td>${escapeHtml(price)}</td>
      <td>${escapeHtml(cat)}</td>
      <td>${escapeHtml(created)}</td>
      <td>
        <button class="btn btn-primary btn-view" data-id="${item.id}" data-user="${item.userId}">Ko'rish</button>
      </td>
    `;
    adsBody.appendChild(tr);
  });

  // attach view handlers
  adsBody.querySelectorAll('.btn-view').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const uid = btn.getAttribute('data-user');
      const item = ALL_ADS.find(x => x.id === id && x.userId === uid);
      if (!item) return alert('Bu e\'lon topilmadi');
      const d = item.data || {};
      const lines = [
        `ID: ${item.id}`,
        `User: ${item.userId}`,
        `From: ${d.fromRegion || '-'} / ${d.fromDistrict || '-'}`,
        `To: ${d.toRegion || '-'} / ${d.toDistrict || '-'}`,
        `Seats: ${d.seats || d.driverSeats || '-'}`,
        `Price: ${d.price || '-'}`,
        `Created: ${fmtDate(d.createdAt)}`,
        `Comment: ${d.comment || '-'}`
      ];
      alert(lines.join('\n'));
    });
  });

  paginationInfo.textContent = `${currentPage} / ${totalPages} — ${total} e'lon`;
}

function attachEvents() {
  filterBtn.addEventListener('click', () => applyFilters(true));
  resetBtn.addEventListener('click', () => {
    searchInput.value = '';
    fromRegion.value = '';
    fromDistrict.value = '';
    toRegion.value = '';
    toDistrict.value = '';
    minPrice.value = '';
    maxPrice.value = '';
    sortBy.value = 'createdAt_desc';
    applyFilters();
  });

  prevPage.addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; renderPage(); }
  });

  nextPage.addEventListener('click', () => {
    const totalPages = Math.max(1, Math.ceil(FILTERED.length / pageSize));
    if (currentPage < totalPages) { currentPage++; renderPage(); }
  });

  // quick apply on enter in search
  searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') applyFilters(true); });
}

document.addEventListener('DOMContentLoaded', init);
