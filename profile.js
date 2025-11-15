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

// ImgBB API
const imgbbApiKey = "99ab532b24271b982285ecf24a805787";


// ===============================
// LOGIN
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

  fullName.textContent = u.fullName || "";
  phone.textContent = u.phone || "";
  avatar.src = u.avatar || "https://raw.githubusercontent.com/rahmadiana/default-images/main/user-default.png";

  editFullName.value = u.fullName || "";
  editPhoneInput.value = u.phone || "";
  carModel.value = u.carModel || "";
  carNumber.value = u.carNumber || "";
  carColor.value = u.carColor || "";
  seatCount.value = u.seatCount || "";
}


// ===============================
// VILOYATLARNI YUKLASH
// ===============================
function loadRegions() {
  fromRegion.innerHTML = `<option value="">Qayerdan (Viloyat)</option>`;
  toRegion.innerHTML = `<option value="">Qayerga (Viloyat)</option>`;

  Object.keys(window.regionsData).forEach(region => {
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

  if (window.regionsData[region]) {
    window.regionsData[region].forEach(t => {
      districtSelect.innerHTML += `<option value="${t}">${t}</option>`;
    });
  }
};


// ===============================
// E’LON QO‘SHISH
// ===============================
window.addAd = async function () {
  const user = auth.currentUser;
  if (!user) return;

  const ad = {
    userId: user.uid,
    type: adType.value,
    fromRegion: fromRegion.value,
    fromDistrict: fromDistrict.value,
    toRegion: toRegion.value,
    toDistrict: toDistrict.value,
    price: price.value,
    comment: adComment.value,
    approved: false,
    createdAt: Date.now()
  };

  await push(ref(db, "ads"), ad);

  alert("E’lon joylandi!");
  clearAddForm();
};


// ===============================
// CLEAR FORM
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
  editModal.style.display = "flex";
};

window.closeEditProfile = function () {
  editModal.style.display = "none";
};


// ===============================
// PROFIL SAQLASH
// ===============================
window.saveProfileEdit = async function () {
  const user = auth.currentUser;
  if (!user) return;

  const updates = {
    fullName: editFullName.value,
    phone: editPhoneInput.value,
    carModel: carModel.value,
    carNumber: carNumber.value,
    carColor: carColor.value,
    seatCount: seatCount.value
  };

  await update(ref(db, "users/" + user.uid), updates);
  alert("Saqlandi!");
  closeEditProfile();
  loadUserProfile(user.uid);
};


// ===============================
// AVATAR — ImgBB
// ===============================
window.chooseAvatar = function () {
  avatarInput.click();
};

avatarInput.addEventListener("change", async function () {
  const file = this.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = async function (e) {
    const base64 = e.target.result.split(",")[1];

    const form = new FormData();
    form.append("key", imgbbApiKey);
    form.append("image", base64);

    const res = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: form
    });

    const result = await res.json();
    if (!result.success) return alert("Xatolik!");

    const url = result.data.url;
    await update(ref(db, "users/" + auth.currentUser.uid), { avatar: url });

    avatar.src = url;
    alert("Rasm yuklandi!");
  };

  reader.readAsDataURL(file);
});

// ===============================
// MENING E’LONLARIMNI YUKLASH
// ===============================
async function loadMyAds() {
  const user = auth.currentUser;
  if (!user) return;

  const adsRef = ref(db, "ads");
  const snap = await get(adsRef);

  const box = document.getElementById("myAdsList");
  box.innerHTML = "";

  if (!snap.exists()) {
    box.innerHTML = "<p>Hozircha e’lon yo‘q.</p>";
    return;
  }

  let found = false;

  snap.forEach(child => {
    const ad = child.val();

    if (ad.userId === user.uid) {
      found = true;

      const div = document.createElement("div");
      div.style = `
        padding:12px;
        border:1px solid #ddd;
        border-radius:8px;
        margin-bottom:10px;
      `;

      div.innerHTML = `
        <b>${ad.type}</b><br>
        <span>${ad.fromRegion}, ${ad.fromDistrict}</span> → 
        <span>${ad.toRegion}, ${ad.toDistrict}</span><br>
        Narx: <b>${ad.price ? ad.price + " so‘m" : "ko‘rsatilmagan"}</b><br>
        Izoh: ${ad.comment || "-"}<br>
        <small style="color:#777;">${new Date(ad.createdAt).toLocaleString()}</small>
      `;

      box.appendChild(div);
    }
  });

  if (!found) {
    box.innerHTML = "<p>Hozircha sizning e’lonlaringiz yo‘q.</p>";
  }
}

// ===============================
// LOGOUT
// ===============================
window.logout = function () {
  signOut(auth);
};
