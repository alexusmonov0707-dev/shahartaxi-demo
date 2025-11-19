// ===============================
// FIREBASE INIT
// ===============================
import { remove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
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

// ======================================================
// DOM ELEMENT REFERENCES
// ======================================================
const $ = id => document.getElementById(id);

const fullName = $("fullName");
const phone = $("phone");
const avatar = $("avatar");
const avatarInput = $("avatarInput");

const editFullName = $("editFullName");
const editPhoneInput = $("editPhoneInput");
const editBirthdate = $("editBirthdate");
const editGender = $("editGender");
const editRegion = $("editRegion");
const editDistrict = $("editDistrict");

const carModel = $("carModel");
const carNumber = $("carNumber");
const carColor = $("carColor");
const seatCount = $("seatCount");

const fromRegion = $("fromRegion");
const fromDistrict = $("fromDistrict");
const toRegion = $("toRegion");
const toDistrict = $("toDistrict");
const price = $("price");
const departureTime = $("departureTime");
const seats = $("seats");
const adComment = $("adComment");

const editFromRegion = $("editFromRegion");
const editFromDistrict = $("editFromDistrict");
const editToRegion = $("editToRegion");
const editToDistrict = $("editToDistrict");
const editPrice = $("editPrice");
const editTime = $("editTime");
const editSeats = $("editSeats");
const editComment = $("editComment");

const editModal = $("editModal");
const editAdModal = $("editAdModal");

const myAdsList = $("myAdsList");

const balanceBox = $("balanceBox");
const balanceModal = $("balanceModal");
const balanceAmount = $("balanceAmount");

window.userRole = window.userRole || "passenger";
window.userBalance = window.userBalance || 0;

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
// LOAD REGIONS (fills add-ad + edit-ad + edit-profile select)
// ===============================
function loadRegions() {
  if (!window.regionsData) return;

  // add-ad selects
  if (fromRegion) {
    fromRegion.innerHTML = `<option value="">Qayerdan (Viloyat)</option>`;
    Object.keys(window.regionsData).forEach(r => {
      fromRegion.innerHTML += `<option value="${r}">${r}</option>`;
    });
  }
  if (toRegion) {
    toRegion.innerHTML = `<option value="">Qayerga (Viloyat)</option>`;
    Object.keys(window.regionsData).forEach(r => {
      toRegion.innerHTML += `<option value="${r}">${r}</option>`;
    });
  }

  // edit-ad selects
  if (editFromRegion) {
    editFromRegion.innerHTML = `<option value="">Viloyat</option>`;
    Object.keys(window.regionsData).forEach(r => editFromRegion.innerHTML += `<option value="${r}">${r}</option>`);
  }
  if (editToRegion) {
    editToRegion.innerHTML = `<option value="">Viloyat</option>`;
    Object.keys(window.regionsData).forEach(r => editToRegion.innerHTML += `<option value="${r}">${r}</option>`);
  }

  // edit-profile region select
  if (editRegion) {
    editRegion.innerHTML = `<option value="">Viloyat</option>`;
    Object.keys(window.regionsData).forEach(r => editRegion.innerHTML += `<option value="${r}">${r}</option>`);
  }
}

// ===============================
// UPDATE DISTRICTS (for add-ad)
// ===============================
window.updateDistricts = function(type) {
  const region = document.getElementById(type + "Region").value;
  const districtSelect = document.getElementById(type + "District");
  districtSelect.innerHTML = '<option value="">Tuman</option>';
  if (window.regionsData && window.regionsData[region]) {
    window.regionsData[region].forEach(t => {
      districtSelect.innerHTML += `<option value="${t}">${t}</option>`;
    });
  }
};

// ===============================
// FILL EDIT PROFILE DISTRICTS
// ===============================
window.fillEditDistricts = function() {
  if (!editRegion || !window.regionsData) return;
  const region = editRegion.value;
  editDistrict.innerHTML = '<option value="">Tuman</option>';
  if (window.regionsData[region]) {
    window.regionsData[region].forEach(t => editDistrict.innerHTML += `<option value="${t}">${t}</option>`);
  }
};

// ===============================
// UPDATE EDIT-AD DISTRICTS
// ===============================
window.updateEditDistricts = function (type) {
  const regionId = type === "from" ? "editFromRegion" : "editToRegion";
  const districtId = type === "from" ? "editFromDistrict" : "editToDistrict";

  const region = document.getElementById(regionId).value;
  const districtSelect = document.getElementById(districtId);

  districtSelect.innerHTML = '<option value="">Tuman</option>';
  if (window.regionsData && window.regionsData[region]) {
    window.regionsData[region].forEach(t => districtSelect.innerHTML += `<option value="${t}">${t}</option>`);
  }
};

// ===============================
// LOAD USER PROFILE (expanded)
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
      seatCount: "",
      birthdate: "",
      gender: "",
      region: "",
      district: "",
      balance: 0
    });
  }

  const s = await get(ref(db, "users/" + uid));
  const u = s.exists() ? s.val() : {};

  // Basic
  if (fullName) fullName.textContent = u.fullName || "";
  if (phone) phone.textContent = u.phone || "";
  if (avatar) avatar.src = u.avatar || "https://raw.githubusercontent.com/rahmadiana/default-images/main/user-default.png";

  // Extended details block
  if ($("userDetails")) {
   $("userDetails").innerHTML = `
  <b>Tug‘ilgan sana:</b> ${u.birthdate || "-"}<br>
  <b>Jinsi:</b> ${u.gender || "-"}<br>
  <b>Viloyat:</b> ${u.region || "-"}<br>
  <b>Tuman:</b> ${u.district || "-"}
`;

  }

  // Car block
  if (u.role === "driver") {
    if ($("carDetailsBox")) $("carDetailsBox").style.display = "block";
    if ($("carDetails")) $("carDetails").innerHTML = `
      <b>Mashina modeli:</b> ${u.carModel || "-"}<br>
      <b>Davlat raqami:</b> ${u.carNumber || "-"}<br>
      <b>Rangi:</b> ${u.carColor || "-"}<br>
      <b>O‘rindiqlar soni:</b> ${u.seatCount || "-"}
    `;
  } else {
    if ($("carDetailsBox")) $("carDetailsBox").style.display = "none";
  }

  // Edit modal prefill
  if (editFullName) editFullName.value = u.fullName || "";
  if (editPhoneInput) editPhoneInput.value = u.phone || "";
  if (editBirthdate) editBirthdate.value = u.birthdate || "";
  if (editGender) editGender.value = u.gender || "";
  if (editRegion) editRegion.value = u.region || "";
  if (editDistrict) {
    // fill districts for editRegion then set value
    if (editRegion && window.regionsData && window.regionsData[editRegion.value]) {
      editDistrict.innerHTML = '<option value="">Tuman</option>';
      window.regionsData[editRegion.value].forEach(t => editDistrict.innerHTML += `<option value="${t}">${t}</option>`);
    }
    editDistrict.value = u.district || "";
  }

  if (carModel) carModel.value = u.carModel || "";
  if (carNumber) carNumber.value = u.carNumber || "";
  if (carColor) carColor.value = u.carColor || "";
  if (seatCount) seatCount.value = u.seatCount || "";

  // balance
  window.userBalance = Number(u.balance || 0);
  if (balanceBox) balanceBox.textContent = "Balans: " + window.userBalance + " so‘m";

  // role
  window.userRole = u.role || "passenger";
}

