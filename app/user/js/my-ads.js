// app/user/js/my-ads.js
import { auth, db, $, ref, get, update, remove, onAuthStateChanged } from "./lib.js";
import { formatDatetime } from "./lib.js";

const myAdsList = $("myAdsList");
const editAdModal = $("editAdModal");
const editFromRegion = $("editFromRegion");
const editFromDistrict = $("editFromDistrict");
const editToRegion = $("editToRegion");
const editToDistrict = $("editToDistrict");
const editPrice = $("editPrice");
const editTime = $("editTime");
const editSeats = $("editSeats");
const editComment = $("editComment");
const saveEditBtn = $("saveEditBtn");
const closeEditBtn = $("closeEditBtn");

let editingAdId = null;
let currentUid = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) location.href = "../login.html";
  currentUid = user.uid;
  await loadRegionsForEdit();
  loadMyAds();
});

async function loadRegionsForEdit() {
  if (!window.regionsData) return;
  editFromRegion.innerHTML = '<option value="">Viloyat</option>';
  editToRegion.innerHTML = '<option value="">Viloyat</option>';
  Object.keys(window.regionsData).forEach(r => {
    editFromRegion.innerHTML += `<option value="${r}">${r}</option>`;
    editToRegion.innerHTML += `<option value="${r}">${r}</option>`;
  });
}

window.updateEditDistricts = function(type) {
  const regionId = type === "from" ? "editFromRegion" : "editToRegion";
  const districtId = type === "from" ? "editFromDistrict" : "editToDistrict";
  const region = document.getElementById(regionId).value;
  const districtSelect = document.getElementById(districtId);
  districtSelect.innerHTML = '<option value="">Tuman</option>';
  if (window.regionsData && window.regionsData[region]) {
    window.regionsData[region].forEach(t => districtSelect.innerHTML += `<option value="${t}">${t}</option>`);
  }
};

async function loadMyAds() {
  myAdsList.innerHTML = "";
  const snap = await get(ref(db, "ads"));
  if (!snap.exists()) {
    myAdsList.innerHTML = "<p>Hozircha e’lon yo‘q.</p>";
    return;
  }
  snap.forEach(child => {
    const ad = child.val();
    if (ad.userId !== currentUid) return;
    const seatsInfo = ad.driverSeats ? `<br><b>Bo‘sh joylar:</b> ${ad.driverSeats} ta`
      : ad.passengerCount ? `<br><b>Yo‘lovchilar soni:</b> ${ad.passengerCount} ta` : "";
    const created = ad.createdAt ? formatDatetime(ad.createdAt) : "";
    const div = document.createElement("div");
    div.className = "ad-box";
    div.innerHTML = `
      <b style="color:#0069d9;">${ad.type}</b>&nbsp; &nbsp; Narx: <b style="color:#28a745;">${ad.price || "-"}</b><br>
      ${ad.fromRegion || "-"} ${ad.fromDistrict || ""} → ${ad.toRegion || "-"} ${ad.toDistrict || ""} ${seatsInfo}
      <div style="margin-top:10px; display:flex; gap:8px;">
        <button class="blue-btn" data-id="${child.key}" data-ad='${JSON.stringify(ad).replace(/</g,"\\u003c")}'>Tahrirlash</button>
        <button class="red-btn" data-id="${child.key}">O‘chirish</button>
      </div>
      <small style="color:#777; display:block; margin-top:8px;">${created}</small>
    `;
    myAdsList.appendChild(div);
  });

  // attach events
  Array.from(myAdsList.querySelectorAll(".blue-btn")).forEach(b => {
    b.addEventListener("click", (e) => {
      const id = b.dataset.id;
      const ad = JSON.parse(b.getAttribute("data-ad"));
      openEditAd(id, ad);
    });
  });
  Array.from(myAdsList.querySelectorAll(".red-btn")).forEach(b => {
    b.addEventListener("click", async () => {
      const id = b.dataset.id;
      if (!confirm("Rostdan o‘chirilsinmi?")) return;
      await remove(ref(db, "ads/" + id));
      alert("E’lon o‘chirildi!");
      loadMyAds();
    });
  });
}

// open edit modal
window.openEditAd = function(adId, ad) {
  editingAdId = adId;
  if (editFromRegion) editFromRegion.value = ad.fromRegion || "";
  updateEditDistricts("from");
  if (editFromDistrict) editFromDistrict.value = ad.fromDistrict || "";
  if (editToRegion) editToRegion.value = ad.toRegion || "";
  updateEditDistricts("to");
  if (editToDistrict) editToDistrict.value = ad.toDistrict || "";
  if (editPrice) editPrice.value = ad.price || "";
  if (editTime) editTime.value = ad.departureTime || "";
  if (editSeats) editSeats.value = ad.driverSeats || ad.passengerCount || "";
  if (editComment) editComment.value = ad.comment || "";
  editAdModal.style.display = "flex";
};

closeEditBtn && closeEditBtn.addEventListener("click", () => editAdModal.style.display = "none");

// save edit
saveEditBtn && saveEditBtn.addEventListener("click", async () => {
  if (!editingAdId) return;
  const updates = {
    fromRegion: editFromRegion ? editFromRegion.value : "",
    fromDistrict: editFromDistrict ? editFromDistrict.value : "",
    toRegion: editToRegion ? editToRegion.value : "",
    toDistrict: editToDistrict ? editToDistrict.value : "",
    price: editPrice ? editPrice.value : "",
    departureTime: editTime ? editTime.value : "",
    comment: editComment ? editComment.value : ""
  };
  if (editSeats) {
    // detect role of current user to save appropriate field
    const uSnap = await get(ref(db, "users/" + currentUid));
    const role = uSnap.exists() ? (uSnap.val().role || "passenger") : "passenger";
    if (role === "driver") updates.driverSeats = editSeats.value || "";
    else updates.passengerCount = editSeats.value || "";
  }
  await update(ref(db, "ads/" + editingAdId), updates);
  alert("E’lon yangilandi!");
  editAdModal.style.display = "none";
  loadMyAds();
});

