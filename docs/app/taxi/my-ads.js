// my-ads.js — FINAL FIX: role rendering + createdAt in card + cache + single-card update + smooth fade
// Keeps all original features. Uses regions-helper.js functions (window.fillRegions, window.updateDistricts)

import {
  auth, db, ref, get, update, remove, onAuthStateChanged,
} from "../../libs/lib.js";

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

// --- fill region selects ---
function fillEditRegions(){
  window.fillRegions("editFromRegion");
  window.fillRegions("editToRegion");
}

// --- role label ---
function getRoleLabel(ad){
  if(!ad) return "";
  const tRaw = (ad.type || "").toString().trim().toLowerCase();
  if(tRaw === "haydovchi" || tRaw === "driver") return "Haydovchi";
  if(tRaw === "yo'lovchi" || tRaw === "yolovchi" || tRaw === "passenger") return "Yo‘lovchi";
  return "";
}

// --- create card ---
function createAdElement(ad, id, owner){
  const roleLabel = getRoleLabel(ad);

  // ✅ JOY / YO‘LOVCHI SONI HAR DOIM TO‘G‘RI
  const s =
  ad.driverSeats !== undefined && ad.driverSeats !== null && ad.driverSeats !== ""
    ? ad.driverSeats
    : ad.passengerCount !== undefined && ad.passengerCount !== null && ad.passengerCount !== ""
    ? ad.passengerCount
    : ad.seats !== undefined && ad.seats !== null && ad.seats !== ""
    ? ad.seats
    : ad.passengers !== undefined && ad.passengers !== null && ad.passengers !== ""
    ? ad.passengers
    : ad.seatCount !== undefined && ad.seatCount !== null && ad.seatCount !== ""
    ? ad.seatCount
    : ad.count !== undefined && ad.count !== null && ad.count !== ""
    ? ad.count
    : "";


  const box = document.createElement("div");
  box.className = "ad-box";
  box.dataset.id = id;
  box.dataset.owner = owner;

  const departureDisplay = (()=>{
    if(!ad) return "-";
    if(ad.departureTime && typeof ad.departureTime === "number") return fmt(ad.departureTime);
    if(ad.departureTime && typeof ad.departureTime === "string"){
      const parsed = Date.parse(ad.departureTime);
      return isNaN(parsed) ? ad.departureTime : fmt(parsed);
    }
    return "-";
  })();

  let createdAtDisp = "-";
  if(ad && ad.createdAt){
    let ms = null;
    if(typeof ad.createdAt === "number") ms = ad.createdAt;
    else if(typeof ad.createdAt === "string"){
      const parsed = Date.parse(ad.createdAt);
      ms = isNaN(parsed) ? null : parsed;
    }
    createdAtDisp = ms ? fmt(ms) : String(ad.createdAt || "-");
  }

  box.innerHTML = `
    <div style="font-weight:700;color:#0069d9">${escapeHtml(roleLabel)}</div>
    <div class="ad-route" style="margin-top:6px;font-weight:600">
      ${escapeHtml(ad.fromRegion||"")} ${escapeHtml(ad.fromDistrict||"")} →
      ${escapeHtml(ad.toRegion||"")} ${escapeHtml(ad.toDistrict||"")}
    </div>

    <div class="ad-meta" style="margin-top:8px">Narx: <b>${escapeHtml(String(ad.price||""))}</b></div>
    <div class="ad-meta">Vaqt: ${departureDisplay}</div>
    <div class="ad-meta">Joy: ${escapeHtml(String(s||""))}</div>

    <div class="ad-meta" style="text-align:right;color:#6b7280;margin-top:18px;">
      ${escapeHtml(createdAtDisp)}
    </div>

    <div class="ad-actions" style="margin-top:10px">
      <button class="btn btn-primary edit" data-id="${id}" data-owner="${owner}">Tahrirlash</button>
      <button class="btn btn-danger delete" data-id="${id}" data-owner="${owner}">O‘chirish</button>
    </div>
  `;

  return box;
}

// --- escape ---
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'", "&#39;");
}

// --- ✅ LOAD MY ADS: FAQAT O‘ZIMNIKI ---
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
  const newCache = {};
  const currentUid = user.uid;

  snap.forEach(node=>{
    let nested = false;

    node.forEach(ch=>{
      const cv = ch.val();
      if(cv && (cv.fromRegion || cv.createdAt)) nested = true;
    });

    if(nested){
      // ✅ FAQAT O‘Z EGASI
      if(node.key !== currentUid) return;

      node.forEach(ad=>{
        const adVal = ad.val();
        const id = ad.key;
        const owner = node.key;

        arr.push({ad: adVal, id, owner});
        newCache[id] = { ad: adVal, owner };
      });
    } 
    else {
      const val = node.val();

      if(val && val.userId === currentUid){
        const id = node.key;
        arr.push({ad: val, id, owner: currentUid});
        newCache[id] = { ad: val, owner: currentUid };
      }
    }
  });

  window.adsCache = newCache;

  if(arr.length===0){
    elList.innerHTML = "<p>E'lon yo‘q.</p>";
    return;
  }

  arr.forEach(x => {
    const el = createAdElement(x.ad, x.id, x.owner);
    elList.appendChild(el);
  });
}

// --- single card update ---
function updateCardInDOM(ad, id, owner){
  const old = elList.querySelector(`.ad-box[data-id="${id}"]`);
  const newEl = createAdElement(ad, id, owner);

  if(!old){
    elList.insertBefore(newEl, elList.firstChild);
    newEl.style.opacity = "0";
    requestAnimationFrame(()=> {
      newEl.style.transition = "opacity .16s";
      newEl.style.opacity = "1";
    });
    return;
  }

  old.style.transition = "opacity .16s";
  old.style.opacity = "0";
  setTimeout(()=>{
    old.replaceWith(newEl);
    newEl.style.opacity = "0";
    newEl.style.transition = "opacity .16s";
    requestAnimationFrame(()=> newEl.style.opacity = "1");
  }, 160);
}

// --- delegated handlers ---
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

// --- edit open ---
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

// --- populate ---
function populate(ad){
  frReg.value = ad.fromRegion || "";
  toReg.value = ad.toRegion || "";

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

  if(ad.createdAt){
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

  if(window.adsCache && window.adsCache[editingId]){
    window.adsCache[editingId].ad = Object.assign({}, window.adsCache[editingId].ad, data);
    updateCardInDOM(window.adsCache[editingId].ad, editingId, window.adsCache[editingId].owner);
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

  if(window.adsCache && window.adsCache[id]) delete window.adsCache[id];
  const el = elList.querySelector(`.ad-box[data-id="${id}"]`);
  if(el){
    el.style.transition = "opacity .16s";
    el.style.opacity = "0";
    setTimeout(()=> el.remove(), 160);
  }
}

// --- ✅ SOFT AUTH INIT (LOGIN’GA SAKRAB KETMASDI) ---
onAuthStateChanged(auth, async user=>{
  if(!user){
    setTimeout(()=>{
      if(!auth.currentUser){
        location.href="/shahartaxi-demo/docs/app/auth/login.html";
      }
    },800);
    return;
  }

  await loadUserRole(user.uid);
  fillEditRegions();
  loadMyAds();
});

// --- debug ---
window.__shahartaxi_myads = {
  reload: loadMyAds,
  getCache: ()=> window.adsCache
};
