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
// REGIONS DATA (from regions.js)
const REGIONS = window.regionsData || window.regions || {};
// ===============================

// ===============================
// TYPE NORMALIZATION
// ===============================
function normalizeType(t) {
  if (!t) return "";
  t = String(t).trim().toLowerCase();
  t = t.replace(/[‘’`ʼ']/g, "'");
  if (t.includes("haydov")) return "Haydovchi";
  if (t.includes("yo") && t.includes("lov")) return "Yo‘lovchi";
  if (t === "yo'lovchi") return "Yo‘lovchi";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// ===============================
// UNIVERSAL DATE PARSER & FORMATTER
// ===============================
function formatTime(val) {
  if (!val) return "—";

  if (typeof val === "number") {
    return new Date(val).toLocaleString("uz-UZ", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  if (typeof val === "string") {
    if (!isNaN(Date.parse(val))) {
      return new Date(val).toLocaleString("uz-UZ", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    }

    const fix = val.replace(" ", "T");
    if (!isNaN(Date.parse(fix))) {
      return new Date(fix).toLocaleString("uz-UZ", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
  }

  return val;
}

function formatReal(date, short = false) {
  const datePart = date.toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "long",
    year: short ? undefined : "numeric"
  });

  const timePart = date.toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit"
  });

  if (short) {
    const parts = datePart.split(" ");
    if (parts.length && /\d{4}/.test(parts[parts.length - 1])) parts.pop();
    return `${parts.join(" ")} , ${timePart}`.replace(/\s+,/, ",");
  }

  return `${datePart}, ${timePart}`;
}

// ===============================
// GET USER INFO
// ===============================
async function getUserInfo(userId) {
  if (!userId) return {
    phone: "", avatar: "",
    fullName: "",
    carModel: "", carColor: "", carNumber: "",
    seatCount: 0
  };

  const snap = await get(ref(db, "users/" + userId));
  if (!snap.exists()) return {
    phone: "", avatar: "",
    fullName: "",
    carModel: "", carColor: "", carNumber: "",
    seatCount: 0
  };

  const u = snap.val();
  return {
    phone: u.phone || "",
    avatar: u.avatar || "",
    fullName: u.fullName || "",
    carModel: u.carModel || "",
    carColor: u.carColor || "",
    carNumber: u.carNumber || "",
    seatCount: u.seatCount || 0
  };
}

// ===============================
// AUTH CHECK
// ===============================
onAuthStateChanged(auth, (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  loadRegionsFilter();
  loadRouteFilters();     // ⭐ Yangi qo‘shildi
  loadAllAds();
});

// ===============================
// LOAD REGION FILTER
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
//  ROUTE FILTERS (YANGI)
// ===============================
function loadRouteFilters() {
  const fromSelect = document.getElementById("fromRegion");
  const toSelect = document.getElementById("toRegion");

  Object.keys(REGIONS).forEach(region => {
    fromSelect.innerHTML += `<option value="${region}">${region}</option>`;
    toSelect.innerHTML += `<option value="${region}">${region}</option>`;
  });

  fromSelect.onchange = fillFromDistricts;
  toSelect.onchange = fillToDistricts;
}

function fillFromDistricts() {
  const region = document.getElementById("fromRegion").value;
  const box = document.getElementById("fromDistrictBox");
  box.innerHTML = "";

  if (!region || !REGIONS[region]) return;

  REGIONS[region].forEach(d => {
    box.innerHTML += `
      <label class="district-item">
        <input type="checkbox" value="${d}" class="fromDistrict"> ${d}
      </label>`;
  });
}

function fillToDistricts() {
  const region = document.getElementById("toRegion").value;
  const box = document.getElementById("toDistrictBox");
  box.innerHTML = "";

  if (!region || !REGIONS[region]) return;

  REGIONS[region].forEach(d => {
    box.innerHTML += `
      <label class="district-item">
        <input type="checkbox" value="${d}" class="toDistrict"> ${d}
      </label>`;
  });
}

// ===============================
// LOAD ALL ADS
// ===============================
async function loadAllAds() {
  const snap = await get(ref(db, "ads"));
  const list = document.getElementById("adsList");

  if (!snap.exists()) {
    if (list) list.innerHTML = "<p>Hozircha e’lon yo‘q.</p>";
    return;
  }

  const ads = [];
  snap.forEach(child => {
    const v = child.val();
    ads.push({
      id: child.key,
      ...v,
      typeNormalized: normalizeType(v.type)
    });
  });

  document.getElementById("search").oninput = () => renderAds(ads);
  document.getElementById("filterRole").onchange = () => renderAds(ads);
  document.getElementById("filterRegion").onchange = () => renderAds(ads);
  document.getElementById("fromRegion").onchange = () => renderAds(ads);
  document.getElementById("toRegion").onchange = () => renderAds(ads);

  renderAds(ads);
}

// ===============================
// RENDER ADS
// ===============================
async function renderAds(ads) {
  const list = document.getElementById("adsList");
  if (!list) return;
  list.innerHTML = "";

  const q = (document.getElementById("search")?.value || "").toLowerCase();
  const roleFilter = normalizeType(document.getElementById("filterRole")?.value || "");
  const regionFilter = document.getElementById("filterRegion")?.value || "";

  const fromRegion = document.getElementById("fromRegion")?.value;
  const toRegion = document.getElementById("toRegion")?.value;

  const fromDistricts = Array.from(document.querySelectorAll(".fromDistrict:checked")).map(x => x.value);
  const toDistricts = Array.from(document.querySelectorAll(".toDistrict:checked")).map(x => x.value);

  const filtered = ads.filter(a => {
    if (roleFilter && a.typeNormalized !== roleFilter) return false;

    if (regionFilter && a.fromRegion !== regionFilter && a.toRegion !== regionFilter) return false;

    // ⭐ FROM REGION
    if (fromRegion && a.fromRegion !== fromRegion) return false;

    // ⭐ FROM DISTRICT (multi OR)
    if (fromDistricts.length > 0 && !fromDistricts.includes(a.fromDistrict)) return false;

    // ⭐ TO REGION
    if (toRegion && a.toRegion !== toRegion) return false;

    // ⭐ TO DISTRICT (multi OR)
    if (toDistricts.length > 0 && !toDistricts.includes(a.toDistrict)) return false;

    const hay = [
      a.fromRegion, a.fromDistrict,
      a.toRegion, a.toDistrict,
      a.comment, a.price, a.type
    ]
    .join(" ")
    .toLowerCase();

    return hay.includes(q);
  });

  if (!filtered.length) {
    list.innerHTML = "<p>Natija topilmadi.</p>";
    return;
  }

  const cards = await Promise.all(filtered.map(a => createAdCard(a)));
  cards.forEach(card => list.appendChild(card));
}

// --------------------------------------------------
// MINI CARD & MODAL – SENING KODING (O‘ZGARMAGAN)
// --------------------------------------------------

// (Bu qism aynan sendagi kabi qolgan. O‘zgartirmadim!)

