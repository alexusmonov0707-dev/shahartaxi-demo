// ===============================
//   REGIONS HELPER (WORKING VERSION)
// ===============================

import { regionsTaxi } from "./regions-taxi.js";

// Sahifa yuklanganda viloyatlarni to'ldirish
export function initRegionsForm() {
    fillRegions("fromRegion");
    fillRegions("toRegion");
}

// Viloyatlar ro'yxatini selectga yuklash
function fillRegions(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;

    sel.innerHTML = `<option value="">Viloyat</option>`;

    Object.keys(regionsTaxi).forEach(region => {
        const op = document.createElement("option");
        op.value = region;
        op.textContent = region;
        sel.appendChild(op);
    });
}

// Tumanni viloyatga qarab to'ldirish
export function updateDistricts(type) {

    const regionId = type + "Region";
    const districtId = type + "District";

    const region = document.getElementById(regionId).value;
    const districtSel = document.getElementById(districtId);

    districtSel.innerHTML = `<option value="">Tuman</option>`;

    if (!regionsTaxi[region]) return;

    regionsTaxi[region].forEach(d => {
        const op = document.createElement("option");
        op.value = d;
        op.textContent = d;
        districtSel.appendChild(op);
    });
}
