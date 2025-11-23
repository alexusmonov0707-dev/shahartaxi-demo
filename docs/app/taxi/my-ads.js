// my-ads.js (docs/app/taxi/my-ads.js)
import {
  auth,
  db,
  ref,
  child,
  get,
  update,
  remove,
  onAuthStateChanged,
  $,
  onValue
} from "/shahartaxi-demo/docs/libs/lib.js";

// Qoida: regions massivini globals sifatida assets/regions-taxi.js beradi.
// Agar u `regions` degan globalni bermasa, shu faylni tekshang.

console.log("MY-ADS.JS LOADED");

// --- UTILITY: date formatting (soddaligi uchun)
function formatTime(tsOrStr) {
  if (!tsOrStr) return "-";
  // agar raqam bo'lsa timestamp
  if (typeof tsOrStr === "number") {
    const d = new Date(tsOrStr);
    return d.toLocaleString();
  }
  // agar ISO string bo'lsa
  const d = new Date(tsOrStr);
  if (isNaN(d.getTime())) return String(tsOrStr);
  return d.toLocaleString();
}

// --- CHECK regions global
if (!window.regions || !Array.isArray(window.regions)) {
  console.warn("Warning: global 'regions' not found. region selects will be empty.");
}

// --- AUTH CHECK
onAuthStateChanged(auth, user => {
  if (!user) {
    // sahifangizdagi login routeni moslashtiring
    window.location.href = "/shahartaxi-demo/docs/app/auth/login.html";
    return;
  }
  window.currentUID = user.uid;
  // yuklash
  loadMyAds(user.uid).catch(err => {
    console.error("loadMyAds error", err);
    $("myAdsList").innerHTML = "<p class='error'>Xatolik yuz berdi yuklashda.</p>";
  });
});

// --- LOAD ADS
export async function loadMyAds(uid) {
  const list = $("myAdsList");
  if (!list) {
    console.error("Element #myAdsList topilmadi!");
    return;
  }
  list.innerHTML = `<div class="card">Yuklanmoqda...</div>`;

  // olish
  const snap = await get(ref(db, "ads"));
  list.innerHTML = "";

  if (!snap.exists()) {
    list.innerHTML = "<div class='card'>Hozircha e'lon yo'q.</div>";
    return;
  }

  // For each child
  let count = 0;
  snap.forEach(childSnap => {
    const ad = childSnap.val();
    const key = childSnap.key;

    if (ad.userId !== uid) return; // faqat userning e'lonlari

    count++;

    // seats tekshiruvi
    const seatsText = (ad.driverSeats && ad.driverSeats !== "") ? `Yo'lovchilar: ${ad.driverSeats}` :
                      (ad.passengerCount && ad.passengerCount !== "") ? `Yo'lovchilar: ${ad.passengerCount}` :
                      "Yo'lovchilar: -";

    // route string
    const route = `${ad.fromRegion || "-"}, ${ad.fromDistrict || "-"} → ${ad.toRegion || "-"}, ${ad.toDistrict || "-"}`;

    const box = document.createElement("div");
    box.className = "ad-card";
    box.innerHTML = `
      <div style="flex:1">
        <div style="font-weight:700;color:#0b6cf0">${escapeHtml(ad.type || "E'lon")}</div>
        <div style="margin:6px 0">${escapeHtml(route)}</div>
        <div style="color:#6b7280;">Vaqt: ${escapeHtml(formatTime(ad.departureTime || ad.createdAt))}</div>
        <div style="margin-top:6px">${escapeHtml(seatsText)}</div>
      </div>
      <div style="text-align:right">
        <div style="color:#16a34a;font-weight:700">${escapeHtml(ad.price || "-")}</div>
        <div style="margin-top:8px">
          <button class="btn-primary" onclick='window.openEditAd("${key}", ${JSON.stringify(ad).replace(/</g,"\\u003c")})'>Tahrirlash</button>
          <button class="btn-ghost" onclick='window.deleteAd("${key}")'>O'chirish</button>
        </div>
      </div>
    `;
    list.appendChild(box);
  });

  if (count === 0) {
    list.innerHTML = "<div class='card'>Sizga tegishli e'lon topilmadi.</div>";
  }
}

