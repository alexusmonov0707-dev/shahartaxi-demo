// docs/app/taxi/index.js
// Foydalanuvchi e'lonlari sahifasi (index.html) uchun to'liq modul.
// U ../../libs/lib.js dan Firebase v10 modular eksportlarini ishlatadi.
//
// Joylashuv taxmin: docs/app/taxi/index.html — shu papkada index.js bo'ladi.
// libs fayli yer: docs/libs/lib.js -> import path: "../../libs/lib.js"
//
// Muallif: ChatGPT — moslangan siz yuborgan lib.js ga. :contentReference[oaicite:1]{index=1}

// -------------------------------
// Imports (from your libs wrapper)
import {
  db,
  ref,
  get,
  onValue,
  child,
  onAuthStateChanged,
  auth
} from "../../libs/lib.js";

// -------------------------------
// DOM refs (ensure same IDs as your index.html)
const adsContainer = document.getElementById("adsContainer");
const loadingBox = document.getElementById("loadingBox");
const emptyBox = document.getElementById("emptyBox");

const searchInput = document.getElementById("searchInput");
const regionFromFilter = document.getElementById("regionFrom");
const regionToFilter = document.getElementById("regionTo");
const districtFromFilter = document.getElementById("districtFrom");
const districtToFilter = document.getElementById("districtTo");
const minPriceEl = document.getElementById("minPrice");
const maxPriceEl = document.getElementById("maxPrice");
const sortSelect = document.getElementById("sortSelect");
const pageSizeSelect = document.getElementById("pageSizeSelect");
const applyFiltersBtn = document.getElementById("applyFiltersBtn");
const resetFiltersBtn = document.getElementById("resetFiltersBtn");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const paginationInfo = document.getElementById("paginationInfo");

// side quick filters (optional)
const onlyFreeSeatsChk = document.getElementById("onlyFreeSeats");
const withPhoneChk = document.getElementById("withPhone");
const resetQuickBtn = document.getElementById("resetQuick");

// -------------------------------
// State
let ALL_ADS = [];      // array of { id, data, userId? }
let FILTERED_ADS = []; // after filters applied
let REGIONS = {};      // built from ads: { regionName: [districts...] }

let CURRENT_USER = null;
let CURRENT_ROLE = null; // "driver" | "passenger" | null

let currentPage = 1;
let pageSize = Number((pageSizeSelect && pageSizeSelect.value) || 20);
let realtimeUnsub = null;
let realtimeEnabled = true; // toggle if you want realtime

