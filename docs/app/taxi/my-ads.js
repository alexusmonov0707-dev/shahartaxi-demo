// my-ads.js (PATCHED — regions-helper callback + robust load)
// IMPORTS — libs faylingizdan
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

// Helper $ fallback
function _$(id){ return document.getElementById(id) }
const $el = typeof $ === "function" ? $ : _$;

// DOM
const myAdsList = $el("myAdsList");

// EDIT MODAL elementi
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
let editingAdOwner = null; // ad'ning egasi (uid)
window.userRole = window.userRole || "passenger"; // fallback

function formatDatetime(dt){
  if(!dt) return "-";
  const d = new Date(dt);
  if(isNaN(d)) return dt;
  return d.toLocaleString("uz-UZ", {
    year:"numeric", month:"long", day:"numeric",
    hour:"2-digit", minute:"2-digit"
  });
}

/* ======================
   REGIONS — helper bilan mos
   ====================== */
function ensureRegionsReady(){
  if(typeof window.fillRegions !== "function" || typeof window.updateDistricts !== "function"){
    console.warn("Regions helper functions mavjud emas — fillRegions/updateDistricts topilmadi.");
    return false;
  }
  return true;
}

function fillEditRegions(){
  if(!ensureRegionsReady()) return;
  // fill both selects (helper will retry if regions not loaded yet)
  window.fillRegions("editFromRegion");
  window.fillRegions("editToRegion");
}

// update dropdowns for modal (called after setting region value)
// now supports a callback that will be called AFTER districts are loaded
window.updateEditDistricts = function(type, callback){
  if(!ensureRegionsReady()){
    // if helper not ready but callback provided, call it after a tick
    if(typeof callback === "function") setTimeout(callback, 50);
    return;
  }

  // propagate callback to helper if helper supports it
  try {
    // some earlier helpers accepted (type, cb)
    if(typeof window.updateDistricts === "function"){
      // call helper with callback if it accepts it (helper we use supports callback)
      window.updateDistricts(type, callback);
      return;
    }
  } catch(e){
    console.warn("updateDistricts call failed:", e);
  }

  // fallback: call updateDistricts without callback, then run callback after small delay
  window.updateDistricts(type);
  if(typeof callback === "function") setTimeout(callback, 40);
};

/* ======================
   USER ROLE — users/<uid>.role dan o'qish
   ====================== */
async function loadUserRole(uid){
  try{
    const snap = await get(ref(db, "users/" + uid));
    if(snap.exists()){
      const data = snap.val();
      const role = data.role || data.userRole || data.type || "passenger";
      window.userRole = role;
    } else {
      window.userRole = "passenger";
    }
  } catch(err){
    console.warn("User role olishda xatolik:", err);
    window.userRole = "passenger";
  }
}

/* ======================
   LOAD ADS — robust handling for nested and flat structures
   - /ads/<uid>/<adId>
   - /ads/<adId> with ad.userId
   ====================== */
async function loadMyAds(){
  const user = auth.currentUser;
  if(!user) return;

  myAdsList.innerHTML = "Yuklanmoqda...";

  try{
    const snap = await get(ref(db, "ads"));
    myAdsList.innerHTML = "";

    if(!snap.exists()){
      myAdsList.innerHTML = "<p>Hozircha e'lon yo'q.</p>";
      return;
    }

    const adsToRender = [];

    // iterate top-level nodes
    snap.forEach(node => {
      const val = node.val();

      // if node looks like nested user node (its children are ads)
      let looksLikeNested = false;
      // detect by checking if any child node has createdAt or price etc.
      node.forEach(child => {
        const cval = child.val();
        if(cval && typeof cval === "object" && (cval.createdAt || cval.price || cval.fromRegion)) {
          looksLikeNested = true;
        }
      });

      if(looksLikeNested){
        // if this nested node belongs to current user, include its children
        if(node.key === user.uid){
          node.forEach(adNode => {
            adsToRender.push({ ad: adNode.val(), id: adNode.key, owner: node.key });
          });
        }
      } else {
        // treat as flat ad node
        if(val && typeof val === "object"){
          const owner = val.userId || val.owner || val.createdBy || null;
          if(owner === user.uid){
            adsToRender.push({ ad: val, id: node.key, owner });
          }
        }
      }
    });

    if(adsToRender.length === 0){
      myAdsList.innerHTML = "<p>Hozircha e'lon yo'q.</p>";
      return;
    }

    // render
    adsToRender.forEach(a => {
      renderAdItem(a.ad, a.id, a.owner);
    });

  } catch(err){
    console.error("E'lonlarni yuklashda xato:", err);
    myAdsList.innerHTML = "<p>Xatolik yuz berdi.</p>";
  }
}

