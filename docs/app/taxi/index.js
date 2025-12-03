import {
  auth,
  db,
  ref,
  get,
  onAuthStateChanged,
  signOut
} from "../../libs/lib.js";

let CURRENT_USER = null;
let ADS = [];
const userCache = new Map();

// ===============================
// REGIONS — regions-helper.js + regions-taxi.js
// ===============================
let REGIONS = {};
if (window.regionsData) {
  REGIONS = window.regionsData;
} else if (window.regions) {
  REGIONS = window.regions;
} else {
  console.warn(
    "REGIONS topilmadi. assets/regions-helper.js va assets/regions-taxi.js fayllarini tekshir."
  );
  REGIONS = {};
}

// ===============================
// USER HELPERS
// ===============================
async function getUserInfo(uid) {
  if (!uid) return defaultUser();

  if (userCache.has(uid)) return userCache.get(uid);

  try {
    const snap = await get(ref(db, "users/" + uid));
    if (!snap.exists()) {
      const info = defaultUser();
      userCache.set(uid, info);
      return info;
    }

    const u = snap.val();

    const avatar =
      !u.avatar || u.avatar.startsWith("/")
        ? "https://i.ibb.co/PGT8x4G/user.png"
        : u.avatar;

    const info = {
      uid,
      fullName: u.fullName || "Foydalanuvchi",
      phone: u.phone || "-",
      role: u.role || "",
      avatar
    };

    userCache.set(uid, info);
    return info;
  } catch (e) {
    console.error("getUserInfo error:", e);
    const info = defaultUser();
    userCache.set(uid, info);
    return info;
  }
}

function defaultUser() {
  return {
    uid: null,
    fullName: "Foydalanuvchi",
    phone: "-",
    role: "",
    avatar: "https://i.ibb.co/PGT8x4G/user.png"
  };
}

// ===============================
// AUTH
// ===============================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../login/index.html";
    return;
  }

  CURRENT_USER = await getUserInfo(user.uid);
  console.log("User:", CURRENT_USER);

  initRegionFilters();
  await loadAds();
});

// ===============================
// ADS LOAD
// ===============================
async function loadAds() {
  try {
    const snap = await get(ref(db, "ads"));
    ADS = [];

    snap.forEach((ownerNode) => {
      const ownerUid = ownerNode.key;
      ownerNode.forEach((adNode) => {
        const ad = adNode.val();
        ad.id = adNode.key;
        ad.userId = ownerUid;
        ADS.push(ad);
      });
    });

    renderAds();
  } catch (e) {
    console.error("loadAds error:", e);
    document.getElementById("adsList").innerText =
      "E’lonlarni yuklashda xatolik.";
  }
}

// ===============================
// REGION FILTERS
// ===============================
function initRegionFilters() {
  const fromRegion = document.getElementById("fromRegionSelect");
  const toRegion = document.getElementById("toRegionSelect");

  fromRegion.innerHTML = `<option value="">Viloyat</option>`;
  toRegion.innerHTML = `<option value="">Viloyat</option>`;

  Object.keys(REGIONS).forEach((name) => {
    fromRegion.innerHTML += `<option value="${name}">${name}</option>`;
    toRegion.innerHTML += `<option value="${name}">${name}</option>`;
  });

  fromRegion.addEventListener("change", () => {
    fillDistricts("fromRegionSelect", "fromDistricts", "fromDistrict");
    renderAds();
  });

  toRegion.addEventListener("change", () => {
    fillDistricts("toRegionSelect", "toDistricts", "toDistrict");
    renderAds();
  });
}

function fillDistricts(regionSelectId, containerId, className) {
  const region = document.getElementById(regionSelectId).value;
  const box = document.getElementById(containerId);
  box.innerHTML = "";

  if (!region || !REGIONS[region]) return;

  REGIONS[region].forEach((district) => {
    const id = `${className}-${district}`.replace(/\s+/g, "-");
    box.innerHTML += `
      <label for="${id}" style="margin-right:10px; font-size:14px;">
        <input type="checkbox" id="${id}" class="${className}" value="${district}" checked>
        ${district}
      </label>
    `;
  });

  // birinchi marta change event ulangandan keyin yana qo'shilib ketmasin deb once:true
  box.addEventListener(
    "change",
    () => {
      renderAds();
    },
    { once: true }
  );
}

