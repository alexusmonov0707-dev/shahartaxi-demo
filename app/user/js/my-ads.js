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

// mini querySelector
const $ = id => document.getElementById(id);


// ===========================
// AUTH CHECK
// ===========================
onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "../../login.html";
    return;
  }

  loadMyAds(user.uid);
});


// ===========================
// LOAD MY ADS
// ===========================
async function loadMyAds(uid) {
  const adsBox = $("adsBox");
  adsBox.innerHTML = "<div class='loading'>Yuklanmoqda...</div>";

  const snap = await get(ref(db, "ads"));

  if (!snap.exists()) {
    adsBox.innerHTML = "<p style='padding:20px;'>E’lonlar mavjud emas</p>";
    return;
  }

  const allAds = snap.val();

  // filter only user's ads
  const myAds = Object.entries(allAds).filter(([id, ad]) => ad.owner === uid);

  if (myAds.length === 0) {
    adsBox.innerHTML = "<p style='padding:20px;'>Sizda hali e’lonlar yo‘q.</p>";
    return;
  }

  adsBox.innerHTML = "";

  myAds.forEach(([id, ad]) => {
    const div = document.createElement("div");
    div.className = "ad-item";

    div.innerHTML = `
      <div class="ad-title">${ad.title}</div>
      <div class="ad-info">
        <b>Qayerdan:</b> ${ad.from}<br>
        <b>Qayerga:</b> ${ad.to}<br>
        <b>Sanasi:</b> ${ad.date}<br>
        <b>Telefon:</b> ${ad.phone}
      </div>

      <div class="ad-actions">
        <button class="edit-btn" onclick="editAd('${id}')">Tahrirlash</button>
        <button class="del-btn" onclick="deleteAd('${id}')">O‘chirish</button>
      </div>
    `;

    adsBox.appendChild(div);
  });
}


// ===========================
// DELETE AD
// ===========================
window.deleteAd = async function (id) {
  if (!confirm("Rostdan ham o‘chirmoqchimisiz?")) return;

  await remove(ref(db, "ads/" + id));
  alert("E’lon o‘chirildi!");

  loadMyAds(auth.currentUser.uid);
};


// ===========================
// EDIT AD (just open page)
// ===========================
window.editAd = function (id) {
  window.location.href = "edit-ad.html?id=" + id;
};
