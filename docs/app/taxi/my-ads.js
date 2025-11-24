// ==============================
// IMPORTS
// ==============================
import {
    auth,
    db,
    ref,
    get,
    update,
    remove,
    onAuthStateChanged,
    $
} from "/shahartaxi-demo/docs/libs/lib.js";

// ==============================
//  GLOBAL
// ==============================
let editingAdId = null;

// ==============================
// WAIT FOR AUTH
// ==============================
onAuthStateChanged(auth, user => {
    if (!user) {
        window.location.href = "/shahartaxi-demo/docs/app/auth/login.html";
        return;
    }
    window.currentUID = user.uid;
    loadMyAds(user.uid);
});

// ==============================
//  FILL REGIONS (USING regionsList)
// ==============================
function fillRegionSelect(id) {
    const el = $(id);
    if (!el || !window.regionsList) return;

    el.innerHTML = `<option value="">Viloyat</option>`;
    window.regionsList.forEach(r => {
        el.innerHTML += `<option value="${r.name}">${r.name}</option>`;
    });
}

// ==============================
//  UPDATE DISTRICTS
// ==============================
function updateDistrictSelect(regionId, districtId) {
    const region = $(regionId).value;
    const districtSelect = $(districtId);

    districtSelect.innerHTML = `<option value="">Tuman</option>`;

    if (!region || !window.regionsList) return;

    const found = window.regionsList.find(r => r.name === region);
    if (!found) return;

    found.districts.forEach(d => {
        districtSelect.innerHTML += `<option value="${d}">${d}</option>`;
    });
}

// ==============================
//  LOAD USER ADS
// ==============================
async function loadMyAds(uid) {
    const snap = await get(ref(db, "ads"));
    const list = $("myAdsList");

    list.innerHTML = "";

    if (!snap.exists()) {
        list.innerHTML = "<p>Hozircha e’lon yo‘q.</p>";
        return;
    }

    snap.forEach(child => {
        const ad = child.val();
        if (ad.userId !== uid) return;

        const seats =
            ad.driverSeats
                ? `<b>Bo'sh joy:</b> ${ad.driverSeats}`
                : `<b>Yo'lovchilar:</b> ${ad.passengerCount ?? "-"}`;

        const box = document.createElement("div");
        box.className = "ad-box";

        box.innerHTML = `
            <b style="color:#0069d9;">${ad.type}</b><br>
            ${ad.fromRegion}, ${ad.fromDistrict} →
            ${ad.toRegion}, ${ad.toDistrict}<br>

            Narx: <b style="color:#28a745">${ad.price}</b><br>
            Vaqt: ${ad.departureTime}<br>
            ${seats}
            <div style="margin-top:10px; display:flex; gap:10px;">
                <button class="blue-btn"
                    onclick='openEditAd("${child.key}", ${JSON.stringify(ad).replace(/</g,"\\u003c")})'>
                    Tahrirlash
                </button>

                <button class="red-btn" onclick='deleteAd("${child.key}")'>
                    O‘chirish
                </button>
            </div>
        `;
        list.appendChild(box);
    });
}

// ==============================
//  DELETE AD
// ==============================
window.deleteAd = async function (id) {
    if (!confirm("Rostdan o‘chirilsinmi?")) return;

    await remove(ref(db, "ads/" + id));
    alert("O‘chirildi!");
    loadMyAds(currentUID);
};

// ==============================
// OPEN EDIT MODAL
// ==============================
window.openEditAd = function (id, ad) {
    editingAdId = id;

    // Viloyat selectlarni to‘ldirish
    fillRegionSelect("editFromRegion");
    fillRegionSelect("editToRegion");

    // FROM
    $("editFromRegion").value = ad.fromRegion;
    updateDistrictSelect("editFromRegion", "editFromDistrict");
    $("editFromDistrict").value = ad.fromDistrict;

    // TO
    $("editToRegion").value = ad.toRegion;
    updateDistrictSelect("editToRegion", "editToDistrict");
    $("editToDistrict").value = ad.toDistrict;

    $("editPrice").value = ad.price;
    $("editTime").value = ad.departureTime;
    $("editComment").value = ad.comment ?? "";
    $("editSeats").value = ad.driverSeats ?? ad.passengerCount ?? "";

    $("editAdModal").style.display = "flex";
};

// ==============================
// CLOSE EDIT MODAL
// ==============================
window.closeEditAd = () =>
    $("editAdModal").style.display = "none";

// ==============================
// SAVE EDIT
// ==============================
window.saveAdEdit = async function () {
    if (!editingAdId) return;

    const obj = {
        fromRegion: $("editFromRegion").value,
        fromDistrict: $("editFromDistrict").value,
        toRegion: $("editToRegion").value,
        toDistrict: $("editToDistrict").value,
        price: $("editPrice").value,
        departureTime: $("editTime").value,
        comment: $("editComment").value
    };

    const seatVal = $("editSeats").value;
    if (window.userRole === "driver")
        obj.driverSeats = seatVal;
    else
        obj.passengerCount = seatVal;

    await update(ref(db, "ads/" + editingAdId), obj);

    alert("Tahrirlandi!");
    closeEditAd();
    loadMyAds(currentUID);
};

// ==============================
// REGION CHANGE EVENTS
// ==============================
window.updateEditDistricts = function (type) {
    if (type === "from")
        updateDistrictSelect("editFromRegion", "editFromDistrict");
    else
        updateDistrictSelect("editToRegion", "editToDistrict");
};

