// ------------------------------
//  INDEX.JS — PART 1
//  Base Setup + Role Detection
//  (lib.js bilan integratsiya)
// ------------------------------

import {
    db,
    getCurrentUser,
    getUserRole,
    getDriverAds,
    getPassengerAds,
    getAllAds,
    regions,
    formatTimestamp,
    fetchUserById,
    fetchAdsByType,
} from "../../libs/lib.js";

// ------------------------------
// Global variables
// ------------------------------
let CURRENT_USER = null;
let CURRENT_ROLE = null;   // "driver" | "passenger" | null
let ALL_ADS = [];
let FILTERED_ADS = [];

let currentPage = 1;
let pageSize = 20;

// DOM Elements
const adsContainer = document.getElementById("adsContainer");
const loadingBox  = document.getElementById("loadingBox");
const emptyBox    = document.getElementById("emptyBox");

// Filters
const regionFromFilter = document.getElementById("regionFrom");
const regionToFilter   = document.getElementById("regionTo");
const districtFromFilter = document.getElementById("districtFrom");
const districtToFilter   = document.getElementById("districtTo");
const searchInput = document.getElementById("searchInput");
const applyBtn    = document.getElementById("applyFiltersBtn");
const resetBtn    = document.getElementById("resetFiltersBtn");
const sortSelect  = document.getElementById("sortSelect");
const pageSizeSelect = document.getElementById("pageSizeSelect");

// ------------------------------
// INITIALIZE PAGE
// ------------------------------
async function initIndexPage() {
    showLoading(true);

    // 1. Load current user
    CURRENT_USER = await getCurrentUser();
    if (!CURRENT_USER) {
        console.warn("⚠ User not logged in — default role applied (passenger)");
        CURRENT_ROLE = "passenger";
    } else {
        // 2. Detect role
        CURRENT_ROLE = await getUserRole(CURRENT_USER.uid);
        if (!CURRENT_ROLE) {
            console.warn("⚠ User has no role set. Setting default: passenger");
            CURRENT_ROLE = "passenger";
        }
    }

    console.log("👤 ROLE:", CURRENT_ROLE);

    // 3. Load appropriate ads
    if (CURRENT_ROLE === "driver") {
        // driver sees passenger ads
        ALL_ADS = await getPassengerAds();
    } else if (CURRENT_ROLE === "passenger") {
        ALL_ADS = await getDriverAds();
    } else {
        // fallback — show all ads
        ALL_ADS = await getAllAds();
    }

    console.log("Loaded ads:", ALL_ADS.length);

    // 4. Render dropdown options
    fillRegionDropdowns();

    // 5. Apply initial filters
    applyFilters();

    showLoading(false);
}

// ------------------------------
// SHOW/HIDE LOADING
// ------------------------------
function showLoading(state) {
    if (state) {
        loadingBox.style.display = "block";
        adsContainer.innerHTML = "";
        emptyBox.style.display = "none";
    } else {
        loadingBox.style.display = "none";
    }
}

// ------------------------------
// REGION DROPDOWNS
// ------------------------------
function fillRegionDropdowns() {
    const regionList = Object.keys(regions);

    const list = [regionFromFilter, regionToFilter];

    list.forEach(select => {
        if (!select) return;
        select.innerHTML = `<option value="">Barchasi</option>`;
        regionList.forEach(r => {
            const opt = document.createElement("option");
            opt.value = r;
            opt.innerText = r;
            select.appendChild(opt);
        });
    });
}

// ------------------------------
// DISTRICT LOADER
// (region → district mapping)
// ------------------------------
function loadDistricts(region, targetSelect) {
    if (!targetSelect) return;
    targetSelect.innerHTML = `<option value="">Barchasi</option>`;
    if (!region || !regions[region]) return;

    regions[region].forEach(dist => {
        const opt = document.createElement("option");
        opt.value = dist;
        opt.innerText = dist;
        targetSelect.appendChild(opt);
    });
}

