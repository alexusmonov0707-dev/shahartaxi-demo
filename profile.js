// ===============================
//  FIREBASE INITIALIZATION
// ===============================

const firebaseConfig = {
  apiKey: "AIzaSyApWUG40YuC9aCsE9MOLXwLcYgRihREWvc",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
  projectId: "shahartaxi-demo",
  storageBucket: "shahartaxi-demo.firebasestorage.app",
  messagingSenderId: "874241795701",
  appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};

// Firebase ishga tushadi
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// ===============================
//  FOYDALANUVCHINI TEKSHIRISH
// ===============================

let currentUser = null;

// Auth holatini kuzatamiz
auth.onAuthStateChanged(async (user) => {
  if (user) {
    // User ma'lumotini yuklash
    currentUser = user;

    // Bazada mavjud bo'lmasa yaratib qo'yamiz
    await db.ref("users/" + user.uid).update({
      phone: user.phoneNumber || "",
      name: user.phoneNumber || ""
    });

    console.log("Kirish muvaffaqiyatli:", user.phoneNumber);
    initProfileAfterLogin();
  } else {
    console.log("Foydalanuvchi tizimga kirmagan");
  }
});
// ===============================
//  PROFIL MA'LUMOTLARINI YUKLASH
// ===============================

async function initProfileAfterLogin() {
  if (!currentUser) return;

  const uid = currentUser.uid;

  // Foydalanuvchi ma'lumotlari
  const userSnap = await db.ref("users/" + uid).once("value");
  const userData = userSnap.val() || {};

  // Headerga chiqaramiz
  updateProfileHeader(userData);

  // Foydalanuvchi e’lonlarini yuklaymiz (keyingi qismda yozaman)
  loadUserAds(uid);
}

// ===============================
//  PROFILE HEADER YANGILASH
// ===============================

function updateProfileHeader(user) {
  document.getElementById("profileName").textContent = user.name || "Foydalanuvchi";
  document.getElementById("profilePhone").textContent = user.phone || "—";

  // Baholar (keyingi qismlarda real Firebase bilan o‘zgaradi)
  document.getElementById("profileRatingBig").textContent = user.ratingAvg || "—";
  document.getElementById("profileRatingCount").textContent =
    user.ratingCount ? `${user.ratingCount} ta baho` : "Hozircha baholar yo‘q";

  // Tahrirlash tugmasi faqat o'ziga ko'rinadi
  document.getElementById("editProfileBtn").style.display = "inline-block";
}

// ===============================
//  PROFILNI TAHRIRLASH
// ===============================

function openEditProfile() {
  if (!currentUser) return;

  db.ref("users/" + currentUser.uid)
    .once("value")
    .then((snap) => {
      const data = snap.val() || {};

      document.getElementById("editFullName").value = data.name || "";
      document.getElementById("editPhoneInput").value = data.phone || "";
      document.getElementById("editProfileModal").style.display = "flex";
    });
}

function closeEditProfile() {
  document.getElementById("editProfileModal").style.display = "none";
}

async function saveProfileEdit() {
  const name = document.getElementById("editFullName").value.trim();
  const phone = document.getElementById("editPhoneInput").value.trim();

  // Telefonni faqat +998 bilan
  const phoneRegex = /^\+998\d{9}$/;
  if (!phoneRegex.test(phone)) {
    alert("Telefon raqamni to'g'ri kiriting (+998901234567)");
    return;
  }

  await db.ref("users/" + currentUser.uid).update({
    name: name,
    phone: phone
  });

  alert("Profil saqlandi!");

  updateProfileHeader({ name, phone });

  closeEditProfile();
}
// ===============================
//  YANGI E'LON QO‘SHISH
// ===============================

