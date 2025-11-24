// my-ads.js (FINAL for your project)
// - uses window.fillRegions and window.updateDistricts (helper)
// - supports nested (ads/<uid>/<adId>) and flat (ads/<adId>) structures
// - sets district values only inside helper callback to avoid stale mismatches

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
const $el = (typeof $ === "function") ? $ : _$;

// DOM refs
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

function formatDatetime(ms){
  if(!ms) return "-";
  const d = new Date(ms);
  if(isNaN(d)) return "-";
  return d.toLocaleString("uz-UZ", {
    year:"numeric", month:"long", day:"numeric",
    hour:"2-digit", minute:"2-digit"
  });
}

// load user role
async function loadUserRole(uid){
  try {
    const snap = await get(ref(db, "users/" + uid));
    if (snap.exists()) {
      window.userRole = snap.val().role || "passenger";
    }
  } catch(e){
    window.userRole = "passenger";
    console.warn("loadUserRole error:", e);
  }
}

// Fill edit region selects (uses helper fillRegions which retries if regions not ready)
function fillEditRegions(){
  if (typeof window.fillRegions === "function") {
    window.fillRegions("editFromRegion");
    window.fillRegions("editToRegion");
  } else {
    // fallback: try after small delay
    setTimeout(() => {
      if (typeof window.fillRegions === "function") {
        window.fillRegions("editFromRegion");
        window.fillRegions("editToRegion");
      }
    }, 50);
  }
}

// load ads with robust nested/flat handling
async function loadMyAds(){
  const user = auth.currentUser;
  if(!user) return;

  myAdsList.innerHTML = "Yuklanmoqda...";

  try {
    const snap = await get(ref(db, "ads"));
    myAdsList.innerHTML = "";

    if (!snap.exists()) {
      myAdsList.innerHTML = "<p>Hozircha e'lon yo'q.</p>";
      return;
    }

    const list = [];

    snap.forEach(node => {
      const nodeVal = node.val();

      // detect nested: node has children that look like ads (has createdAt or price)
      let nested = false;
      node.forEach(child => {
        const cv = child.val();
        if (cv && (cv.createdAt || cv.price || cv.fromRegion)) nested = true;
      });

      if (nested) {
        // if nested under current user
        if (node.key === user.uid) {
          node.forEach(adNode => {
            list.push({ ad: adNode.val(), id: adNode.key, owner: node.key });
          });
        }
      } else {
        // flat
        if (nodeVal && nodeVal.userId === user.uid) {
          list.push({ ad: nodeVal, id: node.key, owner: nodeVal.userId });
        }
      }
    });

    if (list.length === 0) {
      myAdsList.innerHTML = "<p>Hozircha e'lon yo'q.</p>";
      return;
    }

    list.forEach(x => renderAd(x.ad, x.id, x.owner));

  } catch (err) {
    console.error("loadMyAds error:", err);
    myAdsList.innerHTML = "<p>Xatolik yuz berdi.</p>";
  }
}

function renderAd(ad, id, owner) {
  const seats = ad.driverSeats || ad.passengerCount || "";
  const item = document.createElement("div");
  item.className = "ad-box";
  item.innerHTML = `
    <div style="font-weight:700;color:#0069d9">${ad.type || ""}</div>
    <div>${ad.fromRegion || ""}, ${ad.fromDistrict || ""} → ${ad.toRegion || ""}, ${ad.toDistrict || ""}</div>
    <div class="ad-meta">Narx: <b>${ad.price || "-"}</b></div>
    <div class="ad-meta">Vaqt: ${formatDatetime(ad.departureTime)}</div>
    <div class="ad-meta">Joy: ${seats}</div>
    <div class="ad-actions">
      <button class="btn btn-primary edit-btn" data-id="${id}" data-owner="${owner || ""}">Tahrirlash</button>
      <button class="btn btn-danger delete-btn" data-id="${id}" data-owner="${owner || ""}">O'chirish</button>
    </div>
  `;
  myAdsList.appendChild(item);
}

// click handlers
myAdsList.addEventListener("click", e => {
  if (e.target.classList.contains("edit-btn")) {
    openEdit(e.target.dataset.id, e.target.dataset.owner);
  }
  if (e.target.classList.contains("delete-btn")) {
    deleteAd(e.target.dataset.id, e.target.dataset.owner);
  }
});

closeEditBtn.onclick = () => editModal.style.display = "none";

