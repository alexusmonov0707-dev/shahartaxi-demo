// index.js (FINAL — smooth filter loading + reset + all old features preserved)

// ===============================
//  FIREBASE INIT + MODULAR IMPORTS
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  onChildAdded,
  onChildChanged,
  onChildRemoved
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyApWUG40YuC9aCsE9MOLXwLcYgRihREWvc",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
  projectId: "shahartaxi-demo",
  storageBucket: "shahartaxi-demo.firebasestorage.app",
  messagingSenderId: "874241795701",
  appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ===============================
//  REGIONS DATA (from regions.js)
// ===============================
const REGIONS = window.regionsData || window.regions || {};

// ===============================
//  READ / NEW BADGE STORAGE
// ===============================
function markAsRead(adId) {
  if (!adId) return;
  let read = [];
  try { read = JSON.parse(localStorage.getItem("readAds") || "[]"); } catch(e){ read = []; }
  if (!read.includes(adId)) {
    read.push(adId);
    localStorage.setItem("readAds", JSON.stringify(read));
  }
}
function isRead(adId) {
  if (!adId) return false;
  try {
    const read = JSON.parse(localStorage.getItem("readAds") || "[]");
    return read.includes(adId);
  } catch(e) { return false; }
}

// ===============================
//  HELPERS
// ===============================
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
  if (!val) return "—";
  if (typeof val === "number") {
    try {
      return new Date(val).toLocaleString("uz-UZ", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit"
      });
    } catch(e) { return String(val); }
  }
  if (typeof val === "string") {
    if (!isNaN(Date.parse(val))) {
      return new Date(val).toLocaleString("uz-UZ", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit"
      });
    }
    const fix = val.replace(" ", "T");
    if (!isNaN(Date.parse(fix))) {
      return new Date(fix).toLocaleString("uz-UZ", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit"
      });
    }
  }
  return String(val);
}

function slugify(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, "_").replace(/[^\w\-]/g, "");
}

// ===============================
//  GLOBALS
// ===============================
const ADS_MAP = new Map();   
let ALL_ADS_ARR = [];       
let CURRENT_USER = null;
let useRealtime = true;     

let PAGE_SIZE = 10;
let CURRENT_PAGE = 1;

// ===============================
//  LOADING OVERLAY (NEW — smooth filter animation)
// ===============================
let loadingTimer = null;

function showLoading() {
  let box = document.getElementById("smoothLoadingBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "smoothLoadingBox";
    box.style = `
      position: fixed; top:0; left:0; width:100%; height:100%;
      background: rgba(255,255,255,0.65);
      backdrop-filter: blur(3px);
      display:flex; align-items:center; justify-content:center;
      z-index: 9999; font-size:22px; color:#111;
      transition: opacity .2s ease;
    `;
    box.innerHTML = `<div class="loading-spinner"></div>`;
    document.body.appendChild(box);
  }
  box.style.opacity = "1";
  box.style.pointerEvents = "auto";
}

function hideLoading() {
  let box = document.getElementById("smoothLoadingBox");
  if (!box) return;
  box.style.opacity = "0";
  box.style.pointerEvents = "none";
}

// ===============================
//  AUTH CHECK
// ===============================
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  CURRENT_USER = await getUserInfo(user.uid || user.userId);

  loadRegionsFilter();
  loadRouteFilters();

  await initialLoadAds();

  if (useRealtime) attachRealtimeHandlers();
});

// ===============================
//  REGION FILTER (TOP BAR)
// ===============================
function loadRegionsFilter() {
  const el = document.getElementById("filterRegion");
  if (!el) return;
  el.innerHTML = '<option value="">Viloyat (filter)</option>';
  Object.keys(REGIONS).forEach(region => {
    const opt = document.createElement("option");
    opt.value = region;
    opt.textContent = region;
    el.appendChild(opt);
  });
}

