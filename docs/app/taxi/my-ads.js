// my-ads.js (module)
import {
  auth,
  db,
  ref,
  get,
  push,
  update,
  remove,
  onAuthStateChanged,
  $
} from "/shahartaxi-demo/docs/libs/lib.js";

// simple helper if $ not exported (fallback)
function _$(id){ return document.getElementById(id) }
const $el = typeof $ === "function" ? $ : _$;

// DOM refs
const fromRegion = $el("fromRegion");
const fromDistrict = $el("fromDistrict");
const toRegion = $el("toRegion");
const toDistrict = $el("toDistrict");
const price = $el("price");
const departureTime = $el("departureTime");
const seats = $el("seats");
const adComment = $el("adComment");
const addAdBtn = $el("addAdBtn");
const clearAddBtn = $el("clearAddBtn");
const myAdsList = $el("myAdsList");

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

// datetime formatting helper
function formatDatetime(dt){
  if(!dt) return "-";
  try {
    const d = new Date(dt);
    if(isNaN(d)) return dt;
    return d.toLocaleString("uz-UZ", {year:"numeric", month:"long", day:"numeric", hour:"2-digit", minute:"2-digit"});
  } catch(e){ return dt }
}

// ---------- REGIONS: fill selects ----------
function ensureRegionsLoaded(){
  if (!window.regionsData) {
    // regions not loaded by regions-taxi.js — warn and exit
    console.warn("Regions data not loaded (window.regionsData). Region selects will be empty.");
    return false;
  }
  return true;
}

function fillRegionSelects(){
  if(!ensureRegionsLoaded()) return;
  const keys = Object.keys(window.regionsData);

  function fill(sel, placeholder){
    if(!sel) return;
    sel.innerHTML = `<option value="">${placeholder}</option>`;
    keys.forEach(r => sel.innerHTML += `<option value="${r}">${r}</option>`);
  }

  fill(fromRegion, "Qayerdan (Viloyat)");
  fill(toRegion, "Qayerga (Viloyat)");
  fill(editFromRegion, "Viloyat");
  fill(editToRegion, "Viloyat");
}

window.updateDistricts = function(type){
  if(!ensureRegionsLoaded()) return;
  const region = document.getElementById(type + "Region").value;
  const districtSelect = document.getElementById(type + "District");
  districtSelect.innerHTML = '<option value="">Tuman</option>';
  if(region && window.regionsData[region]){
    window.regionsData[region].forEach(t => districtSelect.innerHTML += `<option value="${t}">${t}</option>`);
  }
};

window.updateEditDistricts = function(type){
  if(!ensureRegionsLoaded()) return;
  const region = (type === "from") ? (editFromRegion.value || "") : (editToRegion.value || "");
  const districtSelect = (type === "from") ? editFromDistrict : editToDistrict;
  districtSelect.innerHTML = '<option value="">Tuman</option>';
  if(region && window.regionsData[region]){
    window.regionsData[region].forEach(t => districtSelect.innerHTML += `<option value="${t}">${t}</option>`);
  }
};

// ---------- AUTH + init ----------
onAuthStateChanged(auth, user => {
  if(!user){
    // redirect to login relative path
    window.location.href = "/shahartaxi-demo/docs/app/auth/login.html";
    return;
  }
  // fill region selects now that page loaded
  fillRegionSelects();
  loadMyAds();
});

// ---------- ADD AD ----------
if(addAdBtn) addAdBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if(!user) return alert("Iltimos, tizimga kiring.");

  const ad = {
    userId: user.uid,
    type: window.userRole === "driver" ? "Haydovchi" : "Yo'lovchi",
    fromRegion: fromRegion ? fromRegion.value : "",
    fromDistrict: fromDistrict ? fromDistrict.value : "",
    toRegion: toRegion ? toRegion.value : "",
    toDistrict: toDistrict ? toDistrict.value : "",
    price: price ? price.value : "",
    comment: adComment ? adComment.value : "",
    departureTime: departureTime ? departureTime.value : "",
    createdAt: Date.now(),
    approved: false
  };

  if(seats && seats.value){
    if(window.userRole === "driver") ad.driverSeats = seats.value;
    else ad.passengerCount = seats.value;
  }

  try {
    await push(ref(db, "ads"), ad);
    alert("E'lon joylandi!");
    clearAddForm();
    loadMyAds();
  } catch (err) {
    console.error(err);
    alert("Xatolik yuz berdi.");
  }
});

