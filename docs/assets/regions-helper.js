// ===============================
//   REGIONS HELPER — FULL VERSION
//   moslashgan: my-ads.js + create-ad.js
// ===============================

import { regionsTaxi } from "./regions-taxi.js";

// GLOBAL O'ZGARUVCHI — my-ads.js shu nomni kutadi
window.regions = Object.keys(regionsTaxi).map(name => ({
    name,
    districts: regionsTaxi[name]
}));

// ==========================
//   SELECTGA VILOYATLARNI YOZISH
// ==========================
window.fillRegions = function(selectId) {
    const el = document.getElementById(selectId);
    if (!el) return;

    el.innerHTML = `<option value="">Viloyat</option>`;

    window.regions.forEach(r => {
        const op = document.createElement("option");
        op.value = r.name;
        op.textContent = r.name;
        el.appendChild(op);
    });
};

// ==========================
//   TUMANLARNI TO‘LDIRISH
// ==========================
window.updateDistricts = function(type) {
    const regionSelect = document.getElementById(type + "Region");
    const districtSelect = document.getElementById(type + "District");

    districtSelect.innerHTML = `<option value="">Tuman</option>`;

    const selectedRegion = regionSelect.value;
    if (!selectedRegion) return;

    const regionData = window.regions.find(r => r.name === selectedRegion);
    if (!regionData) return;

    regionData.districts.forEach(d => {
        const op = document.createElement("option");
        op.value = d;
        op.textContent = d;
        districtSelect.appendChild(op);
    });
};
