// ===============================
// FIREBASE INIT
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getDatabase, ref, get, set, update, push
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


// ===============================
// LOGIN TEKSHIRUV
// ===============================
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    loadUserProfile(user.uid);
  }
});


// ===============================
// USER MA’LUMOTINI YUKLASH
// ===============================
async function loadUserProfile(uid) {
  const snap = await get(ref(db, "users/" + uid));
  if (!snap.exists()) return;

  const u = snap.val();

  document.getElementById("fullName").textContent = u.fullName || "Ism kiritilmagan";
  document.getElementById("phone").textContent = u.phone || "";

  document.getElementById("avatar").src =
    u.avatar || "https://raw.githubusercontent.com/rahmadiana/default-images/main/user-default.png";
}



// ===============================
// REGIONS & DISTRICTS
// ===============================
const regions = {
  "Toshkent": ["Bektemir", "Sergeli", "Olmazor", "Chilonzor", "Shayxontohur"],
  "Samarqand": ["Urgut", "Bulung‘ur", "Narpay", "Ishtixon"],
  "Farg‘ona": ["Qo‘qon", "Marg‘ilon", "Oltiariq", "Beshariq"],
  "Namangan": ["Kosonsoy", "Uchqo‘rg‘on", "Chortoq", "Namangan sh."],
  "Buxoro": ["G‘ijduvon", "Qorako‘l", "Vobkent", "Buxoro sh."]
};


// ===============================
// VILOYAT → TUMAN TO‘LDIRISH
// ===============================
window.updateDistricts = function(type) {
  const region = document.getElementById(type + "Region").value;
  const district = document.getElementById(type + "District");

  district.innerHTML = "";

  if (!regions[region]) return;

  regions[region].forEach(t => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    district.appendChild(opt);
  });
};



// ===============================
//   E’LON QO‘SHISH
// ===============================
window.addAd = async function () {
  const type = document.getElementById("adType").value;
  const fromRegion = document.getElementById("fromRegion").value;
  const fromDistrict = document.getElementById("fromDistrict").value;
  const toRegion = document.getElementById("toRegion").value;
  const toDistrict = document.getElementById("toDistrict").value;
  const price = document.getElementById("price").value;
  const comment = document.getElementById("adComment").value;

  if (!type || !fromRegion || !fromDistrict || !toRegion || !toDistrict) {
    alert("Barcha maydonlarni to‘ldiring!");
    return;
  }

  const user = auth.currentUser;
  if (!user) return;

  const ad = {
    userId: user.uid,
    type,
    fromRegion,
    fromDistrict,
    toRegion,
    toDistrict,
    price: price || 0,
    comment,
    approved: false,
    time: Date.now()
  };

  await push(ref(db, "ads"), ad);

  alert("E’lon joylandi!");
  clearAddForm();
};



// ===============================
// FORM TOZALASH
// ===============================
window.clearAddForm = function () {
  document.getElementById("adType").value = "";
  document.getElementById("fromRegion").value = "";
  document.getElementById("fromDistrict").innerHTML = "";
  document.getElementById("toRegion").value = "";
  document.getElementById("toDistrict").innerHTML = "";
  document.getElementById("price").value = "";
  document.getElementById("adComment").value = "";
};



// ===============================
// PROFIL TAHRIRLASH | ⭐ KIRITILMAGAN EDI – TUZATILDI
// ===============================
window.openEditProfile = function () {
  document.getElementById("editProfileModal").style.display = "flex";
};

window.closeEditProfile = function () {
  document.getElementById("editProfileModal").style.display = "none";
};

window.saveProfileEdit = async function() {
  const name = document.getElementById("editFullName").value;
  const phone = document.getElementById("editPhoneInput").value;

  const user = auth.currentUser;
  if (!user) return;

  await update(ref(db, "users/" + user.uid), {
    fullName: name,
    phone: phone
  });

  alert("Profil saqlandi!");
  window.location.reload();
};



// ===============================
//   CHIQISH
// ===============================
window.logout = function () {
  signOut(auth);
};
