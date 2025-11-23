/* ============================================
   CREATE-AD.JS — FULL VERSION (NO SHORT CUTS)
   ============================================ */

const REGION_JS_PATH = "/shahartaxi-demo/docs/assets/regions-taxi.js";
const HELPER_JS_PATH = "/shahartaxi-demo/docs/assets/regions-helper.js";

// DOM elements
const fromRegion = document.getElementById("fromRegion");
const fromDistrict = document.getElementById("fromDistrict");
const toRegion = document.getElementById("toRegion");
const toDistrict = document.getElementById("toDistrict");
const priceInput = document.getElementById("price");
const departureInput = document.getElementById("departureTime");
const seatsInput = document.getElementById("seats");
const commentInput = document.getElementById("adComment");

const submitBtn = document.getElementById("submitAdBtn");
const clearBtn = document.getElementById("clearFormBtn");

// GLOBAL REGION DATA HOLDER
let TAXI_REGIONS = window.TAXI_REGIONS || null;

/* ============================================
   1. REGIONS LOADING (NEVER TOUCH THIS AGAIN)
   ============================================ */
async function ensureRegionsLoaded() {
  if (TAXI_REGIONS && typeof TAXI_REGIONS === "object") return;

  try {
    const mod = await import(REGION_JS_PATH);
    if (mod && (mod.default || mod.TAXI_REGIONS || mod.regions)) {
      TAXI_REGIONS = mod.default || mod.TAXI_REGIONS || mod.regions;
      window.TAXI_REGIONS = TAXI_REGIONS;
      return;
    }
  } catch (_) {}

  try {
    const r = await fetch(REGION_JS_PATH);
    const txt = await r.text();
    try {
      (0, eval)(txt);
    } catch (_) {}
    if (window.TAXI_REGIONS) {
      TAXI_REGIONS = window.TAXI_REGIONS;
      return;
    }
  } catch (err) {
    console.error("REGIONS LOAD FAILED:", err);
  }

  TAXI_REGIONS = {};
  window.TAXI_REGIONS = TAXI_REGIONS;
}

/* ============================================
   2. FILL REGION SELECTS
   ============================================ */
function fillRegionSelects() {
  const keys = Object.keys(TAXI_REGIONS || {});

  fromRegion.innerHTML = `<option value="">Qayerdan (Viloyat)</option>`;
  toRegion.innerHTML = `<option value="">Qayerga (Viloyat)</option>`;

  keys.forEach(k => {
    fromRegion.innerHTML += `<option value="${k}">${k}</option>`;
    toRegion.innerHTML += `<option value="${k}">${k}</option>`;
  });

  fromDistrict.innerHTML = `<option value="">Tuman</option>`;
  toDistrict.innerHTML = `<option value="">Tuman</option>`;
}

/* ============================================
   3. DISTRICT LOADING
   ============================================ */
function fillDistricts(region, target) {
  target.innerHTML = `<option value="">Tuman</option>`;
  if (!region) return;
  const list = TAXI_REGIONS[region] || [];
  list.forEach(d => {
    target.innerHTML += `<option value="${d}">${d}</option>`;
  });
}

/* ============================================
   4. FORM EVENT HANDLERS
   ============================================ */
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
    departureInput.value = "";
    seatsInput.value = "";
    commentInput.value = "";
  });

  submitBtn.addEventListener("click", async e => {
    e.preventDefault();

    const ad = {
      fromRegion: fromRegion.value,
      fromDistrict: fromDistrict.value,
      toRegion: toRegion.value,
      toDistrict: toDistrict.value,
      price: priceInput.value,
      departureTime: departureInput.value,
      seats: seatsInput.value,
      comment: commentInput.value,
      createdAt: Date.now(),
    };

    // validation
    if (!ad.fromRegion || !ad.fromDistrict || !ad.toRegion || !ad.toDistrict) {
      alert("Iltimos barcha maydonlarni to‘ldiring");
      return;
    }

    // FIREBASE SAVE
    try {
      const lib = await import("/shahartaxi-demo/docs/libs/lib.js");
      const { db, ref, push } = lib;
      await push(ref(db, "taxiAds"), ad);

      alert("E’lon muvaffaqiyatli joylandi!");
      window.location.href = "/shahartaxi-demo/docs/app/profile/profile.html";

    } catch (err) {
      console.error(err);
      alert("Server xatosi. Keyinroq urinib ko‘ring.");
    }
  });
}

/* ============================================
   5. INIT
   ============================================ */
(async function init() {
  await ensureRegionsLoaded();
  fillRegionSelects();
  setupHandlers();
})();