// ===============================
// ADD AD (driverSeats / passengerCount)
// ===============================
window.addAd = async function () {
  const user = auth.currentUser;
  if (!user) return alert("Iltimos, tizimga kiring.");

  const seatsVal = seats && seats.value ? seats.value.trim() : "";

  let extra = {};
  if (window.userRole === "driver") extra.driverSeats = seatsVal || "";
  else extra.passengerCount = seatsVal || "";

  extra.departureTime = departureTime ? departureTime.value : "";

  const ad = {
    userId: user.uid,
    type: window.userRole === "driver" ? "Haydovchi" : "Yo‘lovchi",
    fromRegion: fromRegion ? fromRegion.value : "",
    fromDistrict: fromDistrict ? fromDistrict.value : "",
    toRegion: toRegion ? toRegion.value : "",
    toDistrict: toDistrict ? toDistrict.value : "",
    price: price ? price.value : "",
    comment: adComment ? adComment.value : "",
    approved: false,
    createdAt: Date.now(),
    ...extra
  };

  await push(ref(db, "ads"), ad);
  alert("E’lon joylandi!");
  clearAddForm();
  loadMyAds();
};

// ===============================
// CLEAR ADD FORM
// ===============================
window.clearAddForm = function () {
  if (fromRegion) fromRegion.value = "";
  if (fromDistrict) fromDistrict.innerHTML = '<option value="">Tuman</option>';
  if (toRegion) toRegion.value = "";
  if (toDistrict) toDistrict.innerHTML = '<option value="">Tuman</option>';
  if (price) price.value = "";
  if (adComment) adComment.value = "";
  if (seats) seats.value = "";
  if (departureTime) departureTime.value = "";
};

