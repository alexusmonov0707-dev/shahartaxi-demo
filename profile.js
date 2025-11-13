// ===============================
//  profile.js — QISM 1/4
//  (imports, firebase init, helpers, auth, profile edit)
// ===============================

/* ===== IMPORTS (Firebase modular v9) ===== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getDatabase, ref, set, get, update, push, onValue, remove
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

/* (Optionally App Check import - agar kerak bo'lsa oching)
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app-check.js";
*/

/* ===== FIREBASE CONFIG - O'zingizniki bilan almashtirmang (allaqachon to'g'ri) ===== */
const firebaseConfig = {
  apiKey: "AIzaSyApWUG40YuC9aCsE9MOLXwLcYgRihREWvc",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
  projectId: "shahartaxi-demo",
  storageBucket: "shahartaxi-demo.appspot.com",
  messagingSenderId: "874241795701",
  appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};

/* ===== INIT FIREBASE ===== */
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

/* ===== OPTIONAL: App Check (comment qilingan - agar site key bo'lsa oching) ===== */
// initializeAppCheck(app, {
//   provider: new ReCaptchaV3Provider("SIZNING_SITE_KEY_HERE"),
//   isTokenAutoRefreshEnabled: true
// });

/* ===== GLOBALS & HELPERS ===== */
let currentUser = null;
let lastStatuses = {}; // status o'zgarishlarini kuzatish uchun

function $id(id){ return document.getElementById(id); }

function escapeHtml(str){
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ===== AUTH STATE LISTENER =====
   onAuthStateChanged ichida user foydalanuvchi bazada borligini
   yangilash, va profillar + e'lonlar yuklash chaqiriladi.
*/
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;

    // users/{uid} yozish yoki yangilash (try update then set fallback)
    try {
      await update(ref(db, `users/${user.uid}`), {
        phone: user.phoneNumber || "",
        name: user.displayName || (user.phoneNumber || "")
      });
    } catch(e){
      // agar update ishlamasa (yo'q bo'lsa) set qilamiz
      try {
        await set(ref(db, `users/${user.uid}`), {
          phone: user.phoneNumber || "",
          name: user.displayName || (user.phoneNumber || "")
        });
      } catch(err){
        console.error("users set error", err);
      }
    }

    // profil va user e'lonlarini yuklaymiz
    loadUserProfile();
    loadUserAds();
    startStatusSync();

  } else {
    // logged out holat
    currentUser = null;
    if ($id("profileName")) $id("profileName").textContent = "Foydalanuvchi";
    if ($id("profilePhone")) $id("profilePhone").textContent = "—";
    if ($id("myAds")) $id("myAds").innerHTML = "<p>Hozircha e'lonlar yo'q.</p>";
  }
});

/* ===== PROFILE: load & render ===== */
async function loadUserProfile(){
  if(!currentUser) return;
  try {
    const snap = await get(ref(db, `users/${currentUser.uid}`));
    const data = snap.val() || {};
    updateProfileHeader(data);
  } catch(e){
    console.error("loadUserProfile error", e);
  }
}

function updateProfileHeader(data){
  if(!$id("profileName")) return;
  $id("profileName").textContent = data.name || "Foydalanuvchi";
  if($id("profilePhone")) $id("profilePhone").textContent = data.phone || "—";
  if($id("profileRatingBig")) $id("profileRatingBig").textContent = data.ratingAvg ? `${data.ratingAvg} / 5` : "—";
  if($id("profileRatingCount")) $id("profileRatingCount").textContent = data.ratingCount ? `${data.ratingCount} ta baho` : "Hozircha baholar yo'q";

  const editBtn = $id("editProfileBtn");
  if(editBtn) editBtn.style.display = currentUser ? "inline-block" : "none";
}

