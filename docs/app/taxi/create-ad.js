// docs/app/taxi/create-ad.js
// Type: module

import {
  auth,
  db,
  ref,
  push,
  set,
  onAuthStateChanged
} from "/shahartaxi-demo/libs/lib.js";

// ==============================
//   REGIONS CONFIG
// ==============================
const REGION_JS_PATH = "/shahartaxi-demo/docs/assets/regions-taxi.js";

const fromRegion = document.getElementById("fromRegion");
const fromDistrict = document.getElementById("fromDistrict");
const toRegion = document.getElementById("toRegion");
const toDistrict = document.getElementById("toDistrict");
const submitBtn = document.getElementById("submitAdBtn");
const clearBtn = document.getElementById("clearFormBtn");

let TAXI_REGIONS = window.TAXI_REGIONS || null;

// ==============================
//   REGIONS LOADER
// ==============================
async function ensureRegionsLoaded() {
  if (TAXI_REGIONS && typeof TAXI_REGIONS === "object") {
    return;
  }

  try {
    const r = await fetch(REGION_JS_PATH);
    if (!r.ok) throw new Error("Fetch error");

    const txt = await r.text();

    try {
      (0, eval)(txt);  // window.TAXI_REGIONS yuklanadi
    } catch (e) {
      const m = txt.match(/TAXI_REGIONS\s*=\s*(\{[\s\S]*?\});/);
      if (m) {
        TAXI_REGIONS = eval("(" + m[1] + ")");
        window.TAXI_REGIONS = TAXI_REGIONS;
        return;
      }
    }

    if (window.TAXI_REGIONS) {
      TAXI_REGIONS = window.TAXI_REGIONS;
      return;
    }
  } catch (err) {
    console.error("REGIONS LOAD ERROR:", err);
  }

  TAXI_REGIONS = {};
  window.TAXI_REGIONS = TAXI_REGIONS;
}

// ==============================
//   REGIONS FILL
// ==============================
function fillRegionSelects() {
  const keys = Object.keys(TAXI_REGIONS || {});

  fromRegion.innerHTML = `<option value="">Qayerdan (Viloyat)</option>`;
  toRegion.innerHTML = `<option value="">Qayerga (Viloyat)</option>`;

  keys.forEach(name => {
    const o1 = document.createElement("option");
    o1.value = name;
    o1.textContent = name;
    fromRegion.appendChild(o1);

    const o2 = document.createElement("option");
    o2.value = name;
    o2.textContent = name;
    toRegion.appendChild(o2);
  });

  fromDistrict.innerHTML = `<option value="">Tuman</option>`;
  toDistrict.innerHTML = `<option value="">Tuman</option>`;
}

function fillDistricts(region, target) {
  target.innerHTML = `<option value="">Tuman</option>`;
  if (!region) return;

  (TAXI_REGIONS[region] || []).forEach(dist => {
    const o = document.createElement("option");
    o.value = dist;
    o.textContent = dist;
    target.appendChild(o);
  });
}

// ==============================
//   FORM HANDLERS
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
    toDistrict.innerHTML = `<option value="">Tuman</option>`;
    document.getElementById("price").value = "";
    document.getElementById("departureTime").value = "";
    document.getElementById("seats").value = "";
    document.getElementById("adComment").value = "";
  });

  submitBtn.addEventListener("click", async e => {
    e.preventDefault();
    await submitAd();
  });
}

// ==============================
//   SUBMIT AD (REAL FIREBASE)
// ==============================
async function submitAd() {
  const user = auth.currentUser;
  if (!user) {
    alert("Avval login qiling!");
    return;
  }

  const payload = {
    userId: user.uid,
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

  if (!payload.fromRegion || !payload.toRegion || !payload.price) {
    alert("Iltimos barcha maydonlarni to‘ldiring!");
    return;
  }

  try {
    const adRef = push(ref(db, "ads"));
    await set(adRef, payload);

    alert("E’lon muvaffaqiyatli joylandi!");

    window.location.href = "/shahartaxi-demo/app/profile/profile.html";

  } catch (err) {
    console.error(err);
    alert("Xatolik yuz berdi, qaytadan urinib ko‘ring.");
  }
}

// ==============================
//   INIT
// ==============================
(async function init() {
  await ensureRegionsLoaded();
  fillRegionSelects();
  setupHandlers();
})();
