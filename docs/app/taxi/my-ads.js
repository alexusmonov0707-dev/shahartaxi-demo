// /shahartaxi-demo/docs/app/taxi/my-ads.js
// Fully working my-ads script (compatible with your my-ads.html)
// Requires: /shahartaxi-demo/docs/libs/lib.js (exports auth, db, ref, get, update, remove, onAuthStateChanged, $)
// Regions: script /shahartaxi-demo/docs/assets/regions-taxi.js should set `window.regions` (array)

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

console.log("my-ads.js loaded");

// -- Utilities ---------------------------------------------------------------
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeGet(id) {
  return document.getElementById(id);
}

// -- Regions helpers (works if window.regions exists) -----------------------
function ensureRegionsGlobal() {
  // If regions-helper module created other names, try to adapt
  if (window.regions && Array.isArray(window.regions)) return window.regions;
  if (window.regionsList && Array.isArray(window.regionsList)) return window.regionsList;
  if (window.regionsTaxi && Array.isArray(window.regionsTaxi)) return window.regionsTaxi;
  return null;
}

function initRegionsForm() {
  const regs = ensureRegionsGlobal();
  const fromRegion = safeGet("editFromRegion");
  const toRegion = safeGet("editToRegion");
  if (!fromRegion || !toRegion) return;

  fromRegion.innerHTML = `<option value="">Viloyat</option>`;
  toRegion.innerHTML = `<option value="">Viloyat</option>`;

  if (!regs) {
    // nothing to fill
    console.warn("Regions not found on window (expected window.regions / window.regionsList / window.regionsTaxi)");
    return;
  }

  regs.forEach(r => {
    const name = r.name || r.region || r.title || "";
    if (!name) return;
    const opt = `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
    fromRegion.insertAdjacentHTML("beforeend", opt);
    toRegion.insertAdjacentHTML("beforeend", opt);
  });
}

function updateEditDistricts(type) {
  // type: 'from' or 'to'
  const regionSelect = safeGet(type === "from" ? "editFromRegion" : "editToRegion");
  const districtSelect = safeGet(type === "from" ? "editFromDistrict" : "editToDistrict");
  if (!regionSelect || !districtSelect) return;

  const regionName = regionSelect.value;
  districtSelect.innerHTML = `<option value="">Tuman</option>`;

  const regs = ensureRegionsGlobal();
  if (!regs || !regionName) return;

  const region = regs.find(r => {
    const name = r.name || r.region || r.title || "";
    return String(name) === String(regionName);
  });
  if (!region || !Array.isArray(region.districts)) return;

  region.districts.forEach(d => {
    districtSelect.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`);
  });
}

// expose for inline onchange handlers (HTML uses updateEditDistricts('from') etc.)
window.updateEditDistricts = updateEditDistricts;

// -- Auth / state -----------------------------------------------------------
let currentUID = null;
let editingAdId = null;
let currentUserRole = ""; // filled on login

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // adjust path to your login as needed
    window.location.href = "/shahartaxi-demo/docs/app/auth/login.html";
    return;
  }
  currentUID = user.uid;

  // Load user role from DB (so save logic knows driver/passenger)
  try {
    const snap = await get(ref(db, "users/" + user.uid));
    const u = snap && snap.exists() ? snap.val() : null;
    currentUserRole = (u && (u.role || u.userRole)) ? String(u.role || u.userRole) : "";
    // normalize to lowercase for checks
    currentUserRole = currentUserRole.toLowerCase();
  } catch (e) {
    console.warn("Failed to load user role:", e);
    currentUserRole = "";
  }

  // Fill regions for modal selects
  initRegionsForm();

  // Load user's ads
  await loadMyAds(currentUID);
});

