// ===============================
// FIREBASE INIT
// (original imports preserved)
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
// DOM ELEMENT REFERENCES (safe queries — keep original globals working too)
// ======================================================
const getEl = id => document.getElementById(id);
const fullName = getEl("fullName") || window.fullName;
const phone = getEl("phone") || window.phone;
const avatar = getEl("avatar") || window.avatar;

const editFullName = getEl("editFullName") || window.editFullName;
const editPhoneInput = getEl("editPhoneInput") || window.editPhoneInput;

const carModel = getEl("carModel") || window.carModel;
const carNumber = getEl("carNumber") || window.carNumber;
const carColor = getEl("carColor") || window.carColor;
const seatCount = getEl("seatCount") || window.seatCount;

const fromRegion = getEl("fromRegion") || window.fromRegion;
const fromDistrict = getEl("fromDistrict") || window.fromDistrict;
const toRegion = getEl("toRegion") || window.toRegion;
const toDistrict = getEl("toDistrict") || window.toDistrict;
const price = getEl("price") || window.price;
const departureTime = getEl("departureTime") || window.departureTime;
const seats = getEl("seats") || window.seats; // add/ad form seats input (used for both roles)
const adComment = getEl("adComment") || window.adComment;

const editFromRegion = getEl("editFromRegion") || window.editFromRegion;
const editFromDistrict = getEl("editFromDistrict") || window.editFromDistrict;
const editToRegion = getEl("editToRegion") || window.editToRegion;
const editToDistrict = getEl("editToDistrict") || window.editToDistrict;
const editPrice = getEl("editPrice") || window.editPrice;
const editTime = getEl("editTime") || window.editTime;
const editComment = getEl("editComment") || window.editComment;

const editModal = getEl("editModal") || window.editModal;
const editAdModal = getEl("editAdModal") || window.editAdModal;

const avatarInput = getEl("avatarInput") || window.avatarInput;

const myAdsList = getEl("myAdsList") || window.myAdsList;

// NEW: balance UI elements (ensure these exist in HTML)
const balanceBox = getEl("balanceBox");
const balanceModal = getEl("balanceModal");
const balanceAmount = getEl("balanceAmount");

// safety default windows for backward compatibility
window.userRole = window.userRole || "passenger";
window.userBalance = window.userBalance || 0;

// ===============================
// DATETIME FORMAT (kept original)
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
// LOGIN STATE (kept original)
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
// PROFIL YUKLASH (expanded — new fields + balance)
// ===============================
async function loadUserProfile(uid) {
  const snap = await get(ref(db, "users/" + uid));

  if (!snap.exists()) {
    // create a default structure with new fields preserved
    await set(ref(db, "users/" + uid), {
      fullName: "",
      phone: "",
      avatar: "",
      role: "passenger",   // driver | passenger
      carModel: "",
      carNumber: "",
      carColor: "",
      seatCount: "",       // driver's car seats default
      birthdate: "",
      gender: "",
      region: "",
      district: "",
      balance: 0
    });
  }

  // re-fetch snapshot to get values if just created
  const s = await get(ref(db, "users/" + uid));
  const u = s.exists() ? s.val() : {};

  // UI updates (keeping original fields)
  if (fullName) fullName.textContent = u.fullName || "";
  if (phone) phone.textContent = u.phone || "";
  if (avatar) avatar.src = u.avatar || "https://raw.githubusercontent.com/rahmadiana/default-images/main/user-default.png";

  // Edit modal inputs
  if (editFullName) editFullName.value = u.fullName || "";
  if (editPhoneInput) editPhoneInput.value = u.phone || "";

  if (carModel) carModel.value = u.carModel || "";
  if (carNumber) carNumber.value = u.carNumber || "";
  if (carColor) carColor.value = u.carColor || "";
  if (seatCount) seatCount.value = u.seatCount || "";

  // new optional fields (if you add inputs for them later, they can be filled here)
  // e.g. birthdateInput.value = u.birthdate || "";

  // show/hide car inputs based on role (original approach preserved)
  ["carModel", "carNumber", "carColor", "seatCount"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = (u.role === "driver") ? "block" : "none";
  });

  // balance display
  window.userBalance = Number(u.balance || 0);
  if (balanceBox) balanceBox.textContent = "Balans: " + window.userBalance + " so‘m";

  // store role globally
  window.userRole = u.role || "passenger";
}

