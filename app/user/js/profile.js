// app/user/js/profile.js
import { auth, db, $, ref, get, update, onAuthStateChanged, signOut, formatDatetime } from "./lib.js";

// DOM refs
const avatar = $("avatar");
const avatarInput = $("avatarInput");
const fullName = $("fullName");
const phone = $("phone");
const userDetails = $("userDetails");
const balanceBox = $("balanceBox");

const editModal = $("editModal");
const editFullName = $("editFullName");
const editPhoneInput = $("editPhoneInput");
const editBirthdate = $("editBirthdate");
const editGender = $("editGender");
const editRegion = $("editRegion");
const editDistrict = $("editDistrict");
const carModel = $("carModel");
const carNumber = $("carNumber");
const carColor = $("carColor");
const seatCount = $("seatCount");
const editProfileBtn = $("editProfileBtn");
const saveProfileBtn = $("saveProfileBtn");
const closeEditBtn = $("closeEditBtn");

const balanceModal = $("balanceModal");
const balanceAmount = $("balanceAmount");
const confirmBalanceBtn = $("confirmBalanceBtn");
const closeBalanceBtn = $("closeBalanceBtn");

let currentUid = null;
window.userRole = window.userRole || "passenger";
window.userBalance = window.userBalance || 0;

// Auth state
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../login.html";
    return;
  }
  currentUid = user.uid;
  await loadRegionsToProfile();
  await loadUserProfile(user.uid);
});

// load regions into editRegion select
async function loadRegionsToProfile() {
  if (!window.regionsData || !editRegion) return;
  editRegion.innerHTML = '<option value="">Viloyat</option>';
  Object.keys(window.regionsData).forEach(r => editRegion.innerHTML += `<option value="${r}">${r}</option>`);
}

// fill districts helper
window.fillEditDistricts = function() {
  if (!editRegion || !editDistrict || !window.regionsData) return;
  editDistrict.innerHTML = '<option value="">Tuman</option>';
  const arr = window.regionsData[editRegion.value] || [];
  arr.forEach(t => editDistrict.innerHTML += `<option value="${t}">${t}</option>`);
};

async function loadUserProfile(uid) {
  const snap = await get(ref(db, "users/" + uid));
  const u = snap.exists() ? snap.val() : {};
  fullName.textContent = u.fullName || "";
  phone.textContent = u.phone || "";
  avatar.src = u.avatar || "https://raw.githubusercontent.com/rahmadiana/default-images/main/user-default.png";
  userDetails.innerHTML = `<b>Tug‘ilgan sana:</b> ${u.birthdate || "-"}<br>
    <b>Jinsi:</b> ${u.gender || "-"}<br>
    <b>Viloyat:</b> ${u.region || "-"}<br>
    <b>Tuman:</b> ${u.district || "-"}`;
  if (u.role === "driver") {
    // show car details (profile.html has car area but it's ok)
  }
  // prefill edit
  if (editFullName) editFullName.value = u.fullName || "";
  if (editPhoneInput) editPhoneInput.value = u.phone || "";
  if (editBirthdate) editBirthdate.value = u.birthdate || "";
  if (editGender) editGender.value = u.gender || "";
  if (editRegion) editRegion.value = u.region || "";
  if (editDistrict && window.regionsData && window.regionsData[editRegion.value]) {
    editDistrict.innerHTML = '<option value="">Tuman</option>';
    window.regionsData[editRegion.value].forEach(t => editDistrict.innerHTML += `<option value="${t}">${t}</option>`);
  }
  if (carModel) carModel.value = u.carModel || "";
  if (carNumber) carNumber.value = u.carNumber || "";
  if (carColor) carColor.value = u.carColor || "";
  if (seatCount) seatCount.value = u.seatCount || "";
  window.userRole = u.role || "passenger";
  window.userBalance = Number(u.balance || 0);
  if (balanceBox) balanceBox.textContent = "Balans: " + window.userBalance + " so‘m";
}

// avatar upload (uses imgbb API)
const imgbbApiKey = "99ab532b24271b982285ecf24a805787";
avatar.onclick = () => avatarInput.click();
avatarInput && avatarInput.addEventListener("change", async function() {
  const file = this.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64 = e.target.result.split(",")[1];
    const form = new FormData();
    form.append("key", imgbbApiKey);
    form.append("image", base64);
    const res = await fetch("https://api.imgbb.com/1/upload", { method: "POST", body: form });
    const result = await res.json();
    if (!result.success) return alert("Rasm yuklashda xatolik!");
    const url = result.data.url;
    await update(ref(db, "users/" + currentUid), { avatar: url });
    avatar.src = url;
    alert("Rasm yuklandi!");
  };
  reader.readAsDataURL(file);
});

// edit profile handlers
editProfileBtn && editProfileBtn.addEventListener("click", () => { editModal.style.display = "flex"; });
closeEditBtn && closeEditBtn.addEventListener("click", () => { editModal.style.display = "none"; });
saveProfileBtn && saveProfileBtn.addEventListener("click", async () => {
  const updates = {
    fullName: editFullName.value || "",
    phone: editPhoneInput.value || "",
    birthdate: editBirthdate.value || "",
    gender: editGender.value || "",
    region: editRegion.value || "",
    district: editDistrict.value || "",
    carModel: carModel.value || "",
    carNumber: carNumber.value || "",
    carColor: carColor.value || "",
    seatCount: seatCount.value || ""
  };
  await update(ref(db, "users/" + currentUid), updates);
  alert("Saqlandi!");
  editModal.style.display = "none";
  await loadUserProfile(currentUid);
});

// balance modal handlers
const editBalanceOpen = () => { balanceModal.style.display = "flex"; };
const editBalanceClose = () => { balanceModal.style.display = "none"; };
$("editProfileBtn")?.addEventListener("click", ()=>{}); // noop if missing
document.getElementById("logoutBtn")?.addEventListener("click", () => signOut(auth));
confirmBalanceBtn && confirmBalanceBtn.addEventListener("click", async () => {
  const amount = Number(balanceAmount.value || 0);
  if (!amount || amount <= 0) return alert("To'g'ri summa kiriting");
  if (amount < 1000) return alert("Minimal 1000 so'm");
  const newBalance = (window.userBalance || 0) + amount;
  await update(ref(db, "users/" + currentUid), { balance: newBalance });
  window.userBalance = newBalance;
  balanceBox.textContent = "Balans: " + newBalance + " so‘m";
  alert("Balans to‘ldirildi!");
  editBalanceClose();
});
closeBalanceBtn && closeBalanceBtn.addEventListener("click", editBalanceClose);

// open balance modal with link from profile page
document.querySelectorAll("[href='#open-balance']").forEach(a => a.addEventListener("click", (e) => { e.preventDefault(); editBalanceOpen(); }));

// expose signOut for topbar
window.logout = () => signOut(auth);

