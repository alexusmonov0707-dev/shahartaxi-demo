// index.js (to'liq, pagination + realtime + barcha filters)
// ===============================
//  FIREBASE INIT
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, get, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

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
//  NEW BADGE LOCAL STORAGE
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
// HELPERS
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

// ===============================
// GET USER INFO
// ===============================
async function getUserInfo(userId) {
  if (!userId) return { phone:"", avatar:"", fullName:"", role:"", carModel:"", carColor:"", carNumber:"", seatCount:0 };
  try {
    const snap = await get(ref(db, "users/" + userId));
    if (!snap.exists()) return { phone:"", avatar:"", fullName:"", role:"", carModel:"", carColor:"", carNumber:"", seatCount:0 };
    const u = snap.val();
    return {
      phone: u.phone || u.telephone || "",
      avatar: u.avatar || "",
      fullName: u.fullName || ((u.firstname||u.lastname) ? `${u.firstname||""} ${u.lastname||""}`.trim() : "") || u.name || "",
      role: (u.role || u.userRole || "").toString(),
      carModel: u.carModel || u.car || "",
      carColor: u.carColor || "",
      carNumber: u.carNumber || u.plate || "",
      seatCount: Number(u.seatCount || u.seats || 0)
    };
  } catch(err) {
    console.error("getUserInfo error", err);
    return { phone:"", avatar:"", fullName:"", role:"", carModel:"", carColor:"", carNumber:"", seatCount:0 };
  }
}

// ===============================
// GLOBALS & PAGINATION
// ===============================
let ALL_ADS = [];
let CURRENT_USER = null;
let useRealtime = true;

// Pagination
let PAGE = 1;
const PER_PAGE = 10;

// ===============================
// AUTH CHECK
// ===============================
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  CURRENT_USER = await getUserInfo(user.uid || user.userId);
  loadRouteFilters();
  await loadAllAds();
  if (useRealtime) attachRealtimeListener();
});

// ===============================
// LOAD Route Filters (from/to + district checkboxes)
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

  // attach once - when user changes region we populate districts and rerender
  fromRegion.onchange = () => { fillFromDistricts(); scheduleRenderAds(true); };
  toRegion.onchange   = () => { fillToDistricts(); scheduleRenderAds(true); };

  fillFromDistricts();
  fillToDistricts();
}

function fillFromDistricts() {
  const region = document.getElementById("fromRegion").value;
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
  box.querySelectorAll("input").forEach(ch => ch.onchange = () => scheduleRenderAds(true));
}

function fillToDistricts() {
  const region = document.getElementById("toRegion").value;
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
  box.querySelectorAll("input").forEach(ch => ch.onchange = () => scheduleRenderAds(true));
}

// ===============================
// LOAD ALL ADS (one-time fetch)
// ===============================
async function loadAllAds() {
  try {
    const snap = await get(ref(db, "ads"));
    const listEl = document.getElementById("adsList");
    if (!listEl) return;
    if (!snap.exists()) {
      ALL_ADS = [];
      listEl.innerHTML = "E’lon yo‘q.";
      return;
    }
    const arr = [];
    snap.forEach(child => {
      const v = child.val();
      arr.push({
        id: child.key,
        ...v,
        typeNormalized: normalizeType(v.type)
      });
    });

    // dedupe by id
    const m = new Map();
    arr.forEach(x => { if (x && x.id) m.set(x.id, x); });
    ALL_ADS = Array.from(m.values());

    attachInputHandlers();
    renderAds(ALL_ADS);
  } catch(err) {
    console.error("loadAllAds error", err);
  }
}

// ===============================
// Realtime listener (optional)
// ===============================
function attachRealtimeListener() {
  try {
    const r = ref(db, "ads");
    onValue(r, snap => {
      const arr = [];
      snap.forEach(child => {
        const v = child.val();
        arr.push({ id: child.key, ...v, typeNormalized: normalizeType(v.type) });
      });
      const m = new Map();
      arr.forEach(x => { if (x && x.id) m.set(x.id, x); });
      ALL_ADS = Array.from(m.values());
      // preserve PAGE when realtime updates; don't reset to 1
      scheduleRenderAds(false);
    }, err => {
      console.warn("realtime onValue error", err);
    });
  } catch(e) {
    console.warn("attachRealtimeListener failed", e);
  }
}

