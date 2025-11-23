import { db, pushData } from "/shahartaxi-demo/docs/assets/js/libs.js";

import { 
    loadRegions, 
    loadDistricts 
} from "/shahartaxi-demo/docs/assets/regions/regions-helper.js";

console.log("CREATE-AD JS LOADED");

// HTML elementlar
const fromRegion = document.getElementById("fromRegion");
const fromDistrict = document.getElementById("fromDistrict");

const toRegion = document.getElementById("toRegion");
const toDistrict = document.getElementById("toDistrict");

const price = document.getElementById("price");
const time = document.getElementById("departureTime");
const seats = document.getElementById("seats");
const comment = document.getElementById("comment");

const submitBtn = document.getElementById("submitAdBtn");
const clearBtn = document.getElementById("clearFormBtn");

// Viloyat va tumanlarni yuklash
loadRegions(fromRegion);
loadRegions(toRegion);

fromRegion.onchange = () => loadDistricts(fromRegion, fromDistrict);
toRegion.onchange = () => loadDistricts(toRegion, toDistrict);

// E’lonni bazaga yuborish
submitBtn.onclick = async () => {
    let ad = {
        fromRegion: fromRegion.value,
        fromDistrict: fromDistrict.value,
        toRegion: toRegion.value,
        toDistrict: toDistrict.value,
        price: price.value,
        time: time.value,
        seats: seats.value,
        comment: comment.value,
        createdAt: Date.now()
    };

    await pushData("taxiAds", ad);

    alert("E’lon muvaffaqiyatli joylandi!");
};

// Tozalash tugmasi
clearBtn.onclick = () => {
    price.value = "";
    seats.value = "";
    comment.value = "";
    time.value = "";
};