if(clearAddBtn) clearAddBtn.addEventListener("click", clearAddForm);

function clearAddForm(){
  if(fromRegion) fromRegion.value = "";
  if(fromDistrict) fromDistrict.innerHTML = '<option value="">Tuman</option>';
  if(toRegion) toRegion.value = "";
  if(toDistrict) toDistrict.innerHTML = '<option value="">Tuman</option>';
  if(price) price.value = "";
  if(departureTime) departureTime.value = "";
  if(seats) seats.value = "";
  if(adComment) adComment.value = "";
}

// ---------- LOAD MY ADS ----------
async function loadMyAds(){
  const user = auth.currentUser;
  if(!user){
    myAdsList.innerHTML = "<p>Tizimga kirilmadi.</p>";
    return;
  }
  myAdsList.innerHTML = "Yuklanmoqda...";
  try {
    const snap = await get(ref(db, "ads"));
    myAdsList.innerHTML = "";
    if(!snap.exists()){
      myAdsList.innerHTML = "<p>Hozircha e'lon yo'q.</p>";
      return;
    }
    snap.forEach(child => {
      const ad = child.val();
      if(ad.userId !== user.uid) return;

      const seatsInfo = ad.driverSeats ? `<div class="ad-meta"><b>Bo'sh joy:</b> ${ad.driverSeats}</div>`
                      : ad.passengerCount ? `<div class="ad-meta"><b>Yo'lovchilar:</b> ${ad.passengerCount}</div>` : "";

      const created = ad.createdAt ? formatDatetime(ad.createdAt) : "-";

      const div = document.createElement("div");
      div.className = "ad-box";
      div.dataset.adId = child.key;
      div.innerHTML = `
        <div style="font-weight:700; color:var(--primary);">${ad.type || "E'lon"}</div>
        <div style="margin-top:6px;">
          <span>${ad.fromRegion || "-"}${ad.fromDistrict ? ", " + ad.fromDistrict : ""}</span>
          &nbsp;→&nbsp;
          <span>${ad.toRegion || "-"}${ad.toDistrict ? ", " + ad.toDistrict : ""}</span>
        </div>
        <div class="ad-meta">Narx: <b style="color:#28a745">${ad.price || "-"}</b></div>
        <div class="ad-meta">Vaqt: ${formatDatetime(ad.departureTime)}</div>
        ${seatsInfo}
        <div class="ad-actions">
          <button class="btn btn-primary btn-edit" data-id="${child.key}">Tahrirlash</button>
          <button class="btn btn-danger btn-delete" data-id="${child.key}">O'chirish</button>
        </div>
        <small class="muted">Qo'shilgan: ${created}</small>
      `;
      myAdsList.appendChild(div);
    });
  } catch(e){
    console.error(e);
    myAdsList.innerHTML = "<p>Xatolik yuz berdi.</p>";
  }
}

// ---------- DELEGATED ACTIONS FOR EDIT / DELETE ----------
myAdsList.addEventListener("click", (ev) => {
  const editBtn = ev.target.closest(".btn-edit");
  const delBtn = ev.target.closest(".btn-delete");
  if(editBtn){
    const id = editBtn.dataset.id;
    openEditAdById(id);
    return;
  }
  if(delBtn){
    const id = delBtn.dataset.id;
    if(confirm("Rostdan o'chirishni xohlaysizmi?")) deleteAdById(id);
    return;
  }
});

