// docs/app/taxi/index.js
// Client-side module for taxi app index (ads list) — uses libs/lib.js
// Make sure your index.html includes: <script type="module" src="./index.js"></script>

import {
  getCurrentUser,
  getUserRole,
  getDriverAds,
  getPassengerAds,
  getAllAds,
  onAdsChanged,
  regions,
  formatTimestamp
} from "../../libs/lib.js";

// DOM refs (adapt to your HTML ids)
const adsContainer = document.getElementById('adsContainer');
const loadingBox = document.getElementById('loadingBox');
const emptyBox = document.getElementById('emptyBox');

const regionFromFilter = document.getElementById('regionFrom');
const regionToFilter = document.getElementById('regionTo');
const districtFromFilter = document.getElementById('districtFrom');
const districtToFilter = document.getElementById('districtTo');
const searchInput = document.getElementById('searchInput');
const applyFiltersBtn = document.getElementById('applyFiltersBtn');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');
const sortSelect = document.getElementById('sortSelect');
const pageSizeSelect = document.getElementById('pageSizeSelect');

const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const paginationInfo = document.getElementById('paginationInfo');

let CURRENT_USER = null;
let CURRENT_ROLE = null;
let ALL_ADS = [];
let FILTERED_ADS = [];
let currentPage = 1;
let pageSize = Number((pageSizeSelect && pageSizeSelect.value) || 20);

// ---------- init ----------
async function init() {
  showLoading(true);

  // load user and role
  CURRENT_USER = await getCurrentUser();
  CURRENT_ROLE = CURRENT_USER ? await getUserRole(CURRENT_USER.uid) : null;
  if (!CURRENT_ROLE) CURRENT_ROLE = 'passenger'; // default

  // load ads based on role
  if (CURRENT_ROLE === 'driver') {
    ALL_ADS = await getPassengerAds();
  } else if (CURRENT_ROLE === 'passenger') {
    ALL_ADS = await getDriverAds();
  } else {
    ALL_ADS = await getAllAds();
  }

  // build region selects (regions object in libs is populated by get*Ads)
  fillRegionDropdowns();

  applyFilters(); // initial render
  showLoading(false);

  // setup realtime listener if available
  if (typeof onAdsChanged === 'function') {
    onAdsChanged((newAds) => {
      ALL_ADS = newAds;
      // role-based restrict (keep same logic as load)
      if (CURRENT_ROLE === 'driver') ALL_ADS = ALL_ADS.filter(a => String((a.data.type||a.data.category||'')).toLowerCase() !== 'driver');
      if (CURRENT_ROLE === 'passenger') ALL_ADS = ALL_ADS.filter(a => String((a.data.type||a.data.category||'')).toLowerCase() === 'driver' || (a.data && !a.data.type));
      fillRegionDropdowns();
      applyFilters();
    });
  }
}

// ---------- UI helpers ----------
function showLoading(v) {
  if (!loadingBox) return;
  loadingBox.style.display = v ? 'block' : 'none';
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}

function fillRegionDropdowns() {
  const keys = Object.keys(regions || {}).sort();
  [regionFromFilter, regionToFilter].forEach(select => {
    if (!select) return;
    const cur = select.value || '';
    select.innerHTML = `<option value="">Barchasi</option>`;
    keys.forEach(k => {
      const opt = document.createElement('option');
      opt.value = k;
      opt.innerText = k;
      select.appendChild(opt);
    });
    try { select.value = cur; } catch(e){}
  });
}

function loadDistricts(regionName, targetSelect) {
  if (!targetSelect) return;
  targetSelect.innerHTML = `<option value="">Barchasi</option>`;
  if (!regionName || !regions[regionName]) return;
  regions[regionName].forEach(dist => {
    const o = document.createElement('option');
    o.value = dist;
    o.innerText = dist;
    targetSelect.appendChild(o);
  });
}

