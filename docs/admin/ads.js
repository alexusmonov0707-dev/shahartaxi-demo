import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  remove,
  get
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ===============================
//  FIREBASE CONFIG
// ===============================
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

let adsData = {};
let usersData = {};
let selectedAdId = null;

// ===============================
//  LOAD USERS (REQUIRED)
// ===============================
async function loadUsers() {
  const usersRef = ref(db, "users");
  const snap = await get(usersRef);
  if (snap.exists()) {
    usersData = snap.val();
  }
}

// ===============================
//  LOAD ADS
// ===============================
async function loadAds() {
  await loadUsers();

  const adsRef = ref(db, "ads");

  onValue(adsRef, (snapshot) => {
    adsData = snapshot.val() || {};
    renderAds();
  });
}

// ===============================
//  FORMAT DATE
// ===============================
function formatDate(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("uz-UZ");
}

// ===============================
//  RENDER ADS TO TABLE
// ===============================
function renderAds() {
  adsTable.innerHTML = "";

  Object.entries(adsData).forEach(([id, ad]) => {
    const user = usersData[ad.uid] || {};

    const route =
      `${ad.fromRegion || "-"} / ${ad.fromDistrict || "-"} → ` +
      `${ad.toRegion || "-"} / ${ad.toDistrict || "-"}`;

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>
        ${user.fullName || "Noma'lum"}<br>
        <small>${user.phone || "-"}</small>
      </td>

      <td>${route}</td>

      <td>${ad.price || "-"} so‘m</td>

      <td>${formatDate(ad.departureTime)}</td>

      <td>
        <button class="viewBtn" data-id="${id}">Ko‘rish</button>
        <button class="deleteBtn" data-id="${id}">Delete</button>
      </td>
    `;

    adsTable.appendChild(tr);
  });

  attachListeners();
}

// ===============================
//  ATTACH BUTTON EVENTS
// ===============================
function attachListeners() {
  document.querySelectorAll(".deleteBtn").forEach((btn) => {
    btn.addEventListener("click", () => deleteAd(btn.dataset.id));
  });

  document.querySelectorAll(".viewBtn").forEach((btn) => {
    btn.addEventListener("click", () => openModal(btn.dataset.id));
  });
}

// ===============================
//  DELETE AD
// ===============================
function deleteAd(id) {
  if (!confirm("O‘chirilsinmi?")) return;

  remove(ref(db, "ads/" + id))
    .then(() => alert("O‘chirildi"))
    .catch(console.error);
}

// ===============================
//  MODAL (TO‘LDIRIB BERAMAN)
// ===============================
const modal = document.getElementById("modal");
const closeBtn = document.getElementById("closeBtn");

// modal fields
const m_route = document.getElementById("m_route");
const m_price = document.getElementById("m_price");
const m_comment = document.getElementById("m_comment");
const m_created = document.getElementById("m_created");
const m_depart = document.getElementById("m_depart");
const m_seats = document.getElementById("m_seats");
const m_dseats = document.getElementById("m_dseats");

const m_avatar = document.getElementById("m_avatar");
const m_userName = document.getElementById("m_userName");
const m_userPhone = document.getElementById("m_userPhone");
const m_userRole = document.getElementById("m_userRole");

// ===============================
//  OPEN MODAL
// ===============================
function openModal(id) {
  selectedAdId = id;
  const ad = adsData[id];
  const user = usersData[ad.uid] || {};

  m_route.textContent =
    `${ad.fromRegion} / ${ad.fromDistrict} → ${ad.toRegion} / ${ad.toDistrict}`;

  m_price.textContent = ad.price + " so‘m";
  m_comment.textContent = ad.comment || "-";
  m_created.textContent = formatDate(ad.createdAt);
  m_depart.textContent = formatDate(ad.departureTime);

  m_seats.textContent = ad.seats || "-";
  m_dseats.textContent = ad.driverSeats || "-";

  m_userName.textContent = user.fullName || "-";
  m_userPhone.textContent = user.phone || "-";
  m_userRole.textContent = user.role || "-";
  m_avatar.src = user.avatar || "/assets/avatar.png";

  modal.style.display = "block";
}

closeBtn.addEventListener("click", () => {
  modal.style.display = "none";
});

// ===============================
//  SEARCH
// ===============================
searchInput.addEventListener("keyup", () => {
  const q = searchInput.value.toLowerCase();

  document.querySelectorAll("#adsTable tr").forEach((row) => {
    row.style.display = row.innerText.toLowerCase().includes(q)
      ? ""
      : "none";
  });
});

// START
loadAds();
