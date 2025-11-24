// my-ads.js — final (works with your regions-helper (13).js)
// Replace the project's my-ads.js with this file.

import {
  auth, db, ref, get, update, remove, onAuthStateChanged, $
} from "/shahartaxi-demo/docs/libs/lib.js";

// fallback if $ not present
function _$(id){ return document.getElementById(id); }
const $el = (typeof $ === "function") ? $ : _$;

// DOM refs (must match your my-ads.html)
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
let editingAdOwner = null;
window.userRole = window.userRole || "passenger";

function fmt(ms){
  if(!ms) return "-";
  const d = new Date(ms);
  if(isNaN(d)) return "-";
  return d.toLocaleString();
}

/* --- load user role --- */
async function loadUserRole(uid){
  try {
    const s = await get(ref(db, "users/" + uid));
    if(s.exists()) window.userRole = s.val().role || "passenger";
  } catch(e){
    console.warn("loadUserRole error", e);
    window.userRole = "passenger";
  }
}

/* --- fill edit region selects using helper.fillRegions --- */
function fillEditRegions(){
  if(typeof window.fillRegions === "function"){
    window.fillRegions("editFromRegion");
    window.fillRegions("editToRegion");
  } else {
    setTimeout(fillEditRegions, 50);
  }
}

/* --- load ads (supports nested and flat) --- */
async function loadMyAds(){
  const user = auth.currentUser;
  if(!user) return;
  myAdsList.innerHTML = "Yuklanmoqda...";

  try {
    const snap = await get(ref(db, "ads"));
    myAdsList.innerHTML = "";
    if(!snap.exists()){
      myAdsList.innerHTML = "<p>E'lonlar yo'q.</p>";
      return;
    }

    const list = [];
    snap.forEach(node => {
      const nodeVal = node.val();

      // detect nested structure (ads/<uid>/<adId>)
      let nested = false;
      node.forEach(child => {
        const cv = child.val();
        if(cv && (cv.createdAt || cv.price || cv.fromRegion)) nested = true;
      });

      if(nested){
        // include only current user's nested ads
        if(node.key === user.uid){
          node.forEach(adNode => {
            list.push({ ad: adNode.val(), id: adNode.key, owner: node.key });
          });
        }
      } else {
        // flat structure
        if(nodeVal && nodeVal.userId === user.uid){
          list.push({ ad: nodeVal, id: node.key, owner: nodeVal.userId });
        }
      }
    });

    if(list.length === 0){
      myAdsList.innerHTML = "<p>E'lonlar yo'q.</p>";
      return;
    }

    list.forEach(x => renderAd(x.ad, x.id, x.owner));
  } catch(err){
    console.error("loadMyAds error", err);
    myAdsList.innerHTML = "<p>Xatolik yuz berdi.</p>";
  }
}

/* --- render single ad --- */
function renderAd(ad, id, owner){
  const seats = ad.driverSeats || ad.passengerCount || "";
  const card = document.createElement("div");
  card.className = "ad-box";
  card.innerHTML = `
    <div style="font-weight:700;color:#0069d9">${ad.type || ""}</div>
    <div>${ad.fromRegion || ""}, ${ad.fromDistrict || ""} → ${ad.toRegion || ""}, ${ad.toDistrict || ""}</div>
    <div class="ad-meta">Narx: <b>${ad.price || "-"}</b></div>
    <div class="ad-meta">Vaqt: ${fmt(ad.departureTime)}</div>
    <div class="ad-meta">Joy: ${seats}</div>
    <div class="ad-actions">
      <button class="btn btn-primary edit-btn" data-id="${id}" data-owner="${owner||""}">Tahrirlash</button>
      <button class="btn btn-danger delete-btn" data-id="${id}" data-owner="${owner||""}">O'chirish</button>
    </div>
  `;
  myAdsList.appendChild(card);
}

/* --- click handlers --- */
myAdsList.addEventListener("click", e=>{
  if(e.target.classList.contains("edit-btn")){
    openEdit(e.target.dataset.id, e.target.dataset.owner);
  } else if(e.target.classList.contains("delete-btn")){
    deleteAd(e.target.dataset.id, e.target.dataset.owner);
  }
});

closeEditBtn.onclick = () => editModal.style.display = "none";