// ===============================
// VILOYATLARNI YUKLASH (kept original)
// ===============================
function loadRegions() {
  if (!fromRegion || !toRegion) return;

  fromRegion.innerHTML = `<option value="">Qayerdan (Viloyat)</option>`;
  toRegion.innerHTML = `<option value="">Qayerga (Viloyat)</option>`;

  if (!window.regionsData) return;

  Object.keys(window.regionsData).forEach(region => {
    fromRegion.innerHTML += `<option value="${region}">${region}</option>`;
    toRegion.innerHTML += `<option value="${region}">${region}</option>`;
  });
}

// ===============================
// TUMANLARNI YUKLASH (kept original)
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
// E'LON QO‘SHISH (UPDATED: driverSeats / passengerCount)
// ===============================
window.addAd = async function () {
  const user = auth.currentUser;
  if (!user) return alert("Iltimos, tizimga kiring.");

  let extraInfo = {};

  // IMPORTANT: use the 'seats' input in the add-ad form.
  // If user is driver -> store as driverSeats
  // If user is passenger -> store as passengerCount
  const seatsVal = seats && seats.value ? seats.value.trim() : "";

  if (window.userRole === "driver") {
    extraInfo.driverSeats = seatsVal || ""; // driver specifies how many free seats for this trip
  } else {
    extraInfo.passengerCount = seatsVal || ""; // passenger: how many people travelling
  }

  extraInfo.departureTime = departureTime.value || "";

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
    ...extraInfo
  };

  await push(ref(db, "ads"), ad);

  alert("E’lon joylandi!");
  clearAddForm();
  loadMyAds();
};

// ===============================
// CLEAR FORM (kept original)
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
// PROFIL MODAL (kept original toggles)
// ===============================
window.openEditProfile = () => { if (editModal) editModal.style.display = "flex"; };
window.closeEditProfile = () => { if (editModal) editModal.style.display = "none"; };

// ===============================
// PROFIL SAQLASH (expanded fields saved)
// ===============================
window.saveProfileEdit = async function () {
  const user = auth.currentUser;
  if (!user) return alert("Tizimga kiring.");

  const updates = {
    fullName: editFullName ? editFullName.value : "",
    phone: editPhoneInput ? editPhoneInput.value : "",
    carModel: carModel ? carModel.value : "",
    carNumber: carNumber ? carNumber.value : "",
    carColor: carColor ? carColor.value : "",
    seatCount: seatCount ? seatCount.value : ""
    // If you add birthdate/gender/region/district inputs in modal, include them here e.g.
    // birthdate: birthdateInput.value, gender: genderInput.value, region: regionInput.value, district: districtInput.value
  };

  await update(ref(db, "users/" + user.uid), updates);
  alert("Saqlandi!");
  closeEditProfile();
  loadUserProfile(user.uid);
};

// ===============================
// AVATAR — ImgBB (kept original)
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

      const res = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        body: form
      });

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
//          🔥 E’LONNI TAHRIRLASH (kept original + small fix)
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

  // If the ad has driverSeats or passengerCount, and if you added an edit field for seats, set it here.
  // e.g. editSeats.value = ad.driverSeats || ad.passengerCount || "";

  if (editAdModal) editAdModal.style.display = "flex";
};

// 2) Modalni yopish
window.closeEditAd = function () {
  if (editAdModal) editAdModal.style.display = "none";
};

// 3) Modalga viloyatlarni yuklash (kept original)
function loadEditRegions() {
  if (!editFromRegion || !editToRegion) return;
  editFromRegion.innerHTML = '<option value="">Viloyat</option>';
  editToRegion.innerHTML = '<option value="">Viloyat</option>';

  if (!window.regionsData) return;
  Object.keys(window.regionsData).forEach(r => {
    editFromRegion.innerHTML += `<option value="${r}">${r}</option>`;
    editToRegion.innerHTML += `<option value="${r}">${r}</option>`;
  });
}