// ------------------------------
// EVENT: region changes → update districts
// ------------------------------
if (regionFromFilter) {
    regionFromFilter.addEventListener("change", () =>
        loadDistricts(regionFromFilter.value, districtFromFilter)
    );
}

if (regionToFilter) {
    regionToFilter.addEventListener("change", () =>
        loadDistricts(regionToFilter.value, districtToFilter)
    );
}

// Export init so HTML can call it
export { initIndexPage };
// --------------------------------------------
// PART 2 — FILTERING, SEARCHING, SORTING
// --------------------------------------------

// Main filter function
function applyFilters() {
    if (!ALL_ADS) ALL_ADS = [];

    const q = (searchInput?.value || "").trim().toLowerCase();
    const regionFrom = regionFromFilter?.value || "";
    const regionTo   = regionToFilter?.value || "";
    const distFrom   = districtFromFilter?.value || "";
    const distTo     = districtToFilter?.value || "";
    const sortVal    = sortSelect?.value || "time_desc";

    // Price filter
    const minPriceEl = document.getElementById("minPrice");
    const maxPriceEl = document.getElementById("maxPrice");
    const minPrice = minPriceEl ? Number(minPriceEl.value || 0) : 0;
    const maxPrice = maxPriceEl ? Number(maxPriceEl.value || 999999999) : 999999999;

    let filtered = ALL_ADS.filter(ad => {
        if (!ad) return false;
        const d = ad.data || {};

        // 1) SEARCH
        if (q) {
            const blob = `
                ${d.comment || ""}
                ${d.fromRegion || ""} ${d.fromDistrict || ""}
                ${d.toRegion || ""} ${d.toDistrict || ""}
                ${d.userId || ""}
                ${d.phone || ""}
                ${d.price || ""}
            `.toLowerCase();

            if (!blob.includes(q)) return false;
        }

        // 2) REGION FILTERS
        if (regionFrom && d.fromRegion !== regionFrom) return false;
        if (regionTo   && d.toRegion !== regionTo) return false;

        // 3) DISTRICT FILTERS
        if (distFrom && d.fromDistrict !== distFrom) return false;
        if (distTo   && d.toDistrict !== distTo) return false;

        // 4) PRICE
        const price = Number(d.price || 0);
        if (price < minPrice) return false;
        if (price > maxPrice) return false;

        return true;
    });

    // 5) SORT
    filtered = sortAds(filtered, sortVal);

    FILTERED_ADS = filtered;
    currentPage = 1;

    renderAds();
}

// --------------------------------------------
// SORTING FUNCTION
// --------------------------------------------
function sortAds(list, mode) {
    const sorted = [...list];

    switch (mode) {
        case "price_asc":
            sorted.sort((a, b) => Number(a.data.price||0) - Number(b.data.price||0));
            break;

        case "price_desc":
            sorted.sort((a, b) => Number(b.data.price||0) - Number(a.data.price||0));
            break;

        case "time_asc":
            sorted.sort((a, b) =>
                Number(a.data.createdAt||0) - Number(b.data.createdAt||0)
            );
            break;

        case "time_desc":
        default:
            sorted.sort((a, b) =>
                Number(b.data.createdAt||0) - Number(a.data.createdAt||0)
            );
            break;
    }

    return sorted;
}

// --------------------------------------------
// EVENT LISTENERS
// --------------------------------------------
applyBtn?.addEventListener("click", applyFilters);
resetBtn?.addEventListener("click", () => {
    searchInput.value = "";
    regionFromFilter.value = "";
    regionToFilter.value = "";
    districtFromFilter.value = "";
    districtToFilter.value = "";

    const minPriceEl = document.getElementById("minPrice");
    const maxPriceEl = document.getElementById("maxPrice");
    if (minPriceEl) minPriceEl.value = "";
    if (maxPriceEl) maxPriceEl.value = "";

    applyFilters();
});

sortSelect?.addEventListener("change", applyFilters);

searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") applyFilters();
});

