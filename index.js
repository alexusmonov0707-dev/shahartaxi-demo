// index.js (final + pagination)
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

// robust slugify for ids
function slugify(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, "_").replace(/[^\w\-]/g, "");
}

// ===============================
//  GET USER INFO (keeps existing behavior)
// ===============================
async function getUserInfo(userId) {
  if (!userId) return {
    phone: "", avatar: "", fullName: "", role: "",
    carModel: "", carColor: "", carNumber: "", seatCount: 0
  };
  try {
    const snap = await get(ref(db, "users/" + userId));
    if (!snap.exists()) return {
      phone: "", avatar: "", fullName: "", role: "",
      carModel: "", carColor: "", carNumber: "", seatCount: 0
    };
    const u = snap.val();
    return {
      phone: u.phone || u.telephone || "",
      avatar: u.avatar || "",
      fullName: u.fullName || ((u.firstname || u.lastname) ? `${u.firstname || ""} ${u.lastname || ""}`.trim() : "") || u.name || "",
      role: (u.role || u.userRole || "").toString(),
      carModel: u.carModel || u.car || "",
      carColor: u.carColor || "",
      carNumber: u.carNumber || u.plate || "",
      seatCount: Number(u.seatCount || u.seats || 0)
    };
  } catch (err) {
    console.error("getUserInfo error", err);
    return {
      phone: "", avatar: "", fullName: "", role: "",
      carModel: "", carColor: "", carNumber: "", seatCount: 0
    };
  }
}

// ===============================
//  GLOBALS
// ===============================
// We'll keep both a Map and an Array: Map for quick add/update/remove, Array for ordered rendering
const ADS_MAP = new Map();   // id -> ad object
let ALL_ADS_ARR = [];       // derived from ADS_MAP (keeps insertion order from DB snapshot)
let CURRENT_USER = null;
let useRealtime = true;     // set true to attach child_* listeners

// Pagination state
const PAGE_SIZE = 10;       // default items per page (you asked 10 for test)
let CURRENT_PAGE = 1;       // current page (1-based)

// ===============================
//  AUTH CHECK
// ===============================
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  CURRENT_USER = await getUserInfo(user.uid || user.userId);
  loadRegionsFilter();      // fills top-right region filter if present
  loadRouteFilters();       // fills from/to selects and district boxes
  await initialLoadAds();   // one-time load from DB
  if (useRealtime) attachRealtimeHandlers(); // soft realtime updates
});

// ===============================
//  LOAD REGION FILTER (top bar)
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
//  Route Filters (from/to + districts)
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

  // attach handlers (single)
  fromRegion.onchange = () => { fillFromDistricts(); CURRENT_PAGE = 1; scheduleRenderAds(); };
  toRegion.onchange   = () => { fillToDistricts(); CURRENT_PAGE = 1; scheduleRenderAds(); };

  // init boxes
  fillFromDistricts();
  fillToDistricts();
}

function fillFromDistricts() {
  const region = document.getElementById("fromRegion")?.value;
  const box = document.getElementById("fromDistrictBox");
  if (!box) return;
  box.innerHTML = "";
  if (!region || !REGIONS[region]) return;
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
  if (!region || !REGIONS[region]) return;
  REGIONS[region].forEach(d => {
    const label = document.createElement("label");
    label.className = "district-item";
    label.innerHTML = `<input type="checkbox" class="toDistrict" value="${escapeHtml(d)}"> ${escapeHtml(d)}`;
    box.appendChild(label);
  });
  box.querySelectorAll("input").forEach(ch => ch.onchange = () => { CURRENT_PAGE = 1; scheduleRenderAds(); });
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
      renderPaginationControls(); // ensure pagination cleared
      return;
    }

    // build array and map
    const arr = [];
    snap.forEach(child => {
      const v = child.val();
      arr.push({ id: child.key, ...v, typeNormalized: normalizeType(v.type) });
    });

    // ensure uniqueness by id (last value wins)
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
//  REALTIME HANDLERS (child_added / changed / removed)
//  — soft updates to DOM & ADS_MAP to avoid full reload
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
      // schedule render, do not reset page (so user stays on current page)
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
      const id = snap.key;
      ADS_MAP.delete(id);
      ALL_ADS_ARR = Array.from(ADS_MAP.values());
      const node = document.querySelector(`.ad-card[data-ad-id="${escapeSelector(id)}"]`);
      if (node && node.parentNode) node.parentNode.removeChild(node);
      scheduleRenderAds();
    });

  } catch (err) {
    console.warn("attachRealtimeHandlers failed:", err);
  }
}

