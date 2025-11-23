// docs/app/taxi/create-ad.js
// Type: module

/*
  - Avval TAXI_REGIONS mavjudmi tekshiramiz.
  - Agar bo'lmasa assets/regions-taxi.js dan yuklab olamiz.
  - Selectlarni to'ldiramiz.
  - Jo'natishda Firebase'ga yozamiz.
*/

const REGION_JS_PATH = "/shahartaxi-demo/docs/assets/regions-taxi.js";

// DOM
const fromRegion = document.getElementById("fromRegion");
const fromDistrict = document.getElementById("fromDistrict");
const toRegion = document.getElementById("toRegion");
const toDistrict = document.getElementById("toDistrict");

const priceInput = document.getElementById("price");
const dateInput = document.getElementById("departureTime");
const seatsInput = document.getElementById("seats");
const commentInput = document.getElementById("adComment");

const submitBtn = document.getElementById("submitAdBtn");
const clearBtn = document.getElementById("clearFormBtn");

let TAXI_REGIONS = window.TAXI_REGIONS || null;

/* ============================
   REGIONS YUKLASH FUNKSIYASI
============================ */
async function ensureRegionsLoaded() {
  if (TAXI_REGIONS) return;

  try {
    const mod = await import(REGION_JS_PATH);

    if (mod && (mod.default || mod.TAXI_REGIONS))
      TAXI_REGIONS = mod.default || mod.TAXI_REGIONS;

    if (TAXI_REGIONS) {
      window.TAXI_REGIONS = TAXI_REGIONS;
      return;
    }
  } catch {}

  // fallback: fetch + eval
  try {
    const r = await fetch(REGION_JS_PATH);
    const txt = await r.text();

    (0, eval)(txt);

    if (window.TAXI_REGIONS) {
      TAXI_REGIONS = window.TAXI_REGIONS;
      return;
    }
  } catch (err) {
    console.error("Regions yuklashda xato:", err);
  }

  TAXI_REGIONS = {};
  window.TAXI_REGIONS = TAXI_REGIONS;
}

/* ============================
   SELECTLARNI TO‘LDIRISH
============================ */
function fillRegionSelects() {
  const keys = Object.keys(TAXI_REGIONS || {});
  fromRegion.innerHTML = `<option value="">Qayerdan (Viloyat)</option>`;
  toRegion.innerHTML = `<option value="">Qayerga (Viloyat)</option>`;

  keys.forEach(k => {
    let o1 = document.createElement("option");
    o1.value = k;
    o1.textContent = k;
    fromRegion.appendChild(o1);

    let o2 = document.createElement("option");
    o2.value = k;
    o2.textContent = k;
    toRegion.appendChild(o2);
  });

  fromDistrict.innerHTML = `<option value="">Tuman</option>`;
  toDistrict.innerHTML = `<option value="">Tuman</option>`;
}

function fillDistricts(regionName, targetSelect) {
  targetSelect.innerHTML = `<option value="">Tuman</option>`;
  if (!regionName) return;

  (TAXI_REGIONS[regionName] || []).forEach(d => {
    let opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d;
    targetSelect.appendChild(opt);
  });
}

/* ============================
   EVENT HANDLERLAR
============================ */
function setupHandlers() {
  fromRegion.addEventListener("change", () =>
    fillDistricts(fromRegion.value, fromDistrict)
  );

  toRegion.addEventListener("change", () =>
    fillDistricts(toRegion.value, toDistrict)
  );

  clearBtn.addEventListener("click", e => {
    e.preventDefault();

    fromRegion.selectedIndex = 0;
    fromDistrict.innerHTML = `<option value="">Tuman</option>`;
    toRegion.selectedIndex = 0;
    toDistrict.innerHTML = `<option value="">Tuman</option>`;

    priceInput.value = "";
    dateInput.value = "";
    seatsInput.value = "";
    commentInput.value = "";
  });

  submitBtn.addEventListener("click", submitAd);
}

/* ============================
       FIREBASEGA YOZISH
============================ */
async function submitAd(e) {
  e.preventDefault();

  const payload = {
    fromRegion: fromRegion.value,
    fromDistrict: fromDistrict.value,
    toRegion: toRegion.value,
    toDistrict: toDistrict.value,
    price: priceInput.value,
    departureTime: dateInput.value,
    seats: seatsInput.value,
    comment: commentInput.value,
    createdAt: Date.now()
  };

  // VALIDATSIA
  if (!payload.fromRegion || !payload.toRegion) {
    alert("Viloyatni tanlang!");
    return;
  }

  // FIREBASE IMPORT
  const lib = await import("/shahartaxi-demo/docs/libs/lib.js");
  const { db, ref, push, set, auth } = lib;

  const user = auth.currentUser;
  if (!user) {
    alert("Dasturga qayta kiring!");
    return;
  }

  const adsRef = ref(db, "ads/" + user.uid);
  const newAd = push(adsRef);

  await set(newAd, payload);

  alert("E’lon muvaffaqiyatli joylandi!");
  window.location.href = "/shahartaxi-demo/docs/app/profile/profile.html";
}

/* ============================
            INIT
============================ */
(async function init() {
  await ensureRegionsLoaded();
  fillRegionSelects();
  setupHandlers();

  console.log("TAXI REGIONS LOADED:", Object.keys(TAXI_REGIONS).length);
})();
