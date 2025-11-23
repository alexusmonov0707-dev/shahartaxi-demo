// =====================
// IMPORTS
// =====================
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

// Regions helper yuklangandan keyin:
// window.regionsList = [ {name, districts}, ... ]

// =====================
// REGION FORMLARNI TO‘LDIRISH (MOS FORMAT)
// =====================
window.initRegionsForm = function () {
    const fromR = $("editFromRegion");
    const toR = $("editToRegion");

    fromR.innerHTML = `<option value="">Viloyat</option>`;
    toR.innerHTML = `<option value="">Viloyat</option>`;

    window.regionsList.forEach(r => {
        fromR.innerHTML += `<option value="${r.name}">${r.name}</option>`;
        toR.innerHTML += `<option value="${r.name}">${r.name}</option>`;
    });
};

window.updateEditDistricts = function (type) {
    const regionSelect = type === "from" ? $("editFromRegion") : $("editToRegion");
    const districtSelect = type === "from" ? $("editFromDistrict") : $("editToDistrict");

    const regionName = regionSelect.value;
    districtSelect.innerHTML = `<option value="">Tuman</option>`;

    if (!regionName) return;

    const region = window.regionsList.find(r => r.name === regionName);
    if (!region) return;

    region.districts.forEach(d => {
        districtSelect.innerHTML += `<option value="${d}">${d}</option>`;
    });
};

// =====================
// GLOBAL
// =====================
let editingAdId = null;

// =====================
// USER CHECK
// =====================
onAuthStateChanged(auth, user => {
    if (!user) {
        window.location.href = "/shahartaxi-demo/docs/app/auth/login.html";
        return;
    }

    window.currentUID = user.uid;
    loadMyAds(user.uid);
});

// =====================
// LOAD USER ADS
// =====================
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

        const seatsText = ad.driverSeats
            ? `<b>Bo'sh joy:</b> ${ad.driverSeats}`
            : `<b>Yo'lovchilar:</b> ${ad.passengerCount ?? "-"}`;

        const box = document.createElement("div");
        box.className = "ad-box";

        box.innerHTML = `
            <b style="color:#0069d9;">${ad.type ?? "E'lon"}</b><br>
            ${ad.fromRegion ?? "-"}, ${ad.fromDistrict ?? "-"} →
            ${ad.toRegion ?? "-"}, ${ad.toDistrict ?? "-"}<br>

            Narx: <b style="color:#28a745">${ad.price ?? "-"}</b><br>
            Vaqt: ${ad.departureTime ?? "-"}<br>

            ${seatsText}

            <div style="margin-top:10px; display:flex; gap:10px;">
                <button class="blue-btn" onclick='openEditAd("${child.key}", ${JSON.stringify(ad).replace(/</g,"\\u003c")})'>
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

// =====================
// DELETE AD
// =====================
window.deleteAd = async function (id) {
    if (!confirm("Rostdan o‘chirmoqchimisiz?")) return;

    await remove(ref(db, "ads/" + id));

    alert("O‘chirildi!");
    loadMyAds(currentUID);
};

// =====================
// OPEN MODAL
// =====================
window.openEditAd = function (id, ad) {
    editingAdId = id;

    // Region selectlarni to‘ldirish
    initRegionsForm();

    // FROM
    $("editFromRegion").value = ad.fromRegion ?? "";
    updateEditDistricts("from");
    $("editFromDistrict").value = ad.fromDistrict ?? "";

    // TO
    $("editToRegion").value = ad.toRegion ?? "";
    updateEditDistricts("to");
    $("editToDistrict").value = ad.toDistrict ?? "";

    // boshqa maydonlar
    $("editPrice").value = ad.price ?? "";
    $("editTime").value = ad.departureTime ?? "";
    $("editComment").value = ad.comment ?? "";
    $("editSeats").value = ad.driverSeats ?? ad.passengerCount ?? "";

    $("editAdModal").style.display = "flex";
};

window.closeEditAd = () =>
    $("editAdModal").style.display = "none";

// =====================
// SAVE EDIT
// =====================
window.saveAdEdit = async function () {
    if (!editingAdId) return;

    const updates = {
        fromRegion: $("editFromRegion").value,
        fromDistrict: $("editFromDistrict").value,
        toRegion: $("editToRegion").value,
        toDistrict: $("editToDistrict").value,
        price: $("editPrice").value,
        departureTime: $("editTime").value,
        comment: $("editComment").value
    };

    const seats = $("editSeats").value;
    if (window.userRole === "driver")
        updates.driverSeats = seats;
    else
        updates.passengerCount = seats;

    await update(ref(db, "ads/" + editingAdId), updates);

    closeEditAd();
    loadMyAds(currentUID);

    alert("Tahrirlandi!");
};
