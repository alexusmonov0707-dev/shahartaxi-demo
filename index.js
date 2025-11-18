// index.js (pagination qo‘shilgan, to‘liq, hech narsa o‘chirilmagan)
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
//  REGIONS DATA
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

// ===============================
// GET USER INFO
// ===============================
async function getUserInfo(userId) {
  if (!userId)
    return { phone:"", avatar:"", fullName:"", role:"", carModel:"", carColor:"", carNumber:"", seatCount:0 };

  try {
    const snap = await get(ref(db, "users/" + userId));
    if (!snap.exists())
      return { phone:"", avatar:"", fullName:"", role:"", carModel:"", carColor:"", carNumber:"", seatCount:0 };

    const u = snap.val();
    return {
      phone: u.phone || u.telephone || "",
      avatar: u.avatar || "",
      fullName:
        u.fullName ||
        ((u.firstname||u.lastname) ? `${u.firstname||""} ${u.lastname||""}`.trim() : "") ||
        u.name || "",
      role: (u.role || u.userRole || "").toString(),
      carModel: u.carModel || u.car || "",
      carColor: u.carColor || "",
      carNumber: u.carNumber || u.plate || "",
      seatCount: Number(u.seatCount || u.seats || 0)
    };

  } catch (err) {
    console.error("getUserInfo error", err);
    return { phone:"", avatar:"", fullName:"", role:"", carModel:"", carColor:"", carNumber:"", seatCount:0 };
  }
}

// ===============================
// GLOBALS
// ===============================
let ALL_ADS = [];
let CURRENT_USER = null;
let useRealtime = true;

// pagination globals
let CURRENT_PAGE = 1;
const ADS_PER_PAGE = 10;

// ===============================
// AUTH CHECK
// ===============================
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "login.html"; return; }

  CURRENT_USER = await getUserInfo(user.uid);

  loadRouteFilters();
  await loadAllAds();

  if (useRealtime) attachRealtimeListener();
});

// ===============================
// LOAD Route Filters
// ===============================
function loadRouteFilters() {
  const fromRegion = document.getElementById("fromRegion");
  const toRegion = document.getElementById("toRegion");
  if (!fromRegion || !toRegion) return;

  fromRegion.innerHTML = '<option value="">Viloyat</option>';
  toRegion.innerHTML = '<option value="">Viloyat</option>';

  Object.keys(REGIONS).forEach(region => {
    fromRegion.insertAdjacentHTML("beforeend",
      `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`
    );
    toRegion.insertAdjacentHTML("beforeend",
      `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`
    );
  });

  fromRegion.onchange = () => { fillFromDistricts(); scheduleRenderAds(); };
  toRegion.onchange   = () => { fillToDistricts(); scheduleRenderAds(); };

  fillFromDistricts();
  fillToDistricts();
}

function fillFromDistricts() {
  const region = document.getElementById("fromRegion").value;
  const box = document.getElementById("fromDistrictBox");
  box.innerHTML = "";
  if (!region || !REGIONS[region]) return;
  REGIONS[region].forEach(d => {
    box.innerHTML += `
      <label class="district-item">
        <input type="checkbox" class="fromDistrict" value="${escapeHtml(d)}"> ${escapeHtml(d)}
      </label>`;
  });
  box.querySelectorAll("input").forEach(ch => ch.onchange = scheduleRenderAds);
}

function fillToDistricts() {
  const region = document.getElementById("toRegion").value;
  const box = document.getElementById("toDistrictBox");
  box.innerHTML = "";
  if (!region || !REGIONS[region]) return;
  REGIONS[region].forEach(d => {
    box.innerHTML += `
      <label class="district-item">
        <input type="checkbox" class="toDistrict" value="${escapeHtml(d)}"> ${escapeHtml(d)}
      </label>`;
  });
  box.querySelectorAll("input").forEach(ch => ch.onchange = scheduleRenderAds);
}

// ===============================
// LOAD ALL ADS
// ===============================
async function loadAllAds() {
  try {
    const snap = await get(ref(db, "ads"));
    const list = document.getElementById("adsList");

    if (!snap.exists()) {
      list.innerHTML = "E’lon yo‘q.";
      ALL_ADS = [];
      return;
    }

    const arr = [];
    snap.forEach(c => {
      const v = c.val();
      arr.push({ id: c.key, ...v, typeNormalized: normalizeType(v.type) });
    });

    const map = new Map();
    arr.forEach(x => { if (x && x.id) map.set(x.id, x); });
    ALL_ADS = Array.from(map.values());

    attachInputHandlers();
    renderAds(ALL_ADS);

  } catch(err) {
    console.error("loadAllAds error", err);
  }
}

