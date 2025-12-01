// ===============================
// IMPORTS (DO NOT CHANGE PATH)
// ===============================
import {
  auth,
  db,
  ref,
  get,
  onValue,
  signOut
} from "../../libs/lib.js";


// ===============================
// DOM ELEMENTS
// ===============================
const adsListEl = document.getElementById("adsList");
const paginationEl = document.getElementById("pagination");

const searchEl = document.getElementById("search");
const sortByEl = document.getElementById("sortBy");
const filterDateEl = document.getElementById("filterDate");

const priceMinEl = document.getElementById("priceMin");
const priceMaxEl = document.getElementById("priceMax");

const filterRoleEl = document.getElementById("filterRole");

const fromRegionEl = document.getElementById("fromRegion");
const toRegionEl = document.getElementById("toRegion");

const fromDistrictBox = document.getElementById("fromDistrictBox");
const toDistrictBox = document.getElementById("toDistrictBox");

const resetFiltersBtn = document.getElementById("resetFiltersBtn");

let ADS = [];
let FILTERED = [];

let PAGE = 1;
const PAGE_SIZE = 20;


// ===============================
// LOGOUT
// ===============================
window.logout = function () {
  signOut(auth).then(() => {
    window.location.href = "../../auth/login.html";
  });
};


// ===============================
// LOAD REGIONS
// ===============================
function loadRegions() {
  Object.keys(regionsTaxi).forEach((region) => {
    fromRegionEl.innerHTML += `<option value="${region}">${region}</option>`;
    toRegionEl.innerHTML += `<option value="${region}">${region}</option>`;
  });
}

loadRegions();


// ===============================
// LOAD DISTRICTS
// ===============================
function updateDistricts(regionSelect, targetBox) {
  const region = regionSelect.value;
  targetBox.innerHTML = "";

  if (!region || !regionsTaxi[region]) return;

  const districts = regionsTaxi[region];

  let html = `<select class="districtSelect">`;
  html += `<option value="">Tuman</option>`;

  districts.forEach((d) => {
    html += `<option value="${d}">${d}</option>`;
  });

  html += `</select>`;
  targetBox.innerHTML = html;
}

fromRegionEl.addEventListener("change", () =>
  updateDistricts(fromRegionEl, fromDistrictBox)
);
toRegionEl.addEventListener("change", () =>
  updateDistricts(toRegionEl, toDistrictBox)
);


// ===============================
// FETCH ADS FROM FIREBASE
// (ads → category → adID → data)
// ===============================
function loadAds() {
  adsListEl.innerHTML = "Yuklanmoqda...";

  const adsRef = ref(db, "ads");

  onValue(adsRef, (snap) => {
    ADS = [];

    if (snap.exists()) {
      const data = snap.val();

      Object.values(data).forEach((categoryBlock) => {
        Object.entries(categoryBlock).forEach(([adID, ad]) => {
          ADS.push({
            id: adID,
            ...ad
          });
        });
      });
    }

    FILTERED = ADS;
    render();
  });
}

loadAds();


// ===============================
// FILTERING LOGIC
// ===============================
function applyFilters() {
  let list = ADS;

  const q = searchEl.value.trim().toLowerCase();
  const sortBy = sortByEl.value;
  const dateFilter = filterDateEl.value;

  const priceMin = priceMinEl.value ? Number(priceMinEl.value) : null;
  const priceMax = priceMaxEl.value ? Number(priceMaxEl.value) : null;

  const roleVal = filterRoleEl.value;

  const fromRegion = fromRegionEl.value;
  const fromDistrictSelect = fromDistrictBox.querySelector("select");
  const fromDistrict = fromDistrictSelect ? fromDistrictSelect.value : "";

  const toRegion = toRegionEl.value;
  const toDistrictSelect = toDistrictBox.querySelector("select");
  const toDistrict = toDistrictSelect ? toDistrictSelect.value : "";


  // SEARCH
  if (q !== "") {
    list = list.filter((x) =>
      JSON.stringify(x).toLowerCase().includes(q)
    );
  }


  // ROLE FILTER
  if (roleVal !== "") {
    list = list.filter((x) => x.role === roleVal);
  }


  // REGION FROM
  if (fromRegion !== "") {
    list = list.filter((x) => x.fromRegion === fromRegion);
  }

  if (fromDistrict !== "") {
    list = list.filter((x) => x.fromDistrict === fromDistrict);
  }


  // REGION TO
  if (toRegion !== "") {
    list = list.filter((x) => x.toRegion === toRegion);
  }

  if (toDistrict !== "") {
    list = list.filter((x) => x.toDistrict === toDistrict);
  }


  // PRICE
  if (priceMin !== null) {
    list = list.filter((x) => Number(x.price) >= priceMin);
  }
  if (priceMax !== null) {
    list = list.filter((x) => Number(x.price) <= priceMax);
  }


  // DATE FILTER
  const now = new Date();
  if (dateFilter === "today") {
    const day = now.toLocaleDateString("uz-UZ");
    list = list.filter(
      (x) => new Date(x.departureTime).toLocaleDateString("uz-UZ") === day
    );
  }
  if (dateFilter === "tomorrow") {
    const t = new Date(now);
    t.setDate(t.getDate() + 1);

    list = list.filter(
      (x) => new Date(x.departureTime).toLocaleDateString("uz-UZ") ===
        t.toLocaleDateString("uz-UZ")
    );
  }
  if (dateFilter === "3days") {
    let limit = new Date(now);
    limit.setDate(limit.getDate() + 3);

    list = list.filter(
      (x) => new Date(x.departureTime) <= limit
    );
  }


  // SORT
  if (sortBy === "newest") {
    list = list.sort((a, b) => b.createdAt - a.createdAt);
  } else {
    list = list.sort((a, b) => a.createdAt - b.createdAt);
  }


  FILTERED = list;
  PAGE = 1;
  render();
}


