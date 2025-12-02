import {
  auth,
  db,
  ref,
  get,
  signOut,
  onAuthStateChanged
} from "../../../libs/lib.js";

let CURRENT_USER = null;
let ADS = [];
let REGIONS = window.regionsData || window.regions || {};


// ============================================
// USER INFO
// ============================================
async function getUserInfo(uid) {
  if (!uid) return defaultUser();

  try {
    const snap = await get(ref(db, "users/" + uid));
    if (!snap.exists()) return defaultUser();

    const u = snap.val();

    return {
      uid,
      fullName: u.fullName || "Foydalanuvchi",
      phone: u.phone || "-",
      role: u.role || "",   // "driver" | "passenger"
      avatar: u.avatar || "https://i.ibb.co/sVtqkCJ/default-avatar.png"
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



// ============================================
// AUTH CHECK
// ============================================
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


// ============================================
// LOAD ADS
// ============================================
async function loadAds() {
  const snap = await get(ref(db, "ads"));
  ADS = [];

  snap.forEach(ownerNode => {
    const ownerUid = ownerNode.key;

    ownerNode.forEach(adNode => {
      const ad = adNode.val();
      ad.id = adNode.key;
      ad.userId = ownerUid;  // <-- E’LON EGASI UID
      ADS.push(ad);
    });
  });

  renderAds();
}



// ============================================
// REGION / DISTRICT FILTER
// ============================================
function loadRegionFilters() {
  const from = document.getElementById("fromRegion");
  const to = document.getElementById("toRegion");

  from.innerHTML = `<option value="">Viloyat</option>`;
  to.innerHTML = `<option value="">Viloyat</option>`;

  for (let region in REGIONS) {
    from.innerHTML += `<option value="${region}">${region}</option>`;
    to.innerHTML += `<option value="${region}">${region}</option>`;
  }

  from.onchange = fillFromDistricts;
  to.onchange = fillToDistricts;

  fillFromDistricts();
  fillToDistricts();
}

function fillFromDistricts() {
  fillDistricts("fromRegion", "fromDistrictBox", "fromDistrict");
}

function fillToDistricts() {
  fillDistricts("toRegion", "toDistrictBox", "toDistrict");
}

function fillDistricts(regionSelect, boxId, className) {
  const region = document.getElementById(regionSelect).value;
  const box = document.getElementById(boxId);
  box.innerHTML = "";

  if (!REGIONS[region]) return;

  REGIONS[region].forEach(dist => {
    box.innerHTML += `
      <label>
        <input type="checkbox" class="${className}" value="${dist}">
        ${dist}
      </label>
    `;
  });
}



// ============================================
// FILTER ADS (ROLE BO‘YICHA)
// ============================================
async function filterAds() {
  const role = CURRENT_USER.role; // driver | passenger
  const result = [];

  for (let ad of ADS) {
    const ownerInfo = await getUserInfo(ad.userId);
    const adType = ownerInfo.role;  // <-- E’LON TURINI ANIQLASH

    // DRIVER → PASSENGER e’lonlari
    if (role === "driver" && adType !== "passenger") continue;

    // PASSENGER → DRIVER e’lonlari
    if (role === "passenger" && adType !== "driver") continue;

    // REGION / DISTRICT
    const fr = document.getElementById("fromRegion").value;
    const tr = document.getElementById("toRegion").value;

    if (fr && ad.fromRegion !== fr) continue;
    if (tr && ad.toRegion !== tr) continue;

    const fromDistricts = [...document.querySelectorAll(".fromDistrict:checked")].map(x => x.value);
    const toDistricts = [...document.querySelectorAll(".toDistrict:checked")].map(x => x.value);

    if (fromDistricts.length && !fromDistricts.includes(ad.fromDistrict)) continue;
    if (toDistricts.length && !toDistricts.includes(ad.toDistrict)) continue;

    // NARX
    const minPrice = Number(document.getElementById("priceMin").value || 0);
    const maxPrice = Number(document.getElementById("priceMax").value || Infinity);

    const adPrice = Number(ad.price || 0);
    if (adPrice < minPrice || adPrice > maxPrice) continue;

    // QIDIRUV
    const q = (document.getElementById("search").value || "").toLowerCase();
    const hay = JSON.stringify(ad).toLowerCase();
    if (!hay.includes(q)) continue;

    result.push(ad);
  }

  return result;
}



// ============================================
// RENDER ADS
// ============================================
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
    const user = await getUserInfo(ad.userId);

    const div = document.createElement("div");
    div.className = "ad-card";

    div.innerHTML = `
      <img class="ad-avatar" src="${user.avatar}">
      <div class="ad-main">
        <div class="ad-route">${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict}</div>
        <div class="ad-meta">👤 ${user.fullName} (${user.role})</div>
        <div class="ad-meta">⏰ ${new Date(ad.departureTime).toLocaleString()}</div>
      </div>
      <div class="ad-price">${ad.price} so‘m</div>
    `;

    div.onclick = () => openModal(ad, user);

    container.appendChild(div);
  }
}



// ============================================
// MODAL
// ============================================
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

window.closeModal = () => {
  document.getElementById("adFullModal").style.display = "none";
};



// ============================================
// RESET
// ============================================
document.getElementById("resetFiltersBtn").onclick = () => {
  document.getElementById("search").value = "";
  document.getElementById("priceMin").value = "";
  document.getElementById("priceMax").value = "";
  document.getElementById("fromRegion").value = "";
  document.getElementById("toRegion").value = "";

  fillFromDistricts();
  fillToDistricts();
  renderAds();
};



// ============================================
// LOGOUT
// ============================================
window.logout = () => signOut(auth);



console.log("Taxi index.js fully loaded.");
