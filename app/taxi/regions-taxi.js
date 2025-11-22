
// app/user/js/regions-helper.js
// Ushbu modul region → tuman selectlarini boshqaradi.
// Faqat 1 ta joyga ulaysan va barcha sahifalarda avtomatik ishlaydi.

// ================================
// VILOYATLARNI to‘ldirish
// ================================
function fillRegions(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel || !window.regionsData) return;

    sel.innerHTML = '<option value="">Viloyat</option>';

    for (let region in window.regionsData) {
        sel.innerHTML += `<option value="${region}">${region}</option>`;
    }
}

// ================================
// TUMANLARNI to‘ldirish
// ================================
function fillDistricts(regionId, districtId) {
    const region = document.getElementById(regionId)?.value;
    const districtSel = document.getElementById(districtId);

    if (!districtSel) return;

    districtSel.innerHTML = '<option value="">Tuman</option>';

    if (!region || !window.regionsData || !window.regionsData[region]) return;

    window.regionsData[region].forEach(dist => {
        districtSel.innerHTML += `<option value="${dist}">${dist}</option>`;
    });
}

// ================================
// CREATE-AD PAGE uchun (qayerdan/qayerga)
// ================================
function updateDistricts(type) {
    if (type === "from") fillDistricts("fromRegion", "fromDistrict");
    else fillDistricts("toRegion", "toDistrict");
}

// ================================
// EDIT-AD MODAL uchun
// ================================
function updateEditDistricts(type) {
    if (type === "from") fillDistricts("editFromRegion", "editFromDistrict");
    else fillDistricts("editToRegion", "editToDistrict");
}

// ================================
// PROFILE EDIT uchun
// ================================
function fillEditDistricts() {
    fillDistricts("editRegion", "editDistrict");
}

// ================================
// REGION FORMA STARTER
// create-ad, edit-ad, profile — hammasi uchun umumiy
// ================================
function initRegionsForm() {

    // Create-ad sahifasi
    if (document.getElementById("fromRegion")) fillRegions("fromRegion");
    if (document.getElementById("toRegion")) fillRegions("toRegion");

    // Edit-ad modali
    if (document.getElementById("editFromRegion")) fillRegions("editFromRegion");
    if (document.getElementById("editToRegion")) fillRegions("editToRegion");

    // Profile edit sahifasi
    if (document.getElementById("editRegion")) fillRegions("editRegion");
}

// ================================
// GLOBALLASHTIRISH
// ================================
window.initRegionsForm = initRegionsForm;
window.updateDistricts = updateDistricts;
window.updateEditDistricts = updateEditDistricts;
window.fillEditDistricts = fillEditDistricts;

