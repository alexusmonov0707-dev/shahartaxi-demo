import {
    auth, db, ref, get, update, remove, onAuthStateChanged, $
} from "/shahartaxi-demo/docs/libs/lib.js";

// =====================
// LOAD REGIONS (GLOBAL)
// =====================
if (!window.regions) {
    console.warn("REGIONS not loaded! Importing manually...");
    const s = document.createElement("script");
    s.src = "/shahartaxi-demo/docs/assets/regions-taxi.js";
    document.head.appendChild(s);
}

// =============================
// REGION FILLER FUNCTIONS
// =============================
function fillRegionSelect(select) {
    select.innerHTML = `<option value="">Viloyat</option>`;

    if (!window.regions) return;

    regions.forEach(r => {
        select.innerHTML += `<option value="${r.name}">${r.name}</option>`;
    });
}

function fillDistricts(regionName, districtSelect) {
    districtSelect.innerHTML = `<option value="">Tuman</option>`;

    if (!window.regions) return;

    const region = regions.find(r => r.name === regionName);
    if (!region) return;

    region.districts.forEach(d => {
        districtSelect.innerHTML += `<option value="${d}">${d}</option>`;
    });
}

// =====================
// GLOBAL
// =====================
let editingAdId = null;
let currentUID = null;

// =====================
// USER CHECK
// =====================
onAuthStateChanged(auth, user => {
    if (!user) {
        window.location.href = "/shahartaxi-demo/docs/app/auth/login.html";
        return;
    }
    currentUID = user.uid;
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

        const div = document.createElement("div");
        div.className = "ad-box";

        div.innerHTML = `
            <b>${ad.type}</b><br>
            ${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict}<br>
            Vaqt: ${ad.departureTime}<br>
            Narx: ${ad.price}<br>
            <button onclick='openEditAd("${child.key}", ${JSON.stringify(ad).replace(/</g, "\\u003c")})'>Tahrirlash</button>
            <button onclick='deleteAd("${child.key}")'>O‘chirish</button>
        `;

        list.appendChild(div);
    });
}

// =====================
// DELETE AD
// =====================
window.deleteAd = async function(id) {
    if (!confirm("O‘chirishni tasdiqlaysizmi?")) return;
    await remove(ref(db, "ads/" + id));
    loadMyAds(currentUID);
};

// =====================
// OPEN EDIT MODAL
// =====================
window.openEditAd = function(id, ad) {
    editingAdId = id;

    const fromRegion = $("editFromRegion");
    const toRegion = $("editToRegion");

    fillRegionSelect(fromRegion);
    fillRegionSelect(toRegion);

    fromRegion.value = ad.fromRegion;
    fillDistricts(ad.fromRegion, $("editFromDistrict"));
    $("editFromDistrict").value = ad.fromDistrict;

    toRegion.value = ad.toRegion;
    fillDistricts(ad.toRegion, $("editToDistrict"));
    $("editToDistrict").value = ad.toDistrict;

    $("editPrice").value = ad.price;
    $("editTime").value = ad.departureTime;
    $("editComment").value = ad.comment ?? "";

    $("editAdModal").style.display = "flex";
};

// ========================
// SAVE EDIT
// ========================
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

    await update(ref(db, "ads/" + editingAdId), updates);

    alert("Saqlangan!");
    $("editAdModal").style.display = "none";

    loadMyAds(currentUID);
};
