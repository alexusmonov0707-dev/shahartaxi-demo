// profile.js
// Full profile script — uses Firebase modular SDK (v9 style)
// Replace your existing profile.js with this file (keep your HTML as-is).

// ===============================
//  IMPORTS (Firebase modular)
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getDatabase, ref, set, get, update, push, onValue, remove
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app-check.js";

// ===============================
//  FIREBASE CONFIG (keep same as your project)
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

// OPTIONAL: App Check (if you have site key). If not, you can comment this block out.
// initializeAppCheck(app, {
//   provider: new ReCaptchaV3Provider("SIZNING_SITE_KEY_HERE"),
//   isTokenAutoRefreshEnabled: true
// });

// ===============================
//  GLOBALS
// ===============================
let currentUser = null;
let lastStatuses = {}; // for status change notifications

// ===============================
//  REGIONS DATA (example — same as you used)
// ===============================
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
//  HELPERS
// ===============================
function escapeHtml(str){
  if(!str && str !== 0) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

// small helper: safe get element
function $id(id){ return document.getElementById(id); }

// ===============================
//  AUTH STATE
// ===============================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    // Ensure user record exists/updated in DB
    try {
      await update(ref(db, `users/${user.uid}`), {
        phone: user.phoneNumber || "",
        name: user.displayName || (user.phoneNumber || "")
      });
    } catch(e){
      // If update fails because not existing, try set
      try { await set(ref(db, `users/${user.uid}`), { phone: user.phoneNumber || "", name: user.phoneNumber || "" }); } catch(err){ console.error(err); }
    }

    // load their profile and ads
    loadUserProfile();
    loadUserAds();
    // start status sync notifications
    startStatusSync();
  } else {
    currentUser = null;
    // Clean UI
    updateProfileHeader({});
    // clear ads list
    if ($id('myAds')) $id('myAds').innerHTML = '<p>Hozircha e’lonlar yo‘q.</p>';
  }
});

// ===============================
//  PROFILE LOADING / RENDER
// ===============================
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
  if(!$id('profileName')) return; // page may not have profile elements
  $id('profileName').textContent = user.name || 'Foydalanuvchi';
  $id('profilePhone').textContent = user.phone || '—';
  $id('profileRatingBig').textContent = user.ratingAvg ? `${user.ratingAvg} / 5` : '—';
  $id('profileRatingCount').textContent = user.ratingCount ? `${user.ratingCount} ta baho` : 'Hozircha baholar yo‘q';

  const editBtn = $id('editProfileBtn');
  if(editBtn) editBtn.style.display = currentUser ? 'inline-block' : 'none';
}

// ===============================
//  PROFILE EDIT
// ===============================
function openEditProfile(){
  if(!currentUser){ alert('Tizimga kiring'); return; }
  get(ref(db, `users/${currentUser.uid}`)).then(snap=>{
    const data = snap.val() || {};
    if($id('editFullName')) $id('editFullName').value = data.name || '';
    if($id('editPhoneInput')) $id('editPhoneInput').value = data.phone || '';
    const modal = $id('editProfileModal');
    if(modal) modal.style.display = 'flex';
  }).catch(e=>{ console.error(e); alert('Profilni yuklashda xatolik'); });
}

function closeEditProfile(){ const modal = $id('editProfileModal'); if(modal) modal.style.display = 'none'; }

async function saveProfileEdit(){
  if(!currentUser) return;
  const name = ($id('editFullName') && $id('editFullName').value.trim()) || '';
  const phone = ($id('editPhoneInput') && $id('editPhoneInput').value.trim()) || '';

  const phoneRegex = /^\+998\d{9}$/;
  if(!phoneRegex.test(phone)){
    alert("Telefon raqamni to‘g‘ri kiriting! (+998901234567)");
    return;
  }

  try{
    await update(ref(db, `users/${currentUser.uid}`), { name, phone });
    alert('Profil yangilandi');
    loadUserProfile();
    closeEditProfile();
  } catch(e){
    console.error(e); alert('Profilni saqlashda xatolik');
  }
}

