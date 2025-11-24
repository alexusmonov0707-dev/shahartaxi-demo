// my-ads.js (YANGILANGAN — regions-helper va turli ads strukturalar bilan mos)
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

// Helper $ fallback (ba'zi muhitlarda $ yozilmagan bo'lishi mumkin)
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
let editingAdOwner = null; // ad'ning egasi (uid) — update/delete uchun kerak
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
   regions-helper.js ichidagi funksiyalar ishlatiladi:
     window.fillRegions(selectId)
     window.updateDistricts(type)
   (regions-helper.js va regions-taxi.js sahifada yuklangan bo‘lishi kerak)
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
  window.fillRegions("editFromRegion");
  window.fillRegions("editToRegion");
}

// update dropdowns for modal (called after setting region value)
window.updateEditDistricts = function(type){
  if(!ensureRegionsReady()) return;
  // regions-helper.updateDistricts expects type "from" or "to"
  window.updateDistricts(type);
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
   LOAD ADS — ikki struktura uchun moslashuv:
   - /ads/<uid>/<adId>
   - /ads/<adId> (har bir ad ichida userId maydoni)
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

    // Ko'rib chiqamiz: ads ichida ikki shakl bo'lishi mumkin.
    // 1) ads/<userId>/<adId>  -> snap.forEach(childUser => childUser.key === uid)
    // 2) ads/<adId> with ad.userId property
    let foundAny = false;

    // First pass: check nested by user (ads/<uid>/<adId>)
    snap.forEach(userNode => {
      // agar userNode ichida yana bolalar bo'lsa va key userId bo'lsa
      if(userNode.key === user.uid){
        userNode.forEach(adNode => {
          const ad = adNode.val();
          const adId = adNode.key;
          renderAdItem(ad, adId, user.uid);
          foundAny = true;
        });
      }
    });

    // Second pass: flat ads (ads/<adId>)
    snap.forEach(adNode => {
      // skip nodes that are userId nodes we already handled (they have nested children that look like objects)
      const val = adNode.val();
      const maybeIsNestedUser = val && typeof val === "object" && Object.keys(val).some(k => (val[k] && typeof val[k] === "object" && val[k].createdAt));
      // if maybe nested user data, skip (we already processed)
      if(maybeIsNestedUser) return;

      const ad = val;
      const adId = adNode.key;
      // determine owner id: try ad.userId, ad.owner, ad.createdBy, or null
      const owner = (ad && (ad.userId || ad.owner || ad.createdBy)) || null;
      if(owner === user.uid){
        renderAdItem(ad, adId, owner);
        foundAny = true;
      }
    });

    if(!foundAny){
      myAdsList.innerHTML = "<p>Hozircha e'lon yo'q.</p>";
    }

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
   Qo'llab-quvvatlanadi:
     - ads/<uid>/<adId>
     - ads/<adId>
   ====================== */
async function openEdit(id, ownerProvided = null){
  editingAdId = id;
  editingAdOwner = ownerProvided || null;

  // 1) agar ownerProvided berilgan bo'lsa, birinchi urinish sifatida shu pathni tekshiramiz
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

    // 2) try flat path ads/<id>
    snap = await get(ref(db, `ads/${id}`));
    if(snap.exists()){
      const ad = snap.val();
      populateEditModal(ad);
      // determine owner if present in ad
      editingAdOwner = ad.userId || ad.owner || ad.createdBy || null;
      editModal.style.display = "flex";
      return;
    }

    // 3) fallback: search entire /ads tree for matching adId (in nested user nodes)
    const allSnap = await get(ref(db, "ads"));
    if(allSnap.exists()){
      let found = false;
      allSnap.forEach(userNode => {
        if(found) return;
        userNode.forEach(adNode => {
          if(adNode.key === id){
            const ad = adNode.val();
            populateEditModal(ad);
            editingAdOwner = userNode.key; // this user node is owner uid
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

/* Populate modal fields and regions */
function populateEditModal(ad){
  // prepare regions dropdowns
  fillEditRegions();

  // set fields
  editFromRegion.value = ad.fromRegion || "";
  window.updateEditDistricts("from");
  editFromDistrict.value = ad.fromDistrict || "";

  editToRegion.value = ad.toRegion || "";
  window.updateEditDistricts("to");
  editToDistrict.value = ad.toDistrict || "";

  editPrice.value = ad.price || "";
  editSeats.value = ad.driverSeats || ad.passengerCount || "";
  editComment.value = ad.comment || "";

  if(ad.departureTime){
    const d = new Date(ad.departureTime);
    const pad= n=> String(n).padStart(2,"0");
    editTime.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } else {
    editTime.value = "";
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

  // load user role (so that edit modal treats seats correctly)
  await loadUserRole(user.uid);

  // prepare regions (fill selects)
  fillEditRegions();

  // load ads
  loadMyAds();
});
