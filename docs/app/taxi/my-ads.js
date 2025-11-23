// /shahartaxi-demo/docs/app/taxi/my-ads.js
console.log("MY-ADS.JS LOADED:", import.meta.url);

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

/*
 This file:
 - yuklaydi va foydalanuvchiga tegishli "ads" yozuvlarini chiqaradi
 - edit modal ochadi / saqlaydi
 - o'chirishni bajaradi
 - viloyat/tuman dropdownlarini local helper bilan to'ldiradi (regions global array dan foydalanadi)
*/

// --- helpers for regions (safe: if global 'regions' exists it will use it)
function ensureRegionsPresent() {
  if (typeof regions === "undefined" || !Array.isArray(regions)) {
    // fallback: empty array so code won't crash; ideally regions-taxi.js present
    console.warn("Warning: global 'regions' not found. region selects will be empty.");
    window._localRegions = [];
    return window._localRegions;
  }
  window._localRegions = regions;
  return window._localRegions;
}

function initRegionsFormForEdit() {
  const regs = ensureRegionsPresent();
  const fromRegion = $("editFromRegion");
  const toRegion = $("editToRegion");

  fromRegion.innerHTML = `<option value="">Viloyat</option>`;
  toRegion.innerHTML = `<option value="">Viloyat</option>`;

  regs.forEach(r => {
    fromRegion.innerHTML += `<option value="${escapeHtml(r.name)}">${escapeHtml(r.name)}</option>`;
    toRegion.innerHTML += `<option value="${escapeHtml(r.name)}">${escapeHtml(r.name)}</option>`;
  });
}

function updateEditDistricts(type) {
  const regionSelect = type === "from" ? $("editFromRegion") : $("editToRegion");
  const districtSelect = type === "from" ? $("editFromDistrict") : $("editToDistrict");
  const name = regionSelect.value;

  districtSelect.innerHTML = `<option value="">Tuman</option>`;
  if (!name) return;

  const r = window._localRegions.find(rr => rr.name === name);
  if (!r || !Array.isArray(r.districts)) return;

  r.districts.forEach(dis => {
    districtSelect.innerHTML += `<option value="${escapeHtml(dis)}">${escapeHtml(dis)}</option>`;
  });
}

