// ===============================
// FIREBASE INIT
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
  get
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
// LOGIN CHECK
// ===============================
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  loadRegionsFilter();
  loadAllAds();
});


// ===============================
// NORMALIZE FUNCTION (apostrof muammosini yechadi)
// ===============================
function norm(s) {
  if (!s) return "";
  return s.toString()
    .replace(/‘|’|`/g, "'")
    .trim()
    .toLowerCase();
}


// ===============================
// REGIONS FILTER
// ===============================
function loadRegionsFilter() {
  const filterRegion = document.getElementById("filterRegion");

  Object.keys(window.regionsData).forEach(r => {
    filterRegion.innerHTML += `<option value="${r}">${r}</option>`;
  });
}


// ===============================
// TIME FORMAT
// ===============================
function formatTime(t) {
  if (!t) return "—";
  const d = new Date(t);
  if (isNaN(d)) return t;
  return d.toLocaleString("uz-UZ", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}


// ===============================
// LOAD ADS
// ===============================
async function loadAllAds() {

  const snap = await get(ref(db, "ads"));
  const list = document.getElementById("adsList");

  if (!snap.exists()) {
    list.innerHTML = "<p>Hozircha e’lon yo‘q.</p>";
    return;
  }

  let ads = [];

  snap.forEach(child => {
    ads.push({ id: child.key, ...child.val() });
  });

  renderAds(ads);

  document.getElementById("search").oninput = () => renderAds(ads);
  document.getElementById("filterRole").onchange = () => renderAds(ads);
  document.getElementById("filterRegion").onchange = () => renderAds(ads);
}


// ===============================
// RENDER ADS
// ===============================
function renderAds(ads) {
  const list = document.getElementById("adsList");
  list.innerHTML = "";

  const search = norm(document.getElementById("search").value);
  const filterRole = norm(document.getElementById("filterRole").value);
  const filterRegion = norm(document.getElementById("filterRegion").value);

  const filtered = ads.filter(a => {
    const typeN = norm(a.type);
    const fromN = norm(a.fromRegion);
    const toN = norm(a.toRegion);

    if (filterRole && typeN !== filterRole) return false;

    if (filterRegion && fromN !== filterRegion && toN !== filterRegion)
      return false;

    if (search) {
      const text = `
        ${a.fromRegion} ${a.fromDistrict}
        ${a.toRegion} ${a.toDistrict}
        ${a.comment} ${a.price}
      `.toLowerCase();

      if (!text.includes(search)) return false;
    }

    return true;
  });

  if (!filtered.length) {
    list.innerHTML = "<p>Natija topilmadi.</p>";
    return;
  }

  filtered.forEach(ad => list.appendChild(createAdCard(ad)));
}


// ===============================
// CREATE MINI CARD
// ===============================
function createAdCard(ad) {
  const div = document.createElement("div");
  div.className = "ad-card";

  div.innerHTML = `
    <b style="color:#0069d9">${ad.type}</b><br>
    ${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict}<br>
    <b>${ad.price ? ad.price + " so‘m" : "Narx ko‘rsatilmagan"}</b><br>
    <small style="color:#777">Jo‘nash: ${formatTime(ad.departureTime)}</small>
  `;

  div.onclick = () => openAdModal(ad);
  return div;
}


// ===============================
// FULL MODAL
// ===============================
function openAdModal(ad) {
  let modal = document.getElementById("adFullModal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "adFullModal";
    modal.style = `
      position:fixed; inset:0;
      background:rgba(0,0,0,0.6);
      display:flex; justify-content:center; align-items:center;
      z-index:9999;
    `;
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div style="
      background:white; padding:20px;
      border-radius:12px; width:350px;
    ">
      <h3 style="color:#0069d9;">E’lon tafsilotlari</h3>

      <p><b>${ad.type}</b></p>

      <p><b>Yo‘nalish:</b><br>
      ${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict}</p>

      <p><b>Jo‘nash vaqti:</b> ${formatTime(ad.departureTime)}</p>

      <p><b>Narx:</b> ${ad.price || "-"}</p>

      <p><b>Izoh:</b><br>${ad.comment || "-"}</p>

      <button onclick="closeAdModal()"
        style="width:100%; background:#444; color:#fff; padding:10px; border:none;
          border-radius:8px; margin-top:10px;">
        Yopish
      </button>
    </div>
  `;

  modal.style.display = "flex";
}

window.closeAdModal = function () {
  const modal = document.getElementById("adFullModal");
  if (modal) modal.style.display = "none";
};


// ===============================
// LOGOUT
// ===============================
window.logout = () => signOut(auth);
