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

/* ===========================
     REGIONS LOAD SYSTEM
=========================== */

// GLOBAL REGIONS (regions-taxi.js dan keladi)
console.log("REGIONS:", window.regions);

// FORMGA VILOYATlarni YUKLASH
window.initRegionsForm = function () {
    const fromRegion = $("editFromRegion");
    const toRegion = $("editToRegion");

    fromRegion.innerHTML = '<option value="">Viloyat</option>';
    toRegion.innerHTML = '<option value="">Viloyat</option>';

    regions.forEach(r => {
        fromRegion.innerHTML += `<option value="${r.name}">${r.name}</option>`;
        toRegion.innerHTML += `<option value="${r.name}">${r.name}</option>`;
    });
};

// TUMANLARNI YUKLASH
window.updateEditDistricts = function (type) {
    const regionSelect = type === "from" ? $("editFromRegion") : $("editToRegion");
    const districtSelect = type === "from" ? $("editFromDistrict") : $("editToDistrict");

    const regionName = regionSelect.value;
    districtSelect.innerHTML = '<option value="">Tuman</option>';

    if (!regionName) return;

    const region = regions.find(r => r.name === regionName);
    if (!region) return;

    region.districts.forEach(dis => {
        districtSelect.innerHTML += `<option value="${dis}">${dis}</option>`;
    });
};


/* ===========================
       GLOBAL VARIABLES
=========================== */
let editingAdId = null;


/* ===========================
      AUTH CHECK
=========================== */
onAuthStateChanged(auth, user => {
    if (!user) {
        window.location.href = "/shahartaxi-demo/docs/app/auth/login.html";
        return;
    }

    window.currentUID = user.uid;
    loadMyAds(user.uid);
});


/* ===========================
      LOAD USER ADS
=========================== */
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
            <b style="color:#0069d9;">${ad.type || ""}</b><br>
            ${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict}<br>
            Narx: <b style="color:#28a745">${ad.price}</b><br>
            Vaqt: ${ad.departureTime}<br>
            ${seatsText}
            <div style="margin-top:10px; display:flex; gap:10px;">
                <button class="blue-btn"
                    onclick='openEditAd("${child.key}", ${JSON.stringify(ad).replace(/</g, "\\u003c")})'>
                    Tahrirlash
                </button>
                <button class="red-btn" onclick='deleteAd("${child.key}")'>O‘chirish</button>
            </div>
        `;
        list.appendChild(box);
    });
}


/* ===========================
      DELETE AD
=========================== */
window.deleteAd = async function (id) {
    if (!confirm("Rostdan o‘chirmoqchimisiz?")) return;

    await remove(ref(db, "ads/" + id));

    alert("O‘chirildi!");
    loadMyAds(currentUID);
};


/* ===========================
      OPEN EDIT MODAL
=========================== */
window.openEditAd = function (id, ad) {
    editingAdId = id;

    initRegionsForm(); // **viloyatlarni qayta yuklash**

    // FROM
    $("editFromRegion").value = ad.fromRegion;
    updateEditDistricts("from");
    $("editFromDistrict").value = ad.fromDistrict;

    // TO
    $("editToRegion").value = ad.toRegion;
    updateEditDistricts("to");
    $("editToDistrict").value = ad.toDistrict;

    $("editPrice").value = ad.price;
    $("editTime").value = ad.departureTime;
    $("editComment").value = ad.comment ?? "";

    $("editSeats").value = ad.driverSeats ?? ad.passengerCount ?? "";

    $("editAdModal").style.display = "flex";
};

window.closeEditAd = () => {
    $("editAdModal").style.display = "none";
};


/* ===========================
      SAVE AD EDIT
=========================== */
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