// Export filters (if HTML needs)
export { applyFilters };
// --------------------------------------------
// PART 3 — RENDERING, PAGINATION, AD DETAIL
// --------------------------------------------

// Helper: safe text
function safe(s) {
  if (s === null || s === undefined) return '';
  return String(s);
}

// Format price (UZS) - you can adapt currency symbol
function formatPrice(p) {
  if (p === null || p === undefined || p === '') return '—';
  const n = Number(p) || 0;
  return new Intl.NumberFormat('ru-RU').format(n) + ' UZS';
}

// Render a single ad card (returns HTML string)
function renderAdCard(item, indexGlobal) {
  const d = item.data || {};
  const id = item.id || '';
  const title = safe(d.title || `${d.fromRegion || ''} → ${d.toRegion || ''}`);
  const comment = safe(d.comment || '');
  const seats = d.seats || d.driverSeats || '';
  const price = d.price || '';
  const depart = d.departureTime ? new Date(Number(d.departureTime)).toLocaleString() : '-';
  const created = d.createdAt ? new Date(Number(d.createdAt)).toLocaleString() : '-';
  const fromRegionText = safe(d.fromRegion || '');
  const toRegionText = safe(d.toRegion || '');
  const fromDistrictText = safe(d.fromDistrict || '');
  const toDistrictText = safe(d.toDistrict || '');
  const userId = safe(d.userId || item.userId || '');

  // small badge for category if present
  const cat = safe(d.category || d.type || '');

  return `
    <div class="ad-card" data-ad-id="${id}" style="border:1px solid #e6e9ef;border-radius:8px;padding:12px;margin-bottom:12px;">
      <div style="display:flex;gap:12px;align-items:flex-start;">
        <div style="flex:1;">
          <div style="font-weight:600;font-size:15px">${escapeHtml(title)} ${cat ? `<span style="font-size:12px;color:#6b7280;margin-left:6px">(${escapeHtml(cat)})</span>` : ''}</div>
          <div style="color:#6b7280;font-size:13px;margin-top:6px">${escapeHtml(fromRegionText)} ${fromDistrictText ? ' / ' + escapeHtml(fromDistrictText) : ''} → ${escapeHtml(toRegionText)} ${toDistrictText ? ' / ' + escapeHtml(toDistrictText) : ''}</div>
          <div style="margin-top:8px;color:#374151">${escapeHtml(comment)}</div>
        </div>

        <div style="min-width:140px;text-align:right;">
          <div style="font-size:18px;font-weight:700">${formatPrice(price)}</div>
          <div style="font-size:13px;color:#6b7280;margin-top:6px">Joylar: <strong>${escapeHtml(seats)}</strong></div>
          <div style="font-size:12px;color:#9ca3af;margin-top:6px">Jo‘natish: ${escapeHtml(depart)}</div>
        </div>
      </div>

      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px;">
        <button class="btn-view" data-id="${id}" style="padding:6px 10px;border-radius:6px;border:1px solid #e2e8f0;background:#fff;cursor:pointer;">Ko'rish</button>
        <button class="btn-contact" data-id="${id}" style="padding:6px 10px;border-radius:6px;border:1px solid #0ea5e9;background:#0ea5e9;color:#fff;cursor:pointer;">Bog'lanish</button>
        <button class="btn-bookmark" data-id="${id}" style="padding:6px 10px;border-radius:6px;border:1px solid #f3f4f6;background:#fff;cursor:pointer;">Saqlash</button>
      </div>
    </div>
  `;
}

// Render current page from FILTERED_ADS
function renderAds() {
  // hide loading
  if (loadingBox) loadingBox.style.display = 'none';

  if (!FILTERED_ADS || FILTERED_ADS.length === 0) {
    adsContainer.innerHTML = `<div style="padding:40px;text-align:center;color:#6b7280">Hech narsa topilmadi</div>`;
    renderPagination(); // still update pagination (0/0)
    return;
  }

  // calculate slice
  const total = FILTERED_ADS.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = FILTERED_ADS.slice(start, end);

  // build html
  const html = pageItems.map((it, idx) => renderAdCard(it, start + idx + 1)).join('');
  adsContainer.innerHTML = html;

  // update pagination UI
  renderPagination();

  // attach delegated listeners for view/contact/bookmark
  attachCardListeners();
}