// open edit modal
async function openEdit(id, owner) {
  editingAdId = id;
  editingAdOwner = owner || null;

  try {
    // try nested path first if owner provided
    let snap = null;
    if (owner) {
      snap = await get(ref(db, `ads/${owner}/${id}`));
    }
    if (!snap || !snap.exists()) {
      // try flat
      snap = await get(ref(db, `ads/${id}`));
    }
    if (!snap || !snap.exists()) {
      // fallback search nested nodes
      const all = await get(ref(db, "ads"));
      if (all.exists()) {
        let found = null;
        all.forEach(userNode => {
          if (found) return;
          userNode.forEach(adNode => {
            if (adNode.key === id) {
              found = { ad: adNode.val(), owner: userNode.key };
            }
          });
        });
        if (found) {
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

  } catch (err) {
    console.error("openEdit error:", err);
    alert("E'lonni ochishda xatolik.");
  }
}

// populate modal (THIS IS THE FIX: ONLY set district inside callback)
function populateEditModal(ad) {
  // ensure region selects are filled
  fillEditRegions();

  // FROM
  editFromRegion.value = ad.fromRegion || "";
  // call helper with callback — callback sets district AFTER district options appended
  if (typeof window.updateDistricts === "function") {
    window.updateDistricts("from", () => {
      if (editFromDistrict) editFromDistrict.value = ad.fromDistrict || "";
    });
  } else {
    // fallback: small delay
    setTimeout(() => {
      if (typeof window.updateDistricts === "function") {
        window.updateDistricts("from", () => {
          if (editFromDistrict) editFromDistrict.value = ad.fromDistrict || "";
        });
      }
    }, 60);
  }

  // TO
  editToRegion.value = ad.toRegion || "";
  if (typeof window.updateDistricts === "function") {
    window.updateDistricts("to", () => {
      if (editToDistrict) editToDistrict.value = ad.toDistrict || "";
    });
  } else {
    setTimeout(() => {
      if (typeof window.updateDistricts === "function") {
        window.updateDistricts("to", () => {
          if (editToDistrict) editToDistrict.value = ad.toDistrict || "";
        });
      }
    }, 60);
  }

  // other fields
  editPrice.value = ad.price || "";
  editComment.value = ad.comment || "";
  editSeats.value = ad.driverSeats || ad.passengerCount || "";

  if (ad.departureTime) {
    const d = new Date(ad.departureTime);
    const pad = n => String(n).padStart(2, "0");
    editTime.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } else {
    editTime.value = "";
  }
}

// save edit
saveEditBtn.onclick = async () => {
  if (!editingAdId) return alert("Tahrirlash uchun e'lon tanlanmagan.");

  const data = {
    fromRegion: editFromRegion.value,
    fromDistrict: editFromDistrict.value,
    toRegion: editToRegion.value,
    toDistrict: editToDistrict.value,
    price: editPrice.value,
    comment: editComment.value,
    departureTime: editTime.value ? new Date(editTime.value).getTime() : null
  };

  if (window.userRole === "driver") data.driverSeats = editSeats.value;
  else data.passengerCount = editSeats.value;

  try {
    // attempt flat update first
    const flatSnap = await get(ref(db, `ads/${editingAdId}`));
    if (flatSnap.exists()) {
      await update(ref(db, `ads/${editingAdId}`), data);
    } else {
      // nested update path
      if (!editingAdOwner) {
        // try to find owner
        const all = await get(ref(db, "ads"));
        if (all.exists()) {
          for (const uid of Object.keys(all.val() || {})) {
            const node = all.val()[uid];
            if (node && node[editingAdId]) {
              editingAdOwner = uid;
              break;
            }
          }
        }
      }
      if (editingAdOwner) {
        await update(ref(db, `ads/${editingAdOwner}/${editingAdId}`), data);
      } else {
        throw new Error("Ad path topilmadi");
      }
    }

    alert("E'lon yangilandi!");
    editModal.style.display = "none";
    loadMyAds();
  } catch (err) {
    console.error("saveEdit error:", err);
    alert("Yangilashda xatolik yuz berdi.");
  }
};

// delete ad
async function deleteAd(id, owner) {
  if (!confirm("Rostdan o'chirish?")) return;
  try {
    const flatSnap = await get(ref(db, `ads/${id}`));
    if (flatSnap.exists()) {
      await remove(ref(db, `ads/${id}`));
    } else if (owner) {
      await remove(ref(db, `ads/${owner}/${id}`));
    } else {
      // search
      const all = await get(ref(db, "ads"));
      if (all.exists()) {
        for (const uid of Object.keys(all.val() || {})) {
          if (all.val()[uid] && all.val()[uid][id]) {
            await remove(ref(db, `ads/${uid}/${id}`));
            break;
          }
        }
      }
    }
    loadMyAds();
  } catch (err) {
    console.error("deleteAd error:", err);
    alert("O'chirishda xatolik yuz berdi.");
  }
}

// init
onAuthStateChanged(auth, async user => {
  if (!user) {
    location.href = "/shahartaxi-demo/docs/app/auth/login.html";
    return;
  }
  await loadUserRole(user.uid);
  // ensure edit selects are filled
  fillEditRegions();
  // load ads
  loadMyAds();
});
