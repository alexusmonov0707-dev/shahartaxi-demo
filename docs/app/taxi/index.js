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
// USER HELPERS (SAQLANDI, LEKIN ENDI KAM ISHLATILADI)
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
      avatar,
      driverInfo: u.driverInfo || {}
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
    avatar: "https://i.ibb.co/PGT8x4G/user.png",
    driverInfo: {}
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
// ✅ OPTIMALLASHTIRILGAN ADS LOAD (USERS 1 MARTA YUKLANADI)
// ===============================
async function loadAds() {
  try {
    const [adsSnap, usersSnap] = await Promise.all([
      get(ref(db, "ads")),
      get(ref(db, "users"))
    ]);

    const USERS = usersSnap.val() || {};
    ADS = [];

    adsSnap.forEach((ownerNode) => {
      const ownerUid = ownerNode.key;
      const ownerRaw = USERS[ownerUid] || defaultUser();

      const owner = {
        uid: ownerUid,
        fullName: ownerRaw.fullName || "Foydalanuvchi",
        phone: ownerRaw.phone || "-",
        role: ownerRaw.role || "",
        avatar:
          !ownerRaw.avatar || ownerRaw.avatar.startsWith("/")
            ? "https://i.ibb.co/PGT8x4G/user.png"
            : ownerRaw.avatar,
        driverInfo: ownerRaw.driverInfo || {}
      };

      ownerNode.forEach((adNode) => {
        const ad = adNode.val();
        ad.id = adNode.key;
        ad.userId = ownerUid;

        // 🔥 endi har bir ad ichida owner ham bor
        ADS.push({ ad, owner });
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
// REGION FILTERS (O‘ZGARISH YO‘Q)
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
        <input type="checkbox" id="${id}" class="${className}" value="${district}">
        ${district}
      </label>
    `;
  });

  box.addEventListener("change", () => {
    renderAds();
  });
}

// 🔥 boshqa joy bosilganda shaharlar yo'qolishi (SAQLANDI)
document.addEventListener("click", (e) => {
  const target = e.target;
  const fromArea =
    target.closest("#fromRegionSelect") || target.closest("#fromDistricts");
  const toArea =
    target.closest("#toRegionSelect") || target.closest("#toDistricts");

  if (!fromArea) {
    const fromBox = document.getElementById("fromDistricts");
    if (fromBox) fromBox.innerHTML = "";
  }

  if (!toArea) {
    const toBox = document.getElementById("toDistricts");
    if (toBox) toBox.innerHTML = "";
  }
});

// ===============================
// ✅ OPTIMALLASHTIRILGAN FILTER (ENDI FIREBASE YO‘Q)
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

  for (const item of ADS) {
    const ad = item.ad;
    const owner = item.owner;

    // ROLE LOGIKA: driver ↔ passenger
    if (CURRENT_USER?.role === "driver" && owner.role !== "passenger") continue;
    if (CURRENT_USER?.role === "passenger" && owner.role !== "driver") continue;

    if (fromRegion && ad.fromRegion !== fromRegion) continue;
    if (toRegion && ad.toRegion !== toRegion) continue;

    if (fromDistricts.length && !fromDistricts.includes(ad.fromDistrict))
      continue;
    if (toDistricts.length && !toDistricts.includes(ad.toDistrict)) continue;

    const price = Number(ad.price || 0);
    if (price < minPrice || price > maxPrice) continue;

   // ✅ VAQT FILTR — FAQAT JO‘NASH VAQTI (departureTime) BO‘YICHA
const departure = Number(ad.departureTime || 0);

if (!departure) continue; // jo‘nash vaqti yo‘q bo‘lsa umuman tushmaydi

if (timeFilter === "1d" && departure - now > 24 * 3600000) continue;
if (timeFilter === "3d" && departure - now > 72 * 3600000) continue;
if (timeFilter === "7d" && departure - now > 168 * 3600000) continue;


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

    result.push(item);
  }

  result.sort((a, b) => {
    const ca = Number(a.ad.createdAt || 0);
    const cb = Number(b.ad.createdAt || 0);
    return sortOrder === "old" ? ca - cb : cb - ca;
  });

  return result;
}

// ===============================
// RENDER ADS (O‘ZGARISH YO‘Q)
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

    const createdTimeStr = ad.createdAt
      ? new Date(ad.createdAt).toLocaleString()
      : "";

    let carHtml = "";
    let peopleHtml = "";

    if (owner.role === "driver") {
      const driver = owner.driverInfo || {};
      const carModel = driver.carModel || "-";
      const carNumber = driver.carNumber || "-";

      carHtml = `<div class="ad-meta">🚗 ${carModel} (${carNumber})</div>`;
      peopleHtml = `<div class="ad-meta">💺 ${ad.seats || 0} o‘rin</div>`;
    } else if (owner.role === "passenger") {
      carHtml = "";
      peopleHtml = `<div class="ad-meta">👥 ${ad.passengerCount || 0} yo‘lovchi</div>`;
    }

    card.innerHTML = `
      <img class="ad-avatar" src="${owner.avatar}" alt="avatar">

      <div class="ad-main">
        <div class="ad-route">
          ${ad.fromRegion || ""}, ${ad.fromDistrict || ""} → ${ad.toRegion || ""}, ${ad.toDistrict || ""}
        </div>

        ${carHtml}
        ${peopleHtml}

        <div class="ad-meta">
          📍 Jo‘nash: ${
            ad.departureTime
              ? new Date(ad.departureTime).toLocaleString()
              : "-"
          }
        </div>
      </div>

      <div class="ad-price">
        ${ad.price ? ad.price + " so‘m" : ""}
        <div style="font-size:12px;color:#555;margin-top:4px;">
          ⏰ ${createdTimeStr}
        </div>
      </div>
    `;

    card.addEventListener("click", () => openModal(ad, owner));
    container.appendChild(card);
  }
}

// ===============================
// MODAL (O‘ZGARISH YO‘Q)
// ===============================
function openModal(ad, owner) {
  const modal = document.getElementById("adFullModal");
  modal.style.display = "flex";

  const createdTimeStr = ad.createdAt
    ? new Date(ad.createdAt).toLocaleString()
    : "-";

  let carBlock = "";
  let peopleBlock = "";

  if (owner.role === "driver") {
    const driver = owner.driverInfo || {};

    carBlock = `
      <p><b>Mashina rusumi:</b> ${driver.carModel || "-"}</p>
      <p><b>Mashina rangi:</b> ${driver.carColor || "-"}</p>
      <p><b>Mashina raqami:</b> ${driver.carNumber || "-"}</p>
      <hr>
    `;

    peopleBlock = `
      <p><b>Bo‘sh o‘rinlar:</b> ${ad.seats || 0}</p>
    `;
  }

  if (owner.role === "passenger") {
    carBlock = "";

    peopleBlock = `
      <p><b>Yo‘lovchilar soni:</b> ${ad.passengerCount || 0}</p>
    `;
  }

  modal.innerHTML = `
    <div class="modal-box">
      <h2>${owner.fullName || "Foydalanuvchi"}</h2>

      <img
        src="${owner.avatar}"
        style="width:120px;height:120px;border-radius:50%;object-fit:cover;margin-bottom:10px;"
      >

      <p><b>Telefon:</b> ${owner.phone || "-"}</p>

      <p><b>Yo‘nalish:</b>
        ${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict}
      </p>

      <p><b>Jo‘nash vaqti:</b>
        ${
          ad.departureTime
            ? new Date(ad.departureTime).toLocaleString()
            : "-"
        }
      </p>

      <hr>

      ${carBlock}
      ${peopleBlock}

      <p><b>Narx:</b> ${ad.price || "-"} so‘m</p>
      <p><b>E’lon joylangan vaqt:</b> ${createdTimeStr}</p>
      <p><b>Izoh:</b> ${ad.comment || "-"}</p>

      <a class="btn-primary" href="tel:${owner.phone}">Qo‘ng‘iroq</a>
      <br><br>
      <button onclick="closeModal()">Yopish</button>
    </div>
  `;
}

window.closeModal = () => {
  document.getElementById("adFullModal").style.display = "none";
};

// ===============================
// RESET & EVENTS (O‘ZGARISH YO‘Q)
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

console.log("Taxi index.js fully loaded ✅ OPTIMIZED");
