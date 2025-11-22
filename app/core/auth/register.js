// ===========================
// Modular register.js
// ===========================

import {
  auth,
  db,
  ref,
  get,
  update,
  onAuthStateChanged
} from "./lib.js";

let GLOBAL_ROLE = null;
let CURRENT_UID = null;
let CURRENT_PHONE = null;


// ===========================
// Userni aniqlash
// ===========================
onAuthStateChanged(auth, (user) => {
  if (!user) {
    // agar login qilmasdan kirsa — qaytarib yuboramiz
    window.location.href = "login.html";
    return;
  }

  CURRENT_UID = user.uid;
  CURRENT_PHONE = user.phoneNumber;

  document.getElementById("phone").value = CURRENT_PHONE;
});


// ===========================
// Role tanlash
// ===========================
window.selectRole = (role) => {
  GLOBAL_ROLE = role;

  document.getElementById("selectedRole").innerText =
    role === "driver"
      ? "Haydovchi sifatida ro‘yxatdan o‘tish"
      : "Yo‘lovchi sifatida ro‘yxatdan o‘tish";

  document.getElementById("extraFields").style.display = "block";

  if (role === "driver") {
    document.getElementById("carModel").style.display = "block";
    document.getElementById("license").style.display = "block";
  } else {
    document.getElementById("carModel").style.display = "none";
    document.getElementById("license").style.display = "none";
  }
};


// ===========================
// Role + ma'lumotlarni DB ga yozish
// ===========================
window.saveRole = async () => {

  if (!GLOBAL_ROLE) return alert("Role tanlang!");

  const fullName = document.getElementById("fullName").value.trim();

  if (!fullName) return alert("Ismingizni kiriting!");

  let data = {
    fullName,
    phone: CURRENT_PHONE,
    role: GLOBAL_ROLE,
    createdAt: Date.now()
  };

  if (GLOBAL_ROLE === "driver") {
    data.carModel = document.getElementById("carModel").value.trim();
    data.license = document.getElementById("license").value.trim();
  }

  try {
    await update(ref(db, "users/" + CURRENT_UID), data);

    alert("Muvaffaqiyatli saqlandi!");

    // /app/user/index.html ga qaytamiz
    window.location.href = "index.html";

  } catch (e) {
    console.error(e);
    alert("Xatolik: " + e.message);
  }
};
