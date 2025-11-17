// ===============================
//  FIREBASE INIT
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

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
//  REGIONS DATA
// ===============================
const REGIONS = window.regionsData || window.regions || {};


// ===============================
//  NEW BADGE LOCAL STORAGE
// ===============================
function markAsRead(adId) {
  let read = JSON.parse(localStorage.getItem("readAds") || "[]");
  if (!read.includes(adId)) {
    read.push(adId);
    localStorage.setItem("readAds", JSON.stringify(read));
  }
}

function isRead(adId) {
  let read = JSON.parse(localStorage.getItem("readAds") || "[]");
  return read.includes(adId);
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
  t = String(t).trim().toLowerCase().replace(/[‘’`ʼ']/g, "'");
  if (t.includes("haydov")) return "Haydovchi";
  if (t.includes("yo") && t.includes("lov")) return "Yo‘lovchi";
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
    } catch { return String(val); }
  }

  if (typeof val === "string") {
    if (!isNaN(Date.parse(val)))
      return new Date(val).toLocaleString("uz-UZ", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit"
      });

    const fix = val.replace(" ", "T");
    if (!isNaN(Date.parse(fix)))
      return new Date(fix).toLocaleString("uz-UZ", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit"
      });
  }

  return String(val);
}


// ===============================
//  GET USER INFO
// ===============================
async function getUserInfo(userId) {
  if (!userId)
    return { phone: "", avatar: "", fullName: "", role: "", carModel: "", carColor: "", carNumber: "", seatCount: 0 };

  try {
    const snap = await get(ref(db, "users/" + userId));
    if (!snap.exists())
      return { phone: "", avatar: "", fullName: "", role: "", carModel: "", carColor: "", carNumber: "", seatCount: 0 };

    const u = snap.val();
    return {
      phone: u.phone || u.telephone || "",
      avatar: u.avatar || "",
      fullName:
        u.fullName ||
        ((u.firstname || u.lastname)
          ? `${u.firstname || ""} ${u.lastname || ""}`.trim()
          : "") ||
        u.name || "",
      role: (u.role || u.userRole || "").toString(),
      carModel: u.carModel || u.car || "",
      carColor: u.carColor || "",
      carNumber: u.carNumber || u.plate || "",
      seatCount: Number(u.seatCount || u.seats || 0)
    };
  } catch {
    return { phone: "", avatar: "", fullName: "", role: "", carModel: "", carColor: "", carNumber: "", seatCount: 0 };
  }
}


// ===============================
// GLOBALS
// ===============================
let ALL_ADS = [];
let CURRENT_USER = null;

let CURRENT_PAGE = 1;
const ADS_PER_PAGE = 10;


// ===============================
// AUTH CHECK
// ===============================
onAuthStateChanged(auth, async (user) => {
  if (!user) return (window.location.href = "login.html");

  CURRENT_USER = await getUserInfo(user.uid);

  loadRouteFilters();
  await loadAllAds();
});
// ===============================
// LOAD Route Filters
// ===============================
function loadRouteFilters() {
  const fromRegion = document.getElementById("fromRegion");
  const toRegion = document.getElementById("toRegion");

  fromRegion.innerHTML = '<option value="">Viloyat</option>';
  toRegion.innerHTML = '<option value="">Viloyat</option>';

  Object.keys(REGIONS).forEach(region => {
    fromRegion.innerHTML += `<option value="${region}">${region}</option>`;
    toRegion.innerHTML += `<option value="${region}">${region}</option>`;
  });

  fromRegion.onchange = () => { fillFromDistricts(); resetPage(); };
  toRegion.onchange = () => { fillToDistricts(); resetPage(); };

  fillFromDistricts();
  fillToDistricts();
}


// ===============================
// DISTRICTS
// ===============================
function fillFromDistricts() {
  const region = fromRegion.value;
  const box = document.getElementById("fromDistrictBox");
  box.innerHTML = "";

  if (!REGIONS[region]) return;

  REGIONS[region].forEach(d => {
    box.innerHTML += `
      <label class="district-item">
        <input type="checkbox" class="fromDistrict" value="${d}">
        ${d}
      </label>`;
  });

  box.querySelectorAll("input").forEach(ch =>
    ch.onchange = () => resetPage()
  );
}

function fillToDistricts() {
  const region = toRegion.value;
  const box = document.getElementById("toDistrictBox");
  box.innerHTML = "";

  if (!REGIONS[region]) return;

  REGIONS[region].forEach(d => {
    box.innerHTML += `
      <label class="district-item">
        <input type="checkbox" class="toDistrict" value="${d}">
        ${d}
      </label>`;
  });

  box.querySelectorAll("input").forEach(ch =>
    ch.onchange = () => resetPage()
  );
}


// ===============================
// LOAD ALL ADS
// ===============================
async function loadAllAds() {
  const snap = await get(ref(db, "ads"));
  if (!snap.exists()) {
    ALL_ADS = [];
    return (document.getElementById("adsList").innerHTML = "E’lon yo‘q.");
  }

  const arr = [];
  snap.forEach(c => {
    const v = c.val();
    arr.push({
      id: c.key,
      ...v,
      typeNormalized: normalizeType(v.type)
    });
  });

  ALL_ADS = arr;

  attachFilterEvents();
  renderAds(ALL_ADS);
}


// ===============================
// FILTER EVENTS
// ===============================
function attachFilterEvents() {
  const ev = ["search","filterRole","sortBy","filterDate","priceMin","priceMax"];

  ev.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.oninput = el.onchange = () => resetPage();
  });
}

function resetPage() {
  CURRENT_PAGE = 1;
  renderAds(ALL_ADS);
}


// ===============================
// MAIN FILTER ENGINE + PAGINATION
// ===============================
async function renderAds(ads) {
  const list = document.getElementById("adsList");
  list.innerHTML = "";

  const q = search.value.toLowerCase();
  const roleFilter = normalizeType(filterRole.value);
  const regionFilter = ""; // YOU REMOVED IT IN HTML

  const sortBy = sortByEl.value;
  const filterDateVal = filterDate.value;

  const pMin = priceMin.value.trim();
  const pMax = priceMax.value.trim();

  const fromReg = fromRegion.value;
  const toReg = toRegion.value;

  const fromDist = [...document.querySelectorAll(".fromDistrict:checked")].map(x => x.value);
  const toDist   = [...document.querySelectorAll(".toDistrict:checked")].map(x => x.value);

  const uid = auth.currentUser?.uid;

  const roleRaw = (CURRENT_USER?.role || "").toLowerCase();
  let currentRole = "";
  if (roleRaw.includes("haydov") || roleRaw.includes("driver")) currentRole = "driver";
  if (roleRaw.includes("yo")     || roleRaw.includes("pass"))  currentRole = "passenger";

  let filtered = ads.filter(a => {
    if (!a) return false;

    // opposite role only
    if (currentRole === "driver" && !a.typeNormalized.includes("Yo‘")) return false;
    if (currentRole === "passenger" && !a.typeNormalized.includes("Hay")) return false;

    if (roleFilter && a.typeNormalized !== roleFilter) return false;
    if (uid && a.userId === uid) return false;

    if (fromReg && a.fromRegion !== fromReg) return false;
    if (fromDist.length && !fromDist.includes(a.fromDistrict)) return false;

    if (toReg && a.toRegion !== toReg) return false;
    if (toDist.length && !toDist.includes(a.toDistrict)) return false;

    // PRICE
    const adPrice = Number(a.price);
    if (pMin !== "" && adPrice < Number(pMin)) return false;
    if (pMax !== "" && adPrice > Number(pMax)) return false;

    // EXPIRED ADS HIDE
    const raw = a.departureTime || a.startTime || a.time || a.date;
    let dep = null;

    if (typeof raw === "number") dep = new Date(raw);
    else if (typeof raw === "string") {
      const fix = raw.replace(" ", "T");
      dep = !isNaN(Date.parse(raw)) ? new Date(raw) :
            (!isNaN(Date.parse(fix)) ? new Date(fix) : null);
    }

    if (!dep) return false;
    if (dep.getTime() < Date.now()) return false;

    // DATE FILTER
    if (filterDateVal) {
      const now = new Date();
      if (filterDateVal === "today") {
        if (dep.toDateString() !== now.toDateString()) return false;
      } else if (filterDateVal === "tomorrow") {
        const t = new Date(now); t.setDate(t.getDate() + 1);
        if (dep.toDateString() !== t.toDateString()) return false;
      } else if (filterDateVal === "3days") {
        const diff = dep.getTime() - now.getTime();
        if (diff < 0 || diff > 259200000) return false;
      }
    }

    const hay = `${a.fromRegion} ${a.fromDistrict} ${a.toRegion} ${a.toDistrict} ${a.comment} ${a.price} ${a.type} ${a.carModel}`.toLowerCase();
    if (!hay.includes(q)) return false;

    return true;
  });

  // REMOVE DUPLICATES
  filtered = filtered.filter((v, i, arr) => arr.findIndex(x => x.id === v.id) === i);

  // SORT
  filtered.sort((a,b) => {
    const ta = new Date(a.createdAt || a.created || a.postedAt || 0).getTime();
    const tb = new Date(b.createdAt || b.created || b.postedAt || 0).getTime();
    return sortBy === "newest" ? tb - ta : ta - tb;
  });

  // PAGINATION
  const start = (CURRENT_PAGE - 1) * ADS_PER_PAGE;
  const pageItems = filtered.slice(start, start + ADS_PER_PAGE);

  renderPagination(filtered.length);

  const cards = await Promise.all(pageItems.map(a => createAdCard(a)));
  cards.forEach(c => list.appendChild(c));
}


// ===============================
// PAGINATION UI
// ===============================
function renderPagination(total) {
  const box = document.getElementById("paginationBox");
  const pages = Math.ceil(total / ADS_PER_PAGE);

  if (pages <= 1) return box.innerHTML = "";

  box.innerHTML = `
    <button onclick="goPage(${CURRENT_PAGE-1})" ${CURRENT_PAGE===1?"disabled":""}>⬅ Oldingi</button>
    <span>${CURRENT_PAGE} / ${pages}</span>
    <button onclick="goPage(${CURRENT_PAGE+1})" ${CURRENT_PAGE===pages?"disabled":""}>Keyingi ➡</button>
  `;
}

window.goPage = (p) => {
  CURRENT_PAGE = p;
  renderAds(ALL_ADS);
  window.scrollTo({ top: 0, behavior: "smooth" });
};
// ===============================
// CREATE CARD
// ===============================
async function createAdCard(ad) {
  const u = await getUserInfo(ad.userId);

  const div = document.createElement("div");
  div.className = "ad-card";
  div.dataset.adId = ad.id;

  const route = `${ad.fromRegion}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ${ad.toRegion}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;

  const dep = formatTime(ad.departureTime || ad.startTime || ad.time || ad.date || "");
  const createdRaw = ad.createdAt || ad.created || ad.postedAt || "";
  const created = formatTime(createdRaw);

  let isNew = false;
  if (createdRaw) {
    const ct = new Date(createdRaw).getTime();
    if (Date.now() - ct <= 86400000 && !isRead(ad.id)) isNew = true;
  }

  const carModel = u.carModel || ad.car || "";

  div.innerHTML = `
    <img class="ad-avatar" src="${escapeHtml(u.avatar || 'https://i.ibb.co/2W0z7Lx/user.png')}">

    <div class="ad-main">

      <div class="ad-route">
        ${escapeHtml(route)}
        ${isNew ? '<span class="ad-badge-new">Yangi</span>' : ""}
      </div>

      <div class="ad-car">${escapeHtml(carModel)}</div>

      <div class="ad-meta">
        <div class="ad-chip">⏰ ${escapeHtml(dep)}</div>
      </div>

    </div>

    <div class="ad-price">💰 ${escapeHtml(ad.price)} so‘m</div>
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

  const route = `${ad.fromRegion}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ${ad.toRegion}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;

  modal.innerHTML = `
    <div class="ad-modal-box">

      <div class="modal-header">
        <img class="modal-avatar" src="${escapeHtml(u.avatar || 'https://i.ibb.co/2W0z7Lx/user.png')}">
        <div>
          <div class="modal-name">${escapeHtml(u.fullName)}</div>
          <div class="modal-car">${escapeHtml(u.carModel || "")}</div>
        </div>
      </div>

      <div class="modal-row">
        <div class="modal-col">
          <div class="label">Yo‘nalish</div>
          <div class="value">${escapeHtml(route)}</div>
        </div>
        <div class="modal-col">
          <div class="label">Jo‘nash</div>
          <div class="value">${formatTime(ad.departureTime || ad.time || "")}</div>
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

      <div class="modal-actions">
        <button id="modalCloseBtn" class="btn-primary">Yopish</button>
        <button id="modalCallBtn" class="btn-ghost">Qo‘ng‘iroq</button>
      </div>

    </div>
  `;

  // Mark as read
  markAsRead(ad.id);
  scheduleRenderAds();

  modal.style.display = "flex";

  document.getElementById("modalCloseBtn").onclick = closeAdModal;
  document.getElementById("modalCallBtn").onclick = () => onContact(u.phone);
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
  window.location.href = `tel:${phone}`;
}


// ===============================
// DEBOUNCE
// ===============================
let __rt = null;
function scheduleRenderAds() {
  if (__rt) clearTimeout(__rt);
  __rt = setTimeout(() => { renderAds(ALL_ADS); __rt = null; }, 120);
}

window.logout = () => signOut(auth);
