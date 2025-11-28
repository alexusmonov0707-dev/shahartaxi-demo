// ads.module.js
// Full-featured admin ads module (ESM) for Firebase v10 wrapper
// Requires ./firebase.js to export: db, ref, get, set, update, remove, push, onValue
// Place in same folder as firebase.js and ads.html that loads it as <script type="module">

console.log('ADS MODULE LOADED');

import { db, ref, get, set, update, remove as fbRemove, push, onValue } from './firebase.js';

// -------------------------------
// Utilities
// -------------------------------
const $ = id => document.getElementById(id);
function fmtDate(ts) {
  if (!ts && ts !== 0) return '—';
  const d = new Date(Number(ts));
  return isNaN(d.getTime()) ? '—' : d.toLocaleString();
}
function safeNum(v, def = 0) { const n = Number(v); return isNaN(n) ? def : n; }
function norm(v) { if (v === null || v === undefined) return ''; return String(v).replace(/\u00A0/g,' ').replace(/\s+/g,' ').trim().toLowerCase(); }
function escapeHtml(str){ if (str === null || str === undefined) return ''; return String(str).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;"); }
function csvSafe(v){ if (v === null || v === undefined) return ''; const s = String(v).replace(/"/g,'""'); return (s.includes(',')||s.includes('"')||s.includes('\n'))? `"${s}"` : s; }

// -------------------------------
// DOM refs (IDs must match your HTML)
const searchInput = $('searchInput');
const fromRegionFilter = $('fromRegionFilter');
const toRegionFilter = $('toRegionFilter');
const fromDistrictFilter = $('fromDistrictFilter');
const toDistrictFilter = $('toDistrictFilter');
const minPrice = $('minPrice');
const maxPrice = $('maxPrice');
const seatsFilter = $('seatsFilter');
const categoryFilter = $('categoryFilter');
const dateFrom = $('dateFrom');
const dateTo = $('dateTo');
const userIdFilter = $('userIdFilter');

const applyFiltersBtn = $('applyFiltersBtn');
const resetFiltersBtn = $('resetFiltersBtn');

const sortBy = $('sortBy');
const pageSize = $('pageSize');
const prevPageBtn = $('prevPageBtn');
const nextPageBtn = $('nextPageBtn');
const paginationInfo = $('paginationInfo');

const tableWrap = $('tableWrap') || document.body;
const adsTableBody = $('adsTableBody');
const loadingSkeleton = $('loadingSkeleton');

const realtimeToggle = $('realtimeToggle');
const btnExportCsv = $('btnExportCsv');

// -------------------------------
// State
let ALL_ADS = [];             // array of { id, userId?, data }
let FILTERED = [];
let currentPage = 1;
let currentPageSize = Number((pageSize && pageSize.value) || 50);
let realtimeAttached = false;

// Firebase ref to ads
const ADS_REF = ref(db, 'ads');

// -------------------------------
// Flatten snapshot/value to flat array supporting nested userUid->adId->data,
// category->adId->data, or adId->data
function isAdObject(o){
  return o && typeof o === 'object' && (o.createdAt || o.fromRegion || o.toRegion || o.price || o.seats || o.driverSeats);
}

function flattenValue(root){
  const out = [];
  if (!root || typeof root !== 'object') return out;

  Object.entries(root).forEach(([k1, v1]) => {
    // 1-level: ads/adId -> data
    if (isAdObject(v1)) {
      out.push({ id: k1, data: v1 });
      return;
    }
    // 2-level: ads/category/adId -> data OR ads/userUid/adId -> data
    if (v1 && typeof v1 === 'object') {
      Object.entries(v1).forEach(([k2, v2]) => {
        if (isAdObject(v2)) {
          out.push({ id: k2, data: v2 });
          return;
        }
        // 3-level: ads/userUid/category/adId or ads/userUid/autoId/data
        if (v2 && typeof v2 === 'object') {
          Object.entries(v2).forEach(([k3, v3]) => {
            if (isAdObject(v3)) {
              out.push({ id: k3, data: v3 });
            }
          });
        }
      });
    }
  });

  return out;
}

// -------------------------------
// Load once
async function loadOnce(){
  try {
    if (loadingSkeleton) loadingSkeleton.style.display = 'block';
    if (tableWrap) tableWrap.classList.add && tableWrap.classList.add('hidden');

    const snap = await get(ADS_REF);
    let root = {};
    if (snap && typeof snap.val === 'function') root = snap.val() || {};
    else root = snap || {};

    ALL_ADS = flattenValue(root);
    // ensure category exists
    ALL_ADS.forEach(it => {
      if (!it.data.category) it.data.category = it.data.type || 'taxi';
    });

    fillFilterOptions();
    applyFilters(false);
  } catch (err) {
    console.error('loadOnce error', err);
    // leave table hidden or show skeleton
  } finally {
    if (loadingSkeleton) loadingSkeleton.style.display = 'none';
    if (tableWrap) tableWrap.classList.remove && tableWrap.classList.remove('hidden');
  }
}

// -------------------------------
// Attach realtime
function attachRealtime(){
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
// Fill selects for region/district/category
function fillFilterOptions(){
  if (!fromRegionFilter || !toRegionFilter || !fromDistrictFilter || !toDistrictFilter || !categoryFilter) return;

  const fromSet = new Set(), toSet = new Set(), fdSet = new Set(), tdSet = new Set(), catSet = new Set();

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
      const o = document.createElement('option'); o.value = v; o.innerText = v; sel.appendChild(o);
    });
    try { sel.value = cur; } catch(e){}
  }

  populate(fromRegionFilter, fromSet);
  populate(toRegionFilter, toSet);
  populate(fromDistrictFilter, fdSet);
  populate(toDistrictFilter, tdSet);

  // categories: include defaults and discovered
  const curCat = categoryFilter.value || '';
  categoryFilter.innerHTML = '<option value="">Hammasi</option>';
  const defaultCats = ['taxi','cargo','delivery'];
  defaultCats.forEach(c => {
    const o = document.createElement('option'); o.value = c; o.innerText = c.charAt(0).toUpperCase()+c.slice(1); categoryFilter.appendChild(o);
  });
  Array.from(catSet).sort().forEach(c => {
    if (!defaultCats.includes(c)) {
      const o = document.createElement('option'); o.value = c; o.innerText = c; categoryFilter.appendChild(o);
    }
  });
  try { categoryFilter.value = curCat; } catch(e){}
}

// -------------------------------
// Apply filters logic
function applyFilters(resetPage = true){
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

    if (fr && fr !== 'hammasi' && norm(d.fromRegion) !== fr) return false;
    if (tr && tr !== 'hammasi' && norm(d.toRegion) !== tr) return false;
    if (fd && fd !== 'hammasi' && norm(d.fromDistrict) !== fd) return false;
    if (td && td !== 'hammasi' && norm(d.toDistrict) !== td) return false;

    const thisCat = norm(d.category || d.type || 'taxi');
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
function sortFiltered(){
  const val = (sortBy && sortBy.value) || 'createdAt_desc';
  const [field, dir] = val.split('_');
  FILTERED.sort((a,b) => {
    const A = a.data[field], B = b.data[field];
    if (field === 'price' || field === 'seats' || field === 'createdAt') {
      const na = safeNum(A), nb = safeNum(B);
      return dir === 'asc' ? na - nb : nb - na;
    }
    const sa = String(A || '').toLowerCase(), sb = String(B || '').toLowerCase();
    return dir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
  });
}

// -------------------------------
// Render table with pagination
function renderTable(){
  currentPageSize = Number((pageSize && pageSize.value) || currentPageSize);
  const total = FILTERED.length;
  const totalPages = Math.max(1, Math.ceil(total / currentPageSize));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * currentPageSize;
  const end = start + currentPageSize;
  const pageSlice = FILTERED.slice(start, end);

  if (!adsTableBody) return;
  adsTableBody.innerHTML = '';

  if (!pageSlice.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="px-3 py-3" colspan="8">Hech nima topilmadi</td>`;
    adsTableBody.appendChild(tr);
  } else {
    pageSlice.forEach((item, idx) => {
      const d = item.data || {};
      const tr = document.createElement('tr');

      const createdStr = fmtDate(d.createdAt);
      const cat = d.category || d.type || 'taxi';
      const seats = d.seats || d.driverSeats || '';
      const price = d.price || '';

      tr.innerHTML = `
        <td class="px-3 py-2 text-sm">${start + idx + 1}</td>
        <td class="px-3 py-2 text-sm">${escapeHtml(d.fromRegion || '')}<div class="text-xs text-gray-500">${escapeHtml(d.fromDistrict || '')}</div></td>
        <td class="px-3 py-2 text-sm">${escapeHtml(d.toRegion || '')}<div class="text-xs text-gray-500">${escapeHtml(d.toDistrict || '')}</div></td>
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

    // attach actions
    adsTableBody.querySelectorAll('.btn-view').forEach(btn => btn.addEventListener('click', (e) => viewAd(e.currentTarget.getAttribute('data-id'))));
    adsTableBody.querySelectorAll('.btn-delete').forEach(btn => btn.addEventListener('click', (e) => deleteAd(e.currentTarget.getAttribute('data-id'))));
  }

  if (paginationInfo) paginationInfo.innerText = `${currentPage} / ${totalPages} sahifa — ${total} e'lon`;
  if (loadingSkeleton) loadingSkeleton.style.display = 'none';
  if (tableWrap) tableWrap.classList.remove && tableWrap.classList.remove('hidden');
}

// -------------------------------
// View ad
function viewAd(id){
  const item = ALL_ADS.find(a => a.id === id);
  if (!item) return alert('Ad topilmadi');
  const d = item.data || {};
  const lines = [
    `ID: ${id}`,
    `User: ${d.userId || '-'}`,
    `Category: ${d.category || d.type || 'taxi'}`,
    `From: ${d.fromRegion || '-'} / ${d.fromDistrict || '-'}`,
    `To: ${d.toRegion || '-'} / ${d.toDistrict || '-'}`,
    `Seats: ${d.seats || d.driverSeats || '-'}`,
    `Price: ${d.price || '-'}`,
    `Departure: ${fmtDate(d.departureTime)}`,
    `Created: ${fmtDate(d.createdAt)}`,
    `Comment: ${d.comment || '-'}`
  ];
  alert(lines.join('\n'));
}

// -------------------------------
// Delete ad (tries direct path then nested)
async function deleteAd(id){
  if (!confirm('Haqiqatan ham bu e\'lonni o\'chirmoqchimisiz?')) return;
  try {
    // try direct remove ads/{id}
    await fbRemove(ref(db, `ads/${id}`));
    ALL_ADS = ALL_ADS.filter(a => a.id !== id);
    applyFilters();
    return alert('O\'chirildi');
  } catch (err) {
    // fallback iterate nested
    try {
      const snap = await get(ADS_REF);
      const root = snap && typeof snap.val === 'function' ? snap.val() : (snap || {});
      let removed = false;
      Object.entries(root || {}).forEach(([k1, v1]) => {
        if (k1 === id) {
          fbRemove(ref(db, `ads/${k1}`));
          removed = true;
        } else if (v1 && typeof v1 === 'object') {
          Object.entries(v1).forEach(([k2, v2]) => {
            if (k2 === id) {
              fbRemove(ref(db, `ads/${k1}/${k2}`));
              removed = true;
            } else if (v2 && typeof v2 === 'object') {
              Object.entries(v2).forEach(([k3, v3]) => {
                if (k3 === id) {
                  fbRemove(ref(db, `ads/${k1}/${k2}/${k3}`));
                  removed = true;
                }
              });
            }
          });
        }
      });
      if (removed) {
        ALL_ADS = ALL_ADS.filter(a => a.id !== id);
        applyFilters();
        return alert('O\'chirildi');
      }
      throw new Error('Not found');
    } catch (e) {
      console.error('delete fallback error', e);
      return alert('O\'chirishda xato: ' + (e && e.message));
    }
  }
}

// -------------------------------
// Reset filters
function resetFilters(){
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
// CSV export
function exportCSV(){
  if (!FILTERED || FILTERED.length === 0) { return alert('Eksport uchun hech narsa topilmadi.'); }
  const header = ['id','userId','category','fromRegion','fromDistrict','toRegion','toDistrict','seats','price','departureTime','createdAt','comment'];
  const rows = [header.join(',')];
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
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ads_export_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

// -------------------------------
// Init UI listeners
function initUI(){
  if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', () => applyFilters(true));
  if (resetFiltersBtn) resetFiltersBtn.addEventListener('click', resetFilters);
  if (searchInput) searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') applyFilters(true); });
  if (pageSize) pageSize.addEventListener('change', () => { currentPageSize = Number(pageSize.value); currentPage = 1; renderTable(); });
  if (prevPageBtn) prevPageBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderTable(); }});
  if (nextPageBtn) nextPageBtn.addEventListener('click', () => { const tp = Math.max(1, Math.ceil(FILTERED.length / currentPageSize)); if (currentPage < tp) { currentPage++; renderTable(); }});
  if (sortBy) sortBy.addEventListener('change', () => applyFilters(true));
  if (realtimeToggle) realtimeToggle.addEventListener('change', e => {
    if (e.target.checked) attachRealtime();
    else { realtimeAttached = false; loadOnce(); }
  });
  if (btnExportCsv) btnExportCsv.addEventListener('click', exportCSV);

  const watch = [fromRegionFilter, toRegionFilter, fromDistrictFilter, toDistrictFilter, seatsFilter, categoryFilter, dateFrom, dateTo, userIdFilter, minPrice, maxPrice];
  watch.forEach(w => {
    if (!w) return;
    w.addEventListener('change', () => applyFilters(true));
    w.addEventListener('input', () => applyFilters(true));
  });
}

// -------------------------------
// Bootstrap
(function bootstrap(){
  try {
    initUI();
    // If realtime toggle exists and checked -> attachRealtime else loadOnce
    if (realtimeToggle && realtimeToggle.checked) attachRealtime();
    else loadOnce();
    // Expose for debug
    window.ALL_ADS = ALL_ADS;
    window.FILTERED = FILTERED;
    window.applyFilters = applyFilters;
    console.log('ADS MODULE INITIALIZED');
  } catch (e) {
    console.error('ADS MODULE bootstrap error', e);
  }
})();
