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

import { regions } from "/shahartaxi-demo/docs/assets/regions-taxi.js";

// =====================
// GLOBAL VARIABLES
// =====================
let editingAdId = null;
let currentAd = null;

// =====================
// AUTH CHECK
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

    list.innerHTML = "Yuklanmoqda...";

    if (!snap.exists()) {
        list.innerHTML = "<p>Hozircha e’lon yo‘q.</p>";
        return;
    }

    list.innerHTML = "";

    snap.forEach(child => {
        const ad = child.val();
        if (ad.userId !== uid) return;

        const seatsText = ad.driverSeats
            ? `Bo'sh joy: <b>${ad.driverSeats}</b>`
            : `Yo'lovchilar: <b>${ad.passengerCount ?? "-"}</b>`;

        const div = document.createElement("div");
        div.className = "ad-box";

        div.innerHTML = `
            <b style="color:#0069d9;">${ad.type ?? "E'lon"}</b><br>
            ${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict}<br>
            Narx: <b style="color:#28a745">${ad.price}</b><br>
            Vaqt: ${ad.departureTime}<br>
            ${seatsText}
            <div style="margin-top:10px; display:flex; gap:10px;">
                <button class="blue-btn" data-id="${child.key}" data-ad='${encodeURIComponent(JSON.stringify(ad))}' onclick="openEditFromBtn(this)">
                    Tahrirlash
                </button>
                <button class="red-btn" onclick="deleteAd('${child.key}')">O‘chirish</button>
            </div>
        `;

        list.appendChild(div);
    });
}

// =====================
// FIX: SAFE BUTTON PARSER
// =====================
window.openEditFromBtn = function (btn) {
    const id = btn.getAttribute("data-id");
    const ad = JSON.parse(decodeURIComponent(btn.getAttribute("data-ad")));

    openEditAd(id, ad);
};

// =====================
// INIT REGIONS
// =====================
function fillRegions() {
    const fromR = $("editFromRegion");
    const toR = $("editToRegion");

    fromR.innerHTML = `<option value="">Viloyat</option>`;
    toR.innerHTML = `<option value="">Viloyat</option>`;

    regions.forEach(r => {
        fromR.innerHTML += `<option value="${r.name}">${r.name}</option>`;
        toR.innerHTML += `<option value="${r.name}">${r.name}</option>`;
    });
}

window.updateDistricts = function (type) {
    const regionSelect = type === "from" ? $("editFromRegion") : $("editToRegion");
    const districtSelect = type === "from" ? $("editFromDistrict") : $("editToDistrict");

    districtSelect.innerHTML = `<option value="">Tuman</option>`;

    const region = regions.find(r => r.name === regionSelect.value);
    if (!region) return;

    region.districts.forEach(d => {
        districtSelect.innerHTML += `<option value="${d}">${d}</option>`;
    });
};

// =====================
// OPEN EDIT MODAL
// =====================
window.openEditAd = function (id, ad) {
    editingAdId = id;
    currentAd = ad;

    fillRegions();

    $("editFromRegion").value = ad.fromRegion;
    updateDistricts("from");
    $("editFromDistrict").value = ad.fromDistrict;

    $("editToRegion").value = ad.toRegion;
    updateDistricts("to");
    $("editToDistrict").value = ad.toDistrict;

    $("editPrice").value = ad.price;
    $("editTime").value = ad.departureTime;
    $("editSeats").value = ad.driverSeats ?? ad.passengerCount ?? "";
    $("editComment").value = ad.comment ?? "";

    $("editModal").style.display = "flex";
};

// =====================
// CLOSE MODAL
// =====================
window.closeEditAd = function () {
    $("editModal").style.display = "none";
};

// =====================
// SAVE CHANGES
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
    if (currentAd.type === "Haydovchi")
        updates.driverSeats = seats;
    else
        updates.passengerCount = seats;

    await update(ref(db, "ads/" + editingAdId), updates);

    alert("Tahrirlandi!");
    closeEditAd();
    loadMyAds(currentUID);
};

// =====================
// DELETE AD
// =====================
window.deleteAd = async function (id) {
    if (!confirm("Rostdan o‘chirmoqchimisiz?")) return;
    await remove(ref(db, "ads/" + id));
    loadMyAds(currentUID);
};