// ===============================
//  ROUTE FILTERS + DISTRICTS
// ===============================
function loadRouteFilters() {
  const fromRegion = document.getElementById("fromRegion");
  const toRegion = document.getElementById("toRegion");
  if (!fromRegion || !toRegion) return;

  fromRegion.innerHTML = '<option value="">Viloyat</option>';
  toRegion.innerHTML = '<option value="">Viloyat</option>';

  Object.keys(REGIONS).forEach(region => {
    fromRegion.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`);
    toRegion.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`);
  });

  fromRegion.onchange = () => { fillFromDistricts(); CURRENT_PAGE = 1; scheduleRenderAds(); };
  toRegion.onchange   = () => { fillToDistricts(); CURRENT_PAGE = 1; scheduleRenderAds(); };

  fillFromDistricts();
  fillToDistricts();
}

function fillFromDistricts() {
  const region = document.getElementById("fromRegion")?.value;
  const box = document.getElementById("fromDistrictBox");
  if (!box) return;
  box.innerHTML = "";

  if (!region || !REGIONS[region]) {
    box.style.display = "none";
    return;
  }

  box.style.display = "";
  REGIONS[region].forEach(d => {
    const label = document.createElement("label");
    label.className = "district-item";
    label.innerHTML = `<input type="checkbox" class="fromDistrict" value="${escapeHtml(d)}"> ${escapeHtml(d)}`;
    box.appendChild(label);
  });

  box.querySelectorAll("input").forEach(ch => ch.onchange = () => { CURRENT_PAGE = 1; scheduleRenderAds(); });
}

function fillToDistricts() {
  const region = document.getElementById("toRegion")?.value;
  const box = document.getElementById("toDistrictBox");
  if (!box) return;
  box.innerHTML = "";

  if (!region || !REGIONS[region]) {
    box.style.display = "none";
    return;
  }

  box.style.display = "";
  REGIONS[region].forEach(d => {
    const label = document.createElement("label");
    label.className = "district-item";
    label.innerHTML = `<input type="checkbox" class="toDistrict" value="${escapeHtml(d)}"> ${escapeHtml(d)}`;
    box.appendChild(label);
  });

  box.querySelectorAll("input").forEach(ch => ch.onchange = () => { CURRENT_PAGE = 1; scheduleRenderAds(); });
}

// ===============================
//  INPUT HANDLERS + DISTRICT PANEL CLOSERS
// ===============================
let inputsAttached = false;
let documentClickListenerAttached = false;

function attachInputsOnce() {
  if (inputsAttached) return;
  inputsAttached = true;

  const searchEl = document.getElementById("search");
  const roleEl = document.getElementById("filterRole");
  const regionEl = document.getElementById("filterRegion");
  const fromRegionEl = document.getElementById("fromRegion");
  const toRegionEl = document.getElementById("toRegion");
  const sortByEl = document.getElementById("sortBy");
  const filterDateEl = document.getElementById("filterDate");
  const priceMinEl = document.getElementById("priceMin");
  const priceMaxEl = document.getElementById("priceMax");
  const resetBtn = document.getElementById("resetFiltersBtn");

  if (searchEl) searchEl.oninput = () => { CURRENT_PAGE = 1; scheduleRenderAds(); };
  if (roleEl) roleEl.onchange = () => { CURRENT_PAGE = 1; scheduleRenderAds(); };
  if (regionEl) regionEl.onchange = () => { CURRENT_PAGE = 1; scheduleRenderAds(); };
  if (fromRegionEl) fromRegionEl.onchange = () => { fillFromDistricts(); CURRENT_PAGE = 1; scheduleRenderAds(); };
  if (toRegionEl) toRegionEl.onchange   = () => { fillToDistricts(); CURRENT_PAGE = 1; scheduleRenderAds(); };
  if (sortByEl) sortByEl.onchange = () => { CURRENT_PAGE = 1; scheduleRenderAds(); };
  if (filterDateEl) filterDateEl.onchange = () => { CURRENT_PAGE = 1; scheduleRenderAds(); };
  if (priceMinEl) priceMinEl.oninput = () => { CURRENT_PAGE = 1; scheduleRenderAds(); };
  if (priceMaxEl) priceMaxEl.oninput = () => { CURRENT_PAGE = 1; scheduleRenderAds(); };

  if (resetBtn) resetBtn.onclick = () => resetFilters();

  document.addEventListener("change", (e) => {
    if (e.target.classList && (e.target.classList.contains("fromDistrict") || e.target.classList.contains("toDistrict"))) {
      CURRENT_PAGE = 1;
      scheduleRenderAds();
    }
  });

  // close district panels when clicking outside
  if (!documentClickListenerAttached) {
    document.addEventListener("click", (e) => {
      const fromBox = document.getElementById("fromDistrictBox");
      const toBox   = document.getElementById("toDistrictBox");
      const fromSel = document.getElementById("fromRegion");
      const toSel   = document.getElementById("toRegion");

      const insideFrom = fromBox && (fromBox.contains(e.target) || fromSel.contains(e.target));
      const insideTo   = toBox && (toBox.contains(e.target) || toSel.contains(e.target));

      if (!insideFrom && fromBox) fromBox.style.display = "none";
      if (!insideTo   && toBox)   toBox.style.display   = "none";
    });

    window.addEventListener("scroll", () => {
      const fromBox = document.getElementById("fromDistrictBox");
      const toBox   = document.getElementById("toDistrictBox");
      if (fromBox) fromBox.style.display = "none";
      if (toBox)   toBox.style.display   = "none";
    });

    documentClickListenerAttached = true;
  }
}