// ===============================
// EDIT PROFILE MODAL
// ===============================
window.openEditProfile = () => { if (editModal) editModal.style.display = "flex"; };
window.closeEditProfile = () => { if (editModal) editModal.style.display = "none"; };

// ===============================
// SAVE PROFILE EDIT (includes new fields)
// ===============================
window.saveProfileEdit = async function () {
  const user = auth.currentUser;
  if (!user) return alert("Tizimga kiring.");

  const updates = {
    fullName: editFullName ? editFullName.value : "",
    phone: editPhoneInput ? editPhoneInput.value : "",
    birthdate: editBirthdate ? editBirthdate.value : "",
    gender: editGender ? editGender.value : "",
    region: editRegion ? editRegion.value : "",
    district: editDistrict ? editDistrict.value : "",
    carModel: carModel ? carModel.value : "",
    carNumber: carNumber ? carNumber.value : "",
    carColor: carColor ? carColor.value : "",
    seatCount: seatCount ? seatCount.value : ""
  };

  await update(ref(db, "users/" + user.uid), updates);
  alert("Saqlandi!");
  closeEditProfile();
  loadUserProfile(user.uid);
};

// ===============================
// AVATAR upload via ImgBB
// ===============================
window.chooseAvatar = () => { if (avatarInput) avatarInput.click(); };

if (avatarInput) {
  avatarInput.addEventListener("change", async function () {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function (e) {
      const base64 = e.target.result.split(",")[1];
      const form = new FormData();
      form.append("key", imgbbApiKey);
      form.append("image", base64);
      const res = await fetch("https://api.imgbb.com/1/upload", { method: "POST", body: form });
      const result = await res.json();
      if (!result.success) return alert("Rasm yuklashda xatolik!");
      const url = result.data.url;
      await update(ref(db, "users/" + auth.currentUser.uid), { avatar: url });
      if (avatar) avatar.src = url;
      alert("Rasm yuklandi!");
    };
    reader.readAsDataURL(file);
  });
}

// =====================================================
//          EDIT AD (open, close, save)
// =====================================================
let editingAdId = null;

window.openEditAd = function (adId, ad) {
  editingAdId = adId;
  // ensure regions filled
  loadRegions();
  if (editFromRegion) editFromRegion.value = ad.fromRegion || "";
  updateEditDistricts("from");
  if (editFromDistrict) editFromDistrict.value = ad.fromDistrict || "";

  if (editToRegion) editToRegion.value = ad.toRegion || "";
  updateEditDistricts("to");
  if (editToDistrict) editToDistrict.value = ad.toDistrict || "";

  if (editPrice) editPrice.value = ad.price || "";
  if (editTime) editTime.value = ad.departureTime || "";
  if (editComment) editComment.value = ad.comment || "";
  if (editSeats) editSeats.value = ad.driverSeats || ad.passengerCount || "";

  if (editAdModal) editAdModal.style.display = "flex";
};

window.closeEditAd = function () { if (editAdModal) editAdModal.style.display = "none"; };

