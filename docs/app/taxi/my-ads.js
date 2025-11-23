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

// Regions helper (GLOBAL funksiyalar)
import "/shahartaxi-demo/docs/assets/regions-helper.js";

// =====================
// GLOBAL
// =====================
let editingAdId = null;

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
// LOAD MY ADS
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
            <b style="color:#0069d9;">${ad.type}</b><br>
            ${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict}<br>
            Narx: <b style="color:#28a745">${ad.price}</b><br>
            Vaqt: ${ad.departureTime}<br>
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
// OPEN EDIT MODAL
// =====================
window.openEditAd = function (id, ad) {
    editingAdId = id;

    // Regions
    fillRegions("editFromRegion");
    fillRegions("editToRegion");

    $("editFromRegion").value = ad.fromRegion;
    updateDistricts("editFrom".replace("edit", "").toLowerCase());
    $("editFromDistrict").value = ad.fromDistrict;

    $("editToRegion").value = ad.toRegion;
    updateDistricts("editTo".replace("edit", "").toLowerCase());
    $("editToDistrict").value = ad.toDistrict;

    // Other fields
    $("editPrice").value = ad.price;
    $("editTime").value = ad.departureTime;
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

    alert("Tahrirlandi!");
    closeEditAd();
    loadMyAds(currentUID);
};
