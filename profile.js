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

// <-- O'Z firebaseConfig ni shu yerga qo'ying -->
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


// ===============================
// REGIONLAR (MISOL)
// ===============================
const regionsData = {
  "Toshkent": ["Bektemir", "Chilonzor", "Yunusobod", "Sergeli"],
  "Samarqand": ["Urgut", "Ishtixon", "Narpay", "Payariq"],
  "Farg‘ona": ["Qo‘qon", "Marg‘ilon", "Beshariq", "Oltiariq"],
  "Buxoro": ["Vobkent", "G‘ijduvon", "Qorako‘l", "Romitan"],
  "Namangan": ["Kosonsoy", "Chortoq", "Uchqo‘rg‘on", "Namangan sh."]
};


// ===============================
// LOGIN TEKSHIRUV
// ===============================
onAuthStateChanged(auth, user => {
  if (!user) {
    // agar user bo'lmasa login sahifasiga otkazamiz
    window.location.href = "login.html";
    return;
  }

  // user mavjud bo'lsa profile yuklanadi va viloyatlar qo'yiladi
  loadUserProfile(user.uid).catch(e => console.error("loadUserProfile:", e));
  loadRegions();
});


// ===============================
// USER MA’LUMOTINI YUKLASH
// ===============================
async function loadUserProfile(uid) {
  try {
    const snap = await get(ref(db, "users/" + uid));
    if (!snap.exists()) {
      // agar users/uid yo'q bo'lsa — default ma'lumot yozish (ixtiyoriy)
      // bu qatorni xohlasangiz yo'q qilishingiz mumkin
      await set(ref(db, "users/" + uid), {
        fullName: "Ism kiritilmagan",
        phone: "",
        avatar: ""
      });
      // va qayta o'qish
      // const snap2 = await get(ref(db, "users/" + uid));
      // u = snap2.val();
    }

    const u = (snap && snap.exists()) ? snap.val() : { fullName: "Ism kiritilmagan", phone: "", avatar: "" };

    const fullNameEl = document.getElementById("fullName");
    const phoneEl = document.getElementById("phone");
    const avatarEl = document.getElementById("avatar");

    if (fullNameEl) fullNameEl.textContent = u.fullName || "Ism ko‘rsatilmagan";
    if (phoneEl) phoneEl.textContent = u.phone || "";
    if (avatarEl) avatarEl.src = u.avatar || "https://raw.githubusercontent.com/rahmadiana/default-images/main/user-default.png";

  } catch (err) {
    console.error("loadUserProfile error:", err);
  }
}


// ===============================
// VILOYATLARNI YUKLASH
// ===============================
function loadRegions() {
  const fromRegion = document.getElementById("fromRegion");
  const toRegion = document.getElementById("toRegion");
  if (!fromRegion || !toRegion) return;

  // eski optionlarni tozalab, default birinchi optionni saqlaymiz
  const defaultFrom = fromRegion.querySelector("option") ? fromRegion.querySelector("option").outerHTML : '<option value="">Qayerdan (Viloyat)</option>';
  const defaultTo = toRegion.querySelector("option") ? toRegion.querySelector("option").outerHTML : '<option value="">Qayerga (Viloyat)</option>';

  fromRegion.innerHTML = defaultFrom;
  toRegion.innerHTML = defaultTo;

  Object.keys(regionsData).forEach(region => {
    const opt1 = document.createElement("option");
    opt1.value = region;
    opt1.textContent = region;
    fromRegion.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = region;
    opt2.textContent = region;
    toRegion.appendChild(opt2);
  });
}


// ===============================
// VILOYAT -> TUMAN
// ===============================
window.updateDistricts = function(type) {
  try {
    const regionSelect = document.getElementById(type + "Region");
    const districtSelect = document.getElementById(type + "District");
    if (!regionSelect || !districtSelect) return;

    const region = regionSelect.value;

    // default optionni saqlab qo'yamiz
    let defaultOptionHtml = '<option value="">Tuman</option>';
    // agar toDistrict/fromDistrict ichida default bosh option bor bo'lsa, shu qoladi
    districtSelect.innerHTML = defaultOptionHtml;

    if (!region || !regionsData[region]) return;

    regionsData[region].forEach(d => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      districtSelect.appendChild(opt);
    });
  } catch (e) {
    console.error("updateDistricts error:", e);
  }
};


// ===============================
// E'lonlarni yuklash (placeholder)
// ===============================
async function loadMyAds(uid) {
  // Hozircha placeholder — kerak bo'lsa keyin to'ldiramiz
  const myAdsEl = document.getElementById("myAds");
  if (!myAdsEl) return;
  myAdsEl.innerHTML = `<div style="color:#777;font-size:14px">Hozircha e'lon yo'q.</div>`;
}


