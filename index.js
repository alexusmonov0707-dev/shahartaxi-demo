// index.js (to'liq, module)
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
//  NEW BADGE (localStorage) helpers
// ===============================
function markAsRead(adId) {
  try {
    const raw = localStorage.getItem("readAds") || "[]";
    const read = JSON.parse(raw);
    if (!read.includes(adId)) {
      read.push(adId);
      localStorage.setItem("readAds", JSON.stringify(read));
    }
  } catch (e) { /* ignore */ }
}

function isRead(adId) {
  try {
    const raw = localStorage.getItem("readAds") || "[]";
    const read = JSON.parse(raw);
    return read.includes(adId);
  } catch (e) { return false; }
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
  try {
    if (typeof val === "number") {
      return new Date(val).toLocaleString("uz-UZ", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    }
    if (typeof val === "string") {
      if (!isNaN(Date.parse(val))) {
        return new Date(val).toLocaleString("uz-UZ", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
      }
      const fix = val.replace(" ", "T");
      if (!isNaN(Date.parse(fix))) {
        return new Date(fix).toLocaleString("uz-UZ", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
      }
    }
    return String(val);
  } catch (e) {
    return String(val);
  }
}

// ===============================
//  GET USER INFO
// ===============================
async function getUserInfo(userId) {
  if (!userId) return { phone: "", avatar: "", fullName: "", role: "", carModel: "", carColor: "", carNumber: "", seatCount: 0 };
  try {
    const snap = await get(ref(db, "users/" + userId));
    if (!snap.exists()) return { phone: "", avatar: "", fullName: "", role: "", carModel: "", carColor: "", carNumber: "", seatCount: 0 };
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
    console.error("getUserInfo error:", err);
    return { phone: "", avatar: "", fullName: "", role: "", carModel: "", carColor: "", carNumber: "", seatCount: 0 };
  }
}

// ===============================
// GLOBALS
// ===============================
let ALL_ADS = []; // cached array of ad objects
let CURRENT_USER = null;
let __render_timeout = null;

// ===============================
// AUTH CHECK + INITIAL LOAD
// ===============================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  CURRENT_USER = await getUserInfo(user.uid);
  loadRouteFilters();
  // load ads once + attach realtime listener for live updates
  await loadAllAdsRealtime();
});

// ===============================
// LOAD Route Filters (from/to region + district checkboxes)
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

  // attach single-change handlers
  fromRegion.onchange = () => { fillFromDistricts(); scheduleRenderAds(); };
  toRegion.onchange = () => { fillToDistricts(); scheduleRenderAds(); };

  // set up search/sort/price handlers only once if elements exist
  const searchEl = document.getElementById("search");
  if (searchEl && !searchEl._attached) {
    searchEl.oninput = () => scheduleRenderAds();
    searchEl._attached = true;
  }
  const roleEl = document.getElementById("filterRole");
  if (roleEl && !roleEl._attached) {
    roleEl.onchange = () => scheduleRenderAds();
    roleEl._attached = true;
  }
  const sortEl = document.getElementById("sortBy");
  if (sortEl && !sortEl._attached) {
    sortEl.onchange = () => scheduleRenderAds();
    sortEl._attached = true;
  }
  const dateEl = document.getElementById("filterDate");
  if (dateEl && !dateEl._attached) {
    dateEl.onchange = () => scheduleRenderAds();
    dateEl._attached = true;
  }
  const pmin = document.getElementById("priceMin");
  if (pmin && !pmin._attached) {
    pmin.oninput = () => scheduleRenderAds();
    pmin._attached = true;
  }
  const pmax = document.getElementById("priceMax");
  if (pmax && !pmax._attached) {
    pmax.oninput = () => scheduleRenderAds();
    pmax._attached = true;
  }

  // init boxes
  fillFromDistricts();
  fillToDistricts();
}

