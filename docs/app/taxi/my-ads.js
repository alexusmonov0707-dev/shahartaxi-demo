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

import { regionsTaxi } from "/shahartaxi-demo/docs/assets/regions-taxi.js";

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

    const seatsText = ad.driverSeats
      ? `<b>Bo'sh joy:</b> ${ad.driverSeats}`
      : `<b>Yo'lovchilar:</b> ${ad.passengerCount ?? "-"}`;

    const box = document.createElement("div");
    box.className = "ad-box";

    box.innerHTML = `
      <b style="color:#0069d9;">${ad.type}</b> <br>
      ${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict} <br>
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
// DELETE
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

  fillRegionSelect("editFromRegion");
  fillRegionSelect("editToRegion");

  $("editFromRegion").value = ad.fromRegion;
  updateDistrictSelect("editFromRegion", "editFromDistrict");
  $("editFromDistrict").value = ad.fromDistrict;

  $("editToRegion").value = ad.toRegion;
  updateDistrictSelect("editToRegion", "editToDistrict");
  $("editToDistrict").value = ad.toDistrict;

  $("editPrice").value = ad.price;
  $("editTime").value = ad.departureTime;
  $("editSeats").value = ad.driverSeats ?? ad.passengerCount ?? "";
  $("editComment").value = ad.comment ?? "";

  $("editAdModal").style.display = "flex";
};

// =====================
// CLOSE MODAL
// =====================
window.closeEditAd = () => {
  $("editAdModal").style.display = "none";
};

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
    comment: $("editComment").value,
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

// =====================
// REGIONS + DISTRICTS
// =====================

// Selectga viloyatlarni joylash
function fillRegionSelect(selectId) {
  const el = $(selectId);
  el.innerHTML = `<option value="">Viloyat</option>`;

  regionsTaxi.forEach(r => {
    el.innerHTML += `<option value="${r.name}">${r.name}</option>`;
  });
}

// Tumanni yangilash
window.updateDistrictSelect = function (regionSelectId, districtSelectId) {
  const regionName = $(regionSelectId).value;
  const districtEl = $(districtSelectId);

  districtEl.innerHTML = `<option value="">Tuman</option>`;

  if (!regionName) return;

  const region = regionsTaxi.find(r => r.name === regionName);
  if (!region) return;

  region.districts.forEach(d => {
    districtEl.innerHTML += `<option value="${d}">${d}</option>`;
  });
};
