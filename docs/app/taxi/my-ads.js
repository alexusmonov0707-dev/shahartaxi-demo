// ===============================================
//  SHAHARTAXI — MY ADS (FINAL FIXED VERSION)
//  100% region → district sync
//  Works with regions-helper (11).js
//  No mismatch, no stale district
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

// fallback if $ not exists
function _$(id){ return document.getElementById(id); }
const $el = typeof $ === "function" ? $ : _$;

// DOM
const myAdsList = $el("myAdsList");

// Modal elements
const editModal = $el("editModal");
const editFromRegion = $el("editFromRegion");
const editFromDistrict = $el("editFromDistrict");
const editToRegion = $el("editToRegion");
const editToDistrict = $el("editToDistrict");
const editPrice = $el("editPrice");
const editTime = $el("editTime");
const editSeats = $el("editSeats");
const editComment = $el("editComment");
const saveEditBtn = $el("saveEditBtn");
const closeEditBtn = $el("closeEditBtn");

let editingAdId = null;
let editingAdOwner = null;

window.userRole = "passenger";

function formatDatetime(ms){
  if(!ms) return "-";
  const d = new Date(ms);
  if(isNaN(d)) return "-";
  return d.toLocaleString("uz-UZ", {
    year:"numeric", month:"long", day:"numeric",
    hour:"2-digit", minute:"2-digit",
  });
}

/* -----------------------------------------------------
   LOAD USER ROLE
----------------------------------------------------- */
async function loadUserRole(uid){
  try {
    const snap = await get(ref(db, "users/" + uid));
    if(snap.exists()){
      window.userRole = snap.val().role || "passenger";
    }
  } catch(e){
    window.userRole = "passenger";
  }
}

/* -----------------------------------------------------
   LOAD MY ADS (supports flat + nested)
----------------------------------------------------- */
async function loadMyAds(){
  const user = auth.currentUser;
  if(!user) return;

  myAdsList.innerHTML = "Yuklanmoqda...";

  try{
    const snap = await get(ref(db, "ads"));
    myAdsList.innerHTML = "";

    if(!snap.exists()){
      myAdsList.innerHTML = "<p>E'lon yo‘q.</p>";
      return;
    }

    let results = [];

    snap.forEach(node => {
      const val = node.val();

      // 1) NESTED (ads/userId/adId)
      let hasChildAds = false;
      node.forEach(ch => {
        const cv = ch.val();
        if(cv && cv.createdAt) hasChildAds = true;
      });

      if(hasChildAds){
        if(node.key === user.uid){
          node.forEach(ch => {
            results.push({ ad: ch.val(), id: ch.key, owner: user.uid });
          });
        }
        return;
      }

      // 2) FLAT (ads/adId)
      if(val && val.userId === user.uid){
        results.push({ ad: val, id: node.key, owner: val.userId });
      }
    });

    if(results.length === 0){
      myAdsList.innerHTML = "<p>E'lon yo‘q.</p>";
      return;
    }

    results.forEach(x => renderAd(x.ad, x.id, x.owner));

  } catch(e){
    console.error(e);
    myAdsList.innerHTML = "<p>Xatolik yuz berdi.</p>";
  }
}

/* -----------------------------------------------------
   RENDER AD
----------------------------------------------------- */
function renderAd(ad, id, owner){
  const seats = ad.driverSeats || ad.passengerCount || "";
  const div = document.createElement("div");
  div.className = "ad-box";

  div.innerHTML = `
    <div style="font-weight:700;color:#0069d9">${ad.type || ""}</div>
    <div>${ad.fromRegion || ""}, ${ad.fromDistrict || ""} → ${ad.toRegion || ""}, ${ad.toDistrict || ""}</div>
    <div class="ad-meta">Narx: <b>${ad.price}</b></div>
    <div class="ad-meta">Vaqt: ${formatDatetime(ad.departureTime)}</div>
    <div class="ad-meta">Joy: ${seats}</div>
    <div class="ad-actions">
      <button class="btn btn-primary edit" data-id="${id}" data-owner="${owner}">Tahrirlash</button>
      <button class="btn btn-danger delete" data-id="${id}" data-owner="${owner}">O‘chirish</button>
    </div>
  `;

  myAdsList.appendChild(div);
}

