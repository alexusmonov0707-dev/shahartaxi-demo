// docs/app/taxi/create-ad.js
// Type: module
// Muallif: ChatGPT (siz so'ragan holda moslab yozildi)

/*
  Asosiy printsip o'sha-o'sha.
*/

const REGION_JS_PATH = "/shahartaxi-demo/docs/assets/regions-taxi.js";
const HELPER_JS_PATH = "/shahartaxi-demo/docs/assets/regions-helper.js";

// DOM elementlar
const fromRegion = document.getElementById("fromRegion");
const fromDistrict = document.getElementById("fromDistrict");
const toRegion = document.getElementById("toRegion");
const toDistrict = document.getElementById("toDistrict");
const submitBtn = document.getElementById("submitAdBtn");
const clearBtn = document.getElementById("clearFormBtn");

// fallback regions data container
let TAXI_REGIONS = window.TAXI_REGIONS || null;

async function ensureRegionsLoaded() {
  if (TAXI_REGIONS && typeof TAXI_REGIONS === "object") return;

  try {
    const mod = await import(REGION_JS_PATH);
    if (mod && (mod.default || mod.TAXI_REGIONS || mod.regions)) {
      TAXI_REGIONS = mod.default || mod.TAXI_REGIONS || mod.regions;
      window.TAXI_REGIONS = TAXI_REGIONS;
      return;
    }
  } catch (e) {}

  try {
    const r = await fetch(REGION_JS_PATH);
    if (!r.ok) throw new Error("Fetch regions file failed: " + r.status);

    const txt = await r.text();
    try { (0, eval)(txt); } catch {}

    if (window.TAXI_REGIONS) {
      TAXI_REGIONS = window.TAXI_REGIONS;
      return;
    }
  } catch (err) {
    console.error("Regions fetch/eval failed:", err);
  }

  TAXI_REGIONS = {};
  window.TAXI_REGIONS = TAXI_REGIONS;
}

// Region selectlarni to'ldirish
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

function fillDistricts(regionName, targetSelect) {
  targetSelect.innerHTML = `<option value="">Tuman</option>`;
  if (!regionName) return;

  (TAXI_REGIONS[regionName] || []).forEach(d => {
    targetSelect.innerHTML += `<option value="${d}">${d}</option>`;
  });
}

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
    toRegion.selectedIndex = 0;
    fromDistrict.innerHTML = `<option value="">Tuman</option>`;
    toDistrict.innerHTML = `<option value="">Tuman</option>`;
    document.getElementById("price").value = "";
    document.getElementById("departureTime").value = "";
    document.getElementById("seats").value = "";
    document.getElementById("adComment").value = "";
  });

  submitBtn.addEventListener("click", async ev => {
    ev.preventDefault();

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

    console.log("New ad payload:", payload);

    // 🔥 BU YER FAQAT O'ZGARDI — NOTIFICATION QO‘SHILDI
    alert("E’lon muvaffaqiyatli joylandi!");

    // 🔥 keyin profile sahifasiga o‘tadi
    window.location.href = "/shahartaxi-demo/docs/app/profile/profile.html";
  });
}

(async function init() {
  try {
    await ensureRegionsLoaded();
    console.log("CREATE-AD.JS LOADED");
    fillRegionSelects();
    setupHandlers();
  } catch (err) {
    console.error("Init error:", err);
  }
})();
