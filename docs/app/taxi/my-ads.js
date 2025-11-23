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

let editingAdId = null;

// =============================
//   REGION SELECT FILL
// =============================
window.initRegionsForm = function () {
    const FR = $("editFromRegion");
    const TR = $("editToRegion");

    FR.innerHTML = '<option value="">Viloyat</option>';
    TR.innerHTML = '<option value="">Viloyat</option>';

    regionsTaxi.forEach(r => {
        FR.innerHTML += `<option value="${r.name}">${r.name}</option>`;
        TR.innerHTML += `<option value="${r.name}">${r.name}</option>`;
    });
};

window.updateEditDistricts = function (type) {
    const regionSelect = type === "from" ? $("editFromRegion") : $("editToRegion");
    const districtSelect = type === "from" ? $("editFromDistrict") : $("editToDistrict");

    districtSelect.innerHTML = '<option value="">Tuman</option>';

    const region = regionsTaxi.find(r => r.name === regionSelect.value);
    if (!region) return;

    region.districts.forEach(d => {
        districtSelect.innerHTML += `<option value="${d}">${d}</option>`;
    });
};

// =============================
//  LOAD USER ADS
// =============================
onAuthStateChanged(auth, user => {
    if (!user) {
        window.location.href = "/shahartaxi-demo/docs/app/auth/login.html";
        return;
    }
    window.currentUID = user.uid;
    loadMyAds(user.uid);
});

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
            ? `Bo'sh joy: <b>${ad.driverSeats}</b>`
            : `Yo'lovchilar: <b>${ad.passengerCount ?? '-'}</b>`;

        list.innerHTML += `
            <div class="ad-box">
                <b style="color:#0069d9;">${ad.type}</b><br>
                ${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict}<br>
                Narx: <b style="color:#28a745">${ad.price}</b><br>
                Vaqt: ${ad.departureTime}<br>
                ${seatsText}
                <div style="margin-top:10px; display:flex; gap:10px;">
                    <button class="blue-btn" onclick='openEditAd("${child.key}", ${JSON.stringify(ad).replace(/</g,"\\u003c")})'>Tahrirlash</button>
                    <button class="red-btn" onclick='deleteAd("${child.key}")'>O‘chirish</button>
                </div>
            </div>
        `;
    });
}

// =============================
//  DELETE
// =============================
window.deleteAd = async function (id) {
    if (!confirm("Rostdan o‘chirmoqchimisiz?")) return;

    await remove(ref(db, "ads/" + id));
    loadMyAds(currentUID);
};

// =============================
//  OPEN EDIT MODAL
// =============================
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
    $("editSeats").value = ad.driverSeats ?? ad.passengerCount ?? "";
    $("editComment").value = ad.comment ?? "";

    $("editAdModal").style.display = "flex";
};

// =============================
//  CLOSE
// =============================
window.closeEditAd = () =>
    $("editAdModal").style.display = "none";

// =============================
//  SAVE EDIT
// =============================
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

    updates.driverSeats = seats;
    updates.passengerCount = seats;

    await update(ref(db, "ads/" + editingAdId), updates);

    closeEditAd();
    loadMyAds(currentUID);
};