// ---------- filtering ----------
function applyFilters() {
  const q = (searchInput && searchInput.value || '').trim().toLowerCase();
  const fr = (regionFromFilter && regionFromFilter.value) || '';
  const tr = (regionToFilter && regionToFilter.value) || '';
  const fd = (districtFromFilter && districtFromFilter.value) || '';
  const td = (districtToFilter && districtToFilter.value) || '';

  const minPrice = Number((document.getElementById('minPrice')||{value:''}).value || 0);
  const maxPrice = Number((document.getElementById('maxPrice')||{value:''}).value || 999999999);

  const sortVal = (sortSelect && sortSelect.value) || 'time_desc';

  FILTERED_ADS = (ALL_ADS || []).filter(item => {
    if (!item || !item.data) return false;
    const d = item.data;

    if (q) {
      const blob = `${d.comment||''} ${d.fromRegion||''} ${d.fromDistrict||''} ${d.toRegion||''} ${d.toDistrict||''} ${d.userId||''} ${d.phone||''} ${d.price||''}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    if (fr && d.fromRegion !== fr) return false;
    if (tr && d.toRegion !== tr) return false;
    if (fd && d.fromDistrict !== fd) return false;
    if (td && d.toDistrict !== td) return false;

    const price = Number(d.price || 0);
    if (price < minPrice) return false;
    if (price > maxPrice) return false;

    return true;
  });

  // sort
  FILTERED_ADS.sort((a,b) => {
    if (sortVal === 'price_asc') return (Number(a.data.price||0) - Number(b.data.price||0));
    if (sortVal === 'price_desc') return (Number(b.data.price||0) - Number(a.data.price||0));
    // default time_desc
    return (Number(b.data.createdAt||0) - Number(a.data.createdAt||0));
  });

  currentPage = 1;
  renderAds();
}

// ---------- rendering ----------
function renderAdCard(item, idxGlobal) {
  const d = item.data || {};
  const id = item.id || '';
  const title = d.title || `${d.fromRegion||''} → ${d.toRegion||''}`;
  const comment = d.comment || '';
  const seats = d.seats || d.driverSeats || '';
  const price = d.price || '';
  const depart = d.departureTime ? new Date(Number(d.departureTime)).toLocaleString() : '-';
  const created = d.createdAt ? formatTimestamp(d.createdAt) : '-';
  return `
    <div class="ad-card" data-id="${escapeHtml(id)}" style="padding:12px;margin-bottom:12px;border-radius:8px;border:1px solid #eef2f6;">
      <div style="display:flex;justify-content:space-between">
        <div>
          <div style="font-weight:600">${escapeHtml(title)}</div>
          <div style="color:#6b7280;margin-top:6px">${escapeHtml(d.fromRegion||'')} ${d.fromDistrict?'/ '+escapeHtml(d.fromDistrict):''} → ${escapeHtml(d.toRegion||'')} ${d.toDistrict?'/ '+escapeHtml(d.toDistrict):''}</div>
          <div style="margin-top:8px">${escapeHtml(comment)}</div>
        </div>
        <div style="text-align:right;min-width:120px">
          <div style="font-weight:700">${price? Number(price).toLocaleString() + ' UZS' : '—'}</div>
          <div style="margin-top:6px">Joy: <strong>${escapeHtml(seats)}</strong></div>
          <div style="margin-top:6px;font-size:12px;color:#9ca3af">${escapeHtml(depart)}</div>
        </div>
      </div>
      <div style="margin-top:10px;text-align:right;">
        <button class="btn-view" data-id="${escapeHtml(id)}" style="margin-right:8px">Ko'rish</button>
        <button class="btn-contact" data-id="${escapeHtml(id)}">Bog'lanish</button>
      </div>
    </div>
  `;
}

function renderAds() {
  if (!adsContainer) return;
  if (!FILTERED_ADS || FILTERED_ADS.length === 0) {
    adsContainer.innerHTML = `<div style="padding:30px;color:#6b7280">Hech narsa topilmadi</div>`;
    renderPagination();
    return;
  }

  pageSize = Number((pageSizeSelect && pageSizeSelect.value) || pageSize);
  const total = FILTERED_ADS.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = FILTERED_ADS.slice(start, end);

  adsContainer.innerHTML = pageItems.map((it, i) => renderAdCard(it, start + i + 1)).join('');
  renderPagination();

  // attach simple listeners
  adsContainer.querySelectorAll('.btn-view').forEach(b => {
    b.onclick = (e) => openAdModal(b.getAttribute('data-id'));
  });
  adsContainer.querySelectorAll('.btn-contact').forEach(b => {
    b.onclick = (e) => {
      const id = b.getAttribute('data-id');
      const ad = FILTERED_ADS.find(x=>x.id===id) || ALL_ADS.find(x=>x.id===id);
      if (!ad) return alert('E\'lon topilmadi');
      const contact = ad.data.phone || ad.data.userId || '—';
      navigator.clipboard?.writeText(contact).then(()=> alert('Kontakt nusxalandi: '+contact)).catch(()=> prompt('Kontakt:', contact));
    };
  });
}

function renderPagination() {
  const total = FILTERED_ADS ? FILTERED_ADS.length : 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (paginationInfo) paginationInfo.innerText = `${currentPage} / ${pages} — ${total} e'lon`;
  if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
  if (nextPageBtn) nextPageBtn.disabled = currentPage >= pages;
}

// ---------- modal (simple) ----------
let modal;
function createModalIfNeeded() {
  if (modal) return;
  modal = document.createElement('div');
  modal.id = 'adModal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.display = 'none';
  modal.style.zIndex = 9999;
  modal.style.background = 'rgba(0,0,0,0.5)';
  modal.innerHTML = `<div style="width:90%;max-width:900px;margin:6% auto;background:#fff;padding:16px;border-radius:8px;position:relative;">
      <button id="modalClose" style="position:absolute;right:12px;top:12px">Yopish</button>
      <div id="modalInner"></div>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelector('#modalClose').onclick = ()=> modal.style.display='none';
}

function openAdModal(adId) {
  createModalIfNeeded();
  const ad = (FILTERED_ADS.find(a=>a.id===adId) || ALL_ADS.find(a=>a.id===adId));
  if (!ad) { alert("E'lon topilmadi"); return; }
  const d = ad.data || {};
  const html = `
    <h3>${escapeHtml(d.title || (d.fromRegion? d.fromRegion+' → '+d.toRegion : 'E\'lon'))}</h3>
    <p><strong>From:</strong> ${escapeHtml(d.fromRegion||'')} ${escapeHtml(d.fromDistrict||'')}</p>
    <p><strong>To:</strong> ${escapeHtml(d.toRegion||'')} ${escapeHtml(d.toDistrict||'')}</p>
    <p><strong>Price:</strong> ${d.price? Number(d.price).toLocaleString()+' UZS' : '-'}</p>
    <p><strong>Seats:</strong> ${escapeHtml(d.seats||d.driverSeats||'-')}</p>
    <p><strong>Comment:</strong><br/>${escapeHtml(d.comment||'-')}</p>
    <p><strong>Contact:</strong> ${escapeHtml(d.phone||d.userId||'-')}</p>
    <p><strong>Created:</strong> ${d.createdAt? formatTimestamp(d.createdAt) : '-'}</p>
  `;
  modal.querySelector('#modalInner').innerHTML = html;
  modal.style.display = 'block';
}

// ---------- events ----------
applyFiltersBtn?.addEventListener('click', applyFilters);
resetFiltersBtn?.addEventListener('click', () => {
  if (searchInput) searchInput.value = '';
  if (regionFromFilter) regionFromFilter.value = '';
  if (regionToFilter) regionToFilter.value = '';
  if (districtFromFilter) districtFromFilter.value = '';
  if (districtToFilter) districtToFilter.value = '';
  const minPrice = document.getElementById('minPrice'); if (minPrice) minPrice.value = '';
  const maxPrice = document.getElementById('maxPrice'); if (maxPrice) maxPrice.value = '';
  applyFilters();
});

if (regionFromFilter) regionFromFilter.addEventListener('change', ()=> loadDistricts(regionFromFilter.value, districtFromFilter));
if (regionToFilter) regionToFilter.addEventListener('change', ()=> loadDistricts(regionToFilter.value, districtToFilter));

if (prevPageBtn) prevPageBtn.addEventListener('click', ()=>{ if (currentPage>1){ currentPage--; renderAds(); }});
if (nextPageBtn) nextPageBtn.addEventListener('click', ()=>{ const pages = Math.max(1, Math.ceil((FILTERED_ADS||[]).length/pageSize)); if (currentPage<pages){ currentPage++; renderAds(); }});
if (pageSizeSelect) pageSizeSelect.addEventListener('change', ()=>{ pageSize = Number(pageSizeSelect.value); currentPage = 1; renderAds(); });

// ---------- start ----------
init().catch(err => {
  console.error('index init error:', err);
  showLoading(false);
});

// export for manual control if needed
export { applyFilters, openAdModal };
