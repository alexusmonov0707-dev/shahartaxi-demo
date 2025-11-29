// ================================================
// IMPORTS
// ================================================
import {
  db, ref, get, child, onValue,
  auth, signOut
} from "../../lib/lib.js";   // sizning lib yo‘li shu (kerak bo‘lsa almashtiramiz)


// ================================================
// HTML ELEMENTLAR
// ================================================
const searchInput = document.getElementById("search");
const sortSelect = document.getElementById("sortBy");
const dateFilter = document.getElementById("filterDate");
const priceMin = document.getElementById("priceMin");
const priceMax = document.getElementById("priceMax");
const roleFilter = document.getElementById("filterRole");

const fromRegion = document.getElementById("fromRegion");
const toRegion = document.getElementById("toRegion");
const fromDistrictBox = document.getElementById("fromDistrictBox");
const toDistrictBox = document.getElementById("toDistrictBox");

const adsList = document.getElementById("adsList");
const pagination = document.getElementById("pagination");

const resetFiltersBtn = document.getElementById("resetFiltersBtn");


// ================================================
// GLOBAL VARIABLES
// ================================================
let ADS = [];
let filteredADS = [];

let perPage = 10;
let currentPage = 1;


// ================================================
// LOGOUT
// ================================================
window.logout = () => {
  signOut(auth).then(() => {
    window.location.href = "../../admin/login.html";
  });
};


// ================================================
// LOAD REGIONS (from regions-helper.js)
// ================================================
window.loadRegions("fromRegion", "fromDistrictBox");
window.loadRegions("toRegion", "toDistrictBox");


// ================================================
// FETCH ADS FROM FIREBASE
// ================================================
async function loadAds() {
  adsList.innerHTML = "Yuklanmoqda...";

  const adsRef = ref(db, "ads");
  const snapshot = await get(adsRef);

  ADS = [];
  if (snapshot.exists()) {
    snapshot.forEach(userBlock => {
      userBlock.forEach(ad => {
        ADS.push({
          id: ad.key,
          userId: userBlock.key,
          ...ad.val()
        });
      });
    });
  }

  applyFilters();
}


// ================================================
// FILTER FUNCTION
// ================================================
function applyFilters() {
  let items = [...ADS];

  // 🔍 Qidiruv
  const q = searchInput.value.toLowerCase();
  if (q) {
    items = items.filter(ad =>
      (ad.fromRegion || "").toLowerCase().includes(q) ||
      (ad.toRegion || "").toLowerCase().includes(q) ||
      (ad.comment || "").toLowerCase().includes(q) ||
      (String(ad.price) || "").includes(q)
    );
  }

  // ⚙️ Role filter
  if (roleFilter.value) {
    items = items.filter(ad => ad.role === roleFilter.value);
  }

  // 🎯 Narx
  if (priceMin.value) items = items.filter(ad => ad.price >= Number(priceMin.value));
  if (priceMax.value) items = items.filter(ad => ad.price <= Number(priceMax.value));

  // 📅 Sana filter
  const now = new Date();
  if (dateFilter.value === "today") {
    items = items.filter(ad => {
      const adDate = new Date(ad.departureTime);
      return adDate.toDateString() === now.toDateString();
    });
  }

  if (dateFilter.value === "tomorrow") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    items = items.filter(ad => {
      const d = new Date(ad.departureTime);
      return d.toDateString() === tomorrow.toDateString();
    });
  }

  if (dateFilter.value === "3days") {
    const limit = new Date(now);
    limit.setDate(limit.getDate() + 3);
    items = items.filter(ad => {
      const d = new Date(ad.departureTime);
      return d >= now && d <= limit;
    });
  }

  // 🌍 FROM
  if (fromRegion.value) items = items.filter(ad => ad.fromRegion === fromRegion.value);
  const selFromDistrict = document.querySelector("input[name='fromDistrict']:checked");
  if (selFromDistrict) {
    items = items.filter(ad => ad.fromDistrict === selFromDistrict.value);
  }

  // 🌍 TO
  if (toRegion.value) items = items.filter(ad => ad.toRegion === toRegion.value);
  const selToDistrict = document.querySelector("input[name='toDistrict']:checked");
  if (selToDistrict) {
    items = items.filter(ad => ad.toDistrict === selToDistrict.value);
  }

  // 🔄 Sort
  if (sortSelect.value === "newest") {
    items.sort((a, b) => b.createdAt - a.createdAt);
  } else {
    items.sort((a, b) => a.createdAt - b.createdAt);
  }

  filteredADS = items;
  currentPage = 1;
  renderPage();
}


// ================================================
// RENDER PAGE
// ================================================
function renderPage() {
  if (!filteredADS.length) {
    adsList.innerHTML = "<div style='padding:20px;text-align:center;'>Hech narsa topilmadi</div>";
    pagination.innerHTML = "";
    return;
  }

  const start = (currentPage - 1) * perPage;
  const end = start + perPage;

  const pageItems = filteredADS.slice(start, end);

  adsList.innerHTML = pageItems.map(ad => renderItem(ad)).join("");

  renderPagination();
}


// ================================================
// SINGLE AD CARD
// ================================================
function renderItem(ad) {
  return `
    <div class="ad-item">
      <div><b>${ad.fromRegion} → ${ad.toRegion}</b></div>
      <div>Joy: ${ad.seats}</div>
      <div>Narx: <b>${ad.price}</b> UZS</div>
      <div>Vaqt: ${new Date(ad.departureTime).toLocaleString()}</div>
    </div>
  `;
}


// ================================================
// PAGINATION
// ================================================
function renderPagination() {
  const total = Math.ceil(filteredADS.length / perPage);

  pagination.innerHTML = `
    <button ${currentPage === 1 ? "disabled" : ""} onclick="prevPage()">Oldingi</button>
    <span style="padding:0 10px">${currentPage} / ${total}</span>
    <button ${currentPage === total ? "disabled" : ""} onclick="nextPage()">Keyingi</button>
  `;
}

window.prevPage = () => {
  if (currentPage > 1) {
    currentPage--;
    renderPage();
  }
};

window.nextPage = () => {
  const total = Math.ceil(filteredADS.length / perPage);
  if (currentPage < total) {
    currentPage++;
    renderPage();
  }
};


// ================================================
// RESET FILTERS
// ================================================
resetFiltersBtn.onclick = () => {
  searchInput.value = "";
  sortSelect.value = "newest";
  dateFilter.value = "";
  priceMin.value = "";
  priceMax.value = "";
  roleFilter.value = "";
  fromRegion.value = "";
  toRegion.value = "";

  fromDistrictBox.innerHTML = "";
  toDistrictBox.innerHTML = "";

  applyFilters();
};


// ================================================
// START
// ================================================
loadAds();
