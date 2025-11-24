// ===============================================
//  SHAHARTAXI – MY ADS (FINAL FIXED VERSION)
//  ✔ works with universal regions-helper.js
//  ✔ NO fillEditRegions() required
//  ✔ perfect region → district sync
// ===============================================

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

const myAdsList = $("myAdsList");

// EDIT MODAL
const editModal = $("editModal");
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

window.userRole = "passenger";

// ===============================
// LOAD USER ROLE
// ===============================
async function loadUserRole(uid){
  try {
    const snap = await get(ref(db, "users/" + uid));
    if (snap.exists()){
      window.userRole = snap.val().role || "passenger";
    }
  } catch(e){
    window.userRole = "passenger";
  }
}

// ===============================
// LOAD MY ADS
// ===============================
async function loadMyAds(){
  const user = auth.currentUser;
  if (!user) return;

  myAdsList.innerHTML = "Yuklanmoqda...";

  const snap = await get(ref(db, "ads"));
  myAdsList.innerHTML = "";

  if (!snap.exists()){
    myAdsList.innerHTML = "<p>E'lonlar yo'q.</p>";
    return;
  }

  let found = false;

  snap.forEach(node => {
    const ad = node.val();
    if (ad.userId === user.uid){
      renderAd(ad, node.key);
      found = true;
    }
  });

  if (!found){
    myAdsList.innerHTML = "<p>E'lonlar yo'q.</p>";
  }
}

// ===============================
// RENDER ONE AD
// ===============================
function renderAd(ad, adId){
  const seats = ad.driverSeats || ad.passengerCount || "";

  const el = document.createElement("div");
  el.className = "ad-box";

  el.innerHTML = `
    <div><b>${ad.fromRegion}, ${ad.fromDistrict}</b> → <b>${ad.toRegion}, ${ad.toDistrict}</b></div>
    <div>Narx: <b>${ad.price || "-"}</b></div>
    <div>Vaqt: ${ad.departureTime ? new Date(ad.departureTime).toLocaleString() : "-"}</div>
    <div>Joy: ${seats}</div>
    <button class="btn edit-btn" data-id="${adId}">Tahrirlash</button>
    <button class="btn delete-btn" data-id="${adId}">O'chirish</button>
  `;

  myAdsList.appendChild(el);
}

// ===============================
// EDIT / DELETE BUTTONS
// ===============================
myAdsList.addEventListener("click", e => {
  if (e.target.classList.contains("edit-btn")){
    openEdit(e.target.dataset.id);
  }
  if (e.target.classList.contains("delete-btn")){
    deleteAd(e.target.dataset.id);
  }
});

closeEditBtn.onclick = () => editModal.style.display = "none";

// ===============================
// OPEN EDIT MODAL
// ===============================
async function openEdit(adId){
  editingAdId = adId;

  const snap = await get(ref(db, "ads/" + adId));
  if (!snap.exists()){
    alert("E'lon topilmadi.");
    return;
  }

  const ad = snap.val();

  populateEdit(ad);
  editModal.style.display = "flex";
}

// ===============================
// FIXED VERSION — populate modal
// ===============================
function populateEdit(ad){

  // FROM REGION
  editFromRegion.value = ad.fromRegion;
  window.updateDistricts("from", () => {
    editFromDistrict.value = ad.fromDistrict;
  });

  // TO REGION
  editToRegion.value = ad.toRegion;
  window.updateDistricts("to", () => {
    editToDistrict.value = ad.toDistrict;
  });

  editPrice.value = ad.price || "";
  editComment.value = ad.comment || "";
  editSeats.value = ad.driverSeats || ad.passengerCount || "";

  if (ad.departureTime){
    const d = new Date(ad.departureTime);
    const pad = n => String(n).padStart(2,"0");
    editTime.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } else {
    editTime.value = "";
  }
}

// ===============================
// SAVE EDIT
// ===============================
saveEditBtn.onclick = async () => {

  const updated = {
    fromRegion: editFromRegion.value,
    fromDistrict: editFromDistrict.value,
    toRegion: editToRegion.value,
    toDistrict: editToDistrict.value,
    price: editPrice.value,
    comment: editComment.value,
    departureTime: editTime.value ? new Date(editTime.value).getTime() : null
  };

  if (window.userRole === "driver"){
    updated.driverSeats = editSeats.value;
  } else {
    updated.passengerCount = editSeats.value;
  }

  await update(ref(db, "ads/" + editingAdId), updated);

  alert("E'lon yangilandi!");
  editModal.style.display = "none";
  loadMyAds();
};

// ===============================
// DELETE AD
// ===============================
async function deleteAd(id){
  if (!confirm("O'chirish?")) return;
  await remove(ref(db, "ads/" + id));
  loadMyAds();
}

// ===============================
// START
// ===============================
onAuthStateChanged(auth, async user => {
  if (!user){
    window.location.href = "/shahartaxi-demo/docs/app/auth/login.html";
    return;
  }

  await loadUserRole(user.uid);
  loadMyAds();
});
