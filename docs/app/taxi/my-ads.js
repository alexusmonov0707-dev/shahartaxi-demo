// ===============================
// FIREBASE INIT
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  push,
  update,
  remove
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
// SHORTCUT
// ===============================
const $ = id => document.getElementById(id);

// ===============================
// FORMAT DATE
// ===============================
function formatDatetime(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  if (isNaN(d)) return dt;
  return d.toLocaleString("uz-UZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// ===============================
// GLOBALS
// ===============================
let editingAdId = null;

// ===============================
// AUTH → LOAD MY ADS
// ===============================
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "../auth/login.html";
    return;
  }
  window.currentUID = user.uid;
  loadMyAds();
  loadRegions();
});

// ===============================
// LOAD REGIONS
// ===============================
function loadRegions() {
  if (!window.regionsData) {
    console.warn("Regions data not loaded");
    return;
  }

  // edit modal – from
  editFromRegion.innerHTML = `<option value="">Viloyat</option>`;
  Object.keys(window.regionsData).forEach(r =>
    editFromRegion.innerHTML += `<option value="${r}">${r}</option>`
  );

  // edit modal – to
  editToRegion.innerHTML = `<option value="">Viloyat</option>`;
  Object.keys(window.regionsData).forEach(r =>
    editToRegion.innerHTML += `<option value="${r}">${r}</option>`
  );
}

// ===============================
// UPDATE EDIT-TUMAN
// ===============================
window.updateEditDistricts = type => {
  const regionId = type === "from" ? "editFromRegion" : "editToRegion";
  const districtId = type === "from" ? "editFromDistrict" : "editToDistrict";

  const region = $(regionId).value;
  const districtSelect = $(districtId);

  districtSelect.innerHTML = `<option value="">Tuman</option>`;

  if (!window.regionsData || !window.regionsData[region]) return;

  window.regionsData[region].forEach(t => {
    districtSelect.innerHTML += `<option value="${t}">${t}</option>`;
  });
};

// ===============================
// LOAD USER ADS
// ===============================
async function loadMyAds() {
  const snap = await get(ref(db, "ads"));
  const list = $("myAdsList");
  list.innerHTML = "Yuklanmoqda...";

  if (!snap.exists()) {
    list.innerHTML = "<p>Hozircha e’lon yo‘q.</p>";
    return;
  }

  list.innerHTML = "";

  snap.forEach(child => {
    const ad = child.val();
    if (ad.userId !== window.currentUID) return;

    const seatsInfo = ad.driverSeats
      ? `<b>Bo‘sh joy:</b> ${ad.driverSeats}`
      : ad.passengerCount
      ? `<b>Yo‘lovchilar:</b> ${ad.passengerCount}`
      : "";

    const box = document.createElement("div");
    box.className = "ad-box";

    box.innerHTML = `
      <b style="color:#0069d9;">${ad.type}</b><br>
      ${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict}<br>
      Narx: <b style="color:#28a745">${ad.price}</b><br>
      Vaqt: ${formatDatetime(ad.departureTime)}<br>
      ${seatsInfo}
      <div style="margin-top:10px; display:flex; gap:10px;">
        <button class="blue-btn" onclick='openEditAd("${child.key}", ${safeJSON(ad)})'>Tahrirlash</button>
        <button class="red-btn" onclick='deleteAd("${child.key}")'>O‘chirish</button>
      </div>
    `;

    list.appendChild(box);
  });
}

// JSON injection protection
function safeJSON(obj) {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}

// ===============================
// OPEN EDIT MODAL
// ===============================
window.openEditAd = function (id, ad) {
  editingAdId = id;

  loadRegions();

  editFromRegion.value = ad.fromRegion || "";
  updateEditDistricts("from");
  editFromDistrict.value = ad.fromDistrict || "";

  editToRegion.value = ad.toRegion || "";
  updateEditDistricts("to");
  editToDistrict.value = ad.toDistrict || "";

  editPrice.value = ad.price || "";
  editTime.value = ad.departureTime || "";
  editSeats.value = ad.driverSeats || ad.passengerCount || "";
  editComment.value = ad.comment || "";

  editAdModal.style.display = "flex";
};

// ===============================
// CLOSE EDIT
// ===============================
window.closeEditAd = () => {
  editAdModal.style.display = "none";
};

// ===============================
// SAVE EDIT
// ===============================
window.saveAdEdit = async function () {
  if (!editingAdId) return;

  const updates = {
    fromRegion: editFromRegion.value,
    fromDistrict: editFromDistrict.value,
    toRegion: editToRegion.value,
    toDistrict: editToDistrict.value,
    price: editPrice.value,
    departureTime: editTime.value,
    comment: editComment.value
  };

  const seats = editSeats.value;
  if (seats) {
    if (window.userRole === "driver") updates.driverSeats = seats;
    else updates.passengerCount = seats;
  }

  await update(ref(db, "ads/" + editingAdId), updates);

  alert("E’lon yangilandi!");
  closeEditAd();
  loadMyAds();
};

// ===============================
// DELETE
// ===============================
window.deleteAd = async id => {
  if (!confirm("Rostdan o‘chirilsinmi?")) return;
  await remove(ref(db, "ads/" + id));
  alert("O‘chirildi!");
  loadMyAds();
};
