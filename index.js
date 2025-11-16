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
// LOGIN STATE
// ===============================
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  loadAllAds();
});


// ===============================
// UNIVERSAL DATETIME FORMATTER
// ===============================
function formatTime(ad) {
  const raw =
    ad.departureTime ||     // yangi nom
    ad.startTime ||         // eski nom
    "";                     // yo‘q bo‘lsa

  if (!raw) return "—";

  // datetime-local → "2025-11-16T12:30"
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


// ===============================
// LOAD ALL ADS
// ===============================
async function loadAllAds() {
  const adsBox = document.getElementById("adsList");

  const snap = await get(ref(db, "ads"));
  if (!snap.exists()) {
    adsBox.innerHTML = "<p>E’lonlar mavjud emas.</p>";
    return;
  }

  adsBox.innerHTML = "";

  snap.forEach((child) => {
    const ad = child.val();

    const time = formatTime(ad);

    const div = document.createElement("div");
    div.style = `
      padding:12px;
      border:1px solid #ddd;
      border-radius:8px;
      margin-bottom:12px;
      background:#fbfcff;
    `;

    div.innerHTML = `
      <b>${ad.type}</b><br>
      ${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict}<br>
      Narx: <b>${ad.price || "-"} so‘m</b><br>
      Jo‘nash vaqti: ${time}<br>
      Izoh: ${ad.comment || "-"}<br>
      <small style="color:#777">${new Date(ad.createdAt).toLocaleString("uz-UZ")}</small>
    `;

    adsBox.appendChild(div);
  });
}


// ===============================
// LOGOUT
// ===============================
window.logout = function () {
  signOut(auth);
};
