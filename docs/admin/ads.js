/* ads.js — patched full version
   - Keeps original structure, only fixes:
     * flattenAdsSnapshot -> supports 1/2/3-level structures
     * applyFilters -> strict region/district matching, robust seats parsing
     * minor defensive guards
*/

// -------------------------------
// Utilities
// -------------------------------
function el(id) { return document.getElementById(id); }
function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(Number(ts));
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}
function safeNum(v, def = 0) { const n = Number(v); return isNaN(n) ? def : n; }

// -------------------------------
// DOM refs (defensive: ensure elements exist)
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

// check DOM essentials
if (!adsTableBody || !loadingSkeleton || !tableWrap) {
  console.warn('ads.js: required DOM elements not found. Make sure ads.html contains expected IDs.');
}

// -------------------------------
// State
// -------------------------------
let DB = null;                // firebase.database() instance (compat) or wrapper
let ALL_ADS = [];             // array of { id, data }
let FILTERED = [];            // after filter/search
let currentPage = 1;
let currentPageSize = Number((pageSize && pageSize.value) || 50);
let realtimeListenerAttached = false;
let adsRef = null;
let realtimeEnabled = realtimeToggle ? realtimeToggle.checked : false;

// -------------------------------
// Wait for firebase global to be available
// - supports: window.firebase (compat), window.db, global db
// -------------------------------
function waitForFirebaseReady(timeout = 7000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function check() {
      // 1) v8 compat: window.firebase && firebase.database is a function
      if (window.firebase && typeof window.firebase.database === 'function') {
        try {
          return resolve(window.firebase.database());
        } catch (e) {
          // continue to other options
        }
      }

      // 2) window.db exported by other firebase wrapper
      if (window.db && (typeof window.db.ref === 'function' || typeof window.db === 'object')) {
        return resolve(window.db);
      }

      // 3) modular `db` exported to global (some setups may attach "db" variable)
      if (window.hasOwnProperty('db') && window.db) {
        return resolve(window.db);
      }

      // 4) try to detect firebase-app-compat namespace (some bundles expose firebase.default)
      if (window.firebase && window.firebase.apps && window.firebase.apps.length && typeof window.firebase.database === 'function') {
        return resolve(window.firebase.database());
      }

      if (Date.now() - start > timeout) {
        return reject(new Error('Firebase not ready'));
      }
      setTimeout(check, 100);
    })();
  });
}

// -------------------------------
// Initialize
// -------------------------------
waitForFirebaseReady().then(db => {
  DB = db;
  init();
}).catch(err => {
  console.error('Firebase not ready:', err);
  if (loadingSkeleton) loadingSkeleton.style.display = 'block';
  if (tableWrap) tableWrap.classList.add('hidden');
  // Do not spam user with alert in production; keep console log visible.
});

// -------------------------------
// Helper: flatten snapshot into array of { id, data } supporting 1-/2-/3-level
// Supports:
// - ads -> adId -> adData
// - ads -> categoryId -> adId -> adData
// - ads -> userId -> adId -> adData  (3-level)
// - mixed nested objects
// -------------------------------
function isAdObject(obj) {
  return obj && typeof obj === 'object' && (obj.createdAt || obj.fromRegion || obj.toRegion || obj.price);
}

