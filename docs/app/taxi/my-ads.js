// /docs/app/taxi/my-ads.js
console.log("MY-ADS.JS LOADED");

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
 Expected HTML ids (my-ads.html):
  - myAdsList
  - editAdModal
  - editFromRegion, editFromDistrict, editToRegion, editToDistrict
  - editPrice, editTime, editSeats, editComment
  - saveEditBtn, closeEditBtn
*/

// Utility: safe $
function getEl(id) { return document.getElementById(id); }

// Regions helper: fill selects if global `regions` exists
function fillRegionSelects() {
  // check global
  if (!window.regions || !Array.isArray(window.regions)) {
    console.warn("Warning: global 'regions' not found. region selects will be empty.");
    // still set default option
    ["editFromRegion", "editToRegion"].forEach(id => {
      const el = getEl(id);
      if (!el) return;
      el.innerHTML = '<option value="">Viloyat</option>';
    });
    return;
  }

  const from = getEl("editFromRegion");
  const to = getEl("editToRegion");
  if (!from || !to) return;

  from.innerHTML = '<option value="">Viloyat</option>';
  to.innerHTML = '<option value="">Viloyat</option>';

  window.regions.forEach(r => {
    const o = `<option value="${r.name}">${r.name}</option>`;
    from.insertAdjacentHTML("beforeend", o);
    to.insertAdjacentHTML("beforeend", o);
  });
}

// update districts when a region selected
function updateDistrictsFor(type) {
  // type: "from" or "to"
  const regionSelect = getEl(type === "from" ? "editFromRegion" : "editToRegion");
  const districtSelect = getEl(type === "from" ? "editFromDistrict" : "editToDistrict");
  if (!regionSelect || !districtSelect) return;

  const name = regionSelect.value;
  districtSelect.innerHTML = '<option value="">Tuman</option>';
  if (!name || !window.regions) return;

  const region = window.regions.find(r => r.name === name);
  if (!region || !Array.isArray(region.districts)) return;

  region.districts.forEach(d => {
    districtSelect.insertAdjacentHTML("beforeend", `<option value="${d}">${d}</option>`);
  });
}

// Exported to window so on-change in HTML works
window.updateEditDistricts = updateDistrictsFor;

// GLOBAL state
let currentUID = null;
let editingAdId = null;

// auth check + load ads
onAuthStateChanged(auth, user => {
  if (!user) {
    // redirect to login page under docs
    window.location.href = "/shahartaxi-demo/docs/app/auth/login.html";
    return;
  }
  currentUID = user.uid;
  // prepare region selects
  fillRegionSelects();
  // load user's ads
  loadMyAds(currentUID);
});

