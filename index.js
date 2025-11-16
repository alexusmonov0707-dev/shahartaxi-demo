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
// LOGIN TEKSHIRUV
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
// VILOYAT FILTRINI YUKLASH
// ===============================
function loadRegionsFilter() {
  const filterRegion = document.getElementById("filterRegion");

  Object.keys(window.regionsData).forEach(r => {
    filterRegion.innerHTML += `<option value="${r}">${r}</option>`;
  });
}


// ===============================
// VAQT FORMAT
// ===============================
function formatTime(t) {
  if (!t) return "—";

  // Standart HTML datetime-local format → OK
  // Lekin boshqa formatlar bo‘lsa → tozalaymiz
  let clean = t.replace("T", " ").replace("M", "-");

  const d = new Date(clean);
  if (isNaN(d)) return t;

  return d.toLocaleString("uz-UZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}


// ===============================
// E’LONLARNI YUKLASH
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
  snap.forEach(c => ads.push({ id: c.key, ...c.val() }));

  renderAds(ads);

  document.getElementById("search").oninput = () => renderAds(ads);
  document.getElementById("filterRole").onchange = () => renderAds(ads);
  document.getElementById("filterRegion").onchange = () => renderAds(ads);
}


// ===============================
// FILTRLASH VA CHIZISH
// ===============================
function renderAds(ads) {
  const list = document.getElementById("adsList");

  const q = document.getElementById("search").value.toLowerCase();
  const role = document.getElementById("filterRole").value;
  const region = document.getElementById("filterRegion").value;

  list.innerHTML = "";

  const filtered = ads.filter(a => {
    let ok = true;

    if (role && a.type !== role) ok = false;
    if (region && a.fromRegion !== region && a.toRegion !== region) ok = false;

    if (q) {
      const text = `
        ${a.type} 
        ${a.fromRegion} ${a.fromDistrict}
        ${a.toRegion} ${a.toDistrict}
        ${a.comment} ${a.price}
      `.toLowerCase();

      if (!text.includes(q)) ok = false;
    }

    return ok;
  });

  if (filtered.length === 0) {
    list.innerHTML = "<p>Natija topilmadi.</p>";
    return;
  }

  filtered.forEach(a => list.appendChild(createAdCard(a)));
}


// ===============================
// MINI-KARTA YARATISH
// ===============================
function createAdCard(ad) {
  const div = document.createElement("div");
  div.style = `
    padding:12px;
    margin-bottom:12px;
    background:white;
    border-radius:10px;
    border:1px solid #ddd;
    cursor:pointer;
  `;

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
// FULL MODAL OCHISH
// ===============================
function openAdModal(ad) {
  const modal = document.getElementById("adFullModal");
  const box = document.getElementById("adFullBox");

  box.innerHTML = `
    <h3 style="color:#0069d9;">E’lon tafsilotlari</h3>

    <p><b>${ad.type}</b></p>

    <p><b>Yo‘nalish:</b><br>
    ${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict}</p>

    <p><b>Jo‘nash vaqti:</b><br>
    ${formatTime(ad.departureTime)}</p>

    <p><b>Narx:</b> ${ad.price ? ad.price + " so‘m" : "-"}</p>

    <p><b>Qo‘shimcha izoh:</b><br>${ad.comment || "-"}</p>

    <button onclick="closeAdModal()"
      style="width:100%; background:#444; color:#fff; padding:10px;
      border:none; border-radius:8px; margin-top:10px;">Yopish</button>
  `;

  modal.style.display = "flex";
}

window.closeAdModal = () => {
  document.getElementById("adFullModal").style.display = "none";
};


// ===============================
// LOGOUT
// ===============================
window.logout = () => signOut(auth);
