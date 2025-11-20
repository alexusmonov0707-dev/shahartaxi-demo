// app/user/js/profile.js

import {
  auth,
  db,
  ref,
  get,
  set,
  update,
  signOut,
  onAuthStateChanged,
  $
} from "./lib.js";

// ImgBB API
const imgbbApiKey = "99ab532b24271b982285ecf24a805787";

// ===============================
// LOGIN STATE
// ===============================
onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "../../login.html";
    return;
  }

  await loadUserProfile(user.uid);
  initRegionsForm(); // fill region selects
});

// ===============================
// LOAD USER PROFILE
// ===============================
async function loadUserProfile(uid) {
  const snap = await get(ref(db, "users/" + uid));

  if (!snap.exists()) {
    await set(ref(db, "users/" + uid), {
      fullName: "",
      phone: "",
      avatar: "",
      role: "passenger",
      carModel: "",
      carNumber: "",
      carColor: "",
      seatCount: "",
      birthdate: "",
      gender: "",
      region: "",
      district: "",
      balance: 0
    });
  }

  const s = await get(ref(db, "users/" + uid));
  const u = s.val();

  // Basic
  $("fullName").textContent = u.fullName || "";
  $("phone").textContent = u.phone || "";

  $("avatar").src =
    u.avatar || "https://raw.githubusercontent.com/rahmadiana/default-images/main/user-default.png";

  // Extended info
  $("userDetails").innerHTML = `
    <b>Tug‘ilgan sana:</b> ${u.birthdate || "-"}<br>
    <b>Jinsi:</b> ${u.gender || "-"}<br>
    <b>Viloyat:</b> ${u.region || "-"}<br>
    <b>Tuman:</b> ${u.district || "-"}
  `;

  // Car
  if (u.role === "driver") {
    $("carDetailsBox").style.display = "block";
    $("carDetails").innerHTML = `
      <b>Model:</b> ${u.carModel || "-"}<br>
      <b>Raqam:</b> ${u.carNumber || "-"}<br>
      <b>Rangi:</b> ${u.carColor || "-"}<br>
      <b>Joylar:</b> ${u.seatCount || "-"}
    `;
  }

  // Prefill edit fields
  $("editFullName").value = u.fullName || "";
  $("editPhoneInput").value = u.phone || "";
  $("editBirthdate").value = u.birthdate || "";
  $("editGender").value = u.gender || "";

  $("editRegion").value = u.region || "";
  fillEditDistricts();
  $("editDistrict").value = u.district || "";

  $("carModel").value = u.carModel || "";
  $("carNumber").value = u.carNumber || "";
  $("carColor").value = u.carColor || "";
  $("seatCount").value = u.seatCount || "";

  // Balance
  window.userBalance = Number(u.balance || 0);
  $("balanceBox").textContent =
    "Balans: " + window.userBalance.toLocaleString("uz-UZ") + " so‘m";

  window.userRole = u.role || "passenger";
}

// ===============================
// EDIT PROFILE SAVE
// ===============================
window.saveProfileEdit = async function () {
  const user = auth.currentUser;
  if (!user) return;

  const updates = {
    fullName: $("editFullName").value,
    birthdate: $("editBirthdate").value,
    gender: $("editGender").value,
    region: $("editRegion").value,
    district: $("editDistrict").value,
    carModel: $("carModel").value,
    carNumber: $("carNumber").value,
    carColor: $("carColor").value,
    seatCount: $("seatCount").value
  };

  await update(ref(db, "users/" + user.uid), updates);

  alert("Profil yangilandi!");
  closeEditProfile();
  loadUserProfile(user.uid);
};

// ===============================
// MODALS
// ===============================
window.openEditProfile = () => $("editModal").style.display = "flex";
window.closeEditProfile = () => $("editModal").style.display = "none";

window.openBalanceModal = () => $("balanceModal").style.display = "flex";
window.closeBalanceModal = () => $("balanceModal").style.display = "none";

// ===============================
// AVATAR UPLOAD
// ===============================
window.chooseAvatar = () => $("avatarInput").click();

$("avatarInput").addEventListener("change", async function () {
  const file = this.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async e => {
    const base64 = e.target.result.split(",")[1];

    const form = new FormData();
    form.append("key", imgbbApiKey);
    form.append("image", base64);

    const res = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: form
    });
    const result = await res.json();

    if (!result.success) return alert("Rasm yuklanmadi!");

    await update(ref(db, "users/" + auth.currentUser.uid), {
      avatar: result.data.url
    });

    $("avatar").src = result.data.url;
    alert("Avatar yangilandi!");
  };
  reader.readAsDataURL(file);
});

// ===============================
// BALANCE
// ===============================
window.addBalance = async function () {
  const amount = Number($("balanceAmount").value || 0);
  if (amount <= 0) return alert("To‘g‘ri summa kiriting.");

  const newBalance = window.userBalance + amount;

  await update(ref(db, "users/" + auth.currentUser.uid), {
    balance: newBalance
  });

  window.userBalance = newBalance;
  $("balanceBox").textContent =
    "Balans: " + newBalance.toLocaleString("uz-UZ") + " so‘m";

  alert("Balans to‘ldirildi!");
  closeBalanceModal();
};

// ===============================
// LOGOUT
// ===============================
window.logout = () => signOut(auth);
