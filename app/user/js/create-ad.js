// ===============================
// Load Taxi Regions
// ===============================
window.regionsData = window.taxiRegionsData;

// Qayerdan → tumanlarni to‘ldirish
window.updateFromDistricts = function () {
  const region = document.getElementById("fromRegion").value;
  const districtSelect = document.getElementById("fromDistrict");

  districtSelect.innerHTML = "<option value=''>Tuman</option>";

  if (window.regionsData[region]) {
    window.regionsData[region].forEach(t => {
      districtSelect.innerHTML += `<option value="${t}">${t}</option>`;
    });
  }
};

// Qayerga → tumanlarni to‘ldirish
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
// FireBase imports
// — eski funksiyalarning barchasi saqlangan
// ===============================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  update,
  get
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";


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
const db = getDatabase(app);
const auth = getAuth(app);


// ===============================
// LOAD REGIONS INTO SELECTS
// ===============================

function loadRegions() {
  const from = document.getElementById("fromRegion");
  const to = document.getElementById("toRegion");

  from.innerHTML = `<option value="">Qayerdan (Viloyat)</option>`;
  to.innerHTML = `<option value="">Qayerga (Viloyat)</option>`;

  Object.keys(window.regionsData).forEach(r => {
    from.innerHTML += `<option value="${r}">${r}</option>`;
    to.innerHTML += `<option value="${r}">${r}</option>`;
  });
}


// ===============================
// AUTH CHECK
// ===============================
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "../../login.html";
    return;
  }
  loadRegions();
});

// ===============================
// ADD AD
// ===============================
window.addAd = async function () {
  const user = auth.currentUser;
  if (!user) return alert("Iltimos tizimga kiring");

  const data = {
    userId: user.uid,
    fromRegion: fromRegion.value,
    fromDistrict: fromDistrict.value,
    toRegion: toRegion.value,
    toDistrict: toDistrict.value,
    price: document.getElementById("price").value,
    seats: document.getElementById("seats").value,
    comment: document.getElementById("comment").value,
    departureTime: document.getElementById("time").value,
    createdAt: Date.now(),
    type: "Haydovchi/Yo‘lovchi" // ESki maydon saqlangan
  };

  await push(ref(db, "ads"), data);

  alert("E’lon joylandi!");
  window.location.href = "my-ads.html";
};

