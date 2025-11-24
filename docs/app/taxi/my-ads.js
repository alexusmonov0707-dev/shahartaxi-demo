// my-ads.js — OPTIMIZED FULL VERSION
// Uses regions-helper.js (window.fillRegions, window.updateDistricts)
// Caching: window.adsCache
// Only updates single card DOM on edit (with fade animation)
// createdAt shown in modal (#editCreatedAt)
// Keep all previous features intact.

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
const createdAtEl = $el("editCreatedAt");

const saveBtn = $el("saveEditBtn");
const closeBtn = $el("closeEditBtn");

let editingId = null;
let editingOwner = null;

window.userRole = "passenger";
// global cache: { id: {ad, owner} }
window.adsCache = window.adsCache || {};

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

// --- fill region selects (from helper) ---
function fillEditRegions(){
  window.fillRegions("editFromRegion");
  window.fillRegions("editToRegion");
}

// helper: create card DOM (returns element)
function createAdElement(ad, id, owner){
  const s = ad.driverSeats || ad.passengerCount || "";
  const box = document.createElement("div");
  box.className = "ad-box";
  box.dataset.id = id;
  box.dataset.owner = owner;
  box.innerHTML = `
    <div style="font-weight:700;color:#0069d9">${ad.type||""}</div>
    <div class="ad-route">${escapeHtml(ad.fromRegion||"")} ${escapeHtml(ad.fromDistrict||"")} → ${escapeHtml(ad.toRegion||"")} ${escapeHtml(ad.toDistrict||"")}</div>
    <div class="ad-meta">Narx: <b>${escapeHtml(String(ad.price||""))}</b></div>
    <div class="ad-meta">Vaqt: ${fmt(ad.departureTime)}</div>
    <div class="ad-meta">Joy: ${escapeHtml(String(s||""))}</div>
    <div class="ad-meta">E'lon berilgan: ${fmt(ad.createdAt)}</div>
    <div class="ad-actions">
      <button class="btn btn-primary edit" data-id="${id}" data-owner="${owner}">Tahrirlash</button>
      <button class="btn btn-danger delete" data-id="${id}" data-owner="${owner}">O‘chirish</button>
    </div>
  `;
  return box;
}

// escape helper to avoid injection in innerHTML insertion
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'", "&#39;");
}

// --- load ads once and cache ---
async function loadMyAds(){
  const user = auth.currentUser;
  if(!user) return;

  elList.innerHTML = "Yuklanmoqda...";

  const snap = await get(ref(db,"ads"));
  elList.innerHTML = "";

  if(!snap.exists()){
    elList.innerHTML = "<p>E'lon yo‘q.</p>";
    window.adsCache = {};
    return;
  }

  const arr = [];
  // build flattened array and cache
  const newCache = {};

  snap.forEach(node=>{
    const val = node.val();

    let nested = false;
    node.forEach(ch=>{
      const cv = ch.val();
      if(cv && (cv.fromRegion || cv.createdAt)) nested = true;
    });

    if(nested){
      // node is owner
      node.forEach(ad=>{
        const adVal = ad.val();
        const id = ad.key;
        const owner = node.key;
        arr.push({ad: adVal, id, owner});
        newCache[id] = { ad: adVal, owner };
      });
    } else {
      // flat ad
      if(val && val.userId){
        const id = node.key;
        arr.push({ad: val, id, owner: val.userId});
        newCache[id] = { ad: val, owner: val.userId };
      } else if(val && val.createdAt){
        // fallback: single node
        const id = node.key;
        arr.push({ad: val, id, owner: node.key});
        newCache[id] = { ad: val, owner: node.key };
      }
    }
  });

  // set global cache
  window.adsCache = newCache;

  if(arr.length===0){
    elList.innerHTML = "<p>E'lon yo‘q.</p>";
    return;
  }

  // render all (initial load)
  arr.forEach(x => {
    const el = createAdElement(x.ad, x.id, x.owner);
    elList.appendChild(el);
  });
}

// --- render single updated card with fade animation ---
function updateCardInDOM(ad, id, owner){
  const old = elList.querySelector(`.ad-box[data-id="${id}"]`);
  const newEl = createAdElement(ad, id, owner);
  // if no old, append
  if(!old){
    // append at top
    elList.insertBefore(newEl, elList.firstChild);
    newEl.style.opacity = "0";
    requestAnimationFrame(()=> {
      newEl.style.transition = "opacity .16s";
      newEl.style.opacity = "1";
    });
    return;
  }

  // fade out old -> replace -> fade in
  old.style.transition = "opacity .16s";
  old.style.opacity = "0";
  setTimeout(()=>{
    // replace node
    old.replaceWith(newEl);
    newEl.style.opacity = "0";
    newEl.style.transition = "opacity .16s";
    requestAnimationFrame(()=> newEl.style.opacity = "1");
  }, 160);
}

// --- handlers (delegated) ---
elList.addEventListener("click", e=>{
  const editBtn = e.target.closest(".edit");
  const delBtn = e.target.closest(".delete");
  if(editBtn){
    openEdit(editBtn.dataset.id, editBtn.dataset.owner);
  }
  if(delBtn){
    deleteAd(delBtn.dataset.id, delBtn.dataset.owner);
  }
});