async function addAd() {
  if (!currentUser) {
    alert("Avval tizimga kiring!");
    return;
  }

  const uid = currentUser.uid;

  const type = document.getElementById("adType").value;
  const fromRegion = document.getElementById("fromRegion").value.trim();
  const fromDistrict = document.getElementById("fromDistrict").value.trim();
  const toRegion = document.getElementById("toRegion").value.trim();
  const toDistrict = document.getElementById("toDistrict").value.trim();
  const price = document.getElementById("price").value.trim();
  const comment = document.getElementById("adComment").value.trim();

  if (!type || !fromRegion || !toRegion) {
    alert("Iltimos barcha asosiy maydonlarni to‘ldiring!");
    return;
  }

  // Unique ID
  const adId = Date.now().toString();

  const adData = {
    id: adId,
    ownerUid: uid,
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

  // 1) Foydalanuvchi bo‘limiga yozamiz
  await db.ref(`ads/${uid}/${adId}`).set(adData);

  // 2) Admin tasdiqlashi uchun alohida joyga ham yozamiz
  await db.ref(`pendingAds/${adId}`).set(adData);

  clearAddForm();
  alert("✅ E’lon yuborildi. Admin tasdiqlashini kuting!");
}
// ===============================
//   FOYDALANUVCHI E'LONLARINI YUKLASH (REALTIME)
// ===============================

function loadUserAds(uid) {
  const adsRef = db.ref("ads/" + uid);

  // Real-time listener (admin status o'zgartirsa – darhol ko‘rinadi)
  adsRef.on("value", (snapshot) => {
    const ads = snapshot.val() || {};
    const list = Object.values(ads);
    renderAdsList(list);
  });
}

// ===============================
//   E'LONLARNI RENDER QILISH
// ===============================

function renderAdsList(ads) {
  const container = document.getElementById("myAds");
  container.innerHTML = "";

  if (!ads || ads.length === 0) {
    container.innerHTML = "<p>Hozircha e’lonlar yo‘q.</p>";
    return;
  }

  // Sort: eng yangi e’lon tepada
  ads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  ads.forEach((ad) => {
    const div = document.createElement("div");
    div.className = "ad-box " + ad.status;

    const from = `${ad.fromRegion || ""} ${ad.fromDistrict || ""}`;
    const to = `${ad.toRegion || ""} ${ad.toDistrict || ""}`;
    const created = new Date(ad.createdAt).toLocaleString();
    const statusText =
      ad.status === "approved"
        ? "✅ Tasdiqlangan"
        : ad.status === "rejected"
        ? "❌ Rad etilgan"
        : "⏳ Kutilmoqda";

    div.innerHTML = `
      <div><b>Yo'nalish:</b> ${from} → ${to}</div>
      <div><b>Narx:</b> ${ad.price || "—"} so'm</div>
      <div><b>Telefon:</b> ${ad.ownerPhone}</div>
      <div class="date-info">🕒 Joylangan: ${created} · Holat: ${statusText}</div>
      ${
        ad.comment
          ? `<div class="comment-box"><b>Izoh:</b> ${escapeHtml(ad.comment)}</div>`
          : ""
      }

      <div class="actions">
        ${
          ad.status === "approved"
            ? `<button disabled style="background:#ccc">Tahrirlab bo‘lmaydi</button>`
            : `<button onclick="startEditAd('${ad.id}')">✏️ Tahrirlash</button>`
        }
        <button onclick="deleteAd('${ad.id}')">🗑️ O‘chirish</button>
      </div>
    `;

    container.appendChild(div);
  });
}
// ===================================
//     E'LONNI TAHRIRLASH
// ===================================

let EDITING_AD_ID = null;

function startEditAd(adId) {
  EDITING_AD_ID = adId;

  db.ref(`ads/${currentUser.uid}/${adId}`)
    .once("value")
    .then((snap) => {
      const ad = snap.val();
      if (!ad) return;

      // Eğer e'lon tasdiqlangan bo'lsa, tahrirlab bo'lmaydi
      if (ad.status === "approved") {
        alert("Tasdiqlangan e’londagi ma’lumotlarni o‘zgartirib bo‘lmaydi!");
        return;
      }

      // Modalga ma'lumotlarni joylashtiramiz
      document.getElementById("editFromRegion").value = ad.fromRegion;
      document.getElementById("editFromDistrict").value = ad.fromDistrict;
      document.getElementById("editToRegion").value = ad.toRegion;
      document.getElementById("editToDistrict").value = ad.toDistrict;
      document.getElementById("editPrice").value = ad.price;
      document.getElementById("editComment").value = ad.comment || "";

      document.getElementById("editAdModal").style.display = "flex";
    });
}

function closeEditAd() {
  document.getElementById("editAdModal").style.display = "none";
  EDITING_AD_ID = null;
}

async function saveEditedAd() {
  if (!EDITING_AD_ID) return;

  const newData = {
    fromRegion: document.getElementById("editFromRegion").value.trim(),
    fromDistrict: document.getElementById("editFromDistrict").value.trim(),
    toRegion: document.getElementById("editToRegion").value.trim(),
    toDistrict: document.getElementById("editToDistrict").value.trim(),
    price: document.getElementById("editPrice").value.trim(),
    comment: document.getElementById("editComment").value.trim(),
    status: "pending", // tahrirdan so‘ng yana admin tekshiradi
    editedAt: new Date().toISOString()
  };

  await db.ref(`ads/${currentUser.uid}/${EDITING_AD_ID}`).update(newData);

  // Admin tekshirishi uchun update yuboramiz
  await db.ref(`pendingAds/${EDITING_AD_ID}`).update(newData);

  closeEditAd();
  alert("✏️ E’lon yangilandi! Admin tasdiqlashini kuting.");
}
// ===================================
//     PROFILGA BAHO QO'YISH
// ===================================

async function submitProfileRating(targetUid) {
  if (!currentUser) {
    alert("Baholash uchun tizimga kiring!");
    return;
  }

  const raterUid = currentUser.uid;

  const stars = Number(document.getElementById("vpRatingStars").value);
  const text = document.getElementById("vpRatingText").value.trim();
  const date = new Date().toISOString();

  if (raterUid === targetUid) {
    alert("O'zingizga baho qo‘yolmaysiz!");
    return;
  }

  // Bitta user ikkinchi userni faqat 1 marta baholashi mumkin
  const existing = await db
    .ref(`ratings/${targetUid}/${raterUid}`)
    .once("value");

  if (existing.exists()) {
    alert("Siz bu foydalanuvchini allaqachon baholagansiz.");
    return;
  }

  // Rating yozamiz
  await db.ref(`ratings/${targetUid}/${raterUid}`).set({
    stars,
    text,
    date,
    raterUid
  });

  alert("⭐ Baho yuborildi!");

  // Profilni qayta yuklash
  openViewProfileForRealtime(targetUid);
}
// ===================================
//     PROFIL BAHOLARINI O'QISH
// ===================================

function listenUserRatings(uid, callback) {
  const ref = db.ref("ratings/" + uid);
  ref.on("value", (snap) => {
    const ratings = snap.val() || {};
    const list = Object.values(ratings);

    // O'rtacha baho
    let avg = 0;
    if (list.length > 0) {
      avg =
        list.reduce((sum, r) => sum + Number(r.stars || 0), 0) / list.length;
      avg = avg.toFixed(1);
    }

    callback({
      ratings: list,
      avg: avg,
      count: list.length
    });
  });
}
// ===================================
//     PROFILNI KO'RISH (REALTIME)
// ===================================

function openViewProfile(uid) {
  openViewProfileForRealtime(uid);
}

async function openViewProfileForRealtime(uid) {
  if (!uid) return;

  document.getElementById("viewProfileModal").style.display = "flex";

  // 1) Foydalanuvchi ma'lumotlari
  const userSnap = await db.ref("users/" + uid).once("value");
  const user = userSnap.val() || {};

  document.getElementById("vpName").textContent = user.name || "Foydalanuvchi";
  document.getElementById("vpPhone").textContent = user.phone || "";

  // 2) Realtime Rating Listener
  listenUserRatings(uid, (data) => {
    document.getElementById("vpRatingSummary").innerHTML =
      `<strong>${data.avg || "—"} / 5</strong> — ${data.count} ta baho`;
  });

  // 3) Baholash bo‘limi (faqat boshqalar uchun)
  if (!currentUser || currentUser.uid === uid) {
    document.getElementById("vpRateSection").innerHTML =
      `<div class="small">Siz o'zingizni baholay olmaysiz.</div>`;
  } else {
    document.getElementById("vpRateSection").innerHTML = `
      <div style="margin-top:8px;">
        <label><b>⭐ Baho tanlang</b></label>
        <div style="margin-top:6px;">
          <select id="vpRatingStars">
            <option value="5">5</option>
            <option value="4">4</option>
            <option value="3">3</option>
            <option value="2">2</option>
            <option value="1">1</option>
          </select>
        </div>
        <textarea id="vpRatingText" placeholder="Ixtiyoriy izoh..." rows="2"></textarea>
        <button style="margin-top:8px;" onclick="submitProfileRating('${uid}')">Yuborish</button>
      </div>
    `;
  }

  // 4) Ushbu userning e’lonlari (keyingi qismda yangilanadi)
  loadOtherUserAds(uid);
}
// ===================================
//    BOSHQA FOYDALANUVCHI E'LONLARI
// ===================================

function loadOtherUserAds(uid) {
  db.ref("ads/" + uid).once("value").then((snap) => {
    const ads = Object.values(snap.val() || {});

    const box = document.getElementById("vpAdsList");

    if (!ads.length) {
      box.innerHTML = "<p class='small'>E’lonlari yo‘q.</p>";
      return;
    }

    box.innerHTML = ads
      .map((a) => {
        return `
        <div style="padding:6px;border-bottom:1px solid #eee;">
          <b>${a.type === "driver" ? "Haydovchi" : "Yo‘lovchi"}</b> 
          · ${a.fromRegion} → ${a.toRegion}  
          · ${a.price} so'm
          <br>
          <small>${new Date(a.createdAt).toLocaleString()}</small>
        </div>
        `;
      })
      .join("");
  });
}
driverAds/
    adId1/
       ownerId: ...
       phone: ...
       ...
passengerAds/
    adId2/
       ownerId: ...
       phone: ...
       ...
function listenAllAdsRealtime() {
  firebase.database().ref("driverAds").on("value", snapshot => {
    window._driverAds = snapshot.val() ? Object.values(snapshot.val()) : [];
    renderAdsList();
  });

  firebase.database().ref("passengerAds").on("value", snapshot => {
    window._passengerAds = snapshot.val() ? Object.values(snapshot.val()) : [];
    renderAdsList();
  });
}
function addAd(){
  const cu = getCurrentUser();
  if(!cu){ alert('Avval tizimga kiring!'); return; }

  const type = document.getElementById('adType').value;
  const fromRegion = document.getElementById('fromRegion').value.trim();
  const fromDistrict = document.getElementById('fromDistrict').value.trim();
  const toRegion = document.getElementById('toRegion').value.trim();
  const toDistrict = document.getElementById('toDistrict').value.trim();
  const price = document.getElementById('price').value.trim();
  const comment = document.getElementById('adComment').value.trim();

  if(!type || !fromRegion || !toRegion){
    alert('Iltimos yo‘nalish ma\'lumotlarini to‘ldiring!');
    return;
  }

  const id = `${type}_${Date.now()}_${Math.floor(Math.random()*1000)}`;

  const newAd = {
    id,
    ownerId: cu.id,
    phone: cu.phone,
    type,
    fromRegion, fromDistrict,
    toRegion, toDistrict,
    price,
    comment,
    status: 'pending',
    createdAt: new Date().toLocaleString()
  };

  firebase.database().ref(`${type}Ads/${id}`).set(newAd)
    .then(() => {
      alert("✅ E’lon Firebase-ga saqlandi (admin tasdiqlasin)");
      clearAddForm();
    });
}
function editAd(id,type){
  const newPrice = prompt("Yangi narx:", "");
  if(!newPrice) return;

  firebase.database().ref(`${type}Ads/${id}`).update({
    price: newPrice,
    edited: true
  }).then(() => {
    alert("✏️ E’lon yangilandi");
  });
}
function deleteAd(id,type){
  if(!confirm("Haqiqatan o‘chirilsinmi?")) return;

  firebase.database().ref(`${type}Ads/${id}`).remove()
    .then(() => {
      alert("🗑️ O‘chirildi");
    });
}
