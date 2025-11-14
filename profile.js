// Firebase (modul emas — global import)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getDatabase, ref, set, get, update, push, onValue, remove
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// -----------------------------------------------------------
// Firebase config — SENING PROYEKTING
// -----------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyApWUG40YuC9aCsE9MOLXwLcYgRihREWvc",
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

// -----------------------------------------------------------
// Global helpers
// -----------------------------------------------------------
const $ = id => document.getElementById(id);

const regions = {
  "Toshkent": ["Bektemir","Chilonzor","Mirzo Ulug'bek","Mirobod"],
  "Samarqand": ["Bulungur","Ishtixon","Urgut","Kattaqo'rg'on"],
  "Namangan": ["Pop","Chust","To'raqo'rg'on"],
  "Andijon": ["Asaka","Andijon sh.","Marhamat"],
  "Farg'ona": ["Qo'qon","Qo'rg'ontepa","Beshariq"],
  "Buxoro": ["Buxoro sh.","G'ijduvon","Jondor"],
  "Xorazm": ["Urganch","Xiva","Shovot"],
  "Qashqadaryo": ["Qarshi","G'uzor","Kitob"]
};

let currentUser = null;
let lastStatuses = {};

// -----------------------------------------------------------
// AUTH LISTENER
// -----------------------------------------------------------
onAuthStateChanged(auth, async user => {
  currentUser = user;

  if (user) {
    // user bo‘lsa malumotlarni yuklaymiz
    try {
      await update(ref(db, `users/${user.uid}`), {
        phone: user.phoneNumber || "",
        name: user.displayName || user.phoneNumber || ""
      });
    } catch {
      await set(ref(db, `users/${user.uid}`), {
        phone: user.phoneNumber || "",
        name: user.displayName || user.phoneNumber || ""
      });
    }

    loadUserProfile();
    loadRegionsToSelects();
    loadUserAds();
    startStatusSync();
  }
});

// -----------------------------------------------------------
// PROFILE LOAD
// -----------------------------------------------------------
async function loadUserProfile(){
  if(!currentUser) return;
  const s = await get(ref(db, `users/${currentUser.uid}`));
  const d = s.val() || {};

  $("profileName").textContent = d.name || "Foydalanuvchi";
  $("profilePhone").textContent = d.phone || "—";
  $("profileRatingBig").textContent = d.ratingAvg ? `${d.ratingAvg} / 5` : "—";
  $("profileRatingCount").textContent = d.ratingCount ? `${d.ratingCount} ta baho` : "—";
}

// -----------------------------------------------------------
// REGIONS / DISTRICTS
// -----------------------------------------------------------
function loadRegionsToSelects() {
  ["fromRegion", "toRegion"].forEach(id => {
    const sel = $(id);
    sel.innerHTML = `<option value="">Viloyatni tanlang</option>`;
    for (let r in regions) {
      sel.innerHTML += `<option value="${r}">${r}</option>`;
    }
  });

  $("fromDistrict").innerHTML = `<option value="">Tumanni tanlang</option>`;
  $("toDistrict").innerHTML = `<option value="">Tumanni tanlang</option>`;
}

function updateDistricts(prefix) {
  const region = $(`${prefix}Region`).value;
  const dist = $(`${prefix}District`);
  dist.innerHTML = `<option value="">Tumanni tanlang</option>`;

  if (region && regions[region]) {
    regions[region].forEach(d => {
      dist.innerHTML += `<option value="${d}">${d}</option>`;
    });
  }
}

// -----------------------------------------------------------
// ADD AD
// -----------------------------------------------------------
async function addAd(){
  if(!currentUser) return alert("Avval tizimga kiring");

  const type = $("adType").value;
  const fr = $("fromRegion").value;
  const fd = $("fromDistrict").value;
  const tr = $("toRegion").value;
  const td = $("toDistrict").value;
  const price = $("price").value;
  const comment = $("adComment").value.trim();

  if(!type || !fr || !tr)
    return alert("Yo‘nalishni to‘liq kiriting");

  const newAdRef = push(ref(db, "ads"));
  const adId = newAdRef.key;

  const ad = {
    id: adId,
    ownerUid: currentUser.uid,
    ownerPhone: currentUser.phoneNumber || "",
    type,
    fromRegion: fr,
    fromDistrict: fd,
    toRegion: tr,
    toDistrict: td,
    price,
    comment,
    status: "pending",
    createdAt: new Date().toISOString()
  };

  await set(ref(db, `ads/${adId}`), ad);
  await set(ref(db, `userAds/${currentUser.uid}/${adId}`), ad);
  await set(ref(db, `pendingAds/${adId}`), ad);

  alert("E'lon yuborildi! Admin tasdiqlashi kerak.");
  clearAddForm();
}

