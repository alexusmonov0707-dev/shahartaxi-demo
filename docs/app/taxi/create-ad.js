// DOM
const fromRegion = document.getElementById("fromRegion");
const fromDistrict = document.getElementById("fromDistrict");
const toRegion = document.getElementById("toRegion");
const toDistrict = document.getElementById("toDistrict");

const price = document.getElementById("price");
const departureTime = document.getElementById("departureTime");
const seats = document.getElementById("seats");
const adComment = document.getElementById("adComment");

const btnSubmit = document.getElementById("submitAdBtn");
const btnClear = document.getElementById("clearFormBtn");

// REGIONS LOADER
function loadRegions() {
    const regions = window.regionsHelper.getRegions();

    fromRegion.innerHTML = `<option value="">Qayerdan (viloyat)</option>`;
    toRegion.innerHTML = `<option value="">Qayerga (viloyat)</option>`;

    regions.forEach(r => {
        fromRegion.innerHTML += `<option value="${r}">${r}</option>`;
        toRegion.innerHTML += `<option value="${r}">${r}</option>`;
    });
}

// District loader
function loadDistricts(region, target) {
    const list = window.regionsHelper.getDistricts(region);
    target.innerHTML = `<option value="">Tuman</option>`;
    list.forEach(d => {
        target.innerHTML += `<option value="${d}">${d}</option>`;
    });
}

// HANDLERS
fromRegion.addEventListener("change", () => {
    loadDistricts(fromRegion.value, fromDistrict);
});
toRegion.addEventListener("change", () => {
    loadDistricts(toRegion.value, toDistrict);
});

btnClear.addEventListener("click", e => {
    e.preventDefault();

    fromRegion.selectedIndex = 0;
    toRegion.selectedIndex = 0;
    fromDistrict.innerHTML = `<option value="">Tuman</option>`;
    toDistrict.innerHTML = `<option value="">Tuman</option>`;

    price.value = "";
    departureTime.value = "";
    seats.value = "";
    adComment.value = "";
});

// FIREBASE SAVE
btnSubmit.addEventListener("click", async (e) => {
    e.preventDefault();

    const payload = {
        fromRegion: fromRegion.value,
        fromDistrict: fromDistrict.value,
        toRegion: toRegion.value,
        toDistrict: toDistrict.value,
        price: price.value,
        departureTime: departureTime.value,
        seats: seats.value,
        comment: adComment.value,
        createdAt: Date.now()
    };

    const lib = await import("/shahartaxi-demo/docs/libs/lib.js");
    const { db, ref, push, set, auth } = lib;

    await set(push(ref(db, "taxiAds")), payload);

    alert("E'lon muvaffaqiyatli joylandi!");
    window.location.href = "/shahartaxi-demo/docs/app/taxi/panel.html";
});

// INIT
document.addEventListener("DOMContentLoaded", loadRegions);
