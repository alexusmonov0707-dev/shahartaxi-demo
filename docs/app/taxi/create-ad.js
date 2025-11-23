// =====================
// YUKLANISH BLOKI
// =====================

// Regions helper yuklash
import "/shahartaxi-demo/docs/assets/regions-helper.js";

// Regions taxi yuklash
import "/shahartaxi-demo/docs/assets/regions-taxi.js";

// Lib.js modulini chaqirish
import * as lib from "/shahartaxi-demo/docs/libs/lib.js";

// =====================
// ELEMENTLARNI OQISH
// =====================
const fromRegion = document.getElementById("fromRegion");
const fromDistrict = document.getElementById("fromDistrict");
const toRegion = document.getElementById("toRegion");
const toDistrict = document.getElementById("toDistrict");
const priceInput = document.getElementById("price");
const dateInput = document.getElementById("departureTime");
const seatsInput = document.getElementById("seats");
const commentInput = document.getElementById("adComment");

const submitBtn = document.getElementById("submitAdBtn");
const clearBtn = document.getElementById("clearFormBtn");

// =====================
// REGIONSLARNI TO‘LDIRISH
// =====================
window.addEventListener("DOMContentLoaded", () => {
    if (window.loadRegionsToSelect) {
        loadRegionsToSelect(fromRegion);
        loadRegionsToSelect(toRegion);
        console.log("REGIONS LOADED");
    } else {
        console.error("❌ regions-helper.js topilmadi yoki yuklanmadi");
    }
});

// =====================
// TUMANLARNI YUKLASH
// =====================
fromRegion.addEventListener("change", () => {
    loadDistrictsToSelect(fromDistrict, fromRegion.value);
});

toRegion.addEventListener("change", () => {
    loadDistrictsToSelect(toDistrict, toRegion.value);
});

// =====================
// E’LON YUBORISH
// =====================
submitBtn.addEventListener("click", async () => {
    const ad = {
        fromRegion: fromRegion.value,
        fromDistrict: fromDistrict.value,
        toRegion: toRegion.value,
        toDistrict: toDistrict.value,
        price: priceInput.value,
        time: dateInput.value,
        seats: seatsInput.value,
        comment: commentInput.value,
        createdAt: Date.now()
    };

    if (!lib.push) {
        console.error("❌ lib.push eksport qilinmagan");
        alert("Xatolik: lib.push topilmadi!");
        return;
    }

    try {
        await lib.push("ads", ad);
        alert("E’lon muvaffaqiyatli qo‘shildi!");
    } catch (error) {
        console.error("❌ E’lon qo‘shishda xatolik:", error);
        alert("Xatolik!!! Konsolni tekshiring.");
    }
});

// =====================
// FORMANI TOZALASH
// =====================
clearBtn.addEventListener("click", () => {
    fromRegion.value = "";
    fromDistrict.innerHTML = "<option value=''>Tuman</option>";
    toRegion.value = "";
    toDistrict.innerHTML = "<option value=''>Tuman</option>";
    priceInput.value = "";
    dateInput.value = "";
    seatsInput.value = "";
    commentInput.value = "";
});
