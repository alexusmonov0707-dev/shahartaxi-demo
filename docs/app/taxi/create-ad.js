// docs/app/taxi/create-ad.js
// Type: module

const REGION_JS_PATH = "/shahartaxi-demo/docs/assets/regions-taxi.js";
const HELPER_JS_PATH = "/shahartaxi-demo/docs/assets/regions-helper.js";

// DOM
const fromRegion = document.getElementById("fromRegion");
const fromDistrict = document.getElementById("fromDistrict");
const toRegion = document.getElementById("toRegion");
const toDistrict = document.getElementById("toDistrict");
const submitBtn = document.getElementById("submitAdBtn");
const clearBtn = document.getElementById("clearFormBtn");

let TAXI_REGIONS = window.TAXI_REGIONS || null;

// -----------------------------------------------------
// REGIONS LOAD
// -----------------------------------------------------
async function ensureRegionsLoaded() {
  if (TAXI_REGIONS && typeof TAXI_REGIONS === "object") return;

  try {
    const mod = await import(REGION_JS_PATH);
    if (mod && (mod.default || mod.TAXI_REGIONS)) {
      TAXI_REGIONS = mod.default || mod.TAXI_REGIONS;
      window.TAXI_REGIONS = TAXI_REGIONS;
      return;
    }
  } catch (e) {}

  try {
    const r = await fetch(REGION_JS_PATH);
    const txt = await r.text();
    try {
      (0, eval)(txt);
    } catch (err) {}

    if (window.TAXI_REGIONS) {
      TAXI_REGIONS = window.TAXI_REGIONS;
      return;
    }
  } catch (err) {
    console.error("Region load error:", err);
  }

  TAXI_REGIONS = {};
  window.TAXI_REGIONS = TAXI_REGIONS;
}

// -----------------------------------------------------
// FILL SELECTS
// -----------------------------------------------------
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

function fillDistricts(region, target) {
  target.innerHTML = `<option value="">Tuman</option>`;
  if (!region) return;

  (TAXI_REGIONS[region] || []).forEach(t => {
    let o = document.createElement("option");
    o.value = t;
    o.textContent = t;
    target.appendChild(o);
  });
}

// -----------------------------------------------------
// HANDLERS
// -----------------------------------------------------
function setupHandlers() {
  fromRegion.addEventListener("change", () =>
    fillDistricts(fromRegion.value, fromDistrict)
  );

  toRegion.addEventListener("change", () =>
    fillDistricts(toRegion.value, toDistrict)
  );

  clearBtn.addEventListener("click", e => {
    e.preventDefault();
    fromRegion.value = "";
    fromDistrict.innerHTML = `<option value="">Tuman</option>`;
    toRegion.value = "";
    toDistrict.innerHTML = `<option value="">Tuman</option>`;
    document.getElementById("price").value = "";
    document.getElementById("departureTime").value = "";
    document.getElementById("seats").value = "";
    document.getElementById("adComment").value = "";
  });

  // -----------------------------------------------------
  // ASOSIY QO‘SHILGAN - FIREBASEGA JOYLASH
  // -----------------------------------------------------
  submitBtn.addEventListener("click", async e => {
    e.preventDefault();

    const payload = {
      fromRegion: fromRegion.value,
      fromDistrict: fromDistrict.value,
      toRegion: toRegion.value,
      toDistrict: toDistrict.value,
      price: document.getElementById("price").value,
      departureTime: document.getElementById("departureTime").value,
      seats: document.getElementById("seats").value,
      comment: document.getElementById("adComment").value,
      createdAt: Date.now()
    };

    try {
      const lib = await import("/shahartaxi-demo/docs/libs/lib.js");
      const { db, ref, push, set, auth } = lib;

      const user = auth.currentUser;
      if (!user) return alert("Avval tizimga kiring!");

      const newRef = push(ref(db, "ads/" + user.uid));
      await set(newRef, payload);

      alert("E’lon muvaffaqiyatli joylandi!");
      window.location.href = "/shahartaxi-demo/docs/app/taxi/profile.html";
    } catch (err) {
      console.error(err);
      alert("Xatolik yuz berdi");
    }
  });
}

// -----------------------------------------------------
// INIT
// -----------------------------------------------------
(async function init() {
  await ensureRegionsLoaded();
  fillRegionSelects();
  setupHandlers();
})();
