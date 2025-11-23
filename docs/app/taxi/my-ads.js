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

// =====================
// LOAD REGIONS
// =====================
import regions from "/shahartaxi-demo/docs/assets/regions-taxi.js";

// =====================
// GLOBAL
// =====================
let editingAdId = null;

// =====================
// INIT REGION SELECTS
// =====================
function fillRegionSelect(select, selectedValue = "") {
    select.innerHTML = `<option value="">Viloyat</option>`;
    regions.forEach(r => {
        const opt = document.createElement("option");
        opt.value = r.name;
        opt.textContent = r.name;
        if (r.name === selectedValue) opt.selected = true;
        select.appendChild(opt);
    });
}

function fillDistrictSelect(regionName, select, selectedValue = "") {
    select.innerHTML = `<option value="">Tuman</option>`;
    if (!regionName) return;

    const region = regions.find(r => r.name === regionName);
    if (!region) return;

    region.districts.forEach(d => {
        const opt = document.createElement("option");
        opt.value = d;
        opt.textContent = d;
        if (d === selectedValue) opt.selected = true;
        select.appendChild(opt);
    });
}

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

        const card = document.createElement("div");
        card.className = "ad-card";
        card.innerHTML = `
            <div class="ad-title">${ad.type ?? "E'lon"}</div>
            <div>${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict}</div>
            <div>Vaqt: ${ad.departureTime}</div>
            <div>Narx: <b style="color:#28a745">${ad.price}</b></div>
            <div>Joylar/Yo‘lovchilar: ${ad.driverSeats ?? ad.passengerCount ?? "-"}</div>

            <div class="ad-actions">
                <button class="blue-btn" data-edit="${child.key}">Tahrirlash</button>
                <button class="red-btn" data-del="${child.key}">O‘chirish</button>
            </div>
        `;
        list.appendChild(card);
    });

    bindActionButtons();
}

// =====================
// BIND BUTTONS
// =====================
function bindActionButtons() {
    document.querySelectorAll("[data-edit]").forEach(btn => {
        btn.onclick = () => openEditAd(btn.dataset.edit);
    });

    document.querySelectorAll("[data-del]").forEach(btn => {
        btn.onclick = () => deleteAd(btn.dataset.del);
    });
}

// =====================
// DELETE AD
// =====================
async function deleteAd(id) {
    if (!confirm("Rostdan o‘chirmoqchimisiz?")) return;

    await remove(ref(db, "ads/" + id));

    alert("O‘chirildi!");
    loadMyAds(window.currentUID);
}

// =====================
// OPEN EDIT MODAL
// =====================
async function openEditAd(id) {
    editingAdId = id;

    const snap = await get(ref(db, "ads/" + id));
    if (!snap.exists()) return;

    const ad = snap.val();

    // Fill region selects
    fillRegionSelect($("editFromRegion"), ad.fromRegion);
    fillRegionSelect($("editToRegion"), ad.toRegion);

    // Fill district selects
    fillDistrictSelect(ad.fromRegion, $("editFromDistrict"), ad.fromDistrict);
    fillDistrictSelect(ad.toRegion, $("editToDistrict"), ad.toDistrict);

    // Other fields
    $("editPrice").value = ad.price;
    $("editTime").value = ad.departureTime;
    $("editComment").value = ad.comment ?? "";
    $("editSeats").value = ad.driverSeats ?? ad.passengerCount ?? "";

    $("editModal").style.display = "flex";
}

// =====================
// CLOSE MODAL
// =====================
window.closeEditModal = () => {
    $("editModal").style.display = "none";
};

// =====================
// REGION CHANGE EVENTS
// =====================
$("editFromRegion").onchange = () => {
    fillDistrictSelect(
        $("editFromRegion").value,
        $("editFromDistrict"),
        ""
    );
};

$("editToRegion").onchange = () => {
    fillDistrictSelect(
        $("editToRegion").value,
        $("editToDistrict"),
        ""
    );
};

// =====================
// SAVE EDIT
// =====================
window.saveAd = async () => {
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
    closeEditModal();
    loadMyAds(window.currentUID);
};
