// ===============================
// FIREBASE INIT
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getDatabase,
  ref,
  get,
  set,
  update,
  push
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ImgBB uchun API
const imgbbApiKey = "99ab532b24271b982285ecf24a805787";

// firebase config
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
// VILOYATLAR
// ===============================
const regionsData = {
  "Toshkent": ["Bektemir", "Chilonzor", "Yunusobod", "Sergeli"],
  "Samarqand": ["Urgut", "Ishtixon", "Narpay", "Payariq"],
  "Farg‘ona": ["Qo‘qon", "Marg‘ilon", "Beshariq", "Oltiariq"],
  "Buxoro": ["Vobkent", "G‘ijduvon", "Qorako‘l", "Romitan"],
  "Namangan": ["Kosonsoy", "Chortoq", "Uchqo‘rg‘on", "Namangan sh."]
};


// ===============================
// LOGIN TEKSHIRUV
// ===============================
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  loadUserProfile(user.uid);
  loadRegions();
});


// ===============================
// PROFIL YUKLASH
// ===============================
async function loadUserProfile(uid) {
  const snap = await get(ref(db, "users/" + uid));

  if (!snap.exists()) {
    await set(ref(db, "users/" + uid), {
      fullName: "",
      phone: "",
      avatar: "",
      carModel: "",
      carNumber: "",
      carColor: "",
      seatCount: ""
    });
  }

  const u = snap.val();
  window.userProfile = u; // profilni tahrirga uzatish uchun

  document.getElementById("fullName").textContent = u.fullName || "Ism ko‘rsatilmagan";
  document.getElementById("phone").textContent = u.phone || "";

  document.getElementById("avatar").src =
    u.avatar || "https://raw.githubusercontent.com/rahmadiana/default-images/main/user-default.png";
}



// ===============================
// VILOYATLARNI YUKLASH
// ===============================
function loadRegions() {
  fromRegion.innerHTML = '<option value="">Qayerdan (Viloyat)</option>';
  toRegion.innerHTML = '<option value="">Qayerga (Viloyat)</option>';

  Object.keys(regionsData).forEach(region => {
    let o1 = document.createElement("option");
    o1.value = region; o1.textContent = region;
    fromRegion.appendChild(o1);

    let o2 = document.createElement("option");
    o2.value = region; o2.textContent = region;
    toRegion.appendChild(o2);
  });
}


// ===============================
// VILOYAT → TUMAN
// ===============================
window.updateDistricts = function(type) {
  const region = document.getElementById(type + "Region").value;
  const district = document.getElementById(type + "District");

  district.innerHTML = '<option value="">Tuman</option>';

  if (!regionsData[region]) return;

  regionsData[region].forEach(t => {
    let opt = document.createElement("option");
    opt.value = t; opt.textContent = t;
    district.appendChild(opt);
  });
};



// ===============================
// E’LON QO‘SHISH
// ===============================
window.addAd = async function () {
  if (!adType.value || !fromRegion.value || !fromDistrict.value ||
    !toRegion.value || !toDistrict.value) {
    alert("Barcha maydonlarni to‘ldiring!");
    return;
  }

  const user = auth.currentUser;
  if (!user) return;

  const ad = {
    userId: user.uid,
    type: adType.value,
    fromRegion: fromRegion.value,
    fromDistrict: fromDistrict.value,
    toRegion: toRegion.value,
    toDistrict: toDistrict.value,
    price: price.value || 0,
    comment: adComment.value,
    approved: false,
    createdAt: Date.now()
  };

  await push(ref(db, "ads"), ad);

  alert("E’lon muvaffaqiyatli qo‘shildi!");
  clearAddForm();
};



// ===============================
// FORM TOZALASH
// ===============================
window.clearAddForm = function () {
  adType.value = "";
  fromRegion.value = "";
  fromDistrict.innerHTML = '<option value="">Tuman</option>';
  toRegion.value = "";
  toDistrict.innerHTML = '<option value="">Tuman</option>';
  price.value = "";
  adComment.value = "";
};



// ===============================
// PROFILNI TAHRIRGA OCHISH
// ===============================
window.openEditProfile = function () {
  editModal.style.display = "flex";

  editFullName.value = userProfile.fullName || "";
  editPhoneInput.value = userProfile.phone || "";

  // 🚗 YANGI — MASHINA MA’LUMOTLARINI TOLDIRISH
  carModel.value = userProfile.carModel || "";
  carNumber.value = userProfile.carNumber || "";
  carColor.value = userProfile.carColor || "";
  seatCount.value = userProfile.seatCount || "";
};


window.closeEditProfile = function () {
  editModal.style.display = "none";
};


// ===============================
// PROFILNI SAQLASH
// ===============================
window.saveProfileEdit = async function () {
  const user = auth.currentUser;
  if (!user) return;

  await update(ref(db, "users/" + user.uid), {
    fullName: editFullName.value,
    phone: editPhoneInput.value,

    // 🚗 MASHINA MA’LUMOTLARINI SAQLAYMIZ
    carModel: carModel.value,
    carNumber: carNumber.value,
    carColor: carColor.value,
    seatCount: seatCount.value
  });

  alert("Profil muvaffaqiyatli saqlandi!");
  editModal.style.display = "none";
  loadUserProfile(user.uid);
};



// ===============================
// AVATAR TANLASH
// ===============================
window.chooseAvatar = function () {
  document.getElementById("avatarInput").click();
};


// ===============================
// AVATAR YUKLASH (ImgBB)
// ===============================
document.getElementById("avatarInput").addEventListener("change", async function () {
  const file = this.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = async function (e) {
    const base64 = e.target.result.split(",")[1];

    let formData = new FormData();
    formData.append("key", imgbbApiKey);
    formData.append("image", base64);

    const res = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: formData
    });

    const result = await res.json();

    if (result.success) {
      const url = result.data.url;

      const user = auth.currentUser;
      await update(ref(db, "users/" + user.uid), { avatar: url });

      document.getElementById("avatar").src = url;
      alert("Rasm yuklandi!");
    } else {
      alert("Rasm yuklanmadi!");
    }
  };

  reader.readAsDataURL(file);
});



// ===============================
// CHIQISH
// ===============================
window.logout = function () {
  signOut(auth);
};



// ===============================
// DOM loaded
// ===============================
window.addEventListener("DOMContentLoaded", () => {
  fromDistrict.innerHTML = '<option value="">Tuman</option>';
  toDistrict.innerHTML = '<option value="">Tuman</option>';
});
