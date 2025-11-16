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
const REGIONS = window.regionsData || {};


// ===============================
// DATE FORMATTER (Premium)
// ===============================
function formatTime(val) {
  if (!val) return "—";

  const d = new Date(val);
  if (isNaN(d)) return val;

  return d.toLocaleString("uz-UZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}


// ===============================
// GET USER INFO (avatar, name, car info)
// ===============================
async function getUserInfo(userId) {
  const snap = await get(ref(db, "users/" + userId));
  if (!snap.exists()) return {
    phone: "",
    avatar: "",
    name: "",
    carModel: "",
    carColor: "",
    carNumber: ""
  };

  const u = snap.val();
  return {
    phone: u.phone || "",
    avatar: u.avatar || "",
    name: `${u.firstname || ""} ${u.lastname || ""}`.trim(),
    carModel: u.carModel || "",
    carColor: u.carColor || "",
    carNumber: u.carNumber || ""
  };
}


// ===============================
// AUTH CHECK
// ===============================
onAuthStateChanged(auth, (user) => {
  if (!user) return (window.location.href = "login.html");

  loadRegionsFilter();
  loadAllAds();
});


// ===============================
// LOAD REGION FILTER
// ===============================
function loadRegionsFilter() {
  const el = document.getElementById("filterRegion");
  el.innerHTML = `<option value="">Viloyat (filter)</option>`;

  Object.keys(REGIONS).forEach(region => {
    el.innerHTML += `<option value="${region}">${region}</option>`;
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
  snap.forEach(c => ads.push({ id: c.key, ...c.val() }));

  document.getElementById("search").oninput = () => renderAds(ads);
  document.getElementById("filterRegion").onchange = () => renderAds(ads);

  renderAds(ads);
}


// ===============================
// RENDER ADS
// ===============================
async function renderAds(ads) {
  const list = document.getElementById("adsList");
  list.innerHTML = "";

  const q = document.getElementById("search").value.toLowerCase();
  const region = document.getElementById("filterRegion").value;

  const filtered = ads.filter(a => {
    if (region && a.fromRegion !== region && a.toRegion !== region) return false;
    const text = `${a.fromRegion} ${a.fromDistrict} ${a.toRegion} ${a.toDistrict} ${a.comment} ${a.price}`.toLowerCase();
    return text.includes(q);
  });

  if (!filtered.length) {
    list.innerHTML = "<p>Natija topilmadi.</p>";
    return;
  }

  for (const ad of filtered) {
    list.appendChild(await createAdCard(ad));
  }
}


// ===============================
// AD CARD (Premium Style)
// ===============================
async function createAdCard(ad) {
  const u = await getUserInfo(ad.userId);

  const div = document.createElement("div");
  div.className = "ad-card";

  const route =
    `${ad.fromRegion}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ` +
    `${ad.toRegion}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;

  const time = formatTime(ad.departureTime);

  div.innerHTML = `
    <img class="ad-avatar" src="${u.avatar || "https://i.ibb.co/2W0z7Lx/user.png"}">

    <div class="ad-main">

      <div class="ad-user-name">${escapeHtml(u.name || "Foydalanuvchi")}</div>

      <div class="ad-user-car">
        ${u.carModel ? u.carModel : ""}
        ${u.carColor ? " • " + u.carColor : ""}
        ${u.carNumber ? " • " + u.carNumber : ""}
      </div>

      <div class="ad-route">${escapeHtml(route)}</div>

      <div class="ad-details">
        <div class="ad-chip">💰 ${ad.price} so‘m</div>
        <div class="ad-chip">⏰ ${escapeHtml(time)}</div>
        ${ad.seatCount ? `<div class="ad-chip">👥 ${ad.seatCount} joy</div>` : ""}
      </div>
    </div>
  `;

  div.onclick = () => openAdModal(ad);
  return div;
}


// ===============================
// MODAL (Premium)
// ===============================
async function openAdModal(ad) {
  const modal = document.getElementById("adFullModal");
  modal.style.display = "flex";

  const u = await getUserInfo(ad.userId);

  const time = formatTime(ad.departureTime);
  const created = formatTime(ad.createdAt);

  const route =
    `${ad.fromRegion}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ` +
    `${ad.toRegion}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;

  modal.innerHTML = `
    <div class="ad-modal-box">

      <div class="ad-modal-header">
        <img class="ad-modal-avatar" src="${u.avatar || "https://i.ibb.co/2W0z7Lx/user.png"}">
        <div>
          <div class="ad-modal-name">${escapeHtml(u.name)}</div>
          <div class="ad-modal-car">
            ${u.carModel ? u.carModel : ""}
            ${u.carColor ? " • " + u.carColor : ""}
            ${u.carNumber ? " • " + u.carNumber : ""}
          </div>
        </div>
      </div>

      <div class="ad-block">
        <div class="ad-label">Yo‘nalish:</div>
        <div class="ad-text">${escapeHtml(route)}</div>
      </div>

      <div class="ad-block">
        <div class="ad-label">Jo‘nash vaqti:</div>
        <div class="ad-text">${escapeHtml(time)}</div>
      </div>

      <div class="ad-block">
        <div class="ad-label">Joy soni:</div>
        <div class="ad-text">${ad.seatCount || "-"}</div>
      </div>

      <div class="ad-block">
        <div class="ad-label">Narx:</div>
        <div class="ad-text">${ad.price} so‘m</div>
      </div>

      <div class="ad-block">
        <div class="ad-label">Izoh:</div>
        <div class="ad-text">${escapeHtml(ad.comment || "-")}</div>
      </div>

      <div class="ad-block">
        <div class="ad-label">Aloqa:</div>
        <div class="ad-text">${escapeHtml(u.phone || "-")}</div>
      </div>

      <button class="ad-contact-btn" onclick="closeAdModal()">Yopish</button>
    </div>
  `;
}


// ===============================
// CLOSE MODAL
// ===============================
window.closeAdModal = () => {
  const modal = document.getElementById("adFullModal");
  modal.style.display = "none";
};


// ===============================
// LOGOUT
// ===============================
window.logout = () => signOut(auth);


// ===============================
// HTML ESCAPE
// ===============================
function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
