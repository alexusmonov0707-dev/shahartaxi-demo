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
// REGIONS DATA
// ===============================
const REGIONS = window.regionsData || window.regions || {};

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
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function formatTime(val) {
  if (!val) return "—";
  try {
    if (!isNaN(Date.parse(val))) {
      return new Date(val).toLocaleString("uz-UZ", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
  } catch {}
  return val;
}

// ===============================
// GET USER INFO
// ===============================
async function getUserInfo(userId) {
  if (!userId) return defaultUser();

  try {
    const snap = await get(ref(db, "users/" + userId));
    if (!snap.exists()) return defaultUser();

    const u = snap.val();
    return {
      phone: u.phone || "",
      avatar: u.avatar || "",
      fullName: u.fullName || "",
      role: u.role || "",
      carModel: u.carModel || "",
      carColor: u.carColor || "",
      carNumber: u.carNumber || "",
      seatCount: u.seatCount || 0
    };
  } catch {
    return defaultUser();
  }
}

function defaultUser() {
  return {
    phone: "",
    avatar: "",
    fullName: "",
    role: "",
    carModel: "",
    carColor: "",
    carNumber: "",
    seatCount: 0
  };
}

// ===============================
// GLOBAL STATES
// ===============================
let ALL_ADS = [];
let CURRENT_USER = null;

// ===============================
// AUTH
// ===============================
onAuthStateChanged(auth, async (user) => {
  if (!user) return (window.location.href = "login.html");

  CURRENT_USER = await getUserInfo(user.uid);
  loadRouteFilters();
  await loadAllAds();
});

// ===============================
// ROUTE FILTERS
// ===============================
function loadRouteFilters() {
  const fromRegion = document.getElementById("fromRegion");
  const toRegion = document.getElementById("toRegion");

  if (!fromRegion || !toRegion) return;

  fromRegion.innerHTML = `<option value="">Viloyat</option>`;
  toRegion.innerHTML = `<option value="">Viloyat</option>`;

  Object.keys(REGIONS).forEach(r => {
    fromRegion.innerHTML += `<option value="${r}">${r}</option>`;
    toRegion.innerHTML += `<option value="${r}">${r}</option>`;
  });

  fromRegion.onchange = () => { fillFromDistricts(); renderAds(ALL_ADS); };
  toRegion.onchange = () => { fillToDistricts(); renderAds(ALL_ADS); };

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
        <input type="checkbox" value="${d}" class="fromDistrict"> ${d}
      </label>
    `;
  });

  box.querySelectorAll("input").forEach(i => i.onchange = () => renderAds(ALL_ADS));
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
      </label>
    `;
  });

  box.querySelectorAll("input").forEach(i => i.onchange = () => renderAds(ALL_ADS));
}

// ===============================
// LOAD ADS
// ===============================
async function loadAllAds() {
  const snap = await get(ref(db, "ads"));
  const list = document.getElementById("adsList");

  if (!snap.exists()) {
    list.innerHTML = "<p>Hozircha e’lon yo‘q</p>";
    return;
  }

  ALL_ADS = [];
  snap.forEach(c => {
    ALL_ADS.push({
      id: c.key,
      ...c.val(),
      typeNormalized: normalizeType(c.val().type)
    });
  });

  document.getElementById("search").oninput = () => renderAds(ALL_ADS);
  document.getElementById("filterRole").onchange = () => renderAds(ALL_ADS);

  renderAds(ALL_ADS);
}