// ===============================
//  REGIONS SELECT POPULATION
// ===============================
function loadRegionsToSelects(){
  ['fromRegion','toRegion','filterFromRegion','filterToRegion'].forEach(id=>{
    const sel = $id(id);
    if(!sel) return;
    sel.innerHTML = '<option value="">Viloyatni tanlang</option>';
    Object.keys(regions).forEach(r=>{
      const opt = document.createElement('option');
      opt.value = r; opt.textContent = r;
      sel.appendChild(opt);
    });
  });
}

function updateDistricts(prefix){
  const regionSelect = $id(prefix+'Region');
  const districtSel = $id(prefix+'District');
  if(!regionSelect || !districtSel) return;
  const region = regionSelect.value;
  districtSel.innerHTML = '<option value="">Tumanni tanlang</option>';
  if(region && regions[region]){
    regions[region].forEach(d=>{
      const opt = document.createElement('option'); opt.value = d; opt.textContent = d;
      districtSel.appendChild(opt);
    });
  }
}

function updateFilterDistricts(prefix){
  const regionSelect = $id(prefix+'Region');
  const districtSel = $id(prefix+'District');
  if(!regionSelect || !districtSel) return;
  const region = regionSelect.value;
  districtSel.innerHTML = '<option value="">Tanlang</option>';
  if(region && regions[region]){
    regions[region].forEach(d=> districtSel.add(new Option(d,d)));
  }
  // re-render local listing
  renderAdsListFromLocal();
}

// ===============================
//  ADD NEW AD
// ===============================
async function addAd(){
  if(!currentUser){ alert('Avval tizimga kiring!'); return; }
  const type = ($id('adType') && $id('adType').value) || '';
  const fromRegion = ($id('fromRegion') && $id('fromRegion').value.trim()) || '';
  const fromDistrict = ($id('fromDistrict') && $id('fromDistrict').value.trim()) || '';
  const toRegion = ($id('toRegion') && $id('toRegion').value.trim()) || '';
  const toDistrict = ($id('toDistrict') && $id('toDistrict').value.trim()) || '';
  const price = ($id('price') && $id('price').value.trim()) || '';
  const comment = ($id('adComment') && $id('adComment').value.trim()) || '';

  if(!type || !fromRegion || !toRegion){
    alert("Iltimos yo'nalishni to'liq to'ldiring");
    return;
  }

  try{
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

    await set(ref(db, `ads/${adId}`), adData);
    await set(ref(db, `userAds/${currentUser.uid}/${adId}`), adData);

    // optional pendingAds for admin
    await set(ref(db, `pendingAds/${adId}`), { ...adData });

    alert("✅ E'lon yuborildi. Admin tasdiqlashini kuting.");
    clearAddForm();
  } catch(e){
    console.error("addAd error", e);
    alert("E'lon yuborishda xatolik");
  }
}

function clearAddForm(){
  const ids = ['adType','fromRegion','fromDistrict','toRegion','toDistrict','price','adComment'];
  ids.forEach(id=>{
    const el = $id(id);
    if(!el) return;
    el.value = '';
    if(el.tagName === 'SELECT'){
      // reset to default option if present
      el.selectedIndex = 0;
    }
  });
  if($id('fromDistrict')) $id('fromDistrict').innerHTML = '<option value="">Tumanni tanlang</option>';
  if($id('toDistrict')) $id('toDistrict').innerHTML = '<option value="">Tumanni tanlang</option>';
}

// ===============================
//  LOAD USER ADS (realtime listener)
// ===============================
function loadUserAds(){
  if(!currentUser) return;
  const userAdsRef = ref(db, `userAds/${currentUser.uid}`);
  onValue(userAdsRef, (snap)=>{
    const data = snap.val() || {};
    const list = Object.keys(data).length ? Object.values(data) : [];
    // store to localStorage for backward compatibility with renderAdsList()
    localStorage.setItem('driverAds', JSON.stringify(list.filter(a=>a.type==='driver')));
    localStorage.setItem('passengerAds', JSON.stringify(list.filter(a=>a.type==='passenger')));
    renderAdsListFromLocal();
  }, (err)=>{
    console.error("loadUserAds onValue error", err);
  });
}

