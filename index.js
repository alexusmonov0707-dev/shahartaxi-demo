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

  loadRegions();
  loadAllAds();
});


// ===============================
// UNIVERSAL DATETIME FORMAT
// ===============================
function formatTime(ad) {
  const raw = ad.departureTime || ad.startTime || "";

  if (!raw) return "—";

  const d = new Date(raw);
  if (isNaN(d)) return raw;

  return d.toLocaleString("uz-UZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}


// =======================================
// LOAD REGIONS TO FILTER
// =======================================
function loadRegions() {
  const sel = document.getElementById("filterRegion");

  Object.keys(window.regionsData).forEach(region => {
    const opt = document.createElement("option");
    opt.value = region;
    opt.textContent = region;
    sel.appendChild(opt);
  });
}


// ===============================
// GLOBAL ADS CACHE
// ===============================
let allAds = [];


// ===============================
// LOAD ALL ADS (once)
// ===============================
async function loadAllAds() {
  const box = document.getElementById("adsList");

  const snap = await get(ref(db, "ads"));
  if (!snap.exists()) {
    box.innerHTML = "<p>E’lonlar mavjud emas.</p>";
    return;
  }

  allAds = [];

  snap.forEach(child => {
    allAds.push(child.val());
  });

  renderAds();
}


// ===============================
// RENDER ADS WITH FILTERS
// ===============================
function renderAds() {
  const box = document.getElementById("adsList");
  box.innerHTML = "";

  let list = [...allAds];

  // Qidiruv
  const q = document.getElementById("search").value.toLowerCase();
  if (q) {
    list = list.filter(ad =>
      (ad.fromRegion + " " + ad.fromDistrict + " " + ad.toRegion + " " + ad.toDistrict + " " +
       ad.price + " " + ad.comment)
      .toLowerCase()
      .includes(q)
    );
  }

  // Rol bo‘yicha filter
  const role = document.getElementById("filterRole").value;
  if (role) list = list.filter(ad => ad.type === role);

  // Viloyat filter
  const reg = document.getElementById("filterRegion").value;
  if (reg) list = list.filter(ad => ad.fromRegion === reg || ad.toRegion === reg);

  // Agar bo‘sh bo‘lsa
  if (list.length === 0) {
    box.innerHTML = "<p>Hech narsa topilmadi…</p>";
    return;
  }

  list.forEach(ad => {
    const div = document.createElement("div");
    div.style = `
      padding:12px; border:1px solid #ddd; border-radius:8px;
      margin-bottom:12px; background:#fbfcff;
    `;

    div.innerHTML = `
      <b>${ad.type}</b><br>
      ${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict}<br>
      Narx: <b>${ad.price || "-"} so‘m</b><br>
      Jo‘nash vaqti: ${formatTime(ad)}<br>
      Izoh: ${ad.comment || "-"}<br>
      <small style="color:#777">${new Date(ad.createdAt).toLocaleString("uz-UZ")}</small>
    `;

    box.appendChild(div);
  });
}


// ===============================
// FILTER EVENT BINDINGS
// ===============================
document.getElementById("search").oninput = renderAds;
document.getElementById("filterRole").onchange = renderAds;
document.getElementById("filterRegion").onchange = renderAds;


// ===============================
// LOGOUT
// ===============================
window.logout = () => signOut(auth);
