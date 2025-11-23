// docs/app/taxi/create-ad.js
// Type: module
// Muallif: ChatGPT - create-ad fayli uchun to'liq ishlaydigan skript
//
// Asosiy maqsad: regions ma'lumotlarini yuklash, formni to'ldirish, validatsiya,
// va Firebase orqali "ad" (e'lon) push qilish.
// Yo'llar (docs root ga mos): o'zgartirmasangiz ishlashi kerak.

const REGION_JS_PATH = "/shahartaxi-demo/docs/assets/regions-taxi.js";
const LIB_JS_PATH = "/shahartaxi-demo/docs/libs/lib.js";
const REDIRECT_AFTER_CREATE = "/shahartaxi-demo/docs/app/profile.html"; // e'lon qo'yilgach yo'naltirish

// DOM elementlarni aniqlash (HTML faylingizdagi id lar bilan mos bo'lishi kerak)
function el(id) {
  return document.getElementById(id) || document.querySelector(`[name="${id}"]`) || null;
}

const fromRegion = el("fromRegion");
const fromDistrict = el("fromDistrict");
const toRegion = el("toRegion");
const toDistrict = el("toDistrict");
const priceInput = el("price");
const departureInput = el("departureTime") || el("departure");
const seatsInput = el("seats");
const phoneInput = el("phone") || el("contact") || el("phoneNumber");
const commentInput = el("adComment") || el("comment");
const submitBtn = el("submitAdBtn") || el("submitBtn") || el("createAdBtn");
const clearBtn = el("clearFormBtn") || el("clearBtn");

// Agar kerakli elementlardan biri topilmasa - xato chiqarsin
if (!fromRegion || !fromDistrict || !toRegion || !toDistrict || !submitBtn || !clearBtn) {
  console.error("create-ad.js: kerakli DOM elementlari topilmadi. IDs tekshiring.");
}

// Globals
let TAXI_REGIONS = window.TAXI_REGIONS || null;

// Yuklash: regions ma'lumotini ishonchli olish uchun funksiya
async function ensureRegionsLoaded() {
  if (TAXI_REGIONS && typeof TAXI_REGIONS === "object" && Object.keys(TAXI_REGIONS).length) {
    return;
  }

  // 1) agar modul sifatida import qilib bo'lsa sinab ko'ramiz
  try {
    const m = await import(REGION_JS_PATH);
    // modul ichida biror foydalanishli eksport bo'lsa olamiz
    TAXI_REGIONS = m.default || m.TAXI_REGIONS || m.regions || window.TAXI_REGIONS || TAXI_REGIONS;
    if (TAXI_REGIONS && Object.keys(TAXI_REGIONS).length) {
      window.TAXI_REGIONS = TAXI_REGIONS;
      return;
    }
  } catch (err) {
    // import ishlamasa davom etamiz
    // console.log("Module import failed (regions):", err);
  }

  // 2) fetch + eval yoki JSON parse
  try {
    const r = await fetch(REGION_JS_PATH);
    if (!r.ok) throw new Error("Regions file fetch error: " + r.status);
    const txt = await r.text();

    // 2.1: eval bu fayl globalga window.TAXI_REGIONS qo'yadi deb umid qilamiz
    try {
      (0, eval)(txt);
    } catch (e) {
      // eval bo'lmasa, fayl ichidan obyektni regex bilan ajratib olishga urin
      // qidiruv: export const TAXI_REGIONS = { ... }
      const m = txt.match(/export\s+const\s+TAXI_REGIONS\s*=\s*(\{[\s\S]*\});?/m);
      if (m && m[1]) {
        TAXI_REGIONS = eval("(" + m[1] + ")");
        window.TAXI_REGIONS = TAXI_REGIONS;
        return;
      }
      // yoki fayl faqat JSON literal saqlasa
      const jsonMatch = txt.match(/(\{[\s\S]*\})/m);
      if (jsonMatch && jsonMatch[1]) {
        try {
          TAXI_REGIONS = JSON.parse(jsonMatch[1]);
          window.TAXI_REGIONS = TAXI_REGIONS;
          return;
        } catch (ee) {
          // parse bo'lmasa davom etamiz
        }
      }
    }

    // agar eval orqali window to'ldirilgan bo'lsa
    if (window.TAXI_REGIONS && Object.keys(window.TAXI_REGIONS).length) {
      TAXI_REGIONS = window.TAXI_REGIONS;
      return;
    }

  } catch (err) {
    console.warn("ensureRegionsLoaded: fetch/eval failed:", err);
  }

  // Oxirgi fallback: bo'sh obyekt
  TAXI_REGIONS = TAXI_REGIONS || {};
  window.TAXI_REGIONS = TAXI_REGIONS;
}