// ===============================
//  RENDER ADS (fallback + compatibility)
// ===============================
function renderAdsListFromLocal(){
  // if page has its own renderAdsList function (older code), prefer that
  if(typeof window.renderAdsList === 'function'){
    try { window.renderAdsList(); return; } catch(e){ console.warn(e); }
  }

  const driver = JSON.parse(localStorage.getItem('driverAds') || '[]');
  const passenger = JSON.parse(localStorage.getItem('passengerAds') || '[]');
  const all = [...driver.map(a=>({...a,type:'driver'})), ...passenger.map(a=>({...a,type:'passenger'}))];
  const container = $id('myAds');
  if(!container) return;
  container.innerHTML = '';
  if(all.length === 0){ container.innerHTML = '<p>Hozircha e’lonlar yo‘q.</p>'; return; }
  all.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
  all.forEach(ad=>{
    const div = document.createElement('div');
    div.className = 'ad-box ' + (ad.status || 'pending');
    const from = `${ad.fromRegion || ''} ${ad.fromDistrict || ''}`.trim();
    const to = `${ad.toRegion || ''} ${ad.toDistrict || ''}`.trim();
    const ownerPhone = ad.ownerPhone || ad.phone || '—';
    div.innerHTML = `
      <div><b>Yo'nalish:</b> ${escapeHtml(from)} → ${escapeHtml(to)}</div>
      <div><b>Narx:</b> ${escapeHtml(ad.price || '—')} so'm</div>
      <div><b>Telefon:</b> ${escapeHtml(ownerPhone)}</div>
      <div class="date-info">🕒 Joylangan: ${new Date(ad.createdAt).toLocaleString()} · Holat: ${escapeHtml(ad.status || 'pending')}</div>
      <div class="actions">
        ${(ad.status!=='approved') ? `<button onclick="startEditAd('${ad.id}')">✏️ Tahrirlash</button>` : `<button disabled style="background:#ccc">✏️ Tahrirlash</button>`}
        <button onclick="deleteAd('${ad.id}')">🗑️ O'chirish</button>
      </div>
    `;
    container.appendChild(div);
  });
}

// ===============================
//  EDIT / DELETE ADS
// ===============================
function startEditAd(adId){
  if(!currentUser){ alert('Tizimga kiring'); return; }
  get(ref(db, `userAds/${currentUser.uid}/${adId}`)).then(snap=>{
    const ad = snap.val();
    if(!ad) return alert("E'lon topilmadi");
    if(ad.status === 'approved') return alert("Tasdiqlangan e'londa o'zgartirish mumkin emas");
    const newPrice = prompt("Yangi narxni kiriting:", ad.price || '');
    if(newPrice === null) return;
    const updates = { price: newPrice, edited: true, status: 'pending', editedAt: new Date().toISOString() };
    update(ref(db, `ads/${adId}`), updates).catch(console.error);
    update(ref(db, `userAds/${currentUser.uid}/${adId}`), updates).catch(console.error);
    update(ref(db, `pendingAds/${adId}`), updates).catch(console.error);
    alert("E'lon yangilandi. Admin tasdiqlashini kuting.");
  }).catch(e=>{ console.error(e); alert("E'lonni ochishda xatolik"); });
}

