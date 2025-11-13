import {
  initializeAppCheck,
  ReCaptchaV3Provider
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app-check.js";

// ===============================
//  FIREBASE 9 — MODULAR IMPORTS
// ===============================
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";

import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

import {
  getDatabase,
  ref,
  set,
  get,
  update,
  push,
  onValue,
  remove
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ===============================
//  GLOBAL VARIABLES
// ===============================
let currentUser = null;

// ===============================
//  PHONE LOGIN (SMS)
// ===============================

// reCAPTCHA (ko‘rinmaydigan)
window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
  size: "invisible",
});

// SMS yuborish
window.sendSMS = function () {
  const phone = document.getElementById("loginPhone").value.trim();

  const uzRegex = /^\+998\d{9}$/;
  if (!uzRegex.test(phone)) {
    alert("Telefonni to‘g‘ri kiriting: +998901234567");
    return;
  }

  signInWithPhoneNumber(auth, phone, window.recaptchaVerifier)
    .then((confirmationResult) => {
      window.confirmationResult = confirmationResult;
      alert("SMS yuborildi!");
    })
    .catch((error) => {
      console.error(error);
      alert("SMS yuborishda xatolik!");
    });
};

// Kodni tasdiqlash
window.verifySMS = function () {
  const code = document.getElementById("smsCode").value.trim();

  confirmationResult
    .confirm(code)
    .then((result) => {
      alert("Kirish muvaffaqiyatli!");
    })
    .catch((e) => {
      alert("Kod noto‘g‘ri!");
    });
};

// ===============================
//  AUTH STATE LISTENER
// ===============================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;

    // Users bo‘limida saqlaymiz
    await update(ref(db, "users/" + user.uid), {
      phone: user.phoneNumber,
      name: user.phoneNumber,
    });

    loadUserProfile();
    loadUserAds();
  } else {
    currentUser = null;
  }
});
// ===============================
//  2-QISM: USER PROFILE, ADS, REGIONS, RENDER
// ===============================

// ---------- REGIONS DATA ----------
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

