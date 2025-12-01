import {
  auth,
  db,
  ref,
  get,
  onAuthStateChanged,
  signOut
} from "../../libs/lib.js";

// ================================
// GLOBALS
// ================================
let CURRENT_USER = null;
let ALL_ADS = [];
let ADS_MAP = new Map();
let CURRENT_PAGE = 1;
const PAGE_SIZE = 10;

let REGIONS = window.regionsData || window.regions || {};


// ================================
// GET USER INFO
// ================================
async function getUserInfo(uid) {
  if (!uid) return null;

  const snap = await get(ref(db, "users/" + uid));
  if (!snap.exists()) return null;

  const u = snap.val();
  const info = u.driverInfo || {};

  return {
    uid,
    fullName: info.fullName || "",
    phone: info.phone || "",
    role: info.role || "", // driver | passenger
    avatar: u.avatar || "/mnt/data/avatar-default.png"
  };
}


// ================================
// DETECT AD TYPE
// ================================
function detectAdType(ad) {
  if (ad.seats || ad.driverSeats) return "Haydovchi";
  if (ad.peopleCount || ad.passengerCount) return "Yo‘lovchi";
  return "";
}


// ================================
// AUTH
// ================================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  CURRENT_USER = await getUserInfo(user.uid);

  loadRegionsFilter();
  loadRouteFilters();
  await loadAds();
  attachRealtime();
});


// ================================
// LOAD ADS
// ================================
async function loadAds() {
  const snap = await get(ref(db, "ads"));
  if (!snap.exists()) {
    ALL_ADS = [];
    renderAds([]);
    return;
  }

  ALL_ADS = [];
  ADS_MAP.clear();

  snap.forEach(ch => {
    const ad = ch.val();
    ad.id = ch.key;
    ad.type = detectAdType(ad);
    ADS_MAP.set(ad.id, ad);
  });

  ALL_ADS = Array.from(ADS_MAP.values());
  scheduleRender();
}


// ================================
// REALTIME
// ================================
function attachRealtime() {
  const adsRef = ref(db, "ads");

  import("https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js")
    .then(({ onChildAdded, onChildChanged, onChildRemoved }) => {
      
      onChildAdded(adsRef, (snap) => {
        const ad = snap.val();
        ad.id = snap.key;
        ad.type = detectAdType(ad);
        ADS_MAP.set(ad.id, ad);
        scheduleRender();
      });

      onChildChanged(adsRef, (snap) => {
        const ad = snap.val();
        ad.id = snap.key;
        ad.type = detectAdType(ad);
        ADS_MAP.set(ad.id, ad);
        scheduleRender();
      });

      onChildRemoved(adsRef, (snap) => {
        ADS_MAP.delete(snap.key);
        scheduleRender();
      });

    });
}


// ================================
// REGIONS FILTERS
// ================================
function loadRegionsFilter() {
  const el = document.getElementById("filterRegion");
  if (!el) return;

  el.innerHTML = '<option value="">Viloyat</option>';
  for (const region in REGIONS) {
    el.innerHTML += `<option value="${region}">${region}</option>`;
  }
}


// FROM / TO filters
function loadRouteFilters() {
  const from = document.getElementById("fromRegion");
  const to = document.getElementById("toRegion");

  from.innerHTML = '<option value="">Viloyat</option>';
  to.innerHTML = '<option value="">Viloyat</option>';

  for (const region in REGIONS) {
    from.innerHTML += `<option value="${region}">${region}</option>`;
    to.innerHTML += `<option value="${region}">${region}</option>`;
  }

  from.onchange = fillFromDistricts;
  to.onchange = fillToDistricts;

  fillFromDistricts();
  fillToDistricts();
}


function fillFromDistricts() {
  const region = document.getElementById("fromRegion").value;
  const box = document.getElementById("fromDistrictBox");
  box.innerHTML = "";

  if (!REGIONS[region]) return;

  REGIONS[region].forEach(d => {
    box.innerHTML += `
      <label class="district-item">
        <input type="checkbox" class="fromDistrict" value="${d}">
        ${d}
      </label>
    `;
  });
}

function fillToDistricts() {
  const region = document.getElementById("toRegion").value;
  const box = document.getElementById("toDistrictBox");
  box.innerHTML = "";

  if (!REGIONS[region]) return;

  REGIONS[region].forEach(d => {
    box.innerHTML += `
      <label class="district-item">
        <input type="checkbox" class="toDistrict" value="${d}">
        ${d}
      </label>
    `;
  });
}


