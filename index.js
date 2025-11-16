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

// REGION LIST
const REGIONS = window.regionsData || window.regions || {};

// Helper — apostroflarni normallashtirish
function normalize(str) {
  if (!str) return "";
  return String(str).toLowerCase().replace(/[‘’`ʼ']/g, "'");
}

// Vaqt format
function formatTime(raw) {
  if (!raw) return "—";

  if (typeof raw === "number") {
    return new Date(raw).toLocaleString("uz-UZ", {
      hour: "2-digit",
      minute: "2-digit",
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  let d = new Date(raw);
  if (!isNaN(d)) {
    return d.toLocaleString("uz-UZ", {
      hour: "2-digit",
      minute: "2-digit",
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  return raw;
}

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
// LOAD REGIONS
// ===============================
function loadRegionsFilter() {
  const reg = document.getElementById("filterRegion");
  Object.keys(REGIONS).forEach(r => {
    reg.innerHTML += `<option value="${r}">${r}</option>`;
  });
}

// ===============================
// LOAD ADS
// ===============================
async function loadAllAds() {
  const adsRef = ref(db, "ads");
  const snap = await get(adsRef);

  const list = document.getElementById("adsList");
  list.innerHTML = "";

  if (!snap.exists()) {
    list.innerHTML = "<p>Hozircha e’lon yo‘q.</p>";
    return;
  }

  let ads = [];
  snap.forEach(c => {
    ads.push({ id: c.key, ...c.val() });
  });

  // Filter events
  document.getElementById("search").oninput = () => renderAds(ads);
  document.getElementById("filterRole").onchange = () => renderAds(ads);
  document.getElementById("filterRegion").onchange = () => renderAds(ads);

  renderAds(ads);
}

// ===============================
// RENDER ADS
// ===============================
function renderAds(ads) {
  const list = document.getElementById("adsList");
  list.innerHTML = "";

  const q = normalize(document.getElementById("search").value);
  const roleFilter = normalize(document.getElementById("filterRole").value);
  const regionFilter = document.getElementById("filterRegion").value;

  const filtered = ads.filter(a => {
    // Type filter (but NOT shown)
    if (roleFilter) {
      let t = normalize(a.type);
      if (!t.includes(roleFilter)) return false;
    }

    // Region filter
    if (regionFilter) {
      if (a.fromRegion !== regionFilter && a.toRegion !== regionFilter) return false;
    }

    // Search
    if (q) {
      const txt = `
        ${a.fromRegion} ${a.fromDistrict}
        ${a.toRegion} ${a.toDistrict}
        ${a.comment} ${a.price}
        ${a.userName} ${a.carModel}
      `.toLowerCase();
      if (!txt.includes(q)) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    list.innerHTML = "<p>Natija topilmadi.</p>";
    return;
  }

  filtered.forEach(a => list.appendChild(createAdCard(a)));
}

// ===============================
// CREATE MINI CARD
// ===============================
function createAdCard(ad) {
  const div = document.createElement("div");
  div.className = "ad-card";

  const photo =
    ad.photo ||
    ad.photoUrl ||
    ad.userPhoto ||
    "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  const route = `${ad.fromRegion}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ${ad.toRegion}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;

  const time = formatTime(ad.departureTime);

  const seats = ad.seatCount ? `${ad.seatCount} joy` : "";

  div.innerHTML = `
    <div style="display:flex; gap:12px; align-items:flex-start;">
      <img src="${photo}" style="width:55px;height:55px;border-radius:8px;object-fit:cover;border:1px solid #ddd;" />

      <div style="flex:1">
        <div class="ad-route">${route}</div>

        <div class="ad-info">
          <div><span class="icon">⏰</span> ${time}</div>
          ${seats ? `<div><span class="icon">👥</span> ${seats}</div>` : ""}
        </div>
      </div>

      <div class="ad-chip">${ad.price ? ad.price + " so‘m" : "-"}</div>
    </div>
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

  const photo =
    ad.photo ||
    ad.photoUrl ||
    ad.userPhoto ||
    "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  const time = formatTime(ad.departureTime);
  const created = formatTime(ad.createdAt);
  const seats = ad.seatCount ? `${ad.seatCount} joy` : "";
  const phone = ad.ownerPhone || ad.phone || ad.userPhone || "—";

  modal.innerHTML = `
    <div style="background:white;padding:20px;border-radius:12px;width:95%;max-width:500px;">
      
      <div style="display:flex;gap:12px;margin-bottom:14px;">
        <img src="${photo}" style="width:60px;height:60px;border-radius:10px;object-fit:cover;">
        <div>
          <div style="font-weight:bold;font-size:18px;">${ad.userName || "Foydalanuvchi"}</div>
          <div style="font-size:14px;color:#666">${ad.carModel || ""}</div>
        </div>
      </div>

      <p><b>Yo'nalish:</b><br>${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict}</p>

      <p><b>Jo‘nash vaqti:</b><br>${time}</p>

      <p><b>Narx:</b> ${ad.price ? ad.price + " so‘m" : "-"}</p>

      ${seats ? `<p><b>Joy soni:</b> ${seats}</p>` : ""}

      <p><b>Izoh:</b><br>${ad.comment || "-"}</p>

      <p><b>Kontakt:</b> ${phone}</p>

      <p style="color:#777;"><small>Joylangan: ${created}</small></p>

      <button onclick="closeAdModal()" style="width:100%;background:#333;color:white;padding:10px;border-radius:8px;margin-top:10px;">Yopish</button>
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
