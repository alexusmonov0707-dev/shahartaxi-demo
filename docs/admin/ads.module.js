// ads.module.js
// Full admin ads module — Firebase v10 ESM compatible
// Place this file in the same folder as firebase.js and ads.html
// Usage: <script type="module" src="./firebase.js"></script> <script type="module" src="./ads.module.js"></script>

console.log('ADS MODULE LOADED');

import { db, ref, get, onValue, remove as fbRemove } from './firebase.js';

// -------------------------------
// Utilities
// -------------------------------
function el(id) { return document.getElementById(id); }

function fmtDate(ts) {
  if (ts === undefined || ts === null) return '—';
  const d = new Date(Number(ts));
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function safeNum(v, def = 0) {
  const n = Number(v);
  return isNaN(n) ? def : n;
}

function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function csvSafe(value) {
  if (value === null || value === undefined) return '';
  const s = String(value).replace(/"/g, '""');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s}"`;
  }
  return s;
}

function normStr(v){
  if (v === null || v === undefined) return '';
  return String(v).trim().toLowerCase();
}

// -------------------------------
// DOM refs (safe)
const searchInput = el('searchInput');
const fromRegionFilter = el('fromRegionFilter');
const toRegionFilter = el('toRegionFilter');
const fromDistrictFilter = el('fromDistrictFilter');
const toDistrictFilter = el('toDistrictFilter');
const minPrice = el('minPrice');
const maxPrice = el('maxPrice');
const seatsFilter = el('seatsFilter');
const categoryFilter = el('categoryFilter');
const dateFrom = el('dateFrom');
const dateTo = el('dateTo');
const userIdFilter = el('userIdFilter');

const applyFiltersBtn = el('applyFiltersBtn');
const resetFiltersBtn = el('resetFiltersBtn');

const sortBy = el('sortBy');
const pageSize = el('pageSize');
const prevPageBtn = el('prevPageBtn');
const nextPageBtn = el('nextPageBtn');
const paginationInfo = el('paginationInfo');

const tableWrap = el('tableWrap');
const adsTableBody = el('adsTableBody');
const loadingSkeleton = el('loadingSkeleton');

const realtimeToggle = el('realtimeToggle');
const btnExportCsv = el('btnExportCsv');

if (!adsTableBody) {
  console.warn('ads.module.js: #adsTableBody not found');
}

// -------------------------------
// State
let ALL_ADS = []; // array of { id, userId(optional), data }
let FILTERED = [];
let currentPage = 1;
let currentPageSize = Number((pageSize && pageSize.value) || 50);
let realtimeAttached = false;
const ADS_REF = ref(db, 'ads');

// -------------------------------
// Detect ad-like object
function isAdObject(o) {
  return o && typeof o === 'object' && (o.createdAt !== undefined || o.fromRegion !== undefined || o.toRegion !== undefined || o.price !== undefined || o.seats !== undefined || o.driverSeats !== undefined);
}

// -------------------------------
// Flatten function supports:
// 1) ads / adId -> data
// 2) ads / userId / adId -> data
// 3) ads / category / adId -> data
// 4) deeper nested variants (attempts)
function flattenValue(root) {
  const results = [];
  if (!root || typeof root !== 'object') return results;

  Object.entries(root).forEach(([k1, v1]) => {
    // 1-level: ads/adId -> data
    if (isAdObject(v1)) {
      results.push({ id: k1, data: v1 });
      return;
    }
    // 2-level: ads/userId/adId or ads/category/adId
    if (v1 && typeof v1 === 'object') {
      Object.entries(v1).forEach(([k2, v2]) => {
        if (isAdObject(v2)) {
          // attach userId when possible
          results.push({ id: k2, userId: (typeof k1 === 'string') ? k1 : undefined, data: v2 });
          return;
        }
        // 3-level: ads/userId/category/adId
        if (v2 && typeof v2 === 'object') {
          Object.entries(v2).forEach(([k3, v3]) => {
            if (isAdObject(v3)) {
              results.push({ id: k3, userId: k1, data: v3 });
            }
          });
        }
      });
    }
  });

  return results;
}

// -------------------------------
// Load once
async function loadOnce() {
  try {
    if (loadingSkeleton) loadingSkeleton.style.display = 'block';
    if (tableWrap) tableWrap.classList.add && tableWrap.classList.add('hidden');

    const snap = await get(ADS_REF);
    let root = {};
    if (snap && typeof snap.val === 'function') {
      root = snap.val() || {};
    } else {
      root = snap || {};
    }

    ALL_ADS = flattenValue(root);
    ALL_ADS.forEach(it => { if (!it.data.category) it.data.category = it.data.type || 'taxi'; });

    fillFilterOptions();
    applyFilters(false);
  } catch (err) {
    console.error('loadOnce error', err);
  } finally {
    if (loadingSkeleton) loadingSkeleton.style.display = 'none';
    if (tableWrap) tableWrap.classList.remove && tableWrap.classList.remove('hidden');
  }
}

// -------------------------------
// Realtime attach
function attachRealtime() {
  if (realtimeAttached) return;
  try {
    onValue(ADS_REF, snapshot => {
      let root = {};
      if (snapshot && typeof snapshot.val === 'function') root = snapshot.val() || {};
      else root = snapshot || {};
      ALL_ADS = flattenValue(root);
      ALL_ADS.forEach(it => { if (!it.data.category) it.data.category = it.data.type || 'taxi'; });
      fillFilterOptions();
      applyFilters(false);
    }, err => {
      console.error('onValue error', err);
    });
    realtimeAttached = true;
  } catch (e) {
    console.error('attachRealtime failed', e);
  }
}

// -------------------------------
// Fill filter selects
function fillFilterOptions() {
  if (!fromRegionFilter || !toRegionFilter || !fromDistrictFilter || !toDistrictFilter || !categoryFilter) return;

  const fromSet = new Set();
  const toSet = new Set();
  const fdSet = new Set();
  const tdSet = new Set();
  const catSet = new Set();

  ALL_ADS.forEach(it => {
    const d = it.data || {};
    if (d.fromRegion) fromSet.add(String(d.fromRegion).trim());
    if (d.toRegion) toSet.add(String(d.toRegion).trim());
    if (d.fromDistrict) fdSet.add(String(d.fromDistrict).trim());
    if (d.toDistrict) tdSet.add(String(d.toDistrict).trim());
    if (d.category) catSet.add(String(d.category).trim());
  });

  function populate(sel, set) {
    if (!sel) return;
    const cur = sel.value || '';
    sel.innerHTML = '<option value="">Hammasi</option>';
    Array.from(set).sort().forEach(v => {
      const o = document.createElement('option');
      o.value = v; o.innerText = v;
      sel.appendChild(o);
    });
    try { sel.value = cur; } catch(e) {}
  }

  populate(fromRegionFilter, fromSet);
  populate(toRegionFilter, toSet);
  populate(fromDistrictFilter, fdSet);
  populate(toDistrictFilter, tdSet);

  // categories: defaults + discovered
  const curCat = categoryFilter.value || '';
  categoryFilter.innerHTML = '<option value="">Hammasi</option>';
  const defaultCats = ['taxi','cargo','delivery'];
  defaultCats.forEach(c => {
    const o = document.createElement('option'); o.value = c; o.innerText = c.charAt(0).toUpperCase() + c.slice(1);
    categoryFilter.appendChild(o);
  });
  Array.from(catSet).sort().forEach(c => {
    if (!defaultCats.includes(c)) {
      const o = document.createElement('option'); o.value = c; o.innerText = c;
      categoryFilter.appendChild(o);
    }
  });
  try { categoryFilter.value = curCat; } catch(e) {}
}

// -------------------------------
// FILTERS Implementation
function applyFilters(resetPage = true) {
  const q = (searchInput && searchInput.value || '').trim().toLowerCase();
  const fr = (fromRegionFilter && fromRegionFilter.value || '').trim().toLowerCase();
  const tr = (toRegionFilter && toRegionFilter.value || '').trim().toLowerCase();
  const fd = (fromDistrictFilter && fromDistrictFilter.value || '').trim().toLowerCase();
  const td = (toDistrictFilter && toDistrictFilter.value || '').trim().toLowerCase();
  const cat = (categoryFilter && categoryFilter.value || '').trim().toLowerCase();
  const uid = (userIdFilter && userIdFilter.value || '').trim().toLowerCase();

  const minP = safeNum(minPrice && minPrice.value, 0);
  const maxP = safeNum(maxPrice && maxPrice.value, Number.MAX_SAFE_INTEGER);

  let seats = 0;
  if (seatsFilter && seatsFilter.value) {
    const parsed = Number(String(seatsFilter.value).replace('+','').trim());
    seats = isNaN(parsed) ? 0 : parsed;
  }

  let dateStart = null, dateEnd = null;
  if (dateFrom && dateFrom.value) dateStart = new Date(dateFrom.value + 'T00:00:00').getTime();
  if (dateTo && dateTo.value) dateEnd = new Date(dateTo.value + 'T23:59:59').getTime();

  FILTERED = ALL_ADS.filter(item => {
    const d = item.data || {};

    if (q) {
      const text = [
        d.comment || '',
        d.fromRegion || '',
        d.fromDistrict || '',
        d.toRegion || '',
        d.toDistrict || '',
        d.userId || '',
        d.price || ''
      ].join(' ').toLowerCase();
      if (!text.includes(q)) return false;
    }

    if (fr && fr !== 'hammasi' && normStr(d.fromRegion) !== fr) return false;
    if (tr && tr !== 'hammasi' && normStr(d.toRegion) !== tr) return false;
    if (fd && fd !== 'hammasi' && normStr(d.fromDistrict) !== fd) return false;
    if (td && td !== 'hammasi' && normStr(d.toDistrict) !== td) return false;

    const thisCat = normStr(d.category || d.type || 'taxi');
    if (cat && thisCat !== cat) return false;

    if (uid && !((d.userId || '').toLowerCase().includes(uid))) return false;

    const priceVal = safeNum(d.price, 0);
    if (priceVal < minP) return false;
    if (priceVal > maxP) return false;

    const seatsVal = safeNum(d.seats || d.driverSeats, 0);
    if (seats && seatsVal < seats) return false;

    if (dateStart || dateEnd) {
      const created = safeNum(d.createdAt, 0);
      if (dateStart && created < dateStart) return false;
      if (dateEnd && created > dateEnd) return false;
    }

    return true;
  });

  sortFiltered();
  if (resetPage) currentPage = 1;
  renderTable();
}

// -------------------------------
// Sorting
function sortFiltered() {
  const val = (sortBy && sortBy.value) || 'createdAt_desc';
  const [field, dir] = val.split('_');
  FILTERED.sort((a,b) => {
    const A = a.data[field];
    const B = b.data[field];
    if (field === 'price' || field === 'seats' || field === 'createdAt') {
      const na = safeNum(A), nb = safeNum(B);
      return dir === 'asc' ? na - nb : nb - na;
    }
    const sa = String(A || '').toLowerCase(), sb = String(B || '').toLowerCase();
    return dir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
  });
}
// ===============================
// RENDER TABLE
// ===============================
function renderTable() {
  if (!adsTableBody) return;

  currentPageSize = Number(pageSize && pageSize.value || 50);
  const total = FILTERED.length;
  const totalPages = Math.max(1, Math.ceil(total / currentPageSize));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * currentPageSize;
  const end = start + currentPageSize;
  const pageItems = FILTERED.slice(start, end);

  adsTableBody.innerHTML = '';

  if (pageItems.length === 0) {
    adsTableBody.innerHTML = `<tr><td colspan="8">Hech nima topilmadi</td></tr>`;
  } else {
    pageItems.forEach((item, idx) => {
      const d = item.data || {};
      const tr = document.createElement('tr');

      tr.innerHTML = `
        <td>${start + idx + 1}</td>
        <td>${escapeHtml(d.fromRegion || '')} – ${escapeHtml(d.fromDistrict || '')}</td>
        <td>${escapeHtml(d.toRegion || '')} – ${escapeHtml(d.toDistrict || '')}</td>
        <td>${escapeHtml(d.seats || d.driverSeats || '—')}</td>
        <td>${escapeHtml(d.price || '—')}</td>
        <td>${escapeHtml(d.category || d.type || 'taxi')}</td>
        <td>${fmtDate(d.createdAt)}</td>
        <td>
          <button class="btn btn-danger" data-del="${item.userId || 'root'}:${item.id}">
            O'chirish
          </button>
        </td>
      `;

      adsTableBody.appendChild(tr);
    });
  }

  if (paginationInfo) {
    paginationInfo.textContent = `${currentPage} / ${totalPages} sahifa — ${total} e'lon`;
  }
}

// ===============================
// DELETE AD
// ===============================
async function handleDelete(pathKey) {
  const [uid, adId] = pathKey.split(':');

  let delPath;
  if (uid === 'root') delPath = `ads/${adId}`;
  else delPath = `ads/${uid}/${adId}`;

  if (!confirm("Rostdan ham o'chirmoqchimisiz?")) return;

  try {
    await fbRemove(ref(db, delPath));
    alert("O'chirildi");
  } catch (err) {
    console.error('Delete error:', err);
    alert("Xatolik!");
  }
}

// ===============================
// CSV EXPORT
// ===============================
function exportCSV() {
  if (!FILTERED.length) {
    alert("Eksport uchun ma'lumot yo'q");
    return;
  }

  let rows = [
    [
      "id", "userId", "fromRegion", "fromDistrict",
      "toRegion", "toDistrict", "seats",
      "price", "category", "comment", "createdAt"
    ]
  ];

  FILTERED.forEach(it => {
    const d = it.data || {};
    rows.push([
      csvSafe(it.id),
      csvSafe(it.userId || ''),
      csvSafe(d.fromRegion),
      csvSafe(d.fromDistrict),
      csvSafe(d.toRegion),
      csvSafe(d.toDistrict),
      csvSafe(d.seats || d.driverSeats),
      csvSafe(d.price),
      csvSafe(d.category || d.type),
      csvSafe(d.comment),
      csvSafe(fmtDate(d.createdAt))
    ]);
  });

  let csv = rows.map(r => r.join(',')).join('\n');
  let blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  let url = URL.createObjectURL(blob);

  let a = document.createElement("a");
  a.href = url;
  a.download = "ads_export.csv";
  a.click();

  URL.revokeObjectURL(url);
}

// ===============================
// INIT & EVENTS
// ===============================
function initEvents() {
  if (applyFiltersBtn) applyFiltersBtn.onclick = () => applyFilters(true);
  if (resetFiltersBtn)
    resetFiltersBtn.onclick = () => {
      searchInput.value = "";
      [fromRegionFilter, toRegionFilter, fromDistrictFilter, toDistrictFilter,
       seatsFilter, categoryFilter, userIdFilter].forEach(s => s.value = "");

      minPrice.value = "0";
      maxPrice.value = "99999999";
      dateFrom.value = "";
      dateTo.value = "";

      applyFilters(true);
    };

  if (sortBy) sortBy.onchange = () => applyFilters(false);
  if (pageSize) pageSize.onchange = () => { currentPage = 1; renderTable(); };

  if (prevPageBtn) prevPageBtn.onclick = () => {
    currentPage--;
    if (currentPage < 1) currentPage = 1;
    renderTable();
  };

  if (nextPageBtn) nextPageBtn.onclick = () => {
    currentPage++;
    renderTable();
  };

  // Delete handler
  if (adsTableBody) {
    adsTableBody.onclick = e => {
      const btn = e.target.closest('button[data-del]');
      if (!btn) return;
      handleDelete(btn.dataset.del);
    };
  }

  if (btnExportCsv) btnExportCsv.onclick = exportCSV;

  if (realtimeToggle) {
    realtimeToggle.onchange = () => {
      if (realtimeToggle.checked) attachRealtime();
      else loadOnce();
    };
  }
}

// ===============================
// BOOTSTRAP
// ===============================
(async function start() {
  try {
    console.log("ADS MODULE INITIALIZED");

    initEvents();

    await loadOnce();

    if (realtimeToggle && realtimeToggle.checked) {
      attachRealtime();
    }
  } catch (err) {
    console.error("INIT ERROR:", err);
  }
})();
