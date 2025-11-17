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
// REGIONS (regions.js dan)
// ===============================
const REGIONS = window.regionsData || window.regions || {};


// ===============================
// ROLE NORMALIZATION
// ===============================
function normalizeType(t) {
  if (!t) return "";
  t = t.toLowerCase();
  if (t.includes("haydov")) return "driver";
  if (t.includes("yo") && t.includes("lov")) return "passenger";
  return t;
}


// ===============================
// DATE FORMAT
// ===============================
function formatTime(val) {
  if (!val) return "—";
  const d = new Date(val);
  return d.toLocaleString("uz-UZ", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}


// ===============================
// GET USER INFO
// ===============================
async function getUserInfo(userId) {
  const snap = await get(ref(db, "users/" + userId));
  if (!snap.exists()) return {};

  const u = snap.val();
  return {
    phone: u.phone || "",
    avatar: u.avatar || "",
    fullName: u.fullName || "",
    role: u.role || "", // driver/passenger
    carModel: u.carModel || "",
    carColor: u.carColor || "",
    carNumber: u.carNumber || "",
    seatCount: u.seatCount || 0
  };
}


// ===============================
// AUTH + INITIAL LOAD
// ===============================
onAuthStateChanged(auth, async (user) => {
  if (!user) return (window.location.href = "login.html");

  await loadRouteFilters();
  loadAllAds();
});


// ===============================
// LOAD REGION + DISTRICTS
// ===============================
async function loadRouteFilters() {
  const fromRegion = document.getElementById("fromRegion");
  const toRegion = document.getElementById("toRegion");

  Object.keys(REGIONS).forEach(region => {
    fromRegion.innerHTML += `<option value="${region}">${region}</option>`;
    toRegion.innerHTML += `<option value="${region}">${region}</option>`;
  });

  fromRegion.onchange = fillFromDistricts;
  toRegion.onchange = fillToDistricts;
}

function fillFromDistricts() {
  const region = document.getElementById("fromRegion").value;
  const box = document.getElementById("fromDistrictBox");
  box.innerHTML = "";

  if (!region) return;

  REGIONS[region].forEach(d => {
    box.innerHTML += `
      <label class="district-item">
        <input type="checkbox" class="fromDistrict" value="${d}"> ${d}
      </label>`;
  });
}

function fillToDistricts() {
  const region = document.getElementById("toRegion").value;
  const box = document.getElementById("toDistrictBox");
  box.innerHTML = "";

  if (!region) return;

  REGIONS[region].forEach(d => {
    box.innerHTML += `
      <label class="district-item">
        <input type="checkbox" class="toDistrict" value="${d}"> ${d}
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
    list.innerHTML = "<p>Hozircha e’lon yo‘q.</p>";
    return;
  }

  const ads = [];
  snap.forEach(child => {
    const v = child.val();
    ads.push({ id: child.key, ...v });
  });

  document.getElementById("search").oninput = () => renderAds(ads);
  document.getElementById("filterRole").onchange = () => renderAds(ads);
  document.getElementById("fromRegion").onchange = () => renderAds(ads);
  document.getElementById("toRegion").onchange = () => renderAds(ads);
  list.onclick = () => renderAds(ads);

  renderAds(ads);
}


// ===============================
// RENDER ADS
// ===============================
async function renderAds(ads) {
  const list = document.getElementById("adsList");
  list.innerHTML = "";

  const q = (document.getElementById("search").value || "").toLowerCase();

  const fromRegion = document.getElementById("fromRegion").value;
  const toRegion = document.getElementById("toRegion").value;

  const fromDistricts = Array.from(document.querySelectorAll(".fromDistrict:checked")).map(i => i.value);
  const toDistricts = Array.from(document.querySelectorAll(".toDistrict:checked")).map(i => i.value);

  const filterRole = document.getElementById("filterRole").value.toLowerCase();

  const currentUser = await getUserInfo(auth.currentUser.uid);
  const myRole = currentUser.role?.toLowerCase() || ""; // driver/passenger


  const filtered = ads.filter(a => {

    // 1. Self ads hidden
    if (a.userId === auth.currentUser.uid) return false;

    // 2. Role-based access
    const adRole = normalizeType(a.type);
    if (myRole === "driver" && adRole !== "passenger") return false;
    if (myRole === "passenger" && adRole !== "driver") return false;

    // 3. Optional role filter
    if (filterRole && adRole !== filterRole.toLowerCase()) return false;

    // 4. From region
    if (fromRegion && a.fromRegion !== fromRegion) return false;

    // 5. From district
    if (fromDistricts.length > 0 && !fromDistricts.includes(a.fromDistrict)) return false;

    // 6. To region
    if (toRegion && a.toRegion !== toRegion) return false;

    // 7. To district
    if (toDistricts.length > 0 && !toDistricts.includes(a.toDistrict)) return false;

    // 8. Search filter
    const hay = `${a.fromRegion} ${a.fromDistrict} ${a.toRegion} ${a.toDistrict} ${a.comment} ${a.price}`.toLowerCase();
    return hay.includes(q);
  });

  if (!filtered.length) {
    list.innerHTML = "<p>Natija topilmadi.</p>";
    return;
  }

  const cards = await Promise.all(filtered.map(a => createAdCard(a)));
  cards.forEach(c => list.appendChild(c));
}



// ===============================
// CARD
// ===============================
async function createAdCard(ad) {
  const u = await getUserInfo(ad.userId);

  const div = document.createElement("div");
  div.className = "ad-card";

  div.innerHTML = `
    <img class="ad-avatar" src="${u.avatar || "https://i.ibb.co/2W0z7Lx/user.png"}">

    <div class="ad-main">
      <div class="ad-route">${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict}</div>
      <div class="ad-car">${u.carModel || ""}</div>

      <div class="ad-meta">
        <div class="ad-chip">⏰ ${formatTime(ad.departureTime)}</div>
      </div>
    </div>

    <div class="ad-price">💰 ${ad.price} so‘m</div>
    <div class="ad-created">${formatTime(ad.createdAt)}</div>
  `;

  div.onclick = () => openAdModal(ad);
  return div;
}


// ===============================
// MODAL
// ===============================
async function openAdModal(ad) {
  const u = await getUserInfo(ad.userId);

  const modal = document.getElementById("adFullModal");
  modal.style.display = "flex";

  modal.innerHTML = `
    <div class="ad-modal-box">
      <div class="modal-header">
        <img class="modal-avatar" src="${u.avatar || "https://i.ibb.co/2W0z7Lx/user.png"}">
        <div>
          <div class="modal-name">${u.fullName}</div>
          <div class="modal-car">${u.carModel} • ${u.carColor} • ${u.carNumber}</div>
        </div>
      </div>

      <p><b>Yo‘nalish:</b> ${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict}</p>
      <p><b>Jo‘nash:</b> ${formatTime(ad.departureTime)}</p>
      <p><b>Narx:</b> ${ad.price} so‘m</p>
      <p><b>Izoh:</b> ${ad.comment || "-"}</p>
      <p><b>Telefon:</b> ${u.phone}</p>

      <div class="modal-actions">
        <button class="btn-primary" onclick="closeAdModal()">Yopish</button>
        <button class="btn-ghost" onclick="onContact('${u.phone}')">Qo‘ng‘iroq</button>
      </div>
    </div>
  `;
}

window.closeAdModal = () => {
  document.getElementById("adFullModal").style.display = "none";
};

window.onContact = (phone) => {
  window.location.href = `tel:${phone}`;
};


// ===============================
// LOGOUT
// ===============================
window.logout = () => signOut(auth);
