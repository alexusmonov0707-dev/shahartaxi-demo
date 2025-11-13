// ===============================
//  1-QISM: IMPORTS & FIREBASE INIT
// ===============================

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getDatabase, ref, set, get, update, push, onValue, remove
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

import { initializeAppCheck, ReCaptchaV3Provider } from 
"https://www.gstatic.com/firebasejs/9.22.2/firebase-app-check.js";

// ===============================
//  FIREBASE CONFIG
// ===============================

const firebaseConfig = {
  apiKey: "AIzaSyApWUG40YuC9aCsE9MOLXwLcYgRihREWvc",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
  projectId: "shahartaxi-demo",
  storageBucket: "shahartaxi-demo.appspot.com",
  messagingSenderId: "874241795701",
  appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};

// ===============================
//  INIT FIREBASE
// ===============================

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// AppCheck (hozircha o‘chirilib turadi)
// initializeAppCheck(app, {
//   provider: new ReCaptchaV3Provider("SIZNING_SITE_KEYING"),
//   isTokenAutoRefreshEnabled: true
// });

// ===============================
//  GLOBALS
// ===============================

let currentUser = null;
let lastStatuses = {};

function $id(id){ return document.getElementById(id); }

function escapeHtml(str){
  if(!str && str !== 0) return "";
  return String(str)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

// ===============================
//  AUTH STATE
// ===============================

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;

    // bazada userni yaratish/yangi qilish
    await update(ref(db, `users/${user.uid}`), {
      phone: user.phoneNumber || "",
      name: user.displayName || user.phoneNumber || ""
    }).catch(async () => {
      await set(ref(db, `users/${user.uid}`), {
        phone: user.phoneNumber || "",
        name: user.phoneNumber || ""
      });
    });

    loadUserProfile();
    loadUserAds();
    startStatusSync();
  } else {
    currentUser = null;

    if ($id("profileName")) $id("profileName").textContent = "Foydalanuvchi";
    if ($id("myAds")) $id("myAds").innerHTML = "<p>Hozircha e'lonlar yo'q.</p>";
  }
});

// ===============================
//  PROFILE LOAD & RENDER
// ===============================

async function loadUserProfile(){
  if(!currentUser) return;
  const snap = await get(ref(db, `users/${currentUser.uid}`));
  updateProfileHeader(snap.val() || {});
}

function updateProfileHeader(data){
  if(!$id("profileName")) return;
  $id("profileName").textContent = data.name || "Foydalanuvchi";
  $id("profilePhone").textContent = data.phone || "—";

  $id("profileRatingBig").textContent =
    data.ratingAvg ? `${data.ratingAvg} / 5` : "—";

  $id("profileRatingCount").textContent =
    data.ratingCount ? `${data.ratingCount} ta baho` : "Hozircha baholar yo'q";

  if ($id("editProfileBtn"))
    $id("editProfileBtn").style.display = currentUser ? "inline-block" : "none";
}

// ===============================
//  PROFILE EDIT
// ===============================

function openEditProfile(){
  if(!currentUser) return alert("Tizimga kiring");

  get(ref(db, `users/${currentUser.uid}`)).then(snap=>{
    const data = snap.val() || {};
    $id("editFullName").value = data.name || "";
    $id("editPhoneInput").value = data.phone || "";
    $id("editProfileModal").style.display = "flex";
  });
}

function closeEditProfile(){
  $id("editProfileModal").style.display = "none";
}

async function saveProfileEdit(){
  if(!currentUser) return;

  const name = $id("editFullName").value.trim();
  const phone = $id("editPhoneInput").value.trim();

  if(!/^\+998\d{9}$/.test(phone))
    return alert("Telefonni to'g'ri kiriting (+998901234567)");

  await update(ref(db, `users/${currentUser.uid}`), { name, phone });
  alert("Profil yangilandi");
  loadUserProfile();
  closeEditProfile();
}

// EXPORT TO WINDOW (bojmasligi uchun)
window.openEditProfile = openEditProfile;
window.closeEditProfile = closeEditProfile;
window.saveProfileEdit = saveProfileEdit;
// ===============================
//  2-QISM: REGIONS + ADD AD + RENDER ADS
// ===============================

// --- Viloyatlar va tumanlar ---
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


// ===============================
//  REGION SELECTS — FILLING
// ===============================

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
  const region = $id(prefix + "Region").value;
  const districtSel = $id(prefix + "District");

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
  const region = $id(prefix + "Region").value;
  const districtSel = $id(prefix + "District");

  districtSel.innerHTML = '<option value="">Tanlang</option>';

  if(region && regions[region]){
    regions[region].forEach(d=> districtSel.add(new Option(d, d)));
  }

  // filtering local list
  renderAdsListFromLocal();
}