function flattenAdsSnapshot(snapshot) {
  const results = [];
  if (!snapshot) return results;

  const root = snapshot.val ? snapshot.val() : snapshot;
  if (!root || typeof root !== 'object') return results;

  Object.entries(root).forEach(([level1Key, level1Val]) => {

    // 1-LEVEL: ads/adId → data
    if (level1Val && typeof level1Val === 'object' &&
        (level1Val.createdAt || level1Val.fromRegion || level1Val.toRegion || level1Val.price)) {
      results.push({ id: level1Key, data: level1Val });
      return;
    }

    // 2-LEVEL: ads/category/adId → data
    if (level1Val && typeof level1Val === 'object') {
      Object.entries(level1Val).forEach(([level2Key, level2Val]) => {

        // data darajasi
        if (level2Val && typeof level2Val === 'object' &&
            (level2Val.createdAt || level2Val.fromRegion || level2Val.toRegion || level2Val.price)) {
          results.push({ id: level2Key, data: level2Val });
          return;
        }

        // 3-LEVEL: ads/userUid/randomAdId → data
        if (level2Val && typeof level2Val === 'object') {
          Object.entries(level2Val).forEach(([level3Key, level3Val]) => {
            if (level3Val && typeof level3Val === 'object' &&
                (level3Val.createdAt || level3Val.fromRegion || level3Val.toRegion || level3Val.price)) {
              results.push({ id: level3Key, data: level3Val });
            }
          });
        }
      });
    }
  });

  return results;
}


// -------------------------------
// Init UI interactions & load data
// -------------------------------
function init() {
  if (loadingSkeleton) { loadingSkeleton.style.display = 'block'; }
  if (tableWrap) { tableWrap.classList.add('hidden'); }

  // default page size
  currentPageSize = Number((pageSize && pageSize.value) || currentPageSize);

  // Live listeners
  if (realtimeEnabled) {
    attachRealtime();
  } else {
    loadOnce();
  }

  // events (safe attach)
  if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', () => applyFilters());
  if (resetFiltersBtn) resetFiltersBtn.addEventListener('click', () => resetFilters());
  if (searchInput) searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') applyFilters(); });
  if (pageSize) pageSize.addEventListener('change', () => { currentPageSize = Number(pageSize.value); currentPage = 1; renderTable(); });
  if (prevPageBtn) prevPageBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderTable(); }});
  if (nextPageBtn) nextPageBtn.addEventListener('click', () => { const totalPages = Math.max(1, Math.ceil(FILTERED.length / currentPageSize)); if (currentPage < totalPages) { currentPage++; renderTable(); }});
  if (sortBy) sortBy.addEventListener('change', () => applyFilters());
  if (realtimeToggle) realtimeToggle.addEventListener('change', (e) => {
    realtimeEnabled = e.target.checked;
    if (realtimeEnabled) attachRealtime();
    else detachRealtimeAndLoadOnce();
  });
  if (btnExportCsv) btnExportCsv.addEventListener('click', exportCSV);
}

// -------------------------------
// Attach real-time listener
// -------------------------------
function attachRealtime() {
  if (!DB) return;
  if (realtimeListenerAttached) return;

  // DB might be firebase.database() (compat) or a wrapper with ref()
  try {
    adsRef = (typeof DB.ref === 'function') ? DB.ref('ads') : DB.ref && DB.ref('ads');
  } catch (e) {
    // some wrappers provide DB as object but usage differs; try window.firebase
    if (window.firebase && typeof window.firebase.database === 'function') {
      adsRef = window.firebase.database().ref('ads');
    }
  }

  if (!adsRef || typeof adsRef.on !== 'function') {
    console.error('attachRealtime: adsRef not available or .on not function', adsRef);
    // fallback to loadOnce
    loadOnce();
    return;
  }

  adsRef.on('value', snapshot => {
    ALL_ADS = flattenAdsSnapshot(snapshot);
    // normalize category default
    ALL_ADS.forEach(item => {
      if (!item.data.category) item.data.category = item.data.type || 'taxi';
    });

    if (loadingSkeleton) loadingSkeleton.style.display = 'none';
    if (tableWrap) tableWrap.classList.remove('hidden');

    fillFilterOptions();
    // do not auto-filter on init with previous UI selections (keep behavior: show all)
    renderTableWithoutFiltering();
  }, err => {
    console.error('adsRef.on error', err);
  });

  realtimeListenerAttached = true;
}

