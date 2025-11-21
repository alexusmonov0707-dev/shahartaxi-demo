console.log("PROFILE JS loaded");

import {
  auth,
  db,
  ref,
  get,
  onAuthStateChanged,
} from "../js/lib.js";   // <-- yo‘li to‘g‘ri bo‘lsa bas (app/user/js/lib.js)

// === DOM ELEMENTS ===
const avatarEl = document.getElementById("avatar");
const nameEl = document.getElementById("name");
const phoneEl = document.getElementById("phone");
const balanceEl = document.getElementById("balance");
const editBtn = document.getElementById("edit-profile");
const logoutBtn = document.getElementById("logout-btn");
const myAdsBtn = document.getElementById("my-ads-btn");

// === AUTH LISTENER (ENG MUHIM QISMI) ===
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    console.warn("User not logged in");
    window.location.href = "./login.html";
    return;
  }

  console.log("User found:", user.uid);

  const userRef = ref(db, "users/" + user.uid);
  const snap = await get(userRef);

  if (!snap.exists()) {
    console.warn("User data not found in DB");
    nameEl.textContent = "Ma'lumot topilmadi";
    phoneEl.textContent = user.phoneNumber || "";
    balanceEl.textContent = "0 so‘m";
    return;
  }

  const data = snap.val();
  console.log("DB DATA:", data);

  // === PROFILNI TO‘LDIRISH ===
  avatarEl.src = data.avatar || "https://i.ibb.co/SdM0V1L/avatar.png";
  nameEl.textContent = data.fullname || "Ism kiritilmagan";
  phoneEl.textContent = data.phone || user.phoneNumber || "";
  balanceEl.textContent = (data.balance || 0).toLocaleString() + " so‘m";
});

// === Buttons ===
if (editBtn) {
  editBtn.onclick = () => {
    window.location.href = "./edit-profile.html";
  };
}

if (logoutBtn) {
  logoutBtn.onclick = () => {
    auth.signOut();
  };
}

if (myAdsBtn) {
  myAdsBtn.onclick = () => {
    window.location.href = "./my-ads.html";
  };
}