// Selectlarni to'ldirish
function fillRegionSelects() {
  try {
    const keys = Object.keys(TAXI_REGIONS || {});
    // bosh option
    if (fromRegion) fromRegion.innerHTML = `<option value="">Qayerdan (Viloyat)</option>`;
    if (toRegion) toRegion.innerHTML = `<option value="">Qayerga (Viloyat)</option>`;

    keys.forEach(k => {
      const o1 = document.createElement("option");
      o1.value = k; o1.textContent = k;
      if (fromRegion) fromRegion.appendChild(o1);

      const o2 = document.createElement("option");
      o2.value = k; o2.textContent = k;
      if (toRegion) toRegion.appendChild(o2);
    });

    if (fromDistrict) fromDistrict.innerHTML = `<option value="">Tuman</option>`;
    if (toDistrict) toDistrict.innerHTML = `<option value="">Tuman</option>`;
  } catch (err) {
    console.error("fillRegionSelects error:", err);
  }
}

// Viloyatga qarab tumanlarni to'ldirish
function fillDistricts(regionName, targetSelect) {
  if (!targetSelect) return;
  targetSelect.innerHTML = `<option value="">Tuman</option>`;
  if (!regionName) return;
  const arr = TAXI_REGIONS && TAXI_REGIONS[regionName] ? TAXI_REGIONS[regionName] : [];
  arr.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d; opt.textContent = d;
    targetSelect.appendChild(opt);
  });
}