function fillFromDistricts() {
  const region = (document.getElementById("fromRegion")?.value || "");
  const box = document.getElementById("fromDistrictBox");
  if (!box) return;
  box.innerHTML = "";
  if (!region || !REGIONS[region]) return;
  REGIONS[region].forEach(d => {
    box.insertAdjacentHTML("beforeend", `<label class="district-item"><input type="checkbox" class="fromDistrict" value="${escapeHtml(d)}"> ${escapeHtml(d)}</label>`);
  });
  box.querySelectorAll("input.fromDistrict").forEach(ch => ch.onchange = () => scheduleRenderAds());
}

function fillToDistricts() {
  const region = (document.getElementById("toRegion")?.value || "");
  const box = document.getElementById("toDistrictBox");
  if (!box) return;
  box.innerHTML = "";
  if (!region || !REGIONS[region]) return;
  REGIONS[region].forEach(d => {
    box.insertAdjacentHTML("beforeend", `<label class="district-item"><input type="checkbox" class="toDistrict" value="${escapeHtml(d)}"> ${escapeHtml(d)}</label>`);
  });
  box.querySelectorAll("input.toDistrict").forEach(ch => ch.onchange = () => scheduleRenderAds());
}

// ===============================
// LOAD ALL ADS (realtime)
// Uses onValue so when new ads are added you'll see them live
// ===============================
async function loadAllAdsRealtime() {
  const adsRef = ref(db, "ads");
  // initial fetch and then realtime update on change
  onValue(adsRef, snap => {
    const arr = [];
    snap.forEach(child => {
      const v = child.val();
      arr.push({ id: child.key, ...v, typeNormalized: normalizeType(v.type) });
    });
    // update cache & render
    ALL_ADS = arr;
    scheduleRenderAds();
  }, err => {
    console.error("Realtime ads listener error:", err);
  });
}

