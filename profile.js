/* =========================================================
      SHAHARTAXI — PROFILE.JS (FIREBASE ONLY VERSION)
      Qism 1/3 — Firebase Init, Auth, User Profile
   ========================================================= */

// -----------------------------
// Firebase config
// -----------------------------
const firebaseConfig = {
  apiKey: "AIzaSyApWUG40YuC9aCsE9MOLXwLcYgRihREWvc",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
  projectId: "shahartaxi-demo",
  storageBucket: "shahartaxi-demo.firebasestorage.app",
  messagingSenderId: "874241795701",
  appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

let currentUser = null; // Firebase foydalanuvchi
let userData = null;    // DB dagi user ma’lumoti

// =========================================================
//                AUTH STATE LISTENER
// =========================================================
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    console.warn("❗ User tizimga kirmagan");
    return;
  }

  currentUser = user;

  // User bazada bor yoki yo‘qligini tekshiramiz
  await db.ref("users/" + user.uid).update({
    phone: user.phoneNumber,
    name: user.phoneNumber,  // birinchi marta kirganda ism – telefon bo'ladi
  });

  // User ma’lumotlarini yuklaymiz
  const snap = await db.ref("users/" + user.uid).once("value");
  userData = snap.val() || {};

  updateProfileHeader(userData);

  // E’lonlarni yuklash (2-qismda to‘liq kodini beraman)
  loadUserAds(user.uid);
});

// =========================================================
//          PROFIL HEADERNI YANGILASH
// =========================================================
function updateProfileHeader(user) {
  document.getElementById("profileName").textContent = user.name || "Foydalanuvchi";
  document.getElementById("profilePhone").textContent = user.phone || "—";

  if (user.ratingAvg) {
    document.getElementById("profileRatingBig").textContent = user.ratingAvg;
    document.getElementById("profileRatingCount").textContent =
      `${user.ratingCount || 0} ta baho`;
  } else {
    document.getElementById("profileRatingBig").textContent = "—";
    document.getElementById("profileRatingCount").textContent = "Hozircha baholar yo‘q";
  }
}

// =========================================================
//               PROFIL TAHRIR MODALI
// =========================================================
function openEditProfile() {
  if (!currentUser) return;

  document.getElementById("editFullName").value = userData.name || "";
  document.getElementById("editPhoneInput").value = userData.phone || "";

  document.getElementById("editProfileModal").style.display = "flex";
}

function closeEditProfile() {
  document.getElementById("editProfileModal").style.display = "none";
}

// =========================================================
//              PROFILNI SAQLASH (+998 validation)
// =========================================================
async function saveProfileEdit() {
  const fullName = document.getElementById("editFullName").value.trim();
  const phone = document.getElementById("editPhoneInput").value.trim();

  const phoneRegex = /^\+998\d{9}$/;
  if (!phoneRegex.test(phone)) {
    alert("Telefon raqamni +998 bilan to‘g‘ri kiriting!");
    return;
  }

  await db.ref("users/" + currentUser.uid).update({
    name: fullName,
    phone: phone
  });

  userData.name = fullName;
  userData.phone = phone;

  updateProfileHeader(userData);
  closeEditProfile();

  alert("✔ Profil yangilandi!");
}

// =========================================================
//                 REGIONLARNI YUKLASH
// =========================================================
const regions = {
  "Toshkent": ["Bektemir","Chilonzor","Mirzo Ulug'bek","Mirobod"],
  "Samarqand": ["Bulungur","Ishtixon","Urgut","Kattaqo'rg'on"],
  "Namangan": ["Pop","Chust","To'raqo'rg'on"],
  "Andijon": ["Asaka","Andijon sh.","Marhamat"],
  "Farg'ona": ["Qo'qon","Qo'rg'ontepa","Beshariq"],
  "Buxoro": ["Buxoro sh.","G‘ijduvon","Jondor"],
  "Xorazm": ["Urgench","Xiva","Shovot"],
  "Qashqadaryo": ["Qarshi","G‘uzor","Kitob"]
};

function loadRegionsToSelects() {
  ["fromRegion","toRegion","filterFromRegion","filterToRegion"].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = `<option value="">Viloyatni tanlang</option>`;
    Object.keys(regions).forEach(r => {
      sel.innerHTML += `<option value="${r}">${r}</option>`;
    });
  });
}

