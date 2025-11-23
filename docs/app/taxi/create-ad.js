// docs/app/taxi/create-ad.js
// Type: module

const REGION_JS_PATH = "/shahartaxi-demo/docs/assets/regions-taxi.js";
const HELPER_JS_PATH = "/shahartaxi-demo/docs/assets/regions-helper.js";

// DOM elements
const fromRegion = document.getElementById("fromRegion");
const fromDistrict = document.getElementById("fromDistrict");
const toRegion = document.getElementById("toRegion");
const toDistrict = document.getElementById("toDistrict");
const submitBtn = document.getElementById("submitAdBtn");
const clearBtn = document.getElementById("clearFormBtn");

// fallback container
let TAXI_REGIONS = window.TAXI_REGIONS || null;

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
  } catch(e){}

  try {
    const r = await fetch(REGION_JS_PATH);
    if (!r.ok) throw new Error("Fetch error");
    const txt = await r.text();

    try {
      (0, eval)(txt);
    } catch (ee) {
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

function fillRegionSelects() {
  const keys = Object.keys(TAXI_REGIONS || {});
  fromRegion.innerHTML = `<option value="">Qayerdan (Viloyat)</option>`;
  toRegion.innerHTML = `<option value="">Qayerga (Viloyat)</option>`;
  keys.forEach(k=>{
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

function fillDistricts(regionName, targetSelect) {
  targetSelect.innerHTML = `<option value="">Tuman</option>`;
  if (!regionName) return;

  const list = TAXI_REGIONS[regionName] || [];
  list.forEach(d=>{
    const o = document.createElement("option");
    o.value = d; o.textContent = d;
    targetSelect.appendChild(o);
  });
}

function setupHandlers() {
  fromRegion.addEventListener("change", ()=> fillDistricts(fromRegion.value, fromDistrict));
  toRegion.addEventListener("change", ()=> fillDistricts(toRegion.value, toDistrict));

  clearBtn.addEventListener("click", e=>{
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

  // -----------------------------
  // 🔥 REAL FIREBASE SUBMIT HERE
  // -----------------------------
submitBtn.addEventListener("click", async (ev)=>{
    ev.preventDefault();

    try {
        const fromRegionValue = fromRegion.value;
        const fromDistrictValue = fromDistrict.value;
        const toRegionValue = toRegion.value;
        const toDistrictValue = toDistrict.value;
        const price = document.getElementById("price").value;
        const departureTime = document.getElementById("departureTime").value;
        const seats = document.getElementById("seats").value;
        const comment = document.getElementById("adComment").value;

        // ❗ Firebase lib.js ni yuklaymiz
        const lib = await import("/shahartaxi-demo/docs/libs/lib.js");

        const { db, ref, push, set, auth } = lib;

        if (!auth.currentUser) {
            alert("Avval profilga kirishingiz kerak!");
            return;
        }

        const userId = auth.currentUser.uid;

        const payload = {
            userId,
            fromRegion: fromRegionValue,
            fromDistrict: fromDistrictValue,
            toRegion: toRegionValue,
            toDistrict: toDistrictValue,
            price,
            departureTime,
            seats,
            comment,
            createdAt: Date.now()
        };

        const adsRef = ref(db, "taxi_ads");
        const newAdRef = push(adsRef);

        await set(newAdRef, payload);

        alert("E’lon muvaffaqiyatli joylandi!");

        window.location.href = "/shahartaxi-demo/docs/app/profile/profile.html";

    } catch (err) {
        console.error(err);
        alert("E’lon joylashda xatolik yuz berdi!");
    }
});


    // ✔ FIREBASE IMPORT
    const lib = await import("/shahartaxi-demo/libs/lib.js");
    const { db, ref, push, set, auth } = lib;

    const user = auth.currentUser;
    if (!user) return alert("Avval tizimga kiring!");

    const adsRef = ref(db, "ads/" + user.uid);
    const newAd = push(adsRef);
    await set(newAd, payload);

    alert("🎉 E’lon muvaffaqiyatli joylandi!");
    window.location.href = "/shahartaxi-demo/app/taxi/profile.html";
  });
}

(async function init(){
  try {
    await ensureRegionsLoaded();
    fillRegionSelects();
    setupHandlers();
  } catch(err) {
    console.error("Init error:", err);
  }
})();
