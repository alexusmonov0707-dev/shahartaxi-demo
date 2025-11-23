// ======================================
//   REGIONS HELPER — MOSLASHGAN FULL VERSION
//   mos: regions-taxi.js (window.regions = {...})
//   mos: create-ad.js + my-ads.js
// ======================================

// ⚠️ Eslatma:
// regions-taxi.js → window.regions = { Andijon: [...], ... }

// GLOBAL formatga aylantiramiz
window.regionsList = Object.keys(window.regions).map(name => ({
    name,
    districts: window.regions[name]
}));

// ======================================
//   SELECTGA VILOYATLARNI YOZISH
// ======================================
window.fillRegions = function (selectId) {
    const el = document.getElementById(selectId);
    if (!el) return;

    el.innerHTML = `<option value="">Viloyat</option>`;

    window.regionsList.forEach(r => {
        const op = document.createElement("option");
        op.value = r.name;
        op.textContent = r.name;
        el.appendChild(op);
    });
};

// ======================================
//   TUMANLARNI TO‘LDIRISH
// ======================================
window.updateDistricts = function (type) {
    const regionSelect = document.getElementById(type + "Region");
    const districtSelect = document.getElementById(type + "District");

    if (!regionSelect || !districtSelect) return;

    districtSelect.innerHTML = `<option value="">Tuman</option>`;

    const selectedRegion = regionSelect.value;
    if (!selectedRegion) return;

    const regionData = window.regionsList.find(r => r.name === selectedRegion);
    if (!regionData) return;

    regionData.districts.forEach(d => {
        const op = document.createElement("option");
        op.value = d;
        op.textContent = d;
        districtSelect.appendChild(op);
    });
};