/* ===== PROFILE EDIT (modal) ===== */
function openEditProfile(){
  if(!currentUser) return alert("Tizimga kiring");
  get(ref(db, `users/${currentUser.uid}`)).then(snap=>{
    const data = snap.val() || {};
    if($id("editFullName")) $id("editFullName").value = data.name || "";
    if($id("editPhoneInput")) $id("editPhoneInput").value = data.phone || "";
    if($id("editProfileModal")) $id("editProfileModal").style.display = "flex";
  }).catch(e=>{
    console.error("openEditProfile error", e);
    alert("Profilni yuklashda xatolik");
  });
}

function closeEditProfile(){
  if($id("editProfileModal")) $id("editProfileModal").style.display = "none";
}

async function saveProfileEdit(){
  if(!currentUser) return alert("Tizimga kiring");
  const name = $id("editFullName") ? $id("editFullName").value.trim() : "";
  const phone = $id("editPhoneInput") ? $id("editPhoneInput").value.trim() : "";

  if(!/^\+998\d{9}$/.test(phone)) return alert("Telefonni to'g'ri kiriting (+998901234567)");

  try {
    await update(ref(db, `users/${currentUser.uid}`), { name, phone });
    alert("Profil yangilandi");
    loadUserProfile();
    closeEditProfile();
  } catch(e){
    console.error("saveProfileEdit error", e);
    alert("Profilni saqlashda xatolik");
  }
}

/* ===== Export profile-edit functions to window (HTML onclick ishlashi uchun) ===== */
window.openEditProfile = openEditProfile;
window.closeEditProfile = closeEditProfile;
window.saveProfileEdit = saveProfileEdit;

/* END OF QISM 1/4 */
// ===============================
//  QISM 2/4 — Regions, Add Ad, Load Ads, Render Ads
// ===============================

/* ===== REGIONS DATA ===== */
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

/* ===== REGION SELECTS ===== */
function loadRegionsToSelects(){
  const ids = ["fromRegion","toRegion","filterFromRegion","filterToRegion"];
  ids.forEach(id=>{
    const sel = $id(id);
    if(!sel) return;
    sel.innerHTML = '<option value="">Viloyatni tanlang</option>';
    Object.keys(regions).forEach(r=>{
      const opt = document.createElement("option");
      opt.value = r;
      opt.textContent = r;
      sel.appendChild(opt);
    });
  });
}

function updateDistricts(prefix){
  const regionSel = $id(prefix + "Region");
  const districtSel = $id(prefix + "District");
  if(!regionSel || !districtSel) return;

  const region = regionSel.value;
  districtSel.innerHTML = '<option value="">Tumanni tanlang</option>';

  if(region && regions[region]){
    regions[region].forEach(d=>{
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      districtSel.appendChild(opt);
    });
  }
}

function updateFilterDistricts(prefix){
  const regionSel = $id(prefix + "Region");
  const districtSel = $id(prefix + "District");
  if(!regionSel || !districtSel) return;

  const region = regionSel.value;
  districtSel.innerHTML = '<option value="">Tanlang</option>';

  if(region && regions[region]){
    regions[region].forEach(d=> districtSel.add(new Option(d, d)));
  }

  renderAdsListFromLocal();
}

/* ===== ADD NEW AD ===== */
async function addAd(){
  if(!currentUser) return alert("Avval tizimga kiring!");

  const type        = $id("adType")?.value || "";
  const fromRegion  = $id("fromRegion")?.value || "";
  const fromDistrict= $id("fromDistrict")?.value || "";
  const toRegion    = $id("toRegion")?.value || "";
  const toDistrict  = $id("toDistrict")?.value || "";
  const price       = $id("price")?.value.trim() || "";
  const comment     = $id("adComment")?.value.trim() || "";

  if(!type || !fromRegion || !toRegion){
    return alert("Iltimos yo'nalishni to'liq tanlang.");
  }

  try {
    const newRef = push(ref(db, "ads"));
    const adId = newRef.key;

    const ad = {
      id: adId,
      ownerUid: currentUser.uid,
      ownerPhone: currentUser.phoneNumber || "",
      type,
      fromRegion, fromDistrict,
      toRegion, toDistrict,
      price,
      comment,
      status: "pending",
      createdAt: new Date().toISOString()
    };

    // Bazaga yozamiz
    await set(ref(db, `ads/${adId}`), ad);
    await set(ref(db, `userAds/${currentUser.uid}/${adId}`), ad);
    await set(ref(db, `pendingAds/${adId}`), ad);

    alert("E'lon yuborildi! Admin tasdiqlashini kuting.");
    clearAddForm();
  } catch(err){
    console.error("❌ addAd error:", err);
    alert("E'londa xatolik yuz berdi.");
  }
}

