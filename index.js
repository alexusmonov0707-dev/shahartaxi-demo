// index.js (final + smooth render + user cache + pagination)
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

// simple djb2 hash
function hashString(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) + str.charCodeAt(i);
    h = h & h;
  }
  return String(h >>> 0);
}

// ===============================
//  GET USER INFO
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
//  USER CACHE
// ===============================
const USER_CACHE = new Map();
const USER_CACHE_TTL = 1000 * 60 * 5;

async function getUserInfoCached(userId) {
  if (!userId) return getUserInfo(null);
  const now = Date.now();
  const cached = USER_CACHE.get(userId);
  if (cached && (now - cached.ts) < USER_CACHE_TTL && cached.data) {
    return cached.data;
  }
  const data = await getUserInfo(userId);
  USER_CACHE.set(userId, { data, ts: now });
  return data;
}

// ===============================
//  GLOBALS
// ===============================
const ADS_MAP = new Map();
let ALL_ADS_ARR = [];
let CURRENT_USER = null;
let useRealtime = true;

const PAGE_SIZE = 10;
let CURRENT_PAGE = 1;

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
//  REGION FILTER
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
//  RENDER ADS (full pipeline, respects all existing filters + pagination + smooth render)
// ===============================
async function renderAds(adsArr) {
  const list = document.getElementById("adsList");
  if (!list) return;

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

  // --- SMOOTH RENDER: reuse DOM nodes when possible ---
  await smoothRenderPage(list, pageSlice);

  // render pagination controls
  renderPaginationControls(totalPages, CURRENT_PAGE, totalItems);
}

// ===============================
//  SMOOTH RENDER: reuse nodes, update only changed cards
//  - listEl: container element
//  - pageSlice: array of ad objects (in desired order)
// ===============================
async function smoothRenderPage(listEl, pageSlice) {
  // build map of existing child nodes (only direct children that are .ad-card)
  const existingNodes = new Map();
  Array.from(listEl.querySelectorAll(".ad-card")).forEach(n => {
    const id = n.getAttribute("data-ad-id");
    if (id) existingNodes.set(id, n);
  });

  // desired order ids
  const desiredIds = pageSlice.map(a => a.id);

  // remove nodes that are in DOM but not part of desiredIds (this prevents leakage)
  Array.from(listEl.children).forEach(child => {
    if (!child.classList || !child.classList.contains("ad-card")) return;
    const aid = child.getAttribute("data-ad-id");
    if (!desiredIds.includes(aid)) {
      // remove extra
      child.remove();
      existingNodes.delete(aid);
    }
  });

  // prepare fragment
  const frag = document.createDocumentFragment();

  // process each ad in order: reuse node if hash equal, else create new
  for (const ad of pageSlice) {
    const id = ad.id;
    const str = JSON.stringify({
      id: ad.id,
      price: ad.price,
      fromRegion: ad.fromRegion, fromDistrict: ad.fromDistrict,
      toRegion: ad.toRegion, toDistrict: ad.toDistrict,
      departureTime: ad.departureTime,
      createdAt: ad.createdAt,
      bookedSeats: ad.bookedSeats,
      totalSeats: ad.totalSeats,
      comment: ad.comment,
      type: ad.type
    });
    const h = hashString(str);
    const existing = existingNodes.get(id);

    if (existing && existing.dataset.adHash === h) {
      // reuse as-is
      frag.appendChild(existing);
      existingNodes.delete(id); // consumed
      continue;
    }

    // create new node (async)
    const node = await createAdCard(ad);
    node.setAttribute("data-ad-id", id);
    node.dataset.adHash = h;
    frag.appendChild(node);
    // if an old version existed, remove it (it will be removed from DOM by earlier loop or here)
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    existingNodes.delete(id);
  }

  // Append fragment to list (this replaces the visible children in one operation)
  listEl.appendChild(frag);
}