// small helper to escape attribute selector special chars
function escapeSelector(s) {
  return String(s || "").replace(/([ #;?%&,.+*~\':"!^$[\]()=>|\/@])/g,'\\$1');
}

// ===============================
//  ATTACH INPUT HANDLERS (once)
// ===============================
let inputsAttached = false;
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

  if (searchEl) searchEl.oninput = () => { CURRENT_PAGE = 1; scheduleRenderAds(); };
  if (roleEl) roleEl.onchange = () => { CURRENT_PAGE = 1; scheduleRenderAds(); };
  if (regionEl) regionEl.onchange = () => { CURRENT_PAGE = 1; scheduleRenderAds(); };
  if (fromRegionEl) fromRegionEl.onchange = () => { fillFromDistricts(); CURRENT_PAGE = 1; scheduleRenderAds(); };
  if (toRegionEl) toRegionEl.onchange   = () => { fillToDistricts(); CURRENT_PAGE = 1; scheduleRenderAds(); };
  if (sortByEl) sortByEl.onchange = () => { CURRENT_PAGE = 1; scheduleRenderAds(); };
  if (filterDateEl) filterDateEl.onchange = () => { CURRENT_PAGE = 1; scheduleRenderAds(); };
  if (priceMinEl) priceMinEl.oninput = () => { CURRENT_PAGE = 1; scheduleRenderAds(); };
  if (priceMaxEl) priceMaxEl.oninput = () => { CURRENT_PAGE = 1; scheduleRenderAds(); };

  // checkbox global listener already in scheduleRenderAds usage
  document.addEventListener("change", (e) => {
    if (!e.target) return;
    if (e.target.classList && (e.target.classList.contains("fromDistrict") || e.target.classList.contains("toDistrict"))) {
      CURRENT_PAGE = 1;
      scheduleRenderAds();
    }
  });
}

// ===============================
//  RENDER ADS (full pipeline, respects all existing filters + pagination)
// ===============================
async function renderAds(adsArr) {
  const list = document.getElementById("adsList");
  if (!list) return;
  // clear safely
  list.innerHTML = "";

  const q = (document.getElementById("search")?.value || "").toLowerCase();
  const roleFilter = normalizeType(document.getElementById("filterRole")?.value || "");
  const regionFilter = document.getElementById("filterRegion")?.value || "";
  const sortBy = document.getElementById("sortBy")?.value || "newest";
  const filterDate = document.getElementById("filterDate")?.value || "";

  // price parsing robustly
  const priceMinInput = (document.getElementById("priceMin")?.value || "").toString().trim();
  const priceMaxInput = (document.getElementById("priceMax")?.value || "").toString().trim();
  const isPriceMinSet = priceMinInput !== "";
  const isPriceMaxSet = priceMaxInput !== "";
  const priceMin = isPriceMinSet ? Number(priceMinInput.replace(/\s+/g,"")) : null;
  const priceMax = isPriceMaxSet ? Number(priceMaxInput.replace(/\s+/g,"")) : null;

  const currentUserId = auth.currentUser?.uid || null;

  const currentRoleRaw = (CURRENT_USER?.role || "").toString().toLowerCase();
  let currentRole = "";
  if (currentRoleRaw.includes("driver") || currentRoleRaw.includes("haydov")) currentRole = "driver";
  else if (currentRoleRaw.includes("pass") || currentRoleRaw.includes("yo")) currentRole = "passenger";

  const fromRegion = document.getElementById("fromRegion")?.value || "";
  const toRegion = document.getElementById("toRegion")?.value || "";
  const fromDistricts = Array.from(document.querySelectorAll("#fromDistrictBox input.fromDistrict:checked")).map(x => x.value);
  const toDistricts = Array.from(document.querySelectorAll("#toDistrictBox input.toDistrict:checked")).map(x => x.value);

  // filter + validate
  let filtered = (adsArr || []).filter(a => {
    if (!a) return false;

    // automatic role filter (driver sees passenger ads, passenger sees driver ads)
    if (currentRole === "driver") {
      if (!a.typeNormalized || !a.typeNormalized.toLowerCase().includes("yo")) return false;
    } else if (currentRole === "passenger") {
      if (!a.typeNormalized || !a.typeNormalized.toLowerCase().includes("haydov")) return false;
    }

    // explicit role dropdown
    if (roleFilter) { if (a.typeNormalized !== roleFilter) return false; }

    // hide own ads
    if (currentUserId && a.userId === currentUserId) return false;

    // top region filter (either from or to)
    if (regionFilter) {
      if (a.fromRegion !== regionFilter && a.toRegion !== regionFilter) return false;
    }

    // from region / districts
    if (fromRegion && a.fromRegion !== fromRegion) return false;
    if (fromDistricts.length > 0 && !fromDistricts.includes(a.fromDistrict)) return false;

    // to region / districts
    if (toRegion && a.toRegion !== toRegion) return false;
    if (toDistricts.length > 0 && !toDistricts.includes(a.toDistrict)) return false;

    // PRICE
    const adPrice = (a.price !== undefined && a.price !== null && a.price !== "") ? Number(String(a.price).replace(/\s+/g,"")) : NaN;
    if (isPriceMinSet && isNaN(adPrice)) return false; // ad has no price but user requested min
    if (isPriceMaxSet && isNaN(adPrice)) return false; // ad has no price but user requested max
    if (isPriceMinSet && !isNaN(adPrice) && adPrice < priceMin) return false;
    if (isPriceMaxSet && !isNaN(adPrice) && adPrice > priceMax) return false;

    // HIDE EXPIRED ADS by departure time (if no valid departureTime -> hide)
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

    // DATE filter (today/tomorrow/3days)
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

    // SEARCH concat fields
    const hay = [
      a.fromRegion, a.fromDistrict,
      a.toRegion, a.toDistrict,
      a.comment, a.price, a.type, a.carModel, a.userId
    ].join(" ").toLowerCase();
    if (!hay.includes(q)) return false;

    return true;
  });

  // dedupe by id -> Map will keep last set
  const resultMap = new Map();
  filtered.forEach(x => { if (x && x.id) resultMap.set(x.id, x); });
  filtered = Array.from(resultMap.values());

  if (!filtered.length) {
    list.innerHTML = "<p>Natija topilmadi.</p>";
    renderPaginationControls(0, 0); // empty
    return;
  }

  // SORT by createdAt / fallback
  filtered.sort((a,b) => {
    const ta = new Date(a.createdAt || a.created || a.postedAt || 0).getTime();
    const tb = new Date(b.createdAt || b.created || b.postedAt || 0).getTime();
    return (document.getElementById("sortBy")?.value === "oldest") ? (ta - tb) : (tb - ta);
  });

  // PAGINATION: compute total/pages, clamp CURRENT_PAGE
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  if (CURRENT_PAGE < 1) CURRENT_PAGE = 1;
  if (CURRENT_PAGE > totalPages) CURRENT_PAGE = totalPages;

  const startIndex = (CURRENT_PAGE - 1) * PAGE_SIZE;
  const pageSlice = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  // build DOM fragment with cards (createAdCard is async)
  const cards = await Promise.all(pageSlice.map(a => createAdCard(a)));
  const frag = document.createDocumentFragment();
  cards.forEach(c => frag.appendChild(c));
  list.appendChild(frag);

  // render pagination controls
  renderPaginationControls(totalPages, CURRENT_PAGE, totalItems);
}

// ===============================
//  CREATE CARD (no-name vs full modal preserved)
// ===============================
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

  // NEW badge logic: 24h window and not read
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

  const carModel = u.carModel || ad.car || "";

  div.innerHTML = `
    <img class="ad-avatar" src="${escapeHtml(u.avatar || "https://i.ibb.co/2W0z7Lx/user.png")}" alt="avatar">
    <div class="ad-main">
      <div class="ad-route">
        ${escapeHtml(route)}
        ${isNew ? '<span class="ad-badge-new" style="margin-left:8px;background:#0069d9;color:#fff;padding:4px 8px;border-radius:8px;font-size:12px">Yangi</span>' : ''}
      </div>
      <div class="ad-car" style="color:#6b7280;font-size:13px;margin-top:6px">${escapeHtml(carModel)}</div>
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

  // attach click
  div.onclick = () => openAdModal(ad);

  return div;
}

// ===============================
//  OPEN MODAL
//  — marks ad as read (so "Yangi" badge disappears for that ad only)
// ===============================
async function openAdModal(ad) {
  let modal = document.getElementById("adFullModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "adFullModal";
    document.body.appendChild(modal);
  }

  const u = await getUserInfo(ad.userId);

  const route = `${ad.fromRegion || ""}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ${ad.toRegion || ""}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;
  const depTime = formatTime(ad.departureTime || ad.startTime || ad.time || ad.date || "");
  const created = formatTime(ad.createdAt || ad.created || ad.postedAt || "");
  const fullname = u.fullName || ((u.firstname || u.lastname) ? `${u.firstname || ""} ${u.lastname || ""}`.trim() : "") || "Foydalanuvchi";
  const carFull = `${u.carModel || ""}${u.carColor ? " • " + u.carColor : ""}${u.carNumber ? " • " + u.carNumber : ""}`;

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

  // mark as read and only update that ad's card (no full re-render)
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

// update only badge for a single ad DOM node
function updateBadgeForAd(adId) {
  if (!adId) return;
  const node = document.querySelector(`.ad-card[data-ad-id="${escapeSelector(adId)}"]`);
  if (!node) return;
  const badge = node.querySelector(".ad-badge-new");
  if (badge) badge.remove();
}

// contact helper
function onContact(phone) {
  if (!phone) return alert("Telefon raqami mavjud emas");
  window.location.href = `tel:${phone}`;
}
window.onContact = onContact;

// ===============================
// DEBOUNCE scheduling to avoid flicker
// ===============================
let __render_timeout = null;
function scheduleRenderAds() {
  if (__render_timeout) clearTimeout(__render_timeout);
  __render_timeout = setTimeout(() => {
    renderAds(Array.from(ADS_MAP.values()));
    __render_timeout = null;
  }, 110);
}

// Logout
window.logout = () => signOut(auth);

// expose open/close
window.openAdModal = openAdModal;
window.closeAdModal = closeAdModal;

// ===============================
// PAGINATION CONTROLS RENDERING
// ===============================
function renderPaginationControls(totalPages = 0, currentPage = 0, totalItems = 0) {
  // Ensure container exists
  let container = document.getElementById("paginationControls");
  if (!container) {
    container = document.createElement("div");
    container.id = "paginationControls";
    container.style = "display:flex;align-items:center;gap:8px;margin-top:12px;justify-content:center;";
    // Append after adsList (if exists)
    const list = document.getElementById("adsList");
    if (list && list.parentNode) {
      list.parentNode.insertBefore(container, list.nextSibling);
    } else {
      document.body.appendChild(container);
    }
  }

  container.innerHTML = ""; // clear

  if (!totalPages || totalPages <= 1) {
    // show small info if >0
    if (totalItems > 0) {
      const info = document.createElement("div");
      info.textContent = `Ko‘rsatilyapti: ${Math.min(PAGE_SIZE, totalItems)} / ${totalItems}`;
      info.style = "color:#6b7280;font-size:14px;";
      container.appendChild(info);
    }
    return;
  }

  // helper to create button
  const btn = (text, disabled, handler) => {
    const b = document.createElement("button");
    b.textContent = text;
    b.disabled = !!disabled;
    b.style = "padding:6px 10px;border-radius:8px;border:1px solid #e5e7eb;background:white;cursor:pointer";
    if (!disabled) b.onclick = handler;
    return b;
  };

  // First, Prev
  container.appendChild(btn("« Birinchi", currentPage === 1, () => { CURRENT_PAGE = 1; scheduleRenderAds(); }));
  container.appendChild(btn("‹ Oldingi", currentPage === 1, () => { CURRENT_PAGE = Math.max(1, currentPage - 1); scheduleRenderAds(); }));

  // page numbers (show window)
  const windowSize = 5;
  let start = Math.max(1, currentPage - Math.floor(windowSize/2));
  let end = Math.min(totalPages, start + windowSize - 1);
  if (end - start < windowSize - 1) start = Math.max(1, end - windowSize + 1);

  for (let p = start; p <= end; p++) {
    const isCurrent = p === currentPage;
    const pbtn = document.createElement("button");
    pbtn.textContent = p.toString();
    pbtn.disabled = isCurrent;
    pbtn.style = `padding:6px 10px;border-radius:8px;border:1px solid ${isCurrent ? "#0069d9" : "#e5e7eb"};background:${isCurrent ? "#0069d9" : "white"};color:${isCurrent ? "white" : "#111"};cursor:pointer`;
    if (!isCurrent) pbtn.onclick = () => { CURRENT_PAGE = p; scheduleRenderAds(); };
    container.appendChild(pbtn);
  }

  // Next, Last
  container.appendChild(btn("Keyingi ›", currentPage === totalPages, () => { CURRENT_PAGE = Math.min(totalPages, currentPage + 1); scheduleRenderAds(); }));
  container.appendChild(btn("Oxiri »", currentPage === totalPages, () => { CURRENT_PAGE = totalPages; scheduleRenderAds(); }));

  // info
  const info = document.createElement("div");
  info.textContent = ` Sahifa ${currentPage} / ${totalPages} — Jami: ${totalItems}`;
  info.style = "color:#6b7280;font-size:13px;margin-left:8px;";
  container.appendChild(info);
}

// ===============================
// UTILITY: when DOM updates could cause duplicates,
// ensure createAdCard returns unique node per ad id — we already set data-ad-id
// Deduplication handled in renderAds (Map) and in realtime remove handler.
// ===============================