/* render ad DOM element */
function renderAdItem(ad, adId, ownerUid){
  const seats = ad.driverSeats || ad.passengerCount || "";
  const div = document.createElement("div");
  div.className = "ad-box";
  div.innerHTML = `
      <div style="font-weight:700; color:#0069d9">${ad.type || ""}</div>

      <div>${ad.fromRegion || ""}, ${ad.fromDistrict || ""} → ${ad.toRegion || ""}, ${ad.toDistrict || ""}</div>

      <div class="ad-meta">Narx: <b>${ad.price || ""}</b></div>
      <div class="ad-meta">Vaqt: ${formatDatetime(ad.departureTime)}</div>
      <div class="ad-meta">Joy: ${seats}</div>

      <div class="ad-actions">
        <button class="btn btn-primary edit-btn" data-id="${adId}" data-owner="${ownerUid || ""}">Tahrirlash</button>
        <button class="btn btn-danger delete-btn" data-id="${adId}" data-owner="${ownerUid || ""}">O'chirish</button>
      </div>
    `;
  myAdsList.appendChild(div);
}

/* ======================
   CLICK HANDLERS (edit / delete)
   ====================== */
myAdsList.addEventListener("click", e=>{
  if(e.target.classList.contains("edit-btn")){
    openEdit(e.target.dataset.id, e.target.dataset.owner);
  }
  if(e.target.classList.contains("delete-btn")){
    deleteAd(e.target.dataset.id, e.target.dataset.owner);
  }
});

/* ======================
   openEdit — ad ma'lumotlarini modalga yuklash
   ====================== */
async function openEdit(id, ownerProvided = null){
  editingAdId = id;
  editingAdOwner = ownerProvided || null;

  try{
    let snap = null;

    if(ownerProvided){
      // try ads/<owner>/<id>
      snap = await get(ref(db, `ads/${ownerProvided}/${id}`));
      if(snap.exists()){
        const ad = snap.val();
        populateEditModal(ad);
        editingAdOwner = ownerProvided;
        editModal.style.display = "flex";
        return;
      }
    }

    // try flat path ads/<id>
    snap = await get(ref(db, `ads/${id}`));
    if(snap.exists()){
      const ad = snap.val();
      populateEditModal(ad);
      editingAdOwner = ad.userId || ad.owner || ad.createdBy || null;
      editModal.style.display = "flex";
      return;
    }

    // fallback: search entire /ads tree for matching adId (nested)
    const allSnap = await get(ref(db, "ads"));
    if(allSnap.exists()){
      let found = false;
      allSnap.forEach(userNode => {
        if(found) return;
        userNode.forEach(adNode => {
          if(adNode.key === id){
            const ad = adNode.val();
            populateEditModal(ad);
            editingAdOwner = userNode.key;
            found = true;
          }
        });
      });
      if(found){
        editModal.style.display = "flex";
        return;
      }
    }

    alert("E'lon topilmadi.");
  } catch(err){
    console.error("openEdit xatosi:", err);
    alert("E'lonni ochishda xatolik yuz berdi.");
  }
}