function clearAddForm(){
  const ids = ["adType","fromRegion","fromDistrict","toRegion","toDistrict","price","adComment"];
  ids.forEach(id=>{
    if($id(id)) $id(id).value = "";
  });

  if($id("fromDistrict")) $id("fromDistrict").innerHTML = '<option value="">Tumanni tanlang</option>';
  if($id("toDistrict"))   $id("toDistrict").innerHTML   = '<option value="">Tumanni tanlang</option>';
}

/* ===== LOAD USER ADS (REALTIME) ===== */
function loadUserAds(){
  if(!currentUser) return;

  const userAdsRef = ref(db, `userAds/${currentUser.uid}`);
  onValue(userAdsRef, snap=>{
    const obj = snap.val() || {};
    const list = Object.values(obj);

    // localStorage (eski HTML ishlasin deb)
    localStorage.setItem("driverAds", JSON.stringify(list.filter(a=>a.type==="driver")));
    localStorage.setItem("passengerAds", JSON.stringify(list.filter(a=>a.type==="passenger")));

    renderAdsListFromLocal();
  });
}

/* ===== ADS RENDER ===== */
function renderAdsListFromLocal(){
  const driver    = JSON.parse(localStorage.getItem("driverAds") || "[]");
  const passenger = JSON.parse(localStorage.getItem("passengerAds") || "[]");
  const ads = [...driver, ...passenger];

  const cont = $id("myAds");
  if(!cont) return;

  cont.innerHTML = "";

  if(ads.length === 0){
    cont.innerHTML = "<p>Hozircha e’lonlar yo‘q.</p>";
    return;
  }

  ads.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));

  ads.forEach(ad=>{
    const div = document.createElement("div");
    div.className = "ad-box " + (ad.status || "pending");

    const from = `${ad.fromRegion || ""} ${ad.fromDistrict || ""}`;
    const to   = `${ad.toRegion   || ""} ${ad.toDistrict   || ""}`;

    div.innerHTML = `
      <div><b>Yo'nalish:</b> ${escapeHtml(from)} → ${escapeHtml(to)}</div>
      <div><b>Narx:</b> ${escapeHtml(ad.price || "—")} so'm</div>
      <div><b>Telefon:</b> ${escapeHtml(ad.ownerPhone || "—")}</div>
      <div class="date-info">🕒 ${new Date(ad.createdAt).toLocaleString()} — Holat: ${ad.status}</div>

      <div class="actions">
        ${ad.status !== "approved" 
          ? `<button onclick="startEditAd('${ad.id}')">✏️ Tahrirlash</button>`
          : `<button disabled style="background:#aaa">✏️ Tahrirlash</button>`
        }
        <button onclick="deleteAd('${ad.id}')">🗑️ O'chirish</button>
      </div>
    `;

    cont.appendChild(div);
  });
}

/* ===== EXPORT ===== */
window.loadRegionsToSelects = loadRegionsToSelects;
window.updateDistricts = updateDistricts;
window.updateFilterDistricts = updateFilterDistricts;
window.addAd = addAd;
window.clearAddForm = clearAddForm;
window.renderAdsListFromLocal = renderAdsListFromLocal;

/* END OF QISM 2/4 */
// ===============================
//  QISM 3/4 — Edit Ad, Delete Ad, View Profile, Ratings
// ===============================

