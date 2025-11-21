// ---------------------------
// index.js — PART 1 (CORE)
// ---------------------------
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
  query,
  orderByChild,
  equalTo,
  limitToLast,
  startAt,
  endAt,
  onChildAdded,
  onChildChanged,
  onChildRemoved
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ------------------------------
// Firebase config (sening loyihang)
// ------------------------------
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

// ------------------------------
// REGIONS (assets must set window.regions or window.regionsData)
// ------------------------------
let REGIONS = {};
if (window.regionsData) REGIONS = window.regionsData;
else if (window.regions) REGIONS = window.regions;
else {
  REGIONS = {};
  console.warn("REGIONS not found — ensure assets/regions-taxi.js or regions-helper.js loaded");
}

// ------------------------------
// Local read-badge helpers
// ------------------------------
function markAsRead(adId) {
  if (!adId) return;
  try {
    const arr = JSON.parse(localStorage.getItem("readAds") || "[]");
    if (!arr.includes(adId)) {
      arr.push(adId);
      localStorage.setItem("readAds", JSON.stringify(arr));
    }
  } catch (e) { console.warn("markAsRead error", e); }
}

function isRead(adId) {
  try {
    const arr = JSON.parse(localStorage.getItem("readAds") || "[]");
    return arr.includes(adId);
  } catch (e) { return false; }
}

