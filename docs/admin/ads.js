import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  remove,
  get
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCEt1WvUX0nJDS8NnSgKPXDYgoisW5uSxg",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
  projectId: "shahartaxi-demo",
  storageBucket: "shahartaxi-demo.appspot.com",
  messagingSenderId: "633894055386",
  appId: "1:633894055386:web:0b12a671a9b16b9035f6b1"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const adsTable = document.getElementById("adsTable");
const searchInput = document.getElementById("search");

// Modal elementlari
const modal = document.getElementById("modal");
const closeBtn = document.getElementById("closeBtn");
const deleteBtn = document.getElementById("deleteBtn");

// Modal ichiga joylashtiriladigan elementlar
const m_route = document.getElementById("m_route");
const m_depart = document.getElementById("m_depart");
const m_price = document.getElementById("m_price");
const m_seats = document.getElementById("m_seats");
const m_dseats = document.getElementById("m_dseats");
const m_comment = document.getElementById("m_comment");
const m_created = document.getElementById("m_created");

const m_avatar = document.getElementById("m_avatar");
const m_userName = document.getElementById("m_userName");
const m_userPhone = document.getElementById("m_userPhone");
const m_userRole = document.getElementById("m_userRole");

let adsData = {};
let usersData = {};
let selectedAdId = null;

// ===============================
// 🔥 E’LONLARNI YUKLASH
// ===============================
async function loadAds() {
  const adsRef = ref(db, "ads");
  const usersRef = ref(db, "users");

  const usersSnap = await get(usersRef);
  if (usersSnap.exists()) usersData = usersSnap.val();

  onValue(adsRef, (snap) => {
    adsData = snap.val() || {};
    renderAds();
  });
}

// ===============================
// 🔥 E’LONLARNI CHIZISH
// ===============================
function renderAds() {
  adsTable.innerHTML = "";

  Object.entries(adsData).forEach(([adId, ad]) => {
    const user = usersData[ad.uid] || {};

    const route =
      `${ad.fromRegion || "-"} / ${ad.fromDistrict || "-"} → ` +
      `${ad.toRegion || "-"} / ${ad.toDistrict || "-"}`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        ${user.fullName || "Noma'lum"} <br>
        <small>${user.phone || "-"}</small>
      </td>

      <td>${route}</td>
      <td>${ad.price || "-"} so‘m</td>
      <td>${formatDate(ad.departureTime)}</td>

      <td>
        <button class="viewBtn" data-id="${adId}">Ko‘rish</button>
        <button class="deleteBtn" data-id="${adId}">Delete</button>
      </td>
    `;

    adsTable.appendChild(tr);
  });

  attachEventListeners();
}

// ===============================
// 🔥 LISTENERLARNI BOG‘LASH
// ===============================
function attachEventListeners() {
  document.querySelectorAll(".viewBtn").forEach((btn) => {
    btn.addEventListener("click", () => openModal(btn.dataset.id));
  });

  document.querySelectorAll(".deleteBtn").forEach((btn) => {
    btn.addEventListener("click", () => deleteAd(btn.dataset.id));
  });
}

// ===============================
// 🔥 MODALNI OCHISH
// ===============================
function openModal(adId) {
  selectedAdId = adId;
  const ad = adsData[adId];
  const user = usersData[ad.uid] || {};

  const route =
    `${ad.fromRegion || "-"} / ${ad.fromDistrict || "-"} → ` +
    `${ad.toRegion || "-"} / ${ad.toDistrict || "-"}`;

  m_route.textContent = route;
  m_depart.textContent = formatDate(ad.departureTime);
  m_price.textContent = ad.price + " so‘m";
  m_seats.textContent = ad.seats || "-";
  m_dseats.textContent = ad.driverSeats || "-";
  m_comment.textContent = ad.comment || "-";
  m_created.textContent = formatDate(ad.createdAt);

  m_avatar.src = user.avatar || "/assets/avatar.png";
  m_userName.textContent = user.fullName || "-";
  m_userPhone.textContent = user.phone || "-";
  m_userRole.textContent = user.role || "-";

  modal.style.display = "block";
}

// ===============================
// 🔥 E’LONNI O‘CHIRISH
// ===============================
function deleteAd(adId) {
  if (!confirm("Rostdan ham o‘chirilsinmi?")) return;

  remove(ref(db, "ads/" + adId))
    .then(() => {
      alert("O‘chirildi!");
    })
    .catch((err) => console.error(err));
}

deleteBtn.addEventListener("click", () => {
  if (selectedAdId) deleteAd(selectedAdId);
  modal.style.display = "none";
});

// ===============================
// 🔥 MODALNI YOPISH
// ===============================
closeBtn.addEventListener("click", () => {
  modal.style.display = "none";
});

// ===============================
// 🔍 QIDIRUV
// ===============================
function searchAds() {
  const keyword = searchInput.value.toLowerCase();

  document.querySelectorAll("#adsTable tr").forEach((row) => {
    row.style.display = row.innerText.toLowerCase().includes(keyword)
      ? ""
      : "none";
  });
}

// ===============================
// 🕒 SANANI FORMAT QILISH
// ===============================
function formatDate(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("uz-UZ");
}

// Boshlash
loadAds();