// ===============================
//  CREATE CARD (uses cached user info)
// ===============================
async function createAdCard(ad) {
  // use cached user info to avoid repeated DB calls
  const u = await getUserInfoCached(ad.userId);

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

  const u = await getUserInfoCached(ad.userId);

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
  // also recalc hash so subsequent compare doesn't keep old cached hash
  // recompute hash from node's stored ad? We can't access ad here — force a small re-render for that ad when scheduleRenderAds runs next.
}

// contact helper
function onContact(phone) {
  if (!phone) return alert("Telefon raqami mavjud emas");
  window.location.href = `tel:${phone}`;
}
window.onContact = onContact;
// ===============================
//  SMOOTH RENDER: reuse nodes, update only changed cards
//  - listEl: container element
//  - pageSlice: array of ad objects (in desired order)
// ===============================
async function smoothRenderPage(listEl, pageSlice) {
  // build map of existing child nodes (only direct children that are .ad-card)
  const existingNodes = new Map();
  Array.from(listEl.querySelectorAll(".ad-card")).forEach(n => {
    const id = n.getAttribute("data-ad-id");
    if (id) existingNodes.set(id, n);
  });

  // desired order ids
  const desiredIds = pageSlice.map(a => a.id);

  // remove nodes that are in DOM but not part of desiredIds (this prevents leakage)
  Array.from(listEl.children).forEach(child => {
    if (!child.classList || !child.classList.contains("ad-card")) return;
    const aid = child.getAttribute("data-ad-id");
    if (!desiredIds.includes(aid)) {
      // remove extra
      child.remove();
      existingNodes.delete(aid);
    }
  });

  // prepare fragment
  const frag = document.createDocumentFragment();

  // process each ad in order: reuse node if hash equal, else create new
  for (const ad of pageSlice) {
    const id = ad.id;
    const str = JSON.stringify({
      id: ad.id,
      price: ad.price,
      fromRegion: ad.fromRegion, fromDistrict: ad.fromDistrict,
      toRegion: ad.toRegion, toDistrict: ad.toDistrict,
      departureTime: ad.departureTime,
      createdAt: ad.createdAt,
      bookedSeats: ad.bookedSeats,
      totalSeats: ad.totalSeats,
      comment: ad.comment,
      type: ad.type
    });
    const h = hashString(str);
    const existing = existingNodes.get(id);

    if (existing && existing.dataset.adHash === h) {
      // reuse as-is
      frag.appendChild(existing);
      existingNodes.delete(id); // consumed
      continue;
    }

    // create new node (async)
    const node = await createAdCard(ad);
    node.setAttribute("data-ad-id", id);
    node.dataset.adHash = h;
    frag.appendChild(node);
    // if an old version existed, remove it (it will be removed from DOM by earlier loop or here)
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    existingNodes.delete(id);
  }

  // Append fragment to list (this replaces the visible children in one operation)
  listEl.appendChild(frag);
}

// ===============================
//  CREATE CARD (uses cached user info)
// ===============================
async function createAdCard(ad) {
  // use cached user info to avoid repeated DB calls
  const u = await getUserInfoCached(ad.userId);

  const div = document.createElement("div");
  div.className = "ad-card";
  div.setAttribute("data-ad-id", ad.id || "");

  const route =
    `${ad.fromRegion || ""}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ${ad.toRegion || ""}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;

  const depTimeRaw = ad.departureTime || ad.startTime || ad.time || ad.date || "";
  const depTime = formatTime(depTimeRaw);
  const createdRaw = ad.createdAt || ad.created || ad.postedAt || "";
  const created = formatTime(createdRaw);

  // NEW badge logic: 24h window and not read
  let isNew = false;
  if (createdRaw) {
    try {
      const ct = new Date(createdRaw).getTime();
      if (!isNaN(ct) && (Date.now() - ct <= 24 * 60 * 60 * 1000) && !isRead(ad.id)) isNew = true;
    } catch (e) {}
  }

  const totalSeatsRaw = ad.totalSeats || ad.seatCount || ad.seats || null;
  const totalSeats = (totalSeatsRaw !== null && totalSeatsRaw !== undefined) ? Number(totalSeatsRaw) : null;
  const booked = Number(ad.bookedSeats || 0);
  const available = (typeof totalSeats === "number" && !isNaN(totalSeats)) 
    ? Math.max(totalSeats - booked, 0)
    : null;

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
            : (requested !== null
                ? `<div class="ad-chip">👥 ${escapeHtml(String(requested))} odam</div>`
                : `<div class="ad-chip">👥 -</div>`)
        }
      </div>
    </div>
    <div class="ad-price">💰 ${escapeHtml(ad.price ? String(ad.price) : "-")} so‘m</div>
    <div class="ad-created">${escapeHtml(created)}</div>
  `;

  div.onclick = () => openAdModal(ad);

  return div;
}