// -------------------------------
// Detach real-time and do single load
// -------------------------------
function detachRealtimeAndLoadOnce() {
  if (adsRef && realtimeListenerAttached) {
    try { adsRef.off(); } catch (e) { console.warn('adsRef.off error', e); }
  }
  realtimeListenerAttached = false;
  loadOnce();
}

// -------------------------------
// Load once (non-realtime)
// -------------------------------
function loadOnce() {
  if (!DB) return;
  if (loadingSkeleton) loadingSkeleton.style.display = 'block';
  if (tableWrap) tableWrap.classList.add('hidden');

  // DB.ref('ads').once('value') style
  let onceRef;
  try {
    onceRef = (typeof DB.ref === 'function') ? DB.ref('ads') : DB.ref && DB.ref('ads');
  } catch (e) {
    if (window.firebase && typeof window.firebase.database === 'function') {
      onceRef = window.firebase.database().ref('ads');
    }
  }

  if (!onceRef || typeof onceRef.once !== 'function') {
    console.error('loadOnce: cannot read DB.ref("ads")');
    if (loadingSkeleton) loadingSkeleton.style.display = 'none';
    return;
  }

  onceRef.once('value').then(snapshot => {
    ALL_ADS = flattenAdsSnapshot(snapshot);
    ALL_ADS.forEach(item => { if (!item.data.category) item.data.category = item.data.type || 'taxi'; });

    if (loadingSkeleton) loadingSkeleton.style.display = 'none';
    if (tableWrap) tableWrap.classList.remove('hidden');

    fillFilterOptions();
    renderTableWithoutFiltering();
  }).catch(err => {
    console.error('loadOnce error', err);
    if (loadingSkeleton) loadingSkeleton.style.display = 'none';
  });
}

// -------------------------------
// Fill filter select options dynamically from ALL_ADS
// -------------------------------
function fillFilterOptions() {
  if (!fromRegionFilter || !toRegionFilter || !fromDistrictFilter || !toDistrictFilter || !categoryFilter) return;

  const fromRegSet = new Set();
  const toRegSet = new Set();
  const fromDistSet = new Set();
  const toDistSet = new Set();
  const catSet = new Set();

  ALL_ADS.forEach(({ id, data }) => {
    if (!data) return;
    if (data.fromRegion) fromRegSet.add(data.fromRegion);
    if (data.toRegion) toRegSet.add(data.toRegion);
    if (data.fromDistrict) fromDistSet.add(data.fromDistrict);
    if (data.toDistrict) toDistSet.add(data.toDistrict);
    if (data.category) catSet.add(data.category);
  });

  function populate(selectEl, set) {
    if (!selectEl) return;
    const cur = selectEl.value || '';
    selectEl.innerHTML = '<option value="">Hammasi</option>';
    Array.from(set).sort().forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.innerText = v;
      selectEl.appendChild(opt);
    });
    try { selectEl.value = cur; } catch(e) {}
  }

  populate(fromRegionFilter, fromRegSet);
  populate(toRegionFilter, toRegSet);
  populate(fromDistrictFilter, fromDistSet);
  populate(toDistrictFilter, toDistSet);

  // category
  const curCat = categoryFilter.value || '';
  categoryFilter.innerHTML = '<option value="">Hammasi</option>';
  const defaultCats = ['taxi','cargo','delivery'];
  defaultCats.forEach(c => {
    const o = document.createElement('option');
    o.value = c;
    o.innerText = c.charAt(0).toUpperCase() + c.slice(1);
    categoryFilter.appendChild(o);
  });
  Array.from(catSet).sort().forEach(c => {
    if (!defaultCats.includes(c)) {
      const o = document.createElement('option');
      o.value = c;
      o.innerText = c;
      categoryFilter.appendChild(o);
    }
  });
  try { categoryFilter.value = curCat; } catch(e){}
}

