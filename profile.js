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

// ✅ STORAGE IMPORT (YANGI)
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";


// <-- O'Z firebaseConfig ni shu yerga qo'ying -->
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

// ✅ STORAGE INSTANCE
const storage = getStorage(app);


// ===============================
// REGIONLAR (MISOL)
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

  loadUserProfile(user.uid).catch(e => console.error("loadUserProfile:", e));
  loadRegions();
});


// ===============================
// USER MA’LUMOTINI YUKLASH
// ===============================
async function loadUserProfile(uid) {
  try {
    const snap = await get(ref(db, "users/" + uid));

    if (!snap.exists()) {
      await set(ref(db, "users/" + uid), {
        fullName: "Ism kiritilmagan",
        phone: "",
        avatar: ""
      });
    }

    const u = snap.exists() ? snap.val() : {};

    document.getElementById("fullName").textContent = u.fullName || "Ism ko‘rsatilmagan";
    document.getElementById("phone").textContent = u.phone || "";

    // ⭐ Yangi avatar yuklangan bo‘lsa uni yuklaymiz
    document.getElementById("avatar").src =
      u.avatar || "https://raw.githubusercontent.com/rahmadiana/default-images/main/user-default.png";

  } catch (err) {
    console.error("loadUserProfile error:", err);
  }
}



// ===============================
// VILOYATLARNI YUKLASH
// ===============================
function loadRegions() {
  const fromRegion = document.getElementById("fromRegion");
  const toRegion = document.getElementById("toRegion");
  if (!fromRegion || !toRegion) return;

  const defaultFrom = '<option value="">Qayerdan (Viloyat)</option>';
  const defaultTo = '<option value="">Qayerga (Viloyat)</option>';

  fromRegion.innerHTML = defaultFrom;
  toRegion.innerHTML = defaultTo;

  Object.keys(regionsData).forEach(region => {
    const opt1 = document.createElement("option");
    opt1.value = region; opt1.textContent = region;
    fromRegion.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = region; opt2.textContent = region;
    toRegion.appendChild(opt2);
  });
}



// ===============================
// VILOYAT → TUMAN
// ===============================
window.updateDistricts = function(type) {
  const regionSelect = document.getElementById(type + "Region");
  const districtSelect = document.getElementById(type + "District");

  districtSelect.innerHTML = '<option value="">Tuman</option>';

  const region = regionSelect.value;
  if (!region || !regionsData[region]) return;

  regionsData[region].forEach(d => {
    const opt = document.createElement("option");
    opt.value = d; opt.textContent = d;
    districtSelect.appendChild(opt);
  });
};



// ===============================
// E’LON QO‘SHISH
// ===============================
window.addAd = async function () {
  try {
    const type = adType.value;
    const fromRegionValue = fromRegion.value;
    const fromDistrictValue = fromDistrict.value;
    const toRegionValue = toRegion.value;
    const toDistrictValue = toDistrict.value;
    const priceVal = price.value;
    const commentVal = adComment.value;

    if (!type || !fromRegionValue || !fromDistrictValue || !toRegionValue || !toDistrictValue) {
      alert("Barcha maydonlarni to‘ldiring!");
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    const ad = {
      userId: user.uid,
      type,
      fromRegion: fromRegionValue,
      fromDistrict: fromDistrictValue,
      toRegion: toRegionValue,
      toDistrict: toDistrictValue,
      price: priceVal || 0,
      comment: commentVal,
      approved: false,
      createdAt: Date.now()
    };

    await push(ref(db, "ads"), ad);

    alert("E’lon muvaffaqiyatli qo‘shildi!");
    clearAddForm();
  } catch (err) {
    console.error("addAd error:", err);
    alert("Xatolik!");
  }
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
// PROFIL TAHRIRLASH
// ===============================
window.openEditProfile = function () {
  document.getElementById("editModal").style.display = "flex";
  document.getElementById("editFullName").value = fullName.textContent;
  document.getElementById("editPhoneInput").value = phone.textContent;
};
carModel.value = (window.userProfile?.carModel) || "";
carNumber.value = (window.userProfile?.carNumber) || "";
carColor.value = (window.userProfile?.carColor) || "";
seatCount.value = (window.userProfile?.seatCount) || "";

window.closeEditProfile = function () {
  document.getElementById("editModal").style.display = "none";
};


// ===============================
// PROFILNI SAQLASH
// ===============================
window.saveProfileEdit = async function () {
  try {
    const user = auth.currentUser;
    if (!user) return;

   await update(ref(db, "users/" + user.uid), {
  fullName: editFullName.value,
  phone: editPhoneInput.value,
  carModel: carModel.value || "",
  carNumber: carNumber.value || "",
  carColor: carColor.value || "",
  seatCount: seatCount.value || ""
});

    alert("Profil saqlandi!");
    closeEditProfile();
    loadUserProfile(user.uid);

  } catch (err) {
    alert("Xatolik!");
  }
};



// ===================================================================
// ⭐⭐ AVATAR YUKLASH (YANGI QO‘SHILGAN BO‘LIM)
// ===================================================================

// inputni bosish uchun funksiya
window.chooseAvatar = function () {
  document.getElementById("avatarInput").click();
};

// rasmni yuklash
window.uploadAvatar = async function () {
  const file = document.getElementById("avatarInput").files[0];
  if (!file) return;

  const user = auth.currentUser;
  if (!user) return;

  try {
    const filePath = "avatars/" + user.uid + ".jpg";
    const sRef = storageRef(storage, filePath);

    await uploadBytes(sRef, file);
    const url = await getDownloadURL(sRef);

    await update(ref(db, "users/" + user.uid), { avatar: url });

    document.getElementById("avatar").src = url;

    alert("Rasm muvaffaqiyatli yuklandi!");
  } catch (err) {
    console.error(err);
    alert("Rasm yuklashda xato!");
  }
};

// ===============================
// PROFIL RASMINI YUKLASH — ImgBB
// ===============================

const imgbbApiKey = "99ab532b24271b982285ecf24a805787";

document.getElementById("avatar").onclick = () => {
  document.getElementById("avatarInput").click();
};

document.getElementById("avatarInput").addEventListener("change", async function () {
  const file = this.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function (event) {
    try {
      const base64 = event.target.result.split(",")[1];

      // ImgBB ga yuklash
      const formData = new FormData();
      formData.append("key", imgbbApiKey);
      formData.append("image", base64);

      const uploadRes = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        body: formData
      });

      const result = await uploadRes.json();

      if (result.success) {
        const imageUrl = result.data.url;

        // Firebase ga saqlash
        const user = auth.currentUser;
        await update(ref(db, "users/" + user.uid), { avatar: imageUrl });

        document.getElementById("avatar").src = imageUrl;

        alert("Rasm muvaffaqiyatli yuklandi!");
      } else {
        alert("Rasm yuklashda xatolik!");
      }

    } catch (err) {
      console.error("Upload error:", err);
      alert("Xatolik: rasm yuklanmadi.");
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
// DOM LOADED
// ===============================
window.addEventListener("DOMContentLoaded", () => {
  if (fromDistrict.innerHTML.trim() === "")
    fromDistrict.innerHTML = '<option value="">Tuman</option>';

  if (toDistrict.innerHTML.trim() === "")
    toDistrict.innerHTML = '<option value="">Tuman</option>';
});
