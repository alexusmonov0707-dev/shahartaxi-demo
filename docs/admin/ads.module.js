console.log("ADS MODULE LOADED SUCCESSFULLY");

// ads.module.js — Admin panel (ESM / Firebase v10)
// Requires: ./firebase.js (your ESM wrapper) — must export: db, ref, get, onValue, remove, push, etc.
// Source firebase wrapper: see your uploaded firebase (4).js. :contentReference[oaicite:4]{index=4}

import { db, ref, get, onValue, remove as fbRemove } from './firebase.js';

// -------------------------------
// Utilities
// -------------------------------
const $ = id => document.getElementById(id);
function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(Number(ts));
  return isNaN(d.getTime()) ? '—' : d.toLocaleString();
}
function safeNum(v, def = 0) { const n = Number(v); return isNaN(n) ? def : n; }
function norm(v){ if (v === null || v === undefined) return ''; return String(v).trim().toLowerCase(); }
function escapeHtml(str){ if (!str && str !== 0) return ''; return String(str).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;"); }

// -------------------------------
// DOM refs
// -------------------------------
const elSearch = $('searchInput');
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

const applyBtn = $('applyFiltersBtn');
const resetBtn = $('resetFiltersBtn');
const sortBy = $('sortBy');
const pageSize = $('pageSize');
const prevPage = $('prevPageBtn');
const nextPage = $('nextPageBtn');
const paginationInfo = $('paginationInfo');

const tableWrap = $('tableWrap');
const adsTableBody = $('adsTableBody');
const loadingSkeleton = $('loadingSkeleton');
const realtimeToggle = $('realtimeToggle');
const btnExportCsv = $('btnExportCsv');

// -------------------------------
// State
// -------------------------------
let ALL_ADS = []; // { id, data }
let FILTERED = [];
let currentPage = 1;
let currentPageSize = Number((pageSize && pageSize.value) || 50);
let adsRef = ref(db, 'ads');
let realtimeAttached = false;

// -------------------------------
// Flatten: supports 1/2/3-level as needed
// -------------------------------
function isAdObject(o){
  return o && typeof o === 'object' && (o.createdAt || o.fromRegion || o.toRegion || o.price);
}
function flattenSnapshotVal(root){
  // root is snapshot.val() or plain object
  const results = [];
  if (!root || typeof root !== 'object') return results;

  Object.entries(root).forEach(([k1, v1]) => {
    // level1
    if (isAdObject(v1)) {
      results.push({ id: k1, data: v1 });
      return;
    }
    if (v1 && typeof v1 === 'object') {
      Object.entries(v1).forEach(([k2, v2]) => {
        if (isAdObject(v2)) {
          results.push({ id: k2, data: v2 });
          return;
        }
        if (v2 && typeof v2 === 'object') {
          Object.entries(v2).forEach(([k3, v3]) => {
            if (isAdObject(v3)) {
              results.push({ id: k3, data: v3 });
            }
          });
        }
      });
    }
  });

  return results;
}

// -------------------------------
// Load once (non-realtime)
// -------------------------------
async function loadOnce(){
  try {
    if (loadingSkeleton) loadingSkeleton.style.display = 'block';
    if (tableWrap) tableWrap.classList.add('hidden');

    const snap = await get(adsRef);
    const root = snap && snap.val ? snap.val() : (snap && snap.exists ? (snap.exists() ? snap.val() : {}) : snap);
    ALL_ADS = flattenSnapshotVal(root);
    ALL_ADS.forEach(it => { if (!it.data.category) it.data.category = it.data.type || 'taxi'; });

    fillFilterOptions();
    renderTableWithoutFiltering();
  } catch (err) {
    console.error('loadOnce err', err);
  } finally {
    if (loadingSkeleton) loadingSkeleton.style.display = 'none';
    if (tableWrap) tableWrap.classList.remove('hidden');
  }
}

// -------------------------------
// Attach realtime listener
// -------------------------------
function attachRealtime(){
  if (realtimeAttached) return;
  // onValue returns unsubscribe in v10 but wrapper may be onValue(ref, cb)
  onValue(adsRef, snapshot => {
    const root = snapshot && snapshot.val ? snapshot.val() : (snapshot || {});
    ALL_ADS = flattenSnapshotVal(root);
    ALL_ADS.forEach(it => { if (!it.data.category) it.data.category = it.data.type || 'taxi'; });

    fillFilterOptions();
    renderTableWithoutFiltering();
  }, err => console.error('onValue error', err));
  realtimeAttached = true;
}

// -------------------------------
// Fill filters dynamically
// -------------------------------
function fillFilterOptions(){
  if (!fromRegionFilter || !toRegionFilter || !categoryFilter) return;
  const fr = new Set(), tr = new Set(), fd = new Set(), td = new Set(), cs = new Set();
  ALL_ADS.forEach(({data}) => {
    if (!data) return;
    if (data.fromRegion) fr.add(String(data.fromRegion).trim());
    if (data.toRegion) tr.add(String(data.toRegion).trim());
    if (data.fromDistrict) fd.add(String(data.fromDistrict).trim());
    if (data.toDistrict) td.add(String(data.toDistrict).trim());
    if (data.category) cs.add(String(data.category).trim());
  });

  function populate(sel, set, preserve=true){
    if (!sel) return;
    const cur = preserve ? sel.value : '';
    sel.innerHTML = '<option value="">Hammasi</option>';
    Array.from(set).sort().forEach(v=>{
      const o = document.createElement('option'); o.value = v; o.innerText = v; sel.appendChild(o);
    });
    try { sel.value = cur; } catch(e){}
  }

  populate(fromRegionFilter, fr);
  populate(toRegionFilter, tr);
  populate(fromDistrictFilter, fd);
  populate(toDistrictFilter, td);

  const curCat = categoryFilter.value || '';
  categoryFilter.innerHTML = '<option value="">Hammasi</option>';
  const defaults = ['taxi','cargo','delivery'];
  defaults.forEach(c => { const o = document.createElement('option'); o.value=c; o.innerText = c.charAt(0).toUpperCase()+c.slice(1); categoryFilter.appendChild(o); });
  Array.from(cs).sort().forEach(c => { if (!defaults.includes(c)) { const o = document.createElement('option'); o.value=c; o.innerText=c; categoryFilter.appendChild(o); }});
  try { categoryFilter.value = curCat; } catch(e){}
}

// -------------------------------
// Apply filters
// -------------------------------
function applyFilters(resetPage=true){
  const q = (elSearch && elSearch.value || '').trim().toLowerCase();
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
    const p = Number(String(seatsFilter.value).replace('+','').trim());
    seats = isNaN(p) ? 0 : p;
  }

  let dateStart = null, dateEnd = null;
  if (dateFrom && dateFrom.value) dateStart = new Date(dateFrom.value+'T00:00:00').getTime();
  if (dateTo && dateTo.value) dateEnd = new Date(dateTo.value+'T23:59:59').getTime();

  FILTERED = ALL_ADS.filter(({data}) => {
    const d = data || {};

    if (q) {
      const text = [d.comment||'', d.fromRegion||'', d.fromDistrict||'', d.toRegion||'', d.toDistrict||'', d.userId||'', d.price||''].join(' ').toLowerCase();
      if (!text.includes(q)) return false;
    }

    if (fr && fr !== 'hammasi' && norm(d.fromRegion) !== fr) return false;
    if (tr && tr !== 'hammasi' && norm(d.toRegion) !== tr) return false;
    if (fd && fd !== 'hammasi' && norm(d.fromDistrict) !== fd) return false;
    if (td && td !== 'hammasi' && norm(d.toDistrict) !== td) return false;

    const thisCat = norm(d.category || d.type || 'taxi');
    if (cat && thisCat !== cat) return false;

    if (uid && !((d.userId||'').toLowerCase().includes(uid))) return false;

    const p = safeNum(d.price);
    if (p < minP || p > maxP) return false;

    const sv = safeNum(d.seats || d.driverSeats);
    if (seats && sv < seats) return false;

    if (dateStart || dateEnd) {
      const created = safeNum(d.createdAt);
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
// -------------------------------
function sortFiltered(){
  const val = (sortBy && sortBy.value) || 'createdAt_desc';
  const [field, dir] = val.split('_');
  FILTERED.sort((a,b) => {
    const A = a.data[field], B = b.data[field];
    if (field === 'price' || field === 'seats' || field === 'createdAt') {
      const na = safeNum(A), nb = safeNum(B);
      return dir==='asc' ? na-nb : nb-na;
    }
    const sa = String(A||'').toLowerCase(), sb = String(B||'').toLowerCase();
    return dir==='asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
  });
}

// -------------------------------
// Rendering with pagination
// -------------------------------
function renderTableWithoutFiltering(){
  FILTERED = ALL_ADS.slice();
  currentPage = 1;
  renderTable();
}

function renderTable(){
  currentPageSize = Number((pageSize && pageSize.value) || currentPageSize);
  const total = FILTERED.length;
  const totalPages = Math.max(1, Math.ceil(total/currentPageSize));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage-1)*currentPageSize;
  const slice = FILTERED.slice(start, start+currentPageSize);

  if (!adsTableBody) return;
  adsTableBody.innerHTML = '';

  if (!slice.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="8">Hech nima topilmadi</td>`;
    adsTableBody.appendChild(tr);
  } else {
    slice.forEach((item, idx) => {
      const d = item.data || {};
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${start+idx+1}</td>
        <td>${escapeHtml(d.fromRegion||'')}<div class="text-xs">${escapeHtml(d.fromDistrict||'')}</div></td>
        <td>${escapeHtml(d.toRegion||'')}<div class="text-xs">${escapeHtml(d.toDistrict||'')}</div></td>
        <td>${escapeHtml(d.seats||d.driverSeats||'')}</td>
        <td>${escapeHtml(d.price||'')}</td>
        <td>${escapeHtml(d.category||d.type||'taxi')}</td>
        <td>${escapeHtml(fmtDate(d.createdAt))}</td>
        <td>
          <button class="btn-view" data-id="${item.id}">Ko'rish</button>
          <button class="btn-delete" data-id="${item.id}">O'chirish</button>
        </td>
      `;
      adsTableBody.appendChild(tr);
    });

    // attach handlers
    adsTableBody.querySelectorAll('.btn-view').forEach(b => b.addEventListener('click', e => viewAd(e.currentTarget.dataset.id)));
    adsTableBody.querySelectorAll('.btn-delete').forEach(b => b.addEventListener('click', e => deleteAd(e.currentTarget.dataset.id)));
  }

  if (paginationInfo) paginationInfo.innerText = `${currentPage} / ${totalPages} sahifa — ${total} e'lon`;
  if (loadingSkeleton) loadingSkeleton.style.display = 'none';
  if (tableWrap) tableWrap.classList.remove('hidden');
}

// -------------------------------
// View / Delete
// -------------------------------
function viewAd(id){
  const it = ALL_ADS.find(x => x.id === id);
  if (!it) return alert('Ad topilmadi');
  const d = it.data || {};
  const lines = [
    `ID: ${id}`,
    `User: ${d.userId||'-'}`,
    `Category: ${d.category||d.type||'taxi'}`,
    `From: ${d.fromRegion||'-'} / ${d.fromDistrict||'-'}`,
    `To: ${d.toRegion||'-'} / ${d.toDistrict||'-'}`,
    `Seats: ${d.seats||d.driverSeats||'-'}`,
    `Price: ${d.price||'-'}`,
    `Depart: ${fmtDate(d.departureTime)}`,
    `Created: ${fmtDate(d.createdAt)}`,
    `Comment: ${d.comment||'-'}`
  ];
  alert(lines.join('\n'));
}

async function deleteAd(id){
  if (!confirm("O'chirishga ishonchingiz komilmi?")) return;
  // best-effort: try direct remove at ads/{id}, otherwise iterate nested nodes
  try {
    // try direct
    const directRef = ref(db, `ads/${id}`);
    await fbRemove(directRef);
    ALL_ADS = ALL_ADS.filter(x => x.id !== id);
    applyFilters();
    return alert('O\'chirildi');
  } catch(e){
    // fallback: iterate all children and remove matching key
    try {
      const s = await get(ref(db,'ads'));
      const root = s && s.val ? s.val() : (s || {});
      let found = false;
      Object.entries(root||{}).forEach(([k1,v1])=>{
        if (k1 === id) {
          // remove ads/k1
          fbRemove(ref(db, `ads/${k1}`));
          found = true;
        } else if (v1 && typeof v1 === 'object') {
          Object.entries(v1).forEach(([k2,v2])=>{
            if (k2 === id) {
              fbRemove(ref(db, `ads/${k1}/${k2}`));
              found = true;
            } else if (v2 && typeof v2 === 'object') {
              Object.entries(v2).forEach(([k3,v3])=>{
                if (k3 === id) {
                  fbRemove(ref(db, `ads/${k1}/${k2}/${k3}`));
                  found = true;
                }
              });
            }
          });
        }
      });
      if (found) {
        ALL_ADS = ALL_ADS.filter(x => x.id !== id);
        applyFilters();
        return alert('O\'chirildi');
      }
      throw new Error('Not found');
    } catch(err){
      console.error('deleteAd fallback err', err);
      return alert('O\'chirishda xato: ' + (err && err.message));
    }
  }
}

// -------------------------------
// Reset, CSV
// -------------------------------
function resetFilters(){
  if (elSearch) elSearch.value='';
  if (fromRegionFilter) fromRegionFilter.value='';
  if (toRegionFilter) toRegionFilter.value='';
  if (fromDistrictFilter) fromDistrictFilter.value='';
  if (toDistrictFilter) toDistrictFilter.value='';
  if (minPrice) minPrice.value='';
  if (maxPrice) maxPrice.value='';
  if (seatsFilter) seatsFilter.value='';
  if (categoryFilter) categoryFilter.value='';
  if (dateFrom) dateFrom.value='';
  if (dateTo) dateTo.value='';
  if (userIdFilter) userIdFilter.value='';
  applyFilters();
}

function csvSafe(v){ if (v === null || v === undefined) return ''; const s = String(v).replace(/"/g,'""'); return (s.includes(',')||s.includes('"')||s.includes('\n'))? `"${s}"` : s; }
function exportCSV(){
  if (!FILTERED || !FILTERED.length) return alert('Eksport uchun hech narsa topilmadi.');
  const header = ['id','userId','category','fromRegion','fromDistrict','toRegion','toDistrict','seats','price','departureTime','createdAt','comment'];
  const rows = [header.join(',')];
  FILTERED.forEach(it=>{
    const d = it.data||{};
    rows.push([
      csvSafe(it.id),
      csvSafe(d.userId),
      csvSafe(d.category||d.type||'taxi'),
      csvSafe(d.fromRegion),
      csvSafe(d.fromDistrict),
      csvSafe(d.toRegion),
      csvSafe(d.toDistrict),
      csvSafe(d.seats||d.driverSeats),
      csvSafe(d.price),
      csvSafe(d.departureTime),
      csvSafe(d.createdAt),
      csvSafe(d.comment)
    ].join(','));
  });
  const blob = new Blob([rows.join('\n')], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ads_export_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

// -------------------------------
// Init UI handlers
// -------------------------------
function initUI(){
  if (applyBtn) applyBtn.addEventListener('click', ()=>applyFilters(true));
  if (resetBtn) resetBtn.addEventListener('click', resetFilters);
  if (elSearch) elSearch.addEventListener('keydown', e => { if (e.key==='Enter') applyFilters(true); });
  if (pageSize) pageSize.addEventListener('change', ()=>{ currentPageSize = Number(pageSize.value); currentPage=1; renderTable(); });
  if (prevPage) prevPage.addEventListener('click', ()=>{ if (currentPage>1){ currentPage--; renderTable(); }});
  if (nextPage) nextPage.addEventListener('click', ()=>{ const tp = Math.max(1, Math.ceil(FILTERED.length/currentPageSize)); if (currentPage<tp){ currentPage++; renderTable(); }});
  if (sortBy) sortBy.addEventListener('change', ()=>applyFilters(true));
  if (realtimeToggle) realtimeToggle.addEventListener('change', e => {
    if (e.target.checked) attachRealtime(); else { realtimeAttached=false; loadOnce(); }
  });
  if (btnExportCsv) btnExportCsv.addEventListener('click', exportCSV);

  // also update on filter change (instant)
  const watch = [fromRegionFilter,toRegionFilter,fromDistrictFilter,toDistrictFilter,seatsFilter,categoryFilter,dateFrom,dateTo,userIdFilter,minPrice,maxPrice];
  watch.forEach(w => { if (w) { w.addEventListener('change', ()=>applyFilters(true)); w.addEventListener('input', ()=>applyFilters(true)); }});
}

// -------------------------------
// Bootstrap
// -------------------------------
(function bootstrap(){
  initUI();
  // if realtime toggle default checked, use realtime, else load once
  if (realtimeToggle && realtimeToggle.checked) attachRealtime();
  else loadOnce();
})();

// End of ads.module.js
