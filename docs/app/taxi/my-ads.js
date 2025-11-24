// ============================
// FIREBASE INIT
// ============================
import {
  getDatabase, ref, get, update, remove
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

import {
  getAuth, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const db = getDatabase();
const auth = getAuth();

const $ = id => document.getElementById(id);

let editingAdId = null;

// ============================
// LOAD MY ADS
// ============================
onAuthStateChanged(auth, user => {
  if (!user) location.href = "../auth/login.html";
  else loadMyAds(user.uid);
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
    let ad = child.val();
    if (ad.userId !== uid) return;

    const safeJson = JSON.stringify(ad).replace(/'/g, "&apos;");

    const div = document.createElement("div");
    div.className = "ad-box";
    div.innerHTML = `
      <b style="color:#0069d9;">${ad.type}</b><br>
      ${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict}<br>
      Narx: <b style="color:#28a745">${ad.price}</b><br>
      Vaqt: ${ad.departureTime}<br>
      <button class="blue-btn edit-btn" 
              data-id="${child.key}" 
              data-ad='${safeJson}'>Tahrirlash</button>
      <button class="red-btn delete-btn" data-id="${child.key}">O‘chirish</button>
    `;

    list.appendChild(div);
  });
}

// ============================
// EDIT CLICK HANDLER
// ============================
document.addEventListener("click", e => {
  if (e.target.classList.contains("edit-btn")) {

    const adId = e.target.dataset.id;
    const ad = JSON.parse(e.target.dataset.ad.replace(/&apos;/g, "'"));

    openEditAd(adId, ad);
  }

  else if (e.target.classList.contains("delete-btn")) {
    deleteAd(e.target.dataset.id);
  }
});

// ============================
// OPEN EDIT MODAL
// ============================
window.openEditAd = function(id, ad) {
  editingAdId = id;

  fillEditRegions(); // selectlarni to‘ldirish

  $("editFromRegion").value = ad.fromRegion;
  updateEditDistricts("from");
  $("editFromDistrict").value = ad.fromDistrict;

  $("editToRegion").value = ad.toRegion;
  updateEditDistricts("to");
  $("editToDistrict").value = ad.toDistrict;

  $("editPrice").value = ad.price || "";
  $("editTime").value = ad.departureTime || "";
  $("editComment").value = ad.comment || "";
  $("editSeats").value = ad.driverSeats || ad.passengerCount || "";

  $("editAdModal").style.display = "flex";
};

window.closeEditAd = () => $("editAdModal").style.display = "none";

// ============================
// SAVE EDIT
// ============================
window.saveAdEdit = async function() {
  if (!editingAdId) return;

  const updates = {
    fromRegion: $("editFromRegion").value,
    fromDistrict: $("editFromDistrict").value,
    toRegion: $("editToRegion").value,
    toDistrict: $("editToDistrict").value,
    price: $("editPrice").value,
    departureTime: $("editTime").value,
    comment: $("editComment").value,
    driverSeats: $("editSeats").value
  };

  await update(ref(db, "ads/" + editingAdId), updates);

  alert("Tahrirlandi!");
  closeEditAd();
  loadMyAds(auth.currentUser.uid);
};

// ============================
// DELETE AD
// ============================
async function deleteAd(id) {
  if (!confirm("Rostdan o‘chirilsinmi?")) return;
  await remove(ref(db, "ads/" + id));
  loadMyAds(auth.currentUser.uid);
}

// ============================
// REGION HELPERS
// ============================
function fillEditRegions() {
  $("editFromRegion").innerHTML = '<option value="">Viloyat</option>';
  $("editToRegion").innerHTML = '<option value="">Viloyat</option>';

  regions.forEach(r => {
    $("editFromRegion").innerHTML += `<option value="${r.name}">${r.name}</option>`;
    $("editToRegion").innerHTML += `<option value="${r.name}">${r.name}</option>`;
  });
}

window.updateEditDistricts = function(type) {
  let region = $(type === "from" ? "editFromRegion" : "editToRegion").value;
  let district = $(type === "from" ? "editFromDistrict" : "editToDistrict");

  district.innerHTML = '<option value="">Tuman</option>';

  const reg = regions.find(r => r.name === region);
  if (!reg) return;

  reg.districts.forEach(t => {
    district.innerHTML += `<option value="${t}">${t}</option>`;
  });
};
