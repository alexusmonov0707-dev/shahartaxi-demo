// my-ads.js — FINAL MATCH-SAFE VERSION
// Works only with new regions-helper.js

import {
  auth, db, ref, get, update, remove, onAuthStateChanged, $
} from "/shahartaxi-demo/docs/libs/lib.js";

function _$(id){ return document.getElementById(id); }
const $el = (typeof $==="function") ? $ : _$;

// DOM refs
const elList = $el("myAdsList");
const modal = $el("editModal");

const frReg = $el("editFromRegion");
const frDis = $el("editFromDistrict");
const toReg = $el("editToRegion");
const toDis = $el("editToDistrict");

const price = $el("editPrice");
const time = $el("editTime");
const seats = $el("editSeats");
const comment = $el("editComment");

const saveBtn = $el("saveEditBtn");
const closeBtn = $el("closeEditBtn");

let editingId = null;
let editingOwner = null;

window.userRole = "passenger";

// --- format datetime ---
function fmt(ms){
  if(!ms) return "-";
  const d = new Date(ms);
  if(isNaN(d)) return "-";
  return d.toLocaleString("uz-UZ");
}

// --- load role ---
async function loadUserRole(uid){
  const s = await get(ref(db,"users/"+uid));
  if(s.exists()) window.userRole = s.val().role || "passenger";
}

// --- fill region selects ---
function fillEditRegions(){
  window.fillRegions("editFromRegion");
  window.fillRegions("editToRegion");
}

// --- load ads (nested + flat) ---
async function loadMyAds(){
  const user = auth.currentUser;
  if(!user) return;

  elList.innerHTML = "Yuklanmoqda...";

  const snap = await get(ref(db,"ads"));
  elList.innerHTML = "";

  if(!snap.exists()){
    elList.innerHTML = "<p>E'lon yo‘q.</p>";
    return;
  }

  const arr = [];

  snap.forEach(node=>{
    const val = node.val();

    let nested = false;
    node.forEach(ch=>{
      const cv = ch.val();
      if(cv && (cv.fromRegion || cv.createdAt)) nested = true;
    });

    if(nested){
      if(node.key === user.uid){
        node.forEach(ad=>{
          arr.push({ad: ad.val(), id: ad.key, owner: user.uid});
        });
      }
    } else {
      if(val.userId === user.uid){
        arr.push({ad: val, id: node.key, owner: val.userId});
      }
    }
  });

  if(arr.length===0){
    elList.innerHTML = "<p>E'lon yo‘q.</p>";
    return;
  }

  arr.forEach(x => renderAd(x.ad, x.id, x.owner));
}

// --- render card ---
function renderAd(ad, id, owner){
  const s = ad.driverSeats || ad.passengerCount || "";
  const box = document.createElement("div");
  box.className = "ad-box";
  box.innerHTML = `
    <div style="font-weight:700;color:#0069d9">${ad.type||""}</div>
    <div>${ad.fromRegion} ${ad.fromDistrict} → ${ad.toRegion} ${ad.toDistrict}</div>
    <div class="ad-meta">Narx: <b>${ad.price}</b></div>
    <div class="ad-meta">Vaqt: ${fmt(ad.departureTime)}</div>
    <div class="ad-meta">Joy: ${s}</div>
    <div class="ad-actions">
      <button class="btn btn-primary edit" data-id="${id}" data-owner="${owner}">Tahrirlash</button>
      <button class="btn btn-danger delete" data-id="${id}" data-owner="${owner}">O‘chirish</button>
    </div>
  `;
  elList.appendChild(box);
}

// --- handlers ---
elList.addEventListener("click", e=>{
  if(e.target.classList.contains("edit")){
    openEdit(e.target.dataset.id, e.target.dataset.owner);
  }
  if(e.target.classList.contains("delete")){
    deleteAd(e.target.dataset.id, e.target.dataset.owner);
  }
});

closeBtn.onclick = () => modal.style.display = "none";

// --- open edit modal ---
async function openEdit(id, owner){
  editingId = id;
  editingOwner = owner;

  let snap = await get(ref(db,`ads/${owner}/${id}`));
  if(!snap.exists()) snap = await get(ref(db,`ads/${id}`));

  if(!snap.exists()){
    alert("E'lon topilmadi");
    return;
  }

  const ad = snap.val();

  fillEditRegions();

  setTimeout(()=>populate(ad),100);

  modal.style.display = "flex";
}

// --- populate modal (MATCH SAFE) ---
function populate(ad){

  frReg.value = ad.fromRegion;
  toReg.value = ad.toRegion;

  // FROM DISTRICT — only inside callback
  window.updateDistricts("from", () => {
    frDis.value = ad.fromDistrict || "";
  });

  // TO DISTRICT — only inside callback
  window.updateDistricts("to", () => {
    toDis.value = ad.toDistrict || "";
  });

  price.value = ad.price || "";
  comment.value = ad.comment || "";
  seats.value = ad.driverSeats || ad.passengerCount || "";

  if(ad.departureTime){
    const d = new Date(ad.departureTime);
    const pad = n=>String(n).padStart(2,"0");
    time.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } else {
    time.value = "";
  }
}

// --- save edit ---
saveEditBtn.onclick = async ()=>{

  const data = {
    fromRegion: frReg.value,
    fromDistrict: frDis.value,
    toRegion: toReg.value,
    toDistrict: toDis.value,
    price: price.value,
    comment: comment.value,
    departureTime: time.value ? new Date(time.value).getTime() : null
  };

  if(window.userRole==="driver") data.driverSeats = seats.value;
  else data.passengerCount = seats.value;

  const flat = await get(ref(db,`ads/${editingId}`));
  if(flat.exists()){
    await update(ref(db,`ads/${editingId}`), data);
  } else {
    await update(ref(db,`ads/${editingOwner}/${editingId}`), data);
  }

  alert("Yangilandi!");
  modal.style.display="none";
  loadMyAds();
};

// --- delete ---
async function deleteAd(id, owner){
  if(!confirm("O‘chirilsinmi?")) return;

  const flat = await get(ref(db,`ads/${id}`));
  if(flat.exists()) await remove(ref(db,`ads/${id}`));
  else await remove(ref(db,`ads/${owner}/${id}`));

  loadMyAds();
}

// --- init ---
onAuthStateChanged(auth, async user=>{
  if(!user){
    location.href="/shahartaxi-demo/docs/app/auth/login.html";
    return;
  }

  await loadUserRole(user.uid);
  fillEditRegions();
  loadMyAds();
});
