// index.js — ShaharTaxi user/admin index (FULL, non-shortened)
// Designed to work with your exported lib.js (ES module that exports db, ref, get, onValue, onAuthStateChanged, signOut, etc.)
// Make sure the import path below points to your actual lib.js location.

const IMPORT_PATH = '../../libs/lib.js'; // <-- If your lib.js is located elsewhere, change this path (relative to this file)

import {
  auth,
  db,
  ref,
  get,
  onValue,
  onAuthStateChanged,
  signOut
} from IMPORT_PATH;

/*
 If your lib.js uses different exports or a different path, update IMPORT_PATH.
 Example common alternatives:
  - '../lib.js'
  - '../../libs/lib.js'
  - '/lib.js'
*/

// ---------------------------
// Helpers (copied + robustified)
// ---------------------------
function escapeHtml(str) {
  if (str === 0) return "0";
  if (!str && str !== 0) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeType(t) {
  if (!t) return "";
  t = String(t).trim().toLowerCase();
  t = t.replace(/[‘’`ʼ']/g, "'");
  if (t.includes("haydov")) return "Haydovchi";
  if (t.includes("yo") && t.includes("lov")) return "Yo‘lovchi";
  if (t === "yo'lovchi") return "Yo‘lovchi";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function formatTime(val) {
  if (!val && val !== 0) return "—";
  try {
    if (typeof val === "number") {
      return new Date(val).toLocaleString("uz-UZ", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit"
      });
    }
    if (typeof val === "string") {
      const fixed = val.replace(" ", "T");
      if (!isNaN(Date.parse(fixed))) {
        return new Date(fixed).toLocaleString("uz-UZ", {
          year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit"
        });
      }
    }
    return String(val);
  } catch (e) {
    return String(val);
  }
}

function safeNum(v, def = 0) {
  const n = Number(v);
  return isNaN(n) ? def : n;
}

// ---------------------------
// Globals & DOM refs
// ---------------------------
let REGIONS = (window.regionsData || window.regions || {});
let ALL_ADS = [];
let ADS_MAP = new Map();
let CURRENT_USER = null;
let CURRENT_PAGE = 1;
const PAGE_SIZE = 10; // keep same as original

const dom = {
  adsList: document.getElementById("adsList"),
  search: document.getElementById("search"),
  sortBy: document.getElementById("sortBy"),
  filterDate: document.getElementById("filterDate"),
  priceMin: document.getElementById("priceMin"),
  priceMax: document.getElementById("priceMax"),
  filterRole: document.getElementById("filterRole"),
  resetBtn: document.getElementById("resetFiltersBtn"),
  fromRegion: document.getElementById("fromRegion"),
  toRegion: document.getElementById("toRegion"),
  fromDistrictBox: document.getElementById("fromDistrictBox"),
  toDistrictBox: document.getElementById("toDistrictBox"),
  pagination: document.getElementById("pagination"),
  adFullModal: document.getElementById("adFullModal")
};

// defensive: if some DOM missing, warn (but continue)
Object.entries(dom).forEach(([k,v]) => { if (!v) console.warn(`index.js: DOM element ${k} not found`); });

// ---------------------------
// Auth watcher
// ---------------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // redirect to login in same folder
    window.location.href = "login.html";
    return;
  }

  CURRENT_USER = await getUserInfo(user.uid);
  loadRegionsFilter();
  loadRouteFilters();
  await initialLoadAds();
  attachRealtimeHandlers(); // real-time using onValue (stable)
});

// ---------------------------
// getUserInfo — reuse original logic but adapt to modular db
// ---------------------------
async function getUserInfo(uid) {
  if (!uid) return {};
  try {
    const snap = await get(ref(db, "users/" + uid));
    if (!snap.exists()) return {};
    const u = snap.val();
    return {
      uid,
      phone: u.phone || u.telephone || "",
      avatar: u.avatar || u.image || u.photoURL || "",
      fullName: u.fullName || ((u.firstname || u.lastname) ? `${u.firstname || ""} ${u.lastname || ""}`.trim() : "") || u.name || "",
      role: u.role || u.userRole || "",
      carModel: u.carModel || u.car || "",
      carColor: u.carColor || "",
      carNumber: u.carNumber || u.plate || "",
      seatCount: Number(u.seatCount || u.seats || 0)
    };
  } catch (e) {
    console.error("getUserInfo error", e);
    return {};
  }
}

// ---------------------------
// Regions / route filters
// ---------------------------
function loadRegionsFilter() {
  const el = dom.filterRegion || document.getElementById("filterRegion");
  if (!el) return;
  el.innerHTML = '<option value="">Viloyat (filter)</option>';
  Object.keys(REGIONS).forEach(region => {
    const opt = document.createElement("option");
    opt.value = region;
    opt.textContent = region;
    el.appendChild(opt);
  });
}

function loadRouteFilters() {
  const fromRegion = dom.fromRegion;
  const toRegion = dom.toRegion;
  if (!fromRegion || !toRegion) return;

  fromRegion.innerHTML = '<option value="">Viloyat</option>';
  toRegion.innerHTML = '<option value="">Viloyat</option>';

  Object.keys(REGIONS).forEach(region => {
    const escaped = escapeHtml(region);
    fromRegion.insertAdjacentHTML("beforeend", `<option value="${escaped}">${escaped}</option>`);
    toRegion.insertAdjacentHTML("beforeend", `<option value="${escaped}">${escaped}</option>`);
  });

  fromRegion.onchange = () => { fillFromDistricts(); CURRENT_PAGE = 1; scheduleRenderAds(); };
  toRegion.onchange = () => { fillToDistricts(); CURRENT_PAGE = 1; scheduleRenderAds(); };

  fillFromDistricts();
  fillToDistricts();
}

function fillFromDistricts() {
  const region = dom.fromRegion?.value;
  const box = dom.fromDistrictBox;
  if (!box) return;
  box.innerHTML = "";
  if (!region || !REGIONS[region]) {
    box.style.display = "none"; return;
  }
  box.style.display = "";
  REGIONS[region].forEach(dist => {
    const lbl = document.createElement("label");
    lbl.className = "district-item";
    lbl.innerHTML = `<input type="checkbox" class="fromDistrict" value="${escapeHtml(dist)}"> ${escapeHtml(dist)}`;
    box.appendChild(lbl);
  });
  box.querySelectorAll("input").forEach(ch => ch.onchange = () => { CURRENT_PAGE = 1; scheduleRenderAds(); });
}

function fillToDistricts() {
  const region = dom.toRegion?.value;
  const box = dom.toDistrictBox;
  if (!box) return;
  box.innerHTML = "";
  if (!region || !REGIONS[region]) {
    box.style.display = "none"; return;
  }
  box.style.display = "";
  REGIONS[region].forEach(dist => {
    const lbl = document.createElement("label");
    lbl.className = "district-item";
    lbl.innerHTML = `<input type="checkbox" class="toDistrict" value="${escapeHtml(dist)}"> ${escapeHtml(dist)}`;
    box.appendChild(lbl);
  });
  box.querySelectorAll("input").forEach(ch => ch.onchange = () => { CURRENT_PAGE = 1; scheduleRenderAds(); });
}

// ---------------------------
// initialLoadAds: use get(ref(db,'ads')) and normalize both 1-level and 2-level
// ---------------------------
async function initialLoadAds() {
  try {
    const snap = await get(ref(db, "ads"));
    if (!snap.exists()) {
      ADS_MAP.clear();
      ALL_ADS = [];
      if (dom.adsList) dom.adsList.innerHTML = "E’lon yo‘q.";
      attachInputsOnce();
      renderPaginationControls(0, 0, 0);
      return;
    }

    const items = [];
    // handle both 1-level and 2-level structure:
    snap.forEach(child => {
      const val = child.val();
      // if child looks like ad (has createdAt/fromRegion) treat directly
      if (val && (val.createdAt || val.fromRegion || val.toRegion || val.price)) {
        items.push({ id: child.key, ...val, typeNormalized: normalizeType(val.type) });
      } else {
        // else treat as category map
        child.forEach(inner => {
          const v2 = inner.val();
          items.push({ id: inner.key, ...v2, typeNormalized: normalizeType(v2.type) });
        });
      }
    });

    ADS_MAP.clear();
    items.forEach(ad => ADS_MAP.set(ad.id, ad));
    ALL_ADS = Array.from(ADS_MAP.values());

    attachInputsOnce();
    scheduleRenderAds();
  } catch (e) {
    console.error("initialLoadAds error:", e);
  }
}

// ---------------------------
// realtime: use onValue on /ads and diff logic
// ---------------------------
function attachRealtimeHandlers() {
  try {
    const adsRef = ref(db, "ads");
    onValue(adsRef, snap => {
      const tmp = [];
      snap.forEach(child => {
        const val = child.val();
        if (val && (val.createdAt || val.fromRegion || val.toRegion || val.price)) {
          tmp.push({ id: child.key, ...val, typeNormalized: normalizeType(val.type) });
        } else {
          child.forEach(inner => {
            tmp.push({ id: inner.key, ...inner.val(), typeNormalized: normalizeType(inner.val()?.type) });
          });
        }
      });
      ADS_MAP.clear();
      tmp.forEach(a => ADS_MAP.set(a.id, a));
      ALL_ADS = Array.from(ADS_MAP.values());
      fillFromDistricts();
      fillToDistricts();
      scheduleRenderAds();
    }, err => console.error("onValue ads error", err));
  } catch (e) {
    console.error("attachRealtimeHandlers error", e);
  }
}

// ---------------------------
// inputs attach once
// ---------------------------
let inputBound = false;
function attachInputsOnce() {
  if (inputBound) return;
  inputBound = true;

  if (dom.search) dom.search.oninput = () => { CURRENT_PAGE = 1; scheduleRenderAds(); };
  if (dom.filterRole) dom.filterRole.onchange = () => { CURRENT_PAGE = 1; scheduleRenderAds(); };
  if (dom.sortBy) dom.sortBy.onchange = () => { CURRENT_PAGE = 1; scheduleRenderAds(); };
  if (dom.filterDate) dom.filterDate.onchange = () => { CURRENT_PAGE = 1; scheduleRenderAds(); };
  if (dom.priceMin) dom.priceMin.oninput = () => { CURRENT_PAGE = 1; scheduleRenderAds(); };
  if (dom.priceMax) dom.priceMax.oninput = () => { CURRENT_PAGE = 1; scheduleRenderAds(); };

  if (dom.resetBtn) dom.resetBtn.onclick = () => resetFilters();

  document.addEventListener("click", function (e) {
    const fromBox = dom.fromDistrictBox;
    const toBox = dom.toDistrictBox;
    if (!fromBox || !toBox) return;
    const fromSelect = dom.fromRegion;
    const toSelect = dom.toRegion;

    const clickedInsideFrom = fromBox.contains(e.target) || (fromSelect && fromSelect.contains(e.target));
    const clickedInsideTo = toBox.contains(e.target) || (toSelect && toSelect.contains(e.target));

    if (!clickedInsideFrom) fromBox.style.display = "none";
    if (!clickedInsideTo) toBox.style.display = "none";
  }, { capture: true });
}

// ---------------------------
// renderAds (preserve original filtering logic fully)
// ---------------------------
async function renderAds(adsArr) {
  const list = dom.adsList;
  if (!list) return;
  list.innerHTML = "";

  const q = (dom.search?.value || "").toLowerCase();
  const roleFilter = normalizeType(dom.filterRole?.value || "");
  const regionFilter = (document.getElementById("filterRegion")?.value || "");
  const sortVal = dom.sortBy?.value || "newest";
  const filterDate = dom.filterDate?.value || "";

  const priceMinInput = (dom.priceMin?.value || "").toString().trim();
  const priceMaxInput = (dom.priceMax?.value || "").toString().trim();
  const isPriceMinSet = priceMinInput !== "";
  const isPriceMaxSet = priceMaxInput !== "";
  const priceMin = isPriceMinSet ? Number(priceMinInput.replace(/\s+/g, "")) : null;
  const priceMax = isPriceMaxSet ? Number(priceMaxInput.replace(/\s+/g, "")) : null;

  const currentUserId = CURRENT_USER?.uid || null;

  const currentRoleRaw = (CURRENT_USER?.role || "").toString().toLowerCase();
  let currentRole = "";
  if (currentRoleRaw.includes("driver") || currentRoleRaw.includes("haydov")) currentRole = "driver";
  else if (currentRoleRaw.includes("pass") || currentRoleRaw.includes("yo")) currentRole = "passenger";

  const fromRegion = dom.fromRegion?.value || "";
  const toRegion = dom.toRegion?.value || "";
  const fromDistricts = Array.from(document.querySelectorAll("#fromDistrictBox input.fromDistrict:checked")).map(x => x.value);
  const toDistricts = Array.from(document.querySelectorAll("#toDistrictBox input.toDistrict:checked")).map(x => x.value);

  let filtered = (adsArr || []).filter(a => {
    if (!a) return false;

    if (currentRole === "driver") {
      if (!a.typeNormalized || !a.typeNormalized.toLowerCase().includes("yo")) return false;
    } else if (currentRole === "passenger") {
      if (!a.typeNormalized || !a.typeNormalized.toLowerCase().includes("haydov")) return false;
    }

    if (roleFilter) { if (a.typeNormalized !== roleFilter) return false; }

    if (currentUserId && a.userId === currentUserId) return false;

    if (regionFilter) {
      if (a.fromRegion !== regionFilter && a.toRegion !== regionFilter) return false;
    }

    if (fromRegion && a.fromRegion !== fromRegion) return false;
    if (fromDistricts.length > 0 && !fromDistricts.includes(a.fromDistrict)) return false;

    if (toRegion && a.toRegion !== toRegion) return false;
    if (toDistricts.length > 0 && !toDistricts.includes(a.toDistrict)) return false;

    const adPrice = (a.price !== undefined && a.price !== null && a.price !== "") ? Number(String(a.price).replace(/\s+/g, "")) : NaN;
    if (isPriceMinSet && isNaN(adPrice)) return false;
    if (isPriceMaxSet && isNaN(adPrice)) return false;
    if (isPriceMinSet && !isNaN(adPrice) && adPrice < priceMin) return false;
    if (isPriceMaxSet && !isNaN(adPrice) && adPrice > priceMax) return false;

    // departure time parse & only future ads
    const departureRaw = a.departureTime || a.startTime || a.time || a.date || null;
    let departureTime = null;
    if (typeof departureRaw === "number") departureTime = new Date(departureRaw);
    else if (typeof departureRaw === "string" && departureRaw.trim() !== "") {
      const fixed = departureRaw.replace(" ", "T");
      if (!isNaN(Date.parse(departureRaw))) departureTime = new Date(departureRaw);
      else if (!isNaN(Date.parse(fixed))) departureTime = new Date(fixed);
    }
    if (!departureTime) return false;
    if (departureTime.getTime() < Date.now()) return false;

    if (filterDate) {
      const raw = a.departureTime || a.startTime || a.time || a.date || null;
      let adTime = null;
      if (typeof raw === "number") adTime = new Date(raw);
      else if (typeof raw === "string" && raw.trim() !== "") {
        const tryFix = raw.replace(" ", "T");
        if (!isNaN(Date.parse(raw))) adTime = new Date(raw);
        else if (!isNaN(Date.parse(tryFix))) adTime = new Date(tryFix);
      }
      if (!adTime) return false;
      const now = new Date();
      if (filterDate === "today") {
        if (adTime.getFullYear() !== now.getFullYear() || adTime.getMonth() !== now.getMonth() || adTime.getDate() !== now.getDate()) return false;
      } else if (filterDate === "tomorrow") {
        const t = new Date(now); t.setDate(now.getDate() + 1);
        if (adTime.getFullYear() !== t.getFullYear() || adTime.getMonth() !== t.getMonth() || adTime.getDate() !== t.getDate()) return false;
      } else if (filterDate === "3days") {
        const diff = adTime.getTime() - now.getTime();
        if (diff < 0 || diff > 1000 * 60 * 60 * 24 * 3) return false;
      }
    }

    const hay = [
      a.fromRegion, a.fromDistrict,
      a.toRegion, a.toDistrict,
      a.comment, a.price, a.type, a.carModel, a.userId
    ].join(" ").toLowerCase();
    if (!hay.includes(q)) return false;

    return true;
  });

  // dedupe
  const resultMap = new Map();
  filtered.forEach(x => { if (x && x.id) resultMap.set(x.id, x); });
  filtered = Array.from(resultMap.values());

  if (!filtered.length) {
    list.innerHTML = "<p>Natija topilmadi.</p>";
    renderPaginationControls(0,0,0);
    return;
  }

  // sort
  filtered.sort((a,b) => {
    const ta = new Date(a.createdAt || a.created || a.postedAt || 0).getTime();
    const tb = new Date(b.createdAt || b.created || b.postedAt || 0).getTime();
    return (dom.sortBy?.value === "oldest") ? (ta - tb) : (tb - ta);
  });

  // pagination compute
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  if (CURRENT_PAGE < 1) CURRENT_PAGE = 1;
  if (CURRENT_PAGE > totalPages) CURRENT_PAGE = totalPages;

  const startIndex = (CURRENT_PAGE - 1) * PAGE_SIZE;
  const pageSlice = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  // create cards
  const cards = await Promise.all(pageSlice.map(a => createAdCard(a)));
  const frag = document.createDocumentFragment();
  cards.forEach(c => frag.appendChild(c));
  list.appendChild(frag);

  renderPaginationControls(totalPages, CURRENT_PAGE, totalItems);
}

// ---------------------------
// createAdCard (copied and preserved)
// ---------------------------
async function createAdCard(ad) {
  const u = await getUserInfo(ad.userId);

  const div = document.createElement("div");
  div.className = "ad-card";
  div.setAttribute("data-ad-id", ad.id || "");

  const route = `${ad.fromRegion || ""}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ${ad.toRegion || ""}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;
  const depTimeRaw = ad.departureTime || ad.startTime || ad.time || ad.date || "";
  const depTime = formatTime(depTimeRaw);
  const createdRaw = ad.createdAt || ad.created || ad.postedAt || "";
  const created = formatTime(createdRaw);

  let isNew = false;
  if (createdRaw) {
    try {
      const ct = new Date(createdRaw).getTime();
      if (!isNaN(ct) && (Date.now() - ct <= 24*60*60*1000) && !isRead(ad.id)) isNew = true;
    } catch(e){}
  }

  const totalSeatsRaw = ad.totalSeats || ad.seatCount || ad.seats || null;
  const totalSeats = (totalSeatsRaw !== null && totalSeatsRaw !== undefined) ? Number(totalSeatsRaw) : null;
  const booked = Number(ad.bookedSeats || 0);
  const available = (typeof totalSeats === "number" && !isNaN(totalSeats)) ? Math.max(totalSeats - booked, 0) : null;

  const requestedRaw = ad.passengerCount || ad.requestedSeats || ad.requestSeats || ad.peopleCount || null;
  const requested = (requestedRaw !== null && requestedRaw !== undefined) ? Number(requestedRaw) : null;

  let showCar = false;
  try {
      const ownerRole = (u.role || "").toLowerCase();
      if (ownerRole.includes("haydov") || ownerRole.includes("driver")) {
          showCar = true;
      }
  } catch(e) { showCar = false; }

  const carFull = showCar
      ? `${u.carModel || ad.car || ""}${u.carColor ? " • " + u.carColor : ""}${u.carNumber ? " • " + u.carNumber : ""}`
      : "";

  let carModel = "";
  try {
    const ownerRole = (u.role || "").toLowerCase();
    if (ownerRole.includes("haydov") || ownerRole.includes("driver")) {
      carModel = u.carModel || ad.car || "";
    } else {
      carModel = "";
    }
  } catch(e) {
    carModel = ad.car || "";
  }

  div.innerHTML = `
    <img class="ad-avatar" src="${escapeHtml(u.avatar || "https://i.ibb.co/2W0z7Lx/user.png")}" alt="avatar">
    <div class="ad-main">
      <div class="ad-route">
        ${escapeHtml(route)}
        ${isNew ? '<span class="ad-badge-new">Yangi</span>' : ''}
      </div>
     <div class="ad-car" style="color:#6b7280;font-size:13px;margin-top:6px">
    ${escapeHtml(carModel)}
</div>
      <div class="ad-meta" style="margin-top:8px">
        <div class="ad-chip">⏰ ${escapeHtml(depTime)}</div>
        ${
          totalSeats !== null
            ? `<div class="ad-chip">👥 ${escapeHtml(String(available))}/${escapeHtml(String(totalSeats))} bo‘sh</div>`
            : (requested !== null ? `<div class="ad-chip">👥 ${escapeHtml(String(requested))} odam</div>` : `<div class="ad-chip">👥 -</div>`)
        }
      </div>
    </div>
    <div class="ad-price">💰 ${escapeHtml(ad.price ? String(ad.price) : "-")} so‘m</div>
    <div class="ad-created">${escapeHtml(created)}</div>
  `;

  div.onclick = () => openAdModal(ad);

  return div;
}

// ---------------------------
// modal & helpers (preserved)
// ---------------------------
async function openAdModal(ad) {
  let modal = dom.adFullModal;
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "adFullModal";
    document.body.appendChild(modal);
    dom.adFullModal = modal;
  }

  const u = await getUserInfo(ad.userId);

  const route = `${ad.fromRegion || ""}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ${ad.toRegion || ""}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;
  const depTime = formatTime(ad.departureTime || ad.startTime || ad.time || ad.date || "");
  const created = formatTime(ad.createdAt || ad.created || ad.postedAt || "");
  const fullname = u.fullName || ((u.firstname || u.lastname) ? `${u.firstname || ""} ${u.lastname || ""}`.trim() : "") || "Foydalanuvchi";

  const ownerRole = (u.role || "").toLowerCase();
  let carFull = "";
  if (ownerRole.includes("haydov") || ownerRole.includes("driver")) {
    carFull = `${u.carModel || ""}${u.carColor ? " • " + u.carColor : ""}${u.carNumber ? " • " + u.carNumber : ""}`;
  }

  const totalSeatsRaw = ad.totalSeats || ad.seatCount || ad.seats || null;
  const totalSeats = (totalSeatsRaw !== null && totalSeatsRaw !== undefined) ? Number(totalSeatsRaw) : null;
  const booked = Number(ad.bookedSeats || 0);
  const available = (typeof totalSeats === "number" && !isNaN(totalSeats)) ? Math.max(totalSeats - booked, 0) : null;
  const requestedRaw = ad.passengerCount || ad.requestedSeats || ad.requestSeats || ad.peopleCount || null;
  const requested = (requestedRaw !== null && requestedRaw !== undefined) ? Number(requestedRaw) : null;

 modal.innerHTML = `
    <div class="ad-modal-box" role="dialog" aria-modal="true">
      <div style="display:flex; gap:12px; align-items:center; margin-bottom:8px;">
        <img class="modal-avatar" src="${escapeHtml(u.avatar || "https://i.ibb.co/2W0z7Lx/user.png")}" alt="avatar">
        <div>
          <div class="modal-name">${escapeHtml(fullname)}</div>
          <div class="modal-car" style="color:#6b7280">${escapeHtml(carFull)}</div>
        </div>
      </div>

      <div class="modal-row">
        <div class="modal-col">
          <div class="label">Yo‘nalish</div>
          <div class="value">${escapeHtml(route)}</div>
        </div>
        <div class="modal-col" style="text-align:right">
          <div class="label">Jo‘nash vaqti</div>
          <div class="value">${escapeHtml(depTime)}</div>
        </div>
      </div>

      <div class="modal-row">
        <div class="modal-col">
          <div class="label">Joylar</div>
          <div class="value">
            ${
              totalSeats !== null
                ? `${escapeHtml(String(totalSeats))} ta (Bo‘sh: ${escapeHtml(String(available))})`
                : requested !== null
                  ? `Talab: ${escapeHtml(String(requested))} odam`
                  : "-"
            }
          </div>
        </div>
        <div class="modal-col" style="text-align:right">
          <div class="label">Narx</div>
          <div class="value">${escapeHtml(ad.price ? ad.price + " so‘m" : "-")}</div>
        </div>
      </div>

      <div style="margin-top:12px">
        <div class="label">Izoh</div>
        <div class="value">${escapeHtml(ad.comment || "-")}</div>
      </div>

      <div style="margin-top:12px">
        <div class="label">Kontakt</div>
        <div class="value">${escapeHtml(u.phone || "-")}</div>
      </div>

      <div style="margin-top:12px;color:#88919a;font-size:13px;">
        Joylashtirilgan: ${escapeHtml(created)}
      </div>

      <div class="modal-actions" style="margin-top:14px">
        <button class="btn-primary" id="modalCloseBtn">Yopish</button>
        <button class="btn-ghost" id="modalCallBtn">Qo'ng'iroq</button>
      </div>
    </div>
  `;

  modal.style.display = "flex";
  const closeBtn = document.getElementById("modalCloseBtn");
  const callBtn = document.getElementById("modalCallBtn");
  if (closeBtn) closeBtn.onclick = closeAdModal;
  if (callBtn) callBtn.onclick = () => onContact(u.phone || "");
  try { markAsRead(ad.id); } catch(e){}
  updateBadgeForAd(ad.id);
  modal.onclick = (e) => { if (e.target === modal) closeAdModal(); };
}

function closeAdModal() {
  const modal = dom.adFullModal || document.getElementById("adFullModal");
  if (!modal) return;
  modal.style.display = "none";
  modal.innerHTML = "";
}

function updateBadgeForAd(adId) {
  const node = document.querySelector(`.ad-card[data-ad-id="${escapeSelector(adId)}"]`);
  if (!node) return;
  const badge = node.querySelector(".ad-badge-new");
  if (badge) badge.remove();
}

function onContact(phone) {
  if (!phone) return alert("Telefon raqami mavjud emas");
  window.location.href = `tel:${phone}`;
}
window.onContact = onContact;

// ---------------------------
// read/unread helpers (localStorage)
// ---------------------------
function markAsRead(adId) {
  if (!adId) return;
  let read = [];
  try { read = JSON.parse(localStorage.getItem("readAds") || "[]"); } catch (e) {}
  if (!read.includes(adId)) {
    read.push(adId);
    localStorage.setItem("readAds", JSON.stringify(read));
  }
}

function isRead(adId) {
  try {
    const read = JSON.parse(localStorage.getItem("readAds") || "[]");
    return read.includes(adId);
  } catch (e) {
    return false;
  }
}

// ---------------------------
// reset filters
// ---------------------------
function resetFilters() {
  const ids = [
    "search","filterRole","filterRegion","fromRegion","toRegion",
    "sortBy","filterDate","priceMin","priceMax"
  ];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
  document.querySelectorAll("#fromDistrictBox input.fromDistrict").forEach(i => i.checked = false);
  document.querySelectorAll("#toDistrictBox input.toDistrict").forEach(i => i.checked = false);
  fillFromDistricts();
  fillToDistricts();
  CURRENT_PAGE = 1;
  scheduleRenderAds();
}
window.resetFilters = resetFilters;

// ---------------------------
// debounce render
// ---------------------------
let __render_timeout = null;
function scheduleRenderAds() {
  if (__render_timeout) clearTimeout(__render_timeout);
  __render_timeout = setTimeout(() => {
    renderAds(Array.from(ADS_MAP.values()));
    __render_timeout = null;
  }, 140);
}

// ---------------------------
// logout
// ---------------------------
window.logout = () => signOut(auth);

// ---------------------------
// pagination controls (copied)
// ---------------------------
function renderPaginationControls(totalPages, currentPage, totalItems) {
  const container = dom.pagination;
  if (!container) return;
  container.innerHTML = "";
  if (totalPages <= 1) {
    if (totalItems > 0) {
      const info = document.createElement("div");
      info.textContent = `Ko‘rsatilyapti: ${Math.min(PAGE_SIZE, totalItems)} / ${totalItems}`;
      info.style = "color:#6b7280;font-size:14px;";
      container.appendChild(info);
    }
    return;
  }
  const mkBtn = (txt, disabled, fn) => {
    const b = document.createElement("button");
    b.textContent = txt;
    b.disabled = disabled;
    b.style = `
      padding:6px 10px;
      border-radius:8px;
      border:1px solid #e5e7eb;
      background:white;
      margin:0 4px;
      cursor:pointer
    `;
    if (!disabled) b.onclick = fn;
    return b;
  };
  container.appendChild(mkBtn("« Birinchi", currentPage === 1, () => { CURRENT_PAGE = 1; scheduleRenderAds(); }));
  container.appendChild(mkBtn("‹ Oldingi", currentPage === 1, () => { CURRENT_PAGE = currentPage - 1; scheduleRenderAds(); }));
  const windowSize = 5;
  let start = Math.max(1, currentPage - Math.floor(windowSize/2));
  let end = Math.min(totalPages, start + windowSize - 1);
  if (end - start < windowSize - 1) start = Math.max(1, end - windowSize + 1);
  for (let p = start; p <= end; p++) {
    const btn = document.createElement("button");
    const isCurrent = p === currentPage;
    btn.textContent = p;
    btn.disabled = isCurrent;
    btn.style = `
      padding:6px 10px;
      border-radius:8px;
      border:1px solid ${isCurrent ? "#0069d9" : "#e5e7eb"};
      background:${isCurrent ? "#0069d9" : "white"};
      color:${isCurrent ? "white" : "#111"};
      margin:0 4px;
      cursor:pointer
    `;
    if (!isCurrent) btn.onclick = () => { CURRENT_PAGE = p; scheduleRenderAds(); };
    container.appendChild(btn);
  }
  container.appendChild(mkBtn("Keyingi ›", currentPage === totalPages, () => { CURRENT_PAGE = currentPage + 1; scheduleRenderAds(); }));
  container.appendChild(mkBtn("Oxiri »", currentPage === totalPages, () => { CURRENT_PAGE = totalPages; scheduleRenderAds(); }));
  const info = document.createElement("div");
  info.textContent = `Sahifa ${currentPage} / ${totalPages} — Jami: ${totalItems}`;
  info.style = "color:#6b7280;font-size:13px;margin-left:8px;margin-top:8px;";
  container.appendChild(info);
}

function escapeSelector(s) {
  return String(s || "").replace(/([ #;?%&,.+*~':\"!^$[\]()=>|\/@])/g,'\\$1');
}

console.log("ShaharTaxi index.js loaded and ready.");
