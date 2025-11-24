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

function _$(id){ return document.getElementById(id) }
const $el = typeof $ === "function" ? $ : _$;

// DOM
const myAdsList = $el("myAdsList");

// EDIT MODAL
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

function formatDatetime(dt){
  if(!dt) return "-";
  const d = new Date(dt);
  if(isNaN(d)) return dt;
  return d.toLocaleString("uz-UZ", {
    year:"numeric", month:"long", day:"numeric",
    hour:"2-digit", minute:"2-digit"
  });
}

function ensureRegions(){
  if(!window.regionsData){
    console.warn("Regions not loaded");
    return false;
  }
  return true;
}

function fillRegions(){
  if(!ensureRegions()) return;
  const list = Object.keys(window.regionsData);

  function put(sel){
    sel.innerHTML = `<option value="">Viloyat</option>`;
    list.forEach(r=> sel.innerHTML += `<option value="${r}">${r}</option>`);
  }

  put(editFromRegion);
  put(editToRegion);
}

window.updateEditDistricts = function(type){
  if(!ensureRegions()) return;
  const r = (type==="from") ? editFromRegion.value : editToRegion.value;
  const d = (type==="from") ? editFromDistrict : editToDistrict;
  d.innerHTML = `<option value="">Tuman</option>`;
  if(r && window.regionsData[r]){
    window.regionsData[r].forEach(t=> d.innerHTML += `<option>${t}</option>`);
  }
}

onAuthStateChanged(auth, user=>{
  if(!user){
    window.location.href = "/shahartaxi-demo/docs/app/auth/login.html";
    return;
  }
  fillRegions();
  loadMyAds();
});

async function loadMyAds(){
  const user = auth.currentUser;
  if(!user) return;

  myAdsList.innerHTML = "Yuklanmoqda...";
  const snap = await get(ref(db, "ads"));
  myAdsList.innerHTML = "";

  if(!snap.exists()){
    myAdsList.innerHTML = "<p>Hozircha e'lon yo'q.</p>";
    return;
  }

  snap.forEach(child=>{
    const ad = child.val();
    if(ad.userId !== user.uid) return;

    const seats = ad.driverSeats || ad.passengerCount || "";
    const div = document.createElement("div");
    div.className = "ad-box";
    div.innerHTML = `
      <div style="font-weight:700; color:#0069d9">${ad.type}</div>

      <div>${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict}</div>

      <div class="ad-meta">Narx: <b>${ad.price}</b></div>
      <div class="ad-meta">Vaqt: ${formatDatetime(ad.departureTime)}</div>
      <div class="ad-meta">Joy: ${seats}</div>

      <div class="ad-actions">
        <button class="btn btn-primary edit-btn" data-id="${child.key}">Tahrirlash</button>
        <button class="btn btn-danger delete-btn" data-id="${child.key}">O'chirish</button>
      </div>
    `;

    myAdsList.appendChild(div);
  });
}

myAdsList.addEventListener("click", e=>{
  if(e.target.classList.contains("edit-btn")){
    openEdit(e.target.dataset.id);
  }
  if(e.target.classList.contains("delete-btn")){
    deleteAd(e.target.dataset.id);
  }
});

async function openEdit(id){
  editingAdId = id;
  const snap = await get(ref(db, "ads/"+id));
  if(!snap.exists()) return;

  const ad = snap.val();

  fillRegions();

  editFromRegion.value = ad.fromRegion;
  updateEditDistricts("from");
  editFromDistrict.value = ad.fromDistrict;

  editToRegion.value = ad.toRegion;
  updateEditDistricts("to");
  editToDistrict.value = ad.toDistrict;

  editPrice.value = ad.price;
  editSeats.value = ad.driverSeats || ad.passengerCount || "";
  editComment.value = ad.comment || "";

  if(ad.departureTime){
    const d = new Date(ad.departureTime);
    const pad= n=> String(n).padStart(2,"0");
    editTime.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  editModal.style.display = "flex";
}

closeEditBtn.onclick = () => editModal.style.display = "none";

saveEditBtn.onclick = async ()=>{
  const u = {
    fromRegion: editFromRegion.value,
    fromDistrict: editFromDistrict.value,
    toRegion: editToRegion.value,
    toDistrict: editToDistrict.value,
    price: editPrice.value,
    comment: editComment.value,
    departureTime: editTime.value
  };

  if(window.userRole==="driver") u.driverSeats = editSeats.value;
  else u.passengerCount = editSeats.value;

  await update(ref(db, "ads/"+editingAdId), u);

  alert("Yangilandi!");
  editModal.style.display = "none";
  loadMyAds();
}

async function deleteAd(id){
  if(!confirm("Rostdan o'chirilsinmi?")) return;
  await remove(ref(db, "ads/"+id));
  loadMyAds();
}
