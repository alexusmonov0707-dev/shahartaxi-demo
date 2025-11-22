// app/user/js/register.js
// Modullar: lib.js dan eksport qilinganlar bilan ishlaydi

import { auth, db, ref, get, update, onAuthStateChanged } from "../../libs/lib.js";

let SELECTED_ROLE = null;
let CURRENT_UID = null;
let CURRENT_PHONE = null;

// DOM helpers
const $ = id => document.getElementById(id);

// Auth holatini kuzatish — agar user login qilmagan bo'lsa qaytaradi
onAuthStateChanged(auth, (user) => {
  if (!user) {
    // Agar login qilmagan bo'lsa, kirish sahifasiga o'tkazish
    window.location.href = "login.html";
    return;
  }

  // Agar login bo'lsa — telefon va uid saqlaymiz va inputni to'ldiramiz
  CURRENT_UID = user.uid;
  CURRENT_PHONE = user.phoneNumber || "";
  if ($("phone")) $("phone").value = CURRENT_PHONE;
});

// Role tanlash funksiyasi — sahifadagi maydonlarni ko'rsatadi
window.selectRole = function(role) {
  SELECTED_ROLE = role;
  $("selectedRole").textContent = role === "driver"
    ? "Haydovchi sifatida ro‘yxatdan o‘tish"
    : "Yo‘lovchi sifatida ro‘yxatdan o‘tish";

  $("extraFields").style.display = "block";

  if (role === "driver") {
    $("driverFields").style.display = "block";
  } else {
    $("driverFields").style.display = "none";
  }
};

// DB ga role va boshqa ma'lumotlarni yozish
window.saveRole = async function() {
  if (!SELECTED_ROLE) return alert("Iltimos, rolni tanlang.");

  // Foydalanuvchi hozir autentifikatsiyadan o'tgan bo'lishi kerak
  const user = auth.currentUser;
  if (!user) {
    alert("Tizimdan chiqib ketilgan. Iltimos, qayta kirish qiling.");
    window.location.href = "login.html";
    return;
  }

  const fullName = ($("fullName").value || "").trim();
  if (!fullName) return alert("Ism va familiyangizni kiriting.");

  // Tayyorlanayotgan data obyekti
  const data = {
    fullName,
    phone: CURRENT_PHONE,
    role: SELECTED_ROLE,
    updatedAt: Date.now()
  };

  if (SELECTED_ROLE === "driver") {
    data.carModel = ($("carModel").value || "").trim();
    data.license  = ($("license").value || "").trim();
  }

  try {
    // update — mavjud maydonlarni yangilaydi, yangi user uchun ham yaxshi ishlaydi
    await update(ref(db, "users/" + user.uid), data);

    alert("Ro'yxatdan o'tish muvaffaqiyatli!");

    // Index sahifasiga o'tish (app/user/index.html)
    window.location.href = "index.html";
  } catch (err) {
    console.error("Register error:", err);
    alert("Xatolik yuz berdi: " + (err.message || err));
  }
};
