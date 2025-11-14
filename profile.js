// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getDatabase, ref, set, get, update } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyApWUG40yUC9aCsE9MOLXwLcYgRihREWvc",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
  projectId: "shahartaxi-demo",
  storageBucket: "shahartaxi-demo.firebasestorage.app",
  messagingSenderId: "874241795701",
  appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};


// Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Helper
const $ = id => document.getElementById(id);

// Regions + districts
const regions = {
  "Toshkent": ["Bektemir","Chilonzor","Mirzo Ulug'bek","Mirobod"],
  "Samarqand": ["Bulung'ur","Ishtixon","Urgut","Kattaqo'rg'on"],
  "Namangan": ["Pop","Chust","Norin","To'raqo'rg'on"],
  "Andijon": ["Asaka","Andijon sh.","Marhamat"],
  "Farg'ona": ["Qo'qon","Qo'rg'ontepa","Beshariq"],
  "Buxoro": ["Buxoro sh.","G'ijduvon","Jondor"],
  "Xorazm": ["Urganch","Xiva","Shovot"],
  "Qashqadaryo": ["Qarshi","G'uzor","Kitob"]
};

// Load regions into selects
function loadRegions() {
  let r1 = "", r2 = "";
  Object.keys(regions).forEach(r => {
    r1 += `<option value="${r}">${r}</option>`;
    r2 += `<option value="${r}">${r}</option>`;
  });
  $("#fromRegion").innerHTML = r1;
  $("#toRegion").innerHTML = r2;
}

// Update districts
function updateDistricts(type) {
  const region = type === "from"
    ? $("#fromRegion").value
    : $("#toRegion").value;

  const select = type === "from" ? $("#fromDistrict") : $("#toDistrict");

  select.innerHTML = "";

  if (!region) return;

  regions[region].forEach(t => {
    select.innerHTML += `<option value="${t}">${t}</option>`;
  });
}

window.updateDistricts = updateDistricts;

// Current user
let currentUser = null;

// Auth listener
onAuthStateChanged(auth, async user => {
  if (user) {
    currentUser = user;
    loadRegions();
    loadMyProfile();
    loadMyAds();
  } else {
    window.location.href = "login.html";
  }
});

// Load profile info
async function loadMyProfile() {
  const snap = await get(ref(db, "users/" + currentUser.uid));

  if (snap.exists()) {
    const u = snap.val();
    $("#profileName").innerText = u.displayName || "Foydalanuvchi";
    $("#profilePhone").innerText = u.phoneNumber || "—";
  }
}

// ---------- ADD AD ----------
async function addAd() {
  if (!currentUser) return alert("Avval tizimga kiring!");

  const type = $("#adType").value;
  const fromRegion = $("#fromRegion").value;
  const fromDistrict = $("#fromDistrict").value;
  const toRegion = $("#toRegion").value;
  const toDistrict = $("#toDistrict").value;
  const price = $("#price").value;
  const comment = $("#adComment").value;

  if (!type || !fromRegion || !fromDistrict || !toRegion || !toDistrict) {
    return alert("Hamma maydonlarni to‘ldiring!");
  }

  const adId = Date.now();
  const data = {
    id: adId,
    userId: currentUser.uid,
    type,
    fromRegion,
    fromDistrict,
    toRegion,
    toDistrict,
    price,
    comment,
    status: "pending",
    createdAt: new Date().toISOString()
  };

  await set(ref(db, "ads/" + adId), data);

  alert("E’lon yuborildi! Admin tasdiqlashi kerak.");
  clearAddForm();
  loadMyAds();
}

window.addAd = addAd;

// ---------- CLEAR FORM ----------
function clearAddForm() {
  $("#adType").value = "";
  $("#fromRegion").value = "";
  $("#fromDistrict").innerHTML = "";
  $("#toRegion").value = "";
  $("#toDistrict").innerHTML = "";
  $("#price").value = "";
  $("#adComment").value = "";
}

window.clearAddForm = clearAddForm;

// ---------- LOAD MY ADS ----------
async function loadMyAds() {
  const snap = await get(ref(db, "ads"));
  const box = $("#myAds");
  box.innerHTML = "";

  if (!snap.exists()) {
    box.innerHTML = "<p>Hozircha e’lonlar yo‘q</p>";
    return;
  }

  snap.forEach(s => {
    const ad = s.val();
    if (ad.userId !== currentUser.uid) return;

    const item = document.createElement("div");
    item.className = "ad-box";
    item.innerHTML = `
      <div><b>${ad.type === "driver" ? "Haydovchi" : "Yo‘lovchi"}</b></div>
      <div>${ad.fromRegion} → ${ad.toRegion}</div>
      <div>${ad.fromDistrict} → ${ad.toDistrict}</div>
      <div>Narx: ${ad.price} so‘m</div>
      <div class="date-info">${ad.createdAt}</div>
      <div class="date-info">Holat: ${ad.status}</div>
    `;
    box.appendChild(item);
  });
}

// ---------- PROFILE EDIT ----------
window.openEditProfile = () => {
  $("#editProfileModal").style.display = "flex";
};

window.closeEditProfile = () => {
  $("#editProfileModal").style.display = "none";
};

window.saveProfileEdit = async () => {
  const name = $("#editFullName").value.trim();
  const phone = $("#editPhoneInput").value.trim();

  if (!name || !phone) return alert("Ism va telefonni kiriting!");

  await update(ref(db, "users/" + currentUser.uid), {
    displayName: name,
    phoneNumber: phone
  });

  closeEditProfile();
  loadMyProfile();
};

// ---------- LOGOUT ----------
window.logout = () => signOut(auth);