// ================================
// RENDER ADS
// ================================
async function renderAds(ads) {
  const list = document.getElementById("adsList");
  list.innerHTML = "";

  let f = filterAds(ads);

  if (!f.length) {
    list.innerHTML = "<p>Natija topilmadi</p>";
    renderPagination(1, 1);
    return;
  }

  // pagination
  const totalPages = Math.ceil(f.length / PAGE_SIZE);
  if (CURRENT_PAGE > totalPages) CURRENT_PAGE = totalPages;

  const start = (CURRENT_PAGE - 1) * PAGE_SIZE;
  const pageAds = f.slice(start, start + PAGE_SIZE);

  for (const ad of pageAds) {
    const card = await createCard(ad);
    list.appendChild(card);
  }

  renderPagination(totalPages, CURRENT_PAGE);
}


// ================================
// FILTER
// ================================
function filterAds(list) {
  const q = (document.getElementById("search").value || "").toLowerCase();

  const priceMin = Number(document.getElementById("priceMin").value || 0);
  const priceMax = Number(document.getElementById("priceMax").value || Infinity);

  const fr = document.getElementById("fromRegion").value;
  const tr = document.getElementById("toRegion").value;

  const fromDistricts = [...document.querySelectorAll(".fromDistrict:checked")].map(x => x.value);
  const toDistricts = [...document.querySelectorAll(".toDistrict:checked")].map(x => x.value);

  const role = CURRENT_USER.role; // driver / passenger

  return list.filter(ad => {

    // role switching
    if (role === "driver" && ad.type !== "Yo‘lovchi") return false;
    if (role === "passenger" && ad.type !== "Haydovchi") return false;

    if (fr && ad.fromRegion !== fr) return false;
    if (tr && ad.toRegion !== tr) return false;

    if (fromDistricts.length && !fromDistricts.includes(ad.fromDistrict)) return false;
    if (toDistricts.length && !toDistricts.includes(ad.toDistrict)) return false;

    const price = Number(ad.price || 0);
    if (price < priceMin || price > priceMax) return false;

    const hay = JSON.stringify(ad).toLowerCase();
    if (!hay.includes(q)) return false;

    return true;
  });
}


// ================================
// CARD
// ================================
async function createCard(ad) {
  const div = document.createElement("div");
  div.className = "ad-card";

  const u = await getUserInfo(ad.userId);

  div.innerHTML = `
    <img class="ad-avatar" src="${u.avatar}">
    <div class="ad-main">
      <div class="ad-route">${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict}</div>
      <div class="ad-meta">⏰ ${new Date(ad.departureTime).toLocaleString()}</div>
    </div>
    <div class="ad-price">${ad.price} so‘m</div>
  `;

  div.onclick = () => openModal(ad, u);
  return div;
}


// ================================
// MODAL
// ================================
function openModal(ad, u) {
  const m = document.getElementById("adFullModal");
  m.style.display = "flex";

  m.innerHTML = `
    <div class="ad-modal-box">
      <h3>${u.fullName}</h3>
      <p>${u.phone}</p>

      <p><b>Yo‘nalish:</b> ${ad.fromRegion} → ${ad.toRegion}</p>
      <p><b>Izoh:</b> ${ad.comment || "-"}</p>
      <p><b>Narx:</b> ${ad.price} so‘m</p>

      <button onclick="closeModal()">Yopish</button>
      <a href="tel:${u.phone}" class="btn-primary">Qo‘ng‘iroq</a>
    </div>
  `;
}

window.closeModal = function () {
  document.getElementById("adFullModal").style.display = "none";
};


// ================================
// PAGINATION
// ================================
function renderPagination(total, cur) {
  const p = document.getElementById("pagination");
  p.innerHTML = "";

  if (total <= 1) return;

  const add = (txt, page) => {
    const b = document.createElement("button");
    b.textContent = txt;
    b.onclick = () => {
      CURRENT_PAGE = page;
      scheduleRender();
    };
    p.appendChild(b);
  };

  add("«", 1);
  if (cur > 1) add("‹", cur - 1);

  for (let i = 1; i <= total; i++) {
    const b = document.createElement("button");
    b.textContent = i;
    if (i === cur) b.disabled = true;
    b.onclick = () => { CURRENT_PAGE = i; scheduleRender(); };
    p.appendChild(b);
  }

  if (cur < total) add("›", cur + 1);
  add("»", total);
}


// ================================
// RESET
// ================================
document.getElementById("resetFiltersBtn").onclick = () => {
  document.getElementById("search").value = "";
  document.getElementById("priceMin").value = "";
  document.getElementById("priceMax").value = "";
  document.getElementById("fromRegion").value = "";
  document.getElementById("toRegion").value = "";
  fillFromDistricts();
  fillToDistricts();
  scheduleRender();
};


// ================================
// DEBOUNCED RENDER
// ================================
let t = null;
function scheduleRender() {
  clearTimeout(t);
  t = setTimeout(() => {
    renderAds(Array.from(ADS_MAP.values()));
  }, 120);
}


// ================================
// LOGOUT
// ================================
window.logout = () => signOut(auth);

console.log("Taxi index.js fully loaded.");