window.saveAdEdit = async function () {
  if (!editingAdId) return;
  const updates = {
    fromRegion: editFromRegion ? editFromRegion.value : "",
    fromDistrict: editFromDistrict ? editFromDistrict.value : "",
    toRegion: editToRegion ? editToRegion.value : "",
    toDistrict: editToDistrict ? editToDistrict.value : "",
    price: editPrice ? editPrice.value : "",
    departureTime: editTime ? editTime.value : "",
    comment: editComment ? editComment.value : ""
  };
  if (editSeats) {
    // decide whether to save as driverSeats or passengerCount depending on user's role
    if (window.userRole === "driver") updates.driverSeats = editSeats.value || "";
    else updates.passengerCount = editSeats.value || "";
  }
  await update(ref(db, "ads/" + editingAdId), updates);
  alert("E’lon yangilandi!");
  closeEditAd();
  loadMyAds();
};

// ===============================
// LOAD MY ADS (shows seats info)
// ===============================
async function loadMyAds() {
  const user = auth.currentUser;
  if (!user) return;
  const snap = await get(ref(db, "ads"));
  const box = myAdsList;
  box.innerHTML = "";
  if (!snap.exists()) {
    box.innerHTML = "<p>Hozircha e’lon yo‘q.</p>";
    return;
  }
  snap.forEach(child => {
    const ad = child.val();
    if (ad.userId !== user.uid) return;
    const seatsInfo = ad.driverSeats ? `<br><b>Bo‘sh joylar:</b> ${ad.driverSeats} ta`
                   : ad.passengerCount ? `<br><b>Yo‘lovchilar soni:</b> ${ad.passengerCount} ta` : "";
    const created = ad.createdAt ? new Date(ad.createdAt).toLocaleString() : "";
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
      <span style="color:#333;">${ad.fromRegion || "-"}, ${ad.fromDistrict || "-"}</span>
      → <span style="color:#333;">${ad.toRegion || "-"}, ${ad.toDistrict || "-"}</span><br>
      Narx: <b style="color:#28a745;">${ad.price || "-"} so‘m</b><br>
      Jo‘nash vaqti: <span style="color:#ff8800;">${formatDatetime(ad.departureTime)}</span>
      ${seatsInfo}
      <div style="margin-top:10px; display:flex; gap:8px;">
        <button onclick='(function(){ window.openEditAd("${child.key}", ${JSON.stringify(ad).replace(/<\/script/g,"<\\/script")}); })()' style="background:#0069d9; color:#fff; padding:6px 12px; border-radius:6px;">Tahrirlash</button>
        <button onclick='(function(){ if(confirm(\"Rostdan o‘chirilsinmi?\")){ window.deleteAd(\"${child.key}\"); } })()' style="background:#ff4444; color:#fff; padding:6px 12px; border-radius:6px;">O‘chirish</button>
      </div>
      <small style="color:#777; display:block; margin-top:8px;">${created}</small>
    `;
    box.appendChild(div);
  });
}

// ===============================
// DELETE AD
// ===============================
window.deleteAd = async function (adId) {
  if (!confirm("Rostdan o‘chirilsinmi?")) return;
  await remove(ref(db, "ads/" + adId));
  alert("E’lon o‘chirildi!");
  loadMyAds();
};

// ===============================
// BALANCE HANDLERS
// ===============================
window.openBalanceModal = () => { if (balanceModal) balanceModal.style.display = "flex"; };
window.closeBalanceModal = () => { if (balanceModal) balanceModal.style.display = "none"; };

window.addBalance = async function () {
  const amount = Number(balanceAmount ? balanceAmount.value : 0);
  if (!amount || amount <= 0) return alert("Iltimos, to‘g‘ri summa kiriting.");
  if (amount < 1000) return alert("Eng kam summa 1000 so‘m.");
  const user = auth.currentUser;
  if (!user) return alert("Tizimga kiring.");
  const newBalance = (window.userBalance || 0) + amount;
  await update(ref(db, "users/" + user.uid), { balance: newBalance });
  window.userBalance = newBalance;
  if (balanceBox) balanceBox.textContent = "Balans: " + newBalance + " so‘m";
  alert("Balans to‘ldirildi!");
  closeBalanceModal();
};

// ===============================
// LOGOUT
// ===============================
window.logout = () => signOut(auth);
