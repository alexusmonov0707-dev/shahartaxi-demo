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
  loadAllAds();
});


// ===============================
// ALL ADS
// ===============================
async function loadAllAds() {
  const box = document.getElementById("allAds");
  box.innerHTML = "Yuklanmoqda...";

  const snap = await get(ref(db, "ads"));
  if (!snap.exists()) {
    box.innerHTML = "<p>Hozircha e’lonlar yo‘q.</p>";
    return;
  }

  box.innerHTML = "";

  snap.forEach(child => {
    const ad = child.val();

    const div = document.createElement("div");
    div.className = "ad-box";

    div.innerHTML = `
      <div class="ad-title">${ad.type}</div>

      <div class="ad-info">
        <b>${ad.fromRegion}</b>, ${ad.fromDistrict} → 
        <b>${ad.toRegion}</b>, ${ad.toDistrict}
      </div>

      <div class="ad-info">Narx: <b>${ad.price || "—"} so‘m</b></div>
      <div class="ad-info">Jo‘nash vaqti: ${ad.startTime || "—"}</div>

      <div class="ad-info">Izoh: ${ad.comment || "-"}</div>

      <small style="color:#777;">
        ${new Date(ad.createdAt).toLocaleString()}
      </small>
    `;

    box.appendChild(div);
  });
}


// ===============================
// LOGOUT
// ===============================
window.logout = () => signOut(auth);