/* ===== E'LONNI TAHRIRLASH ===== */
async function startEditAd(adId){
  if(!currentUser) return alert("Tizimga kiring!");

  try{
    const snap = await get(ref(db, `userAds/${currentUser.uid}/${adId}`));
    const ad = snap.val();
    if(!ad) return alert("E'lon topilmadi");
    if(ad.status === "approved") return alert("Tasdiqlangan e'londa o'zgarish qilish mumkin emas!");

    const newPrice = prompt("Yangi narxni kiriting:", ad.price || "");
    if(newPrice === null) return;

    const updates = {
      price: newPrice,
      edited: true,
      status: "pending",
      editedAt: new Date().toISOString()
    };

    await update(ref(db, `ads/${adId}`), updates);
    await update(ref(db, `userAds/${currentUser.uid}/${adId}`), updates);
    await update(ref(db, `pendingAds/${adId}`), updates);

    alert("E'lon yangilandi. Admin tasdiqlashini kuting.");
  }catch(e){
    console.error("startEditAd error:", e);
    alert("Tahrirlashda xatolik");
  }
}

/* ===== E'LONNI O'CHIRISH ===== */
async function deleteAd(adId){
  if(!currentUser) return alert("Tizimga kiring!");
  if(!confirm("Haqiqatan o'chirmoqchimisiz?")) return;

  try{
    await remove(ref(db, `ads/${adId}`));
    await remove(ref(db, `userAds/${currentUser.uid}/${adId}`));
    await remove(ref(db, `pendingAds/${adId}`));

    alert("E'lon o'chirildi!");
  }catch(e){
    console.error("deleteAd error:", e);
    alert("O'chirishda xatolik");
  }
}

/* ===== FOYDALANUVCHI REYTINGLARI LISTENER ===== */
function listenUserRatings(uid, callback){
  const ratingsRef = ref(db, `ratings/${uid}`);

  onValue(ratingsRef, snap=>{
    const obj = snap.val() || {};
    const list = Object.values(obj);

    let avg = 0;
    if(list.length){
      avg = (list.reduce((s,r)=> s + (Number(r.stars)||0), 0) / list.length).toFixed(2);
    }

    callback({
      ratings: list,
      avg,
      count: list.length
    });

  }, err => {
    console.error("listenUserRatings error:", err);
    callback({ ratings:[], avg:0, count:0 });
  });
}

/* ===== BOSHQA USER PROFILINI KO'RISH (modal) ===== */
async function openViewProfile(uid){
  if(!uid) return;

  try{
    const uSnap = await get(ref(db, `users/${uid}`));
    const user = uSnap.val() || {};

    // Foydalanuvchi ma'lumotlar
    $id("vpName").textContent = user.name || "Foydalanuvchi";
    $id("vpPhone").textContent = user.phone || "—";

    // Reytinglarni yuklaymiz
    listenUserRatings(uid, data=>{
      $id("vpRatingSummary").innerHTML =
        `<strong>${data.avg || '—'} / 5</strong> — ${data.count} ta baho`;
    });

    // E’lonlari
    const adsSnap = await get(ref(db, `userAds/${uid}`));
    const ads = adsSnap.val() ? Object.values(adsSnap.val()) : [];
    const vpList = $id("vpAdsList");

    if(!ads.length){
      vpList.innerHTML = `<p class="small">E'lonlari yo'q.</p>`;
    }else{
      vpList.innerHTML = ads.map(a=>{
        return `
          <div style="padding:6px;border-bottom:1px solid #eee;">
            <b>${a.type==='driver'?'Haydovchi':"Yo'lovchi"}</b> ·
            ${escapeHtml(a.fromRegion||"")} → ${escapeHtml(a.toRegion||"")}
            · ${escapeHtml(a.price||"")} so'm
            <br><small>${new Date(a.createdAt).toLocaleString()}</small>
          </div>
        `;
      }).join("");
    }

    // BAHO BERISH BLOKI
    const cur = currentUser;
    const rateBlock = $id("vpRateSection");

    if(!cur){
      rateBlock.innerHTML = '<div class="small">Baholash uchun tizimga kiring.</div>';
    }
    else if(cur.uid === uid){
      rateBlock.innerHTML = '<div class="small">O\'zingizni baholay olmaysiz.</div>';
    }
    else {
      const rSnap = await get(ref(db, `ratings/${uid}/${cur.uid}`));

      if(rSnap.exists()){
        rateBlock.innerHTML = '<div class="small">Siz allaqachon baho bergansiz.</div>';
      }
      else {
        rateBlock.innerHTML = `
          <div>
            <label><b>⭐ Baho tanlang:</b></label>
            <select id="vpRatingStars" style="margin-top:6px;">
              <option value="5">5</option>
              <option value="4">4</option>
              <option value="3">3</option>
              <option value="2">2</option>
              <option value="1">1</option>
            </select>

            <textarea id="vpRatingText" rows="2" placeholder="Ixtiyoriy izoh..." style="margin-top:6px;width:100%"></textarea>

            <button id="vpSubmitBtn" style="margin-top:8px;">Yuborish</button>
          </div>
        `;

        $id("vpSubmitBtn").onclick = ()=> submitProfileRating(uid);
      }
    }

    $id("viewProfileModal").style.display = "flex";

  }catch(e){
    console.error("openViewProfile error:", e);
    alert("Profilni ochishda xatolik!");
  }
}