// Render pagination controls
function renderPagination() {
  const total = FILTERED_ADS ? FILTERED_ADS.length : 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  // update prev/next buttons state if exist
  const prev = document.getElementById('prevPageBtn');
  const next = document.getElementById('nextPageBtn');
  const info = document.getElementById('paginationInfo') || document.getElementById('pageInfo');

  if (prev) prev.disabled = currentPage <= 1;
  if (next) next.disabled = currentPage >= pages;
  if (info) info.textContent = `${currentPage} / ${pages} — ${total} e'lon`;
}

// Attach click listeners using delegation (safer)
function attachCardListeners() {
  // View buttons
  adsContainer.querySelectorAll('.btn-view').forEach(btn => {
    btn.removeEventListener('click', onViewClick);
    btn.addEventListener('click', onViewClick);
  });

  // Contact
  adsContainer.querySelectorAll('.btn-contact').forEach(btn => {
    btn.removeEventListener('click', onContactClick);
    btn.addEventListener('click', onContactClick);
  });

  // Bookmark (client-side local storage)
  adsContainer.querySelectorAll('.btn-bookmark').forEach(btn => {
    btn.removeEventListener('click', onBookmarkClick);
    btn.addEventListener('click', onBookmarkClick);
  });
}

// Handlers
function onViewClick(e) {
  const id = e.currentTarget.getAttribute('data-id');
  openAdModal(id);
}

function onContactClick(e) {
  const id = e.currentTarget.getAttribute('data-id');
  // find ad
  const ad = FILTERED_ADS.find(x => x.id === id) || ALL_ADS.find(x => x.id === id);
  if (!ad) return alert('Ad topilmadi');
  // choose contact method (phone/email)
  const phone = ad.data && ad.data.phone;
  const userId = ad.data && (ad.data.userId || ad.userId);
  const contact = phone ? `Tel: ${phone}` : `Foydalanuvchi ID: ${userId}`;
  // simple copy to clipboard and alert
  navigator.clipboard?.writeText(contact).then(() => {
    alert('Bog\'lanish ma\'lumotlari clipboardga nusxalandi: ' + contact);
  }).catch(() => {
    prompt('Bog\'lanish ma\'lumotlari:', contact);
  });
}

function onBookmarkClick(e) {
  const id = e.currentTarget.getAttribute('data-id');
  const key = 'saved_ads_v1';
  const stored = JSON.parse(localStorage.getItem(key) || '[]');
  if (stored.includes(id)) {
    // remove
    const newArr = stored.filter(x => x !== id);
    localStorage.setItem(key, JSON.stringify(newArr));
    e.currentTarget.innerText = 'Saqlash';
    alert('E\'lon olib tashlandi');
  } else {
    stored.push(id);
    localStorage.setItem(key, JSON.stringify(stored));
    e.currentTarget.innerText = 'Saqlangan';
    alert('E\'lon saqlandi');
  }
}

// --------------------------------------------
// AD DETAIL MODAL (simple inline modal implementation)
// --------------------------------------------
let modalEl = null;
function createAdModal() {
  if (modalEl) return;
  modalEl = document.createElement('div');
  modalEl.id = 'adDetailModal';
  modalEl.style.position = 'fixed';
  modalEl.style.left = '0';
  modalEl.style.top = '0';
  modalEl.style.width = '100%';
  modalEl.style.height = '100%';
  modalEl.style.background = 'rgba(0,0,0,0.5)';
  modalEl.style.display = 'none';
  modalEl.style.zIndex = '9999';
  modalEl.innerHTML = `
    <div style="max-width:900px;margin:6% auto;background:#fff;padding:18px;border-radius:10px;box-shadow:0 6px 30px rgba(0,0,0,0.2);position:relative;">
      <button id="modalCloseBtn" style="position:absolute;right:12px;top:12px;padding:6px 10px;border-radius:6px;border:none;background:#ef4444;color:#fff;cursor:pointer;">Yopish</button>
      <div id="modalContent"></div>
    </div>
  `;
  document.body.appendChild(modalEl);

  modalEl.querySelector('#modalCloseBtn').addEventListener('click', () => {
    modalEl.style.display = 'none';
  });
}

