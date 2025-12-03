// =======================
// FIREBASE INIT
// =======================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "SENIKI",
  authDomain: "SENIKI",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
  projectId: "SENIKI",
  storageBucket: "SENIKI",
  messagingSenderId: "SENIKI",
  appId: "SENIKI",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

let CURRENT_USER = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const snap = await get(ref(db, "users/" + user.uid));
  CURRENT_USER = snap.val();

  console.log("User:", CURRENT_USER);

  loadAds();
});

// =======================
// ADS LOADING
// =======================
async function loadAds() {
  const adsRef = ref(db, "ads");
  const snapshot = await get(adsRef);

  const adsList = document.getElementById("adsList");
  adsList.innerHTML = "";

  if (!snapshot.exists()) {
    adsList.innerHTML = "E‘lonlar topilmadi";
    return;
  }

  const allAds = snapshot.val();

  for (const uid in allAds) {
    for (const adId in allAds[uid]) {
      const ad = allAds[uid][adId];

      const userSnap = await get(ref(db, "users/" + uid));
      const userData = userSnap.val();

      if (!userData) continue;

      const driverInfo = userData.driverInfo || {};

      renderAd(ad, userData, driverInfo);
    }
  }
}

// =======================
// CARD RENDER
// =======================
function renderAd(ad, user, driverInfo) {
  const adsList = document.getElementById("adsList");

  const carModel = driverInfo.carModel || "-";
  const createdDate = new Date(ad.createdAt).toLocaleString();

  const div = document.createElement("div");
  div.className = "ad-card";

  div.innerHTML = `
    <div class="ad-left">
      <img src="${user.avatar?.startsWith("http") ? user.avatar : "https://i.ibb.co/PGT8x4G/user.png"}">
    </div>

    <div class="ad-center">
      <div class="route">
        ${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict}
      </div>

      <div class="meta">
        🚗 ${carModel} <br>
        🕒 ${createdDate}
      </div>
    </div>

    <div class="ad-right">
      <div class="price">${ad.price} so‘m</div>
      <button class="btn" onclick="openModal('${user.uid}','${ad.createdAt}')">
        Ko‘rish
      </button>
    </div>
  `;

  adsList.appendChild(div);
}

// =======================
// MODAL
// =======================
window.openModal = async function (uid, createdAt) {
  const userSnap = await get(ref(db, "users/" + uid));
  const user = userSnap.val();

  let selectedAd = null;

  const adsSnap = await get(ref(db, "ads/" + uid));
  const ads = adsSnap.val();

  for (const id in ads) {
    if (String(ads[id].createdAt) === String(createdAt)) {
      selectedAd = ads[id];
    }
  }

  const d = user.driverInfo || {};

  document.getElementById("adFullModal").innerHTML = `
    <div class="modal-box">
      <h2>${user.fullName}</h2>

      <img src="${user.avatar?.startsWith("http") ? user.avatar : "https://i.ibb.co/PGT8x4G/user.png"}">

      <p><b>Telefon:</b> ${user.phone}</p>

      <p><b>Yo‘nalish:</b>
        ${selectedAd.fromRegion}, ${selectedAd.fromDistrict}
        →
        ${selectedAd.toRegion}, ${selectedAd.toDistrict}
      </p>

      <p><b>Jo‘nash vaqti:</b> ${new Date(selectedAd.departureTime).toLocaleString()}</p>

      <hr>

      <p><b>Mashina rusumi:</b> ${d.carModel || "-"}</p>
      <p><b>Mashina rangi:</b> ${d.carColor || "-"}</p>
      <p><b>Mashina raqami:</b> ${d.carNumber || "-"}</p>

      <hr>

      <p><b>Narx:</b> ${selectedAd.price} so‘m</p>
      <p><b>E’lon joylangan:</b> ${new Date(selectedAd.createdAt).toLocaleString()}</p>

      <p><b>Izoh:</b> ${selectedAd.comment || "-"}</p>

      <a href="tel:${user.phone}" class="btn">Qo‘ng‘iroq</a>
      <button class="btn dark" onclick="closeModal()">Yopish</button>
    </div>
  `;

  document.getElementById("adFullModal").style.display = "flex";
};

window.closeModal = function () {
  document.getElementById("adFullModal").style.display = "none";
};