function clearAddForm(){
  $("adType").value = "";
  $("fromRegion").value = "";
  $("fromDistrict").innerHTML = `<option value="">Tumanni tanlang</option>`;
  $("toRegion").value = "";
  $("toDistrict").innerHTML = `<option value="">Tumanni tanlang</option>`;
  $("price").value = "";
  $("adComment").value = "";
}

// -----------------------------------------------------------
// LOAD ADS
// -----------------------------------------------------------
function loadUserAds(){
  const r = ref(db, `userAds/${currentUser.uid}`);
  onValue(r, snap => {
    const ads = snap.val() || {};
    renderAds(Object.values(ads));
  });
}

function renderAds(list){
  const box = $("myAds");
  box.innerHTML = "";

  if (!list.length) {
    box.innerHTML = "<p>Hozircha e’lonlar yo‘q.</p>";
    return;
  }

  list.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

  list.forEach(ad => {
    const div = document.createElement("div");
    div.className = "ad-box";
    div.innerHTML = `
      <div><b>Yo'nalish:</b> ${ad.fromRegion} → ${ad.toRegion}</div>
      <div><b>Narx:</b> ${ad.price} so‘m</div>
      <div><b>Telefon:</b> ${ad.ownerPhone}</div>
      <div class="date-info">${new Date(ad.createdAt).toLocaleString()} · Holat: ${ad.status}</div>
      <div style="margin-top:8px;display:flex;gap:8px">
        <button onclick="startEditAd('${ad.id}')">Tahrirlash</button>
        <button onclick="deleteAd('${ad.id}')">O‘chirish</button>
      </div>
    `;
    box.appendChild(div);
  });
}

// -----------------------------------------------------------
// EDIT / DELETE
// -----------------------------------------------------------
async function startEditAd(id){
  const s = await get(ref(db, `userAds/${currentUser.uid}/${id}`));
  const ad = s.val();

  if (!ad) return alert("E'lon topilmadi");
  if (ad.status === "approved") return alert("Tasdiqlangan elonni o‘zgartirish mumkin emas");

  const np = prompt("Yangi narx:", ad.price);
  if (np === null) return;

  const upd = { price: np, status: "pending", editedAt: new Date().toISOString() };

  await update(ref(db, `ads/${id}`), upd);
  await update(ref(db, `userAds/${currentUser.uid}/${id}`), upd);
  await update(ref(db, `pendingAds/${id}`), upd);

  alert("E'lon yangilandi, admin tasdiqlashi kerak.");
}

async function deleteAd(id){
  if (!confirm("O‘chirishni tasdiqlaysizmi?")) return;

  await remove(ref(db, `ads/${id}`));
  await remove(ref(db, `userAds/${currentUser.uid}/${id}`));
  await remove(ref(db, `pendingAds/${id}`));

  alert("E'lon o‘chirildi");
}

// -----------------------------------------------------------
// STATUS NOTIFIER
// -----------------------------------------------------------
function startStatusSync(){
  const r = ref(db, `userAds/${currentUser.uid}`);
  onValue(r, s => {
    const ads = s.val() || {};
    Object.values(ads).forEach(ad => {
      if (lastStatuses[ad.id] && lastStatuses[ad.id] !== ad.status) {
        if (ad.status === "approved") alert("✅ E'lon tasdiqlandi");
        if (ad.status === "rejected") alert("❌ E'lon rad etildi");
      }
      lastStatuses[ad.id] = ad.status;
    });
  });
}

// -----------------------------------------------------------
// LOGOUT
// -----------------------------------------------------------
function logout(){
  signOut(auth);
  alert("Chiqdingiz!");
  location.href = "/";
}

// -----------------------------------------------------------
// EXPORT GLOBAL
// -----------------------------------------------------------
window.addAd = addAd;
window.clearAddForm = clearAddForm;
window.updateDistricts = updateDistricts;
window.startEditAd = startEditAd;
window.deleteAd = deleteAd;
window.logout = logout;
window.loadRegionsToSelects = loadRegionsToSelects;
