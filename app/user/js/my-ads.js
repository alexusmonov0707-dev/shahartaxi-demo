// app/user/js/my-ads.js

import {
    auth,
    db,
    ref,
    get,
    update,
    // remove → lib.js eksport qilmaydigani uchun boshqa yo‘l bilan o‘chiramiz
    onAuthStateChanged,
    $
} from "./lib.js";

// remove funksiyasi yo‘qligi sababli shu yerda custom remove yozamiz:
async function removeData(path) {
    return update(ref(db, path), null);
}

// GLOBAL
let editingAdId = null;

// ==========================
// USER CHECK
// ==========================
onAuthStateChanged(auth, user => {
    if (!user) {
        window.location.href = "../../login.html";
        return;
    }
    loadMyAds(user.uid);
});

// ==========================
// LOAD MY ADS
// ==========================
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
            ? `<br><b>Bo‘sh joy:</b> ${ad.driverSeats}`
            : ad.passengerCount
            ? `<br><b>Yo‘lovchilar:</b> ${ad.passengerCount}`
            : "";

        const box = document.createElement("div");
        box.className = "ad-box";
        box.innerHTML = `
            <b style="color:#0069d9;">${ad.type}</b><br>
            ${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict}<br>
            Narx: <b style="color:#28a745">${ad.price}</b><br>
            Vaqt: ${ad.departureTime}
            ${seatsText}
            <div style="margin-top:10px; display:flex; gap:10px;">
                <button class="blue-btn" onclick='openEditAd("${child.key}", ${JSON.stringify(ad).replace(/</g,"\\u003c")})'>
                    Tahrirlash
                </button>
                <button class="red-btn" onclick='deleteAd("${child.key}")'>O‘chirish</button>
            </div>
        `;
        list.appendChild(box);
    });
}

// ==========================
// DELETE AD
// ==========================
window.deleteAd = async function (id) {
    if (!confirm("Rostdan o‘chirmoqchimisiz?")) return;

    await removeData("ads/" + id);

    alert("E’lon o‘chirildi!");
    loadMyAds(auth.currentUser.uid);
};

// ==========================
// OPEN EDIT MODAL
// ==========================
window.openEditAd = function (id, ad) {
    editingAdId = id;

    initRegionsForm();

    $("editFromRegion").value = ad.fromRegion;
    updateEditDistricts("from");
    $("editFromDistrict").value = ad.fromDistrict;

    $("editToRegion").value = ad.toRegion;
    updateEditDistricts("to");
    $("editToDistrict").value = ad.toDistrict;

    $("editPrice").value = ad.price;
    $("editTime").value = ad.departureTime;
    $("editComment").value = ad.comment || "";
    $("editSeats").value = ad.driverSeats || ad.passengerCount || "";

    $("editAdModal").style.display = "flex";
};

window.closeEditAd = function () {
    $("editAdModal").style.display = "none";
};

// ==========================
// SAVE EDITED AD
// ==========================
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

    // DRIVER yoki PASSENGER uchun joylar
    if (window.userRole === "driver")
        updates.driverSeats = $("editSeats").value;
    else
        updates.passengerCount = $("editSeats").value;

    await update(ref(db, "ads/" + editingAdId), updates);

    alert("Yangilandi!");
    closeEditAd();
    loadMyAds(auth.currentUser.uid);
};