// ===============================
//  SCHEDULE RENDER (SMOOTH UPDATED)
// ===============================
let __render_timeout = null;

function scheduleRenderAds() {
  if (__render_timeout) clearTimeout(__render_timeout);

  showLoading();  // NEW

  __render_timeout = setTimeout(() => {
    renderAds(Array.from(ADS_MAP.values()));
    hideLoading(); // NEW
    __render_timeout = null;
  }, 130); // slightly increased for smoother feel
}
// ===============================
//  INITIAL LOAD (one-time snapshot)
// ===============================
async function initialLoadAds() {
  try {
    const snap = await get(ref(db, "ads"));
    if (!snap.exists()) {
      ALL_ADS_ARR = [];
      ADS_MAP.clear();
      document.getElementById("adsList") && (document.getElementById("adsList").innerHTML = "E’lon yo‘q.");
      attachInputsOnce();
      renderPaginationControls();
      return;
    }

    const arr = [];
    snap.forEach(child => {
      const v = child.val();
      arr.push({ id: child.key, ...v, typeNormalized: normalizeType(v.type) });
    });

    const map = new Map();
    arr.forEach(x => { if (x && x.id) map.set(x.id, x); });

    ADS_MAP.clear();
    for (const [k, v] of map) ADS_MAP.set(k, v);
    ALL_ADS_ARR = Array.from(ADS_MAP.values());

    attachInputsOnce();
    scheduleRenderAds();
  } catch (err) {
    console.error("initialLoadAds error", err);
  }
}

// ===============================
//  REALTIME HANDLERS
// ===============================
function attachRealtimeHandlers() {
  try {
    const r = ref(db, "ads");

    onChildAdded(r, (snap) => {
      const v = snap.val();
      if (!v) return;
      const ad = { id: snap.key, ...v, typeNormalized: normalizeType(v.type) };
      ADS_MAP.set(ad.id, ad);
      ALL_ADS_ARR = Array.from(ADS_MAP.values());
      scheduleRenderAds();
    });

    onChildChanged(r, (snap) => {
      const v = snap.val();
      if (!v) return;
      const ad = { id: snap.key, ...v, typeNormalized: normalizeType(v.type) };
      ADS_MAP.set(ad.id, ad);
      ALL_ADS_ARR = Array.from(ADS_MAP.values());
      scheduleRenderAds();
    });

    onChildRemoved(r, (snap) => {
      ADS_MAP.delete(snap.key);
      ALL_ADS_ARR = Array.from(ADS_MAP.values());
      const node = document.querySelector(`.ad-card[data-ad-id="${escapeSelector(snap.key)}"]`);
      if (node && node.parentNode) node.parentNode.removeChild(node);
      scheduleRenderAds();
    });

  } catch (err) {
    console.warn("attachRealtimeHandlers failed:", err);
  }
}

