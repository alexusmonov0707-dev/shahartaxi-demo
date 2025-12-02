import {
  auth,
  db,
  ref,
  get,
  signOut,
  onAuthStateChanged
} from "../../libs/lib.js";

let CURRENT_USER = null;
let ADS = [];
let REGIONS = window.regionsData || window.regions || {};


// ===============================
// USER INFO
// ===============================
async function getUserInfo(uid) {
  if (!uid) return defaultUser();

  try {
    const snap = await get(ref(db, "users/" + uid));
    if (!snap.exists()) return defaultUser();

    let u = snap.val();

    // Fallback avatar ishlaaadi GitHub Pages’da
    const avatarUrl =
      (!u.avatar || u.avatar.startsWith("/"))
        ? "https://i.ibb.co/sVtqkCJ/default-avatar.png"
        : u.avatar;

    return {
      uid,
      fullName: u.fullName || "Foydalanuvchi",
      phone: u.phone || "-",
      role: u.role || "",
      avatar: avatarUrl
    };

  } catch (err) {
    console.warn("User info error:", err);
    return defaultUser();
  }
}

function defaultUser() {
  return {
    uid: null,
    fullName: "Foydalanuvchi",
    phone: "-",
    role: "",
    avatar: "https://i.ibb.co/sVtqkCJ/default-avatar.png"
  };
}


// ===============================
// AUTH
// ===============================
onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "../login/index.html";
    return;
  }

  CURRENT_USER = await getUserInfo(user.uid);
  console.log("User:", CURRENT_USER);

  loadRegionFilters();
  await loadAds();
});


// ===============================
// LOAD ADS
// ===============================
async function loadAds() {
  const snap = await get(ref(db, "ads"));

  ADS = [];

  snap.forEach(ownerNode => {
    const userId = ownerNode.key;

    ownerNode.forEach(adNode => {
      const ad = adNode.val();
      ad.id = adNode.key;
      ad.userId = userId;
      ADS.push(ad);
    });
  });

  renderAds();
}


// ===============================
// REGION FILTER
// ===============================
function loadRegionFilters() {
  const fr = document.getElementById("fromRegion");
  const tr = document.getElementById("toRegion");

  fr.innerHTML = `<option value="">Viloyat</option>`;
  tr.innerHTML = `<option value="">Viloyat</option>`;

  for (let region in REGIONS) {
    fr.innerHTML += `<option value="${region}">${region}</option>`;
    tr.innerHTML += `<option value="${region}">${region}</option>`;
  }

  fr.onchange = () => {
    updateDistrictPopup("fromRegion", "fromDistrictPopup", "fromDistrict");
    renderAds();
  };

  tr.onchange = () => {
    updateDistrictPopup("toRegion", "toDistrictPopup", "toDistrict");
    renderAds();
  };
}


// ===============================
// POPUP: REGION → DISTRICT
// ===============================
function updateDistrictPopup(regionId, popupId, className) {
  const region = document.getElementById(regionId).value;
  const popup = document.getElementById(popupId);

  popup.innerHTML = "";

  if (!REGIONS[region]) {
    popup.classList.add("hidden");
    return;
  }

  REGIONS[region].forEach(dist => {
    popup.innerHTML += `
      <label>
        <input type="checkbox" class="${className}" value="${dist}">
        ${dist}
      </label>
    `;
  });

  popup.classList.remove("hidden");
}


// ===============================
// POPUP CLOSE ON OUTSIDE CLICK
// ===============================
document.addEventListener("click", (e) => {
  if (!e.target.closest(".region-select")) {
    document.getElementById("fromDistrictPopup").classList.add("hidden");
    document.getElementById("toDistrictPopup").classList.add("hidden");
  }
});


// ===============================
// WHEN DISTRICTS CHANGE → RENDER
// ===============================
document.addEventListener("change", (e) => {
  if (e.target.classList.contains("fromDistrict") ||
      e.target.classList.contains("toDistrict")) {
    renderAds();
  }
});