// -- Load user's ads --------------------------------------------------------
async function loadMyAds(uid) {
  const listEl = safeGet("myAdsList");
  if (!listEl) return;
  listEl.innerHTML = "Yuklanmoqda...";

  try {
    const snap = await get(ref(db, "ads"));
    listEl.innerHTML = "";
    if (!snap || !snap.exists()) {
      listEl.innerHTML = "<p>Hozircha e’lon yo‘q.</p>";
      return;
    }

    let found = false;
    snap.forEach(child => {
      const ad = child.val();
      const key = child.key;
      if (!ad || ad.userId !== uid) return;

      found = true;
      const title = ad.type || "E'lon";
      const route = `${ad.fromRegion || "-"}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ${ad.toRegion || "-"}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;
      const price = ad.price ? `<div style="font-weight:700;color:#16a34a">${escapeHtml(String(ad.price))} so‘m</div>` : "";
      const time = ad.departureTime || "-";
      const seats = ad.driverSeats ?? ad.passengerCount ?? "-";

      const box = document.createElement("div");
      box.className = "ad-box";
      box.innerHTML = `
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
          <div style="flex:1">
            <div style="font-weight:700;color:#0b5ed7">${escapeHtml(title)}</div>
            <div style="margin-top:6px">${escapeHtml(route)}</div>
            <div style="margin-top:6px">Vaqt: ${escapeHtml(time)}</div>
            <div style="margin-top:6px">Joylar/Yo'lovchilar: ${escapeHtml(String(seats))}</div>
          </div>
          <div style="text-align:right">
            ${price}
          </div>
        </div>
        <div style="margin-top:10px; display:flex; gap:8px;">
          <button class="blue-btn" onclick='window.openEditAd("${key}", ${JSON.stringify(ad).replace(/</g, "\\u003c")})'>Tahrirlash</button>
          <button class="red-btn" onclick='window.deleteAd("${key}")'>O‘chirish</button>
        </div>
      `;
      listEl.appendChild(box);
    });

    if (!found) listEl.innerHTML = "<p>Hozircha e’lon yo‘q.</p>";

  } catch (err) {
    console.error("loadMyAds error:", err);
    safeGet("myAdsList").innerHTML = "<p>Xatolik yuz berdi.</p>";
  }
}

// -- Delete ad --------------------------------------------------------------
window.deleteAd = async function (id) {
  if (!id) return;
  if (!confirm("Rostdan o‘chirmoqchimisiz?")) return;
  try {
    await remove(ref(db, "ads/" + id));
    alert("O‘chirildi!");
    if (currentUID) await loadMyAds(currentUID);
  } catch (e) {
    console.error("deleteAd error:", e);
    alert("O‘chirishda xatolik yuz berdi.");
  }
};

// -- Open edit modal -------------------------------------------------------
window.openEditAd = function (id, ad) {
  editingAdId = id;

  // ensure regions are filled
  initRegionsForm();

  // set values (safely)
  const setIf = (id, val) => { const el = safeGet(id); if (el) el.value = val ?? ""; };

  setIf("editFromRegion", ad.fromRegion ?? "");
  updateEditDistricts("from");
  setIf("editFromDistrict", ad.fromDistrict ?? "");

  setIf("editToRegion", ad.toRegion ?? "");
  updateEditDistricts("to");
  setIf("editToDistrict", ad.toDistrict ?? "");

  // price
  setIf("editPrice", ad.price ?? "");

  // time -> try to format to datetime-local if possible
  const timeEl = safeGet("editTime");
  if (timeEl) {
    if (ad.departureTime) {
      const dt = new Date(ad.departureTime);
      if (!isNaN(dt.getTime())) {
        const pad = n => String(n).padStart(2, "0");
        const v = `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
        timeEl.value = v;
      } else {
        timeEl.value = ad.departureTime;
      }
    } else timeEl.value = "";
  }

  setIf("editSeats", ad.driverSeats ?? ad.passengerCount ?? "");
  setIf("editComment", ad.comment ?? "");

  // show modal
  const modal = safeGet("editAdModal");
  if (modal) modal.style.display = "flex";
};

// -- Close modal (button binds) --------------------------------------------
safeGet("closeEditBtn")?.addEventListener("click", () => {
  const modal = safeGet("editAdModal"); if (modal) modal.style.display = "none";
});

// -- Save edited ad (button bind) ------------------------------------------
safeGet("saveEditBtn")?.addEventListener("click", async () => {
  if (!editingAdId) { alert("Tahrirlash uchun e'lon tanlanmagan."); return; }

  // collect values
  const fromRegion = safeGet("editFromRegion")?.value || "";
  const fromDistrict = safeGet("editFromDistrict")?.value || "";
  const toRegion = safeGet("editToRegion")?.value || "";
  const toDistrict = safeGet("editToDistrict")?.value || "";
  const price = safeGet("editPrice")?.value || "";
  const departureTime = safeGet("editTime")?.value || "";
  const seats = safeGet("editSeats")?.value || "";
  const comment = safeGet("editComment")?.value || "";

  const updates = {
    fromRegion,
    fromDistrict,
    toRegion,
    toDistrict,
    price,
    departureTime,
    comment
  };

  // keep both seat fields to remain compatible; but preserve role logic if available
  // if currentUserRole contains "driver" use driverSeats, else use passengerCount
  if (seats !== "") {
    if (currentUserRole && currentUserRole.includes("haydov") || currentUserRole.includes("driver")) {
      updates.driverSeats = seats;
    } else {
      updates.passengerCount = seats;
    }
  } else {
    updates.driverSeats = "";
    updates.passengerCount = "";
  }

  try {
    await update(ref(db, "ads/" + editingAdId), updates);
    alert("Saqlandi!");
    const modal = safeGet("editAdModal"); if (modal) modal.style.display = "none";
    if (currentUID) await loadMyAds(currentUID);
  } catch (err) {
    console.error("saveEdit error:", err);
    alert("Saqlashda xatolik yuz berdi.");
  }
});

// -- Click outside modal to close ------------------------------------------
document.addEventListener("click", (e) => {
  const modal = safeGet("editAdModal");
  if (!modal || modal.style.display !== "flex") return;
  const box = modal.querySelector(".modal-content");
  if (!box) return;
  if (e.target === modal) modal.style.display = "none";
});
