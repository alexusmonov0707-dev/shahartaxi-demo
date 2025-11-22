// ===============================
// MY ADS — lib.js ga MOSLASHTIRILGAN
// ===============================

import {
  auth,
  db,
  ref,
  get,
  onAuthStateChanged,
} from "./lib.js";

// Mini helper
const $ = id => document.getElementById(id);

// ===============================
// AUTH CHECK
// ===============================
onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "../../login.html";
    return;
  }

  loadMyAds(user.uid);
});


// ===============================
// LOAD ADS
// ===============================
async function loadMyAds(uid) {
  const box = $("adsBox");
  box.innerHTML = "Yuklanmoqda...";

  const snapshot = await get(ref(db, "ads"));

  if (!snapshot.exists()) {
    box.innerHTML = "E’lonlar yo‘q.";
    return;
  }

  let html = "";
  const data = snapshot.val();

  Object.keys(data).forEach(adId => {
    const ad = data[adId];

    if (ad.uid === uid) {
      html += `
        <div class="ad-card">
          <div><b>Qayerdan:</b> ${ad.from}</div>
          <div><b>Qayerga:</b> ${ad.to}</div>
          <div><b>Sana:</b> ${ad.date}</div>
          <div><b>Narx:</b> ${ad.price} so‘m</div>

          <button class="delete-btn" onclick="deleteAd('${adId}')">
            O‘chirish
          </button>
        </div>
      `;
    }
  });

  box.innerHTML = html || "E’lonlar topilmadi.";
}


// ===============================
// DELETE AD
// ===============================
window.deleteAd = async function (id) {
  if (!confirm("Rostdan o‘chirilsinmi?")) return;

  await set(ref(db, "ads/" + id), null);

  alert("E’lon o‘chirildi!");
  loadMyAds(auth.currentUser.uid);
};