// Form eventlarini sozlash
function setupHandlers() {
  if (fromRegion && fromDistrict) {
    fromRegion.addEventListener("change", () => fillDistricts(fromRegion.value, fromDistrict));
  }
  if (toRegion && toDistrict) {
    toRegion.addEventListener("change", () => fillDistricts(toRegion.value, toDistrict));
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (fromRegion) fromRegion.selectedIndex = 0;
      if (fromDistrict) fromDistrict.innerHTML = `<option value="">Tuman</option>`;
      if (toRegion) toRegion.selectedIndex = 0;
      if (toDistrict) toDistrict.innerHTML = `<option value="">Tuman</option>`;
      if (priceInput) priceInput.value = "";
      if (departureInput) departureInput.value = "";
      if (seatsInput) seatsInput.value = "";
      if (phoneInput) phoneInput.value = "";
      if (commentInput) commentInput.value = "";
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      try {
        // Validsatsiya
        const fromR = fromRegion ? fromRegion.value : "";
        const fromD = fromDistrict ? fromDistrict.value : "";
        const toR = toRegion ? toRegion.value : "";
        const toD = toDistrict ? toDistrict.value : "";
        const price = priceInput ? priceInput.value.trim() : "";
        const depart = departureInput ? departureInput.value.trim() : "";
        const seats = seatsInput ? seatsInput.value.trim() : "";
        const phone = phoneInput ? phoneInput.value.trim() : "";
        const comment = commentInput ? commentInput.value.trim() : "";

        if (!fromR || !fromD || !toR || !toD) {
          alert("Iltimos, qayerdan va qayerga (viloyat va tuman) maydonlarini to'ldiring.");
          return;
        }
        if (!price) {
          alert("Iltimos, narxni kiriting.");
          return;
        }

        // Tayyor payload
        const payload = {
          fromRegion: fromR,
          fromDistrict: fromD,
          toRegion: toR,
          toDistrict: toD,
          price: price,
          departureTime: depart || null,
          seats: seats || null,
          phone: phone || null,
          comment: comment || null,
          createdAt: Date.now(),
          status: "active"
        };

        // Yuborish: avvalo sinov (console), keyin Firebase push
        console.log("CREATE-AD: prepared payload:", payload);

        // Dinamik import lib.js (modul sifatida)
        let lib = null;
        try {
          lib = await import(LIB_JS_PATH);
        } catch (e) {
          console.warn("lib.js import failed:", e);
        }

        // Agar modul topilsa, unga mos yuborish
        if (lib) {
          // Muqobil nomlar bilan qidiramiz
          const db = lib.db || lib.default?.db || lib.getDatabase?.() || null;
          const pushFn = lib.push || lib.default?.push || null;
          const refFn = lib.ref || lib.default?.ref || null;
          const setFn = lib.set || lib.default?.set || null;

          // Agar sizning lib.js sizga db, ref, push, set kabi eksportlar beradi:
          if (db && pushFn && refFn) {
            try {
              const rootRef = refFn(db, "ads"); // 'ads' - sizning DB joyi, kerak bo'lsa o'zgartiring
              const newRef = await pushFn(rootRef);
              if (setFn) {
                await setFn(newRef, payload);
              } else if (lib.set) {
                await lib.set(newRef, payload);
              } else {
                // agar set yo'q bo'lsa, ba'zi liblar push(obj) tarzida ishlaydi:
                if (typeof pushFn === "function") {
                  // some SDKs: push(ref, value)
                  try {
                    await pushFn(rootRef, payload);
                  } catch (ee) {
                    console.warn("push with value failed:", ee);
                  }
                }
              }
              // Muvaffaqiyat
              alert("E'lon muvaffaqiyatli joylandi!");
              // Redirect to profile
              window.location.href = REDIRECT_AFTER_CREATE;
              return;
            } catch (errPush) {
              console.error("Firebase push error:", errPush);
              alert("E'lonni saqlashda xatolik yuz berdi: " + errPush.message);
              return;
            }
          } else {
            // lib import bo'ldi lekin kerakli funksiyalar topilmadi
            console.warn("lib loaded but required exports missing. lib keys:", Object.keys(lib || {}));
            // U holda sinov uchun localStorage ga qo'yamiz (fallback)
            try {
              const stash = JSON.parse(localStorage.getItem("local_ads") || "[]");
              stash.push(payload);
              localStorage.setItem("local_ads", JSON.stringify(stash));
              alert("E'lon lokal ravishda saqlandi (lib modul topilmadi). Keyin uni serverga yuboring.");
              window.location.href = REDIRECT_AFTER_CREATE;
              return;
            } catch (ee) {
              console.error("local fallback failed:", ee);
              alert("E'lonni saqlashni yakunlashda xatolik.");
              return;
            }
          }
        } else {
          // lib yo'q: fallback localStorage
          try {
            const stash = JSON.parse(localStorage.getItem("local_ads") || "[]");
            stash.push(payload);
            localStorage.setItem("local_ads", JSON.stringify(stash));
            alert("E'lon lokal ravishda saqlandi (server kutubxonasi yuklanmadi).");
            window.location.href = REDIRECT_AFTER_CREATE;
            return;
          } catch (ee) {
            console.error("local fallback failed:", ee);
            alert("E'lonni saqlashni yakunlashda xatolik.");
            return;
          }
        }

      } catch (err) {
        console.error("submit handler error:", err);
        alert("Formni yuborishda xatolik: " + (err && err.message ? err.message : err));
      }
    });
  }
}

// Init
(async function init() {
  try {
    console.log("CREATE-AD.JS START:", location.href);
    await ensureRegionsLoaded();
    console.log("TAXI_REGIONS loaded, keys:", Object.keys(TAXI_REGIONS || {}).length);
    fillRegionSelects();
    setupHandlers();
  } catch (err) {
    console.error("create-ad init error:", err);
  }
})();
