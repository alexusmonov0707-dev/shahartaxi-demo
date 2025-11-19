// ===============================
//  FIREBASE INIT + IMPORTS
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
//  NEW BADGE LOCAL STORAGE
// ===============================
function markAsRead(id) {
  if (!id) return;
  let arr = [];
  try { arr = JSON.parse(localStorage.getItem("readAds") || "[]"); } catch(e){}
  if (!arr.includes(id)) {
    arr.push(id);
    localStorage.setItem("readAds", JSON.stringify(arr));
  }
}
function isRead(id) {
  try {
    const arr = JSON.parse(localStorage.getItem("readAds") || "[]");
    return arr.includes(id);
  } catch(e){ return false; }
}

// ===============================
//  HELPERS
// ===============================
function escapeHtml(str) {
  if (str === 0) return "0";
  if (!str && str !== 0) return "";
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function normalizeType(t) {
  if (!t) return "";
  t = t.toLowerCase().trim().replace(/[‘’`ʼ']/g,"'");
  if (t.includes("haydov")) return "Haydovchi";
  if (t.includes("yo") && t.includes("lov")) return "Yo‘lovchi";
  if (t === "yo'lovchi") return "Yo‘lovchi";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function formatTime(val) {
  if (!val) return "—";
  if (!isNaN(Date.parse(val))) {
    return new Date(val).toLocaleString("uz-UZ",{
      year:"numeric", month:"2-digit", day:"2-digit",
      hour:"2-digit", minute:"2-digit"
    });
  }
  const fix = val.replace(" ","T");
  if (!isNaN(Date.parse(fix))) {
    return new Date(fix).toLocaleString("uz-UZ",{
      year:"numeric", month:"2-digit", day:"2-digit",
      hour:"2-digit", minute:"2-digit"
    });
  }
  return String(val);
}

function escapeSelector(s) {
  return String(s||"").replace(/([ #;?%&,.+*~\':"!^$[\]()=>|\/@])/g,'\\$1');
}

// ===============================
//  GET USER INFO
// ===============================
async function getUserInfo(uid) {
  if (!uid) return {
    phone:"",avatar:"",fullName:"",role:"",
    carModel:"",carColor:"",carNumber:"",seatCount:0
  };
  try {
    const snap = await get(ref(db,"users/"+uid));
    if (!snap.exists()) return {
      phone:"",avatar:"",fullName:"",role:"",
      carModel:"",carColor:"",carNumber:"",seatCount:0
    };

    const u = snap.val();
    return {
      phone: u.phone || u.telephone || "",
      avatar: u.avatar || "",
      fullName:
        u.fullName ||
        ((u.firstname || u.lastname) ? `${u.firstname||""} ${u.lastname||""}`.trim() : "") ||
        u.name || "",
      role: (u.role || u.userRole || "").toString(),
      carModel: u.carModel || u.car || "",
      carColor: u.carColor || "",
      carNumber: u.carNumber || u.plate || "",
      seatCount: Number(u.seatCount || u.seats || 0)
    };
  } catch(err){ return {
    phone:"",avatar:"",fullName:"",role:"",
    carModel:"",carColor:"",carNumber:"",seatCount:0
  }; }
}

// ===============================
//  GLOBALS
// ===============================
const ADS_MAP = new Map();
let ALL_ADS_ARR = [];
let CURRENT_USER = null;
let CURRENT_PAGE = 1;
let PAGE_SIZE = 10;

// ===============================
//  AUTH
// ===============================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  CURRENT_USER = await getUserInfo(user.uid);

  loadRegionsFilter();
  loadRouteFilters();

  await initialLoadAds();
  attachRealtimeHandlers();
});

// ===============================
//  REGION FILTER (top)
// ===============================
function loadRegionsFilter() {
  const el = document.getElementById("filterRegion");
  if (!el) return;
  el.innerHTML = '<option value="">Viloyat (filter)</option>';
  Object.keys(REGIONS).forEach(r=>{
    el.insertAdjacentHTML("beforeend",
      `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`
    );
  });
}

// ===============================
// ROUTE FILTERS
// ===============================
function loadRouteFilters() {
  const fr = document.getElementById("fromRegion");
  const tr = document.getElementById("toRegion");
  if (!fr || !tr) return;

  fr.innerHTML = '<option value="">Viloyat</option>';
  tr.innerHTML = '<option value="">Viloyat</option>';

  Object.keys(REGIONS).forEach(region=>{
    const opt = `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`;
    fr.insertAdjacentHTML("beforeend", opt);
    tr.insertAdjacentHTML("beforeend", opt);
  });

  fr.onchange = () => { fillFromDistricts(); CURRENT_PAGE=1; scheduleRenderAds(); };
  tr.onchange = () => { fillToDistricts(); CURRENT_PAGE=1; scheduleRenderAds(); };

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
  REGIONS[region].forEach(d=>{
    box.insertAdjacentHTML("beforeend",
      `<label class="district-item">
         <input type="checkbox" class="fromDistrict" value="${escapeHtml(d)}">
         ${escapeHtml(d)}
       </label>`
    );
  });
  box.querySelectorAll("input").forEach(ch=>{
    ch.onchange = () => { CURRENT_PAGE=1; scheduleRenderAds(); };
  });
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
  REGIONS[region].forEach(d=>{
    box.insertAdjacentHTML("beforeend",
      `<label class="district-item">
         <input type="checkbox" class="toDistrict" value="${escapeHtml(d)}">
         ${escapeHtml(d)}
       </label>`
    );
  });
  box.querySelectorAll("input").forEach(ch=>{
    ch.onchange = () => { CURRENT_PAGE=1; scheduleRenderAds(); };
  });
}

// ===============================
// INITIAL LOAD
// ===============================
async function initialLoadAds() {
  const snap = await get(ref(db,"ads"));
  ADS_MAP.clear();
  if (snap.exists()) {
    snap.forEach(ch=>{
      const v = ch.val();
      ADS_MAP.set(ch.key, {...v, id:ch.key, typeNormalized: normalizeType(v.type)});
    });
  }
  ALL_ADS_ARR = Array.from(ADS_MAP.values());

  attachInputsOnce();
  scheduleRenderAds();
}

// ===============================
// REALTIME HANDLERS
// ===============================
function attachRealtimeHandlers() {
  const r = ref(db,"ads");

  onChildAdded(r,(snap)=>{
    const v = snap.val();
    if (!v) return;
    ADS_MAP.set(snap.key, {...v, id:snap.key, typeNormalized: normalizeType(v.type)});
    ALL_ADS_ARR = Array.from(ADS_MAP.values());
    scheduleRenderAds();
  });

  onChildChanged(r,(snap)=>{
    const v = snap.val();
    ADS_MAP.set(snap.key, {...v, id:snap.key, typeNormalized: normalizeType(v.type)});
    ALL_ADS_ARR = Array.from(ADS_MAP.values());
    scheduleRenderAds();
  });

  onChildRemoved(r,(snap)=>{
    ADS_MAP.delete(snap.key);
    ALL_ADS_ARR = Array.from(ADS_MAP.values());
    scheduleRenderAds();
  });
}

// ===============================
// INPUT HANDLERS (debounced)
// ===============================
let inputsAttached = false;
function attachInputsOnce() {
  if (inputsAttached) return;
  inputsAttached = true;

  const events = ["search","filterRole","filterRegion","sortBy",
    "filterDate","priceMin","priceMax","fromRegion","toRegion"];

  events.forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.oninput = el.onchange = () => {
      CURRENT_PAGE = 1;
      scheduleRenderAds();
    };
  });
}

// ===============================
// SCHEDULE RENDER (smooth filter)
// ===============================
let __rt=null;
function scheduleRenderAds() {
  const list = document.getElementById("adsList");
  if (list) list.style.opacity = "0.3";

  if (__rt) clearTimeout(__rt);
  __rt = setTimeout(()=>{
    renderAds(Array.from(ADS_MAP.values())).then(()=>{
      if (list) list.style.opacity = "1";
    });
    __rt=null;
  },120);
}
// ===============================
//  RENDER ADS (FILTER + SORT + PAGINATION)
// ===============================
async function renderAds(adsArr) {
  const list = document.getElementById("adsList");
  if (!list) return;
  list.innerHTML = "";

  // =============== FILTER VALUES ===============
  const q = (document.getElementById("search")?.value || "").toLowerCase();
  const roleFilter = normalizeType(document.getElementById("filterRole")?.value || "");
  const regionFilter = document.getElementById("filterRegion")?.value || "";

  const sortBy = document.getElementById("sortBy")?.value || "newest";
  const filterDate = document.getElementById("filterDate")?.value || "";

  // PRICE
  const priceMinInput = (document.getElementById("priceMin")?.value || "").trim();
  const priceMaxInput = (document.getElementById("priceMax")?.value || "").trim();
  const isMin = priceMinInput !== "";
  const isMax = priceMaxInput !== "";
  const priceMin = isMin ? Number(priceMinInput.replace(/\s+/g,"")) : null;
  const priceMax = isMax ? Number(priceMaxInput.replace(/\s+/g,"")) : null;

  // ROUTE
  const fromRegion = document.getElementById("fromRegion")?.value || "";
  const toRegion = document.getElementById("toRegion")?.value || "";

  const fromDistricts = Array
      .from(document.querySelectorAll("#fromDistrictBox .fromDistrict:checked"))
      .map(x => x.value);

  const toDistricts = Array
      .from(document.querySelectorAll("#toDistrictBox .toDistrict:checked"))
      .map(x => x.value);

  const userId = auth.currentUser?.uid || null;

  // Auto role: driver sees passengers, passenger sees drivers
  const rawRole = (CURRENT_USER?.role || "").toLowerCase();
  let currentRole = "";
  if (rawRole.includes("haydov")) currentRole = "driver";
  if (rawRole.includes("yo")) currentRole = "passenger";

  // ===============================
  //        FILTER PIPELINE
  // ===============================
  let filtered = adsArr.filter(a=>{
    if (!a) return false;

    // auto role filter
    if (currentRole === "driver") {
      if (!a.typeNormalized.toLowerCase().includes("yo")) return false;
    }
    if (currentRole === "passenger") {
      if (!a.typeNormalized.toLowerCase().includes("haydov")) return false;
    }

    // dropdown role
    if (roleFilter && a.typeNormalized !== roleFilter) return false;

    // hide own ads
    if (userId && a.userId === userId) return false;

    // top region filter
    if (regionFilter) {
      if (a.fromRegion !== regionFilter && a.toRegion !== regionFilter) return false;
    }

    // from
    if (fromRegion && a.fromRegion !== fromRegion) return false;
    if (fromDistricts.length && !fromDistricts.includes(a.fromDistrict)) return false;

    // to
    if (toRegion && a.toRegion !== toRegion) return false;
    if (toDistricts.length && !toDistricts.includes(a.toDistrict)) return false;

    // PRICE
    const adPrice = a.price ? Number(String(a.price).replace(/\s+/g,"")) : NaN;
    if (isMin && !isNaN(adPrice) && adPrice < priceMin) return false;
    if (isMax && !isNaN(adPrice) && adPrice > priceMax) return false;
    if ((isMin || isMax) && isNaN(adPrice)) return false;

    // EXPIRED — hide
    const raw = a.departureTime || a.startTime || a.time || a.date;
    let dep = null;
    if (raw) {
      const fix = raw.replace(" ","T");
      dep = !isNaN(Date.parse(raw)) ? new Date(raw) :
            !isNaN(Date.parse(fix)) ? new Date(fix) : null;
    }
    if (!dep || dep.getTime() < Date.now()) return false;

    // DATE FILTER
    if (filterDate && dep) {
      const now = new Date();

      if (filterDate === "today") {
        if (dep.toDateString() !== now.toDateString()) return false;
      }
      else if (filterDate === "tomorrow") {
        const t = new Date(now); t.setDate(t.getDate()+1);
        if (dep.toDateString() !== t.toDateString()) return false;
      }
      else if (filterDate === "3days") {
        const diff = dep.getTime() - now.getTime();
        if (diff < 0 || diff > 3*24*60*60*1000) return false;
      }
    }

    // SEARCH
    const hay = [
      a.fromRegion, a.fromDistrict,
      a.toRegion, a.toDistrict,
      a.comment, a.price, a.type
    ].join(" ").toLowerCase();

    if (!hay.includes(q)) return false;

    return true;
  });

  // remove duplicates forcibly
  const m = new Map();
  filtered.forEach(a => m.set(a.id, a));
  filtered = Array.from(m.values());

  // ===============================
  //            SORT
  // ===============================
  filtered.sort((a,b)=>{
    const ta = new Date(a.createdAt || a.created || a.postedAt || 0).getTime();
    const tb = new Date(b.createdAt || b.created || b.postedAt || 0).getTime();
    return sortBy === "oldest" ? (ta - tb) : (tb - ta);
  });

  // ===============================
  //          PAGINATION
  // ===============================
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  if (CURRENT_PAGE > totalPages) CURRENT_PAGE = totalPages;
  if (CURRENT_PAGE < 1) CURRENT_PAGE = 1;

  const start = (CURRENT_PAGE - 1) * PAGE_SIZE;
  const slice = filtered.slice(start, start + PAGE_SIZE);

  if (slice.length === 0) {
    list.innerHTML = "<p>Natija topilmadi.</p>";
    renderPaginationControls(0,0);
    return;
  }

  // render each card in parallel
  const cards = await Promise.all(slice.map(x => createAdCard(x)));
  const frag = document.createDocumentFragment();
  cards.forEach(c => frag.appendChild(c));
  list.appendChild(frag);

  renderPaginationControls(totalPages, CURRENT_PAGE, totalItems);
}

// ===============================
//  CREATE CARD — QISM BOSHLANDI
// ===============================
async function createAdCard(ad) {
  const u = await getUserInfo(ad.userId);

  const div = document.createElement("div");
  div.className = "ad-card";
  div.dataset.adId = ad.id;

  const route = `${ad.fromRegion || ""}${ad.fromDistrict ? ", "+ad.fromDistrict : ""} → ${ad.toRegion || ""}${ad.toDistrict ? ", "+ad.toDistrict : ""}`;

  // New badge 24h rule
  let isNew = false;
  const createdRaw = ad.createdAt || ad.created || ad.postedAt || "";
  if (createdRaw) {
    const ct = new Date(createdRaw).getTime();
    if (!isNaN(ct)) {
      if (Date.now() - ct <= 24*60*60*1000 && !isRead(ad.id)) {
        isNew = true;
      }
    }
  }

  const depRaw = ad.departureTime || ad.startTime || ad.time || ad.date;
  const dep = formatTime(depRaw);

  const created = formatTime(createdRaw);

  const seatsRaw = ad.totalSeats || ad.seatCount || ad.seats;
  const seats = seatsRaw ? Number(seatsRaw) : null;
  const booked = Number(ad.bookedSeats || 0);
  const free = seats !== null ? Math.max(seats - booked,0) : null;

  const reqRaw = ad.passengerCount || ad.requestSeats || ad.peopleCount;
  const req = reqRaw ? Number(reqRaw) : null;

  div.innerHTML = `
    <img class="ad-avatar" src="${escapeHtml(u.avatar || "https://i.ibb.co/2W0z7Lx/user.png")}" />

    <div class="ad-main">
      <div class="ad-route">
        ${escapeHtml(route)}
        ${isNew ? `<span class="ad-badge-new">Yangi</span>` : ""}
      </div>

      <div class="ad-car" style="color:#6b7280;font-size:13px;">${escapeHtml(u.carModel || "")}</div>

      <div class="ad-meta">
        <div class="ad-chip">⏰ ${escapeHtml(dep)}</div>
        ${
          seats !== null
            ? `<div class="ad-chip">👥 ${free}/${seats} bo‘sh</div>`
            : (req !== null 
                ? `<div class="ad-chip">👥 ${req} odam</div>`
                : `<div class="ad-chip">👥 -</div>`
              )
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
//  OPEN MODAL
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

  const dep = formatTime(ad.departureTime || ad.startTime || ad.time || ad.date || "");
  const created = formatTime(ad.createdAt || ad.created || ad.postedAt || "");

  const fullname =
    u.fullName ||
    ((u.firstname || u.lastname)
      ? `${u.firstname || ""} ${u.lastname || ""}`.trim()
      : "") ||
    "Foydalanuvchi";

  const carFull = `${u.carModel || ""}${u.carColor ? " • " + u.carColor : ""}${u.carNumber ? " • " + u.carNumber : ""}`;

  const seatsRaw = ad.totalSeats || ad.seatCount || ad.seats;
  const seats = seatsRaw ? Number(seatsRaw) : null;
  const booked = Number(ad.bookedSeats || 0);
  const free = seats !== null ? Math.max(seats - booked, 0) : null;

  const reqRaw = ad.passengerCount || ad.requestSeats || ad.peopleCount;
  const req = reqRaw ? Number(reqRaw) : null;

  modal.innerHTML = `
    <div class="ad-modal-box">
      <div style="display:flex; gap:12px; margin-bottom:12px;">
        <img class="modal-avatar"
             src="${escapeHtml(u.avatar || "https://i.ibb.co/2W0z7Lx/user.png")}" />
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
          <div class="value">${escapeHtml(dep)}</div>
        </div>
      </div>

      <div class="modal-row">
        <div class="modal-col">
          <div class="label">Joylar</div>
          <div class="value">
            ${
              seats !== null
                ? `${seats} ta (Bo‘sh: ${free})`
                : req !== null
                ? `Talab: ${req} odam`
                : "-"
            }
          </div>
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

      <div class="modal-actions">
        <button class="btn-primary" id="modalCloseBtn">Yopish</button>
        <button class="btn-ghost" id="modalCallBtn">Qo'ng'iroq</button>
      </div>
    </div>
  `;

  modal.style.display = "flex";

  document.getElementById("modalCloseBtn").onclick = closeAdModal;
  document.getElementById("modalCallBtn").onclick = () => onContact(u.phone || "");

  modal.onclick = e => { if (e.target === modal) closeAdModal(); };

  // mark as read
  markAsRead(ad.id);
  updateBadgeForAd(ad.id);
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

// ===============================
// BADGE UPDATE FOR ONE CARD
// ===============================
function updateBadgeForAd(adId) {
  const card = document.querySelector(`.ad-card[data-ad-id="${adId}"]`);
  if (!card) return;
  const badge = card.querySelector(".ad-badge-new");
  if (badge) badge.remove();
}

// ===============================
// CONTACT HELPER
// ===============================
function onContact(phone) {
  if (!phone) return alert("Telefon raqami mavjud emas");
  window.location.href = `tel:${phone}`;
}
window.onContact = onContact;

// ===============================
// RESET FILTERS
// ===============================
function resetFilters() {
  const ids = [
    "search","filterRole","filterRegion","fromRegion","toRegion",
    "sortBy","filterDate","priceMin","priceMax"
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (id === "sortBy") el.value = "newest";
      else el.value = "";
    }
  });

  // remove district checks
  document.querySelectorAll("#fromDistrictBox input").forEach(i=>i.checked=false);
  document.querySelectorAll("#toDistrictBox input").forEach(i=>i.checked=false);

  // hide district boxes
  document.getElementById("fromDistrictBox").style.display = "none";
  document.getElementById("toDistrictBox").style.display = "none";

  CURRENT_PAGE = 1;
  scheduleRenderAds();
}
window.resetFilters = resetFilters;

// ===============================
// DEBOUNCED RENDER
// ===============================
let __render_timeout = null;
function scheduleRenderAds() {
  if (__render_timeout) clearTimeout(__render_timeout);
  __render_timeout = setTimeout(()=>{
    renderAds(Array.from(ADS_MAP.values()));
    __render_timeout = null;
  },110);
}

// ===============================
// LOGOUT
// ===============================
window.logout = () => signOut(auth);

// ===============================
// PAGINATION RENDER
// ===============================
function renderPaginationControls(totalPages=0, currentPage=0, totalItems=0) {
  let box = document.getElementById("pagination");
  if (!box) return;

  box.innerHTML = "";

  if (!totalPages || totalPages <= 1) {
    if (totalItems > 0) {
      box.innerHTML = `<div style="color:#6b7280;font-size:14px;">
        Ko‘rsatilyapti: ${Math.min(PAGE_SIZE,totalItems)} / ${totalItems}
      </div>`;
    }
    return;
  }

  const mkBtn = (txt, disabled, cb)=>{
    const b = document.createElement("button");
    b.textContent = txt;
    b.disabled = disabled;
    b.style = `
      margin:0 4px;padding:6px 10px;
      border-radius:8px;border:1px solid #d0d0d0;
      background:${disabled?"#e5e7eb":"white"};
      cursor:${disabled?"default":"pointer"}
    `;
    if (!disabled) b.onclick = cb;
    return b;
  };

  box.appendChild(mkBtn("« Birinchi", currentPage===1, ()=>{ CURRENT_PAGE=1; scheduleRenderAds(); }));
  box.appendChild(mkBtn("‹ Oldingi", currentPage===1, ()=>{ CURRENT_PAGE--; scheduleRenderAds(); }));

  const windowSize = 5;
  let start = Math.max(1, currentPage - Math.floor(windowSize/2));
  let end = Math.min(totalPages, start + windowSize - 1);
  if (end - start < windowSize - 1)
    start = Math.max(1, end - windowSize + 1);

  for (let p = start; p <= end; p++) {
    const isCur = p === currentPage;
    const b = document.createElement("button");
    b.textContent = p;
    b.disabled = isCur;
    b.style = `
      margin:0 4px;padding:6px 10px;
      border-radius:8px;border:1px solid ${isCur?"#0069d9":"#ccc"};
      background:${isCur?"#0069d9":"white"};
      color:${isCur?"white":"#111"};
    `;
    if (!isCur) b.onclick = ()=>{ CURRENT_PAGE = p; scheduleRenderAds(); };
    box.appendChild(b);
  }

  box.appendChild(mkBtn("Keyingi ›", currentPage===totalPages, ()=>{ CURRENT_PAGE++; scheduleRenderAds(); }));
  box.appendChild(mkBtn("Oxiri »", currentPage===totalPages, ()=>{ CURRENT_PAGE=totalPages; scheduleRenderAds(); }));

  const info = document.createElement("div");
  info.style = "margin-top:6px;color:#6b7280;font-size:13px;";
  info.textContent = `Sahifa ${currentPage}/${totalPages} — Jami: ${totalItems}`;
  box.appendChild(info);
}
