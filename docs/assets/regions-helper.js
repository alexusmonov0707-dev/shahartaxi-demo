// ======================================================
//   REGIONS HELPER — ShaharTaxi
// ======================================================

// taxi regions globaldan olinadi
const regions = window.TAXI_REGIONS;

// Element olish helperi
export function $(id) {
    return document.getElementById(id);
}

// ======================================================
//     CREATE-AD SAHIFASI
// ======================================================
export function initRegionsForm() {
    const fromRegion = $("fromRegion");
    const toRegion = $("toRegion");

    if (!fromRegion || !toRegion) return;

    fromRegion.innerHTML = '<option value="">Qayerdan (Viloyat)</option>';
    toRegion.innerHTML = '<option value="">Qayerga (Viloyat)</option>';

    Object.keys(regions).forEach(r => {
        let o1 = document.createElement("option");
        o1.value = r; o1.textContent = r;
        fromRegion.appendChild(o1);

        let o2 = document.createElement("option");
        o2.value = r; o2.textContent = r;
        toRegion.appendChild(o2);
    });
}

// --- districts ---
export function updateDistricts(type) {
    const regionId = type === "from" ? "fromRegion" : "toRegion";
    const districtId = type === "from" ? "fromDistrict" : "toDistrict";

    const region = $(regionId).value;
    const districtSelect = $(districtId);

    districtSelect.innerHTML = '<option value="">Tuman</option>';

    if (!region || !regions[region]) return;

    regions[region].forEach(t => {
        let opt = document.createElement("option");
        opt.value = t;
        opt.textContent = t;
        districtSelect.appendChild(opt);
    });
}

// ======================================================
//     MY ADS — EDIT
// ======================================================
export function initEditRegions() {
    const fr = $("editFromRegion");
    const tr = $("editToRegion");

    if (!fr || !tr) return;

    fr.innerHTML = '<option value="">Viloyat</option>';
    tr.innerHTML = '<option value="">Viloyat</option>';

    Object.keys(regions).forEach(r => {
        let o1 = document.createElement("option");
        o1.value = r; o1.textContent = r;
        fr.appendChild(o1);

        let o2 = document.createElement("option");
        o2.value = r; o2.textContent = r;
        tr.appendChild(o2);
    });
}

export function updateEditDistricts(type) {
    const regionId = type === "from" ? "editFromRegion" : "editToRegion";
    const distId   = type === "from" ? "editFromDistrict" : "editToDistrict";

    const region = $(regionId).value;
    const distSelect = $(distId);

    distSelect.innerHTML = '<option value="">Tuman</option>';

    if (!region || !regions[region]) return;

    regions[region].forEach(t => {
        let opt = document.createElement("option");
        opt.value = t;
        opt.textContent = t;
        distSelect.appendChild(opt);
    });
}

// ======================================================
//      PROFILE
// ======================================================
export function fillRegionSelect_forProfile() {
    const reg = $("editRegion");
    if (!reg) return;

    reg.innerHTML = '<option value="">Viloyat</option>';

    Object.keys(regions).forEach(r => {
        let opt = document.createElement("option");
        opt.value = r; 
        opt.textContent = r;
        reg.appendChild(opt);
    });
}

export function fillEditDistricts() {
    const region = $("editRegion").value;
    const dist   = $("editDistrict");

    dist.innerHTML = '<option value="">Tuman</option>';

    if (!region || !regions[region]) return;

    regions[region].forEach(t => {
        let opt = document.createElement("option");
        opt.value = t;
        opt.textContent = t;
        dist.appendChild(opt);
    });
}
