// ============================
//  MY ADS — USER'S OWN ADS
// ============================

import { 
  auth, 
  db, 
  ref, 
  get, 
  update, 
  set, 
  onAuthStateChanged 
} from "/shahartaxi-demo/docs/libs/lib.js";

const adsList = document.getElementById("adsList");

// -------------------------------
// WAIT FOR USER LOGIN
// -------------------------------
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        adsList.innerHTML = `<div class="loading">Avval tizimga kiring...</div>`;
        return;
    }

    loadMyAds(user.uid);
});

// -------------------------------
// LOAD USER ADS
// -------------------------------
async function loadMyAds(userId) {
    adsList.innerHTML = `<div class="loading">Yuklanmoqda...</div>`;

    try {
        const userAdsRef = ref(db, `ads/${userId}`);
        const snapshot = await get(userAdsRef);

        // No ads
        if (!snapshot.exists()) {
            adsList.innerHTML = `
                <div class="empty">Siz hali e’lon joylamagansiz.</div>
            `;
            return;
        }

        const ads = snapshot.val();
        adsList.innerHTML = ""; // Clear old output

        Object.keys(ads).forEach((adId) => {
            const ad = ads[adId];

            adsList.innerHTML += generateAdHTML(adId, ad);
        });

    } catch (err) {
        console.error(err);
        adsList.innerHTML = `<div class="error">Xatolik yuz berdi!</div>`;
    }
}

// -------------------------------
// GENERATE EACH AD BLOCK
// -------------------------------
function generateAdHTML(id, ad) {
    return `
        <div class="ad-card">

            <div class="ad-main">
                <div class="ad-route">
                    ${ad.fromRegion} → ${ad.toRegion}
                </div>

                <div class="ad-meta">
                    <span>${ad.price} so‘m</span>
                    <span>${ad.seats} ta joy</span>
                    <span>${ad.date}</span>
                </div>

                <div class="ad-comment">${ad.comment ?? ""}</div>
            </div>

            <div class="ad-actions">
                <button class="delete-btn" onclick="deleteAd('${ad.userId}','${id}')">
                    O‘chirish
                </button>
            </div>
        </div>
    `;
}

// -------------------------------
// DELETE AD — RTDB VERSION
// -------------------------------
window.deleteAd = async function(userId, adId) {
    if (!confirm("Rostdan ham o‘chirmoqchimisiz?")) return;

    try {
        // RTDB DELETE = set(ref, null)
        await set(ref(db, `ads/${userId}/${adId}`), null);

        // Remove from global ads list
        await set(ref(db, `allAds/${adId}`), null);

        alert("E’lon o‘chirildi!");
        location.reload();

    } catch (err) {
        console.error(err);
        alert("Xatolik yuz berdi!");
    }
};