function updateDistricts(prefix) {
  const region = document.getElementById(prefix + "Region").value;
  const distSel = document.getElementById(prefix + "District");
  distSel.innerHTML = `<option value="">Tumanni tanlang</option>`;
  if (region) {
    regions[region].forEach(d => {
      distSel.innerHTML += `<option value="${d}">${d}</option>`;
    });
  }
}
/* =========================================================
      SHAHARTAXI — PROFILE.JS (FIREBASE ONLY VERSION)
      Qism 2/3 — Ads: add, realtime, render, edit, delete
   ========================================================= */


/* =========================================================
      1) Yangi e’lon qo‘shish (Firebase Realtime DB)
   ========================================================= */
async function addAd() {
  if (!currentUser) {
    alert("Iltimos tizimga kiring!");
    return;
  }

  const type = document.getElementById("adType").value;
  const fromRegion = document.getElementById("fromRegion").value;
  const fromDistrict = document.getElementById("fromDistrict").value;
  const toRegion = document.getElementById("toRegion").value;
  const toDistrict = document.getElementById("toDistrict").value;
  const price = document.getElementById("price").value.trim();
  const comment = document.getElementById("adComment").value.trim();

  if (!type || !fromRegion || !toRegion) {
    alert("Iltimos yo‘nalish maydonlarini to‘ldiring!");
    return;
  }

  const adId = Date.now().toString();

  const adData = {
    id: adId,
    ownerUid: currentUser.uid,
    ownerPhone: currentUser.phoneNumber,
    type,
    fromRegion,
    fromDistrict,
    toRegion,
    toDistrict,
    price: price || "",
    comment: comment || "",
    status: "pending",
    createdAt: new Date().toISOString()
  };

  // Foydalanuvchi bo‘limiga yozamiz
  await db.ref(`ads/${currentUser.uid}/${adId}`).set(adData);

  // Admin tasdiqlashi uchun navbatga qo‘yamiz
  await db.ref(`pendingAds/${adId}`).set(adData);

  clearAddForm();
  alert("✔ E’lon yuborildi. Admin tasdiqlashini kuting.");
}


/* =========================================================
      2) Realtime user ads listener (Admin status o‘zgarishi)
   ========================================================= */
function loadUserAds(uid) {
  const ref = db.ref("ads/" + uid);

  ref.on("value", (snap) => {
    const ads = snap.val() ? Object.values(snap.val()) : [];
    renderAdsList(ads);
  });
}


/* =========================================================
      3) E’lonlar ro‘yxatini chizish
   ========================================================= */
function renderAdsList(ads) {
  const box = document.getElementById("myAds");
  box.innerHTML = "";

  if (!ads || ads.length === 0) {
    box.innerHTML = "<p>Hozircha e’lonlar yo‘q.</p>";
    return;
  }

  // Eng yangi e’lonlar tepada
  ads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  ads.forEach(ad => {
    const div = document.createElement("div");
    div.className = `ad-box ${ad.status}`;

    const from = `${ad.fromRegion || ""} ${ad.fromDistrict || ""}`;
    const to = `${ad.toRegion || ""} ${ad.toDistrict || ""}`;

    const statusText =
      ad.status === "approved" ? "✅ Tasdiqlangan" :
      ad.status === "rejected" ? "❌ Rad etilgan" :
      "⏳ Kutilmoqda";

    div.innerHTML = `
      <div><b>Yo‘nalish:</b> ${from} → ${to}</div>
      <div><b>Narx:</b> ${ad.price || "—"} so‘m</div>
      <div><b>Telefon:</b> ${ad.ownerPhone}</div>
      <div class="date-info">🕒 ${new Date(ad.createdAt).toLocaleString()} · ${statusText}</div>
      ${ad.comment ? `<div class="comment-box"><b>Izoh:</b> ${escapeHtml(ad.comment)}</div>` : ""}
      <div class="actions">
        ${ ad.status === "approved"
            ? `<button disabled style="background:#ccc">Tahrirlab bo‘lmaydi</button>`
            : `<button onclick="openEditAd('${ad.id}')">✏️ Tahrirlash</button>`
        }
        <button onclick="deleteAd('${ad.id}')">🗑 O‘chirish</button>
      </div>
    `;

    box.appendChild(div);
  });
}


/* =========================================================
      4) E’lonni o‘chirish
   ========================================================= */
async function deleteAd(adId) {
  if (!confirm("E’lonni o‘chirilsinmi?")) return;

  await db.ref(`ads/${currentUser.uid}/${adId}`).remove();
  await db.ref(`pendingAds/${adId}`).remove();

  alert("🗑 E’lon o‘chirildi!");
}