// -------------------------------
// Apply filters & search  (PATCHED - strict matching, robust seats parsing)
// -------------------------------
function applyFilters(resetPage = true) {
  if (!ALL_ADS) ALL_ADS = [];

  const q = (searchInput && searchInput.value || '').trim().toLowerCase();
  const fr = (fromRegionFilter && fromRegionFilter.value || '').trim().toLowerCase();
  const tr = (toRegionFilter && toRegionFilter.value || '').trim().toLowerCase();
  const fd = (fromDistrictFilter && fromDistrictFilter.value || '').trim().toLowerCase();
  const td = (toDistrictFilter && toDistrictFilter.value || '').trim().toLowerCase();
  const cat = (categoryFilter && categoryFilter.value || '').trim().toLowerCase();
  const userIdVal = (userIdFilter && userIdFilter.value || '').trim().toLowerCase();

  const minP = safeNum(minPrice && minPrice.value, 0);
  const maxP = safeNum(maxPrice && maxPrice.value, Number.MAX_SAFE_INTEGER);

  // seats: robust parse "1+", "2+", "3" etc.
  let seats = 0;
  if (seatsFilter && seatsFilter.value) {
    try {
      seats = Number(String(seatsFilter.value).replace('+','').trim());
      if (isNaN(seats)) seats = 0;
    } catch (e) { seats = 0; }
  }

  let dateStart = null, dateEnd = null;
  if (dateFrom && dateFrom.value) dateStart = new Date(dateFrom.value + 'T00:00:00').getTime();
  if (dateTo && dateTo.value) dateEnd = new Date(dateTo.value + 'T23:59:59').getTime();

  FILTERED = ALL_ADS.filter(item => {
    const d = item.data || {};

    // full-text search
    if (q) {
      const qFields = [
        d.comment || '',
        d.fromRegion || '',
        d.fromDistrict || '',
        d.toRegion || '',
        d.toDistrict || '',
        d.userId || '',
        d.price || ''
      ].join(' ').toLowerCase();
      if (!qFields.includes(q)) return false;
    }

    // STRICT matching for region/district (exact match)
    function norm(v) {
  if (!v) return '';
  return String(v).trim().toLowerCase();
}

if (fr && norm(d.fromRegion) !== fr) return false;
if (tr && norm(d.toRegion) !== tr) return false;
if (fd && norm(d.fromDistrict) !== fd) return false;
if (td && norm(d.toDistrict) !== td) return false;


    // category strict (use d.type as fallback)
    const thisCat = (d.category || d.type || 'taxi').toLowerCase();
    if (cat && thisCat !== cat) return false;

    if (userIdVal && !((d.userId || '').toLowerCase().includes(userIdVal))) return false;

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

  // sort then render
  sortFiltered();

  if (resetPage) currentPage = 1;
  renderTable();
}

// -------------------------------
// Sort FILTERED
// -------------------------------
function sortFiltered() {
  const val = (sortBy && sortBy.value) || 'createdAt_desc';
  const [field, dir] = val.split('_');
  FILTERED.sort((a, b) => {
    const A = a.data[field];
    const B = b.data[field];
    const na = safeNum(A, A ? 0 : 0);
    const nb = safeNum(B, B ? 0 : 0);

    if (field === 'price' || field === 'seats' || field === 'createdAt') {
      if (dir === 'asc') return na - nb;
      return nb - na;
    } else {
      const sa = String(A || '').toLowerCase();
      const sb = String(B || '').toLowerCase();
      if (dir === 'asc') return sa.localeCompare(sb);
      return sb.localeCompare(sa);
    }
  });
}

// -------------------------------
// Render with pagination
// -------------------------------
function renderTable() {
  currentPageSize = Number((pageSize && pageSize.value) || currentPageSize);
  const total = FILTERED.length;
  const totalPages = Math.max(1, Math.ceil(total / currentPageSize));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * currentPageSize;
  const end = start + currentPageSize;
  const pageSlice = FILTERED.slice(start, end);

  if (!adsTableBody) return;

  adsTableBody.innerHTML = '';

  if (pageSlice.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="px-3 py-3" colspan="8">Hech nima topilmadi</td>`;
    adsTableBody.appendChild(tr);
  } else {
    pageSlice.forEach((item, index) => {
      const idx = start + index + 1;
      const d = item.data || {};
      const tr = document.createElement('tr');

      const createdStr = fmtDate(d.createdAt);
      const cat = d.category || d.type || 'taxi';
      const seats = (d.seats || d.driverSeats) || '';
      const price = d.price || '';

      tr.innerHTML = `
        <td class="px-3 py-2 text-sm">${idx}</td>
        <td class="px-3 py-2 text-sm">${escapeHtml(d.fromRegion || '')} <div class="text-xs text-gray-500">${escapeHtml(d.fromDistrict || '')}</div></td>
        <td class="px-3 py-2 text-sm">${escapeHtml(d.toRegion || '')} <div class="text-xs text-gray-500">${escapeHtml(d.toDistrict || '')}</div></td>
        <td class="px-3 py-2 text-sm">${escapeHtml(seats)}</td>
        <td class="px-3 py-2 text-sm">${escapeHtml(price)}</td>
        <td class="px-3 py-2 text-sm">${escapeHtml(cat)}</td>
        <td class="px-3 py-2 text-sm">${escapeHtml(createdStr)}</td>
        <td class="px-3 py-2 text-sm">
          <button class="btn btn-view mr-2" data-id="${item.id}">Ko'rish</button>
          <button class="btn btn-delete" data-id="${item.id}">O'chirish</button>
        </td>
      `;
      adsTableBody.appendChild(tr);
    });

    // attach actions (delegation safer but keep original style)
    adsTableBody.querySelectorAll('.btn-view').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        viewAd(id);
      });
    });
    adsTableBody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        deleteAd(id);
      });
    });
  }

  if (paginationInfo) paginationInfo.innerText = `${currentPage} / ${totalPages} sahifa — ${total} e'lon`;

  if (loadingSkeleton) loadingSkeleton.style.display = 'none';
  if (tableWrap) tableWrap.classList.remove('hidden');
}

// -------------------------------
// Escape HTML
// -------------------------------
function escapeHtml(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// -------------------------------
// View Ad
// -------------------------------
function viewAd(id) {
  const item = ALL_ADS.find(a => a.id === id);
  if (!item) return alert('Ad topilmadi');
  const d = item.data || {};
  const lines = [];
  lines.push(`ID: ${id}`);
  lines.push(`User: ${d.userId || '-'}`);
  lines.push(`Category: ${d.category || d.type || 'taxi'}`);
  lines.push(`From: ${d.fromRegion || '-'} / ${d.fromDistrict || '-'}`);
  lines.push(`To: ${d.toRegion || '-'} / ${d.toDistrict || '-'}`);
  lines.push(`Seats: ${d.seats || d.driverSeats || '-'}`);
  lines.push(`Price: ${d.price || '-'}`);
  lines.push(`Departure: ${fmtDate(d.departureTime)}`);
  lines.push(`Created: ${fmtDate(d.createdAt)}`);
  lines.push(`Comment: ${d.comment || '-'}`);
  alert(lines.join('\n'));
}

// -------------------------------
// Delete Ad
// -------------------------------
function deleteAd(id) {
  if (!confirm('Haqiqatan ham bu e\'lonni o\'chirmoqchimisiz?')) return;
  if (!DB && !(window.firebase && window.firebase.database)) return alert('DB yo\'q');

  // remove: DB.ref('ads').child(id).remove()
  let targetRef;
  try {
    if (DB && typeof DB.ref === 'function') {
      targetRef = DB.ref('ads').child(id);
    } else if (window.firebase && typeof window.firebase.database === 'function') {
      targetRef = window.firebase.database().ref('ads').child(id);
    }
  } catch (e) { targetRef = null; }

  if (!targetRef || typeof targetRef.remove !== 'function') {
    // fallback: try to remove in nested categories/users (iterate)
    try {
      const rootRef = (DB && typeof DB.ref === 'function') ? DB.ref('ads') : (window.firebase && window.firebase.database && window.firebase.database().ref('ads'));
      if (!rootRef) throw new Error('No root ref for delete');
      rootRef.once('value').then(snap => {
        let found = false;
        snap.forEach(level1 => {
          // level1 may be category or userId or adId
          if (level1.key === id && level1.ref && typeof level1.ref.remove === 'function') {
            level1.ref.remove();
            found = true;
            return;
          }
          level1.forEach(level2 => {
            if (level2.key === id) {
              level2.ref.remove();
              found = true;
              return;
            }
            level2.forEach(level3 => {
              if (level3.key === id) {
                level3.ref.remove();
                found = true;
                return;
              }
            });
            if (found) return;
          });
          if (found) return;
        });
        if (!found) alert('Topilmadi!');
        else {
          // remove from local cache and re-render
          ALL_ADS = ALL_ADS.filter(a => a.id !== id);
          applyFilters();
          alert('O‘chirildi!');
        }
      });
    } catch (e) {
      console.error('Delete fallback error', e);
      return alert('O\'chirishda xato: DB reference topilmadi');
    }
    return;
  }

  targetRef.remove().then(() => {
    ALL_ADS = ALL_ADS.filter(a => a.id !== id);
    applyFilters();
  }).catch(err => {
    console.error('Delete error', err);
    alert('O\'chirishda xato: ' + err.message);
  });
}

// -------------------------------
// Reset filters
// -------------------------------
function resetFilters() {
  if (searchInput) searchInput.value = '';
  if (fromRegionFilter) fromRegionFilter.value = '';
  if (toRegionFilter) toRegionFilter.value = '';
  if (fromDistrictFilter) fromDistrictFilter.value = '';
  if (toDistrictFilter) toDistrictFilter.value = '';
  if (minPrice) minPrice.value = '';
  if (maxPrice) maxPrice.value = '';
  if (seatsFilter) seatsFilter.value = '';
  if (categoryFilter) categoryFilter.value = '';
  if (dateFrom) dateFrom.value = '';
  if (dateTo) dateTo.value = '';
  if (userIdFilter) userIdFilter.value = '';
  applyFilters();
}

// -------------------------------
// CSV Export
// -------------------------------
function exportCSV() {
  if (!FILTERED || FILTERED.length === 0) { return alert('Eksport uchun hech narsa topilmadi.'); }

  const rows = [];
  const header = ['id','userId','category','fromRegion','fromDistrict','toRegion','toDistrict','seats','price','departureTime','createdAt','comment'];
  rows.push(header.join(','));

  FILTERED.forEach(item => {
    const d = item.data || {};
    const row = [
      csvSafe(item.id),
      csvSafe(d.userId),
      csvSafe(d.category || d.type || 'taxi'),
      csvSafe(d.fromRegion),
      csvSafe(d.fromDistrict),
      csvSafe(d.toRegion),
      csvSafe(d.toDistrict),
      csvSafe(d.seats || d.driverSeats),
      csvSafe(d.price),
      csvSafe(d.departureTime),
      csvSafe(d.createdAt),
      csvSafe(d.comment)
    ];
    rows.push(row.join(','));
  });

  const csvString = rows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileName = `ads_export_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvSafe(value) {
  if (value === null || value === undefined) return '';
  const s = String(value).replace(/"/g, '""');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s}"`;
  }
  return s;
}

// -------------------------------
// Final note: initial render will be triggered by loadOnce or real-time handler
// -------------------------------

function renderTableWithoutFiltering() {
  FILTERED = ALL_ADS.slice();
  currentPage = 1;
  renderTable();
}