// ------------------------------
// HELPERS
// ------------------------------
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
  t = String(t).trim().toLowerCase().replace(/[‘’`ʼ']/g, "'");
  if (t.includes("haydov")) return "Haydovchi";
  if (t.includes("yo") && t.includes("lov")) return "Yo‘lovchi";
  if (t === "yo'lovchi") return "Yo‘lovchi";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function formatTime(val) {
  if (!val) return "—";
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
}

function slugify(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, "_").replace(/[^\w\-]/g, "");
}

function escapeSelector(s) {
  return String(s || "").replace(/([ #;?%&,.+*~':\"!^$[\]()=>|\/@])/g,'\\$1');
}

// ------------------------------
// USER INFO (with small in-memory cache)
// ------------------------------
const USER_CACHE = new Map();
async function getUserInfo(uid) {
  if (!uid) return {};
  if (USER_CACHE.has(uid)) return USER_CACHE.get(uid);
  try {
    const snap = await get(ref(db, "users/" + uid));
    if (!snap.exists()) {
      USER_CACHE.set(uid, {});
      return {};
    }
    const u = snap.val();
    const info = {
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
    USER_CACHE.set(uid, info);
    return info;
  } catch (e) {
    console.error("getUserInfo error:", e);
    USER_CACHE.set(uid, {});
    return {};
  }
}

// ------------------------------
// GLOBALS + CACHING for ads
// ------------------------------
let ADS_MAP = new Map();   // id -> ad object (main cache)
let ALL_ADS = [];          // array view
let CURRENT_USER = null;

const INIT_LOAD_LIMIT = 100;   // initial load: only last N items from DB
const MAX_RENDER_BATCH = 200;   // safety cap for client-side rendered items

// ------------------------------
// Build a Firebase query from simple filters (server-side filtering starter)
// ------------------------------
// filters: { fromRegion, toRegion, priceMin, priceMax, type, startTimeFrom, startTimeTo, limit }
function buildQueryForFilters(filters) {
  // Basic approach: if a single equality filter exists (e.g. fromRegion) use orderByChild + equalTo
  // Otherwise fallback to limitToLast(INIT_LOAD_LIMIT)
  let qRef = ref(db, "ads");
  try {
    if (filters && filters.fromRegion) {
      return query(qRef, orderByChild("fromRegion"), equalTo(filters.fromRegion), limitToLast(filters.limit || INIT_LOAD_LIMIT));
    }
  } catch (e) { console.warn("buildQueryForFilters fallback", e); }
  return query(qRef, orderByChild("createdAt"), limitToLast(filters && filters.limit ? filters.limit : INIT_LOAD_LIMIT));
}

// ------------------------------
// initialLoadAds: load a reasonable set (not everything). Populate ADS_MAP and ALL_ADS.
// ------------------------------
async function initialLoadAds() {
  try {
    // start with a safe query (last N items)
    const q = buildQueryForFilters({ limit: INIT_LOAD_LIMIT });
    const snap = await get(q);
    if (!snap.exists()) {
      ADS_MAP.clear();
      ALL_ADS = [];
      // the page should react to empty state externally (renderAds will handle)
      return;
    }

    const list = [];
    snap.forEach(child => {
      const v = child.val();
      list.push({ id: child.key, ...v, typeNormalized: normalizeType(v.type) });
    });

    ADS_MAP.clear();
    for (const ad of list) {
      if (ad && ad.id) ADS_MAP.set(ad.id, ad);
    }
    ALL_ADS = Array.from(ADS_MAP.values());

    // cap sanity: if DB returned a lot, keep only MAX_RENDER_BATCH most recent
    ALL_ADS.sort((a,b) => (new Date(b.createdAt||b.created||0).getTime()) - (new Date(a.createdAt||a.created||0).getTime()));
    if (ALL_ADS.length > MAX_RENDER_BATCH) ALL_ADS = ALL_ADS.slice(0, MAX_RENDER_BATCH);

    // expose for other modules / later rendering
    // schedule first render externally
    if (typeof scheduleRenderAds === "function") scheduleRenderAds();
  } catch (e) {
    console.error("initialLoadAds error:", e);
  }
}

// ------------------------------
// AUTH check (basic) - sets CURRENT_USER and triggers initial load
// ------------------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  CURRENT_USER = await getUserInfo(user.uid);
  // load initial ads
  await initialLoadAds();
  // attach realtime handlers later (in part 2) so that we only listen after filters are set
});

// Exported helpers (so later parts can reuse)
window._ST_INDEX_CORE = {
  escapeHtml, normalizeType, formatTime, slugify, getUserInfo,
  markAsRead, isRead, REGIONS,
  ADS_MAP, ALL_ADS, initialLoadAds, buildQueryForFilters, USER_CACHE
};
// ------------------------------------------
// PART 2 — FILTERS + REALTIME + INPUT-HANDLERS
// ------------------------------------------

let CURRENT_PAGE = 1;
const PAGE_SIZE = 10;
let __render_timer = null;

// ===========================
// SERVER-FRIENDLY FILTERING
// ===========================

async function applyFilters() {
  const { ADS_MAP, ALL_ADS, normalizeType } = window._ST_INDEX_CORE;

  const qVal = document.getElementById("search")?.value.toLowerCase() || "";
  const roleFilter = document.getElementById("filterRole")?.value || "";
  const regionFilter = document.getElementById("filterRegion")?.value || "";
  const sortBy = document.getElementById("sortBy")?.value || "newest";
  const filterDate = document.getElementById("filterDate")?.value || "";
  const priceMin = document.getElementById("priceMin")?.value || "";
  const priceMax = document.getElementById("priceMax")?.value || "";
  const fromRegion = document.getElementById("fromRegion")?.value || "";
  const toRegion = document.getElementById("toRegion")?.value || "";

  const fromDistricts = Array.from(document.querySelectorAll(".fromDistrict:checked")).map(x => x.value);
  const toDistricts = Array.from(document.querySelectorAll(".toDistrict:checked")).map(x => x.value);

  const filtered = ALL_ADS.filter(ad => {
    if (!ad) return false;

    // Role-based visibility
    const user = window.CURRENT_USER;
    if (user?.role) {
      const ur = user.role.toLowerCase();
      if (ur.includes("haydov")) {
        // driver -> sees passenger ads
        if (!ad.typeNormalized.toLowerCase().includes("yo")) return false;
      } else {
        // passenger -> sees driver ads
        if (!ad.typeNormalized.toLowerCase().includes("haydov")) return false;
      }
    }

    if (roleFilter && ad.typeNormalized !== roleFilter) return false;

    if (regionFilter) {
      if (ad.fromRegion !== regionFilter && ad.toRegion !== regionFilter) return false;
    }

    if (fromRegion && ad.fromRegion !== fromRegion) return false;
    if (fromDistricts.length && !fromDistricts.includes(ad.fromDistrict)) return false;

    if (toRegion && ad.toRegion !== toRegion) return false;
    if (toDistricts.length && !toDistricts.includes(ad.toDistrict)) return false;

    // PRICE
    if (priceMin !== "") {
      const p = Number(ad.price || 0);
      if (p < Number(priceMin)) return false;
    }
    if (priceMax !== "") {
      const p = Number(ad.price || 0);
      if (p > Number(priceMax)) return false;
    }

    // TIME
    const dr = ad.departureTime || ad.startTime || ad.time || ad.date || "";
    const dep = new Date(dr.replace(" ", "T"));
    if (isNaN(dep.getTime())) return false;
    if (dep.getTime() < Date.now()) return false;

    if (filterDate === "today") {
      const n = new Date();
      if (
        dep.getFullYear() !== n.getFullYear() ||
        dep.getMonth() !== n.getMonth() ||
        dep.getDate() !== n.getDate()
      ) return false;
    }
    if (filterDate === "tomorrow") {
      const n = new Date();
      n.setDate(n.getDate() + 1);
      if (
        dep.getFullYear() !== n.getFullYear() ||
        dep.getMonth() !== n.getMonth() ||
        dep.getDate() !== n.getDate()
      ) return false;
    }
    if (filterDate === "3days") {
      const diff = dep.getTime() - Date.now();
      if (diff < 0 || diff > 3 * 24 * 3600 * 1000) return false;
    }

    // SEARCH
    const hay = (
      ad.fromRegion + " " +
      ad.fromDistrict + " " +
      ad.toRegion + " " +
      ad.toDistrict + " " +
      (ad.comment || "") + " " +
      (ad.price || "")
    ).toLowerCase();

    if (qVal && !hay.includes(qVal)) return false;

    return true;
  });

  // SORT
  filtered.sort((a, b) => {
    const ta = new Date(a.createdAt || a.created || 0).getTime();
    const tb = new Date(b.createdAt || b.created || 0).getTime();
    return sortBy === "oldest" ? ta - tb : tb - ta;
  });

  return filtered;
}


// ===========================
// SAFE RENDER SCHEDULER
// ===========================
function scheduleRenderAds() {
  if (__render_timer) clearTimeout(__render_timer);
  __render_timer = setTimeout(async () => {
    const arr = await applyFilters();
    renderAds(arr);
    __render_timer = null;
  }, 120);
}


// ===========================
// REALTIME UPDATE HANDLERS
// ===========================
function attachRealtimeHandlers() {
  const adsRef = ref(db, "ads");

  onChildAdded(adsRef, snap => {
    const v = snap.val();
    if (!v) return;
    const ad = { id: snap.key, ...v, typeNormalized: normalizeType(v.type) };
    ADS_MAP.set(ad.id, ad);
    ALL_ADS = Array.from(ADS_MAP.values());
    scheduleRenderAds();
  });

  onChildChanged(adsRef, snap => {
    const v = snap.val();
    if (!v) return;
    const ad = { id: snap.key, ...v, typeNormalized: normalizeType(v.type) };
    ADS_MAP.set(ad.id, ad);
    ALL_ADS = Array.from(ADS_MAP.values());
    scheduleRenderAds();
  });

  onChildRemoved(adsRef, snap => {
    ADS_MAP.delete(snap.key);
    ALL_ADS = Array.from(ADS_MAP.values());
    scheduleRenderAds();
  });
}


// ===========================
// INPUT HANDLERS
// ===========================
let FILTER_BOUND = false;

function attachInputsOnce() {
  if (FILTER_BOUND) return;
  FILTER_BOUND = true;

  const ids = [
    "search", "filterRole", "filterRegion",
    "sortBy", "filterDate", "priceMin", "priceMax",
    "fromRegion", "toRegion"
  ];

  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", scheduleRenderAds);
      el.addEventListener("change", scheduleRenderAds);
    }
  });

  // district checkboxes — delegated
  document.addEventListener("change", e => {
    if (e.target.classList.contains("fromDistrict") ||
        e.target.classList.contains("toDistrict")) {
      scheduleRenderAds();
    }
  });

  // dropdown close on outside click
  document.addEventListener("click", e => {
    const fromBox = document.getElementById("fromDistrictBox");
    const toBox = document.getElementById("toDistrictBox");

    if (!fromBox.contains(e.target) &&
        !document.getElementById("fromRegion").contains(e.target)) {
      fromBox.style.display = "none";
    }
    if (!toBox.contains(e.target) &&
        !document.getElementById("toRegion").contains(e.target)) {
      toBox.style.display = "none";
    }
  }, true);
}


// Make available
window._ST_FILTERS = {
  applyFilters,
  scheduleRenderAds,
  attachInputsOnce,
  attachRealtimeHandlers
};
// -----------------------------------------
// PART 3 — RENDER, CARD, MODAL, PAGINATION
// -----------------------------------------

async function renderAds(arr) {
  const list = document.getElementById("adsList");
  if (!list) return;
  list.innerHTML = "";

  if (!arr || arr.length === 0) {
    list.innerHTML = "<p>Natija topilmadi.</p>";
    renderPaginationControls(0, 0, 0);
    return;
  }

  // pagination
  const totalItems = arr.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  if (CURRENT_PAGE < 1) CURRENT_PAGE = 1;
  if (CURRENT_PAGE > totalPages) CURRENT_PAGE = totalPages;

  const startIndex = (CURRENT_PAGE - 1) * PAGE_SIZE;
  const pageArr = arr.slice(startIndex, startIndex + PAGE_SIZE);

  // create cards
  const cards = await Promise.all(pageArr.map(a => createAdCard(a)));
  const frag = document.createDocumentFragment();
  cards.forEach(c => frag.appendChild(c));
  list.appendChild(frag);

  renderPaginationControls(totalPages, CURRENT_PAGE, totalItems);
}


// ==========================
// CARD CREATOR
// ==========================
async function createAdCard(ad) {
  const u = await getUserInfo(ad.userId);

  const div = document.createElement("div");
  div.className = "ad-card";
  div.setAttribute("data-ad-id", ad.id || "");

  const route =
    `${ad.fromRegion || ""}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → 
     ${ad.toRegion || ""}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;

  const depTime = formatTime(
    ad.departureTime || ad.startTime || ad.time || ad.date || ""
  );
  const created = formatTime(ad.createdAt || ad.created || ad.postedAt || "");

  let showNewBadge = false;
  if (ad.createdAt) {
    const t = new Date(ad.createdAt).getTime();
    if (Date.now() - t <= 24 * 3600 * 1000 && !isRead(ad.id)) {
      showNewBadge = true;
    }
  }

  // CAR APPEARS ONLY IF OWNER IS DRIVER
  let carText = "";
  try {
    const r = (u.role || "").toLowerCase();
    if (r.includes("haydov") || r.includes("driver")) {
      carText = u.carModel || ad.car || "";
    }
  } catch (e) {}

  div.innerHTML = `
    <img class="ad-avatar"
         src="${escapeHtml(u.avatar || "https://i.ibb.co/2W0z7Lx/user.png")}"
         alt="avatar">

    <div class="ad-main">
      <div class="ad-route">
        ${escapeHtml(route)}
        ${showNewBadge ? '<span class="ad-badge-new">Yangi</span>' : ""}
      </div>

      <div class="ad-car" style="color:#6b7280;font-size:13px;margin-top:6px;">
        ${escapeHtml(carText)}
      </div>

      <div class="ad-meta" style="margin-top:8px;">
        <div class="ad-chip">⏰ ${escapeHtml(depTime)}</div>
      </div>
    </div>

    <div class="ad-price">💰 ${escapeHtml(ad.price || "-")} so‘m</div>
    <div class="ad-created">${escapeHtml(created)}</div>
  `;

  div.onclick = () => openAdModal(ad);

  return div;
}


// ==========================
// MODAL OCHISH
// ==========================
async function openAdModal(ad) {
  let modal = document.getElementById("adFullModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "adFullModal";
    document.body.appendChild(modal);
  }

  const u = await getUserInfo(ad.userId);

  const route =
    `${ad.fromRegion || ""}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → 
     ${ad.toRegion || ""}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;

  const depTime = formatTime(
    ad.departureTime || ad.startTime || ad.time || ad.date || ""
  );
  const created = formatTime(ad.createdAt || ad.created || ad.postedAt || "");

  const fullname =
    u.fullName ||
    ((u.firstname || "") + " " + (u.lastname || "")).trim() ||
    "Foydalanuvchi";

  // Show car ONLY if owner is driver
  let carFull = "";
  try {
    const ownerRole = (u.role || "").toLowerCase();
    if (ownerRole.includes("haydov") || ownerRole.includes("driver")) {
      carFull =
        `${u.carModel || ""}${
          u.carColor ? " • " + u.carColor : ""
        }${u.carNumber ? " • " + u.carNumber : ""}`;
    }
  } catch (err) {}

  modal.innerHTML = `
    <div class="ad-modal-box" role="dialog" aria-modal="true">

      <div style="display:flex; gap:12px; margin-bottom:10px;">
        <img class="modal-avatar"
             src="${escapeHtml(u.avatar || "https://i.ibb.co/2W0z7Lx/user.png")}"
             alt="avatar" />

        <div>
          <div class="modal-name">${escapeHtml(fullname)}</div>
          <div class="modal-car" style="color:#6b7280">
            ${escapeHtml(carFull)}
          </div>
        </div>
      </div>

      <div class="modal-row">
        <div class="modal-col">
          <div class="label">Yo‘nalish</div>
          <div class="value">${escapeHtml(route)}</div>
        </div>
        <div class="modal-col" style="text-align:right">
          <div class="label">Jo‘nash</div>
          <div class="value">${escapeHtml(depTime)}</div>
        </div>
      </div>

      <div style="margin-top:12px">
        <div class="label">Izoh</div>
        <div class="value">${escapeHtml(ad.comment || "-")}</div>
      </div>

      <div style="margin-top:12px">
        <div class="label">Aloqa</div>
        <div class="value">${escapeHtml(u.phone || "-")}</div>
      </div>

      <div style="margin-top:12px; color:#88919a; font-size:13px;">
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
  document.getElementById("modalCallBtn").onclick = () =>
    onContact(u.phone || "");

  markAsRead(ad.id);
  updateBadgeForAd(ad.id);

  modal.onclick = e => {
    if (e.target === modal) closeAdModal();
  };
}


// ==========================
// MODAL YOPISH
// ==========================
function closeAdModal() {
  const modal = document.getElementById("adFullModal");
  if (!modal) return;
  modal.style.display = "none";
  modal.innerHTML = "";
}

function updateBadgeForAd(adId) {
  const n = document.querySelector(`.ad-card[data-ad-id="${escapeSelector(adId)}"] .ad-badge-new`);
  if (n) n.remove();
}

function onContact(phone) {
  if (!phone) return alert("Telefon raqami yo‘q!");
  window.location.href = `tel:${phone}`;
}


// ==========================
// PAGINATION
// ==========================
function renderPaginationControls(totalPages, currentPage, totalItems) {
  const container = document.getElementById("pagination");
  if (!container) return;
  container.innerHTML = "";

  if (totalPages <= 1) {
    container.innerHTML = `<div style="color:#6b7280;font-size:14px;">
      Ko‘rsatilyapti: ${totalItems}
    </div>`;
    return;
  }

  const makeBtn = (txt, disabled, fn) => {
    const b = document.createElement("button");
    b.textContent = txt;
    b.disabled = disabled;
    b.style = `
      padding:6px 10px;
      border-radius:8px;
      border:1px solid #e5e7eb;
      background:white;
      margin:0 4px;
      cursor:pointer;
    `;
    if (!disabled) b.onclick = fn;
    return b;
  };

  container.appendChild(makeBtn("« Birinchi", currentPage === 1, () => {
    CURRENT_PAGE = 1;
    scheduleRenderAds();
  }));

  container.appendChild(makeBtn("‹ Oldingi", currentPage === 1, () => {
    CURRENT_PAGE--;
    scheduleRenderAds();
  }));

  const windowSize = 5;
  let start = Math.max(1, currentPage - Math.floor(windowSize / 2));
  let end = Math.min(totalPages, start + windowSize - 1);
  if (end - start < windowSize - 1) start = Math.max(1, end - windowSize + 1);

  for (let p = start; p <= end; p++) {
    const btn = document.createElement("button");
    btn.textContent = p;
    btn.disabled = p === currentPage;

    btn.style = `
      padding:6px 10px;
      border-radius:8px;
      border:1px solid ${p === currentPage ? "#0069d9" : "#e5e7eb"};
      background:${p === currentPage ? "#0069d9" : "white"};
      color:${p === currentPage ? "white" : "#111"};
      margin:0 4px;
      cursor:pointer;
    `;

    if (p !== currentPage) {
      btn.onclick = () => {
        CURRENT_PAGE = p;
        scheduleRenderAds();
      };
    }

    container.appendChild(btn);
  }

  container.appendChild(makeBtn("Keyingi ›", currentPage === totalPages, () => {
    CURRENT_PAGE++;
    scheduleRenderAds();
  }));

  container.appendChild(makeBtn("Oxiri »", currentPage === totalPages, () => {
    CURRENT_PAGE = totalPages;
    scheduleRenderAds();
  }));

  const info = document.createElement("div");
  info.textContent = `Sahifa ${currentPage} / ${totalPages} — Jami: ${totalItems}`;
  info.style = "color:#6b7280;font-size:13px;margin-top:8px;";
  container.appendChild(info);
}
