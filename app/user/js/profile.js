// =============================
//   SHAHARTAXI — PROFILE PAGE
// =============================

// lib.js dan faqat mavjud narsalarni import qilamiz
import {
  auth,
  db,
  ref,
  get,
  set,
  update,
  onAuthStateChanged
} from "./lib.js";

// ---- Mini query selector ($) ----
const $ = id => document.getElementById(id);

// ---- ImgBB API KEY ----
const imgbbApiKey = "99ab532b24271b982285ecf24a805787";


// =============================
//    AUTH STATE LISTENER
// =============================
onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "../../login.html";
    return;
  }

  await loadUserProfile(user.uid);
});


// =============================
//    LOAD USER DATA
// =============================
async function loadUserProfile(uid) {
  const snap = await get(ref(db, "users/" + uid));

  // user database bo'lmasa — yaratamiz
  if (!snap.exists()) {
    await set(ref(db, "users/" + uid), {
      fullName: "",
      phone: auth.currentUser.phoneNumber,
      avatar: "",
      role: "passenger",
      balance: 0
    });
  }

  const data = (await get(ref(db, "users/" + uid))).val();

  // Avatar
  $("avatar").src =
    data.avatar ||
    "https://raw.githubusercontent.com/rahmadiana/default-images/main/user-default.png";

  // Name
  $("fullName").textContent = data.fullName || "Ism ko‘rsatilmagan";

  // Balance
  window.userBalance = Number(data.balance || 0);
  $("balanceBox").textContent =
    "Balans: " + window.userBalance.toLocaleString("uz-UZ") + " so‘m";

  // Edit modal inputlar
  $("editFullName").value = data.fullName || "";
}


// =============================
//    SAVE PROFILE EDIT
// =============================
window.saveProfileEdit = async function () {
  const user = auth.currentUser;
  if (!user) return;

  await update(ref(db, "users/" + user.uid), {
    fullName: $("editFullName").value
  });

  closeEditProfile();
  loadUserProfile(user.uid);
  alert("Profil yangilandi!");
};


// =============================
//    AVATAR UPLOAD
// =============================
window.chooseAvatar = () => $("avatarInput").click();

$("avatarInput").addEventListener("change", async function () {
  const file = this.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async e => {
    const base64 = e.target.result.split(",")[1];

    const fd = new FormData();
    fd.append("key", imgbbApiKey);
    fd.append("image", base64);

    const res = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: fd
    });

    const r = await res.json();
    if (!r.success) return alert("Rasm yuklanmadi!");

    await update(ref(db, "users/" + auth.currentUser.uid), {
      avatar: r.data.url
    });

    $("avatar").src = r.data.url;
    alert("Avatar yangilandi!");
  };

  reader.readAsDataURL(file);
});


// =============================
//     BALANCE ADD
// =============================
window.addBalance = async function () {
  const amount = Number($("balanceAmount").value || 0);
  if (amount <= 0) return alert("To‘g‘ri summa kiriting");

  const newBalance = window.userBalance + amount;

  await update(ref(db, "users/" + auth.currentUser.uid), {
    balance: newBalance
  });

  window.userBalance = newBalance;
  $("balanceBox").textContent =
    "Balans: " + newBalance.toLocaleString("uz-UZ") + " so‘m";

  closeBalanceModal();
  alert("Balans yangilandi!");
};


// =============================
//       MODALS
// =============================
window.openEditProfile = () => $("editModal").style.display = "flex";
window.closeEditProfile = () => $("editModal").style.display = "none";

window.openBalanceModal = () => $("balanceModal").style.display = "flex";
window.closeBalanceModal = () => $("balanceModal").style.display = "none";


// =============================
//         LOGOUT
// =============================
window.logout = function () {
  auth.signOut().then(() => {
    window.location.href = "../../login.html";
  });
};