// ===============================
// E’LON QO‘SHISH
// ===============================
window.addAd = async function () {
  try {
    const type = document.getElementById("adType").value;
    const fromRegion = document.getElementById("fromRegion").value;
    const fromDistrict = document.getElementById("fromDistrict").value;
    const toRegion = document.getElementById("toRegion").value;
    const toDistrict = document.getElementById("toDistrict").value;
    const price = document.getElementById("price").value;
    const comment = document.getElementById("adComment").value;

    if (!type || !fromRegion || !fromDistrict || !toRegion || !toDistrict) {
      alert("Barcha maydonlarni to‘ldiring!");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      alert("Siz tizimga kirmagansiz.");
      return;
    }

    const ad = {
      userId: user.uid,
      type,
      fromRegion,
      fromDistrict,
      toRegion,
      toDistrict,
      price: price ? Number(price) : 0,
      comment: comment || "",
      approved: false,
      createdAt: Date.now()
    };

    await push(ref(db, "ads"), ad);

    alert("E’lon muvaffaqiyatli joylandi!");
    clearAddForm();
    // agar kerak bo'lsa loadMyAds(user.uid) chaqirish mumkin
    loadMyAds(user.uid);
  } catch (err) {
    console.error("addAd error:", err);
    alert("E'lon qo'shishda xatolik yuz berdi.");
  }
};


// ===============================
// FORM TOZALASH
// ===============================
window.clearAddForm = function () {
  const adType = document.getElementById("adType");
  const fromRegion = document.getElementById("fromRegion");
  const fromDistrict = document.getElementById("fromDistrict");
  const toRegion = document.getElementById("toRegion");
  const toDistrict = document.getElementById("toDistrict");
  const price = document.getElementById("price");
  const adComment = document.getElementById("adComment");

  if (adType) adType.value = "";
  if (fromRegion) fromRegion.value = "";
  if (fromDistrict) fromDistrict.innerHTML = '<option value="">Tuman</option>';
  if (toRegion) toRegion.value = "";
  if (toDistrict) toDistrict.innerHTML = '<option value="">Tuman</option>';
  if (price) price.value = "";
  if (adComment) adComment.value = "";
};


// ===============================
// PROFIL TAHRIRLASH MODAL
// ===============================
window.openEditProfile = function () {
  const editModal = document.getElementById("editModal");
  if (!editModal) return;
  const fullNameEl = document.getElementById("fullName");
  const phoneEl = document.getElementById("phone");

  document.getElementById("editFullName").value = fullNameEl ? fullNameEl.textContent : "";
  document.getElementById("editPhoneInput").value = phoneEl ? phoneEl.textContent : "";

  editModal.style.display = "flex";
};

window.closeEditProfile = function () {
  const editModal = document.getElementById("editModal");
  if (!editModal) return;
  editModal.style.display = "none";
};


// ===============================
// PROFILNI SAQLASH
// ===============================
window.saveProfileEdit = async function () {
  try {
    const name = document.getElementById("editFullName").value;
    const phone = document.getElementById("editPhoneInput").value;

    const user = auth.currentUser;
    if (!user) {
      alert("Tizimga kirilmagan.");
      return;
    }

    await update(ref(db, "users/" + user.uid), {
      fullName: name,
      phone: phone
    });

    alert("Profil muvaffaqiyatli saqlandi!");
    // close modal va yangilanish
    closeEditProfile();
    // Profil ekranini yangilash
    loadUserProfile(user.uid).catch(e => console.error(e));
  } catch (err) {
    console.error("saveProfileEdit error:", err);
    alert("Profilni saqlashda xatolik yuz berdi.");
  }
};


// ===============================
// CHIQISH
// ===============================
window.logout = function () {
  signOut(auth).catch(e => {
    console.error("logout error:", e);
    alert("Chiqishda xatolik yuz berdi.");
  });
};


// ===============================
// (Ixtiyoriy) sahifa yuklanganda bir marta defaultlarni tiklash
// ===============================
window.addEventListener("DOMContentLoaded", () => {
  // agar elementlar yo'q bo'lsa, xato bermaslik uchun tekshiramiz
  try {
    // agar sahifa allaqachon logged-in bo'lsa regions yuklanadi onAuthStateChanged ichida,
    // lekin logindan oldin ham select elementlari bor bo'lsa defaultlarni tiklab qo'yamiz
    const fromDistrict = document.getElementById("fromDistrict");
    const toDistrict = document.getElementById("toDistrict");
    if (fromDistrict && fromDistrict.innerHTML.trim() === "") fromDistrict.innerHTML = '<option value="">Tuman</option>';
    if (toDistrict && toDistrict.innerHTML.trim() === "") toDistrict.innerHTML = '<option value="">Tuman</option>';
  } catch (e) {
    console.warn(e);
  }
});
