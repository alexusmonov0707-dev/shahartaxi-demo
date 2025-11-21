// ==========================
//   IMPORTS
// ==========================
import {
  auth,
  db,
  ref,
  get,
  set,
  update,
  onAuthStateChanged
} from "./lib.js";


// ==========================
//  ELEMENTS
// ==========================
const fullNameEl = document.getElementById("fullName");
const phoneEl = document.getElementById("phone");
const avatarEl = document.getElementById("avatar");
const userDetailsEl = document.getElementById("userDetails");
const balanceBox = document.getElementById("balanceBox");

const editModal = document.getElementById("editModal");
const editFullName = document.getElementById("editFullName");
const editPhoneInput = document.getElementById("editPhoneInput");
const editBirthdate = document.getElementById("editBirthdate");
const editGender = document.getElementById("editGender");
const editRegion = document.getElementById("editRegion");
const editDistrict = document.getElementById("editDistrict");

const carModel = document.getElementById("carModel");
const carNumber = document.getElementById("carNumber");
const carColor = document.getElementById("carColor");
const seatCount = document.getElementById("seatCount");

const balanceModal = document.getElementById("balanceModal");
const balanceAmount = document.getElementById("balanceAmount");


// ==========================
//   LOAD USER
// ==========================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const phone = user.phoneNumber;
  phoneEl.textContent = phone;

  const snap = await get(ref(db, "users/" + phone));
  if (!snap.exists()) {
    fullNameEl.textContent = "Ma’lumot topilmadi";
    return;
  }

  const data = snap.val();

  fullNameEl.textContent = data.fullName || "Foydalanuvchi";
  avatarEl.src = data.avatar || avatarEl.src;
  balanceBox.textContent = `Balans: ${data.balance || 0} so‘m`;

  // Qo‘shimcha ma’lumot
  userDetailsEl.innerHTML = `
      ${data.birthdate ? `Tug‘ilgan sana: ${data.birthdate}<br>` : ""}
      ${data.gender ? `Jinsi: ${data.gender}<br>` : ""}
      ${data.region ? `Viloyat: ${data.region}<br>` : ""}
      ${data.district ? `Tuman: ${data.district}<br>` : ""}
  `;
});


// ==========================
//   EDIT PROFILE
// ==========================
window.openEditProfile = async () => {
  editModal.style.display = "flex";

  const user = auth.currentUser;
  const phone = user.phoneNumber;

  const snap = await get(ref(db, "users/" + phone));
  const data = snap.val();

  editFullName.value = data.fullName || "";
  editPhoneInput.value = phone;
  editBirthdate.value = data.birthdate || "";
  editGender.value = data.gender || "";
  editRegion.value = data.region || "";
  editDistrict.value = data.district || "";

  carModel.value = data.carModel || "";
  carNumber.value = data.carNumber || "";
  carColor.value = data.carColor || "";
  seatCount.value = data.seatCount || "";
};

window.closeEditProfile = () => {
  editModal.style.display = "none";
};

window.saveProfileEdit = async () => {
  const user = auth.currentUser;
  const phone = user.phoneNumber;

  await update(ref(db, "users/" + phone), {
    fullName: editFullName.value,
    birthdate: editBirthdate.value,
    gender: editGender.value,
    region: editRegion.value,
    district: editDistrict.value,

    carModel: carModel.value,
    carNumber: carNumber.value,
    carColor: carColor.value,
    seatCount: seatCount.value
  });

  alert("Saqlash muvaffaqiyatli!");
  closeEditProfile();
  location.reload();
};


// ==========================
//   BALANCE
// ==========================
window.openBalanceModal = () => {
  balanceModal.style.display = "flex";
};

window.closeBalanceModal = () => {
  balanceModal.style.display = "none";
};

window.addBalance = async () => {
  const amount = Number(balanceAmount.value);
  if (amount <= 0) return alert("Noto‘g‘ri summa!");

  const phone = auth.currentUser.phoneNumber;
  const snap = await get(ref(db, "users/" + phone));
  const balance = snap.val().balance || 0;

  await update(ref(db, "users/" + phone), {
    balance: balance + amount
  });

  alert("Balans to‘ldirildi!");
  closeBalanceModal();
  location.reload();
};


// ==========================
//   AVATAR TANLASH
// ==========================
window.chooseAvatar = () => {
  document.getElementById("avatarInput").click();
};


// ==========================
//   LOGOUT
// ==========================
window.logout = async () => {
  await auth.signOut();
  window.location.href = "login.html";
};