// Load ads and render
async function loadMyAds(uid) {
  const snapshot = await get(ref(db, "ads"));
  const list = getEl("myAdsList");
  list.innerHTML = ""; // clear

  if (!snapshot || !snapshot.exists()) {
    list.innerHTML = "<p>Hozircha e’lon yo‘q.</p>";
    return;
  }

  snapshot.forEach(childSnap => {
    const ad = childSnap.val();
    const key = childSnap.key;

    // Only user's ads
    if (!ad || ad.userId !== uid) return;

    const title = ad.type || "E'lon";
    const route = `${ad.fromRegion || "-"}, ${ad.fromDistrict || "-"} → ${ad.toRegion || "-"}, ${ad.toDistrict || "-"}`;
    const price = ad.price ? `<span style="color:#16a34a;font-weight:700">${ad.price}</span>` : "-";
    const time = ad.departureTime || "-";
    const seats = ad.driverSeats ?? ad.passengerCount ?? "-";

    const box = document.createElement("div");
    box.className = "ad-box";
    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <b style="color:#0b5ed7">${escapeHtml(title)}</b><br>
          <div style="margin-top:6px">${escapeHtml(route)}</div>
          <div style="margin-top:6px">Vaqt: ${escapeHtml(time)}</div>
          <div>Yo'lovchilar: ${escapeHtml(String(seats))}</div>
        </div>
        <div style="text-align:right;">
          ${price}
        </div>
      </div>
      <div style="margin-top:10px; display:flex; gap:8px;">
        <button class="blue-btn" onclick='window.openEditAd("${key}", ${JSON.stringify(ad).replace(/</g,"\\u003c")})'>Tahrirlash</button>
        <button class="red-btn" onclick='window.deleteAd("${key}")'>O\'chirish</button>
      </div>
    `;
    list.appendChild(box);
  });
}

// simple escaper to avoid injecting tags into innerHTML from data
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// delete ad
window.deleteAd = async function (id) {
  if (!confirm("Rostdan o‘chirmoqchimisiz?")) return;
  await remove(ref(db, "ads/" + id));
  alert("O‘chirildi!");
  loadMyAds(currentUID);
};

// open edit modal
window.openEditAd = function (id, ad) {
  editingAdId = id;

  // refill regions (in case not filled)
  fillRegionSelects();

  // set selects and inputs
  const fromR = getEl("editFromRegion"), fromD = getEl("editFromDistrict");
  const toR = getEl("editToRegion"), toD = getEl("editToDistrict");
  const price = getEl("editPrice"), time = getEl("editTime"), seats = getEl("editSeats"), comment = getEl("editComment");

  if (fromR) { fromR.value = ad.fromRegion || ""; updateDistrictsFor("from"); if (fromD) fromD.value = ad.fromDistrict || ""; }
  if (toR) { toR.value = ad.toRegion || ""; updateDistrictsFor("to"); if (toD) toD.value = ad.toDistrict || ""; }

  if (price) price.value = ad.price || "";
  if (time) {
    // try to normalize to datetime-local value (YYYY-MM-DDTHH:MM)
    if (ad.departureTime) {
      // if stored as ISO string or date string, try Date parsing
      const d = new Date(ad.departureTime);
      if (!isNaN(d)) {
        // format to YYYY-MM-DDTHH:MM
        const pad = n => String(n).padStart(2, "0");
        const v = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        time.value = v;
      } else {
        time.value = ad.departureTime;
      }
    } else time.value = "";
  }
  if (seats) seats.value = ad.driverSeats ?? ad.passengerCount ?? "";
  if (comment) comment.value = ad.comment || "";

  // show modal
  const modal = getEl("editAdModal");
  if (modal) modal.style.display = "flex";
};

// close modal
getEl("closeEditBtn")?.addEventListener("click", () => {
  const modal = getEl("editAdModal"); if (modal) modal.style.display = "none";
});

// save edit
getEl("saveEditBtn")?.addEventListener("click", async () => {
  if (!editingAdId) return alert("Hech narsa tahrirlanmayapti.");

  const updates = {};
  const fromR = getEl("editFromRegion")?.value || "";
  const fromD = getEl("editFromDistrict")?.value || "";
  const toR = getEl("editToRegion")?.value || "";
  const toD = getEl("editToDistrict")?.value || "";
  const price = getEl("editPrice")?.value || "";
  const time = getEl("editTime")?.value || "";
  const seats = getEl("editSeats")?.value || "";
  const comment = getEl("editComment")?.value || "";

  updates.fromRegion = fromR;
  updates.fromDistrict = fromD;
  updates.toRegion = toR;
  updates.toDistrict = toD;
  updates.price = price;
  updates.departureTime = time;
  updates.comment = comment;

  // preserve whether driver or passenger seat style based on previously stored ad? We'll write passengerCount if not driver
  // Simple approach: update both fields based on content — this keeps compatibility.
  if (seats !== "") {
    updates.driverSeats = seats;
    updates.passengerCount = seats;
  } else {
    updates.driverSeats = "";
    updates.passengerCount = "";
  }

  await update(ref(db, "ads/" + editingAdId), updates);

  alert("Tahrirlandi!");
  getEl("editAdModal").style.display = "none";
  loadMyAds(currentUID);
});