// ===============================
//  ADD NEW AD
// ===============================

async function addAd(){
  if(!currentUser) return alert("Avval tizimga kiring!");

  const type        = $id("adType").value;
  const fromRegion  = $id("fromRegion").value;
  const fromDistrict= $id("fromDistrict").value;
  const toRegion    = $id("toRegion").value;
  const toDistrict  = $id("toDistrict").value;
  const price       = $id("price").value.trim();
  const comment     = $id("adComment").value.trim();

  if(!type || !fromRegion || !toRegion){
    return alert("Iltimos yo'nalishni to'liq to'ldiring");
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

    await set(ref(db, `ads/${adId}`), ad);
    await set(ref(db, `userAds/${currentUser.uid}/${adId}`), ad);
    await set(ref(db, `pendingAds/${adId}`), ad);

    alert("E'lon yuborildi. Admin tasdiqlashini kuting.");
    clearAddForm();

  } catch(err){
    console.error(err);
    alert("E'londa xatolik");
  }
}

function clearAddForm(){
  ["adType","fromRegion","fromDistrict","toRegion","toDistrict","price","adComment"]
  .forEach(id=>{
    const el = $id(id);
    if(el) el.value = "";
  });

  if($id("fromDistrict")) $id("fromDistrict").innerHTML = '<option value="">Tumanni tanlang</option>';
  if($id("toDistrict"))   $id("toDistrict").innerHTML   = '<option value="">Tumanni tanlang</option>';
}


// ===============================
//  LOAD USER ADS (REALTIME)
// ===============================

function loadUserAds(){
  if(!currentUser) return;

  const userAdsRef = ref(db, `userAds/${currentUser.uid}`);
  onValue(userAdsRef, snap=>{
    const obj = snap.val() || {};
    const list = Object.values(obj);

    // eski render funksiyalar ishlashi uchun localStorage ga joylaymiz
    localStorage.setItem("driverAds", JSON.stringify(list.filter(a=>a.type==="driver")));
    localStorage.setItem("passengerAds", JSON.stringify(list.filter(a=>a.type==="passenger")));

    renderAdsListFromLocal();
  });
}


// ===============================
//  RENDER ADS LIST
// ===============================

