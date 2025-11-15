// =======================
// FIREBASE INIT
// =======================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getDatabase,
  ref,
  set,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyApWUG40YuC9aCsE9MOLXwLcYgRihREWvc",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
  projectId: "shahartaxi-demo",
  storageBucket: "shahartaxi-demo.firebasestorage.app",
  messagingSenderId: "874241795701",
  appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ============================
// GLOBAL ROLE
// ============================
let selectedRole = null;

// ============================
// 1) ROLE TANLASH
// ============================
window.selectRole = function (role) {
  selectedRole = role;

  document.getElementById("selectedRole").textContent =
    role === "driver" ? "🚕 Siz Haydovchisiz" : "🚶‍♂️ Siz Yo‘lovchisiz";

  document.getElementById("extraFields").style.display = "block";

  // Telefon raqami Firebase userdan olinadi
  onAuthStateChanged(auth, user => {
    if (user) {
      document.getElementById("phone").value = user.phoneNumber || "";
    }
  });

  // Haydovchiga mashina va prava maydoni ochiladi
  document.getElementById("carModel").style.display =
    role === "driver" ? "block" : "none";

  document.getElementById("license").style.display =
    role === "driver" ? "block" : "none";
};


// ============================
// 2) SAQLASH – YAKUNIY REGISTRATSIYA
// ============================
window.saveRole = async function () {
  const fullName = document.getElementById("fullName").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const carModel = document.getElementById("carModel").value.trim();
  const license = document.getElementById("license").value.trim();

  if (!selectedRole) {
    alert("Avval rol tanlang!");
    return;
  }

  if (!fullName) {
    alert("Ismni kiriting!");
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    alert("Xatolik! User topilmadi.");
    return;
  }

  const userRef = ref(db, "users/" + user.uid);

  const userData = {
    fullName,
    phone,
    role: selectedRole,
    avatar: "",
  };

  // Haydovchi bo‘lsa qo‘shimcha malumotlar qo‘shiladi
  if (selectedRole === "driver") {
    userData.carModel = carModel;
    userData.license = license;
    userData.seatCount = 4; // keyin o‘zgartirish mumkin
  }

  try {
    await set(userRef, userData);

    alert("Registratsiya muvaffaqiyatli!");

    // Profilga o‘tish
    window.location.href = "profile.html";

  } catch (e) {
    console.error(e);
    alert("Xatolik!");
  }
};
