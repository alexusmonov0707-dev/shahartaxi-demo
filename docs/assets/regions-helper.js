// =============================================
// REGIONS HELPER (Tuzatilgan to‘liq versiya)
// Hech narsa o‘chirilmadi, faqat 2 ta joy fix.
// =============================================

export function loadRegionsSelects(regionsData, selectors = []) {
    if (!regionsData || typeof regionsData !== "object") {
        console.warn("Regions data not loaded");
        return;
    }

    selectors.forEach(selId => {
        const sel = document.getElementById(selId);
        if (!sel) return;

        sel.innerHTML = `<option value="">Viloyat</option>`;

        Object.keys(regionsData).forEach(region => {
            sel.innerHTML += `<option value="${region}">${region}</option>`;
        });
    });
}

// ===============================
// DISTRICT UPDATE (TUZATILGAN)
// ===============================
export function updateDistricts(regionId, districtId, regionsData, callback) {
    if (!regionsData || typeof regionsData !== "object") {
        console.warn("Regions not loaded");
        return;
    }

    let rSel = document.getElementById(regionId);
    let dSel = document.getElementById(districtId);

    // =============== FIX #1 — Fallback ID tuzatildi
    if (!rSel) {
        const altR = "edit" + regionId.charAt(0).toUpperCase() + regionId.slice(1);
        if (document.getElementById(altR)) rSel = document.getElementById(altR);
    }
    if (!dSel) {
        const altD = "edit" + districtId.charAt(0).toUpperCase() + districtId.slice(1);
        if (document.getElementById(altD)) dSel = document.getElementById(altD);
    }

    if (!rSel || !dSel) return;

    const selectedRegion = rSel.value;

    // =============== FIX #2 — district to‘liq reset
    dSel.innerHTML = `<option value="">Tuman</option>`;
    dSel.value = "";
    dSel.selectedIndex = 0;

    if (!selectedRegion || !regionsData[selectedRegion]) {
        if (typeof callback === "function") callback();
        return;
    }

    regionsData[selectedRegion].forEach(dist => {
        dSel.innerHTML += `<option value="${dist}">${dist}</option>`;
    });

    // callback agar kerak bo‘lsa
    if (typeof callback === "function") {
        setTimeout(callback, 10);
    }
}

// ===============================
// SELECT'larni to‘ldirish
// ===============================
export function initRegionDistrictLinks(regionsData, links = []) {
    links.forEach(obj => {
        const r = document.getElementById(obj.region);
        if (!r) return;

        r.addEventListener("change", () => {
            updateDistricts(obj.region, obj.district, regionsData);
        });
    });
}
