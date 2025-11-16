// ===============================
// FIREBASE INIT
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getDatabase, ref, get
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
onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  await loadUserRole(user.uid);
  loadAds();
});


let CURRENT_ROLE = ""; // Haydovchi / Yo‘lovchi


// ===============================
// USER ROLE YUKLASH
// ===============================
async function loadUserRole(uid) {
  const snap = await get(ref(db, "users/" + uid));
  if (snap.exists()) CURRENT_ROLE = snap.val().role || "passenger";
}


// ===============================
// TIME FORMAT FUNCTION
// ===============================
function formatTime(dt) {
  if (!dt) return "—";

  // Chrome formatini to‘g‘rilaymiz
  if (dt.includes("T")) {
    const d = new Date(dt);
    return d.toLocaleString("uz-UZ", {
      year:"numeric", month:"long", day:"numeric",
      hour:"2-digit", minute:"2-digit"
    });
  }

  return dt;
}


// ===============================
// AD CARD CREATOR
// ===============================
function createAdCard(ad) {
  const div = document.createElement("div");
  div.className = "ad-card";
  div.innerHTML = `
    <div class="ad-top">
      <div style="font-size:14px; color:#555;">${ad.type}</div>
      <span class="price">${ad.price ? ad.price + " so‘m" : "—"}</span>
    </div>

    <div class="route">
      ${ad.fromRegion}, ${ad.fromDistrict}
      <span class="arrow">→</span>
      ${ad.toRegion}, ${ad.toDistrict}
    </div>

    <div class="time">⏰ ${formatTime(ad.departureTime)}</div>
  `;

  div.onclick = () => openAdModal(ad);
  return div;
}


// ===============================
// BARCHA E’LONLARNI YUKLASH
// ===============================
async function loadAds() {
  const adsBox = document.getElementById("adsList");
  adsBox.innerHTML = "Yuklanmoqda...";

  const snap = await get(ref(db, "ads"));
  if (!snap.exists()) {
    adsBox.innerHTML = "<p>E’lon yo‘q.</p>";
    return;
  }

  adsBox.innerHTML = "";

  snap.forEach(child => {
    const ad = child.val();

    // faqat o‘z roliga mos elonlar chiqadi
    if (ad.type !== (CURRENT_ROLE === "driver" ? "Haydovchi" : "Yo‘lovchi")) return;

    adsBox.appendChild(createAdCard(ad));
  });
}


// ===============================
// FULL MODAL OCHISH
// ===============================
window.openAdModal = function (ad) {
  const modal = document.getElementById("adFullModal");
  const box = document.getElementById("adFullBox");

  box.innerHTML = `
      <h3>${ad.type} e’loni</h3>

      <p><b>Yo‘nalish:</b><br>
      ${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict}</p>

      <p><b>Narx:</b> ${ad.price || "—"} so‘m</p>

      <p><b>Jo‘nash vaqti:</b><br> ${formatTime(ad.departureTime)}</p>

      <p><b>Izoh:</b><br> ${ad.comment || "—"}</p>

      <button class="close-btn" onclick="closeAdModal()">Yopish</button>
  `;

  modal.style.display = "flex";
};

window.closeAdModal = function () {
  document.getElementById("adFullModal").style.display = "none";
};


// ===============================
// LOGOUT
// ===============================
window.logout = () => signOut(auth);