// ===============================
// attach input handlers once
// ===============================
function attachInputHandlers() {
  const searchEl = document.getElementById("search");
  const roleEl = document.getElementById("filterRole");
  const regionEl = document.getElementById("filterRegion");
  const fromRegionEl = document.getElementById("fromRegion");
  const toRegionEl = document.getElementById("toRegion");
  const sortByEl = document.getElementById("sortBy");
  const filterDateEl = document.getElementById("filterDate");
  const priceMinEl = document.getElementById("priceMin");
  const priceMaxEl = document.getElementById("priceMax");

  if (searchEl) searchEl.oninput = () => scheduleRenderAds(true);
  if (roleEl) roleEl.onchange = () => scheduleRenderAds(true);
  if (regionEl) regionEl.onchange = () => scheduleRenderAds(true);
  if (fromRegionEl) fromRegionEl.onchange = () => { fillFromDistricts(); scheduleRenderAds(true); };
  if (toRegionEl) toRegionEl.onchange   = () => { fillToDistricts(); scheduleRenderAds(true); };
  if (sortByEl) sortByEl.onchange = () => scheduleRenderAds(true);
  if (filterDateEl) filterDateEl.onchange = () => scheduleRenderAds(true);
  if (priceMinEl) priceMinEl.oninput = () => scheduleRenderAds(true);
  if (priceMaxEl) priceMaxEl.oninput = () => scheduleRenderAds(true);
}

// ===============================
// SLUGIFY
// ===============================
function slugify(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, "_").replace(/[^\w\-]/g, "");
}

