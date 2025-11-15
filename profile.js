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

// ImgBB API
const imgbbApiKey = "99ab532b24271b982285ecf24a805787";

// Firebase config
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
    return;
  }

  loadUserProfile(user.uid);
  loadRegions();
});


// ===============================
// PROFIL MA’LUMOTINI YUKLASH
// ===============================
async function loadUserProfile(uid) {
  const snap = await get(ref(db, "users/" + uid));

  if (!snap.exists()) {
    await set(ref(db, "users/" + uid), {
      fullName: "Ism kiritilmagan",
      phone: "",
      avatar: ""
    });
  }

  const u = snap.val() || {};

  document.getElementById("fullName").textContent =
    u.fullName || "Ism ko‘rsatilmagan";

  document.getElementById("phone").textContent =
    u.phone || "";

  document.getElementById("avatar").src =
    u.avatar || "https://raw.githubusercontent.com/rahmadiana/default-images/main/user-default.png";
}


// ===============================
// VILOYATLARNI YUKLASH
// ===============================
function loadRegions() {
  const fromRegion = document.getElementById("fromRegion");
  const toRegion = document.getElementById("toRegion");

  fromRegion.innerHTML = '<option value="">Qayerdan (Viloyat)</option>';
  toRegion.innerHTML = '<option value="">Qayerga (Viloyat)</option>';

  Object.keys(window.regionsData).forEach(region => {
    let op1 = new Option(region, region);
    let op2 = new Option(region, region);

    fromRegion.add(op1);
    toRegion.add(op2);
  });
}


// ===============================
// VILOYAT → TUMAN
// ===============================
window.updateDistricts = function (type) {
  const region = document.getElementById(type + "Region").value;
  const district = document.getElementById(type + "District");

  district.innerHTML = '<option value="">Tuman</option>';

  if (!region || !window.regionsData[region]) return;

  window.regionsData[region].forEach(t => {
    district.add(new Option(t, t));
  });
};


// ===============================
// E’LON QO‘SHISH
// ===============================
window.addAd = async function () {
  const type = adType.value;
  const a = fromRegion.value;
  const b = fromDistrict.value;
  const c = toRegion.value;
  const d = toDistrict.value;

  if (!type || !a || !b || !c || !d) {
    alert("Barcha maydonlarni to‘ldiring!");
    return;
  }

  const user = auth.currentUser;

  const ad = {
    userId: user.uid,
    type,
    fromRegion: a,
    fromDistrict: b,
    toRegion: c,
    toDistrict: d,
    price: price.value || 0,
    comment: adComment.value || "",
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
// PROFILNI TAHRIRLASH
// ===============================
window.openEditProfile = function () {
  editModal.style.display = "flex";
  editFullName.value = fullName.textContent;
  editPhoneInput.value = phone.textContent;
};

window.closeEditProfile = function () {
  editModal.style.display = "none";
};


// ===============================
// PROFIL SAQLASH
// Telefon raqami o‘zgarmaydi!
// ===============================
window.saveProfileEdit = async function () {
  const user = auth.currentUser;

  await update(ref(db, "users/" + user.uid), {
    fullName: editFullName.value
  });

  alert("Profil saqlandi!");
  closeEditProfile();
  loadUserProfile(user.uid);
};


// ===============================
// IMGBB AVATAR YUKLASH
// ===============================
document.getElementById("avatarInput").addEventListener("change", async function () {
  const file = this.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function (event) {
    const base64 = event.target.result.split(",")[1];

    const formData = new FormData();
    formData.append("key", imgbbApiKey);
    formData.append("image", base64);

    const res = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: formData
    });

    const result = await res.json();

    if (result.success) {
      const imageUrl = result.data.url;

      const user = auth.currentUser;
      await update(ref(db, "users/" + user.uid), { avatar: imageUrl });

      avatar.src = imageUrl;
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
window.logout = () => signOut(auth);


// ===============================
// DOM READY
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  if (fromDistrict.innerHTML.trim() === "")
    fromDistrict.innerHTML = '<option>Tuman</option>';
});
