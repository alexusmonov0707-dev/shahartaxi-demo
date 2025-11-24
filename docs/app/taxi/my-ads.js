// ===============================================
//  SHAHARTAXI – MY ADS (FINAL, PERFECT VERSION)
//  ✔ works with universal regions-helper.js
//  ✔ perfect region → district sync
//  ✔ edit modal fully fixed
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

// EDIT MODAL ELEMENTS
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
let editingAdOwner = null;

window.userRole = window.userRole || "passenger";

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
// LOAD USER ADS
// ===============================
async function loadMyAds(){
  const user = auth.currentUser;
  if (!user) return;

  myAdsList.innerHTML = "Yuklanmoqda...";

  const adsSnap = await get(ref(db, "ads"));
  myAdsList.innerHTML = "";

  if (!adsSnap.exists()){
    myAdsList.innerHTML = "<p>E'lonlar yo'q.</p>";
    return;
  }

  let found = false;

  // FLAT ads/<adId>
  adsSnap.forEach(adNode => {
    const ad = adNode.val();
    if (ad.userId === user.uid){
      renderAdItem(ad, adNode.key, user.uid);
      found = true;
    }
  });

  if (!found){
    myAdsList.innerHTML = "<p>E'lonlar yo'q.</p>";
  }
}


// ===============================
// RENDER AD BLOCK
// ===============================
function renderAdItem(ad, adId, owner){
  const seats = ad.driverSeats || ad.passengerCount || "";
  const box = document.createElement("div");
  box.className = "ad-box";

  box.innerHTML = `
    <div><b>${ad.fromRegion || ""}, ${ad.fromDistrict || ""}</b> → <b>${ad.toRegion || ""}, ${ad.toDistrict || ""}</b></div>
    <div>Narx: <b>${ad.price || "-"}</b></div>
    <div>Vaqt: ${ad.departureTime ? new Date(ad.departureTime).toLocaleString() : "-"}</div>
    <div>Joy: ${seats}</div>
    <button class="btn btn-primary edit-btn" data-id="${adId}" data-owner="${owner}">Tahrirlash</button>
    <button class="btn btn-danger delete-btn" data-id="${adId}" data-owner="${owner}">O'chirish</button>
  `;

  myAdsList.appendChild(box);
}


// ===============================
// BUTTON EVENTS
// ===============================
myAdsList.addEventListener("click", e => {
  if (e.target.classList.contains("edit-btn")){
    openEdit(e.target.dataset.id, e.target.dataset.owner);
  }
  if (e.target.classList.contains("delete-btn")){
    deleteAd(e.target.dataset.id, e.target.dataset.owner);
  }
});

closeEditBtn.onclick = () => editModal.style.display = "none";


// ===============================
// OPEN EDIT MODAL
// ===============================
async function openEdit(adId, owner){
  editingAdId = adId;
  editingAdOwner = owner;

  const snap = await get(ref(db, "ads/" + adId));
  if (!snap.exists()){
    alert("E'lon topilmadi.");
    return;
  }

  const ad = snap.val();
  fillEditRegions();

  populateEditModal(ad);

  editModal.style.display = "block";
}


// ===============================
// FILL EDIT MODAL (PERFECT FIXED)
// ===============================
function populateEditModal(ad){

  // ---------------------------
  // FROM
  // ---------------------------
  editFromRegion.value = ad.fromRegion || "";

  window.updateDistricts("from", () => {
    editFromDistrict.value = ad.fromDistrict || "";
  });


  // ---------------------------
  // TO
  // ---------------------------
  editToRegion.value = ad.toRegion || "";

  window.updateDistricts("to", () => {
    editToDistrict.value = ad.toDistrict || "";
  });


  // ---------------------------
  // OTHER FIELDS
  // ---------------------------
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
// SAVE EDITED AD
// ===============================
saveEditBtn.onclick = async () => {

  const u = {
    fromRegion: editFromRegion.value,
    fromDistrict: editFromDistrict.value,
    toRegion: editToRegion.value,
    toDistrict: editToDistrict.value,
    price: editPrice.value,
    comment: editComment.value,
    departureTime: editTime.value ? new Date(editTime.value).getTime() : null
  };

  if (window.userRole === "driver"){
    u.driverSeats = editSeats.value;
  } else {
    u.passengerCount = editSeats.value;
  }

  await update(ref(db, "ads/" + editingAdId), u);

  alert("E'lon yangilandi!");
  editModal.style.display = "none";
  loadMyAds();
};


// ===============================
// DELETE AD
// ===============================
async function deleteAd(id){

  if (!confirm("Rostdan o‘chirmoqchimisiz?")) return;

  await remove(ref(db, "ads/" + id));

  loadMyAds();
}


// ===============================
// INIT
// ===============================
onAuthStateChanged(auth, async user => {
  if (!user){
    window.location.href = "/shahartaxi-demo/docs/app/auth/login.html";
    return;
  }

  await loadUserRole(user.uid);
  fillEditRegions();

  loadMyAds();
});
