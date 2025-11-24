// docs/app/taxi/create-ad.js
// Type: module
// Muallif: ChatGPT (siz so'ragan holda moslab yozildi)

/*
  Yechim printsipi:
  - Avvalo har qanday holatda regions ma'lumotini olishga harakat qilamiz.
  - 1) Agar global window.TAXI_REGIONS mavjud bo'lsa — shuni ishlatamiz.
  - 2) Aks holda '/shahartaxi-demo/docs/assets/regions-taxi.js' faylini fetch qilib
       eval() orqali yuklab olamiz (bu fayl sizning repo ichida mavjud).
  - Keyin selectlarni to'ldiramiz va onchange callback qo'yamiz.
*/

const REGION_JS_PATH = "/shahartaxi-demo/docs/assets/regions-taxi.js"; // sizning docs root bo'yicha
const HELPER_JS_PATH = "/shahartaxi-demo/docs/assets/regions-helper.js"; // agar kerak bo'lsa

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
  if (TAXI_REGIONS && typeof TAXI_REGIONS === "object") {
    return;
  }

  // 1) urinish: import modul sifatida (agar modul export qilinsa) - ammo GitHub pages da oddiy skript bo'lishi mumkin
  try {
    const mod = await import(REGION_JS_PATH);
    // agar modul nimadir export qilsa
    if (mod && (mod.default || mod.TAXI_REGIONS || mod.regions)) {
      TAXI_REGIONS = mod.default || mod.TAXI_REGIONS || mod.regions;
      window.TAXI_REGIONS = TAXI_REGIONS;
      return;
    }
  } catch(e){
    // import ishlamasa davom etamiz
    // console.log("Module import failed (ignoring):", e);
  }

  // 2) fallback: fetch text va eval — bu fayl ichida window.TAXI_REGIONS = ... tarzida bo'lsa ishlaydi
  try {
    const r = await fetch(REGION_JS_PATH);
    if (!r.ok) throw new Error("Fetch regions file failed: " + r.status);
    const txt = await r.text();
    // Ba'zi fayllarda `export const TAXI_REGIONS = ...` bo'lishi mumkin — biz universal tarzda
    // window.TAXI_REGIONS ga qiymat olinishini kutamiz. Agar export bo'lsa, eval qilish modulni yaratmaydi,
    // ammo agar fayl globalga yozsa — OK.
    // Biz faylni oldindan o'zgartirmaymiz, shuning uchun ikki qadam:
    //  - 1) eval fayl xatini; (agar fayl global yozsa window.TAXI_REGIONS to'ldiydi)
    //  - 2) agar eval natija bermasa, izlab JSON literalni olishga urinib ko'ramiz.
    try {
      // EVAL — ehtiyotkorlik bilan: butun faylni global scope ga joylaymiz
      (0, eval)(txt);
    } catch (ee) {
      // agar evalda export yoki import mavjud bo'lsa, u xatoga olib kelishi mumkin.
      // Shunda biz import-style ekstrakti qilishni sinab ko'ramiz:
      // Masalan faylda "export const TAXI_REGIONS = {...}" bo'lsa biz JSON qismni regex bilan topamiz.
      const m = txt.match(/export\s+const\s+TAXI_REGIONS\s*=\s*(\{[\s\S]*\});?/m);
      if (m && m[1]) {
        TAXI_REGIONS = eval("(" + m[1] + ")");
        window.TAXI_REGIONS = TAXI_REGIONS;
        return;
      }
    }
    // agar eval natijasida window.TAXI_REGIONS o'zgargan bo'lsa olamiz
    if (window.TAXI_REGIONS) {
      TAXI_REGIONS = window.TAXI_REGIONS;
      return;
    }
    // Agar hamon yo'q bo'lsa — urinib JSON obyektni fayldan ajratib olamiz (agar fayl sodda JSON bo'lsa)
    const jsonMatch = txt.match(/(\{[\s\S]*\})/m);
    if (jsonMatch && jsonMatch[1]) {
      try {
        TAXI_REGIONS = JSON.parse(jsonMatch[1]);
        window.TAXI_REGIONS = TAXI_REGIONS;
        return;
      } catch (ee) {
        // JSON.parse bo'lmasa ham izlashda davom etamiz
      }
    }
  } catch (err) {
    console.error("Regions fetch/eval failed:", err);
  }

  // agar baribir yo'q bo'lsa — set empty map
  TAXI_REGIONS = {};
  window.TAXI_REGIONS = TAXI_REGIONS;
}

// fill region selects
function fillRegionSelects() {
  // TAXI_REGIONS kutilyapti: structure: { "Viloyat Nomi": ["Tuman1","Tuman2", ...], ... }
  const keys = Object.keys(TAXI_REGIONS || {});
  // tozalanish
  fromRegion.innerHTML = `<option value="">Qayerdan (Viloyat)</option>`;
  toRegion.innerHTML = `<option value="">Qayerga (Viloyat)</option>`;
  keys.forEach(k=>{
    const opt1 = document.createElement("option");
    opt1.value = k; opt1.textContent = k;
    fromRegion.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = k; opt2.textContent = k;
    toRegion.appendChild(opt2);
  });
  // clear districts
  fromDistrict.innerHTML = `<option value="">Tuman</option>`;
  toDistrict.innerHTML = `<option value="">Tuman</option>`;
}

// fill districts for a region into target select
function fillDistricts(regionName, targetSelect) {
  targetSelect.innerHTML = `<option value="">Tuman</option>`;
  if (!regionName) return;
  const list = TAXI_REGIONS[regionName] || [];
  list.forEach(d=>{
    const opt = document.createElement("option");
    opt.value = d; opt.textContent = d;
    targetSelect.appendChild(opt);
  });
}

// setup events
function setupHandlers() {
  fromRegion.addEventListener("change", ()=> fillDistricts(fromRegion.value, fromDistrict));
  toRegion.addEventListener("change", ()=> fillDistricts(toRegion.value, toDistrict));

  clearBtn.addEventListener("click", e=>{
    e.preventDefault();
    fromRegion.selectedIndex = 0; fromDistrict.innerHTML = `<option value="">Tuman</option>`;
    toRegion.selectedIndex = 0; toDistrict.innerHTML = `<option value="">Tuman</option>`;
    document.getElementById("price").value = "";
    document.getElementById("departureTime").value = "";
    document.getElementById("seats").value = "";
    document.getElementById("adComment").value = "";
  });

  submitBtn.addEventListener("click", async (ev)=>{
    ev.preventDefault();
    // Hozir test uchun console ga chiqaramiz — keyin lib.js (firebase) bilan set qilamiz
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
    alert("Form submit (test). Konsolga qarang. Keyingi qadam: firebase push.");
    // TODO: import lib.js va yuborish:
    // const lib = await import('/shahartaxi-demo/docs/libs/lib.js');
    // const { db, ref, push, set, auth } = lib; ...
  });
}

(async function init(){
  try {
    await ensureRegionsLoaded();
    // debug
    console.log("CREATE-AD.JS LOADED:", location.href);
    console.log("TAXI_REGIONS keys:", Object.keys(TAXI_REGIONS || {} ).length);
    fillRegionSelects();
    setupHandlers();
  } catch(err) {
    console.error("Init error:", err);
  }
})();