// small escape to avoid injecting HTML when filling selects via innerHTML
function escapeHtml(s) {
  if (s === null || s === undefined) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Global state
let currentUID = null;
let editingAdId = null;

// Hook change listeners on region selects (we will attach after we init selects)
function attachRegionSelectListeners() {
  const f = $("editFromRegion");
  const t = $("editToRegion");
  if (f) f.addEventListener("change", () => updateEditDistricts("from"));
  if (t) t.addEventListener("change", () => updateEditDistricts("to"));
}

// AUTH STATE
onAuthStateChanged(auth, user => {
  if (!user) {
    // not logged in -> redirect to login (docs path)
    window.location.href = "/shahartaxi-demo/docs/app/auth/login.html";
    return;
  }
  currentUID = user.uid;
  // init region selects for modal
  initRegionsFormForEdit();
  attachRegionSelectListeners();
  // load ads
  loadMyAds(currentUID);
});

// LOAD ADS FOR CURRENT USER
async function loadMyAds(uid) {
  const list = $("myAdsList");
  if (!list) return;

  list.innerHTML = "Yuklanmoqda...";

  try {
    const snap = await get(ref(db, "ads"));
    list.innerHTML = "";

    if (!snap.exists()) {
      list.innerHTML = "<p>Hozircha e'lon yo'q.</p>";
      return;
    }

    let found = false;
    snap.forEach(child => {
      const ad = child.val();
      if (ad.userId !== uid) return; // skip others
      found = true;

      const seatsText = ad.driverSeats ? `Bo'sh joy: ${ad.driverSeats}` : `Yo'lovchilar: ${ad.passengerCount ?? "-"}`;

      const box = document.createElement("div");
      box.className = "ad-box";
      box.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="font-weight:700;color:#0069d9">${escapeHtml(ad.type || "")}</div>
          <div style="font-weight:700;color:#28a745">${escapeHtml(ad.price||"-")}</div>
        </div>
        <div style="margin-top:8px">${escapeHtml(ad.fromRegion||"")}, ${escapeHtml(ad.fromDistrict||"")} → ${escapeHtml(ad.toRegion||"")}, ${escapeHtml(ad.toDistrict||"")}</div>
        <div style="margin-top:6px;color:#6b7280">Vaqt: ${escapeHtml(ad.departureTime||"-")}</div>
        <div style="margin-top:6px">${seatsText}</div>
        <div style="margin-top:10px;display:flex;gap:8px;">
          <button class="blue-btn" data-edit-key="${child.key}">Tahrirlash</button>
          <button class="red-btn" data-del-key="${child.key}">O'chirish</button>
        </div>
      `;
      list.appendChild(box);

      // attach handlers
      box.querySelector("[data-edit-key]").addEventListener("click", () => {
        openEditAd(child.key, ad);
      });
      box.querySelector("[data-del-key]").addEventListener("click", () => {
        deleteAd(child.key);
      });
    });

    if (!found) {
      list.innerHTML = "<p>Hozircha senga tegishli e'lon yo'q.</p>";
    }
  } catch (err) {
    console.error("loadMyAds error:", err);
    list.innerHTML = "<p>Xatolik yuz berdi. Konsolni tekshir.</p>";
  }
}

// OPEN EDIT MODAL
function openEditAd(id, ad) {
  editingAdId = id;

  // populate regions/districts
  initRegionsFormForEdit();

  // set values
  $("editFromRegion").value = ad.fromRegion || "";
  updateEditDistricts("from");
  $("editFromDistrict").value = ad.fromDistrict || "";

  $("editToRegion").value = ad.toRegion || "";
  updateEditDistricts("to");
  $("editToDistrict").value = ad.toDistrict || "";

  $("editPrice").value = ad.price || "";
  // convert datetime if needed - assume stored as ISO or string compatible with input
  $("editTime").value = ad.departureTime || "";

  // seats
  $("editSeats").value = ad.driverSeats ?? ad.passengerCount ?? "";
  $("editComment").value = ad.comment || "";

  // show modal
  $("editAdModal").style.display = "flex";
}

// CLOSE EDIT
function closeEditAd() {
  $("editAdModal").style.display = "none";
  editingAdId = null;
}

// SAVE EDIT
async function saveAdEdit() {
  if (!editingAdId) return alert("Tahrir qila olmaymiz — ID topilmadi.");
  const updates = {
    fromRegion: $("editFromRegion").value,
    fromDistrict: $("editFromDistrict").value,
    toRegion: $("editToRegion").value,
    toDistrict: $("editToDistrict").value,
    price: $("editPrice").value,
    departureTime: $("editTime").value,
    comment: $("editComment").value
  };

  const seats = $("editSeats").value;
  // preserve existing role-based fields: we will overwrite the one that exists
  // For simplicity, set both fields appropriately:
  // if driverSeats present in db => keep driverSeats, else use passengerCount
  try {
    // fetch current ad to check existing keys (safer)
    const adSnap = await get(ref(db, "ads/" + editingAdId));
    const adVal = adSnap.exists() ? adSnap.val() : null;
    if (adVal && Object.prototype.hasOwnProperty.call(adVal, "driverSeats")) {
      updates.driverSeats = seats;
    } else {
      updates.passengerCount = seats;
    }

    await update(ref(db, "ads/" + editingAdId), updates);
    alert("Saqlandi");
    closeEditAd();
    // refresh
    loadMyAds(currentUID);
  } catch (err) {
    console.error("saveAdEdit error:", err);
    alert("Saqlashda xatolik. Konsolni tekshir.");
  }
}

// DELETE
async function deleteAd(id) {
  if (!confirm("Rostdan o'chirishni xohlaysizmi?")) return;
  try {
    await remove(ref(db, "ads/" + id));
    alert("O'chirildi");
    loadMyAds(currentUID);
  } catch (err) {
    console.error("deleteAd error:", err);
    alert("O'chirishda xato. Konsolga qarang.");
  }
}

// attach modal buttons
document.addEventListener("DOMContentLoaded", () => {
  const saveBtn = $("saveEditBtn");
  const closeBtn = $("closeEditBtn");
  if (saveBtn) saveBtn.addEventListener("click", saveAdEdit);
  if (closeBtn) closeBtn.addEventListener("click", closeEditAd);
  // allow clicking outside modal box to close
  const modal = $("editAdModal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeEditAd();
    });
  }
});