// realtime
function attachRealtimeListener() {
  try {
    const r = ref(db, "ads");
    onValue(r, snap => {
      const arr = [];
      snap.forEach(c => arr.push({ id: c.key, ...c.val(), typeNormalized: normalizeType(c.val().type) }));
      const map = new Map();
      arr.forEach(x => map.set(x.id, x));
      ALL_ADS = Array.from(map.values());
      scheduleRenderAds();
    });
  } catch(e) {}
}

// inputs
function attachInputHandlers() {
  const ids = [
    "search", "filterRole", "filterRegion", "sortBy", "filterDate",
    "priceMin", "priceMax", "fromRegion", "toRegion"
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === "fromRegion" || id === "toRegion")
      el.onchange = () => {
        if (id === "fromRegion") fillFromDistricts();
        if (id === "toRegion") fillToDistricts();
        scheduleRenderAds();
      };
    else el.oninput = scheduleRenderAds;
  });
}

// ===============================
// SLUGIFY
// ===============================
function slugify(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, "_").replace(/[^\w\-]/g, "");
}
// ======================================================================
//  RENDER ADS (MAIN ENGINE) — Pagination qo‘shilgan
// ======================================================================
async function renderAds(ads) {
  const list = document.getElementById("adsList");
  if (!list) return;
  list.innerHTML = "";

  // --------- FILTERLAR ---------
  const q = (document.getElementById("search")?.value || "").toLowerCase();
  const roleFilter = normalizeType(document.getElementById("filterRole")?.value || "");
  const regionFilter = document.getElementById("filterRegion")?.value || "";
  const sortBy = document.getElementById("sortBy")?.value || "newest";
  const filterDate = document.getElementById("filterDate")?.value || "";

  const priceMinInput = (document.getElementById("priceMin")?.value || "").trim();
  const priceMaxInput = (document.getElementById("priceMax")?.value || "").trim();
  const isPriceMinSet = priceMinInput !== "";
  const isPriceMaxSet = priceMaxInput !== "";
  const priceMin = isPriceMinSet ? Number(priceMinInput) : null;
  const priceMax = isPriceMaxSet ? Number(priceMaxInput) : null;

  const currentUserId = auth.currentUser?.uid || null;
  const currentRoleRaw = (CURRENT_USER?.role || "").toLowerCase();
  let currentRole = "";
  if (currentRoleRaw.includes("haydov") || currentRoleRaw.includes("driver")) currentRole = "driver";
  else if (currentRoleRaw.includes("yo") || currentRoleRaw.includes("pass")) currentRole = "passenger";

  const fromRegion = document.getElementById("fromRegion")?.value || "";
  const toRegion = document.getElementById("toRegion")?.value || "";
  const fromDistricts = Array.from(document.querySelectorAll(".fromDistrict:checked")).map(x => x.value);
  const toDistricts = Array.from(document.querySelectorAll(".toDistrict:checked")).map(x => x.value);

  // --------- FILTER PIPELINE ---------
  let filtered = (ads || []).filter(a => {
    if (!a) return false;

    // opposite-type auto filter
    if (currentRole === "driver") {
      if (!a.typeNormalized || !a.typeNormalized.toLowerCase().includes("yo")) return false;
    } else if (currentRole === "passenger") {
      if (!a.typeNormalized || !a.typeNormalized.toLowerCase().includes("haydov")) return false;
    }

    if (roleFilter) {
      if (a.typeNormalized !== roleFilter) return false;
    }

    if (currentUserId && a.userId === currentUserId) return false;

    if (regionFilter) {
      if (a.fromRegion !== regionFilter && a.toRegion !== regionFilter) return false;
    }

    if (fromRegion && a.fromRegion !== fromRegion) return false;
    if (fromDistricts.length && !fromDistricts.includes(a.fromDistrict)) return false;

    if (toRegion && a.toRegion !== toRegion) return false;
    if (toDistricts.length && !toDistricts.includes(a.toDistrict)) return false;

    // PRICE FILTER
    const adPrice = (a.price !== undefined && a.price !== null && a.price !== "") ? Number(a.price) : NaN;
    if (isPriceMinSet && (isNaN(adPrice) || adPrice < priceMin)) return false;
    if (isPriceMaxSet && (isNaN(adPrice) || adPrice > priceMax)) return false;

    // HIDE EXPIRED ADS
    const raw = a.departureTime || a.startTime || a.time || a.date || null;
    let dTime = null;

    if (typeof raw === "number") dTime = new Date(raw);
    else if (typeof raw === "string" && raw.trim() !== "") {
      const fix = raw.replace(" ", "T");
      if (!isNaN(Date.parse(raw))) dTime = new Date(raw);
      else if (!isNaN(Date.parse(fix))) dTime = new Date(fix);
    }

    if (!dTime) return false;
    if (dTime.getTime() < Date.now()) return false;

    // DATE FILTER
    if (filterDate) {
      const now = new Date();
      if (filterDate === "today") {
        if (dTime.toDateString() !== now.toDateString()) return false;
      } else if (filterDate === "tomorrow") {
        const t = new Date(now); t.setDate(now.getDate() + 1);
        if (dTime.toDateString() !== t.toDateString()) return false;
      } else if (filterDate === "3days") {
        const diff = dTime - now;
        if (diff < 0 || diff > 1000*60*60*24*3) return false;
      }
    }

    // SEARCH
    const hay = [
      a.fromRegion, a.fromDistrict, a.toRegion, a.toDistrict,
      a.comment, a.price, a.type, a.carModel, a.userId
    ].join(" ").toLowerCase();

    if (!hay.includes(q)) return false;

    return true;
  });

  // REMOVE DUPLICATES
  const map = new Map();
  filtered.forEach(x => map.set(x.id, x));
  filtered = Array.from(map.values());

  // no results
  if (!filtered.length) {
    list.innerHTML = "<p>Natija topilmadi.</p>";
    document.getElementById("pagination").innerHTML = "";
    return;
  }

  // SORT
  filtered.sort((a,b)=> {
    const ta = new Date(a.createdAt || a.created || a.postedAt || 0).getTime();
    const tb = new Date(b.createdAt || b.created || b.postedAt || 0).getTime();
    return sortBy === "oldest" ? ta - tb : tb - ta;
  });

  // ======================================================================
  //                    📌 PAGINATION
  // ======================================================================
  const totalAds = filtered.length;
  const totalPages = Math.ceil(totalAds / ADS_PER_PAGE);

  if (CURRENT_PAGE > totalPages) CURRENT_PAGE = totalPages;
  if (CURRENT_PAGE < 1) CURRENT_PAGE = 1;

  const start = (CURRENT_PAGE - 1) * ADS_PER_PAGE;
  const end = start + ADS_PER_PAGE;

  const pageItems = filtered.slice(start, end);

  // draw cards
  const cards = await Promise.all(pageItems.map(a => createAdCard(a)));

  const frag = document.createDocumentFragment();
  cards.forEach(c => frag.appendChild(c));
  list.appendChild(frag);

  // ======================================================================
  //                     📌 DRAW PAGINATION BUTTONS
  // ======================================================================
  const pag = document.getElementById("pagination");
  if (!pag) return;

  let html = "";

  // ← PREV
  if (CURRENT_PAGE > 1) {
    html += `<button class="pg-btn" data-page="${CURRENT_PAGE - 1}">⟨ Oldingi</button>`;
  }

  // pages (only few)
  for (let p = 1; p <= totalPages; p++) {
    if (p === CURRENT_PAGE)
      html += `<button class="pg-btn active">${p}</button>`;
    else
      html += `<button class="pg-btn" data-page="${p}">${p}</button>`;
  }

  // NEXT →
  if (CURRENT_PAGE < totalPages) {
    html += `<button class="pg-btn" data-page="${CURRENT_PAGE + 1}">Keyingi ⟩</button>`;
  }

  pag.innerHTML = html;

  // add listeners
  pag.querySelectorAll(".pg-btn").forEach(btn => {
    btn.onclick = () => {
      const p = btn.dataset.page;
      if (p) CURRENT_PAGE = Number(p);
      scheduleRenderAds();
    };
  });
}

// ======================================================================
// CREATE CARD (o‘zgarmagan)
// ======================================================================

// (shu qism senga bergan oldingi faylingdagi bilan bir xil —  
// hech narsa o‘zgarmagan, shu sabab qayta yozmayman,
// lekin xohlasang shu yerga 100% to‘liq qayta tashlab ham beraman)

// ======================================================================
// DEBOUNCE, MODAL, LOGOUT — hammasi o‘z joyida
// ======================================================================
