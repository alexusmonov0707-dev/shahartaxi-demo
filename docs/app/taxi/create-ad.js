// =======================================
//  CREATE-AD.JS (FULL VERSION, FIXED)
// =======================================

// Fayl manzillari (docs/ ichida)
const REGION_JS_PATH = "/shahartaxi-demo/docs/assets/regions-taxi.js";
const HELPER_JS_PATH = "/shahartaxi-demo/docs/assets/regions-helper.js";
const LIB_JS_PATH    = "/shahartaxi-demo/docs/libs/lib.js";

// ==============================
// DOM ELEMENTLAR
// ==============================
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

// ==============================
// GLOBAL REGIONS HOLDER
// ==============================
let TAXI_REGIONS = window.TAXI_REGIONS || null;

// ==============================
//  REGIONS YUKLASH BLOKI
// ==============================
async function ensureRegionsLoaded() {
  if (TAXI_REGIONS) return;

  try {
    const mod = await import(REGION_JS_PATH);

    if (mod.default) TAXI_REGIONS = mod.default;
    if (mod.TAXI_REGIONS) TAXI_REGIONS = mod.TAXI_REGIONS;
    if (mod.regions) TAXI_REGIONS = mod.regions;

    window.TAXI_REGIONS = TAXI_REGIONS;
    return;

  } catch (e) {}

  try {
    const res = await fetch(REGION_JS_PATH);
    const txt = await res.text();

    try { (0, eval)(txt); } catch (e) {}

    if (window.TAXI_REGIONS) {
      TAXI_REGIONS = window.TAXI_REGIONS;
      return;
    }

  } catch (e) {
    console.error("Failed to load regions:", e);
  }

  TAXI_REGIONS = {};
  window.TAXI_REGIONS = {};
}

// ==============================
// SELECTLARNI TO‘LDIRISH
// ==============================
function fillRegionSelects() {
  const keys = Object.keys(TAXI_REGIONS);

  fromRegion.innerHTML = `<option value="">Qayerdan (Viloyat)</option>`;
  toRegion.innerHTML   = `<option value="">Qayerga (Viloyat)</option>`;

  keys.forEach(v => {
    fromRegion.innerHTML += `<option value="${v}">${v}</option>`;
    toRegion.innerHTML   += `<option value="${v}">${v}</option>`;
  });

  fromDistrict.innerHTML = `<option value="">Tuman</option>`;
  toDistrict.innerHTML   = `<option value="">Tuman</option>`;
}

function fillDistricts(region, target) {
  target.innerHTML = `<option value="">Tuman</option>`;
  if (!region) return;

  TAXI_REGIONS[region]?.forEach(d => {
    target.innerHTML += `<option value="${d}">${d}</option>`;
  });
}

// ==============================
//  HANDLERLAR
// ==============================
function setupHandlers() {
  fromRegion.addEventListener("change", () => {
    fillDistricts(fromRegion.value, fromDistrict);
  });

  toRegion.addEventListener("change", () => {
    fillDistricts(toRegion.value, toDistrict);
  });

  clearBtn.addEventListener("click", e => {
    e.preventDefault();
    fromRegion.selectedIndex = 0;
    toRegion.selectedIndex = 0;

    fromDistrict.innerHTML = `<option value="">Tuman</option>`;
    toDistrict.innerHTML   = `<option value="">Tuman</option>`;

    priceInput.value = "";
    dateInput.value = "";
    seatsInput.value = "";
    commentInput.value = "";
  });

  // ============================
  //  E'LON YUBORISH
  // ============================
  submitBtn.addEventListener("click", async e => {
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

    // Firebase yuklash
    const lib = await import(LIB_JS_PATH);
    const { db, ref, push, set, auth } = lib;

    const user = auth.currentUser;
    if (!user) {
      alert("Kirish kerak. Login qiling.");
      return;
    }

    const newRef = push(ref(db, "taxi_ads"));
    await set(newRef, {
      ...payload,
      userId: user.uid
    });

    alert("E’lon muvaffaqiyatli joylandi!");

    // PROFILGA O‘TISH:
    window.location.href = "/shahartaxi-demo/docs/app/profile/index.html";
  });
}

// ==============================
//  INIT
// ==============================
(async function init() {
  await ensureRegionsLoaded();
  fillRegionSelects();
  setupHandlers();

  console.log("CREATE-AD READY. Regions:", Object.keys(TAXI_REGIONS).length);
})();