// ===============================
//  OPEN MODAL (marks ad as read)
// ===============================
async function openAdModal(ad) {
  let modal = document.getElementById("adFullModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "adFullModal";
    document.body.appendChild(modal);
  }

  const u = await getUserInfoCached(ad.userId);

  const route =
    `${ad.fromRegion || ""}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ${ad.toRegion || ""}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;

  const depTime = formatTime(ad.departureTime || ad.startTime || ad.time || ad.date || "");
  const created = formatTime(ad.createdAt || ad.created || ad.postedAt || "");

  const fullname =
    u.fullName ||
    ((u.firstname || u.lastname) ? `${u.firstname || ""} ${u.lastname || ""}`.trim() : "") ||
    "Foydalanuvchi";

  const carFull =
    `${u.carModel || ""}${u.carColor ? " • " + u.carColor : ""}${u.carNumber ? " • " + u.carNumber : ""}`;

  const totalSeatsRaw = ad.totalSeats || ad.seatCount || ad.seats || null;
  const totalSeats = (totalSeatsRaw !== null && totalSeatsRaw !== undefined) ? Number(totalSeatsRaw) : null;

  const booked = Number(ad.bookedSeats || 0);
  const available =
    (typeof totalSeats === "number" && !isNaN(totalSeats))
      ? Math.max(totalSeats - booked, 0)
      : null;

  const requestedRaw = ad.passengerCount || ad.requestedSeats || ad.requestSeats || ad.peopleCount || null;
  const requested = (requestedRaw !== null && requestedRaw !== undefined) ? Number(requestedRaw) : null;

  modal.innerHTML = `
    <div class="ad-modal-box">
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

  // mark as read
  try { markAsRead(ad.id); } catch (e) {}

  updateBadgeForAd(ad.id);

  modal.onclick = (e) => { if (e.target === modal) closeAdModal(); };
}
// ===============================
// PAGINATION CONTROLS RENDERING
// ===============================
function renderPaginationControls(totalPages = 0, currentPage = 0, totalItems = 0) {
  let container = document.getElementById("paginationControls");
  if (!container) {
    container = document.createElement("div");
    container.id = "paginationControls";
    container.style = "display:flex;align-items:center;gap:8px;margin-top:12px;justify-content:center;";
    const list = document.getElementById("adsList");
    if (list && list.parentNode) list.parentNode.insertBefore(container, list.nextSibling);
    else document.body.appendChild(container);
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
    b.style = "padding:6px 10px;border-radius:8px;border:1px solid #e5e7eb;background:white;cursor:pointer";
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
    pbtn.textContent = p.toString();
    pbtn.disabled = isCurrent;
    pbtn.style = `padding:6px 10px;border-radius:8px;border:1px solid ${isCurrent ? "#0069d9" : "#e5e7eb"};background:${isCurrent ? "#0069d9" : "white"};color:${isCurrent ? "white" : "#111"};cursor:pointer`;
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

// =======================================
// LOGOUT + WINDOW EXPOSURE (FINISHERS)
// =======================================
window.logout = () => signOut(auth);
window.openAdModal = openAdModal;
window.closeAdModal = closeAdModal;
window.onContact = onContact;

// ===============================
// END OF INDEX.JS
// ===============================
