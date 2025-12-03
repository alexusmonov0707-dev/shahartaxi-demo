import { db, auth } from "../../libs/lib.js";
import {
  ref,
  get,
  child,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ===========================
   GLOBAL O'ZGARUVCHILAR
=========================== */
let currentUser = null;
let allAds = [];
let allUsers = {};

const adsList = document.getElementById("adsList");

/* ===========================
   AUTH
=========================== */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "../../auth/login.html";
    return;
  }

  const snap = await get(ref(db, "users/" + user.uid));
  currentUser = snap.val();
  console.log("User:", currentUser);

  await loadUsers();
  await loadAds();
  initRegionFilters();
});

/* ===========================
   USERLARNI YUKLASH
=========================== */
async function loadUsers() {
  const snap = await get(ref(db, "users"));
  allUsers = snap.exists() ? snap.val() : {};
}

/* ===========================
   E'LONLARNI YUKLASH
=========================== */
async function loadAds() {
  const snap = await get(ref(db, "ads"));
  allAds = [];

  if (snap.exists()) {
    snap.forEach((userAds) => {
      userAds.forEach((adSnap) => {
        const ad = adSnap.val();
        ad.uid = userAds.key;
        ad.adId = adSnap.key;
        allAds.push(ad);
      });
    });
  }

  renderAds();
}

/* ===========================
   REGIONS FILTER
=========================== */
function initRegionFilters() {
  const fromSelect = document.getElementById("fromRegionSelect");
  const toSelect = document.getElementById("toRegionSelect");

  fromSelect.innerHTML = `<option value="">Viloyat</option>`;
  toSelect.innerHTML = `<option value="">Viloyat</option>`;

  Object.keys(REGIONS).forEach((region) => {
    fromSelect.innerHTML += `<option value="${region}">${region}</option>`;
    toSelect.innerHTML += `<option value="${region}">${region}</option>`;
  });

  fromSelect.addEventListener("change", () =>
    fillDistricts("fromRegionSelect", "fromDistricts", "fromDistrict")
  );
  toSelect.addEventListener("change", () =>
    fillDistricts("toRegionSelect", "toDistricts", "toDistrict")
  );
}

/* ===========================
   SHAHARLARNI CHIQARISH
=========================== */
function fillDistricts(regionSelectId, containerId, className) {
  const region = document.getElementById(regionSelectId).value;
  const box = document.getElementById(containerId);
  box.innerHTML = "";

  if (!region || !REGIONS[region]) return;

  REGIONS[region].forEach((district) => {
    box.innerHTML += `
      <label style="margin-right:10px;">
        <input type="checkbox" class="${className}" value="${district}">
        ${district}
      </label>
    `;
  });

  box.addEventListener("change", renderAds);
}

/* BOSHQA JOY BOSILGANDA SHAHARLAR YO'QOLSIN */
document.addEventListener("click", (e) => {
  if (!e.target.closest(".filter-block")) {
    document.getElementById("fromDistricts").innerHTML = "";
    document.getElementById("toDistricts").innerHTML = "";
  }
});

/* ===========================
   FILTERLARNI O'QISH
=========================== */
function getSelected(className) {
  return Array.from(document.querySelectorAll(`.${className}:checked`)).map(
    (i) => i.value
  );
}

/* ===========================
   RENDER ADS
=========================== */
function renderAds() {
  adsList.innerHTML = "";

  const fromSelected = getSelected("fromDistrict");
  const toSelected = getSelected("toDistrict");

  let filtered = allAds.filter((ad) => {
    if (!currentUser || !allUsers[ad.uid]) return false;

    const owner = allUsers[ad.uid];

    /* ROLE BO'YICHA */
    if (currentUser.role === owner.role) return false;

    /* FROM FILTER */
    if (fromSelected.length && !fromSelected.includes(ad.fromDistrict))
      return false;

    /* TO FILTER */
    if (toSelected.length && !toSelected.includes(ad.toDistrict)) return false;

    return true;
  });

  if (!filtered.length) {
    adsList.innerHTML = "E’lon topilmadi";
    return;
  }

  filtered.forEach((ad) => {
    const owner = allUsers[ad.uid];
    const driver = owner.driverInfo || {};

    const dateStr = ad.departureTime
      ? new Date(ad.departureTime).toLocaleString()
      : ad.createdAt
      ? new Date(ad.createdAt).toLocaleString()
      : "";

    const card = document.createElement("div");
    card.className = "ad-card";

    card.innerHTML = `
      <img class="ad-avatar" src="${owner.avatar}" />
      <div class="ad-main">
        <div class="ad-route">
          ${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict}
        </div>

        <div class="ad-meta">🚗 ${driver.carModel || "-"}</div>
        <div class="ad-meta">⏰ ${dateStr}</div>
      </div>

      <div class="ad-price">${ad.price} so‘m</div>
    `;

    card.onclick = () => openModal(ad, owner);
    adsList.appendChild(card);
  });
}

/* ===========================
   MODAL
=========================== */
window.openModal = function (ad, owner) {
  const modal = document.getElementById("adFullModal");
  modal.style.display = "flex";

  const driver = owner.driverInfo || {};

  const dateStr = ad.departureTime
    ? new Date(ad.departureTime).toLocaleString()
    : ad.createdAt
    ? new Date(ad.createdAt).toLocaleString()
    : "";

  modal.innerHTML = `
    <div class="modal-box">

      <h2>${owner.fullName}</h2>

      <img src="${owner.avatar}" style="width:120px;height:120px;border-radius:50%;">

      <p><b>Telefon:</b> ${owner.phone}</p>

      <p><b>Yo‘nalish:</b>
        ${ad.fromRegion}, ${ad.fromDistrict}
        →
        ${ad.toRegion}, ${ad.toDistrict}
      </p>

      <p><b>Mashina rusumi:</b> ${driver.carModel || "-"}</p>
      <p><b>Mashina rangi:</b> ${driver.carColor || "-"}</p>
      <p><b>Mashina raqami:</b> ${driver.carNumber || "-"}</p>

      <p><b>Narx:</b> ${ad.price} so‘m</p>
      <p><b>Vaqt:</b> ${dateStr}</p>
      <p><b>Izoh:</b> ${ad.comment || "-"}</p>

      <a class="btn-primary" href="tel:${owner.phone}">Qo‘ng‘iroq</a>
      <br><br>
      <button onclick="closeModal()">Yopish</button>

    </div>
  `;
};

window.closeModal = function () {
  document.getElementById("adFullModal").style.display = "none";
};

window.logout = async function () {
  await signOut(auth);
  location.href = "../../auth/login.html";
};