// ===============================
// FILTER ADS
// ===============================
async function filterAds() {
  const role = CURRENT_USER.role;
  const now = Date.now();

  let result = [];

  for (let ad of ADS) {
    const owner = await getUserInfo(ad.userId);

    // ROLE CHECK
    if (role === "driver" && owner.role !== "passenger") continue;
    if (role === "passenger" && owner.role !== "driver") continue;

    // REGION
    const fr = document.getElementById("fromRegion").value;
    const tr = document.getElementById("toRegion").value;
    if (fr && ad.fromRegion !== fr) continue;
    if (tr && ad.toRegion !== tr) continue;

    // DISTRICTS
    const fromDistricts = [...document.querySelectorAll(".fromDistrict:checked")].map(x => x.value);
    const toDistricts = [...document.querySelectorAll(".toDistrict:checked")].map(x => x.value);

    if (fromDistricts.length && !fromDistricts.includes(ad.fromDistrict)) continue;
    if (toDistricts.length && !toDistricts.includes(ad.toDistrict)) continue;

    // PRICE
    const min = Number(document.getElementById("priceMin").value || 0);
    const max = Number(document.getElementById("priceMax").value || Infinity);
    const price = Number(ad.price || 0);

    if (price < min || price > max) continue;

    // SEARCH
    const q = (document.getElementById("search").value || "").toLowerCase();
    if (q && !JSON.stringify(ad).toLowerCase().includes(q)) continue;

    // TIME
    let timeF = document.getElementById("timeFilter").value;
    if (timeF) {
      let limitHours = { "1d": 24, "3d": 72, "7d": 168 }[timeF];
      if (Date.now() - (ad.createdAt || 0) > limitHours * 3600000) continue;
    }

    result.push(ad);
  }

  // SORT
  const sort = document.getElementById("sortOrder").value;
  result.sort((a, b) =>
    sort === "new"
      ? b.createdAt - a.createdAt
      : a.createdAt - b.createdAt
  );

  return result;
}


// ===============================
// RENDER ADS
// ===============================
async function renderAds() {
  const container = document.getElementById("adsList");
  container.innerHTML = "Yuklanmoqda...";

  const list = await filterAds();

  if (!list.length) {
    container.innerHTML = "<p>E’lonlar topilmadi</p>";
    return;
  }

  container.innerHTML = "";

  for (let ad of list) {
    let user = await getUserInfo(ad.userId);

    let card = document.createElement("div");
    card.className = "ad-card";

    card.innerHTML = `
      <img class="ad-avatar" src="${user.avatar}">
      <div class="ad-main">
        <div class="ad-route">${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict}</div>
        <div class="ad-meta">👤 ${user.fullName} (${user.role})</div>
        <div class="ad-meta">⏰ ${new Date(ad.departureTime).toLocaleString()}</div>
      </div>
      <div class="ad-price">${ad.price} so‘m</div>
    `;

    card.onclick = () => openModal(ad, user);

    container.appendChild(card);
  }
}


// ===============================
// MODAL
// ===============================
function openModal(ad, user) {
  const modal = document.getElementById("adFullModal");
  modal.style.display = "flex";

  modal.innerHTML = `
    <div class="modal-box">
      <h2>${user.fullName}</h2>
      <p><b>Telefon:</b> ${user.phone}</p>
      <p><b>Yo‘nalish:</b> ${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict}</p>
      <p><b>Narx:</b> ${ad.price} so‘m</p>
      <p><b>Izoh:</b> ${ad.comment || "-"}</p>
      <button onclick="closeModal()">Yopish</button>
      <a href="tel:${user.phone}" class="btn-primary">Qo‘ng‘iroq</a>
    </div>
  `;
}

window.closeModal = () =>
  document.getElementById("adFullModal").style.display = "none";


// ===============================
// RESET FILTERS
// ===============================
document.getElementById("resetFiltersBtn").onclick = () => {
  ["search", "priceMin", "priceMax"].forEach(id =>
    document.getElementById(id).value = ""
  );
  document.getElementById("fromRegion").value = "";
  document.getElementById("toRegion").value = "";
  document.getElementById("timeFilter").value = "";
  document.getElementById("sortOrder").value = "new";

  document.getElementById("fromDistrictPopup").classList.add("hidden");
  document.getElementById("toDistrictPopup").classList.add("hidden");

  renderAds();
};


// ===============================
// LOGOUT
// ===============================
window.logout = () => signOut(auth);

console.log("Taxi index.js fully loaded.");
