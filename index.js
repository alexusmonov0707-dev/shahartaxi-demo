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

const REGIONS = window.regionsData || window.regions || {};


// ===============================
// HELPERS
// ===============================
function normalize(text) {
  if (!text) return "";
  return text.toString().toLowerCase().replace(/[’‘`ʼ']/g, "'");
}

function formatTime(t) {
  if (!t) return "—";
  if (typeof t === "number") {
    return new Date(t).toLocaleString("uz-UZ", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }
  let d = new Date(t);
  if (!isNaN(d)) {
    return d.toLocaleString("uz-UZ", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }
  return t;
}


// ===============================
// AUTH CHECK
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
// FILL REGION FILTER
// ===============================
function loadRegionsFilter() {
  const reg = document.getElementById("filterRegion");
  Object.keys(REGIONS).forEach(r => {
    reg.innerHTML += `<option value="${r}">${r}</option>`;
  });
}


// ===============================
// LOAD ALL ADS
// ===============================
async function loadAllAds() {
  const snap = await get(ref(db, "ads"));
  const list = document.getElementById("adsList");
  list.innerHTML = "";

  if (!snap.exists()) {
    list.innerHTML = "<p>Hozircha e’lon yo‘q</p>";
    return;
  }

  let ads = [];
  snap.forEach(c => ads.push({ id: c.key, ...c.val() }));

  document.getElementById("search").oninput = () => renderAds(ads);
  document.getElementById("filterRole").onchange = () => renderAds(ads);
  document.getElementById("filterRegion").onchange = () => renderAds(ads);

  renderAds(ads);
}


// ===============================
// FILTER + RENDER
// ===============================
function renderAds(ads) {
  const list = document.getElementById("adsList");
  list.innerHTML = "";

  const q = normalize(document.getElementById("search").value);
  const role = normalize(document.getElementById("filterRole").value);
  const region = document.getElementById("filterRegion").value;

  const filtered = ads.filter(ad => {
    if (role && normalize(ad.type) !== role) return false;
    if (region && ad.fromRegion !== region && ad.toRegion !== region) return false;

    if (q) {
      const hay = `
        ${ad.fromRegion} ${ad.fromDistrict}
        ${ad.toRegion} ${ad.toDistrict}
        ${ad.comment} ${ad.price}
      `.toLowerCase();
      if (!hay.includes(q)) return false;
    }

    return true;
  });

  filtered.forEach(ad => list.appendChild(createAdCard(ad)));
}


// ===============================
// MINI CARD
// ===============================
function getPhoto(ad) {
  return ad.photo || ad.img || ad.image || ad.photoUrl || ad.avatar ||
    ad.userPhoto || ad.profileImage ||
    "https://cdn-icons-png.flaticon.com/512/149/149071.png";
}

function getPhone(ad) {
  return ad.ownerPhone || ad.phone || ad.userPhone || ad.contact || ad.number ||
    (ad.comment && ad.comment.match(/[0-9]{6,12}/)?.[0]) || "—";
}

function createAdCard(ad) {
  const div = document.createElement("div");
  div.className = "ad-card";

  const route = `${ad.fromRegion}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ${ad.toRegion}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;

  const seats = ad.seatCount ? ad.seatCount + " joy" : "";
  const time = formatTime(ad.departureTime);

  div.innerHTML = `
    <div style="display:flex;gap:12px;">
      <img src="${getPhoto(ad)}"
         style="width:55px;height:55px;border-radius:50%;object-fit:cover;border:1px solid #ddd;">
      <div style="flex:1">
        <div class="ad-route">${route}</div>
        <div class="ad-info">
          <div>⏰ ${time}</div>
          ${seats ? `<div>👥 ${seats}</div>` : ""}
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
async function openAdModal(ad) {
  const userSnap = await get(ref(db, "users/" + ad.userId));
  let user = userSnap.val() || {};

  let fullName =
    user.fullName ||
    (user.name ? user.name + " " + (user.surname || "") : "Foydalanuvchi");

  let phone = getPhone(ad);

  let modal = document.getElementById("adFullModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "adFullModal";
    modal.style = `
      position:fixed; inset:0;
      background:rgba(0,0,0,0.6);
      display:flex; justify-content:center; align-items:center;`;
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div style="background:white;padding:20px;border-radius:12px;max-width:500px;width:95%;">
      <div style="display:flex;gap:15px;">
        <img src="${getPhoto(ad)}" style="width:70px;height:70px;border-radius:50%;object-fit:cover;">
        <div>
          <div style="font-size:18px;font-weight:bold;">${fullName}</div>
          <div>${user.carModel || ad.carModel || ""}</div>
        </div>
      </div>

      <p><b>Yo‘nalish:</b><br>
      ${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict}</p>

      <p><b>Jo‘nash vaqti:</b><br>${formatTime(ad.departureTime)}</p>

      <p><b>Narx:</b> ${ad.price ? ad.price + " so‘m" : "-"}</p>

      <p><b>Joy soni:</b> ${ad.seatCount || "-"}</p>

      <p><b>Izoh:</b><br>${ad.comment || "-"}</p>

      <p><b>Kontakt:</b> <span style="font-size:18px;">${phone}</span></p>

      <button onclick="closeAdModal()"
        style="width:100%;padding:10px;background:#333;color:white;border-radius:8px;margin-top:10px;">
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