function openAdModal(id) {
  createAdModal();
  const ad = (ALL_ADS.find(x => x.id === id) || FILTERED_ADS.find(x => x.id === id));
  if (!ad) {
    alert('E\'lon topilmadi');
    return;
  }
  const d = ad.data || {};
  const html = `
    <h2 style="margin:0 0 6px 0">${escapeHtml(d.title || (d.fromRegion ? d.fromRegion + ' → ' + d.toRegion : 'E\'lon'))}</h2>
    <div style="color:#6b7280;margin-bottom:8px">E'lon ID: ${escapeHtml(ad.id)}</div>

    <div style="display:grid;grid-template-columns:1fr 280px;gap:12px;">
      <div>
        <p><strong>From:</strong> ${escapeHtml(d.fromRegion || '')} ${escapeHtml(d.fromDistrict || '')}</p>
        <p><strong>To:</strong> ${escapeHtml(d.toRegion || '')} ${escapeHtml(d.toDistrict || '')}</p>
        <p><strong>Departure:</strong> ${d.departureTime ? new Date(Number(d.departureTime)).toLocaleString() : '-'}</p>
        <p><strong>Seats:</strong> ${escapeHtml(d.seats || d.driverSeats || '')}</p>
        <p><strong>Price:</strong> ${formatPrice(d.price)}</p>
        <p><strong>Comment:</strong><br/>${escapeHtml(d.comment || '-')}</p>
      </div>

      <div style="border-left:1px solid #f3f4f6;padding-left:12px;">
        <p><strong>Posted by:</strong> ${escapeHtml(d.userId || ad.userId || '-')}</p>
        <p><strong>Contact:</strong> ${escapeHtml(d.phone || '-')}</p>
        <p><strong>Created:</strong> ${d.createdAt ? new Date(Number(d.createdAt)).toLocaleString() : '-'}</p>
        <div style="margin-top:12px;">
          <button id="modalContactBtn" style="padding:8px 10px;border-radius:6px;border:none;background:#0ea5e9;color:#fff;cursor:pointer;">Bog'lanish</button>
          <button id="modalRouteBtn" style="padding:8px 10px;border-radius:6px;border:1px solid #e2e8f0;background:#fff;margin-left:8px;cursor:pointer;">Yo'lni ko'rsat</button>
        </div>
      </div>
    </div>
  `;
  modalEl.querySelector('#modalContent').innerHTML = html;
  modalEl.style.display = 'block';

  // modal contact button
  modalEl.querySelector('#modalContactBtn').addEventListener('click', () => {
    const contact = d.phone || (d.userId || ad.userId);
    navigator.clipboard?.writeText(contact).then(() => alert('Kontakt nusxalandi: ' + contact)).catch(() => prompt('Kontakt:', contact));
  });

  // route button - just a sample (could open Google Maps if coords present)
  modalEl.querySelector('#modalRouteBtn').addEventListener('click', () => {
    if (d.fromCoords && d.toCoords) {
      const from = `${d.fromCoords.lat},${d.fromCoords.lng}`;
      const to = `${d.toCoords.lat},${d.toCoords.lng}`;
      window.open(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}`, '_blank');
    } else {
      alert('Yo\'lni ko\'rsatish uchun koordinatlar yo\'q.');
    }
  });
}

// --------------------------------------------
// Pagination controls (prev/next buttons already exist)
// --------------------------------------------
const prevBtnMain = document.getElementById('prevPageBtn');
const nextBtnMain = document.getElementById('nextPageBtn');

if (prevBtnMain) prevBtnMain.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    renderAds();
  }
});
if (nextBtnMain) nextBtnMain.addEventListener('click', () => {
  const total = Math.ceil((FILTERED_ADS ? FILTERED_ADS.length : 0) / pageSize);
  if (currentPage < total) {
    currentPage++;
    renderAds();
  }
});

// --------------------------------------------
// Small utility: ensure district selects repopulate when relevant
// (If your UI uses radio lists, adapt accordingly)
// --------------------------------------------
function ensureDistrictsSync() {
  // if a region selected, ensure district lists exist
  if (regionFromFilter && districtFromFilter) {
    loadDistricts(regionFromFilter.value, districtFromFilter);
  }
  if (regionToFilter && districtToFilter) {
    loadDistricts(regionToFilter.value, districtToFilter);
  }
}

// Call ensureDistrictsSync at startup (in case persisted values)
ensureDistrictsSync();

// --------------------------------------------
// Initial render if data already loaded
// --------------------------------------------
if (ALL_ADS && ALL_ADS.length > 0) {
  applyFilters(); // will call renderAds
}
// --------------------------------------------
// PART 4 — REALTIME UPDATES (if supported in lib.js)
// --------------------------------------------

import { onAdsChanged } from "../../libs/lib.js";  // may or may not exist

let REALTIME_ENABLED = true;  // you can disable this if needed

if (typeof onAdsChanged === "function" && REALTIME_ENABLED) {
    console.log("Realtime update listening activated");

    onAdsChanged((newAds) => {
        console.log("Realtime: ADS updated:", newAds.length);
        ALL_ADS = newAds;

        // restore role-based filtering
        if (CURRENT_ROLE === "driver") {
            ALL_ADS = ALL_ADS.filter(a => a.data?.type === "passenger");
        } else if (CURRENT_ROLE === "passenger") {
            ALL_ADS = ALL_ADS.filter(a => a.data?.type === "driver");
        }

        applyFilters();
    });
}
// --------------------------------------------
// CACHING — localStorage boost
// Cache key is based on user role
// --------------------------------------------

function cacheAds() {
    if (!ALL_ADS || ALL_ADS.length === 0) return;
    const key = CURRENT_ROLE === "driver" ? "cache_passenger_ads" : "cache_driver_ads";
    localStorage.setItem(key, JSON.stringify(ALL_ADS));
}

function loadCacheIfExists() {
    const key = CURRENT_ROLE === "driver" ? "cache_passenger_ads" : "cache_driver_ads";
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return false;
        const ads = JSON.parse(raw);
        if (!Array.isArray(ads)) return false;

        console.log("Loaded cached ads:", ads.length);
        ALL_ADS = ads;
        applyFilters();
        return true;

    } catch (e) {
        console.warn("Cache load failed:", e);
        return false;
    }
}
// --------------------------------------------
// FINAL INIT SEQUENCE
// --------------------------------------------
async function startApp() {
    showLoading(true);

    // 1) Load user
    CURRENT_USER = await getCurrentUser();
    CURRENT_ROLE = await getUserRole(CURRENT_USER?.uid);

    if (!CURRENT_ROLE) {
        console.warn("No role found. Default: passenger");
        CURRENT_ROLE = "passenger";
    }

    console.log("User ROLE:", CURRENT_ROLE);

    // 2) Try load cached data first
    const cacheLoaded = loadCacheIfExists();

    // 3) Load fresh data
    let freshAds = [];
    if (CURRENT_ROLE === "driver") freshAds = await getPassengerAds();
    else if (CURRENT_ROLE === "passenger") freshAds = await getDriverAds();
    else freshAds = await getAllAds();

    ALL_ADS = freshAds;

    // 4) Save to cache
    cacheAds();

    // 5) Render region dropdowns
    fillRegionDropdowns();
    ensureDistrictsSync();

    // 6) Apply filtering
    applyFilters();

    showLoading(false);
}

// Export start function
export { startApp };
function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
