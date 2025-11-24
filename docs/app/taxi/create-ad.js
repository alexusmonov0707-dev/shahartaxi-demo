// docs/app/taxi/create-ad.js
// Type: module

// IMPORT kerak emas – regions fayllari allaqachon <script> orqali global yuklanadi.
// window.TAXI_REGIONS va window.REGIONS_HELPER mavjud.

// === DOM ELEMENTLAR ===
const fromRegion = document.getElementById("fromRegion");
const fromDistrict = document.getElementById("fromDistrict");
const toRegion = document.getElementById("toRegion");
const toDistrict = document.getElementById("toDistrict");
const submitBtn = document.getElementById("submitAdBtn");
const clearBtn = document.getElementById("clearFormBtn");

// === GLOBAL REGIONS ===
let TAXI_REGIONS = window.TAXI_REGIONS || null;

// ==========================
//   REGIONS LOAD CHECK
// ==========================
async function ensureRegionsLoaded() {
  if (TAXI_REGIONS && typeof TAXI_REGIONS === "object") return;

  //  Fallback — agar biron sabab bilan yuklanmagan bo‘lsa
  if (window.TAXI_REGIONS) {
    TAXI_REGIONS = window.TAXI_REGIONS;
    return;
  }

  console.error("TAXI_REGIONS yuklanmadi!");
  TAXI_REGIONS = {};
}

// ==========================
//   REGION SELECT FILL
// ==========================
function fillRegionSelects() {
  const keys = Object.keys(TAXI_REGIONS || {});

  fromRegion.innerHTML = `<option value="">Qayerdan (Viloyat)</option>`;
  toRegion.innerHTML = `<option value="">Qayerga (Viloyat)</option>`;

  keys.forEach(k => {
    const o1 = document.createElement("option");
    o1.value = k; o1.textContent = k;
    fromRegion.appendChild(o1);

    const o2 = document.createElement("option");
    o2.value = k; o2.textContent = k;
    toRegion.appendChild(o2);
  });

  fromDistrict.innerHTML = `<option value="">Tuman</option>`;
  toDistrict.innerHTML = `<option value="">Tuman</option>`;
}

// ==========================
//   DISTRICT FILL
// ==========================
function fillDistricts(region, target) {
  target.innerHTML = `<option value="">Tuman</option>`;
  if (!region) return;

  const list = TAXI_REGIONS[region] || [];
  list.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d;
    target.appendChild(opt);
  });
}

// ==========================
//   HANDLERS
// ==========================
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

  // SUBMIT – FIREBASEGA JOYLASH
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
      const lib = await import("/shahartaxi-demo/docs/libs/lib.js");
      const { db, ref, push, set, auth } = lib;

      if (!auth.currentUser) {
        alert("Kirish talab qilinadi!");
        return;
      }

      const adsRef = ref(db, "ads/" + auth.currentUser.uid);
      const newRef = push(adsRef);
      await set(newRef, payload);

      alert("E'lon muvaffaqiyatli joylandi!");

      // PROFILGA OTISH
      window.location.href = "/shahartaxi-demo/docs/app/profile/profile.html";

    } catch (error) {
      console.error(error);
      alert("E'lon joylashda xatolik yuz berdi!");
    }
  });
}

// ==========================
//   INIT
// ==========================
(async function init() {
  await ensureRegionsLoaded();
  fillRegionSelects();
  setupHandlers();
})();