closeBtn.onclick = () => modal.style.display = "none";

// --- open edit modal ---
async function openEdit(id, owner){
  editingId = id;
  editingOwner = owner;

  // try nested path first then flat
  let snap = await get(ref(db,`ads/${owner}/${id}`));
  if(!snap.exists()) snap = await get(ref(db,`ads/${id}`));

  if(!snap.exists()){
    alert("E'lon topilmadi");
    return;
  }

  const ad = snap.val();

  fillEditRegions();

  // ensure districts updated then populate selected districts and other fields
  setTimeout(()=>populate(ad),100);

  modal.style.display = "flex";
}

// --- populate modal (preserves districts matching) ---
function populate(ad){
  frReg.value = ad.fromRegion || "";
  toReg.value = ad.toRegion || "";

  // ensure districts list built then set values via callback
  window.updateDistricts("from", () => {
    frDis.value = ad.fromDistrict || "";
  });

  window.updateDistricts("to", () => {
    toDis.value = ad.toDistrict || "";
  });

  price.value = ad.price || "";
  comment.value = ad.comment || "";
  seats.value = ad.driverSeats || ad.passengerCount || "";

  if(ad.departureTime){
    // departureTime may be stored as ms or ISO string
    let ms = null;
    if(typeof ad.departureTime === "number") ms = ad.departureTime;
    else if(typeof ad.departureTime === "string") {
      const parsed = Date.parse(ad.departureTime);
      ms = isNaN(parsed) ? null : parsed;
    }
    if(ms){
      const d = new Date(ms);
      const pad = n=>String(n).padStart(2,"0");
      time.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } else {
      time.value = "";
    }
  } else {
    time.value = "";
  }

  // createdAt display (read-only span)
  if(ad.createdAt){
    // createdAt may be ms or string
    let ms = null;
    if(typeof ad.createdAt === "number") ms = ad.createdAt;
    else if(typeof ad.createdAt === "string"){
      const parsed = Date.parse(ad.createdAt);
      ms = isNaN(parsed) ? null : parsed;
    }
    createdAtEl.textContent = ms ? fmt(ms) : String(ad.createdAt || "-");
  } else {
    createdAtEl.textContent = "-";
  }
}

// --- save edit ---
saveBtn.onclick = async ()=>{

  if(!editingId) return alert("Tahrir qilinayotgan e'lon aniqlanmadi.");

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

  // Decide where to update (flat or nested)
  const flatSnap = await get(ref(db,`ads/${editingId}`));
  try {
    if(flatSnap.exists()){
      await update(ref(db,`ads/${editingId}`), data);
    } else {
      await update(ref(db,`ads/${editingOwner}/${editingId}`), data);
    }
  } catch(err){
    console.error("Update failed:", err);
    alert("Yangilashda xatolik yuz berdi.");
    return;
  }

  // Update local cache
  if(window.adsCache && window.adsCache[editingId]){
    // merge fields locally to keep createdAt, type, userId etc.
    window.adsCache[editingId].ad = Object.assign({}, window.adsCache[editingId].ad, data);
    // ensure departureTime stored as ms (we set it above)
    // re-render only this card
    updateCardInDOM(window.adsCache[editingId].ad, editingId, window.adsCache[editingId].owner);
  } else {
    // If not in cache, fetch single snapshot and update DOM
    const after = await get(ref(db,`ads/${editingOwner}/${editingId}`));
    const val = after.exists() ? after.val() : (await get(ref(db,`ads/${editingId}`))).val();
    if(val){
      window.adsCache = window.adsCache || {};
      window.adsCache[editingId] = { ad: val, owner: editingOwner };
      updateCardInDOM(val, editingId, editingOwner);
    }
  }

  alert("Yangilandi!");
  modal.style.display="none";
};

// --- delete ---
async function deleteAd(id, owner){
  if(!confirm("O‘chirilsinmi?")) return;

  try {
    const flat = await get(ref(db,`ads/${id}`));
    if(flat.exists()) await remove(ref(db,`ads/${id}`));
    else await remove(ref(db,`ads/${owner}/${id}`));
  } catch(err){
    console.error("Delete failed:", err);
    alert("O'chirishda xatolik.");
    return;
  }

  // remove from cache and DOM
  if(window.adsCache && window.adsCache[id]) delete window.adsCache[id];
  const el = elList.querySelector(`.ad-box[data-id="${id}"]`);
  if(el){
    // fade out then remove
    el.style.transition = "opacity .16s";
    el.style.opacity = "0";
    setTimeout(()=> el.remove(), 160);
  }
}

// --- init ---
onAuthStateChanged(auth, async user=>{
  if(!user){
    location.href="/shahartaxi-demo/docs/app/auth/login.html";
    return;
  }

  await loadUserRole(user.uid);
  fillEditRegions();
  // initial load cached
  loadMyAds();
});

// --- expose for debugging if needed ---
window.__shahartaxi_myads = {
  reload: loadMyAds,
  getCache: ()=> window.adsCache
};
