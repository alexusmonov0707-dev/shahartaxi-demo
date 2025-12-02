import {
  auth,
  db,
  ref,
  get,
  onAuthStateChanged,
  signOut
} from "../../../libs/lib.js";

let CURRENT_USER = null;
let ADS = [];
let REGIONS = window.regionsData || window.regions || {};


// ==========================
// GET USER INFO
// ==========================
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
      role: u.role || "",
      avatar: u.avatar || "/mnt/data/avatar-default.png"
    };

  } catch (err) {
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


// ==========================
// AUTH
// ==========================
onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "../login/index.html";
    return;
  }

  CURRENT_USER = await getUserInfo(user.uid);

  loadRegionFilters();
  await loadAds();

  console.log("User:", CURRENT_USER);
});


// ==========================
// LOAD ADS WITH CORRECT PATH
// ==========================
async function loadAds() {
  const snap = await get(ref(db, "ads"));
  ADS = [];

  snap.forEach(ownerNode => {
    const ownerUid = ownerNode.key; // <-- e’lon egasi UID

    ownerNode.forEach(adNode => {
      const ad = adNode.val();
      ad.id = adNode.key;
      ad.userId = ownerUid;
      ADS.push(ad);
    });
  });

  renderAds();
}


// ==========================
// REGION / DISTRICT FILTERS
// ==========================
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
        <input type="checkbox" class="${className}" value="${dist}"> ${dist}
      </label>
    `;
  });
}


// ==========================
// FILTER LOGIC
// ==========================
function filterAds() {
  const role = CURRENT_USER.role; // passenger | driver

  return ADS.filter(ad => {
    const adType = ad.seats ? "driver" : "passenger";

    // Driver → Passenger e’lonlari
    if (role === "driver" && adType !== "passenger") return false;

    // Passenger → Driver e’lonlari
    if (role === "passenger" && adType !== "driver") return false;

    return true;
  });
}


// ==========================
// RENDER ADS
// ==========================
async function renderAds() {
  const container = document.getElementById("adsList");
  container.innerHTML = "";

  const list = filterAds();

  if (!list.length) {
    container.innerHTML = "<p>E’lonlar topilmadi</p>";
    return;
  }

  for (let ad of list) {
    const user = await getUserInfo(ad.userId);

    const card = document.createElement("div");
    card.className = "ad-card";

    card.innerHTML = `
      <img class="ad-avatar" src="${user.avatar}">
      <div class="ad-main">
        <b>${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict}</b>
        <div>👤 ${user.fullName}</div>
        <div>⏰ ${ad.departureTime}</div>
      </div>
      <div class="ad-price">${ad.price} so‘m</div>
    `;

    card.onclick = () => openModal(ad, user);
    container.appendChild(card);
  }
}


// ==========================
// MODAL
// ==========================
function openModal(ad, u) {
  const m = document.getElementById("adFullModal");
  m.style.display = "flex";

  m.innerHTML = `
    <div class="modal-box">
      <h2>${u.fullName}</h2>
      <p><b>Telefon:</b> ${u.phone}</p>
      <p><b>Yo‘nalish:</b> ${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict}</p>
      <p><b>Narx:</b> ${ad.price} so‘m</p>
      <p><b>Izoh:</b> ${ad.comment || "-"}</p>

      <button onclick="closeModal()">Yopish</button>
      <a href="tel:${u.phone}" class="btn">Qo‘ng‘iroq</a>
    </div>
  `;
}

window.closeModal = () =>
  document.getElementById("adFullModal").style.display = "none";


// ==========================
// LOGOUT
// ==========================
window.logout = () => signOut(auth);