function renderAdsListFromLocal(){
  const driver = JSON.parse(localStorage.getItem("driverAds") || "[]");
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
      <div class="date-info">🕒 ${new Date(ad.createdAt).toLocaleString()} · Holat: ${ad.status}</div>

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


// EXPORT TO WINDOW
window.loadRegionsToSelects   = loadRegionsToSelects;
window.updateDistricts         = updateDistricts;
window.updateFilterDistricts   = updateFilterDistricts;
window.addAd                   = addAd;
window.clearAddForm            = clearAddForm;
window.renderAdsListFromLocal  = renderAdsListFromLocal;
// ===============================
// 3-QISM: EDIT / DELETE / VIEW PROFILE / RATINGS
// ===============================

// ---------- E'LONNI TAHIRLASH (simple prompt flow) ----------
async function startEditAd(adId){
  if(!currentUser) { alert('Tizimga kiring'); return; }

  try {
    const snap = await get(ref(db, `userAds/${currentUser.uid}/${adId}`));
    const ad = snap.val();
    if(!ad) return alert("E'lon topilmadi");
    if(ad.status === 'approved') return alert("Tasdiqlangan e'londa o'zgartirish mumkin emas");

    const newPrice = prompt("Yangi narxni kiriting:", ad.price || '');
    if(newPrice === null) return; // cancel

    const updates = { price: newPrice, edited: true, status: 'pending', editedAt: new Date().toISOString() };

    // update main / user / pending
    await update(ref(db, `ads/${adId}`), updates).catch(()=>{});
    await update(ref(db, `userAds/${currentUser.uid}/${adId}`), updates).catch(()=>{});
    await update(ref(db, `pendingAds/${adId}`), updates).catch(()=>{});

    alert("E'lon yangilandi. Admin tasdiqlashini kuting.");
  } catch(e){
    console.error("startEditAd error", e);
    alert("E'lonni tahrirlashda xatolik");
  }
}

// ---------- E'LONNI O'CHIRISH ----------
async function deleteAd(adId){
  if(!currentUser) { alert('Tizimga kiring'); return; }
  if(!confirm("Haqiqatan o'chirmoqchimisiz?")) return;

  try {
    await remove(ref(db, `ads/${adId}`)).catch(()=>{});
    await remove(ref(db, `userAds/${currentUser.uid}/${adId}`)).catch(()=>{});
    await remove(ref(db, `pendingAds/${adId}`)).catch(()=>{});
    // UI yangilanishi realtime listener orqali bo'ladi
    alert("E'lon o'chirildi");
  } catch(e){
    console.error("deleteAd error", e);
    alert("E'lonni o'chirishda xatolik");
  }
}

// ---------- FOYDALANUVCHI BAHOLARI (LISTENER) ----------
function listenUserRatings(uid, cb){
  const rRef = ref(db, `ratings/${uid}`);
  onValue(rRef, snap=>{
    const obj = snap.val() || {};
    const list = Object.values(obj);
    let avg = 0;
    if(list.length) avg = (list.reduce((s,r)=> s + (Number(r.stars)||0), 0) / list.length).toFixed(2);
    cb({ ratings: list, avg, count: list.length });
  }, err => { console.error("listenUserRatings onValue error", err); cb({ ratings:[], avg:0, count:0 }); });
}

// ---------- PROFILNI KO'RISH (modal) ----------
async function openViewProfile(uid){
  if(!uid) return;
  try {
    const uSnap = await get(ref(db, `users/${uid}`));
    const user = uSnap.val() || {};

    if($id('vpName')) $id('vpName').textContent = user.name || 'Foydalanuvchi';
    if($id('vpPhone')) $id('vpPhone').textContent = user.phone || '—';

    // reytinglarni obuna qilamiz
    listenUserRatings(uid, (data)=>{
      if($id('vpRatingSummary')) $id('vpRatingSummary').innerHTML = `<strong>${data.avg || '—'} / 5</strong> — ${data.count} ta baho`;
    });

    // ushbu userning e'lonlarini yuklab qo'yamiz (one-time)
    const adsSnap = await get(ref(db, `userAds/${uid}`));
    const ads = adsSnap.val() ? Object.values(adsSnap.val()) : [];
    const vpList = $id('vpAdsList');
    if(vpList){
      if(!ads.length) vpList.innerHTML = '<p class="small">E\\'lonlari yo\\'q.</p>';
      else {
        vpList.innerHTML = ads.map(a=>{
          return `<div style="padding:6px;border-bottom:1px solid #eee;"><b>${a.type==='driver'?'Haydovchi':'Yo\'lovchi'}</b> · ${escapeHtml(a.fromRegion||'')} → ${escapeHtml(a.toRegion||'')} · ${escapeHtml(a.price||'')} so'm<br><small class="small">${new Date(a.createdAt).toLocaleString()}</small></div>`;
        }).join('');
      }
    }

    // baholash qismi: agar haqiqiy user va hali baho bermagan bo'lsa - shakl
    const cur = currentUser;
    const vpRateSection = $id('vpRateSection');
    if(!vpRateSection) return;
    if(!cur){
      vpRateSection.innerHTML = '<div class="small">Baholash uchun tizimga kiring.</div>';
    } else if(cur.uid === uid){
      vpRateSection.innerHTML = '<div class="small">Siz o\\'zingizni baholay olmaysiz.</div>';
    } else {
      // tekshir: allaqachon baho berganmi?
      const ratedSnap = await get(ref(db, `ratings/${uid}/${cur.uid}`));
      if(ratedSnap.exists()){
        vpRateSection.innerHTML = '<div class="small">Siz allaqachon baho bergansiz.</div>';
      } else {
        vpRateSection.innerHTML = `
          <div style="margin-top:8px;">
            <label><b>⭐ Baho tanlang</b></label>
            <div style="margin-top:6px;">
              <select id="vpRatingStars"><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option></select>
            </div>
            <div style="margin-top:6px;"><textarea id="vpRatingText" rows="2" placeholder="Ixtiyoriy izoh..."></textarea></div>
            <div style="margin-top:8px;text-align:right;"><button id="vpSubmitBtn">Yuborish</button></div>
          </div>
        `;
        // attach handler (dynamic element)
        const btn = $id('vpSubmitBtn');
        if(btn) btn.addEventListener('click', ()=> submitProfileRating(uid));
      }
    }

    // ochamiz
    const modal = $id('viewProfileModal');
    if(modal) modal.style.display = 'flex';

  } catch(e){
    console.error("openViewProfile error", e);
    alert("Profilni ochishda xatolik");
  }
}

// ---------- BAHO YUBORISH ----------
async function submitProfileRating(targetUid){
  if(!currentUser){ alert('Baholash uchun tizimga kiring'); return; }
  if(currentUser.uid === targetUid){ alert("O'zingizni baholay olmaysiz"); return; }

  const starsEl = $id('vpRatingStars');
  if(!starsEl){ alert('Baho elementi topilmadi'); return; }
  const stars = Number(starsEl.value) || 5;
  const text = ($id('vpRatingText') && $id('vpRatingText').value.trim()) || '';

  try {
    // yozish
    await set(ref(db, `ratings/${targetUid}/${currentUser.uid}`), { stars, text, date: new Date().toISOString(), raterUid: currentUser.uid });

    // qayta hisoblab users/{targetUid}.ratingAvg & ratingCount
    const snap = await get(ref(db, `ratings/${targetUid}`));
    const all = snap.val() ? Object.values(snap.val()) : [];
    let avg = 0;
    if(all.length) avg = (all.reduce((s,r)=> s + (Number(r.stars)||0), 0) / all.length);
    await update(ref(db, `users/${targetUid}`), { ratingAvg: +(avg.toFixed(2)), ratingCount: all.length });

    alert('Baho yuborildi!');
    openViewProfile(targetUid); // yangilash
  } catch(e){
    console.error("submitProfileRating error", e);
    alert('Baho yuborishda xatolik');
  }
}

// ---------- STATUS SYNC (NOTIFICATIONS) ----------
function startStatusSync(){
  if(!currentUser) return;
  const userAdsRef = ref(db, `userAds/${currentUser.uid}`);
  onValue(userAdsRef, snap=>{
    const obj = snap.val() || {};
    const list = Object.values(obj || []);
    list.forEach(ad=>{
      const prev = lastStatuses[ad.id];
      const now = ad.status;
      if(prev && prev !== now){
        if(now === "approved") alert(`✅ E'lon tasdiqlandi:\n${ad.fromRegion} → ${ad.toRegion}`);
        else if(now === "rejected") alert(`❌ E'lon rad etildi:\n${ad.fromRegion} → ${ad.toRegion}`);
      }
      lastStatuses[ad.id] = now;
    });
    renderAdsListFromLocal();
  }, err => console.error("startStatusSync error", err));
}

// ---------- HELPERS (modal close / contact) ----------
function closeViewProfile(){ const m = $id('viewProfileModal'); if(m) m.style.display = 'none'; }
function contactOwner(phone){ if(!phone) return alert("Telefon mavjud emas"); window.location.href = `tel:${phone}`; }

// ---------- EXPORTS ----------
window.startEditAd = startEditAd;
window.deleteAd = deleteAd;
window.openViewProfile = openViewProfile;
window.submitProfileRating = submitProfileRating;
window.startStatusSync = startStatusSync;
window.closeViewProfile = closeViewProfile;
window.contactOwner = contactOwner;
// ===============================
//  RATINGS + VIEW PROFILE
// ===============================
function listenUserRatings(uid, cb){
  const ratingsRef = ref(db, `ratings/${uid}`);
  onValue(ratingsRef, snap=>{
    const data = snap.val() || {};
    const list = Object.values(data || {});
    let avg = 0;
    if(list.length > 0){
      avg = (list.reduce((s,r)=> s + (Number(r.stars)||0), 0) / list.length).toFixed(2);
    }
    cb({ ratings: list, avg, count: list.length });
  }, (err)=>console.error(err));
}

async function openViewProfile(uid){
  if(!uid) return;
  try{
    const uSnap = await get(ref(db, `users/${uid}`));
    const user = uSnap.val() || {};
    if($id('vpName')) $id('vpName').textContent = user.name || 'Foydalanuvchi';
    if($id('vpPhone')) $id('vpPhone').textContent = user.phone || '';

    listenUserRatings(uid, (data)=>{
      if($id('vpRatingSummary')) $id('vpRatingSummary').innerHTML =
        `<strong>${data.avg || '—'} / 5</strong> — ${data.count} ta baho`;
    });

    const snap = await get(ref(db, `userAds/${uid}`));
    const ads = snap.val() ? Object.values(snap.val()) : [];
    const vpList = $id('vpAdsList');
    if(vpList){
      if(!ads.length) vpList.innerHTML = '<p class="small">E\'lonlari yo\'q.</p>';
      else {
        vpList.innerHTML = ads.map(a=>{
          return `
            <div style="padding:6px;border-bottom:1px solid #eee;">
              <b>${a.type==='driver'?'Haydovchi':"Yo'lovchi"}</b> ·
              ${escapeHtml(a.fromRegion||'')} → ${escapeHtml(a.toRegion||'')}
              · ${escapeHtml(a.price||'')} so'm
              <br>
              <small class="small">${new Date(a.createdAt).toLocaleString()}</small>
            </div>
          `;
        }).join('');
      }
    }

    const cur = currentUser;
    const vpRateSection = $id('vpRateSection');
    if(vpRateSection){
      if(!cur){
        vpRateSection.innerHTML = '<div class="small">Baholash uchun tizimga kiring.</div>';
      } else if(cur.uid === uid){
        vpRateSection.innerHTML = '<div class="small">Siz o\'zingizni baholay olmaysiz.</div>';
      } else {
        const ratedSnap = await get(ref(db, `ratings/${uid}/${cur.uid}`));
        if(ratedSnap.exists()){
          vpRateSection.innerHTML = '<div class="small">Siz allaqachon baho bergansiz.</div>';
        } else {
          vpRateSection.innerHTML = `
            <div style="margin-top:8px;">
              <label><b>⭐ Baho tanlang</b></label>
              <div style="margin-top:6px;">
                <select id="vpRatingStars">
                  <option value="5">5</option><option value="4">4</option>
                  <option value="3">3</option><option value="2">2</option>
                  <option value="1">1</option>
                </select>
              </div>
              <div style="margin-top:6px;">
                <textarea id="vpRatingText" rows="2" placeholder="Ixtiyoriy izoh..."></textarea>
              </div>
              <div style="margin-top:8px;text-align:right;">
                <button id="vpSubmitBtn">Yuborish</button>
              </div>
            </div>
          `;
          const btn = $id('vpSubmitBtn');
          if(btn) btn.onclick = ()=> submitProfileRating(uid);
        }
      }
    }

    const modal = $id('viewProfileModal');
    if(modal) modal.style.display = 'flex';
  } catch(e){
    console.error(e); alert("Profilni ochishda xatolik");
  }
}

async function submitProfileRating(targetUid){
  if(!currentUser){ alert('Baholash uchun tizimga kiring'); return; }
  if(currentUser.uid === targetUid){ alert("O'zingizni baholay olmaysiz"); return; }

  const stars = Number($id('vpRatingStars').value) || 5;
  const text = ($id('vpRatingText')?.value.trim()) || '';

  try{
    await set(ref(db, `ratings/${targetUid}/${currentUser.uid}`), {
      stars, text, date: new Date().toISOString(), raterUid: currentUser.uid
    });

    const snap = await get(ref(db, `ratings/${targetUid}`));
    const all = snap.val() ? Object.values(snap.val()) : [];
    let avg = 0;
    if(all.length) avg = (all.reduce((s,r)=> s + (Number(r.stars)||0), 0) / all.length);

    await update(ref(db, `users/${targetUid}`), {
      ratingAvg: +(avg.toFixed(2)), ratingCount: all.length
    });

    alert('Baho yuborildi!');
    openViewProfile(targetUid);
  } catch(e){
    console.error(e); alert('Baho yuborishda xatolik');
  }
}

// ===============================
//  STATUS SYNC (approved/rejected alert)
// ===============================
function startStatusSync(){
  if(!currentUser) return;

  const userAdsRef = ref(db, `userAds/${currentUser.uid}`);
  onValue(userAdsRef, snap=>{
    const adsObj = snap.val() || {};
    const ads = Object.values(adsObj);

    ads.forEach(ad=>{
      const prev = lastStatuses[ad.id];
      const now = ad.status;

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

// ===============================
//  UTILS
// ===============================
function logout(){
  signOut(auth).then(()=>{
    alert("Chiqdingiz");
    location.reload();
  }).catch(err=> console.error(err));
}

function closeViewProfile(){
  const modal = $id('viewProfileModal');
  if(modal) modal.style.display = 'none';
}

function contactOwner(phone){
  if(!phone) return alert("Telefon yo'q");
  window.location.href = `tel:${phone}`;
}

// ===============================
//  EXPORT to window
// ===============================
window.openViewProfile = openViewProfile;
window.submitProfileRating = submitProfileRating;
window.closeViewProfile = closeViewProfile;
window.contactOwner = contactOwner;
window.logout = logout;

// ===============================
//  INIT on DOM READY
// ===============================
document.addEventListener('DOMContentLoaded', ()=>{
  loadRegionsToSelects();
  setTimeout(()=>{ if(currentUser) startStatusSync(); }, 600);
});