// 4) Tumanlarni yangilash (kept original)
window.updateEditDistricts = function (type) {
  const regionId = type === "from" ? "editFromRegion" : "editToRegion";
  const districtId = type === "from" ? "editFromDistrict" : "editToDistrict";

  const region = document.getElementById(regionId).value;
  const districtSelect = document.getElementById(districtId);

  districtSelect.innerHTML = '<option value="">Tuman</option>';

  if (window.regionsData && window.regionsData[region]) {
    window.regionsData[region].forEach(t =>
      districtSelect.innerHTML += `<option value="${t}">${t}</option>`
    );
  }
};

// 5) E’lonni saqlash (original + preserve seats if included in edit modal)
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

  // if you add an editSeats input to the edit ad modal, include it:
  // updates.driverSeats = editSeats.value;

  await update(ref(db, "ads/" + editingAdId), updates);

  alert("E’lon yangilandi!");
  closeEditAd();
  loadMyAds();
};

// ===============================
// MENING E'lonlarIM (expanded: show driverSeats/passengerCount)
// ===============================
async function loadMyAds() {
  const user = auth.currentUser;
  if (!user) return;

  const snap = await get(ref(db, "ads"));
  const box = myAdsList || document.getElementById("myAdsList");
  if (!box) return;

  box.innerHTML = "";

  if (!snap.exists()) {
    box.innerHTML = "<p>Hozircha e’lon yo‘q.</p>";
    return;
  }

  snap.forEach(child => {
    const ad = child.val();
    if (ad.userId !== user.uid) return;

    const seatsInfo =
      ad.driverSeats ? `<br><b>Bo‘sh joylar:</b> ${ad.driverSeats} ta` :
      ad.passengerCount ? `<br><b>Yo‘lovchilar soni:</b> ${ad.passengerCount} ta` : "";

    const created = ad.createdAt ? new Date(ad.createdAt).toLocaleString() : "";

    const div = document.createElement("div");
    div.style = `
      padding:12px;
      border:1px solid #ddd;
      border-radius:10px;
      margin-bottom:12px;
      background:#f8faff;
    `;

    // Use JSON.stringify(ad) safely by escaping quotes — simpler: pass as onclick with a wrapper function
    div.innerHTML = `
      <b style="color:#0069d9;">${ad.type}</b><br>
      <span style="color:#333;">${ad.fromRegion || "-"}, ${ad.fromDistrict || "-"}</span>
      →
      <span style="color:#333;">${ad.toRegion || "-"}, ${ad.toDistrict || "-"}</span><br>

      Narx: <b style="color:#28a745;">${ad.price || "-"} so‘m</b><br>
      Jo‘nash vaqti: <span style="color:#ff8800;">${formatDatetime(ad.departureTime)}</span>
      ${seatsInfo}
      <div style="margin-top:10px; display:flex; gap:8px;">
        <button class="edit-btn" onclick='(function(){ window.openEditAd("${child.key}", ${JSON.stringify(ad).replace(/<\/script/g, "<\\/script")}); })()'
          style="background:#0069d9; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">
            Tahrirlash
        </button>

        <button class="delete-btn" onclick='(function(){ if(confirm(\"Rostdan o‘chirilsinmi?\")){ window.deleteAd(\"${child.key}\"); } })()'
          style="background:#ff4444; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">
            O‘chirish
        </button>
      </div>

      <small style="color:#777; display:block; margin-top:8px;">${created}</small>
    `;

    box.appendChild(div);
  });
}

// ===============================
// E’LON O‘CHIRISH (kept original)
// ===============================
window.deleteAd = async function (adId) {
  if (!confirm("Rostdan o‘chirilsinmi?")) return;

  await remove(ref(db, "ads/" + adId));

  alert("E’lon o‘chirildi!");
  loadMyAds();
};

// ===============================
// BALANS MODAL HANDLERS (NEW)
// ===============================
window.openBalanceModal = () => {
  if (balanceModal) balanceModal.style.display = "flex";
};
window.closeBalanceModal = () => {
  if (balanceModal) balanceModal.style.display = "none";
};

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
// LOGOUT (kept original)
// ===============================
window.logout = () => signOut(auth);
