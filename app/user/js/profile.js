// profile.js rewritten to work with new lib.js
import { auth, db, ref, get, set, update, onAuthStateChanged, createRecaptcha, signInWithPhoneNumber } from "./lib.js";

const $ = id => document.getElementById(id);
const imgbbApiKey = "99ab532b24271b982285ecf24a805787";

onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "../../login.html";
    return;
  }
  await loadUserProfile(user.uid);
  if (window.initRegionsForm) initRegionsForm();
});

async function loadUserProfile(uid) {
  const snap = await get(ref(db, `users/${uid}`));

  if (!snap.exists()) {
    await set(ref(db, `users/${uid}`), {
      fullName: "",
      phone: auth.currentUser.phoneNumber || "",
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

  const data = (await get(ref(db, `users/${uid}`))).val();

  $("fullName").textContent = data.fullName || "";
  $("phone").textContent = data.phone || "";

  $("avatar").src = data.avatar || "https://raw.githubusercontent.com/rahmadiana/default-images/main/user-default.png";

  $("userDetails").innerHTML = `
    <b>Tug‘ilgan sana:</b> ${data.birthdate || "-"}<br>
    <b>Jinsi:</b> ${data.gender || "-"}<br>
    <b>Viloyat:</b> ${data.region || "-"}<br>
    <b>Tuman:</b> ${data.district || "-"}
  `;

  if (data.role === "driver") {
    $("carDetailsBox").style.display = "block";
    $("carDetails").innerHTML = `
      <b>Model:</b> ${data.carModel || "-"}<br>
      <b>Raqam:</b> ${data.carNumber || "-"}<br>
      <b>Rangi:</b> ${data.carColor || "-"}<br>
      <b>Joylar:</b> ${data.seatCount || "-"}
    `;
  }

  $("editFullName").value = data.fullName;
  $("editPhoneInput").value = data.phone;
  $("editBirthdate").value = data.birthdate;
  $("editGender").value = data.gender;
  $("editRegion").value = data.region;
  if (window.fillEditDistricts) fillEditDistricts();
  $("editDistrict").value = data.district;

  $("carModel").value = data.carModel;
  $("carNumber").value = data.carNumber;
  $("carColor").value = data.carColor;
  $("seatCount").value = data.seatCount;

  window.userBalance = Number(data.balance || 0);
  $("balanceBox").textContent = `Balans: ${window.userBalance.toLocaleString("uz-UZ")} so‘m`;

  window.userRole = data.role;
}

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

  await update(ref(db, `users/${user.uid}`), updates);

  alert("Profil yangilandi!");
  closeEditProfile();
  loadUserProfile(user.uid);
};

window.openEditProfile = () => $("editModal").style.display = "flex";
window.closeEditProfile = () => $("editModal").style.display = "none";

window.openBalanceModal = () => $("balanceModal").style.display = "flex";
window.closeBalanceModal = () => $("balanceModal").style.display = "none";

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

    const url = result.data.url;

    await update(ref(db, `users/${auth.currentUser.uid}`), { avatar: url });

    $("avatar").src = url;
    alert("Avatar yangilandi!");
  };
  reader.readAsDataURL(file);
});

window.addBalance = async function () {
  const amount = Number($("balanceAmount").value || 0);
  if (amount <= 0) return alert("To‘g‘ri summa kiriting.");

  const newBalance = (window.userBalance || 0) + amount;

  await update(ref(db, `users/${auth.currentUser.uid}`), { balance: newBalance });

  window.userBalance = newBalance;
  $("balanceBox").textContent = `Balans: ${newBalance.toLocaleString("uz-UZ")} so‘m`;

  alert("Balans to‘ldirildi!");
  closeBalanceModal();
};

window.logout = () => auth.signOut && auth.signOut();
