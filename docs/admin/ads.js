// ==================== FIREBASE ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  remove,
  get
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyC8F5vJmOgpbHm8ViEXIou8I1vSnDNXeVA",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
  projectId: "shahartaxi-demo",
  storageBucket: "shahartaxi-demo.appspot.com",
  messagingSenderId: "450810691220",
  appId: "1:450810691220:web:d214b47451f6216f95180f",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);


// ==================== HMTL ELEMENTS ====================
const adsTable = document.getElementById("adsTable");
const searchInput = document.getElementById("searchInput");

const modal = document.getElementById("modal");
const modalContent = document.getElementById("modal-content");


// ==================== LOAD ADS ====================
async function loadAds() {
  const adsRef = ref(db, "ads");
  const usersRef = ref(db, "users");

  const [adsSnap, usersSnap] = await Promise.all([get(adsRef), get(usersRef)]);

  const adsData = adsSnap.val() || {};
  const usersData = usersSnap.val() || {};

  adsTable.innerHTML = "";

  Object.entries(adsData).forEach(([userId, userAds]) => {
    Object.entries(userAds).forEach(([adId, ad]) => {
      const user = usersData[userId] || {};
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${user.fullName || "Noma'lum"}<br><small>${user.phone || ""}</small></td>

        <td>${ad.fromRegion || "-"} / ${ad.fromDistrict || "-"} → 
            ${ad.toRegion || "-"} / ${ad.toDistrict || "-"}</td>

        <td>${ad.price ? ad.price + " so‘m" : "-"}</td>

        <td>${ad.createdAt ? new Date(ad.createdAt).toLocaleString() : "-"}</td>

        <td>
          <button class="btn btn-primary" onclick="openModal('${userId}', '${adId}')">Ko‘rish</button>
          <button class="btn btn-danger" onclick="deleteAd('${userId}', '${adId}')">Delete</button>
        </td>
      `;

      adsTable.appendChild(tr);
    });
  });
}

loadAds();


// ==================== SEARCH ====================
searchInput.addEventListener("keyup", () => {
  const q = searchInput.value.toLowerCase();
  Array.from(adsTable.children).forEach(row => {
    row.style.display = row.innerText.toLowerCase().includes(q) ? "" : "none";
  });
});


// ==================== MODAL OPEN (GLOBAL) ====================
window.openModal = function (userId, adId) {
  get(ref(db, `ads/${userId}/${adId}`)).then((snap) => {
    const ad = snap.val();
    modalContent.innerHTML = `
      <h3>E'lon tafsilotlari</h3>
      <p><b>Izoh:</b> ${ad.comment || "-"}</p>

      <p><b>Yo'nalish:</b> 
      ${ad.fromRegion || "-"} / ${ad.fromDistrict || "-"} →
      ${ad.toRegion || "-"} / ${ad.toDistrict || "-"}</p>

      <p><b>Narx:</b> ${ad.price ? ad.price + " so‘m" : "-"}</p>

      <p><b>Ketish vaqti:</b> ${ad.departureTime || "-"}</p>
      <p><b>Joylar:</b> ${ad.seats || "-"}</p>

      <hr>

      <button class="btn btn-danger" onclick="deleteAd('${userId}', '${adId}')">E'lonni o‘chirish</button>
      <button class="btn btn-secondary" onclick="closeModal()">Yopish</button>
    `;

    modal.style.display = "flex";
  });
};


// ==================== MODAL CLOSE (GLOBAL) ====================
window.closeModal = function () {
  modal.style.display = "none";
};


// ==================== DELETE AD (GLOBAL) ====================
window.deleteAd = async function (userId, adId) {
  const ok = confirm("E'lonni o‘chirasizmi?");
  if (!ok) return;

  await remove(ref(db, `ads/${userId}/${adId}`));

  closeModal();
  await loadAds();
};
