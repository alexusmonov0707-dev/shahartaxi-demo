// regions-taxi.js dagi window.regionsTaxi dan foydalanadi
// Bu fayl HAM import/export ishlatmaydi

// Selectga viloyatlarni joylash
function fillRegions(selectId) {
    const select = document.getElementById(selectId);
    select.innerHTML = `<option value="">Viloyatni tanlang</option>`;

    Object.keys(window.regionsTaxi).forEach(region => {
        const opt = document.createElement("option");
        opt.value = region;
        opt.textContent = region;
        select.appendChild(opt);
    });
}

// Tumanlarni yuklash
function fillDistricts(regionSelectId, districtSelectId) {
    const region = document.getElementById(regionSelectId).value;
    const districtSelect = document.getElementById(districtSelectId);

    districtSelect.innerHTML = `<option value="">Tuman</option>`;

    if (!region || !window.regionsTaxi[region]) return;

    window.regionsTaxi[region].forEach(tuman => {
        const opt = document.createElement("option");
        opt.value = tuman;
        opt.textContent = tuman;
        districtSelect.appendChild(opt);
    });
}

// create-ad sahifa ishga tushishi uchun
function initRegionsForm() {
    fillRegions("fromRegion");
    fillRegions("toRegion");

    document.getElementById("fromRegion").addEventListener("change", () => {
        fillDistricts("fromRegion", "fromDistrict");
    });

    document.getElementById("toRegion").addEventListener("change", () => {
        fillDistricts("toRegion", "toDistrict");
    });
}

// globalga chiqaramiz (import ishlatmaymiz)
window.initRegionsForm = initRegionsForm;