// -------------------------------
// Utilities
function safeString(s) {
  if (s === undefined || s === null) return "";
  return String(s);
}
function escapeHtml(s) {
  if (s === undefined || s === null) return "";
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
function fmtDate(ts) {
  if (!ts) return "—";
  const n = Number(ts);
  if (!n) return "—";
  return new Date(n).toLocaleString();
}
function safeNum(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

// -------------------------------
// Flatten snapshot (supports 1-level & 2-level /ads structure)
function flattenAdsSnapshot(snapshot) {
  const out = [];
  if (!snapshot) return out;
  // snapshot may be a DataSnapshot or plain object
  const root = snapshot.val ? snapshot.val() : snapshot;
  if (!root || typeof root !== "object") return out;

  Object.entries(root).forEach(([k, v]) => {
    // 1-level: ads -> adId -> adData (v looks like ad)
    if (v && typeof v === "object" && (v.createdAt || v.fromRegion || v.price || v.comment)) {
      out.push({ id: k, data: v });
      return;
    }
    // 2-level: ads -> userId -> adId -> adData
    if (v && typeof v === "object") {
      Object.entries(v).forEach(([k2, v2]) => {
        if (v2 && typeof v2 === "object" && (v2.createdAt || v2.fromRegion || v2.price || v2.comment)) {
          out.push({ id: k2, data: v2, userId: k });
        }
      });
    }
  });

  return out;
}

// -------------------------------
// Build regions/districts mapping from ALL_ADS
function buildRegions(adsArray) {
  const map = {};
  adsArray.forEach(item => {
    const d = item.data || {};
    if (d.fromRegion) {
      map[d.fromRegion] = map[d.fromRegion] || new Set();
      if (d.fromDistrict) map[d.fromRegion].add(d.fromDistrict);
    }
    if (d.toRegion) {
      map[d.toRegion] = map[d.toRegion] || new Set();
      if (d.toDistrict) map[d.toRegion].add(d.toDistrict);
    }
  });
  // convert to arrays
  const obj = {};
  Object.keys(map).sort().forEach(r => {
    obj[r] = Array.from(map[r]).sort();
  });
  REGIONS = obj;
}

// -------------------------------
// Fill region selects
function fillRegionSelects() {
  const keys = Object.keys(REGIONS || {});
  function populate(sel, prev) {
    if (!sel) return;
    const cur = sel.value || "";
    sel.innerHTML = `<option value="">Barchasi</option>`;
    keys.forEach(k => {
      const opt = document.createElement("option");
      opt.value = k;
      opt.innerText = k;
      sel.appendChild(opt);
    });
    try { sel.value = cur; } catch (e) {}
  }
  populate(regionFromFilter);
  populate(regionToFilter);
}

// -------------------------------
// Load districts for a region into select
function loadDistricts(regionName, targetSelect) {
  if (!targetSelect) return;
  targetSelect.innerHTML = `<option value="">Barchasi</option>`;
  if (!regionName || !REGIONS[regionName]) return;
  REGIONS[regionName].forEach(d => {
    const o = document.createElement("option");
    o.value = d;
    o.innerText = d;
    targetSelect.appendChild(o);
  });
}

// -------------------------------
// Load ads once (non-realtime)
async function loadAdsOnce() {
  try {
    showLoading(true);
    const rootRef = ref(db, "ads");
    const snap = await get(rootRef);
    const arr = flattenAdsSnapshot(snap);
    ALL_ADS = arr;
    buildRegions(ALL_ADS);
    fillRegionSelects();
    applyFilters(); // initial
    showLoading(false);
  } catch (e) {
    console.error("loadAdsOnce error:", e);
    showLoading(false);
  }
}

// -------------------------------
// Attach realtime listener
function attachRealtime() {
  try {
    if (!realtimeEnabled) return;
    const r = ref(db, "ads");
    // detach previous if exists
    if (realtimeUnsub && typeof realtimeUnsub === "function") {
      try { realtimeUnsub(); } catch(e) {}
    }
    // onValue returns unsubscribe function in libs? We implement detach via returned function wrapper
    const onVal = onValue(r, (snap) => {
      ALL_ADS = flattenAdsSnapshot(snap);
      buildRegions(ALL_ADS);
      fillRegionSelects();
      applyFilters(false);
    }, (err) => {
      console.error("onValue ads error:", err);
    });
    // libs onValue doesn't return unsub => we create unsub wrapper that calls nothing
    realtimeUnsub = () => { /* no-op (cannot detach easily without original onValue handle) */ };
  } catch (e) {
    console.warn("attachRealtime error:", e);
  }
}

// -------------------------------
// Role detection
function detectRoleAndLoad() {
  return new Promise((resolve) => {
    // onAuthStateChanged provided by lib wrapper
    try {
      const un = onAuthStateChanged(auth, async (user) => {
        // unsubscribe immediately
        try { if (typeof un === "function") un(); } catch(e){}
        CURRENT_USER = user || null;
        if (!user) {
          CURRENT_ROLE = "passenger"; // default for anonymous
        } else {
          // try to read role from DB: users/{uid}/role
          try {
            const userRoleRef = ref(db, `users/${user.uid}/role`);
            const snap = await get(userRoleRef);
            CURRENT_ROLE = (snap && snap.exists()) ? snap.val() : "passenger";
          } catch (e) {
            console.warn("get user role failed:", e);
            CURRENT_ROLE = "passenger";
          }
        }
        resolve(CURRENT_ROLE);
      }, (err) => {
        console.warn("onAuthStateChanged error:", err);
        CURRENT_USER = null;
        CURRENT_ROLE = "passenger";
        resolve(CURRENT_ROLE);
      });
    } catch (e) {
      console.warn("detectRole error:", e);
      CURRENT_USER = null;
      CURRENT_ROLE = "passenger";
      resolve(CURRENT_ROLE);
    }
  });
}

// -------------------------------
// Apply filters & search
function applyFilters(resetPage = true) {
  const q = (searchInput && searchInput.value || "").trim().toLowerCase();
  const fr = (regionFromFilter && regionFromFilter.value) || "";
  const tr = (regionToFilter && regionToFilter.value) || "";
  const fd = (districtFromFilter && districtFromFilter.value) || "";
  const td = (districtToFilter && districtToFilter.value) || "";

  const minP = safeNum(minPriceEl && minPriceEl.value, 0);
  const maxP = safeNum(maxPriceEl && maxPriceEl.value, Number.MAX_SAFE_INTEGER);
  const onlyFree = (onlyFreeSeatsChk && onlyFreeSeatsChk.checked) || false;
  const withPhone = (withPhoneChk && withPhoneChk.checked) || false;

  // choose base array based on role: driver sees passenger ads, passenger sees driver ads
  let base = ALL_ADS.slice();

  // role filtering: infer by data.type or category. If missing, permissive include.
  if (CURRENT_ROLE === "driver") {
    base = base.filter(it => {
      const t = (it.data && (it.data.type || it.data.category) || "").toString().toLowerCase();
      // exclude driver-posted ads
      return t !== "driver";
    });
  } else if (CURRENT_ROLE === "passenger") {
    base = base.filter(it => {
      const t = (it.data && (it.data.type || it.data.category) || "").toString().toLowerCase();
      // include only driver ads OR no type (permissive)
      return t === "driver" || !t;
    });
  }

  let filtered = base.filter(item => {
    if (!item || !item.data) return false;
    const d = item.data;

    // search text across common fields
    if (q) {
      const blob = `${d.comment||""} ${d.fromRegion||""} ${d.fromDistrict||""} ${d.toRegion||""} ${d.toDistrict||""} ${d.userId||""} ${d.phone||""} ${d.price||""}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }

    if (fr && d.fromRegion !== fr) return false;
    if (tr && d.toRegion !== tr) return false;
    if (fd && d.fromDistrict !== fd) return false;
    if (td && d.toDistrict !== td) return false;

    const price = safeNum(d.price, 0);
    if (price < minP) return false;
    if (price > maxP) return false;

    if (onlyFree) {
      const seats = safeNum(d.seats || d.driverSeats || 0, 0);
      if (seats <= 0) return false;
    }
    if (withPhone) {
      if (!d.phone || String(d.phone).trim() === "") return false;
    }

    return true;
  });

  // sort
  const sortVal = (sortSelect && sortSelect.value) || "time_desc";
  filtered.sort((a, b) => {
    const A = a.data || {};
    const B = b.data || {};
    if (sortVal === "price_asc") return safeNum(A.price,0) - safeNum(B.price,0);
    if (sortVal === "price_desc") return safeNum(B.price,0) - safeNum(A.price,0);
    // time
    return safeNum(B.createdAt,0) - safeNum(A.createdAt,0);
  });

  FILTERED_ADS = filtered;
  if (resetPage) currentPage = 1;
  renderTable();
}

// -------------------------------
// Render with pagination
function renderTable() {
  if (!adsContainer) return;
  adsContainer.innerHTML = "";

  pageSize = Number((pageSizeSelect && pageSizeSelect.value) || pageSize);
  const total = (FILTERED_ADS && FILTERED_ADS.length) || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;

  if (total === 0) {
    emptyBox && (emptyBox.style.display = "block");
    adsContainer.innerHTML = `<div style="padding:24px;color:#6b7280;text-align:center">Hech narsa topilmadi</div>`;
    updatePaginationInfo();
    return;
  } else {
    emptyBox && (emptyBox.style.display = "none");
  }

  const start = (currentPage - 1) * pageSize;
  const pageItems = FILTERED_ADS.slice(start, start + pageSize);

  // build html
  const html = pageItems.map((item, idx) => {
    const d = item.data || {};
    const id = item.id || "";
    const title = escapeHtml(d.title || `${d.fromRegion||""} → ${d.toRegion||""}`);
    const comment = escapeHtml(d.comment || "");
    const seats = escapeHtml(d.seats || d.driverSeats || "");
    const price = d.price ? (Number(d.price).toLocaleString() + " UZS") : "—";
    const depart = (d.departureTime) ? escapeHtml(fmtDate(d.departureTime)) : "—";
    const regionLine = `${escapeHtml(d.fromRegion||"")} ${d.fromDistrict ? "/ "+escapeHtml(d.fromDistrict) : ""} → ${escapeHtml(d.toRegion||"")} ${d.toDistrict ? "/ "+escapeHtml(d.toDistrict) : ""}`;

    return `
      <div class="ad-card" data-id="${escapeHtml(id)}" style="border:1px solid #eef2f6;border-radius:8px;padding:12px;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
          <div style="flex:1;">
            <div style="font-weight:600">${title}</div>
            <div style="color:#6b7280;margin-top:6px">${regionLine}</div>
            <div style="margin-top:8px">${comment}</div>
          </div>
          <div style="min-width:140px;text-align:right">
            <div style="font-size:18px;font-weight:700">${price}</div>
            <div style="margin-top:6px">Joy: <strong>${seats}</strong></div>
            <div style="margin-top:6px;font-size:12px;color:#9ca3af">${depart}</div>
          </div>
        </div>
        <div style="text-align:right;margin-top:10px">
          <button class="btn-view" data-id="${escapeHtml(id)}" style="margin-right:8px">Ko'rish</button>
          <button class="btn-contact" data-id="${escapeHtml(id)}">Bog'lanish</button>
        </div>
      </div>
    `;
  }).join("");

  adsContainer.innerHTML = html;

  // attach listeners
  adsContainer.querySelectorAll(".btn-view").forEach(b => {
    b.onclick = () => openAdModal(b.getAttribute("data-id"));
  });
  adsContainer.querySelectorAll(".btn-contact").forEach(b => {
    b.onclick = () => contactAd(b.getAttribute("data-id"));
  });

  updatePaginationInfo();
}

// -------------------------------
// Pagination UI update
function updatePaginationInfo() {
  const total = (FILTERED_ADS && FILTERED_ADS.length) || 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (paginationInfo) paginationInfo.innerText = `${currentPage} / ${pages} — ${total} e'lon`;
  if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
  if (nextPageBtn) nextPageBtn.disabled = currentPage >= pages;
}

// -------------------------------
// Contact handler
function contactAd(adId) {
  const ad = (FILTERED_ADS.find(a=>a.id===adId) || ALL_ADS.find(a=>a.id===adId));
  if (!ad) return alert("E'lon topilmadi");
  const phone = ad.data && ad.data.phone;
  const userId = ad.data && (ad.data.userId || ad.userId);
  const contact = phone || userId || "—";
  if (navigator.clipboard) {
    navigator.clipboard.writeText(contact).then(()=> {
      alert("Kontakt nusxalandi: " + contact);
    }).catch(()=> {
      prompt("Kontakt:", contact);
    });
  } else {
    prompt("Kontakt:", contact);
  }
}

// -------------------------------
// Simple modal for view
let modalEl = null;
function createModal() {
  if (modalEl) return;
  modalEl = document.createElement("div");
  modalEl.id = "adDetailModal";
  modalEl.style.position = "fixed";
  modalEl.style.left = "0";
  modalEl.style.top = "0";
  modalEl.style.width = "100%";
  modalEl.style.height = "100%";
  modalEl.style.background = "rgba(0,0,0,0.5)";
  modalEl.style.display = "none";
  modalEl.style.zIndex = "9999";
  modalEl.innerHTML = `
    <div style="max-width:900px;margin:6% auto;background:#fff;padding:18px;border-radius:10px;position:relative;">
      <button id="modalCloseBtn" style="position:absolute;right:12px;top:12px;padding:6px 10px;border-radius:6px;border:none;background:#ef4444;color:#fff;cursor:pointer;">Yopish</button>
      <div id="modalContent"></div>
    </div>
  `;
  document.body.appendChild(modalEl);
  modalEl.querySelector("#modalCloseBtn").addEventListener("click", ()=> modalEl.style.display = "none");
}
function openAdModal(adId) {
  createModal();
  const ad = (FILTERED_ADS.find(a=>a.id===adId) || ALL_ADS.find(a=>a.id===adId));
  if (!ad) return alert("E'lon topilmadi");
  const d = ad.data || {};
  const html = `
    <h3 style="margin:0 0 6px 0">${escapeHtml(d.title || (d.fromRegion? d.fromRegion + " → " + d.toRegion : "E'lon"))}</h3>
    <div style="color:#6b7280;margin-bottom:8px">ID: ${escapeHtml(ad.id)}</div>
    <div style="display:grid;grid-template-columns:1fr 260px;gap:12px;">
      <div>
        <p><strong>From:</strong> ${escapeHtml(d.fromRegion||'')} ${escapeHtml(d.fromDistrict||'')}</p>
        <p><strong>To:</strong> ${escapeHtml(d.toRegion||'')} ${escapeHtml(d.toDistrict||'')}</p>
        <p><strong>Departure:</strong> ${d.departureTime ? fmtDate(d.departureTime) : '-'}</p>
        <p><strong>Seats:</strong> ${escapeHtml(d.seats||d.driverSeats||'-')}</p>
        <p><strong>Price:</strong> ${d.price? Number(d.price).toLocaleString() + ' UZS' : '-'}</p>
        <p><strong>Comment:</strong><br/>${escapeHtml(d.comment||'-')}</p>
      </div>
      <div style="border-left:1px solid #f3f4f6;padding-left:12px;">
        <p><strong>Posted by:</strong> ${escapeHtml(d.userId||ad.userId||'-')}</p>
        <p><strong>Contact:</strong> ${escapeHtml(d.phone||'-')}</p>
        <p><strong>Created:</strong> ${d.createdAt ? fmtDate(d.createdAt) : '-'}</p>
        <div style="margin-top:12px;">
          <button id="modalContactBtn" style="padding:8px 10px;border-radius:6px;border:none;background:#0ea5e9;color:#fff;cursor:pointer;">Bog'lanish</button>
        </div>
      </div>
    </div>
  `;
  modalEl.querySelector("#modalContent").innerHTML = html;
  modalEl.style.display = "block";
  modalEl.querySelector("#modalContactBtn").addEventListener("click", ()=> {
    const contact = d.phone || d.userId || ad.userId || "-";
    navigator.clipboard?.writeText(contact).then(()=> alert("Kontakt nusxalandi: " + contact)).catch(()=> prompt("Kontakt:", contact));
  });
}

// -------------------------------
// UI events wiring
if (applyFiltersBtn) applyFiltersBtn.addEventListener("click", ()=> applyFilters(true));
if (resetFiltersBtn) resetFiltersBtn.addEventListener("click", ()=> {
  if (searchInput) searchInput.value = "";
  if (regionFromFilter) regionFromFilter.value = "";
  if (regionToFilter) regionToFilter.value = "";
  if (districtFromFilter) districtFromFilter.value = "";
  if (districtToFilter) districtToFilter.value = "";
  if (minPriceEl) minPriceEl.value = "";
  if (maxPriceEl) maxPriceEl.value = "";
  if (onlyFreeSeatsChk) onlyFreeSeatsChk.checked = false;
  if (withPhoneChk) withPhoneChk.checked = false;
  applyFilters(true);
});
if (regionFromFilter) regionFromFilter.addEventListener("change", ()=> loadDistricts(regionFromFilter.value, districtFromFilter));
if (regionToFilter) regionToFilter.addEventListener("change", ()=> loadDistricts(regionToFilter.value, districtToFilter));
if (prevPageBtn) prevPageBtn.addEventListener("click", ()=> { if (currentPage>1) { currentPage--; renderTable(); }});
if (nextPageBtn) nextPageBtn.addEventListener("click", ()=> { const pages = Math.max(1, Math.ceil(((FILTERED_ADS||[]).length)/pageSize)); if (currentPage<pages) { currentPage++; renderTable(); }});
if (pageSizeSelect) pageSizeSelect.addEventListener("change", ()=> { pageSize = Number(pageSizeSelect.value||pageSize); currentPage=1; renderTable();});
if (resetQuickBtn) resetQuickBtn.addEventListener("click", ()=> {
  if (onlyFreeSeatsChk) onlyFreeSeatsChk.checked = false;
  if (withPhoneChk) withPhoneChk.checked = false;
  applyFilters(true);
});

// -------------------------------
// Loading helper
function showLoading(flag) {
  if (!loadingBox) return;
  loadingBox.style.display = flag ? "block" : "none";
}

// -------------------------------
// Public start function (init sequence)
async function startApp() {
  try {
    showLoading(true);
    // detect role / user
    await detectRoleAndLoad();

    // initial load: try realtime if enabled, else once
    if (realtimeEnabled) {
      attachRealtime();
    } else {
      await loadAdsOnce();
    }
  } catch (e) {
    console.error("startApp error:", e);
    await loadAdsOnce();
  } finally {
    showLoading(false);
  }
}

// export for HTML bootstrap
export { startApp, applyFilters, openAdModal };