/* =========================================================
      5) E’lonni tahrirlash modalini ochish
   ========================================================= */
async function openEditAd(adId) {
  const snap = await db.ref(`ads/${currentUser.uid}/${adId}`).once("value");
  const ad = snap.val();

  if (!ad) return;

  if (ad.status === "approved") {
    alert("Tasdiqlangan e’londagi ma’lumotni o‘zgartirish mumkin emas!");
    return;
  }

  document.getElementById("editFromRegion").value = ad.fromRegion;
  document.getElementById("editFromDistrict").value = ad.fromDistrict;
  document.getElementById("editToRegion").value = ad.toRegion;
  document.getElementById("editToDistrict").value = ad.toDistrict;
  document.getElementById("editPrice").value = ad.price;
  document.getElementById("editComment").value = ad.comment || "";

  window._editingAdId = adId;
  document.getElementById("editAdModal").style.display = "flex";
}

function closeEditAd() {
  document.getElementById("editAdModal").style.display = "none";
  window._editingAdId = null;
}


/* =========================================================
      6) E’lon tahririni saqlash
   ========================================================= */
async function saveEditedAd() {
  const adId = window._editingAdId;
  if (!adId) return;

  const updated = {
    fromRegion: document.getElementById("editFromRegion").value,
    fromDistrict: document.getElementById("editFromDistrict").value,
    toRegion: document.getElementById("editToRegion").value,
    toDistrict: document.getElementById("editToDistrict").value,
    price: document.getElementById("editPrice").value,
    comment: document.getElementById("editComment").value,
    status: "pending", // qayta ko‘rib chiqish uchun
    editedAt: new Date().toISOString()
  };

  await db.ref(`ads/${currentUser.uid}/${adId}`).update(updated);
  await db.ref(`pendingAds/${adId}`).update(updated);

  closeEditAd();
  alert("✏️ E’lon tahrirlandi. Admin tasdiqlashi kutilyapti.");
}


/* =========================================================
      7) Formani tozalash
   ========================================================= */
function clearAddForm() {
  document.getElementById("adType").value = "";
  document.getElementById("fromRegion").value = "";
  document.getElementById("fromDistrict").innerHTML = "<option value=''>Tumanni tanlang</option>";
  document.getElementById("toRegion").value = "";
  document.getElementById("toDistrict").innerHTML = "<option value=''>Tumanni tanlang</option>";
  document.getElementById("price").value = "";
  document.getElementById("adComment").value = "";
}
/* =========================================================
      SHAHARTAXI — PROFILE.JS — QISM 3/3
      Profil ko‘rish, baholash, regionlar, onLoad
   ========================================================= */


/* =========================================================
      1) Region-selectlarni to‘ldirish
   ========================================================= */

const regions = {
  "Toshkent": ["Bektemir","Chilonzor","Mirzo Ulug'bek","Mirobod"],
  "Samarqand": ["Bulungur","Ishtixon","Urgut","Kattaqo'rg'on"],
  "Namangan": ["Pop","Chust","To'raqo'rg'on"],
  "Andijon": ["Asaka","Andijon sh.","Marhamat"],
  "Farg'ona": ["Qo'qon","Qo'rg'ontepa","Beshariq"],
  "Buxoro": ["Buxoro sh.","G'ijduvon","Jondor"],
  "Xorazm": ["Urgench","Xiva","Shovot"],
  "Qashqadaryo": ["Qarshi","G'uzor","Kitob"]
};

function loadRegions() {
  const regionFields = ["fromRegion","toRegion","editFromRegion","editToRegion"];
  regionFields.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = `<option value="">Viloyat</option>`;
    Object.keys(regions).forEach(r => {
      sel.innerHTML += `<option value="${r}">${r}</option>`;
    });
  });
}

function updateDistricts(prefix) {
  const region = document.getElementById(prefix + "Region").value;
  const distSel = document.getElementById(prefix + "District");
  distSel.innerHTML = `<option value="">Tuman</option>`;

  if (regions[region]) {
    regions[region].forEach(d => {
      distSel.innerHTML += `<option value="${d}">${d}</option>`;
    });
  }
}


/* =========================================================
      2) Boshqa user profilini ochish (Realtime)
   ========================================================= */
