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
// LOGIN STATE
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
// DATETIME FORMAT
// ===============================
function formatDatetime(dt) {
  if (!dt) return "—";
  if (dt.includes("M")) dt = dt.replace("M", "-");

  const d = new Date(dt);
  if (isNaN(d)) return dt;

  return d.toLocaleString("uz-UZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}


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
  avatar.src =
    u.avatar || "https://raw.githubusercontent.com/rahmadiana/default-images/main/user-default.png";

  editFullName.value = u.fullName || "";
  editPhoneInput.value = u.phone || "";

  ["carModel", "carNumber", "carColor", "seatCount"].forEach(id => {
    document.getElementById(id).style.display = u.role === "driver" ? "block" : "none";
  });

  carModel.value = u.carModel || "";
  carNumber.value = u.carNumber || "";
  carColor.value = u.carColor || "";
  seatCount.value = u.seatCount || "";

  window.userRole = u.role;
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
// TUMANLARNI YUKLASH
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
// E'LON QO‘SHISH
// ===============================
window.addAd = async function () {
  const user = auth.currentUser;
  if (!user) return;

  let extraInfo = {};

  if (window.userRole === "driver") {
    extraInfo.seatCount = seatCount.value;
  } else {
    extraInfo.passengerCount = seats.value || "";
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
// CLEAR FORM
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
// PROFIL MODAL
// ===============================
window.openEditProfile = () => editModal.style.display = "flex";
window.closeEditProfile = () => editModal.style.display = "none";


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


// =====================================================
//          🔥 YANGI QO‘SHILGAN: E’LONNI TAHRIRLASH
// =====================================================

let editingAdId = null;


// 1) Modalni ochish
window.openEditAd = function (adId, ad) {
  editingAdId = adId;

  loadEditRegions();

  editFromRegion.value = ad.fromRegion || "";
  updateEditDistricts("from");
  editFromDistrict.value = ad.fromDistrict || "";

  editToRegion.value = ad.toRegion || "";
  updateEditDistricts("to");
  editToDistrict.value = ad.toDistrict || "";

  editPrice.value = ad.price || "";
  editTime.value = ad.departureTime || "";
  editComment.value = ad.comment || "";

  document.getElementById("editAdModal").style.display = "flex";
};


// 2) Modalni yopish
window.closeEditAd = function () {
  document.getElementById("editAdModal").style.display = "none";
};


// 3) Modalga viloyatlarni yuklash
function loadEditRegions() {
  editFromRegion.innerHTML = '<option value="">Viloyat</option>';
  editToRegion.innerHTML = '<option value="">Viloyat</option>';

  Object.keys(window.regionsData).forEach(r => {
    editFromRegion.innerHTML += `<option value="${r}">${r}</option>`;
    editToRegion.innerHTML += `<option value="${r}">${r}</option>`;
  });
}


// 4) Tumanlarni yangilash
window.updateEditDistricts = function (type) {
  const regionId = type === "from" ? "editFromRegion" : "editToRegion";
  const districtId = type === "from" ? "editFromDistrict" : "editToDistrict";

  const region = document.getElementById(regionId).value;
  const districtSelect = document.getElementById(districtId);

  districtSelect.innerHTML = '<option value="">Tuman</option>';

  if (window.regionsData[region]) {
    window.regionsData[region].forEach(t =>
      districtSelect.innerHTML += `<option value="${t}">${t}</option>`
    );
  }
};


// 5) E’lonni saqlash
window.saveAdEdit = async function () {
  if (!editingAdId) return;

  const updates = {
    fromRegion: editFromRegion.value,
    fromDistrict: editFromDistrict.value,
    toRegion: editToRegion.value,
    toDistrict: editToDistrict.value,
    price: editPrice.value,
    departureTime: editTime.value,
    comment: editComment.value
  };

  await update(ref(db, "ads/" + editingAdId), updates);

  alert("E’lon yangilandi!");
  closeEditAd();
  loadMyAds();
};


// ===============================
// MENING E'lonlarim
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
    if (ad.userId !== user.uid) return;

    const div = document.createElement("div");
    div.style = `
      padding:12px;
      border:1px solid #ddd;
      border-radius:10px;
      margin-bottom:12px;
      background:#f8faff;
    `;

    div.innerHTML = `
      <b style="color:#0069d9;">${ad.type}</b><br>
      <span style="color:#333;">${ad.fromRegion}, ${ad.fromDistrict}</span>
      →
      <span style="color:#333;">${ad.toRegion}, ${ad.toDistrict}</span><br>

      Narx: <b style="color:#28a745;">${ad.price || "-"} so‘m</b><br>
      Jo‘nash vaqti: <span style="color:#ff8800;">${formatDatetime(ad.departureTime)}</span><br>
      Qo‘shimcha: <i>${ad.comment || "-"}</i><br>
      <small style="color:#777">${new Date(ad.createdAt).toLocaleString()}</small>

      <div style="margin-top:10px; display:flex; gap:8px;">
        <button onclick='openEditAd("${child.key}", ${JSON.stringify(ad)})'
          style="background:#0069d9; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">
            Tahrirlash
        </button>

        <button onclick='deleteAd("${child.key}")'
          style="background:#ff4444; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">
            O‘chirish
        </button>
      </div>
    `;

    box.appendChild(div);
  });
}

// ===============================
// E’LON O‘CHIRISH
// ===============================
window.deleteAd = async function (adId) {
  if (!confirm("Rostdan o‘chirilsinmi?")) return;

  await update(ref(db, "ads/" + adId), null);

  alert("E’lon o‘chirildi!");
  loadMyAds();
};


// ===============================
// LOGOUT
// ===============================
window.logout = () => signOut(auth);
