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

import regionsData from "./regions.js?v=3001";

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

// ImgBB API KEY
const imgbbApiKey = "99ab532b24271b982285ecf24a805787";


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
// USER PROFILINI YUKLASH
// ===============================
async function loadUserProfile(uid) {
  try {
    const snap = await get(ref(db, "users/" + uid));

    if (!snap.exists()) {
      await set(ref(db, "users/" + uid), {
        fullName: "Ism kiritilmagan",
        phone: "",
        avatar: "",
        carModel: "",
        carNumber: "",
        carColor: "",
        seatCount: ""
      });
    }

    const u = snap.val() || {};

    document.getElementById("fullName").textContent = u.fullName || "Ism ko‘rsatilmagan";
    document.getElementById("phone").textContent = u.phone || "";
    document.getElementById("avatar").src = u.avatar || "https://raw.githubusercontent.com/rahmadiana/default-images/main/user-default.png";

    // Modalga joylash
    document.getElementById("editFullName").value = u.fullName || "";
    document.getElementById("editPhoneInput").value = u.phone || "";
    document.getElementById("carModel").value = u.carModel || "";
    document.getElementById("carNumber").value = u.carNumber || "";
    document.getElementById("carColor").value = u.carColor || "";
    document.getElementById("seatCount").value = u.seatCount || "";

  } catch (err) {
    console.error(err);
  }
}



// ===============================
// VILOYATLARNI YUKLASH
// ===============================
function loadRegions() {
  const fromRegion = document.getElementById("fromRegion");
  const toRegion = document.getElementById("toRegion");

  fromRegion.innerHTML = '<option value="">Qayerdan (Viloyat)</option>';
  toRegion.innerHTML = '<option value="">Qayerga (Viloyat)</option>';

  Object.keys(regionsData).forEach(region => {
    fromRegion.innerHTML += `<option value="${region}">${region}</option>`;
    toRegion.innerHTML += `<option value="${region}">${region}</option>`;
  });
}



// ===============================
// VILOYAT → TUMAN
// ===============================
window.updateDistricts = function(type) {
  const region = document.getElementById(type + "Region").value;
  const districtSelect = document.getElementById(type + "District");

  districtSelect.innerHTML = '<option value="">Tuman</option>';

  if (regionsData[region]) {
    regionsData[region].forEach(t => {
      districtSelect.innerHTML += `<option value="${t}">${t}</option>`;
    });
  }
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
    console.error(err);
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
// PROFIL MODAL
// ===============================
window.openEditProfile = function () {
  document.getElementById("editModal").style.display = "flex";
};

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

    const updates = {
      fullName: document.getElementById("editFullName").value,
      phone: document.getElementById("editPhoneInput").value,
      carModel: document.getElementById("carModel").value,
      carNumber: document.getElementById("carNumber").value,
      carColor: document.getElementById("carColor").value,
      seatCount: document.getElementById("seatCount").value
    };

    await update(ref(db, "users/" + user.uid), updates);

    alert("Profil saqlandi!");
    closeEditProfile();
    loadUserProfile(user.uid);

  } catch (err) {
    console.error(err);
    alert("Xatolik!");
  }
};



// ===============================
// AVATAR YUKLASH — ImgBB
// ===============================
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

      const formData = new FormData();
      formData.append("key", imgbbApiKey);
      formData.append("image", base64);

      const uploadRes = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        body: formData
      });

      const result = await uploadRes.json();

      if (result.success) {
        const url = result.data.url;
        const user = auth.currentUser;

        await update(ref(db, "users/" + user.uid), { avatar: url });
        document.getElementById("avatar").src = url;

        alert("Rasm muvaffaqiyatli yuklandi!");
      } else {
        alert("Rasm yuklashda xatolik!");
      }

    } catch (err) {
      console.error(err);
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