// ---------- OPEN EDIT ----------
async function openEditAdById(id){
  if(!id) return;
  try {
    const snap = await get(ref(db, "ads/" + id));
    if(!snap.exists()) return alert("E'lon topilmadi");
    const ad = snap.val();

    // ensure regions filled
    fillRegionSelects(); // fill edit selects too

    editingAdId = id;

    // populate edit fields
    if(editFromRegion) editFromRegion.value = ad.fromRegion || "";
    window.updateEditDistricts("from");
    if(editFromDistrict) editFromDistrict.value = ad.fromDistrict || "";

    if(editToRegion) editToRegion.value = ad.toRegion || "";
    window.updateEditDistricts("to");
    if(editToDistrict) editToDistrict.value = ad.toDistrict || "";

    if(editPrice) editPrice.value = ad.price || "";
    if(editTime) {
      // try to support both timestamp and iso
      if(ad.departureTime && String(ad.departureTime).length > 0 && !isNaN(new Date(ad.departureTime))) {
        // if it's parseable to Date, convert to input value form
        const dt = new Date(ad.departureTime);
        // format to yyyy-MM-ddTHH:mm
        const pad = n => n.toString().padStart(2,"0");
        const yyyy = dt.getFullYear();
        const mm = pad(dt.getMonth()+1);
        const dd = pad(dt.getDate());
        const hh = pad(dt.getHours());
        const min = pad(dt.getMinutes());
        editTime.value = `${yyyy}-${mm}-${dd}T${hh}:${min}`;
      } else {
        editTime.value = ad.departureTime || "";
      }
    }
    if(editSeats) editSeats.value = ad.driverSeats || ad.passengerCount || "";
    if(editComment) editComment.value = ad.comment || "";

    // show modal
    if(editModal) editModal.style.display = "flex";
  } catch(e){
    console.error(e);
    alert("E'lon yuklanishda xatolik.");
  }
}

// close edit
if(closeEditBtn) closeEditBtn.addEventListener("click", () => {
  editingAdId = null;
  if(editModal) editModal.style.display = "none";
});

// save edit
if(saveEditBtn) saveEditBtn.addEventListener("click", async () => {
  if(!editingAdId) return alert("Tahrirlanadigan e'lon aniqlanmadi.");
  const updates = {
    fromRegion: editFromRegion ? editFromRegion.value : "",
    fromDistrict: editFromDistrict ? editFromDistrict.value : "",
    toRegion: editToRegion ? editToRegion.value : "",
    toDistrict: editToDistrict ? editToDistrict.value : "",
    price: editPrice ? editPrice.value : "",
    departureTime: editTime ? editTime.value : "",
    comment: editComment ? editComment.value : ""
  };
  if(editSeats){
    if(window.userRole === "driver") updates.driverSeats = editSeats.value || "";
    else updates.passengerCount = editSeats.value || "";
  }

  try {
    await update(ref(db, "ads/" + editingAdId), updates);
    alert("E'lon yangilandi!");
    editingAdId = null;
    if(editModal) editModal.style.display = "none";
    loadMyAds();
  } catch(e){
    console.error(e);
    alert("Saqlashda xatolik yuz berdi.");
  }
});

// delete
async function deleteAdById(id){
  try {
    await remove(ref(db, "ads/" + id));
    alert("E'lon o'chirildi");
    loadMyAds();
  } catch(e){
    console.error(e);
    alert("O'chirishda xatolik.");
  }
}

// if user clicks outside modal, close it
window.addEventListener("click", (ev) => {
  if(ev.target === editModal) {
    editingAdId = null;
    editModal.style.display = "none";
  }
});

// expose some functions for other modules if needed
window.loadMyAds = loadMyAds;
window.openEditAd = openEditAdById;
window.updateEditDistricts = window.updateEditDistricts;
window.updateDistricts = window.updateDistricts;

// fill region selects also when regions script becomes available later
if (!window.regionsData) {
  // maybe regions script loads later; watch for it
  const checkRegionsInterval = setInterval(() => {
    if(window.regionsData){
      fillRegionSelects();
      clearInterval(checkRegionsInterval);
    }
  }, 300);
} else {
  fillRegionSelects();
}
