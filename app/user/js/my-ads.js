// app/user/js/my-ads.js

import {
  auth,
  db,
  ref,
  get,
  update,
  remove,
  onAuthStateChanged
} from "./lib.js";

// =========================
// LOGIN CHECK
// =========================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../../login.html";
    return;
  }

  loadMyAds(user.uid);
});


// =========================
// LOAD USER ADS
// =========================
async function loadMyAds(uid) {
  const box = document.getElementById("adsBox");
  box.innerHTML = `<div class="loading">Yuklanmoqda...</div>`;

  const snap = await get(ref(db, "ads"));
  if (!snap.exists()) {
    box.innerHTML = `<div class="empty">E’lonlar topilmadi.</div>`;
    return;
  }

  const ads = snap.val();
  const list = Object.entries(ads).filter(([id, ad]) => ad.uid === uid);

  if (list.length === 0) {
    box.innerHTML = `<div class="empty">Sizda hali e’lonlar yo‘q.</div>`;
    return;
  }

  box.innerHTML = "";

  list.forEach(([id, ad]) => {
    const div = document.createElement("div");
    div.className = "ad-card";
    div.innerHTML = `
      <div class="ad-header">
        <b>${ad.fromRegion}, ${ad.fromDistrict}</b> →
        <b>${ad.toRegion}, ${ad.toDistrict}</b>
      </div>

      <div class="ad-body">
        <div><b>Sana:</b> ${ad.date}</div>
        <div><b>Vaqt:</b> ${ad.time}</div>
        <div><b>Narx:</b> ${ad.price} so‘m</div>
        <div><b>Izoh:</b> ${ad.comment || "-"}</div>
      </div>

      <div class="ad-footer">
        <button class="edit-btn" onclick="editAd('${id}')">✏️ Tahrirlash</button>
        <button class="delete-btn" onclick="deleteAd('${id}')">🗑 O‘chirish</button>
      </div>
    `;

    box.appendChild(div);
  });
}


// =========================
// DELETE AD
// =========================
window.deleteAd = async function (id) {
  if (!confirm("Rostdan ham o‘chirasizmi?")) return;

  await remove(ref(db, "ads/" + id));
  alert("E’lon o‘chirildi!");
  loadMyAds(auth.currentUser.uid);
};


// =========================
// EDIT AD (open modal with data)
// =========================
window.editAd = async function (id) {
  const snap = await get(ref(db, "ads/" + id));
  if (!snap.exists()) return alert("E’lon topilmadi");

  const ad = snap.val();

  window.editingAdId = id;

  document.getElementById("editDate").value = ad.date;
  document.getElementById("editTime").value = ad.time;
  document.getElementById("editPrice").value = ad.price;
  document.getElementById("editComment").value = ad.comment || "";

  document.getElementById("editModal").style.display = "flex";
};


// =========================
// SAVE EDITED AD
// =========================
window.saveAdEdit = async function () {
  const id = window.editingAdId;
  if (!id) return;

  const updates = {
    date: document.getElementById("editDate").value,
    time: document.getElementById("editTime").value,
    price: document.getElementById("editPrice").value,
    comment: document.getElementById("editComment").value
  };

  await update(ref(db, "ads/" + id), updates);

  alert("E’lon tahrirlandi!");
  closeEditModal();
  loadMyAds(auth.currentUser.uid);
};


// =========================
// CLOSE MODAL
// =========================
window.closeEditModal = function () {
  document.getElementById("editModal").style.display = "none";
};