// ---------- HELPERS ----------
function escapeHtml(str){
  if(!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

// ---------- LOAD USER PROFILE FROM DB ----------
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

function updateProfileHeader(user){
  document.getElementById('profileName').textContent = user.name || 'Foydalanuvchi';
  document.getElementById('profilePhone').textContent = user.phone || '—';

  // rating placeholders — we'll fill when viewing profile via listenUserRatings
  document.getElementById('profileRatingBig').textContent = user.ratingAvg ? `${user.ratingAvg} / 5` : '—';
  document.getElementById('profileRatingCount').textContent = user.ratingCount ? `${user.ratingCount} ta baho` : 'Hozircha baholar yo‘q';

  // Show edit only when current user's own profile is visible
  const editBtn = document.getElementById('editProfileBtn');
  if(currentUser) editBtn.style.display = 'inline-block';
  else editBtn.style.display = 'none';
}

// ---------- PROFILE EDIT ----------
function openEditProfile(){
  if(!currentUser){ alert('Tizimga kiring'); return; }
  // load values
  get(ref(db, `users/${currentUser.uid}`)).then(snap=>{
    const data = snap.val() || {};
    document.getElementById('editFullName').value = data.name || '';
    document.getElementById('editPhoneInput').value = data.phone || '';
    document.getElementById('editProfileModal').style.display = 'flex';
  });
}
function closeEditProfile(){ document.getElementById('editProfileModal').style.display = 'none'; }

async function saveProfileEdit(){
  if(!currentUser) return;
  const name = document.getElementById('editFullName').value.trim();
  const phone = document.getElementById('editPhoneInput').value.trim();

  const phoneRegex = /^\+998\d{9}$/;
  if(!phoneRegex.test(phone)){
    alert("Telefon raqamni to‘g‘ri kiriting! (+998901234567)");
    return;
  }

  try{
    await update(ref(db, `users/${currentUser.uid}`), {
      name, phone
    });
    alert('Profil yangilandi');
    loadUserProfile();
    closeEditProfile();
  } catch(e){
    console.error(e); alert('Profilni saqlashda xatolik');
  }
}

// ---------- REGIONS SELECT POPULATION ----------
function loadRegionsToSelects(){
  ['fromRegion','toRegion','filterFromRegion','filterToRegion'].forEach(id=>{
    const sel = document.getElementById(id);
    if(!sel) return;
    sel.innerHTML = '<option value="">Viloyatni tanlang</option>';
    Object.keys(regions).forEach(r=>{
      const opt = document.createElement('option'); opt.value = r; opt.textContent = r;
      sel.appendChild(opt);
    });
  });
}
function updateDistricts(prefix){
  const region = document.getElementById(prefix+'Region').value;
  const districtSel = document.getElementById(prefix+'District');
  if(!districtSel) return;
  districtSel.innerHTML = '<option value="">Tumanni tanlang</option>';
  if(region && regions[region]){
    regions[region].forEach(d=>{
      const opt = document.createElement('option'); opt.value = d; opt.textContent = d;
      districtSel.appendChild(opt);
    });
  }
}
function updateFilterDistricts(prefix){
  const region = document.getElementById(prefix+'Region').value;
  const districtSel = document.getElementById(prefix+'District');
  if(!districtSel) return;
  districtSel.innerHTML = '<option value="">Tanlang</option>';
  if(region && regions[region]){
    regions[region].forEach(d=> districtSel.add(new Option(d,d)));
  }
  // update view
  renderAdsListFromLocal(); // for local list rendering (in case)
}

// ---------- ADD NEW AD (writes to ads/ and userAds/) ----------
async function addAd(){
  if(!currentUser){
    alert('Avval tizimga kiring!');
    return;
  }
  const type = document.getElementById('adType').value;
  const fromRegion = document.getElementById('fromRegion').value.trim();
  const fromDistrict = document.getElementById('fromDistrict').value.trim();
  const toRegion = document.getElementById('toRegion').value.trim();
  const toDistrict = document.getElementById('toDistrict').value.trim();
  const price = document.getElementById('price').value.trim();
  const comment = document.getElementById('adComment').value.trim();

  if(!type || !fromRegion || !toRegion){
    alert("Iltimos yo'nalishni to'liq to'ldiring");
    return;
  }

  // unique id via push()
  const newRef = push(ref(db, 'ads'));
  const adId = newRef.key;
  const adData = {
    id: adId,
    ownerUid: currentUser.uid,
    ownerPhone: currentUser.phoneNumber || "",
    type,
    fromRegion, fromDistrict,
    toRegion, toDistrict,
    price: price || "",
    comment: comment || "",
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  try{
    // save main ad
    await set(ref(db, `ads/${adId}`), adData);
    // also save under user's ads for quick listing
    await set(ref(db, `userAds/${currentUser.uid}/${adId}`), adData);

    alert('✅ E\'lon yuborildi. Admin tasdiqlashini kuting.');
    clearAddForm();
  }catch(e){
    console.error(e); alert('E\'lonni yuborishda xatolik');
  }
}

function clearAddForm(){
  const ids = ['adType','fromRegion','fromDistrict','toRegion','toDistrict','price','adComment'];
  ids.forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    if(el.tagName === 'SELECT' || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.value = '';
  });
  // reset districts selects
  if(document.getElementById('fromDistrict')) document.getElementById('fromDistrict').innerHTML = '<option value="">Tumanni tanlang</option>';
  if(document.getElementById('toDistrict')) document.getElementById('toDistrict').innerHTML = '<option value="">Tumanni tanlang</option>';
}

// ---------- LOAD CURRENT USER ADS (REALTIME) ----------
let _userAdsListener = null;
function loadUserAds(){
  if(!currentUser) return;
  const userAdsRef = ref(db, `userAds/${currentUser.uid}`);
  // detach previous if exists
  if(_userAdsListener) _userAdsListener(); // note: onValue returns unsubscribe in modular? We'll manually manage by onValue's return not provided; use onValue and store ref.
  // Using onValue:
  onValue(userAdsRef, async (snap)=>{
    const data = snap.val() || {};
    // data is object of adId -> adData
    const list = Object.values(data);
    // store to localStorage fallback for existing UI that uses localStorage
    localStorage.setItem('driverAds', JSON.stringify(list.filter(a=>a.type==='driver')));
    localStorage.setItem('passengerAds', JSON.stringify(list.filter(a=>a.type==='passenger')));
    // render
    renderAdsListFromLocal();
  });
}

// ---------- RENDER (backwards compatible with previous renderAdsList) ----------
function renderAdsListFromLocal(){
  // This reuses existing HTML layout expecting driverAds/passengerAds in localStorage
  // So we simply call original renderAdsList if exists, else do basic rendering here.

  if(typeof renderAdsList === 'function'){
    // original renderAdsList uses localStorage keys — update them already above
    renderAdsList();
    return;
  }

  // Fallback simple render (if original function was replaced)
  const driver = JSON.parse(localStorage.getItem('driverAds') || '[]');
  const passenger = JSON.parse(localStorage.getItem('passengerAds') || '[]');
  const all = [...driver.map(a=>({...a,type:'driver'})), ...passenger.map(a=>({...a,type:'passenger'}))];
  const container = document.getElementById('myAds');
  container.innerHTML = '';
  if(all.length === 0){ container.innerHTML = '<p>Hozircha e’lonlar yo‘q.</p>'; return; }
  all.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
  all.forEach(ad=>{
    const div = document.createElement('div');
    div.className = 'ad-box ' + (ad.status || 'pending');
    const from = `${ad.fromRegion || ''} ${ad.fromDistrict || ''}`;
    const to = `${ad.toRegion || ''} ${ad.toDistrict || ''}`;
    div.innerHTML = `
      <div><b>Yo'nalish:</b> ${escapeHtml(from)} → ${escapeHtml(to)}</div>
      <div><b>Narx:</b> ${escapeHtml(ad.price || '—')} so'm</div>
      <div><b>Telefon:</b> ${escapeHtml(ad.ownerPhone || ad.phone || '—')}</div>
      <div class="date-info">🕒 Joylangan: ${new Date(ad.createdAt).toLocaleString()} · Holat: ${escapeHtml(ad.status || 'pending')}</div>
      <div class="actions">
        ${(ad.status!=='approved') ? `<button onclick="startEditAd('${ad.id}')">✏️ Tahrirlash</button>` : `<button disabled style="background:#ccc">✏️ Tahrirlash</button>`}
        <button onclick="deleteAd('${ad.id}')">🗑️ O'chirish</button>
      </div>
    `;
    container.appendChild(div);
  });
}

// ---------- EDIT / DELETE ADS (Firebase) ----------
function startEditAd(adId){
  if(!currentUser) { alert('Tizimga kiring'); return; }
  // read ad from userAds
  get(ref(db, `userAds/${currentUser.uid}/${adId}`)).then(snap=>{
    const ad = snap.val();
    if(!ad) return alert('E\'lon topilmadi');
    if(ad.status === 'approved') return alert("Tasdiqlangan e'londa o'zgartirish mumkin emas");
    // fill a simple prompt-based flow or open a modal if you have
    const newPrice = prompt('Yangi narxni kiriting:', ad.price || '');
    if(newPrice === null) return;
    const updates = { price: newPrice, edited: true, status: 'pending', editedAt: new Date().toISOString() };
    // update both paths
    update(ref(db, `ads/${adId}`), updates);
    update(ref(db, `userAds/${currentUser.uid}/${adId}`), updates);
    // also update pendingAds for admin review
    update(ref(db, `pendingAds/${adId}`), updates);
    alert('E\'lon yangilandi. Admin tasdiqlashini kuting.');
  });
}

function deleteAd(adId){
  if(!currentUser) { alert('Tizimga kiring'); return; }
  if(!confirm('Haqiqatan o\'chirilsinmi?')) return;
  // remove from ads and userAds and pendingAds
  remove(ref(db, `ads/${adId}`)).catch(console.error);
  remove(ref(db, `userAds/${currentUser.uid}/${adId}`)).catch(console.error);
  remove(ref(db, `pendingAds/${adId}`)).catch(console.error);
  // local update will be handled by realtime listener
  alert('E\'lon o\'chirildi');
}

// ---------- VIEW OTHER USER PROFILE + RATINGS ----------
function listenUserRatings(uid, cb){
  const ratingsRef = ref(db, `ratings/${uid}`);
  onValue(ratingsRef, snap=>{
    const data = snap.val() || {};
    const list = Object.values(data);
    let avg = 0;
    if(list.length > 0){
      avg = (list.reduce((s,r)=> s + (Number(r.stars)||0), 0) / list.length).toFixed(2);
    }
    cb({ ratings: list, avg, count: list.length });
  });
}

async function openViewProfile(uid){
  if(!uid) return;
  // get user data
  const uSnap = await get(ref(db, `users/${uid}`));
  const user = uSnap.val() || {};
  document.getElementById('vpName').textContent = user.name || 'Foydalanuvchi';
  document.getElementById('vpPhone').textContent = user.phone || '';

  // ratings
  listenUserRatings(uid, (data)=>{
    document.getElementById('vpRatingSummary').innerHTML = `<strong>${data.avg || '—'} / 5</strong> — ${data.count} ta baho`;
  });

  // list ads of that user (once)
  get(ref(db, `userAds/${uid}`)).then(snap=>{
    const data = snap.val() || {};
    const ads = Object.values(data);
    const vpList = document.getElementById('vpAdsList');
    if(!ads.length) vpList.innerHTML = '<p class="small">E\'lonlari yo\'q.</p>';
    else {
      vpList.innerHTML = ads.map(a=>{
        return `<div style="padding:6px;border-bottom:1px solid #eee;"><b>${a.type==='driver'?'Haydovchi':'Yo\'lovchi'}</b> · ${escapeHtml(a.fromRegion||'')} → ${escapeHtml(a.toRegion||'')} · ${escapeHtml(a.price||'')} so'm<br><small class="small">${new Date(a.createdAt).toLocaleString()}</small></div>`;
      }).join('');
    }
  });

  // rating input area
  const cur = currentUser;
  const vpRateSection = document.getElementById('vpRateSection');
  if(!cur){
    vpRateSection.innerHTML = '<div class="small">Baholash uchun tizimga kiring.</div>';
  } else if(cur.uid === uid){
    vpRateSection.innerHTML = '<div class="small">Siz o\'zingizni baholay olmaysiz.</div>';
  } else {
    // check if already rated
    get(ref(db, `ratings/${uid}/${cur.uid}`)).then(snap=>{
      if(snap.exists()){
        vpRateSection.innerHTML = '<div class="small">Siz allaqachon baho bergansiz.</div>';
      } else {
        vpRateSection.innerHTML = `
          <div style="margin-top:8px;">
            <label><b>⭐ Baho tanlang</b></label>
            <div style="margin-top:6px;">
              <select id="vpRatingStars">
                <option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option>
              </select>
            </div>
            <div style="margin-top:6px;"><textarea id="vpRatingText" rows="2" placeholder="Ixtiyoriy izoh..."></textarea></div>
            <div style="margin-top:8px;text-align:right;"><button onclick="submitProfileRating('${uid}')">Yuborish</button></div>
          </div>
        `;
      }
    });
  }

  document.getElementById('viewProfileModal').style.display = 'flex';
}

async function submitProfileRating(targetUid){
  if(!currentUser){ alert('Baholash uchun tizimga kiring'); return; }
  const stars = Number(document.getElementById('vpRatingStars').value) || 5;
  const text = (document.getElementById('vpRatingText').value || '').trim();
  if(currentUser.uid === targetUid) { alert("O'zingizni baholay olmaysiz"); return; }

  // write rating under ratings/targetUid/raterUid
  await set(ref(db, `ratings/${targetUid}/${currentUser.uid}`), {
    stars, text, date: new Date().toISOString(), raterUid: currentUser.uid
  });

  alert('Baho yuborildi!');
  // update user's summary (optional): recompute avg & count and save under users/targetUid
  const snap = await get(ref(db, `ratings/${targetUid}`));
  const all = snap.val() ? Object.values(snap.val()) : [];
  let avg = 0;
  if(all.length) avg = (all.reduce((s,r)=> s + (Number(r.stars)||0), 0) / all.length);
  await update(ref(db, `users/${targetUid}`), { ratingAvg: +(avg.toFixed(2)), ratingCount: all.length });

  // refresh view
  openViewProfile(targetUid);
}

// ---------- LOGOUT ----------
function logout(){
  signOut(auth).then(()=> { alert('Chiqdingiz'); location.reload(); }).catch(e=>console.error(e));
}

// ---------- EXPORTS TO WINDOW for HTML buttons (since module scope) ----------
window.loadRegionsToSelects = loadRegionsToSelects;
window.updateDistricts = updateDistricts;
window.updateFilterDistricts = updateFilterDistricts;
window.addAd = addAd;
window.clearAddForm = clearAddForm;
window.openEditProfile = openEditProfile;
window.saveProfileEdit = saveProfileEdit;
window.closeEditProfile = closeEditProfile;
window.openViewProfile = openViewProfile;
window.submitProfileRating = submitProfileRating;
window.startEditAd = startEditAd;
window.deleteAd = deleteAd;
window.logout = logout;

// ---------- INIT on DOMContentLoaded (will be called at bottom if needed) ----------
document.addEventListener('DOMContentLoaded', ()=>{
  // populate selects
  loadRegionsToSelects();

  // If user logged in, load profile & ads will be triggered by onAuthStateChanged (from 1-qism)
  // But if you want to allow manual testing, you can call loginMock style helper if you created one.
});
// ======================================
// 3-QISM: STATUS SYNC, CONTACT, MODAL
// ======================================

// ----------- PROFIL MODALNI YOPISH -----------
window.closeViewProfile = function () {
  document.getElementById('viewProfileModal').style.display = 'none';
};

// ----------- TELEFON QO'NG'IROQ -----------
window.contactOwner = function (phone) {
  if (!phone) return alert("Telefon raqam mavjud emas");
  // Mobil brauzerda direkt qo'ng'iroq qiladi
  window.location.href = `tel:${phone}`;
};

// ==========================================
//  REAL-TIME STATUS O‘ZGARISH (Approved/Rejected)
// ==========================================

let lastStatuses = {};   // avvalgi holatni saqlaymiz

function startStatusSync() {
  if (!currentUser) return;

  const userAdsRef = ref(db, `userAds/${currentUser.uid}`);

  onValue(userAdsRef, snap => {
    const adsObj = snap.val() || {};
    const ads = Object.values(adsObj);

    ads.forEach(ad => {
      const prev = lastStatuses[ad.id];
      const now = ad.status;

      if (prev && prev !== now) {
        // Status o'zgardi – alert chiqaramiz
        if (now === "approved") {
          alert(`✅ E'lon tasdiqlandi:\n${ad.fromRegion} → ${ad.toRegion}`);
        } 
        else if (now === "rejected") {
          alert(`❌ E'lon rad etildi:\n${ad.fromRegion} → ${ad.toRegion}`);
        }
      }

      lastStatuses[ad.id] = now;  // yangisini saqlaymiz
    });

    // UI ni yangilash (localStorage ga yozilgan list orqali)
    renderAdsListFromLocal();
  });
}

// ==========================================
//  PENDING ADS → ADMIN PANEL UCHUN TAYYOR
// ==========================================
// Admin panel buni o'qiydi:
//   pendingAds/{adId}
// Status tasdiqlangandan keyin admin ads/{id} ni yangilaydi
// Va userAds/{uid}/{id} ham avtomatik real-time yangilanadi.

// ==========================================
//  MODAL BACKDROP YOPISH (click outside)
// ==========================================
document.addEventListener("click", function (e) {
  document.querySelectorAll('.modal').forEach(m => {
    if (e.target === m) m.style.display = 'none';
  });
});

// ==========================================
//  DOM LOADED → Boshlang'ich ishlar
// ==========================================
document.addEventListener('DOMContentLoaded', () => {

  // Regionlarni yuklash
  loadRegionsToSelects();

  // Auth bo‘lgan user uchun status sync avtomatik ishlaydi
  // Lekin kechikmasligi uchun:
  setTimeout(() => {
    if (currentUser) startStatusSync();
  }, 600);

});