// ===============================
// RESET FILTERS
// ===============================
resetFiltersBtn.onclick = function () {
  searchEl.value = "";
  sortByEl.value = "newest";
  filterDateEl.value = "";

  priceMinEl.value = "";
  priceMaxEl.value = "";

  filterRoleEl.value = "";

  fromRegionEl.value = "";
  toRegionEl.value = "";

  fromDistrictBox.innerHTML = "";
  toDistrictBox.innerHTML = "";

  FILTERED = ADS;
  PAGE = 1;
  render();
};


// ===============================
// EVENT LISTENERS
// ===============================
searchEl.addEventListener("keyup", applyFilters);
sortByEl.addEventListener("change", applyFilters);
filterDateEl.addEventListener("change", applyFilters);
priceMinEl.addEventListener("input", applyFilters);
priceMaxEl.addEventListener("input", applyFilters);
filterRoleEl.addEventListener("change", applyFilters);


// ===============================
// RENDER AD ITEMS
// ===============================
function render() {
  if (FILTERED.length === 0) {
    adsListEl.innerHTML = `<div style="padding:20px; text-align:center; color:#777;">
      E’lonlar topilmadi
    </div>`;
    paginationEl.innerHTML = "";
    return;
  }

  const start = (PAGE - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pageItems = FILTERED.slice(start, end);

  let html = "";

  pageItems.forEach((x) => {
    html += `
      <div class="ad-item" onclick="openAd('${x.id}')">
        <div class="ad-main">
          <div class="ad-route">${x.fromRegion} → ${x.toRegion}</div>
          <div class="ad-price">${x.price} so‘m</div>
        </div>
        <div class="ad-info">
          ${x.fromDistrict} → ${x.toDistrict}<br>
          ${new Date(x.departureTime).toLocaleString("uz-UZ")}
        </div>
      </div>
    `;
  });

  adsListEl.innerHTML = html;
  renderPagination();
}


// ===============================
// PAGINATION
// ===============================
function renderPagination() {
  const total = FILTERED.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  let html = `<button ${PAGE === 1 ? "disabled" : ""} onclick="prevPage()">← Oldingi</button>
              <span>${PAGE} / ${totalPages}</span>
              <button ${PAGE === totalPages ? "disabled" : ""} onclick="nextPage()">Keyingi →</button>`;

  paginationEl.innerHTML = html;
}

window.prevPage = function () {
  if (PAGE > 1) {
    PAGE--;
    render();
  }
};

window.nextPage = function () {
  const totalPages = Math.ceil(FILTERED.length / PAGE_SIZE);
  if (PAGE < totalPages) {
    PAGE++;
    render();
  }
};


// ===============================
// OPEN FULL AD MODAL
// ===============================
window.openAd = function (id) {
  const ad = ADS.find((x) => x.id === id);
  if (!ad) return;

  const modal = document.getElementById("adFullModal");

  modal.innerHTML = `
    <div class="modal-bg" onclick="closeAd()"></div>
    <div class="modal-card">
      <h3>${ad.fromRegion} → ${ad.toRegion}</h3>
      <p><b>Manzil:</b> ${ad.fromDistrict} → ${ad.toDistrict}</p>
      <p><b>Narx:</b> ${ad.price} so‘m</p>
      <p><b>O‘rinlar:</b> ${ad.seats}</p>
      <p><b>Izoh:</b> ${ad.comment || ""}</p>
      <p><b>Telefon:</b> ${ad.phone || ""}</p>
      <p><b>Sana:</b> ${new Date(ad.departureTime).toLocaleString("uz-UZ")}</p>
      <button onclick="closeAd()" class="close-btn">Yopish</button>
    </div>
  `;
};

window.closeAd = function () {
  document.getElementById("adFullModal").innerHTML = "";
};