/* --- open edit modal --- */
async function openEdit(id, owner){
  editingAdId = id;
  editingAdOwner = owner || null;

  try {
    let snap = null;
    if(owner){
      snap = await get(ref(db, `ads/${owner}/${id}`));
    }
    if(!snap || !snap.exists()){
      snap = await get(ref(db, `ads/${id}`));
    }
    if(!snap || !snap.exists()){
      // fallback search
      const all = await get(ref(db, "ads"));
      if(all.exists()){
        let found = null;
        all.forEach(userNode=>{
          if(found) return;
          userNode.forEach(adNode=>{
            if(adNode.key === id) found = {ad: adNode.val(), owner: userNode.key};
          });
        });
        if(found){
          populateEditModal(found.ad);
          editingAdOwner = found.owner;
          editModal.style.display = "flex";
          return;
        }
      }
      alert("E'lon topilmadi.");
      return;
    }

    populateEditModal(snap.val());
    editModal.style.display = "flex";
  } catch(err){
    console.error("openEdit error", err);
    alert("E'lonni ochishda xatolik.");
  }
}

/* --- populate modal (SET DISTRICT ONLY INSIDE HELPER CALLBACK) --- */
function populateEditModal(ad){
  // ensure region selects have options
  fillEditRegions();

  // FROM
  editFromRegion.value = ad.fromRegion || "";
  if(typeof window.updateDistricts === "function"){
    window.updateDistricts("from", () => {
      if(editFromDistrict) editFromDistrict.value = ad.fromDistrict || "";
    });
  } else {
    setTimeout(()=> {
      if(typeof window.updateDistricts === "function"){
        window.updateDistricts("from", () => {
          if(editFromDistrict) editFromDistrict.value = ad.fromDistrict || "";
        });
      }
    }, 80);
  }

  // TO
  editToRegion.value = ad.toRegion || "";
  if(typeof window.updateDistricts === "function"){
    window.updateDistricts("to", () => {
      if(editToDistrict) editToDistrict.value = ad.toDistrict || "";
    });
  } else {
    setTimeout(()=> {
      if(typeof window.updateDistricts === "function"){
        window.updateDistricts("to", () => {
          if(editToDistrict) editToDistrict.value = ad.toDistrict || "";
        });
      }
    }, 80);
  }

  // other fields
  editPrice.value = ad.price || "";
  editComment.value = ad.comment || "";
  editSeats.value = ad.driverSeats || ad.passengerCount || "";

  if(ad.departureTime){
    const d = new Date(ad.departureTime);
    const pad = n => String(n).padStart(2,"0");
    editTime.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } else editTime.value = "";
}

/* --- save edit --- */
saveEditBtn.onclick = async ()=>{
  if(!editingAdId) return alert("E'lon tanlanmagan.");

  const data = {
    fromRegion: editFromRegion.value,
    fromDistrict: editFromDistrict.value,
    toRegion: editToRegion.value,
    toDistrict: editToDistrict.value,
    price: editPrice.value,
    comment: editComment.value,
    departureTime: editTime.value ? new Date(editTime.value).getTime() : null
  };

  if(window.userRole === "driver") data.driverSeats = editSeats.value;
  else data.passengerCount = editSeats.value;

  try {
    // update flat first
    const flat = await get(ref(db, `ads/${editingAdId}`));
    if(flat.exists()){
      await update(ref(db, `ads/${editingAdId}`), data);
    } else {
      // ensure we have owner
      if(!editingAdOwner){
        const all = await get(ref(db, "ads"));
        if(all.exists()){
          for(const uid of Object.keys(all.val() || {})){
            const node = all.val()[uid];
            if(node && node[editingAdId]){
              editingAdOwner = uid; break;
            }
          }
        }
      }
      if(editingAdOwner){
        await update(ref(db, `ads/${editingAdOwner}/${editingAdId}`), data);
      } else throw new Error("Ad path topilmadi");
    }

    alert("Yangilandi!");
    editModal.style.display = "none";
    loadMyAds();
  } catch(err){
    console.error("save error", err);
    alert("Yangilashda xatolik yuz berdi.");
  }
};

/* --- delete ad --- */
async function deleteAd(id, owner){
  if(!confirm("Rostan o'chirasizmi?")) return;
  try {
    const flat = await get(ref(db, `ads/${id}`));
    if(flat.exists()){
      await remove(ref(db, `ads/${id}`));
    } else if(owner){
      await remove(ref(db, `ads/${owner}/${id}`));
    } else {
      const all = await get(ref(db, "ads"));
      if(all.exists()){
        for(const uid of Object.keys(all.val() || {})){
          if(all.val()[uid] && all.val()[uid][id]){
            await remove(ref(db, `ads/${uid}/${id}`)); break;
          }
        }
      }
    }
    loadMyAds();
  } catch(err){
    console.error("delete error", err);
    alert("O'chirishda xatolik yuz berdi.");
  }
}

/* --- init --- */
onAuthStateChanged(auth, async user=>{
  if(!user){
    location.href = "/shahartaxi-demo/docs/app/auth/login.html";
    return;
  }
  await loadUserRole(user.uid);
  fillEditRegions();
  loadMyAds();
});
