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

// STORAGE (keyinchalik ishlatamiz)
import {
  getStorage, ref as storageRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";


// Firebase Config
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
const storage = getStorage(app);


// ===============================
// USER CHECK
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
// LOAD PROFILE
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

  document.getElementById("fullName").textContent = u.fullName || "Ism ko‘rsatilmagan";
  document.getElementById("phone").textContent = u.phone || "";

  document.getElementById("avatar").src =
    u.avatar || "https://raw.githubusercontent.com/rahmadiana/default-images/main/user-default.png";
}


// ===============================
// LOAD REGIONS
// ===============================
function loadRegions() {
  const fromRegion = document.getElementById("fromRegion");
  const toRegion = document.getElementById("toRegion");

  fromRegion.innerHTML = `<option value="">Qayerdan (Viloyat)</option>`;
  toRegion.innerHTML   = `<option value="">Qayerga (Viloyat)</option>`;

  Object.keys(window.regionsData).forEach(region => {
    let o1 = document.createElement("option");
    o1.value = region; o1.textContent = region;
    fromRegion.appendChild(o1);

    let o2 = document.createElement("option");
    o2.value = region; o2.textContent = region;
    toRegion.appendChild(o2);
  });
}


// ===============================
// REGION → DISTRICT
// ===============================
window.updateDistricts = type => {
  const region = document.getElementById(type + "Region").value;
  const districtSelect = document.getElementById(type + "District");

  districtSelect.innerHTML = `<option value="">Tuman</option>`;

  if (!region || !window.regionsData[region]) return;

  window.regionsData[region].forEach(d => {
    let opt = document.createElement("option");
    opt.value = d; opt.textContent = d;
    districtSelect.appendChild(opt);
  });
};


// ===============================
// ADD AD
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
    price: price.value || 0,
    comment: adComment.value,
    approved: false,
    createdAt: Date.now()
  };

  if (!ad.type || !ad.fromRegion || !ad.fromDistrict || !ad.toRegion || !ad.toDistrict) {
    alert("Barcha maydonlarni to‘ldiring!");
    return;
  }

  await push(ref(db, "ads"), ad);

  alert("E’lon joylandi!");
  clearAddForm();
};


// CLEAR FORM
window.clearAddForm = () => {
  adType.value = "";
  fromRegion.value = "";
  toRegion.value = "";
  fromDistrict.innerHTML = "<option>Tuman</option>";
  toDistrict.innerHTML = "<option>Tuman</option>";
  price.value = "";
  adComment.value = "";
};


// ===============================
// PROFILE EDIT
// ===============================
window.openEditProfile = () => {
  editModal.style.display = "flex";
  editFullName.value = fullName.textContent;
  editPhoneInput.value = phone.textContent;
};

window.closeEditProfile = () => {
  editModal.style.display = "none";
};

window.saveProfileEdit = async () => {
  const user = auth.currentUser;
  if (!user) return;

  await update(ref(db, "users/" + user.uid), {
    fullName: editFullName.value,
    phone: editPhoneInput.value   // hozircha o‘zgaraveradi
  });

  alert("Saqlandi!");
  closeEditProfile();
  loadUserProfile(user.uid);
};


// ===============================
// AVATAR — ImgBB (default)
// ===============================

const imgbbApiKey = "99ab532b24271b982285ecf24a805787";

document.getElementById("avatar").onclick = () => {
  document.getElementById("avatarInput").click();
};

document.getElementById("avatarInput").addEventListener("change", async function () {
  const file = this.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async e => {
    const base64 = e.target.result.split(",")[1];

    const form = new FormData();
    form.append("key", imgbbApiKey);
    form.append("image", base64);

    const res = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: form
    });

    const result = await res.json();

    if (!result.success) {
      alert("Rasm yuklashda xato");
      return;
    }

    const url = result.data.url;

    const user = auth.currentUser;
    await update(ref(db, "users/" + user.uid), { avatar: url });

    document.getElementById("avatar").src = url;

    alert("Rasm yuklandi!");
  };

  reader.readAsDataURL(file);
});


// ===============================
// LOG OUT
// ===============================
window.logout = () => signOut(auth);