// ===============================
//  RENDER ADS (full filters + pagination + smooth loading)
// ===============================
async function renderAds(adsArr) {
  const list = document.getElementById("adsList");
  if (!list) return;

  list.innerHTML = "";

  const q = (document.getElementById("search")?.value || "").toLowerCase();
  const roleFilter = normalizeType(document.getElementById("filterRole")?.value || "");
  const regionFilter = document.getElementById("filterRegion")?.value || "";
  const sortBy = document.getElementById("sortBy")?.value || "newest";
  const filterDate = document.getElementById("filterDate")?.value || "";

  // PRICE
  const priceMinInput = (document.getElementById("priceMin")?.value || "").trim();
  const priceMaxInput = (document.getElementById("priceMax")?.value || "").trim();
  const isPriceMinSet = priceMinInput !== "";
  const isPriceMaxSet = priceMaxInput !== "";
  const priceMin = isPriceMinSet ? Number(priceMinInput.replace(/\s+/g, "")) : null;
  const priceMax = isPriceMaxSet ? Number(priceMaxInput.replace(/\s+/g, "")) : null;

  const currentUserId = auth.currentUser?.uid || null;

  // CURRENT ROLE LOGIC
  const roleRaw = (CURRENT_USER?.role || "").toLowerCase();
  let currentRole = "";
  if (roleRaw.includes("haydov") || roleRaw.includes("driver")) currentRole = "driver";
  else if (roleRaw.includes("yo") || roleRaw.includes("pass")) currentRole = "passenger";

  // ROUTE FILTERS
  const fromRegion = document.getElementById("fromRegion")?.value || "";
  const toRegion = document.getElementById("toRegion")?.value || "";
  const fromDistricts = Array.from(document.querySelectorAll("#fromDistrictBox input.fromDistrict:checked")).map(x => x.value);
  const toDistricts = Array.from(document.querySelectorAll("#toDistrictBox input.toDistrict:checked")).map(x => x.value);

  // FILTERING
  let filtered = (adsArr || []).filter(a => {
    if (!a) return false;

    // auto: driver sees passengers, passenger sees drivers
    if (currentRole === "driver" && !a.typeNormalized.toLowerCase().includes("yo")) return false;
    if (currentRole === "passenger" && !a.typeNormalized.toLowerCase().includes("haydov")) return false;

    if (roleFilter && a.typeNormalized !== roleFilter) return false;

    if (currentUserId && a.userId === currentUserId) return false;

    if (regionFilter) {
      if (a.fromRegion !== regionFilter && a.toRegion !== regionFilter) return false;
    }

    if (fromRegion && a.fromRegion !== fromRegion) return false;
    if (fromDistricts.length && !fromDistricts.includes(a.fromDistrict)) return false;

    if (toRegion && a.toRegion !== toRegion) return false;
    if (toDistricts.length && !toDistricts.includes(a.toDistrict)) return false;

    // price
    const adPrice = a.price ? Number(String(a.price).replace(/\s+/g, "")) : NaN;
    if (isPriceMinSet && (isNaN(adPrice) || adPrice < priceMin)) return false;
    if (isPriceMaxSet && (isNaN(adPrice) || adPrice > priceMax)) return false;

    // hide expired departure time
    const raw = a.departureTime || a.startTime || a.time || a.date;
    let dep = null;
    if (typeof raw === "number") dep = new Date(raw);
    else if (typeof raw === "string" && raw.trim() !== "") {
      const fixed = raw.replace(" ", "T");
      if (!isNaN(Date.parse(raw))) dep = new Date(raw);
      else if (!isNaN(Date.parse(fixed))) dep = new Date(fixed);
    }
    if (!dep || dep.getTime() < Date.now()) return false;

    // date filter
    if (filterDate) {
      const now = new Date();
      const d = dep;

      if (filterDate === "today") {
        if (d.toDateString() !== now.toDateString()) return false;
      }
      if (filterDate === "tomorrow") {
        const t = new Date(now); t.setDate(t.getDate() + 1);
        if (d.toDateString() !== t.toDateString()) return false;
      }
      if (filterDate === "3days") {
        const diff = d.getTime() - now.getTime();
        if (diff < 0 || diff > 3 * 24 * 60 * 60 * 1000) return false;
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
  const m = new Map();
  filtered.forEach(x => m.set(x.id, x));
  filtered = Array.from(m.values());

  if (!filtered.length) {
    list.innerHTML = "<p>Natija topilmadi.</p>";
    renderPaginationControls(0, 0);
    return;
  }

  // sort
  filtered.sort((a, b) => {
    const ta = new Date(a.createdAt || a.created || a.postedAt || 0).getTime();
    const tb = new Date(b.createdAt || b.created || b.postedAt || 0).getTime();
    return sortBy === "oldest" ? (ta - tb) : (tb - ta);
  });

  // pagination
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  if (CURRENT_PAGE < 1) CURRENT_PAGE = 1;
  if (CURRENT_PAGE > totalPages) CURRENT_PAGE = totalPages;

  const startIndex = (CURRENT_PAGE - 1) * PAGE_SIZE;
  const pageSlice = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  const cards = await Promise.all(pageSlice.map(a => createAdCard(a)));
  const frag = document.createDocumentFragment();
  cards.forEach(c => frag.appendChild(c));
  list.appendChild(frag);

  renderPaginationControls(totalPages, CURRENT_PAGE, totalItems);
}

// ===============================
//  CREATE AD CARD
// ===============================
async function createAdCard(ad) {
  const u = await getUserInfo(ad.userId);

  const div = document.createElement("div");
  div.className = "ad-card";
  div.setAttribute("data-ad-id", ad.id);

  const route = `${ad.fromRegion || ""}${ad.fromDistrict ? ", "+ad.fromDistrict:""} → ${ad.toRegion || ""}${ad.toDistrict ? ", "+ad.toDistrict:""}`;
  const depTime = formatTime(ad.departureTime || ad.startTime || ad.time || ad.date);
  const created = formatTime(ad.createdAt || ad.created || ad.postedAt);

  let isNew = false;
  if (ad.createdAt || ad.created || ad.postedAt) {
    try {
      const ct = new Date(ad.createdAt || ad.created || ad.postedAt).getTime();
      if (!isNaN(ct) && (Date.now() - ct <= 24 * 60 * 60 * 1000) && !isRead(ad.id)) {
        isNew = true;
      }
    } catch(e){}
  }

  const totalSeats = Number(ad.totalSeats || ad.seatCount || ad.seats || 0);
  const booked = Number(ad.bookedSeats || 0);
  const available = Math.max(totalSeats - booked, 0);

  const requested = Number(ad.passengerCount || ad.requestedSeats || ad.requestSeats || ad.peopleCount || 0);

  const carModel = u.carModel || ad.car || "";

  div.innerHTML = `
    <img class="ad-avatar" src="${escapeHtml(u.avatar || "https://i.ibb.co/2W0z7Lx/user.png")}" />
    <div class="ad-main">
      <div class="ad-route">
        ${escapeHtml(route)}
        ${isNew ? '<span class="ad-badge-new" style="margin-left:8px;background:#0069d9;color:#fff;padding:3px 8px;border-radius:8px;font-size:12px">Yangi</span>' : ''}
      </div>
      <div class="ad-car" style="color:#6b7280;font-size:13px;margin-top:6px">${escapeHtml(carModel)}</div>

      <div class="ad-meta" style="margin-top:8px">
        <div class="ad-chip">⏰ ${escapeHtml(depTime)}</div>
        ${
          totalSeats
            ? `<div class="ad-chip">👥 ${available}/${totalSeats} bo‘sh</div>`
            : `<div class="ad-chip">👥 ${requested || "-"} odam</div>`
        }
      </div>
    </div>

    <div class="ad-price">💰 ${escapeHtml(ad.price || "-")} so‘m</div>
    <div class="ad-created">${escapeHtml(created)}</div>
  `;

  div.onclick = () => openAdModal(ad);
  return div;
}

// ===============================
//  OPEN MODAL (mark read)
// ===============================
async function openAdModal(ad) {
  let modal = document.getElementById("adFullModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "adFullModal";
    document.body.appendChild(modal);
  }

  const u = await getUserInfo(ad.userId);

  const route =
    `${ad.fromRegion || ""}${ad.fromDistrict ? ", "+ad.fromDistrict : ""}` +
    ` → ${ad.toRegion || ""}${ad.toDistrict ? ", "+ad.toDistrict : ""}`;

  const depTime = formatTime(ad.departureTime || ad.startTime || ad.time || ad.date);
  const created = formatTime(ad.createdAt || ad.created || ad.postedAt);

  const fullname = u.fullName || "Foydalanuvchi";
  const carFull = `${u.carModel || ""}${u.carColor ? " • " + u.carColor : ""}${u.carNumber ? " • " + u.carNumber : ""}`;

  const totalSeats = Number(ad.totalSeats || ad.seatCount || ad.seats || 0);
  const booked = Number(ad.bookedSeats || 0);
  const available = Math.max(totalSeats - booked, 0);
  const requested = Number(ad.passengerCount || ad.requestedSeats || ad.peopleCount || 0);

  modal.innerHTML = `
    <div class="ad-modal-box">
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:8px;">
        <img class="modal-avatar" src="${escapeHtml(u.avatar || "https://i.ibb.co/2W0z7Lx/user.png")}">
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
          <div class="value">${
            totalSeats
              ? `${totalSeats} ta (Bo‘sh: ${available})`
              : (requested ? `Talab: ${requested} odam` : "-")
          }</div>
        </div>

        <div class="modal-col" style="text-align:right">
          <div class="label">Narx</div>
          <div class="value">${escapeHtml(ad.price || "-")} so‘m</div>
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
        <button class="btn-ghost" id="modalCallBtn">Qo‘ng‘iroq</button>
      </div>
    </div>
  `;

  modal.style.display = "flex";
  document.getElementById("modalCloseBtn").onclick = closeAdModal;
  document.getElementById("modalCallBtn").onclick = () => onContact(u.phone || "");

  // mark read
  try { markAsRead(ad.id); } catch(e) {}
  updateBadgeForAd(ad.id);

  modal.onclick = (e) => { if (e.target === modal) closeAdModal(); };
}

function closeAdModal() {
  const modal = document.getElementById("adFullModal");
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
// ===============================
//  RESET FILTERS (FULL)
// ===============================
function resetFilters() {
  const searchEl = document.getElementById("search");
  const roleEl = document.getElementById("filterRole");
  const regionEl = document.getElementById("filterRegion");
  const fromRegionEl = document.getElementById("fromRegion");
  const toRegionEl = document.getElementById("toRegion");
  const sortByEl = document.getElementById("sortBy");
  const filterDateEl = document.getElementById("filterDate");
  const priceMinEl = document.getElementById("priceMin");
  const priceMaxEl = document.getElementById("priceMax");

  if (searchEl) searchEl.value = "";
  if (roleEl) roleEl.value = "";
  if (regionEl) regionEl.value = "";
  if (fromRegionEl) fromRegionEl.value = "";
  if (toRegionEl) toRegionEl.value = "";
  if (sortByEl) sortByEl.value = "newest";
  if (filterDateEl) filterDateEl.value = "";
  if (priceMinEl) priceMinEl.value = "";
  if (priceMaxEl) priceMaxEl.value = "";

  // checkboxlarni ham nolga qaytaramiz
  document.querySelectorAll("#fromDistrictBox input.fromDistrict").forEach(i => i.checked = false);
  document.querySelectorAll("#toDistrictBox input.toDistrict").forEach(i => i.checked = false);

  // panel ko‘rinishini qayta moslash
  if (document.getElementById("fromRegion")?.value) fillFromDistricts();
  else document.getElementById("fromDistrictBox").style.display = "none";

  if (document.getElementById("toRegion")?.value) fillToDistricts();
  else document.getElementById("toDistrictBox").style.display = "none";

  CURRENT_PAGE = 1;
  scheduleRenderAds();
}
window.resetFilters = resetFilters;


// ===============================
//  SCHEDULE RENDER (smooth)
// ===============================
let __render_timeout = null;
function scheduleRenderAds() {
  if (__render_timeout) clearTimeout(__render_timeout);
  __render_timeout = setTimeout(() => {
    renderAds(Array.from(ADS_MAP.values()));
    __render_timeout = null;
  }, 110);
}


// ===============================
//  PAGINATION CONTROLS
// ===============================
function renderPaginationControls(totalPages = 0, currentPage = 0, totalItems = 0) {
  let container = document.getElementById("paginationControls");
  if (!container) {
    container = document.createElement("div");
    container.id = "paginationControls";
    container.style = `
      display:flex;
      align-items:center;
      gap:8px;
      margin-top:12px;
      justify-content:center;
    `;

    const list = document.getElementById("adsList");
    if (list && list.parentNode) {
      list.parentNode.insertBefore(container, list.nextSibling);
    } else {
      document.body.appendChild(container);
    }
  }

  container.innerHTML = "";

  if (!totalPages || totalPages <= 1) {
    if (totalItems > 0) {
      const info = document.createElement("div");
      info.textContent = `Ko‘rsatilyapti: ${Math.min(PAGE_SIZE, totalItems)} / ${totalItems}`;
      info.style = "color:#6b7280;font-size:14px;";
      container.appendChild(info);
    }
    return;
  }

  const btn = (text, disabled, handler) => {
    const b = document.createElement("button");
    b.textContent = text;
    b.disabled = !!disabled;
    b.style = `
      padding:6px 10px;
      border-radius:8px;
      border:1px solid #e5e7eb;
      background:white;
      cursor:pointer;
    `;
    if (!disabled) b.onclick = handler;
    return b;
  };

  container.appendChild(btn("« Birinchi", currentPage === 1, () => {
    CURRENT_PAGE = 1;
    scheduleRenderAds();
  }));

  container.appendChild(btn("‹ Oldingi", currentPage === 1, () => {
    CURRENT_PAGE = Math.max(1, currentPage - 1);
    scheduleRenderAds();
  }));

  const windowSize = 5;
  let start = Math.max(1, currentPage - Math.floor(windowSize / 2));
  let end = Math.min(totalPages, start + windowSize - 1);
  if (end - start < windowSize - 1) start = Math.max(1, end - windowSize + 1);

  for (let p = start; p <= end; p++) {
    const isCurrent = p === currentPage;
    const pbtn = document.createElement("button");
    pbtn.textContent = p;
    pbtn.disabled = isCurrent;
    pbtn.style = `
      padding:6px 10px;
      border-radius:8px;
      border:1px solid ${isCurrent ? "#0069d9" : "#e5e7eb"};
      background:${isCurrent ? "#0069d9" : "white"};
      color:${isCurrent ? "white" : "#111"};
      cursor:pointer;
    `;
    if (!isCurrent) pbtn.onclick = () => {
      CURRENT_PAGE = p;
      scheduleRenderAds();
    };
    container.appendChild(pbtn);
  }

  container.appendChild(btn("Keyingi ›", currentPage === totalPages, () => {
    CURRENT_PAGE = Math.min(totalPages, currentPage + 1);
    scheduleRenderAds();
  }));

  container.appendChild(btn("Oxiri »", currentPage === totalPages, () => {
    CURRENT_PAGE = totalPages;
    scheduleRenderAds();
  }));

  const info = document.createElement("div");
  info.textContent = ` Sahifa ${currentPage} / ${totalPages} — Jami: ${totalItems}`;
  info.style = "color:#6b7280;font-size:13px;margin-left:8px;";
  container.appendChild(info);
}