// ===============================
// PAGINATION UI
// ===============================
function renderPagination(total) {
  const container = document.getElementById("pagination");
  if (!container) return;
  const totalPages = Math.ceil(total / PER_PAGE);
  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <button id="prevPage" ${PAGE <= 1 ? "disabled" : ""} style="margin-right:8px;padding:8px 10px">⬅ Oldingi</button>
    <span style="padding:0 12px;">${PAGE} / ${totalPages}</span>
    <button id="nextPage" ${PAGE >= totalPages ? "disabled" : ""} style="margin-left:8px;padding:8px 10px">Keyingi ➡</button>
  `;

  const prev = document.getElementById("prevPage");
  const next = document.getElementById("nextPage");
  if (prev) prev.onclick = () => { if (PAGE > 1) { PAGE--; scheduleRenderAds(false); } };
  if (next) next.onclick = () => { if (PAGE < totalPages) { PAGE++; scheduleRenderAds(false); } };
}

// ===============================
// RENDER ADS (MAIN ENGINE)
// ===============================
async function renderAds(ads) {
  const list = document.getElementById("adsList");
  if (!list) return;
  list.innerHTML = "";

  const q = (document.getElementById("search")?.value || "").toLowerCase();
  const roleFilter = normalizeType(document.getElementById("filterRole")?.value || "");
  const regionFilter = document.getElementById("filterRegion")?.value || "";
  const sortBy = document.getElementById("sortBy")?.value || "newest";
  const filterDate = document.getElementById("filterDate")?.value || "";

  // price inputs: treat empty as not set
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

  let filtered = (ads || []).filter(a => {
    if (!a) return false;

    // automatic role filter (driver sees passenger ads and vice versa)
    if (currentRole === "driver") {
      if (!a.typeNormalized || !a.typeNormalized.toLowerCase().includes("yo")) return false;
    } else if (currentRole === "passenger") {
      if (!a.typeNormalized || !a.typeNormalized.toLowerCase().includes("haydov")) return false;
    }

    // explicit role dropdown
    if (roleFilter) {
      if (a.typeNormalized !== roleFilter) return false;
    }

    // hide own ads
    if (currentUserId && a.userId === currentUserId) return false;

    // top region filter (either from or to)
    if (regionFilter) {
      if (a.fromRegion !== regionFilter && a.toRegion !== regionFilter) return false;
    }

    // from region/districts
    if (fromRegion && a.fromRegion !== fromRegion) return false;
    if (fromDistricts.length > 0 && !fromDistricts.includes(a.fromDistrict)) return false;

    // to region/districts
    if (toRegion && a.toRegion !== toRegion) return false;
    if (toDistricts.length > 0 && !toDistricts.includes(a.toDistrict)) return false;

    // PRICE filter (robust parsing)
    const adPrice = (a.price !== undefined && a.price !== null && a.price !== "") ? Number(String(a.price).replace(/\s+/g,"")) : NaN;
    if (isPriceMinSet && isNaN(adPrice)) return false; // user set min but ad has no price
    if (isPriceMaxSet && isNaN(adPrice)) return false; // user set max but ad has no price
    if (isPriceMinSet && !isNaN(adPrice) && adPrice < priceMin) return false;
    if (isPriceMaxSet && !isNaN(adPrice) && adPrice > priceMax) return false;

    // HIDE EXPIRED ADS (departure time)
    const departureRaw = a.departureTime || a.startTime || a.time || a.date || null;
    let departureTime = null;
    if (typeof departureRaw === "number") departureTime = new Date(departureRaw);
    else if (typeof departureRaw === "string" && departureRaw.trim() !== "") {
      const fixed = departureRaw.replace(" ", "T");
      if (!isNaN(Date.parse(departureRaw))) departureTime = new Date(departureRaw);
      else if (!isNaN(Date.parse(fixed))) departureTime = new Date(fixed);
    }
    // if no valid departureTime -> exclude (per requirement)
    if (!departureTime) return false;
    if (departureTime.getTime() < Date.now()) return false;

    // DATE filter
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

    // SEARCH matching
    const hay = [
      a.fromRegion, a.fromDistrict,
      a.toRegion, a.toDistrict,
      a.comment, a.price, a.type, a.carModel, a.userId
    ].join(" ").toLowerCase();
    if (!hay.includes(q)) return false;

    return true;
  });

  // DEDUPE by id (Map) to avoid duplicates
  const dedupe = new Map();
  filtered.forEach(x => { if (x && x.id) dedupe.set(x.id, x); });
  filtered = Array.from(dedupe.values());

  if (!filtered.length) {
    list.innerHTML = "<p>Natija topilmadi.</p>";
    // clear pagination
    renderPagination(0);
    return;
  }

  // SORT newest/oldest by createdAt (fallbacks)
  filtered.sort((a,b) => {
    const ta = new Date(a.createdAt || a.created || a.postedAt || 0).getTime();
    const tb = new Date(b.createdAt || b.created || b.postedAt || 0).getTime();
    return sortBy === "oldest" ? ta - tb : tb - ta;
  });

  // PAGINATION: ensure PAGE bounds
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  if (PAGE > totalPages) PAGE = totalPages;
  if (PAGE < 1) PAGE = 1;

  renderPagination(total);

  const start = (PAGE - 1) * PER_PAGE;
  const end = start + PER_PAGE;
  const pageAds = filtered.slice(start, end);

  // create cards only for page
  const cards = await Promise.all(pageAds.map(a => createAdCard(a)));

  // append via fragment to avoid reflow flicker
  const frag = document.createDocumentFragment();
  cards.forEach(c => frag.appendChild(c));
  list.appendChild(frag);
}

// ===============================
// CREATE AD CARD
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

  // NEW badge: created within 24h and not read
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

  div.onclick = () => openAdModal(ad);
  return div;
}

// ===============================
// OPEN MODAL
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

  // mark as read (so badge disappears) and refresh page without resetting page
  try { markAsRead(ad.id); } catch(e) {}
  scheduleRenderAds(false);

  modal.onclick = (e) => { if (e.target === modal) closeAdModal(); };
}

// ===============================
// CLOSE MODAL
// ===============================
function closeAdModal() {
  const modal = document.getElementById("adFullModal");
  if (!modal) return;
  modal.style.display = "none";
  modal.innerHTML = "";
}

function onContact(phone) {
  if (!phone) return alert("Telefon raqami mavjud emas");
  window.location.href = `tel:${phone}`;
}

window.openAdModal = openAdModal;
window.closeAdModal = closeAdModal;
window.onContact = onContact;

// ===============================
// DEBOUNCE + scheduleRenderAds(reset = true)
// ===============================
let __render_timeout = null;
function scheduleRenderAds(reset = true) {
  if (__render_timeout) clearTimeout(__render_timeout);
  __render_timeout = setTimeout(() => {
    if (reset) PAGE = 1;
    renderAds(ALL_ADS);
    __render_timeout = null;
  }, 120);
}

// listen for district checkbox changes globally (keeps single listener)
document.addEventListener("change", (e) => {
  if (!e.target) return;
  if (e.target.classList && (e.target.classList.contains("fromDistrict") || e.target.classList.contains("toDistrict"))) {
    scheduleRenderAds(true);
  }
});

// ===============================
// LOGOUT
// ===============================
window.logout = () => signOut(auth);

// End of file
