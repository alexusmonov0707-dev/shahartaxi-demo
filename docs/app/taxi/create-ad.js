// ============================
//   ELEMENTLARNI TANLASH
// ============================
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

import { regionsTaxi } from "/docs/assets/regions-taxi.js";
import { regionsHelper } from "/docs/assets/regions-helper.js";
import * as lib from "/docs/libs/lib.js";

// ============================
//   DROPDOWNLARNI TO‘LDIRISH
// ============================
regionsHelper.loadRegions(fromRegion);
regionsHelper.loadRegions(toRegion);

// Tumanlar
fromRegion.addEventListener("change", () => {
    regionsHelper.loadDistricts(fromDistrict, fromRegion.value);
});

toRegion.addEventListener("change", () => {
    regionsHelper.loadDistricts(toDistrict, toRegion.value);
});

// ============================
//       E’LON JOYLASH
// ============================
submitBtn.addEventListener("click", async () => {
    const data = {
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

    if (!data.fromRegion || !data.toRegion) {
        alert("Hududlarni tanlang!");
        return;
    }

    await lib.pushNewAd(data);

    alert("E’lon muvaffaqiyatli joylandi!");
});

// ============================
//           TOZALASH
// ============================
clearBtn.addEventListener("click", () => {
    priceInput.value = "";
    dateInput.value = "";
    seatsInput.value = "";
    commentInput.value = "";
    fromRegion.selectedIndex = 0;
    toRegion.selectedIndex = 0;
    fromDistrict.innerHTML = "";
    toDistrict.innerHTML = "";
});
