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


onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  loadRegionsFilter();
  loadAllAds();
});


// =========================
// REGIONS FOR FILTER
// =========================
function loadRegionsFilter() {
  const sel = document.getElementById("filterRegion");
  Object.keys(window.regionsData).forEach(r => {
    sel.innerHTML += `<option value="${r}">${r}</option>`;
  });
}


// =========================
// FORMAT TIME
// =========================
function formatTime(t) {
  if (!t) return "—";
  const d = new Date(t);
  if (isNaN(d)) return "—";
  return d.toLocaleString("uz-UZ", {
    month:"short", day:"numeric",
    hour:"2-digit", minute:"2-digit"
  });
}


// =========================
// LOAD ALL ADS
// =========================
async function loadAllAds() {
  const adsRef = ref(db, "ads");
  const snap = await get(adsRef);

  const list = document.getElementById("adsList");
  list.innerHTML = "";

  if (!snap.exists()) {
    list.innerHTML = "<p>E’lon yo‘q.</p>";
    return;
  }

  let adsRaw = [];
  snap.forEach(c => adsRaw.push({ id:c.key, ...c.val() }));

  // ❗ USER CACHE
  let userCache = {};

  let ads = [];
  for (const ad of adsRaw) {
    if (!userCache[ad.userId]) {
      const uSnap = await get(ref(db, "users/" + ad.userId));
      userCache[ad.userId] = uSnap.exists() ? uSnap.val() : {};
    }
    ad.user = userCache[ad.userId];
    ads.push(ad);
  }

  renderAds(ads);

  document.getElementById("search").oninput = () => renderAds(ads);
  document.getElementById("filterRole").onchange = () => renderAds(ads);
  document.getElementById("filterRegion").onchange = () => renderAds(ads);
}


// =========================
// RENDER ADS
// =========================
function renderAds(ads) {
  const list = document.getElementById("adsList");
  const q = document.getElementById("search").value.toLowerCase();
  const role = document.getElementById("filterRole").value;
  const region = document.getElementById("filterRegion").value;

  list.innerHTML = "";

  const filtered = ads.filter(a => {
    if (role && a.type !== role) return false;
    if (region && a.fromRegion !== region && a.toRegion !== region) return false;

    if (q) {
      const text = `${a.fromRegion} ${a.fromDistrict} ${a.toRegion} ${a.toDistrict} ${a.price} ${a.comment}`.toLowerCase();
      if (!text.includes(q)) return false;
    }

    return true;
  });

  if (!filtered.length) {
    list.innerHTML = "<p>Natija topilmadi.</p>";
    return;
  }

  filtered.forEach(a => list.appendChild(createAdCard(a)));
}


// =========================
// CREATE MINI CARD
// =========================
function createAdCard(ad) {
  const u = ad.user || {};
  const avatar = u.avatar || "https://raw.githubusercontent.com/rahmadiana/default-images/main/user-default.png";
  const name = u.fullName || "No name";

  const div = document.createElement("div");
  div.className = "ad-card";

  div.innerHTML = `
    <div class="ad-user">
      <img src="${avatar}">
      <div class="ad-user-name">${name}</div>
    </div>

    <div class="ad-type">${ad.type}</div>

    <div class="ad-route">
      ${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict}
    </div>

    <div class="ad-info">
      <div class="ad-chip">💰 ${ad.price || "-"} so‘m</div>
      <div class="ad-chip">⏰ ${formatTime(ad.departureTime)}</div>
    </div>
  `;

  return div;
}


// =========================
// LOGOUT
// =========================
window.logout = () => signOut(auth);
