/* ads.js
   Full-featured Ads admin script
   - Works with global firebase (firebase.database())
   - Real-time toggle (on/off)
   - Filters: fromRegion, toRegion, fromDistrict, toDistrict, min/max price, seats, category, date range, userId
   - Search (comment, region, district, userId)
   - Pagination (pageSize selection)
   - Sorting (date, price)
   - CSV Export
   - Loading skeleton
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
// DOM refs
// -------------------------------
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

// -------------------------------
// State
// -------------------------------
let DB = null;                // firebase.database() instance
let ALL_ADS = [];             // array of { id, data }
let FILTERED = [];            // after filter/search
let currentPage = 1;
let currentPageSize = Number(pageSize.value || 50);
let realtimeListenerAttached = false;
let adsRef = null;
let realtimeEnabled = realtimeToggle.checked;

// -------------------------------
// Wait for firebase global to be available
// -------------------------------
function waitForFirebaseReady(timeout = 7000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function check() {
      if (window.firebase && typeof window.firebase.database === 'function') {
        return resolve(window.firebase.database());
      }
      if (window.db) { return resolve(window.db); } // if some wrapper exists
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
  loadingSkeleton.style.display = 'block';
  tableWrap.classList.add('hidden');
  alert('Firebase ulanmagan. Console da batafsil nosozlikni ko‘ring.');
});

// -------------------------------
// Init UI interactions & load data
// -------------------------------
function init() {
  // hide skeleton, show table when data arrives
  loadingSkeleton.style.display = 'block';
  tableWrap.classList.add('hidden');

  // Live listeners
  if (realtimeEnabled) {
    attachRealtime();
  } else {
    loadOnce();
  }

  // events
  applyFiltersBtn.addEventListener('click', () => {
    applyFilters();
  });

  resetFiltersBtn.addEventListener('click', () => {
    resetFilters();
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') applyFilters();
  });

  pageSize.addEventListener('change', () => {
    currentPageSize = Number(pageSize.value);
    currentPage = 1;
    renderTable();
  });

  prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; renderTable(); }
  });

  nextPageBtn.addEventListener('click', () => {
    const totalPages = Math.max(1, Math.ceil(FILTERED.length / currentPageSize));
    if (currentPage < totalPages) { currentPage++; renderTable(); }
  });

  sortBy.addEventListener('change', () => {
    applyFilters(); // re-sort after filter
  });

  realtimeToggle.addEventListener('change', (e) => {
    realtimeEnabled = e.target.checked;
    if (realtimeEnabled) attachRealtime();
    else detachRealtimeAndLoadOnce();
  });

  btnExportCsv.addEventListener('click', exportCSV);

  // initial UI population will be done after first data load
}

// -------------------------------
// Attach real-time listener
// -------------------------------
function attachRealtime() {
  if (!DB) return;
  if (realtimeListenerAttached) return;
  // reference to 'ads' root
  adsRef = DB.ref('ads');
  // on value will give entire snapshot (since structure is adId -> data)
  adsRef.on('value', snapshot => {
    ALL_ADS = [];
    snapshot.forEach(child => {
      const id = child.key;
      const data = child.val();
      // normalize category default
      if (!data.category) data.category = data.type || 'taxi';
      ALL_ADS.push({ id, data });
    });
    // after update, hide skeleton
    loadingSkeleton.style.display = 'none';
    tableWrap.classList.remove('hidden');
    // fill filter selects dynamically
    fillFilterOptions();
    // apply current filters (keeps pagination)
    applyFilters(false);
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
    try {
      adsRef.off();
    } catch (e) {
      console.warn('adsRef.off error', e);
    }
  }
  realtimeListenerAttached = false;
  loadOnce();
}

// -------------------------------
// Load once (non-realtime)
// -------------------------------
function loadOnce() {
  if (!DB) return;
  loadingSkeleton.style.display = 'block';
  tableWrap.classList.add('hidden');
  DB.ref('ads').once('value').then(snapshot => {
    ALL_ADS = [];
    snapshot.forEach(child => {
      const id = child.key;
      const data = child.val();
      if (!data.category) data.category = data.type || 'taxi';
      ALL_ADS.push({ id, data });
    });
    loadingSkeleton.style.display = 'none';
    tableWrap.classList.remove('hidden');
    fillFilterOptions();
    applyFilters(false);
  }).catch(err => {
    console.error('loadOnce error', err);
    loadingSkeleton.style.display = 'none';
  });
}

// -------------------------------
// Fill filter select options dynamically from ALL_ADS
// -------------------------------
function fillFilterOptions() {
  // sets
  const fromRegSet = new Set();
  const toRegSet = new Set();
  const fromDistSet = new Set();
  const toDistSet = new Set();
  const catSet = new Set();

  ALL_ADS.forEach(({ id, data }) => {
    if (data.fromRegion) fromRegSet.add(data.fromRegion);
    if (data.toRegion) toRegSet.add(data.toRegion);
    if (data.fromDistrict) fromDistSet.add(data.fromDistrict);
    if (data.toDistrict) toDistSet.add(data.toDistrict);
    if (data.category) catSet.add(data.category);
  });

  // helper to add options if not already
  function populate(selectEl, set) {
    const cur = selectEl.value || '';
    // clear and re-add default
    selectEl.innerHTML = '<option value="">Hammasi</option>';
    Array.from(set).sort().forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.innerText = v;
      selectEl.appendChild(opt);
    });
    // try restore selection
    selectEl.value = cur;
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
  // add discovered categories
  Array.from(catSet).sort().forEach(c => {
    if (!defaultCats.includes(c)) {
      const o = document.createElement('option');
      o.value = c;
      o.innerText = c;
      categoryFilter.appendChild(o);
    }
  });
  categoryFilter.value = curCat;
}

// -------------------------------
// Apply filters & search
// if resetPage true -> set page to 1
// -------------------------------
function applyFilters(resetPage = true) {
  // pull filter values
  const q = (searchInput.value || '').trim().toLowerCase();
  const fr = (fromRegionFilter.value || '').trim().toLowerCase();
  const tr = (toRegionFilter.value || '').trim().toLowerCase();
  const fd = (fromDistrictFilter.value || '').trim().toLowerCase();
  const td = (toDistrictFilter.value || '').trim().toLowerCase();
  const cat = (categoryFilter.value || '').trim().toLowerCase();
  const userIdVal = (userIdFilter.value || '').trim().toLowerCase();

  const minP = safeNum(minPrice.value, 0);
  const maxP = safeNum(maxPrice.value, Number.MAX_SAFE_INTEGER);
  const seats = seatsFilter.value ? Number(seatsFilter.value) : 0;

  // date range handling
  let dateStart = null, dateEnd = null;
  if (dateFrom.value) {
    dateStart = new Date(dateFrom.value + 'T00:00:00').getTime();
  }
  if (dateTo.value) {
    dateEnd = new Date(dateTo.value + 'T23:59:59').getTime();
  }

  // Filter
  FILTERED = ALL_ADS.filter(item => {
    const d = item.data || {};

    // search across multiple fields
    if (q) {
      const qFields = [
        d.comment || '',
        (d.fromRegion || '') + ' ' + (d.fromDistrict || ''),
        (d.toRegion || '') + ' ' + (d.toDistrict || ''),
        d.userId || '',
        d.price || ''
      ].join(' ').toLowerCase();
      if (!qFields.includes(q)) return false;
    }

    if (fr && !( (d.fromRegion || '').toLowerCase().includes(fr) )) return false;
    if (tr && !( (d.toRegion || '').toLowerCase().includes(tr) )) return false;
    if (fd && !( (d.fromDistrict || '').toLowerCase().includes(fd) )) return false;
    if (td && !( (d.toDistrict || '').toLowerCase().includes(td) )) return false;
    if (cat && !( (d.category || d.type || 'taxi').toLowerCase() === cat )) return false;
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

  // sort
  sortFiltered();

  if (resetPage) currentPage = 1;
  renderTable();
}

// -------------------------------
// Sort FILTERED by sortBy control
// -------------------------------
function sortFiltered() {
  const val = sortBy.value || 'createdAt_desc';
  const [field, dir] = val.split('_'); // e.g., createdAt_desc
  FILTERED.sort((a, b) => {
    const A = a.data[field];
    const B = b.data[field];
    const na = safeNum(A, A ? 0 : 0);
    const nb = safeNum(B, B ? 0 : 0);

    if (field === 'price' || field === 'seats' || field === 'createdAt') {
      // numeric
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
// Render table using pagination
// -------------------------------
function renderTable() {
  currentPageSize = Number(pageSize.value || currentPageSize);
  const total = FILTERED.length;
  const totalPages = Math.max(1, Math.ceil(total / currentPageSize));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * currentPageSize;
  const end = start + currentPageSize;
  const pageSlice = FILTERED.slice(start, end);

  // clear table
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
      // attach action listeners
      adsTableBody.appendChild(tr);
    });

    // delegate actions
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

  // update pagination info
  paginationInfo.innerText = `${currentPage} / ${totalPages} sahifa — ${total} e'lon`;

  // show table
  loadingSkeleton.style.display = 'none';
  tableWrap.classList.remove('hidden');
}

// -------------------------------
// Escape HTML (very small)
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
// View Ad - modal (simple alert for now; can be enhanced)
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
// Delete Ad - confirm & remove from DB
function deleteAd(id) {
  if (!confirm('Haqiqatan ham bu e\'lonni o\'chirmoqchimisiz?')) return;
  if (!DB) return alert('DB yo\'q');
  DB.ref('ads').child(id).remove().then(() => {
    // removed -> realtime will update list or we can remove locally
    // remove locally just in case realtime is off
    ALL_ADS = ALL_ADS.filter(a => a.id !== id);
    applyFilters();
  }).catch(err => {
    console.error('Delete error', err);
    alert('O\'chirishda xato: ' + err.message);
  });
}

// -------------------------------
// Reset filters
function resetFilters() {
  searchInput.value = '';
  fromRegionFilter.value = '';
  toRegionFilter.value = '';
  fromDistrictFilter.value = '';
  toDistrictFilter.value = '';
  minPrice.value = '';
  maxPrice.value = '';
  seatsFilter.value = '';
  categoryFilter.value = '';
  dateFrom.value = '';
  dateTo.value = '';
  userIdFilter.value = '';
  applyFilters();
}

// -------------------------------
// CSV Export for current FILTERED (all pages or current page? we'll export ALL filtered items)
// -------------------------------
function exportCSV() {
  if (!FILTERED || FILTERED.length === 0) {
    return alert('Eksport uchun hech narsa topilmadi.');
  }

  // Prepare CSV headers
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
// Utilities: detach listener and load once when toggling realtime off
// Already handled in toggle event above via detachRealtimeAndLoadOnce()

// -------------------------------
// Final note: initial render will be triggered by loadOnce or real-time handler
// -------------------------------
