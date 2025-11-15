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
  push,
  remove
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
  loadMyAds();
});


// ===============================
// DATETIME FORMATTER
// ===============================
function formatDatetime(dt) {
  if (!dt) return "—";

  dt = dt.replace("M", "-").replace(/\s+/g, " ");
  const d = new Date(dt);

  if (isNaN(d)) return dt;

  return d.toLocaleString("uz-UZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}


// ===============================
// USER PROFILE LOAD
// ===============================
async function loadUserProfile(uid) {
  const snap = await get(ref(db, "users/" + uid));

  if (!snap.exists()) {
    await set(ref(db, "users/" + uid), {
      fullName: "",
      phone: "",
      avatar: "",
      role: "passenger",
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

  const carFields = ["carModel", "carNumber", "carColor", "seatCount"];
  carFields.forEach(id => {
    document.getElementById(id).style.display = u.role === "driver" ? "block" : "none";
  });

  carModel.value = u.carModel || "";
  carNumber.value = u.carNumber || "";
  carColor.value = u.carColor || "";
  seatCount.value = u.seatCount || "";

  window.userRole = u.role;
}


// ===============================
// REGION & DISTRICT LOAD
// ===============================
function loadRegions() {
  fromRegion.innerHTML = `<option value="">Qayerdan (Viloyat)</option>`;
  toRegion.innerHTML = `<option value="">Qayerga (Viloyat)</option>`;

  Object.keys(window.regionsData).forEach(region => {
    fromRegion.innerHTML += `<option value="${region}">${region}</option>`;
    toRegion.innerHTML += `<option value="${region}">${region}</option>`;
  });
}

window.updateDistricts = function (type) {
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
// ADD AD
// ===============================
window.addAd = async function () {
  const user = auth.currentUser;
  if (!user) return;

  let extraInfo = {};

  if (window.userRole === "driver") {
    extraInfo.seatCount = seatCount.value;
  } else {
    extraInfo.passengerCount = seats.value;
  }

  extraInfo.departureTime = departureTime.value || "";

  const ad = {
    userId: user.uid,
    type: window.userRole === "driver" ? "Haydovchi" : "Yo‘lovchi",
    fromRegion: fromRegion.value,
    fromDistrict: fromDistrict.value,
    toRegion: toRegion.value,
    toDistrict: toDistrict.value,
    price: price.value,
    comment: adComment.value,
    approved: false,
    createdAt: Date.now(),
    ...extraInfo
  };

  await push(ref(db, "ads"), ad);

  alert("E’lon joylandi!");
  clearAddForm();
};


// ===============================
// CLEAR ADD FORM
// ===============================
window.clearAddForm = function () {
  fromRegion.value = "";
  fromDistrict.innerHTML = '<option value="">Tuman</option>';
  toRegion.value = "";
  toDistrict.innerHTML = '<option value="">Tuman</option>';
  price.value = "";
  adComment.value = "";
  seats.value = "";
  departureTime.value = "";
};



// ===============================
// PROFILE MODAL OPEN/CLOSE
// ===============================
window.openEditProfile = () => editModal.style.display = "flex";
window.closeEditProfile = () => editModal.style.display = "none";


// ===============================
// SAVE PROFILE
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
// AVATAR UPLOAD (ImgBB)
// ===============================
window.chooseAvatar = () => avatarInput.click();

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
// LOAD MY ADS
// ===============================
async function loadMyAds() {
  const user = auth.currentUser;
  if (!user) return;

  const snap = await get(ref(db, "ads"));
  const box = document.getElementById("myAdsList");

  box.innerHTML = "";

  if (!snap.exists()) {
    box.innerHTML = "<p>Hozircha e’lon yo‘q.</p>";
    return;
  }

  snap.forEach(child => {
    const ad = child.val();
    const id = child.key;

    if (ad.userId !== user.uid) return;

    const div = document.createElement("div");
    div.className = "ad-box";

    div.innerHTML = `
      <b>${ad.type}</b><br>
      ${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict}<br>
      Narx: <b>${ad.price || "-"} so‘m</b><br>
      Jo‘nash vaqti: ${formatDatetime(ad.departureTime)}<br>
      Qo‘shimcha: ${ad.comment || "-"}<br>
      <small style="color:#777">${new Date(ad.createdAt).toLocaleString()}</small>

      <div class="ad-actions">
        <button class="edit-btn" onclick="openEditAd('${id}')">Tahrirlash</button>
        <button class="delete-btn" onclick="deleteAd('${id}')">O‘chirish</button>
      </div>
    `;

    box.appendChild(div);
  });
}


// ===============================
// DELETE AD
// ===============================
window.deleteAd = async function (adId) {
  if (!confirm("E’lonni o‘chirishni istaysizmi?")) return;

  await remove(ref(db, "ads/" + adId));
  loadMyAds();
};


// ===============================
// OPEN EDIT AD MODAL
// ===============================
window.openEditAd = async function (adId) {
  window.currentEditAdId = adId;

  const snap = await get(ref(db, "ads/" + adId));
  const ad = snap.val();

  editFrom.value = `${ad.fromRegion} / ${ad.fromDistrict}`;
  editTo.value = `${ad.toRegion} / ${ad.toDistrict}`;
  editPrice.value = ad.price;
  editTime.value = ad.departureTime;
  editComment.value = ad.comment;

  document.getElementById("editAdModal").style.display = "flex";
};

window.closeEditAd = () =>
  document.getElementById("editAdModal").style.display = "none";


// ===============================
// SAVE AD EDIT
// ===============================
window.saveAdEdit = async function () {
  const id = window.currentEditAdId;
  if (!id) return;

  await update(ref(db, "ads/" + id), {
    price: editPrice.value,
    departureTime: editTime.value,
    comment: editComment.value
  });

  alert("E’lon yangilandi!");
  closeEditAd();
  loadMyAds();
};


// ===============================
// LOGOUT
// ===============================
window.logout = () => signOut(auth);