// ===============================
// RENDER ADS
// ===============================
async function renderAds(ads) {
  const list = document.getElementById("adsList");
  list.innerHTML = "";

  const q = (document.getElementById("search").value || "").toLowerCase();
  const roleFilter = normalizeType(document.getElementById("filterRole").value);

  const fromRegion = document.getElementById("fromRegion").value;
  const toRegion = document.getElementById("toRegion").value;

  const fromDistricts = [...document.querySelectorAll(".fromDistrict:checked")].map(i => i.value);
  const toDistricts = [...document.querySelectorAll(".toDistrict:checked")].map(i => i.value);

  const filtered = ads.filter(a => {
    // auto role by signed-in user
    let userRole = (CURRENT_USER?.role || "").toLowerCase();

    if (userRole.includes("haydov") && a.typeNormalized !== "Yo‘lovchi") return false;
    if (userRole.includes("yo") && a.typeNormalized !== "Haydovchi") return false;

    // manual role filter
    if (roleFilter && a.typeNormalized !== roleFilter) return false;

    // don't show own ads
    if (a.userId === auth.currentUser?.uid) return false;

    // from region
    if (fromRegion && a.fromRegion !== fromRegion) return false;

    // from district
    if (fromDistricts.length && !fromDistricts.includes(a.fromDistrict)) return false;

    // to region
    if (toRegion && a.toRegion !== toRegion) return false;

    // to district
    if (toDistricts.length && !toDistricts.includes(a.toDistrict)) return false;

    // search
    if (![
      a.fromRegion, a.fromDistrict,
      a.toRegion, a.toDistrict,
      a.comment, a.price
    ].join(" ").toLowerCase().includes(q)) return false;

    return true;
  });

  if (!filtered.length) {
    list.innerHTML = "<p>Natija topilmadi.</p>";
    return;
  }

  // create cards
  const cards = await Promise.all(filtered.map(a => createAdCard(a)));
  cards.forEach(c => list.appendChild(c));
}

// ===============================
// CREATE CARD
// ===============================
async function createAdCard(ad) {
  const u = await getUserInfo(ad.userId);

  const div = document.createElement("div");
  div.className = "ad-card";

  const route = `${ad.fromRegion}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ${ad.toRegion}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;
  const dep = formatTime(ad.departureTime || ad.startTime);
  const created = formatTime(ad.createdAt);

  div.innerHTML = `
    <img class="ad-avatar" src="${u.avatar || "https://i.ibb.co/2W0z7Lx/user.png"}">

    <div class="ad-main">
      <div class="ad-route">${route}</div>
      <div class="ad-car">${u.carModel || ""}</div>

      <div class="ad-meta">
        <div class="ad-chip">⏰ ${dep}</div>
      </div>
    </div>

    <div class="ad-price">💰 ${ad.price} so‘m</div>
    <div class="ad-created">${created}</div>
  `;

  div.onclick = () => openAdModal(ad);
  return div;
}

// ===============================
// FULL MODAL
// ===============================
async function openAdModal(ad) {
  let modal = document.getElementById("adFullModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "adFullModal";
    document.body.appendChild(modal);
  }

  const u = await getUserInfo(ad.userId);

  modal.innerHTML = `
    <div class="ad-modal-box">
      <div class="modal-header">
        <img class="modal-avatar" src="${u.avatar || "https://i.ibb.co/2W0z7Lx/user.png"}">
        <div>
          <div class="modal-name">${u.fullName}</div>
          <div class="modal-car">${u.carModel}</div>
        </div>
      </div>

      <div class="modal-row">
        <div class="label">Yo‘nalish</div>
        <div class="value">${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict}</div>
      </div>

      <div class="modal-row">
        <div class="label">Jo‘nash</div>
        <div class="value">${formatTime(ad.departureTime)}</div>
      </div>

      <div class="modal-row">
        <div class="label">Narx</div>
        <div class="value">${ad.price} so‘m</div>
      </div>

      <div class="modal-row">
        <div class="label">Izoh</div>
        <div class="value">${ad.comment || "-"}</div>
      </div>

      <div class="modal-row">
        <div class="label">Kontakt</div>
        <div class="value">${u.phone}</div>
      </div>

      <div class="modal-actions">
        <button class="btn-primary" onclick="closeAdModal()">Yopish</button>
        <button class="btn-ghost" onclick="onContact('${u.phone}')">Qo‘ng‘iroq</button>
      </div>
    </div>
  `;

  modal.style.display = "flex";
  modal.onclick = (e) => { if (e.target === modal) closeAdModal(); };
}

function closeAdModal() {
  const modal = document.getElementById("adFullModal");
  modal.style.display = "none";
}

function onContact(phone) {
  window.location.href = `tel:${phone}`;
}

// ===============================
// LOGOUT
// ===============================
window.logout = () => signOut(auth);

// expose global
window.closeAdModal = closeAdModal;
window.onContact = onContact;
window.openAdModal = openAdModal;
