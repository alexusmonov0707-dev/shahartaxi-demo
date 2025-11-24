// ===============================================
//  SHAHARTAXI — MY ADS (FINAL — fillEditRegions YO‘Q)
//  100% region ↔ district sync
//  Works with regions-helper (11).js
// ===============================================

import {
  auth, db, ref, get, update, remove,
  onAuthStateChanged, $
} from "/shahartaxi-demo/docs/libs/lib.js";

function _$(id){ return document.getElementById(id); }
const $el = typeof $ === "function" ? $ : _$;

// DOM
const myAdsList = $el("myAdsList");

// Modal
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

function format(ms){
  if(!ms) return "-";
  const d = new Date(ms);
  if(isNaN(d)) return "-";
  return d.toLocaleString("uz-UZ");
}

/* LOAD ROLE */
async function loadUserRole(uid){
  const snap = await get(ref(db, "users/"+uid));
  if(snap.exists()) window.userRole = snap.val().role || "passenger";
}

/* LOAD ADS */
async function loadMyAds(){
  const user = auth.currentUser;
  if(!user) return;

  myAdsList.innerHTML = "Yuklanmoqda...";

  const snap = await get(ref(db, "ads"));
  myAdsList.innerHTML = "";

  if(!snap.exists()){
    myAdsList.innerHTML = "<p>E'lon yo‘q</p>";
    return;
  }

  let arr = [];

  snap.forEach(node => {
    const val = node.val();

    // nested
    let nested = false;
    node.forEach(ch => {
      const cv = ch.val();
      if(cv && cv.createdAt) nested = true;
    });

    if(nested){
      if(node.key === user.uid){
        node.forEach(ch => {
          arr.push({ ad: ch.val(), id: ch.key, owner: user.uid });
        });
      }
      return;
    }

    // flat
    if(val.userId === user.uid){
      arr.push({ ad: val, id: node.key, owner: val.userId });
    }
  });

  if(arr.length === 0){
    myAdsList.innerHTML = "<p>E'lon yo‘q</p>";
    return;
  }

  arr.forEach(x => renderAd(x.ad, x.id, x.owner));
}

function renderAd(ad, id, owner){
  const seats = ad.driverSeats || ad.passengerCount || "";
  const div = document.createElement("div");
  div.className = "ad-box";

  div.innerHTML = `
    <div style="font-weight:700; color:#0069d9">${ad.type || ""}</div>
    <div>${ad.fromRegion || ""}, ${ad.fromDistrict || ""} → ${ad.toRegion || ""}, ${ad.toDistrict || ""}</div>
    <div class="ad-meta">Narx: <b>${ad.price}</b></div>
    <div class="ad-meta">Vaqt: ${format(ad.departureTime)}</div>
    <div class="ad-meta">Joy: ${seats}</div>

    <div class="ad-actions">
      <button class="btn btn-primary edit" data-id="${id}" data-owner="${owner}">Tahrirlash</button>
      <button class="btn btn-danger delete" data-id="${id}" data-owner="${owner}">O‘chirish</button>
    </div>
  `;

  myAdsList.appendChild(div);
}

myAdsList.addEventListener("click", e => {
  if(e.target.classList.contains("edit")){
    openEdit(e.target.dataset.id, e.target.dataset.owner);
  }
  if(e.target.classList.contains("delete")){
    deleteAd(e.target.dataset.id, e.target.dataset.owner);
  }
});

/* OPEN EDIT MODAL */
async function openEdit(id, owner){
  editingAdId = id;
  editingAdOwner = owner;

  let snap = await get(ref(db, `ads/${owner}/${id}`));
  if(!snap.exists()) snap = await get(ref(db, `ads/${id}`));

  if(!snap.exists()){
    alert("E’lon topilmadi");
    return;
  }

  const ad = snap.val();

  // **REGIONS DROPDOWN**
  fillRegions("editFromRegion");
  fillRegions("editToRegion");

  // **AFTER regions loaded**
  setTimeout(() => {
    populateEditModal(ad);
  }, 40);

  editModal.style.display = "flex";
}

/* FIXED — PERFECT REGION/DISTRICT SYNC */
function populateEditModal(ad){

  // FROM region
  editFromRegion.value = ad.fromRegion || "";
  window.updateDistricts("from", () => {
    editFromDistrict.value = ad.fromDistrict || "";
  });

  // TO region
  editToRegion.value = ad.toRegion || "";
  window.updateDistricts("to", () => {
    editToDistrict.value = ad.toDistrict || "";
  });

  // other fields
  editPrice.value = ad.price || "";
  editComment.value = ad.comment || "";
  editSeats.value = ad.driverSeats || ad.passengerCount || "";

  if(ad.departureTime){
    const d = new Date(ad.departureTime);
    const pad = n=>String(n).padStart(2,"0");
    editTime.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}

closeEditBtn.onclick = () => editModal.style.display="none";

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

  if(window.userRole==="driver"){
    data.driverSeats = editSeats.value;
  } else {
    data.passengerCount = editSeats.value;
  }

  const flat = await get(ref(db, `ads/${editingAdId}`));
  if(flat.exists()){
    await update(ref(db, `ads/${editingAdId}`), data);
  } else {
    await update(ref(db, `ads/${editingAdOwner}/${editingAdId}`), data);
  }

  alert("Yangilandi!");
  editModal.style.display="none";
  loadMyAds();
};

async function deleteAd(id, owner){
  if(!confirm("O‘chirilsinmi?")) return;

  const flat = await get(ref(db, `ads/${id}`));
  if(flat.exists()) await remove(ref(db, `ads/${id}`));
  else await remove(ref(db, `ads/${owner}/${id}`));

  loadMyAds();
}

/* INIT */
onAuthStateChanged(auth, async user => {
  if(!user){
    location.href="/shahartaxi-demo/docs/app/auth/login.html";
    return;
  }

  await loadUserRole(user.uid);

  loadMyAds();
});
