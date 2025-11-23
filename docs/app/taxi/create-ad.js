// docs/app/taxi/create-ad.js
// Type: module

const REGION_JS_PATH = "/shahartaxi-demo/docs/assets/regions-taxi.js";
const HELPER_JS_PATH = "/shahartaxi-demo/docs/assets/regions-helper.js";

// DOM elementlar
const fromRegion = document.getElementById("fromRegion");
const fromDistrict = document.getElementById("fromDistrict");
const toRegion = document.getElementById("toRegion");
const toDistrict = document.getElementById("toDistrict");
const submitBtn = document.getElementById("submitAdBtn");
const clearBtn = document.getElementById("clearFormBtn");

// fallback container
let TAXI_REGIONS = window.TAXI_REGIONS || null;

// ===============================
//   REGIONS LOADER (o‘zgarmagan)
// ===============================
async function ensureRegionsLoaded() {
  if (TAXI_REGIONS && typeof TAXI_REGIONS === "object") {
    return;
  }

  try {
    const mod = await import(REGION_JS_PATH);
    if (mod && (mod.default || mod.TAXI_REGIONS || mod.regions)) {
      TAXI_REGIONS = mod.default || mod.TAXI_REGIONS || mod.regions;
      window.TAXI_REGIONS = TAXI_REGIONS;
      return;
    }
  } catch {}

  try {
    const r = await fetch(REGION_JS_PATH);
    if (!r.ok) throw new Error();

    const txt = await r.text();

    try { (0, eval)(txt); } catch (e2) {
      const m = txt.match(/export\s+const\s+TAXI_REGIONS\s*=\s*(\{[\s\S]*\});?/m);
      if (m && m[1]) {
        TAXI_REGIONS = eval("(" + m[1] + ")");
        window.TAXI_REGIONS = TAXI_REGIONS;
        return;
      }
    }

    if (window.TAXI_REGIONS) {
      TAXI_REGIONS = window.TAXI_REGIONS;
      return;
    }

    const jsonMatch = txt.match(/(\{[\s\S]*\})/m);
    if (jsonMatch && jsonMatch[1]) {
      TAXI_REGIONS = JSON.parse(jsonMatch[1]);
      window.TAXI_REGIONS = TAXI_REGIONS;
      return;
    }
  } catch (err) {
    console.error("Regions load failed:", err);
  }

  TAXI_REGIONS = {};
  window.TAXI_REGIONS = TAXI_REGIONS;
}

// ===============================
//   SELECT FILL
// ===============================
function fillRegionSelects() {
  const keys = Object.keys(TAXI_REGIONS || {});
  fromRegion.innerHTML = `<option value="">Qayerdan (Viloyat)</option>`;
  toRegion.innerHTML = `<option value="">Qayerga (Viloyat)</option>`;

  keys.forEach(k => {
    const a = document.createElement("option");
    a.value = k; a.textContent = k;
    fromRegion.appendChild(a);

    const b = document.createElement("option");
    b.value = k; b.textContent = k;
    toRegion.appendChild(b);
  });

  fromDistrict.innerHTML = `<option value="">Tuman</option>`;
  toDistrict.innerHTML = `<option value="">Tuman</option>`;
}

function fillDistricts(regionName, targetSelect) {
  targetSelect.innerHTML = `<option value="">Tuman</option>`;
  if (!regionName) return;

  const list = TAXI_REGIONS[regionName] || [];
  list.forEach(d => {
    const o = document.createElement("option");
    o.value = d; o.textContent = d;
    targetSelect.appendChild(o);
  });
}

// ===============================
//   HANDLERS
// ===============================
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
      createdAt: Date.now(),
    };

    console.log("New ad payload:", payload);

    // 🔥 Keyin Firebase push shu yerga qo‘shiladi
    // const lib = await import('/shahartaxi-demo/docs/libs/lib.js');
    // await push(...)

    // redirect to profile
    window.location.href = "/shahartaxi-demo/docs/app/profile/profile.html";
  });
}

// ===============================
//   INIT
// ===============================
(async function init() {
  await ensureRegionsLoaded();
  console.log("CREATE-AD LOADED — regions:", Object.keys(TAXI_REGIONS).length);
  fillRegionSelects();
  setupHandlers();
})();
