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

// ======================================
//  TUMANLAR RO‘YXATI
// ======================================
const regions = {
  "Toshkent viloyati": ["Chirchiq", "Olmaliq", "Bekobod", "Parkent", "Oqqo‘rg‘on"],
  "Samarqand": ["Samarqand sh.", "Urgut", "Ishtixon", "Narpay"],
  "Farg‘ona": ["Farg‘ona sh.", "Qo‘qon", "Marg‘ilon"],
  "Namangan": ["Namangan sh.", "Chortoq", "Uchqo‘rg‘on"],
  "Buxoro": ["Buxoro sh.", "G‘ijduvon", "Qorako‘l"]
};

// ======================================
//  VILOYAT → TUMANLARNI YUKLASH
// ======================================
window.updateDistricts = function(type) {
    const region = document.getElementById(type + "Region").value;
    const districtSelect = document.getElementById(type + "District");

    districtSelect.innerHTML = "";

    if (!regions[region]) return;

    regions[region].forEach(t => {
        const opt = document.createElement("option");
        opt.value = t;
        opt.textContent = t;
        districtSelect.appendChild(opt);
    });
};


// ======================================
//  E'LON QO‘SHISH
// ======================================
window.addAd = async function () {
    const type = document.getElementById("adType").value;
    const fromRegion = document.getElementById("fromRegion").value;
    const fromDistrict = document.getElementById("fromDistrict").value;
    const toRegion = document.getElementById("toRegion").value;
    const toDistrict = document.getElementById("toDistrict").value;
    const price = document.getElementById("price").value;
    const comment = document.getElementById("adComment").value;

    if (!type || !fromRegion || !fromDistrict || !toRegion || !toDistrict) {
        alert("Iltimos, barcha maydonlarni to‘ldiring!");
        return;
    }

    const user = auth.currentUser;
    if (!user) return alert("Login qiling!");

    const ad = {
        type,
        fromRegion,
        fromDistrict,
        toRegion,
        toDistrict,
        price: price || 0,
        comment,
        userId: user.uid,
        time: Date.now(),
        approved: false
    };

    await push(ref(db, "ads"), ad);

    alert("E’lon joylandi (Admin tasdiqlashi kerak)");
    clearAddForm();
};


// ======================================
//  FORMANI TOZALASH
// ======================================
window.clearAddForm = function () {
    document.getElementById("adType").value = "";
    document.getElementById("fromRegion").value = "";
    document.getElementById("fromDistrict").innerHTML = "";
    document.getElementById("toRegion").value = "";
    document.getElementById("toDistrict").innerHTML = "";
    document.getElementById("price").value = "";
    document.getElementById("adComment").value = "";
};