async function openViewProfile(uid) {
  document.getElementById("viewProfileModal").style.display = "flex";

  // 1) User ma'lumotlari
  const userSnap = await db.ref("users/" + uid).once("value");
  const user = userSnap.val() || {};

  document.getElementById("vpName").textContent = user.name || "Foydalanuvchi";
  document.getElementById("vpPhone").textContent = user.phone || "";

  // 2) Realtime rating listener
  listenUserRatings(uid, (data) => {
    document.getElementById("vpRatingSummary").innerHTML =
      `<b>${data.avg || "—"} / 5</b> — ${data.count} ta baho`;
  });

  // 3) Reyting berish bo‘limi
  const section = document.getElementById("vpRateSection");
  if (!currentUser || currentUser.uid === uid) {
    section.innerHTML = `<div class="small">O'zingizni baholay olmaysiz.</div>`;
  } else {
    section.innerHTML = `
      <div>
        <label><b>⭐ Baho tanlang:</b></label>
        <select id="vpRatingStars">
          <option value="5">5</option>
          <option value="4">4</option>
          <option value="3">3</option>
          <option value="2">2</option>
          <option value="1">1</option>
        </select>

        <textarea id="vpRatingText" rows="2" placeholder="Izoh (ixtiyoriy)"></textarea>
        <button style="margin-top:8px" onclick="submitProfileRating('${uid}')">Yuborish</button>
      </div>`;
  }

  // 4) User e’lonlari
  loadOtherUserAds(uid);
}

function closeViewProfile() {
  document.getElementById("viewProfileModal").style.display = "none";
}


/* =========================================================
      3) Ushbu userning e’lonlarini yuklash
   ========================================================= */
function loadOtherUserAds(uid) {
  db.ref("ads/" + uid)
    .once("value")
    .then(snap => {
      const list = Object.values(snap.val() || {});
      const box = document.getElementById("vpAdsList");

      if (!list.length) {
        box.innerHTML = "<p class='small'>E’lonlari yo‘q.</p>";
        return;
      }

      box.innerHTML = list.map(ad => `
        <div style="padding:6px;border-bottom:1px solid #eee;">
          <b>${ad.type === "driver" ? "Haydovchi" : "Yo‘lovchi"}</b> ·
          ${ad.fromRegion} → ${ad.toRegion} · ${ad.price} so’m
          <br>
          <small>${new Date(ad.createdAt).toLocaleString()}</small>
        </div>
      `).join("");
    });
}


/* =========================================================
      4) User reytigini real-time o‘qish
   ========================================================= */
function listenUserRatings(uid, callback) {
  db.ref("ratings/" + uid).on("value", snap => {
    const ratings = snap.val() ? Object.values(snap.val()) : [];

    let avg = 0;
    if (ratings.length > 0) {
      avg = ratings.reduce((s, r) => s + Number(r.stars), 0) / ratings.length;
      avg = avg.toFixed(1);
    }

    callback({
      ratings,
      avg,
      count: ratings.length
    });
  });
}


/* =========================================================
      5) Userga baho berish
   ========================================================= */
async function submitProfileRating(targetUid) {
  if (!currentUser) {
    alert("Avval tizimga kiring!");
    return;
  }

  if (currentUser.uid === targetUid) {
    alert("O‘zingizga baho berolmaysiz!");
    return;
  }

  const stars = Number(document.getElementById("vpRatingStars").value);
  const text = document.getElementById("vpRatingText").value.trim();
  const raterUid = currentUser.uid;

  // Takror baho bermaslik
  const exists = await db.ref(`ratings/${targetUid}/${raterUid}`).once("value");
  if (exists.exists()) {
    alert("Siz allaqachon baho bergansiz.");
    return;
  }

  await db.ref(`ratings/${targetUid}/${raterUid}`).set({
    stars,
    text,
    date: new Date().toISOString(),
    raterUid
  });

  alert("⭐ Baho yuborildi!");
}


/* =========================================================
      6) OnLoad — hammasini ishga tushirish
   ========================================================= */
function initProfileOnLoad() {
  loadRegions();

  // Tizimga kirgan user bo‘lsa — e’lonlari realtime ochiladi  
  auth.onAuthStateChanged(user => {
    if (user) {
      loadUserAds(user.uid);
    }
  });
}


/* =========================================================
      7) Logout
   ========================================================= */
function logout() {
  auth.signOut();
  alert("Chiqdingiz.");
  location.reload();
}


/* =========================================================
      8) XSS dan himoya
   ========================================================= */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}


/* =========================================================
      9) DOM tayyor bo‘lganda ishga tushirish
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  loadRegions();
  initProfileOnLoad();

  document.querySelectorAll(".modal").forEach(m => {
    m.addEventListener("click", (e) => {
      if (e.target === m) m.style.display = "none";
    });
  });
});