/* -----------------------------------------------------
   BUTTON EVENTS
----------------------------------------------------- */
myAdsList.addEventListener("click", e => {
  if(e.target.classList.contains("edit")){
    openEdit(e.target.dataset.id, e.target.dataset.owner);
  }
  if(e.target.classList.contains("delete")){
    deleteAd(e.target.dataset.id, e.target.dataset.owner);
  }
});

closeEditBtn.onclick = () => editModal.style.display = "none";

/* -----------------------------------------------------
   OPEN EDIT MODAL
----------------------------------------------------- */
async function openEdit(id, owner){
  editingAdId = id;
  editingAdOwner = owner;

  let snap = await get(ref(db, `ads/${owner}/${id}`));
  if(!snap.exists()){
    snap = await get(ref(db, `ads/${id}`));
  }

  if(!snap.exists()){
    alert("E’lon topilmadi!");
    return;
  }

  const ad = snap.val();

  populateEditModal(ad);

  editModal.style.display = "flex";
}

/* -----------------------------------------------------
   MAIN FIXED FUNCTION
   populateEditModal()  — 100% corrections
----------------------------------------------------- */
function populateEditModal(ad){

  // 1) Fill region lists
  fillEditRegions();

  // 2) FROM region → district
  editFromRegion.value = ad.fromRegion || "";
  window.updateDistricts("from", () => {
    editFromDistrict.value = ad.fromDistrict || "";
  });

  // 3) TO region → district
  editToRegion.value = ad.toRegion || "";
  window.updateDistricts("to", () => {
    editToDistrict.value = ad.toDistrict || "";
  });

  // 4) Other fields
  editPrice.value = ad.price || "";
  editComment.value = ad.comment || "";
  editSeats.value = ad.driverSeats || ad.passengerCount || "";

  if(ad.departureTime){
    const d = new Date(ad.departureTime);
    const pad = n => String(n).padStart(2,"0");
    editTime.value =
      `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } else {
    editTime.value = "";
  }
}

/* -----------------------------------------------------
   SAVE EDIT
----------------------------------------------------- */
saveEditBtn.onclick = async () => {

  const data = {
    fromRegion: editFromRegion.value,
    fromDistrict: editFromDistrict.value,
    toRegion: editToRegion.value,
    toDistrict: editToDistrict.value,
    price: editPrice.value,
    comment: editComment.value,
    departureTime: editTime.value ? new Date(editTime.value).getTime() : null
  };

  if(window.userRole === "driver")
    data.driverSeats = editSeats.value;
  else
    data.passengerCount = editSeats.value;

  // update path
  const flat = await get(ref(db, `ads/${editingAdId}`));

  if(flat.exists()){
    await update(ref(db, `ads/${editingAdId}`), data);
  } else {
    await update(ref(db, `ads/${editingAdOwner}/${editingAdId}`), data);
  }

  alert("Yangilandi!");
  editModal.style.display = "none";
  loadMyAds();
};

/* -----------------------------------------------------
   DELETE AD
----------------------------------------------------- */
async function deleteAd(id, owner){
  if(!confirm("Rostdan o‘chirmoqchimisiz?")) return;

  const flat = await get(ref(db, `ads/${id}`));

  if(flat.exists()){
    await remove(ref(db, `ads/${id}`));
  } else {
    await remove(ref(db, `ads/${owner}/${id}`));
  }

  loadMyAds();
}

/* -----------------------------------------------------
   INIT
----------------------------------------------------- */
onAuthStateChanged(auth, async user => {
  if(!user){
    location.href = "/shahartaxi-demo/docs/app/auth/login.html";
    return;
  }

  await loadUserRole(user.uid);
  fillEditRegions();
  loadMyAds();
});