// ===============================
// RENDER ADS with all filters applied
// ===============================
async function renderAds(ads) {
  const list = document.getElementById("adsList");
  if (!list) return;
  // clear container (we'll append fresh)
  list.innerHTML = "";

  const q = (document.getElementById("search")?.value || "").toLowerCase();
  const roleFilter = normalizeType(document.getElementById("filterRole")?.value || "");
  const regionFilter = document.getElementById("filterRegion")?.value || "";

  const sortBy = document.getElementById("sortBy")?.value || "newest";
  const filterDate = document.getElementById("filterDate")?.value || "";

  // price inputs robustly handled
  const priceMinRaw = (document.getElementById("priceMin")?.value || "").toString().trim();
  const priceMaxRaw = (document.getElementById("priceMax")?.value || "").toString().trim();
  const isPriceMinSet = priceMinRaw !== "";
  const isPriceMaxSet = priceMaxRaw !== "";
  const priceMin = isPriceMinSet ? Number(priceMinRaw.replace(/\s+/g, "")) : null;
  const priceMax = isPriceMaxSet ? Number(priceMaxRaw.replace(/\s+/g, "")) : null;

  const currentUserId = auth.currentUser?.uid || null;

  // determine current role
  const currentRoleRaw = (CURRENT_USER?.role || "").toString().toLowerCase();
  let currentRole = "";
  if (currentRoleRaw.includes("driver") || currentRoleRaw.includes("haydov")) currentRole = "driver";
  else if (currentRoleRaw.includes("pass") || currentRoleRaw.includes("yo")) currentRole = "passenger";

  const fromRegion = document.getElementById("fromRegion")?.value || "";
  const toRegion = document.getElementById("toRegion")?.value || "";
  const fromDistricts = Array.from(document.querySelectorAll("#fromDistrictBox input.fromDistrict:checked")).map(x => x.value);
  const toDistricts = Array.from(document.querySelectorAll("#toDistrictBox input.toDistrict:checked")).map(x => x.value);

  // main filter pipeline
  let filtered = ads.filter(a => {
    if (!a || !a.id) return false;

    // automatic role flip
    if (currentRole === "driver") {
      if (!a.typeNormalized || !a.typeNormalized.toLowerCase().includes("yo")) return false;
    } else if (currentRole === "passenger") {
      if (!a.typeNormalized || !a.typeNormalized.toLowerCase().includes("haydov")) return false;
    }

    // explicit role filter
    if (roleFilter) {
      if (a.typeNormalized !== roleFilter) return false;
    }

    // hide own ads
    if (currentUserId && a.userId === currentUserId) return false;

    // top region filter (either from or to)
    if (regionFilter) {
      if (a.fromRegion !== regionFilter && a.toRegion !== regionFilter) return false;
    }

    // from region / districts
    if (fromRegion) {
      if (a.fromRegion !== fromRegion) return false;
    }
    if (fromDistricts.length > 0) {
      if (!fromDistricts.includes(a.fromDistrict)) return false;
    }

    // to region / districts
    if (toRegion) {
      if (a.toRegion !== toRegion) return false;
    }
    if (toDistricts.length > 0) {
      if (!toDistricts.includes(a.toDistrict)) return false;
    }

    // PRICE check robustly
    const adPrice = (a.price !== undefined && a.price !== null && a.price !== "") ? Number(a.price) : NaN;
    if (isPriceMinSet && isNaN(adPrice)) return false;
    if (isPriceMaxSet && isNaN(adPrice)) return false;
    if (isPriceMinSet && !isNaN(adPrice) && priceMin !== null && adPrice < priceMin) return false;
    if (isPriceMaxSet && !isNaN(adPrice) && priceMax !== null && adPrice > priceMax) return false;

    // HIDE EXPIRED: compute departureTime
    const departureRaw = a.departureTime || a.startTime || a.time || a.date || null;
    let departureTime = null;
    if (typeof departureRaw === "number") departureTime = new Date(departureRaw);
    else if (typeof departureRaw === "string" && departureRaw.trim() !== "") {
      const fix = departureRaw.replace(" ", "T");
      if (!isNaN(Date.parse(departureRaw))) departureTime = new Date(departureRaw);
      else if (!isNaN(Date.parse(fix))) departureTime = new Date(fix);
    }
    if (!departureTime) return false; // if no valid departure -> hide
    if (departureTime.getTime() < Date.now()) return false; // already passed -> hide

    // DATE filter (today/tomorrow/3days)
    if (filterDate) {
      const raw = departureRaw;
      let adTime = null;
      if (typeof raw === "number") adTime = new Date(raw);
      else if (typeof raw === "string" && raw.trim() !== "") {
        const tryFix = raw.replace(" ", "T");
        adTime = !isNaN(Date.parse(raw)) ? new Date(raw) : (!isNaN(Date.parse(tryFix)) ? new Date(tryFix) : null);
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

    // SEARCH
    const hay = [
      a.fromRegion, a.fromDistrict,
      a.toRegion, a.toDistrict,
      a.comment, a.price, a.type, a.carModel, a.userId
    ].join(" ").toLowerCase();
    if (!hay.includes(q)) return false;

    return true;
  });

  // DEDUPE by id (should eliminate double-card cases)
  const seen = new Set();
  filtered = filtered.filter(item => {
    if (!item || !item.id) return false;
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  if (!filtered.length) {
    list.innerHTML = "<p>Natija topilmadi.</p>";
    return;
  }

  // SORT
  filtered.sort((a, b) => {
    const ta = new Date(a.createdAt || a.created || a.postedAt || 0).getTime();
    const tb = new Date(b.createdAt || b.created || b.postedAt || 0).getTime();
    if (sortBy === "oldest") return ta - tb;
    return tb - ta; // newest
  });

  // create cards (fetch user info in parallel)
  const cards = await Promise.all(filtered.map(a => createAdCard(a)));
  cards.forEach(c => list.appendChild(c));
}

// ===============================
// CREATE AD CARD (mini)
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

  // NEW badge logic (24h)
  let isNew = false;
  if (createdRaw) {
    const parsed = new Date(createdRaw).getTime();
    if (!isNaN(parsed) && (Date.now() - parsed <= 24 * 60 * 60 * 1000) && !isRead(ad.id)) {
      isNew = true;
    }
  }

  const totalSeatsRaw = ad.totalSeats || ad.seatCount || ad.seats || null;
  const totalSeats = (totalSeatsRaw !== null && totalSeatsRaw !== undefined) ? Number(totalSeatsRaw) : null;
  const booked = Number(ad.bookedSeats || 0);
  const available = (typeof totalSeats === "number" && !isNaN(totalSeats)) ? Math.max(totalSeats - booked, 0) : null;
  const requestedRaw = ad.passengerCount || ad.requestedSeats || ad.requestSeats || ad.peopleCount || null;
  const requested = (requestedRaw !== null && requestedRaw !== undefined) ? Number(requestedRaw) : null;
  const carModel = u.carModel || (ad.car || "");

  div.innerHTML = `
    <img class="ad-avatar" src="${escapeHtml(u.avatar || "https://i.ibb.co/2W0z7Lx/user.png")}" alt="avatar">
    <div class="ad-main">
      <div class="ad-route">
        ${escapeHtml(route)}
        ${isNew ? '<span class="ad-badge-new" style="margin-left:8px;padding:4px 8px;border-radius:10px;background:#dbeafe;color:#034d9f;font-weight:600;font-size:12px;">Yangi</span>' : ''}
      </div>
      <div class="ad-car" style="color:#6b7280;font-size:13px;margin-top:6px">${escapeHtml(carModel)}</div>
      <div class="ad-meta" style="margin-top:8px">
        <div class="ad-chip">⏰ ${escapeHtml(depTime)}</div>
        ${
          totalSeats !== null
            ? `<div class="ad-chip">👥 ${escapeHtml(String(available))}/${escapeHtml(String(totalSeats))} bo‘sh</div>`
            : requested !== null
              ? `<div class="ad-chip">👥 ${escapeHtml(String(requested))} odam</div>`
              : `<div class="ad-chip">👥 -</div>`
        }
      </div>
    </div>
    <div class="ad-price">💰 ${escapeHtml(ad.price ? String(ad.price) : "-")} so‘m</div>
    <div class="ad-created">${escapeHtml(created)}</div>
  `;

  // modal open on click
  div.onclick = () => openAdModal(ad);

  return div;
}

// ===============================
// OPEN FULL MODAL (detailed)
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
            ${ totalSeats !== null ? `${escapeHtml(String(totalSeats))} ta (Bo‘sh: ${escapeHtml(String(available))})`
               : requested !== null ? `Talab: ${escapeHtml(String(requested))} odam` : "-" }
          </div>
        </div>
        <div class="modal-col" style="text-align:right">
          <div class="label">Narx</div>
          <div class="value">${escapeHtml(ad.price ? ad.price + " so‘m" : "-")}</div>
        </div>
      </div>
      <div style="margin-top:12px"><div class="label">Izoh</div><div class="value">${escapeHtml(ad.comment || "-")}</div></div>
      <div style="margin-top:12px"><div class="label">Kontakt</div><div class="value">${escapeHtml(u.phone || "-")}</div></div>
      <div style="margin-top:12px;color:#88919a;font-size:13px;">Joylashtirilgan: ${escapeHtml(created)}</div>
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

  // mark as read (so "yangi" badge disappears)
  if (ad.id) markAsRead(ad.id);
  scheduleRenderAds();

  modal.onclick = (e) => { if (e.target === modal) closeAdModal(); };
}

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

// expose
window.openAdModal = openAdModal;
window.closeAdModal = closeAdModal;
window.onContact = onContact;

// ===============================
// DEBOUNCE render
// ===============================
function scheduleRenderAds() {
  if (__render_timeout) clearTimeout(__render_timeout);
  __render_timeout = setTimeout(() => {
    renderAds(ALL_ADS).catch(e => console.error(e));
    __render_timeout = null;
  }, 120);
}

// when checkboxes change anywhere on page -> schedule
document.addEventListener("change", (e) => {
  if (!e.target) return;
  if (e.target.classList && (e.target.classList.contains("fromDistrict") || e.target.classList.contains("toDistrict"))) {
    scheduleRenderAds();
  }
});

// logout
window.logout = () => signOut(auth);
