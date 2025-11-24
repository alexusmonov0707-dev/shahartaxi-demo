// =========================
//  YUKLANISH BLOKI (O'ZGARMAGAN)
// =========================

const REGION_JS_PATH = "/shahartaxi-demo/docs/assets/regions-taxi.js";
const HELPER_JS_PATH = "/shahartaxi-demo/docs/assets/regions-helper.js";

const fromRegion = document.getElementById("fromRegion");
const fromDistrict = document.getElementById("fromDistrict");
const toRegion = document.getElementById("toRegion");
const toDistrict = document.getElementById("toDistrict");
const submitBtn = document.getElementById("submitAdBtn");
const clearBtn = document.getElementById("clearFormBtn");

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
  } catch {}

  try {
    const r = await fetch(REGION_JS_PATH);
    if (!r.ok) throw new Error();
    const txt = await r.text();

    try { (0, eval)(txt); } catch (ee) {}

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

// =========================
//   SELECTLARNI TO'LDIRISH
// =========================

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

  const list = TAXI_REGIONS[region] || [];
  list.forEach(d => {
    let op = document.createElement("option");
    op.value = d;
    op.textContent = d;
    target.appendChild(op);
  });
}

// ==========================
//  EVENT HANDLERLAR
// ==========================

function setupHandlers() {
  fromRegion.addEventListener("change", () =>
    fillDistricts(fromRegion.value, fromDistrict)
  );

  toRegion.addEventListener("change", () =>
    fillDistricts(toRegion.value, toDistrict)
  );

  clearBtn.addEventListener("click", (e) => {
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

  // ============================
  // 🔥 YANGILANGAN SUBMIT FUNKSIYA
  // ============================
  submitBtn.addEventListener("click", async (ev) => {
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

    try {
      // 🔥 LIB.JS NI IMPORT QILAMIZ
      const lib = await import("/shahartaxi-demo/docs/libs/lib.js");
      const { db, ref, push, set, auth } = lib;

      const user = auth.currentUser;
      if (!user) {
        alert("Avval tizimga kiring!");
        return;
      }

      const newAdRef = push(ref(db, "ads/" + user.uid));
      await set(newAdRef, payload);

      alert("E'lon muvaffaqiyatli joylandi!");

      // 🔥 PROFILGA O'TISH
      window.location.href = "/shahartaxi-demo/docs/app/profile/my-ads.html";

    } catch (err) {
      console.error(err);
      alert("E'lon joylashda xatolik yuz berdi!");
    }
  });
}

// ==========================
//  ISHGA TUSHURISH
// ==========================

(async function init() {
  try {
    await ensureRegionsLoaded();
    fillRegionSelects();
    setupHandlers();
  } catch (e) {
    console.error("Init error:", e);
  }
})();
