// ==========================
// Modular Firebase imports
// ==========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase,
  ref,
  update
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";


// ==========================
// Firebase config
// ==========================
const firebaseConfig = {
  apiKey: "AIzaSyApWUG40YuC9aCsE9MOLXwLcYgRihREWvc",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
  projectId: "shahartaxi-demo",
  messagingSenderId: "874241795701",
  appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};


// ==========================
// INIT
// ==========================
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

let GLOBAL_ROLE = null;   // driver | passenger
let CURRENT_PHONE = null;
let CURRENT_UID = null;


// ==========================
// USER AUTH CHECK
// (Telefon orqali kirgan user)
// ==========================
onAuthStateChanged(auth, user => {
  if (!user) return;

  CURRENT_UID = user.uid;
  CURRENT_PHONE = user.phoneNumber;

  document.getElementById("phone").value = CURRENT_PHONE;
});


// ==========================
// ROLE TANLASH FUNKSIYALARI
// ==========================
window.selectRole = function(role) {
  GLOBAL_ROLE = role;

  document.getElementById("selectedRole").innerText =
    role === "driver" ? "Haydovchi sifatida ro‘yxat" : "Yo‘lovchi sifatida ro‘yxat";

  document.getElementById("extraFields").style.display = "block";

  // agar haydovchi bo‘lsa mashina maydonlarini ko‘rsatamiz
  if (role === "driver") {
    document.getElementById("carModel").style.display = "block";
    document.getElementById("license").style.display = "block";
  } else {
    document.getElementById("carModel").style.display = "none";
    document.getElementById("license").style.display = "none";
  }
};


// ==========================
// DB GA SAQLASH
// ==========================
window.saveRole = async function () {

  if (!GLOBAL_ROLE) return alert("Role tanlang!");

  const fullName = document.getElementById("fullName").value.trim();

  if (!fullName) return alert("Ismingizni kiriting!");

  let data = {
    fullName,
    phone: CURRENT_PHONE,
    role: GLOBAL_ROLE,
    registeredAt: Date.now()
  };

  // Agar haydovchi bo'lsa mashina ma'lumotlarini qo'shamiz
  if (GLOBAL_ROLE === "driver") {
    data.carModel = document.getElementById("carModel").value.trim();
    data.license = document.getElementById("license").value.trim();
  }

  try {
    await update(ref(db, "users/" + CURRENT_UID), data);

    alert("Muvaffaqiyatli saqlandi!");

    // profilga yo'naltiramiz
    window.location.href = "profile.html";

  } catch (err) {
    console.error(err);
    alert("Xatolik: " + err.message);
  }
};
