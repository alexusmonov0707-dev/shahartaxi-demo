// ==============================
// YUKLANISH BLOKI
// ==============================

// Regions helper yuklash
import "/shahartaxi-demo/docs/assets/regions-helper.js";

// Regions taxi yuklash
import "/shahartaxi-demo/docs/assets/regions-taxi.js";

// Lib.js modulini chaqirish
import * as lib from "/shahartaxi-demo/docs/libs/lib.js";


// ==============================
// ELEMENTLARNI OQISH
// ==============================
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
// ==============================
// REGIONS YUKLASH
// ==============================

// FROM REGION
fromRegion.innerHTML = '<option value="">Viloyat</option>';
Object.keys(TAXI_REGIONS).forEach(region => {
    fromRegion.innerHTML += `<option value="${region}">${region}</option>`;
});

// FROM DISTRICT
fromRegion.addEventListener("change", () => {
    fromDistrict.innerHTML = "";
    const selected = TAXI_REGIONS[fromRegion.value];

    if (!selected) return;

    selected.forEach(t => {
        fromDistrict.innerHTML += `<option value="${t}">${t}</option>`;
    });
});
fromRegion.dispatchEvent(new Event("change"));


// TO REGION
toRegion.innerHTML = '<option value="">Viloyat</option>';
Object.keys(TAXI_REGIONS).forEach(region => {
    toRegion.innerHTML += `<option value="${region}">${region}</option>`;
});

// TO DISTRICT
toRegion.addEventListener("change", () => {
    toDistrict.innerHTML = "";
    const selected = TAXI_REGIONS[toRegion.value];

    if (!selected) return;

    selected.forEach(t => {
        toDistrict.innerHTML += `<option value="${t}">${t}</option>`;
    });
});
toRegion.dispatchEvent(new Event("change"));
// ==============================
// FORM SUBMIT BLOKI
// ==============================
submitBtn.addEventListener("click", async () => {
    try {
        const newAd = {
            fromRegion: fromRegion.value,
            fromDistrict: fromDistrict.value,
            toRegion: toRegion.value,
            toDistrict: toDistrict.value,
            price: priceInput.value,
            departureTime: dateInput.value,
            seats: seatsInput.value,
            comment: commentInput.value,
            createdAt: Date.now(),
        };

        console.log("New Ad:", newAd);

        const uid = lib.getCurrentUserId();
        if (!uid) {
            alert("Iltimos, avval tizimga kiring!");
            return;
        }

        await lib.pushNewAd(uid, newAd);

        // 🔥 Test alert olib tashlandi — endi real redirect bo'ladi
        window.location.href = "/shahartaxi-demo/docs/profile/profile.html";

    } catch (error) {
        console.error("E'lon yuklashda xatolik:", error);
        alert("Xatolik yuz berdi. Qayta urinib ko'ring.");
    }
});
clearBtn.addEventListener("click", () => {
    priceInput.value = "";
    dateInput.value = "";
    seatsInput.value = "";
    commentInput.value = "";

    fromRegion.selectedIndex = 0;
    toRegion.selectedIndex = 0;

    fromRegion.dispatchEvent(new Event("change"));
    toRegion.dispatchEvent(new Event("change"));
});