/* Populate modal fields and regions (FIXED: set district only after helper finished) */
function populateEditModal(ad) {

    // REGION LIST
    fillEditRegions();

    // FROM
    editFromRegion.value = ad.fromRegion || "";
    window.updateDistricts("from", () => {
        editFromDistrict.value = ad.fromDistrict || "";
    });

    // TO
    editToRegion.value = ad.toRegion || "";
    window.updateDistricts("to", () => {
        editToDistrict.value = ad.toDistrict || "";
    });

    // Sof fieldlar
    editPrice.value = ad.price || "";
    editComment.value = ad.comment || "";

    editSeats.value = ad.driverSeats || ad.passengerCount || "";

    if (ad.departureTime) {
        const d = new Date(ad.departureTime);
        const pad = n => String(n).padStart(2, "0");
        editTime.value =
            `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } else {
        editTime.value = "";
    }
}


  // Show/hide seats logic based on userRole (driver/passenger)
  if(window.userRole === "driver"){
    editSeats.placeholder = "Mashinadagi bo'sh joylar soni";
  } else {
    editSeats.placeholder = "O'zingiz uchun yo'lovchi soni";
  }
}

/* close modal */
closeEditBtn.onclick = () => editModal.style.display = "none";

/* saveEdit — update DB (determines correct path) */
saveEditBtn.onclick = async ()=>{
  if(!editingAdId) return alert("Tahrirlash uchun ad tanlanmagan.");

  const u = {
    fromRegion: editFromRegion.value,
    fromDistrict: editFromDistrict.value,
    toRegion: editToRegion.value,
    toDistrict: editToDistrict.value,
    price: editPrice.value,
    comment: editComment.value,
    departureTime: editTime.value ? new Date(editTime.value).getTime() : null
  };

  if(window.userRole === "driver") u.driverSeats = editSeats.value;
  else u.passengerCount = editSeats.value;

  try{
    // determine update path: try owner-based path first (if known), else try flat path
    if(editingAdOwner){
      await update(ref(db, `ads/${editingAdOwner}/${editingAdId}`), u);
    } else {
      // try flat
      const flatSnap = await get(ref(db, `ads/${editingAdId}`));
      if(flatSnap.exists()){
        await update(ref(db, `ads/${editingAdId}`), u);
      } else {
        // fallback: search nested
        const allSnap = await get(ref(db, "ads"));
        let updated = false;
        if(allSnap.exists()){
          for(const userNodeKey of Object.keys(allSnap.val() || {})){
            const node = allSnap.val()[userNodeKey];
            if(node && node[editingAdId]){
              await update(ref(db, `ads/${userNodeKey}/${editingAdId}`), u);
              updated = true;
              break;
            }
          }
        }
        if(!updated){
          throw new Error("Ad path topilmadi (yangilash imkoni yo'q).");
        }
      }
    }

    alert("Yangilandi!");
    editModal.style.display = "none";
    loadMyAds();
  } catch(err){
    console.error("Saqlash xatosi:", err);
    alert("Yangilashda xatolik yuz berdi.");
  }
}

/* deleteAd — remove from DB (determines correct path) */
async function deleteAd(id, ownerProvided = null){
  if(!confirm("Rostdan o'chirilsinmi?")) return;

  try{
    if(ownerProvided){
      await remove(ref(db, `ads/${ownerProvided}/${id}`));
      loadMyAds();
      return;
    }

    // try flat
    const flatSnap = await get(ref(db, `ads/${id}`));
    if(flatSnap.exists()){
      await remove(ref(db, `ads/${id}`));
      loadMyAds();
      return;
    }

    // fallback search nested
    const allSnap = await get(ref(db, "ads"));
    if(allSnap.exists()){
      for(const userNodeKey of Object.keys(allSnap.val() || {})){
        const node = allSnap.val()[userNodeKey];
        if(node && node[id]){
          await remove(ref(db, `ads/${userNodeKey}/${id}`));
          loadMyAds();
          return;
        }
      }
    }

    alert("E'lon topilmadi yoki olib tashlash imkoni yo'q.");
  } catch(err){
    console.error("Delete xatosi:", err);
    alert("O'chirishda xatolik yuz berdi.");
  }
}

/* ======================
   AUTH STATE — yuklashlar
   ====================== */
onAuthStateChanged(auth, async user=>{
  if(!user){
    window.location.href = "/shahartaxi-demo/docs/app/auth/login.html";
    return;
  }

  // load user role
  await loadUserRole(user.uid);

  // prepare regions (fill selects)
  fillEditRegions();

  // load ads
  loadMyAds();
});
