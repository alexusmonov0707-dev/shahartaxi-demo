
// ======================
// FIREBASE INIT
// ======================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase,
  ref,
  get
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { regionsData } from "./lib.js";   // viloyat/tumanlar lib fayldan




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

const adsBox = document.getElementById("adsBox");



// ========================
// FORMAT DATETIME
// ========================
function formatDate(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  return d.toLocaleString("uz-UZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}



// ========================
// LOAD ADS
// ========================
async function loadAds(userRole) {
  const snap = await get(ref(db, "ads"));
  adsBox.innerHTML = "";

  if (!snap.exists()) {
    adsBox.innerHTML = "<p>Hozircha hech qanday e’lon yo‘q.</p>";
    return;
  }

  const opposite = userRole === "driver" ? "Yo‘lovchi" : "Haydovchi";

  snap.forEach(c => {
    const ad = c.val();

    // 1️⃣ Faqat tasdiqlangan e’lonlar
    if (!ad.approved) return;

    // 2️⃣ Qarama-qarshi turdagi elonlar
    if (ad.type !== opposite) return;

    const seatsInfo = ad.driverSeats
      ? `<b>Bo‘sh joylar:</b> ${ad.driverSeats}`
      : ad.passengerCount
      ? `<b>Yo‘lovchilar:</b> ${ad.passengerCount}`
      : "";

    const div = document.createElement("div");
    div.className = "ad-item-box";
    div.style = `
      border:1px solid #ddd;
      padding:14px;
      margin-bottom:12px;
      border-radius:10px;
      background:#f9faff;
    `;

    div.innerHTML = `
      <div style="font-weight:bold; font-size:18px; color:#0069d9;">
        ${ad.type}
      </div>

      <div style="margin-top:6px;">
        <b>Yo‘nalish:</b><br>
        ${ad.fromRegion || "-"}, ${ad.fromDistrict || "-"} →
        ${ad.toRegion || "-"}, ${ad.toDistrict || "-"}
      </div>

      <div style="margin-top:6px;">
        <b>Narx:</b> <span style="color:#28a745; font-weight:bold;">${ad.price} so‘m</span>
      </div>

      <div style="margin-top:6px;">
        <b>Jo‘nash vaqti:</b> ${formatDate(ad.departureTime)}
      </div>

      <div style="margin-top:6px;">${seatsInfo}</div>

      <div style="margin-top:10px; font-size:13px; color:#777;">
        ${formatDate(ad.createdAt)}
      </div>
    `;

    adsBox.appendChild(div);
  });
}



// ========================
// AUTH CHECK
// ========================
onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "../../login.html";
    return;
  }

  // USER PROFILINI OLISH
  const userSnap = await get(ref(db, "users/" + user.uid));
  if (!userSnap.exists()) return;

  const me = userSnap.val();
  const myRole = me.role || "passenger";

  loadAds(myRole);
});