// ===============================
// FILTER LOGIC
// ===============================
async function filterAds() {
  const search = (document.getElementById("search").value || "").toLowerCase();
  const sortOrder = document.getElementById("sortOrder").value;
  const timeFilter = document.getElementById("timeFilter").value;
  const minPrice = Number(document.getElementById("priceMin").value || 0);
  const maxPrice = Number(document.getElementById("priceMax").value || Infinity);

  const fromRegion = document.getElementById("fromRegionSelect").value;
  const toRegion = document.getElementById("toRegionSelect").value;

  const fromDistricts = [
    ...document.querySelectorAll(".fromDistrict:checked")
  ].map((i) => i.value);
  const toDistricts = [...document.querySelectorAll(".toDistrict:checked")].map(
    (i) => i.value
  );

  const now = Date.now();
  const result = [];

  for (const ad of ADS) {
    const owner = await getUserInfo(ad.userId);

    // ROLE LOGIKA: driver ↔ passenger
    if (CURRENT_USER?.role === "driver" && owner.role !== "passenger") continue;
    if (CURRENT_USER?.role === "passenger" && owner.role !== "driver") continue;

    // REGION FILTR
    if (fromRegion && ad.fromRegion !== fromRegion) continue;
    if (toRegion && ad.toRegion !== toRegion) continue;

    // TUMAN FILTR
    if (fromDistricts.length && !fromDistricts.includes(ad.fromDistrict))
      continue;
    if (toDistricts.length && !toDistricts.includes(ad.toDistrict)) continue;

    // NARX FILTR
    const price = Number(ad.price || 0);
    if (price < minPrice || price > maxPrice) continue;

    // VAQT FILTR (createdAt bo‘yicha)
    const created = Number(ad.createdAt || 0);
    if (timeFilter === "1d" && now - created > 24 * 3600000) continue;
    if (timeFilter === "3d" && now - created > 72 * 3600000) continue;
    if (timeFilter === "7d" && now - created > 168 * 3600000) continue;

    // QIDIRUV
    if (search) {
      const haystack = (
        (ad.fromRegion || "") +
        (ad.fromDistrict || "") +
        (ad.toRegion || "") +
        (ad.toDistrict || "") +
        (ad.comment || "") +
        (String(ad.price) || "")
      ).toLowerCase();

      if (!haystack.includes(search)) continue;
    }

    result.push({ ad, owner });
  }

  // SORT
  result.sort((a, b) => {
    const ca = Number(a.ad.createdAt || 0);
    const cb = Number(b.ad.createdAt || 0);
    return sortOrder === "old" ? ca - cb : cb - ca;
  });

  return result;
}

// ===============================
// RENDER ADS
// ===============================
async function renderAds() {
  const container = document.getElementById("adsList");
  container.innerHTML = "Yuklanmoqda...";

  const items = await filterAds();

  if (!items.length) {
    container.innerHTML = "<p>E’lonlar topilmadi</p>";
    return;
  }

  container.innerHTML = "";

  for (const { ad, owner } of items) {
    const card = document.createElement("div");
    card.className = "ad-card";

    const dateStr = ad.departureTime
      ? new Date(ad.departureTime).toLocaleString()
      : ad.createdAt
      ? new Date(ad.createdAt).toLocaleString()
      : "";

    card.innerHTML = `
      <img class="ad-avatar" src="${owner.avatar}" alt="avatar">
      <div class="ad-main">
        <div class="ad-route">${ad.fromRegion || ""}, ${ad.fromDistrict || ""} → ${ad.toRegion || ""}, ${ad.toDistrict || ""}</div>
        <div class="ad-meta">👤 ${owner.fullName} (${owner.role || "foydalanuvchi"})</div>
        <div class="ad-meta">⏰ ${dateStr}</div>
      </div>
      <div class="ad-price">${ad.price ? ad.price + " so‘m" : ""}</div>
    `;

    card.addEventListener("click", () => openModal(ad, owner));
    container.appendChild(card);
  }
}

// ===============================
// MODAL
// ===============================
function openModal(ad, owner) {
  const modal = document.getElementById("adFullModal");
  modal.style.display = "flex";

  const dateStr = ad.departureTime
    ? new Date(ad.departureTime).toLocaleString()
    : ad.createdAt
    ? new Date(ad.createdAt).toLocaleString()
    : "";

  modal.innerHTML = `
    <div class="modal-box">
      <h2>${owner.fullName}</h2>
      <p><b>Telefon:</b> ${owner.phone}</p>
      <p><b>Yo‘nalish:</b> ${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict}</p>
      <p><b>Narx:</b> ${ad.price || "-"} so‘m</p>
      <p><b>Vaqt:</b> ${dateStr}</p>
      <p><b>Izoh:</b> ${ad.comment || "-"}</p>
      <button onclick="closeModal()">Yopish</button>
      <a class="btn-primary" href="tel:${owner.phone}">Qo‘ng‘iroq</a>
    </div>
  `;
}

window.closeModal = () => {
  document.getElementById("adFullModal").style.display = "none";
};

// ===============================
// RESET & EVENTS
// ===============================
document.getElementById("resetFiltersBtn").addEventListener("click", () => {
  document.getElementById("search").value = "";
  document.getElementById("sortOrder").value = "new";
  document.getElementById("timeFilter").value = "";
  document.getElementById("priceMin").value = "";
  document.getElementById("priceMax").value = "";
  document.getElementById("fromRegionSelect").value = "";
  document.getElementById("toRegionSelect").value = "";
  document.getElementById("fromDistricts").innerHTML = "";
  document.getElementById("toDistricts").innerHTML = "";
  renderAds();
});

["search", "sortOrder", "timeFilter", "priceMin", "priceMax"].forEach((id) => {
  const el = document.getElementById(id);
  el.addEventListener("input", () => renderAds());
  el.addEventListener("change", () => renderAds());
});

// ===============================
// LOGOUT
// ===============================
window.logout = () => {
  signOut(auth).catch((e) => console.error("logout error", e));
};

console.log("Taxi index.js fully loaded");
