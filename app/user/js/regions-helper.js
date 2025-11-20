// app/user/js/regions-helper.js

function fillRegions(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;

    sel.innerHTML = '<option value="">Viloyat</option>';

    Object.keys(window.regionsData).forEach(region => {
        sel.innerHTML += `<option value="${region}">${region}</option>`;
    });
}

function fillDistricts(regionSelectId, districtSelectId) {
    const region = document.getElementById(regionSelectId)?.value;
    const districtSelect = document.getElementById(districtSelectId);

    if (!districtSelect) return;

    districtSelect.innerHTML = '<option value="">Tuman</option>';

    if (region && window.regionsData[region]) {
        window.regionsData[region].forEach(dist => {
            districtSelect.innerHTML += `<option value="${dist}">${dist}</option>`;
        });
    }
}

// CREATE-AD PAGE BILAN MOS KELADI
function updateDistricts(type) {
    if (type === 'from') {
        fillDistricts('fromRegion', 'fromDistrict');
    } else {
        fillDistricts('toRegion', 'toDistrict');
    }
}

// EDIT-AD MODAL UCHUN
function updateEditDistricts(type) {
    if (type === 'from') {
        fillDistricts('editFromRegion', 'editFromDistrict');
    } else {
        fillDistricts('editToRegion', 'editToDistrict');
    }
}

// PROFILE EDIT UCHUN
function fillEditDistricts() {
    fillDistricts('editRegion', 'editDistrict');
}

// CREATE-AD PAGE YUKLANGANDA
function initRegionsForm() {
    if (document.getElementById('fromRegion')) fillRegions(
