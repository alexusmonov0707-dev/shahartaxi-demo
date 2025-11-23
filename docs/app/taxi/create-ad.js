// =============================================================
//  CREATE-AD.JS (FINAL, FULL WORKING VERSION FOR GITHUB PAGES)
//  Import yo‘q, export yo‘q → GitHub Pages bilan 100% mos.
//  regions-helper.js + regions-taxi.js buzilmaydi.
// =============================================================

// Regions fayli manzili (sening loyihang bo‘yicha)
const REGIONS_FILE = "/shahartaxi-demo/docs/assets/regions-taxi.js";

// DOM elementlar
const fromRegion = document.getElementById("fromRegion");
const fromDistrict = document.getElementById("fromDistrict");
const toRegion = document.getElementById("toRegion");
const toDistrict = document.getElementById("toDistrict");
const priceInput = document.getElementById("price");
const departureTime = document.getElementById("departureTime");
const seatsInput = document.getElementById("seats");
const commentInput = document.getElementById("adComment");
const phoneInput = document.getElementById("optPhone");
const submitBtn = document.getElementById("submitAdBtn");
const clearBtn = document.getElementById("clearFormBtn");

// Global regions obyekt
let TAXI_REGIONS = window.TAXI_REGIONS || null;

// =============================================================
//  REGION MA'LUMOTLARINI YUKLASH (fallback + eval + JSON)
// =============================================================
async function loadRegions() {
    if (TAXI_REGIONS && typeof TAXI_REGIONS === "object") return;

    try {
        const r = await fetch(REGIONS_FILE);
        const txt = await r.text();

        try { (0, eval)(txt); } catch (e) {}

        if (window.TAXI_REGIONS) {
            TAXI_REGIONS = window.TAXI_REGIONS;
            return;
        }

        const jsonMatch = txt.match(/(\{[\s\S]*\})/m);
        if (jsonMatch) {
            TAXI_REGIONS = JSON.parse(jsonMatch[1]);
            window.TAXI_REGIONS = TAXI_REGIONS;
        }
    } catch (e) {
        console.error("Viloyatlar yuklanmadi:", e);
        TAXI_REGIONS = {};
    }
}

// =============================================================
//  SELECTLARNI TO‘LDIRISH
// =============================================================
function fillRegions() {
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

function fillDistricts(region, target) {
    target.innerHTML = `<option value="">Tuman</option>`;
    if (!region) return;
    (TAXI_REGIONS[region] || []).forEach(d => {
        target.innerHTML += `<option value="${d}">${d}</option>`;
    });
}

// =============================================================
//  EVENT HANDLERS
// =============================================================
function setupEvents() {

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
        priceInput.value = "";
        departureTime.value = "";
        seatsInput.value = "";
        commentInput.value = "";
        phoneInput.value = "";
    });

    // ================================================================
    // E’LON JOYLASH (FIREBASE YUBORILADI)
    // ================================================================
    submitBtn.addEventListener("click", async e => {
        e.preventDefault();

        const payload = {
            fromRegion: fromRegion.value,
            fromDistrict: fromDistrict.value,
            toRegion: toRegion.value,
            toDistrict: toDistrict.value,
            price: priceInput.value,
            departureTime: departureTime.value,
            seats: seatsInput.value,
            phone: phoneInput.value,
            comment: commentInput.value,
            createdAt: Date.now()
        };

        // Shartli tekshiruv
        if (!payload.fromRegion || !payload.toRegion) {
            alert("Iltimos, viloyatlarni tanlang.");
            return;
        }

        // FIREBASE YOZISH
        try {
            const lib = await import("/shahartaxi-demo/docs/libs/lib.js");
            const { db, ref, push, set, auth } = lib;

            const user = auth.currentUser;
            if (!user) {
                alert("Avval tizimga kiring.");
                return;
            }

            const adsRef = ref(db, "ads/" + user.uid);
            const newRef = push(adsRef);
            await set(newRef, payload);

            alert("E’lon muvaffaqiyatli joylandi!");
            location.href = "/shahartaxi-demo/docs/app/profile/profile.html";

        } catch (e) {
            console.error(e);
            alert("Xatolik! E’lon saqlanmadi.");
        }
    });
}

// =============================================================
//  INIT
// =============================================================
(async function init() {
    await loadRegions();
    fillRegions();
    setupEvents();
})();