function deleteAd(adId){
  if(!currentUser){ alert('Tizimga kiring'); return; }
  if(!confirm("Haqiqatan o'chirmoqchimisiz?")) return;
  remove(ref(db, `ads/${adId}`)).catch(console.error);
  remove(ref(db, `userAds/${currentUser.uid}/${adId}`)).catch(console.error);
  remove(ref(db, `pendingAds/${adId}`)).catch(console.error);
  alert("E'lon o'chirildi");
}

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
      if($id('vpRatingSummary')) $id('vpRatingSummary').innerHTML = `<strong>${data.avg || '—'} / 5</strong> — ${data.count} ta baho`;
    });

    const snap = await get(ref(db, `userAds/${uid}`));
    const ads = snap.val() ? Object.values(snap.val()) : [];
    const vpList = $id('vpAdsList');
    if(vpList){
      if(!ads.length) vpList.innerHTML = '<p class="small">E\\'lonlari yo\\'q.</p>';
      else {
        vpList.innerHTML = ads.map(a=>{
          // use double quotes for Yo'lovchi to avoid escaping inside template literal
          return `<div style="padding:6px;border-bottom:1px solid #eee;"><b>${a.type==='driver' ? 'Haydovchi' : "Yo'lovchi"}</b> · ${escapeHtml(a.fromRegion||'')} → ${escapeHtml(a.toRegion||'')} · ${escapeHtml(a.price||'')} so'm<br><small class="small">${new Date(a.createdAt).toLocaleString()}</small></div>`;
        }).join('');
      }
    }

    const cur = currentUser;
    const vpRateSection = $id('vpRateSection');
    if(vpRateSection){
      if(!cur){
        vpRateSection.innerHTML = '<div class="small">Baholash uchun tizimga kiring.</div>';
      } else if(cur.uid === uid){
        vpRateSection.innerHTML = '<div class="small">Siz o\\'zingizni baholay olmaysiz.</div>';
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
                  <option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option>
                </select>
              </div>
              <div style="margin-top:6px;"><textarea id="vpRatingText" rows="2" placeholder="Ixtiyoriy izoh..."></textarea></div>
              <div style="margin-top:8px;text-align:right;"><button id="vpSubmitBtn">Yuborish</button></div>
            </div>
          `;
          const btn = $id('vpSubmitBtn');
          if(btn){ btn.onclick = ()=> submitProfileRating(uid); }
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
  const starsEl = $id('vpRatingStars'); if(!starsEl){ alert('Baho element topilmadi'); return; }
  const stars = Number(starsEl.value) || 5;
  const text = ($id('vpRatingText') && $id('vpRatingText').value.trim()) || '';

  try{
    await set(ref(db, `ratings/${targetUid}/${currentUser.uid}`), {
      stars, text, date: new Date().toISOString(), raterUid: currentUser.uid
    });

    // recompute summary
    const snap = await get(ref(db, `ratings/${targetUid}`));
    const all = snap.val() ? Object.values(snap.val()) : [];
    let avg = 0;
    if(all.length) avg = (all.reduce((s,r)=> s + (Number(r.stars)||0), 0) / all.length);
    await update(ref(db, `users/${targetUid}`), { ratingAvg: +(avg.toFixed(2)), ratingCount: all.length });

    alert('Baho yuborildi!');
    openViewProfile(targetUid);
  } catch(e){
    console.error(e); alert('Baho yuborishda xatolik');
  }
}

// ===============================
//  STATUS SYNC (notify on status change)
// ===============================
function startStatusSync(){
  if(!currentUser) return;
  const userAdsRef = ref(db, `userAds/${currentUser.uid}`);
  onValue(userAdsRef, snap=>{
    const adsObj = snap.val() || {};
    const ads = Object.values(adsObj || []);
    ads.forEach(ad=>{
      const prev = lastStatuses[ad.id];
      const now = ad.status;
      if(prev && prev !== now){
        if(now === "approved") alert(`✅ E'lon tasdiqlandi:\n${ad.fromRegion} → ${ad.toRegion}`);
        else if(now === "rejected") alert(`❌ E'lon rad etildi:\n${ad.fromRegion} → ${ad.toRegion}`);
      }
      lastStatuses[ad.id] = now;
    });
    renderAdsListFromLocal();
  }, (err)=> console.error("startStatusSync onValue error", err));
}

// ===============================
//  UTILS: logout / modal close / contact
// ===============================
function logout(){
  signOut(auth).then(()=> { alert('Chiqdingiz'); location.reload(); }).catch(e=>{ console.error(e); alert('Chiqishda xatolik'); });
}
function closeViewProfile(){ const modal = $id('viewProfileModal'); if(modal) modal.style.display = 'none'; }
function contactOwner(phone){ if(!phone) return alert("Telefon raqam mavjud emas"); window.location.href = `tel:${phone}`; }

// ===============================
//  EXPORTS: make functions accessible from HTML (module scope -> window)
// ===============================
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
window.closeViewProfile = closeViewProfile;
window.contactOwner = contactOwner;

// ===============================
//  INITIALIZATION ON DOM READY
// ===============================
document.addEventListener('DOMContentLoaded', ()=>{
  loadRegionsToSelects();
  // Delayed status sync will start on auth state changed when user exists
  setTimeout(()=>{ if(currentUser) startStatusSync(); }, 600);
});
