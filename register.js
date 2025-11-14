// ===============================
// FIREBASE INIT
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getDatabase, ref, set, get
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

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


// USER LOGIN HOLATINI TEKSHIRAMIZ
let currentUid = "";
let selectedRole = "";

onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUid = user.uid;
  document.getElementById("phone").value = user.phoneNumber;

  // AGAR USER OLDIN REGISTR BO‘LGAN BO‘LSA → PROFILGA O‘TKAZAMIZ
  const snap = await get(ref(db, "users/" + currentUid));
  if (snap.exists()) {
    window.location.href = "profile.html";
  }
});


// ROLE TANLASH
window.selectRole = function(role){
  selectedRole = role;

  document.getElementById("selectedRole").textContent =
    role === "driver" ? "Tanlangan rol: Haydovchi" : "Tanlangan rol: Yo‘lovchi";

  document.getElementById("extraFields").style.display = "block";

  // Haydovchiga qo‘shimcha maydonlar
  if (role === "driver") {
    document.getElementById("carModel").style.display = "block";
    document.getElementById("license").style.display = "block";
  } else {
    document.getElementById("carModel").style.display = "none";
    document.getElementById("license").style.display = "none";
  }
}


// SAQLASH
window.saveRole = async function () {
  const fullName = document.getElementById("fullName").value;
  const phone = document.getElementById("phone").value;
  const carModel = document.getElementById("carModel").value;
  const license = document.getElementById("license").value;

  if (!selectedRole) {
    alert("Avval rolni tanlang!");
    return;
  }

  if (!fullName) {
    alert("Ismingizni kiriting!");
    return;
  }

  const data = {
    fullName,
    phone,
    role: selectedRole,
    createdAt: Date.now(),
    avatar: ""
  };

  // HAYDOVCHI BO'LSA
  if (selectedRole === "driver") {
    data.carModel = carModel || "";
    data.license = license || "";
  }

  await set(ref(db, "users/" + currentUid), data);

  alert("Muvaffaqiyatli saqlandi!");
  window.location.href = "profile.html";
};