/* ===== BAHO YUBORISH ===== */
async function submitProfileRating(targetUid){
  if(!currentUser) return alert("Avval tizimga kiring!");
  if(currentUser.uid === targetUid) return alert("O'zingizni baholay olmaysiz!");

  const stars = Number($id("vpRatingStars").value);
  const text  = $id("vpRatingText").value.trim();

  try{
    // reytingni yozamiz
    await set(ref(db, `ratings/${targetUid}/${currentUser.uid}`), {
      stars,
      text,
      date: new Date().toISOString(),
      raterUid: currentUser.uid
    });

    // reytinglarni qayta hisoblaymiz
    const snap = await get(ref(db, `ratings/${targetUid}`));
    const list = snap.val() ? Object.values(snap.val()) : [];

    let avg = 0;
    if(list.length){
      avg = (list.reduce((s,r)=> s + (Number(r.stars)||0), 0) / list.length);
    }

    await update(ref(db, `users/${targetUid}`), {
      ratingAvg: +(avg.toFixed(2)),
      ratingCount: list.length
    });

    alert("Baho yuborildi!");
    openViewProfile(targetUid);

  }catch(e){
    console.error("submitProfileRating error:", e);
    alert("Baho yuborishda xatolik!");
  }
}

/* ===== STATUS SYNC — approved/rejected ===== */
function startStatusSync(){
  if(!currentUser) return;

  const userAdsRef = ref(db, `userAds/${currentUser.uid}`);

  onValue(userAdsRef, snap=>{
    const obj = snap.val() || {};
    const ads = Object.values(obj);

    ads.forEach(ad=>{
      const prev = lastStatuses[ad.id];
      const now  = ad.status;

      if(prev && prev !== now){
        if(now === "approved")
          alert(`✅ E'lon tasdiqlandi:\n${ad.fromRegion} → ${ad.toRegion}`);
        else if(now === "rejected")
          alert(`❌ E'lon rad etildi:\n${ad.fromRegion} → ${ad.toRegion}`);
      }

      lastStatuses[ad.id] = now;
    });

    renderAdsListFromLocal();
  });
}

/* ===== MODAL YOPISH ===== */
function closeViewProfile(){
  const modal = $id("viewProfileModal");
  if(modal) modal.style.display = "none";
}

/* ===== EXPORTLAR ===== */
window.startEditAd = startEditAd;
window.deleteAd = deleteAd;
window.openViewProfile = openViewProfile;
window.submitProfileRating = submitProfileRating;
window.startStatusSync = startStatusSync;
window.closeViewProfile = closeViewProfile;
