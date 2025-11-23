import { regions, districts } from "../assets/regions-helper.js";
import { taxiRegions } from "../assets/regions-taxi.js";
import { push } from "../libs/lib.js";

console.log("CREATE-AD.JS LOADED");

// ELEMENTS
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

// REGIONS LOAD
function loadRegions() {
    regions.forEach(reg => {
        fromRegion.innerHTML += `<option value="${reg}">${reg}</option>`;
        toRegion.innerHTML += `<option value="${reg}">${reg}</option>`;
    });
}
loadRegions();

// UPDATE DISTRICTS
window.updateDistricts = function (type) {
    const regionSelect = type === "from" ? fromRegion : toRegion;
    const districtSelect = type === "from" ? fromDistrict : toDistrict;

    const selectedRegion = regionSelect.value;
    districtSelect.innerHTML = `<option value="">Tuman</option>`;

    if (!selectedRegion || !districts[selectedRegion]) return;

    districts[selectedRegion].forEach(d => {
        districtSelect.innerHTML += `<option value="${d}">${d}</option>`;
    });
};

// CLEAR FORM
clearBtn.onclick = () => {
    fromRegion.value = "";
    fromDistrict.innerHTML = `<option value="">Tuman</option>`;
    toRegion.value = "";
    toDistrict.innerHTML = `<option value="">Tuman</option>`;
    priceInput.value = "";
    dateInput.value = "";
    seatsInput.value = "";
    commentInput.value = "";
};

// SUBMIT
submitBtn.onclick = async () => {
    const ad = {
        fromRegion: fromRegion.value,
        fromDistrict: fromDistrict.value,
        toRegion: toRegion.value,
        toDistrict: toDistrict.value,
        price: priceInput.value,
        date: dateInput.value,
        seats: seatsInput.value,
        comment: commentInput.value,
        createdAt: Date.now()
    };

    console.log("YUBORILYAPTI:", ad);

    try {
        await push("ads", ad);
        alert("E’lon muvaffaqiyatli joylandi!");
        clearBtn.click();
    } catch (err) {
        console.error(err);
        alert("Xatolik yuz berdi");
    }
};
