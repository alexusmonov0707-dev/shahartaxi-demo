// ======================================================
//   REGIONS HELPER — ShaharTaxi
//   Tumanlar va viloyatlar selectlarini boshqarish
// ======================================================

// Bu fayl regions-taxi.js ichidagi global `regions` obyektidan foydalanadi.
// Hech qanday qisqartirish QILINMAGAN.

// === FIX: regions-taxi.js dan global obyektni olish ===
const regions = window.TAXI_REGIONS || {};

// Elementni olish yordamchisi
export function $(id) {
    return document.getElementById(id);
}

// ------------------------------------------------------
//    ADD AD (create-ad) sahifasi uchun
// ------------------------------------------------------
export function initRegionsForm() {
    const fromRegion = $("fromRegion");
    const toRegion = $("toRegion");

    if (!fromRegion || !toRegion) return;

    fromRegion.innerHTML = '<option value="">Qayerdan (Viloyat)</option>';
    toRegion.innerHTML = '<option value="">Qayerga (Viloyat)</option>';

    Object.keys(regions).forEach(r => {
        const opt1 = document.createElement("option");
        opt1.value = r;
        opt1.textContent = r;
        fromRegion.appendChild(opt1);

        const opt2 = document.createElement("option");
        opt2.value = r;
        opt2.textContent = r;
        toRegion.appendChild(opt2);
    });
}

// ------------------------------------------------------
//   DISTRICT UPDATE (create-ad)
// ------------------------------------------------------
export function updateDistricts(type) {
    const regionId = type === "from" ? "fromRegion" : "toRegion";
    const districtId = type === "from" ? "fromDistrict" : "toDistrict";

    const region = $(regionId).value;
    const districtSelect = $(districtId);

    districtSelect.innerHTML = '<option value="">Tuman</option>';

    if (!region || !regions[region]) return;

    regions[region].forEach(t => {
        const opt = document.createElement("option");
        opt.value = t;
        opt.textContent = t;
        districtSelect.appendChild(opt);
    });
}

// ======================================================
//       MY-ADS SAHIFASIDA EDIT QILISH UCHUN
// ======================================================
export function initEditRegions() {
    const fr = $("editFromRegion");
    const tr = $("editToRegion");

    if (!fr || !tr) return;

    fr.innerHTML = '<option value="">Viloyat</option>';
    tr.innerHTML = '<option value="">Viloyat</option>';

    Object.keys(regions).forEach(r => {
        const opt1 = document.createElement("option");
        opt1.value = r;
        opt1.textContent = r;
        fr.appendChild(opt1);

        const opt2 = document.createElement("option");
        opt2.value = r;
        opt2.textContent = r;
        tr.appendChild(opt2);
    });
}

// ------------------------------------------------------
//      EDIT DISTRICTS (my-ads)
// ------------------------------------------------------
export function updateEditDistricts(type) {
    const regionId = type === "from" ? "editFromRegion" : "editToRegion";
    const distId   = type === "from" ? "editFromDistrict" : "editToDistrict";

    const region = $(regionId).value;
    const distSelect = $(distId);

    distSelect.innerHTML = '<option value="">Tuman</option>';

    if (!region || !regions[region]) return;

    regions[region].forEach(t => {
        const opt = document.createElement("option");
        opt.value = t;
        opt.textContent = t;
        distSelect.appendChild(opt);
    });
}

// ======================================================
//     PROFILE EDIT (profile.html)
// ======================================================
export function fillRegionSelect_forProfile() {
    const reg = $("editRegion");
    if (!reg) return;
    
    reg.innerHTML = '<option value="">Viloyat</option>';

    Object.keys(regions).forEach(r => {
        const opt = document.createElement("option");
        opt.value = r;
        opt.textContent = r;
        reg.appendChild(opt);
    });
}

export function fillEditDistricts() {
    const region = $("editRegion").value;
    const dist = $("editDistrict");

    dist.innerHTML = '<option value="">Tuman</option>';

    if (!region || !regions[region]) return;

    regions[region].forEach(t => {
        const opt = document.createElement("option");
        opt.value = t;
        opt.textContent = t;
        dist.appendChild(opt);
    });
}
