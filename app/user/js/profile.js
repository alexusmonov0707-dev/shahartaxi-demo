// =========================
//   PROFILE PAGE (MODULAR)
// =========================

import {
  auth,
  db,
  ref,
  get,
  onAuthStateChanged
} from "./lib.js";

// HTML elementlari
const avatarEl = document.getElementById("avatar");
const nameEl = document.getElementById("name");
const phoneEl = document.getElementById("phone");
const balanceEl = document.getElementById("balance");

// Yuklanmoqda bo'lishi uchun
function setLoading() {
  nameEl.textContent = "Yuklanmoqda...";
  phoneEl.textContent = "";
  balanceEl.textContent = "0 so‘m";
  avatarEl.src = "https://i.ibb.co/ZGrq1ZV/user.png";
}

// Foydalanuvchi ma'lumotlarini chiqarish
function renderProfile(data) {
  if (!data) {
    nameEl.textContent = "Ma’lumot topilmadi";
    phoneEl.textContent = auth.currentUser.phoneNumber || "";
    balanceEl.textContent = "0 so‘m";
    avatarEl.src = "https://i.ibb.co/ZGrq1ZV/user.png";
    return;
  }

  avatarEl.src = data.avatar || "https://i.ibb.co/ZGrq1ZV/user.png";
  nameEl.textContent = data.name || "Ism yo‘q";
  phoneEl.textContent = auth.currentUser.phoneNumber || "";
  balanceEl.textContent = (data.balance || 0).toLocaleString() + " so‘m";
}

// Firebase auth holatini tekshiramiz
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/shahartaxi-demo/app/user/login.html";
    return;
  }

  setLoading();

  const userRef = ref(db, "users/" + user.uid);
  const snap = await get(userRef);

  if (snap.exists()) {
    renderProfile(snap.val());
  } else {
    renderProfile(null);
  }
});

// Logout tugmasi
document.getElementById("logout")?.addEventListener("click", () => {
  auth.signOut().then(() => {
    window.location.href = "/shahartaxi-demo/app/user/login.html";
  });
});

console.log("PROFILE JS loaded");
