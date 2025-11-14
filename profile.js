// === FIREBASE IMPORTLAR ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getDatabase, ref, get, update
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";


// === FIREBASE CONFIG (TO‘G‘RI VARIANT) ===
const firebaseConfig = {
  apiKey: "AIzaSyApWUG40YuC9aCsE9MOLXwLcYgRihREWvc",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
  projectId: "shahartaxi-demo",
  storageBucket: "shahartaxi-demo.firebasestorage.app",
  messagingSenderId: "874241795701",
  appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};


// === INIT ===
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);


// === AUTH LISTENER ===
onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  loadUserProfile(user.uid);
});


// === PROFIL MA’LUMOTINI YUKLASH ===
async function loadUserProfile(uid) {
  const snap = await get(ref(db, "users/" + uid));

  if (!snap.exists()) return;

  const u = snap.val();

  document.getElementById("fullName").textContent = u.fullName || "No name";
  document.getElementById("phone").textContent = u.phone || "";
  document.getElementById("avatar").src =
  u.avatar || "https://raw.githubusercontent.com/rahmadiana/default-images/main/user-default.png";


  loadMyAds(uid);
}


// === ELONLARNI YUKLASH (hozircha bo‘sh) ===
async function loadMyAds(uid) {
  document.getElementById("myAds").innerHTML = `
    <div style="color:#777;font-size:14px">Hozircha e’lon yo‘q.</div>
  `;
}


// === PROFILNI TAHRIRLASH ===
window.openEditProfile = function () {
  document.getElementById("editProfileModal").style.display = "flex";
};

window.closeEditProfile = function () {
  document.getElementById("editProfileModal").style.display = "none";
};


// === SAQLASH ===
window.saveProfile = async function () {
  const user = auth.currentUser;
  if (!user) return;

  const fullName = document.getElementById("editName").value.trim();
  const avatar = document.getElementById("editAvatar").value.trim();

  await update(ref(db, "users/" + user.uid), {
    fullName,
    avatar
  });

  closeEditProfile();
  loadUserProfile(user.uid);
};


// === LOGOUT (muammo shu edi!) ===
window.logout = async function () {
  await signOut(auth);
  window.location.href = "login.html";
};