// simple HTML escape
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// =====================
// DELETE AD
// =====================
window.deleteAd = async function (id) {
  if (!confirm("Rostdan o'chirmoqchimisiz?")) return;
  try {
    await remove(ref(db, "ads/" + id));
    alert("O'chirildi");
    await loadMyAds(window.currentUID);
  } catch (err) {
    console.error(err);
    alert("O'chirishda xatolik");
  }
};

// =====================
// EDIT / MODAL LOGIC
// =====================

// Ensure HTML has inputs with these ids:
// editFromRegion, editFromDistrict, editToRegion, editToDistrict,
// editPrice, editTime, editSeats, editComment, editAdModal

// init region selects
window.initRegionsForm = function () {
  const fromRegion = $("editFromRegion");
  const toRegion = $("editToRegion");
  if (!fromRegion || !toRegion) return;

  fromRegion.innerHTML = '<option value="">Viloyat</option>';
  toRegion.innerHTML = '<option value="">Viloyat</option>';

  if (!window.regions || !Array.isArray(window.regions)) return;
  window.regions.forEach(r => {
    const opt = `<option value="${escapeHtml(r.name)}">${escapeHtml(r.name)}</option>`;
    fromRegion.innerHTML += opt;
    toRegion.innerHTML += opt;
  });
};

window.updateEditDistricts = function (type) {
  const regionSelect = type === "from" ? $("editFromRegion") : $("editToRegion");
  const districtSelect = type === "from" ? $("editFromDistrict") : $("editToDistrict");
  if (!regionSelect || !districtSelect) return;
  const regionName = regionSelect.value;
  districtSelect.innerHTML = '<option value="">Tuman</option>';
  if (!regionName) return;
  const reg = (window.regions || []).find(r => r.name === regionName);
  if (!reg || !Array.isArray(reg.districts)) return;
  reg.districts.forEach(d => {
    districtSelect.innerHTML += `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`;
  });
};

let editingAdId = null;

window.openEditAd = function (id, ad) {
  editingAdId = id;

  initRegionsForm();

  // set values safely (check elements exist)
  if ($("editFromRegion")) $("editFromRegion").value = ad.fromRegion || "";
  if ($("editToRegion")) $("editToRegion").value = ad.toRegion || "";

  // districts update
  if ($("editFromRegion")) updateEditDistricts("from");
  if ($("editToRegion")) updateEditDistricts("to");

  if ($("editFromDistrict")) $("editFromDistrict").value = ad.fromDistrict || "";
  if ($("editToDistrict")) $("editToDistrict").value = ad.toDistrict || "";

  if ($("editPrice")) $("editPrice").value = ad.price || "";
  if ($("editTime")) $("editTime").value = ad.departureTime || "";
  if ($("editComment")) $("editComment").value = ad.comment || "";

  if ($("editSeats")) $("editSeats").value = ad.driverSeats || ad.passengerCount || "";

  // show modal
  const modal = $("editAdModal");
  if (modal) modal.style.display = "flex";
};

window.closeEditAd = function () {
  const modal = $("editAdModal");
  if (modal) modal.style.display = "none";
  editingAdId = null;
};

window.saveAdEdit = async function () {
  if (!editingAdId) return alert("Hech narsa tahrirlanmadi.");
  const updates = {};
  if ($("editFromRegion")) updates.fromRegion = $("editFromRegion").value;
  if ($("editFromDistrict")) updates.fromDistrict = $("editFromDistrict").value;
  if ($("editToRegion")) updates.toRegion = $("editToRegion").value;
  if ($("editToDistrict")) updates.toDistrict = $("editToDistrict").value;
  if ($("editPrice")) updates.price = $("editPrice").value;
  if ($("editTime")) updates.departureTime = $("editTime").value;
  if ($("editComment")) updates.comment = $("editComment").value;

  const seats = $("editSeats") ? $("editSeats").value : "";
  // role detection (if you store userRole somewhere)
  if (window.userRole === "driver") updates.driverSeats = seats;
  else updates.passengerCount = seats;

  try {
    await update(ref(db, "ads/" + editingAdId), updates);
    alert("Saqlab qoʻyildi");
    closeEditAd();
    await loadMyAds(window.currentUID);
  } catch (err) {
    console.error(err);
    alert("Yozishda xatolik");
  }
};
