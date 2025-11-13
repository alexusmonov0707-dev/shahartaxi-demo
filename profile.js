// profile.js (ES module) — to'liq, tozalangan va ishlaydigan

// ---------------------------
// Firebase (modular) imports
// ---------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app-check.js";
import {
  getAuth,
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

// ---------------------------
// Firebase config (sening)
// ---------------------------
const firebaseConfig = {
  apiKey: "AIzaSyApWUG40YuC9aCsE9MOLXwLcYgRihREWvc",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
  projectId: "shahartaxi-demo",
  storageBucket: "shahartaxi-demo.appspot.com",
  messagingSenderId: "874241795701",
  appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};

// ---------------------------
// Init app, auth, db, appcheck
// ---------------------------
const app = initializeApp(firebaseConfig);
const auth = getAuth ? getAuth(app) : null; // safe guard if env odd
const db = getDatabase(app);

// AppCheck (optional — agar site keying bo'lsa ishlatiladi)
try{
  // NOTE: agar boshqa AppCheck key bo'lsa o'zgartir
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider("6Leq7QosAAAAAACWDged1Z1i1b5sdmasTRfW-8Toq"),
    isTokenAutoRefreshEnabled: true
  });
} catch(e){
  console.warn("AppCheck init error (ignore if not needed):", e);
}

// ---------------------------
// Regions data (UI selects)
// ---------------------------
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

// ---------------------------
// Helpers
// ---------------------------
function escapeHtml(str){
  if(!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function q(id){ return document.getElementById(id); }

// ---------------------------
// Current user & listeners
// ---------------------------
let currentUser = null;
let _userAdsUnsub = null;
let lastStatuses = {}; // for status change alerts

// Auth state observer
if (typeof onAuthStateChanged === 'function') {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      // Ensure user record exists
      try {
        await update(ref(db, `users/${user.uid}`), {
          phone: user.phoneNumber || "",
          name: user.displayName || user.phoneNumber || ""
        });
      } catch(e){
        // if not exists, set will create, update may fail if no perms; ignore here
        try { await set(ref(db, `users/${user.uid}`), { phone: user.phoneNumber || "", name: user.displayName || user.phoneNumber || "" }); } catch(e2){ console.warn(e2); }
      }
      // load profile and ads
      loadUserProfile();
      attachUserAdsListener();
      // start status sync after small delay
      setTimeout(()=> startStatusSync(), 400);
    } else {
      currentUser = null;
      // cleanup
      if (_userAdsUnsub) { /* no direct unsubscribe return, we can't call; we'll keep listener as DB path tied to uid */ }
      // show guest state
      renderProfileHeaderGuest();
      renderAdsListFromLocal();
    }
  });
}

// ---------------------------
// Load user profile
// ---------------------------
async function loadUserProfile(){
  if(!currentUser) return;
  try {
    const snap = await get(ref(db, `users/${currentUser.uid}`));
    const data = snap.val() || {};
    updateProfileHeader(data);
  } catch(e){
    console.error("loadUserProfile", e);
  }
}
function updateProfileHeader(user){
  q('profileName').textContent = user.name || 'Foydalanuvchi';
  q('profilePhone').textContent = user.phone || '—';
  q('profileRatingBig').textContent = user.ratingAvg ? `${user.ratingAvg} / 5` : '—';
  q('profileRatingCount').textContent = user.ratingCount ? `${user.ratingCount} ta baho` : 'Hozircha baholar yo‘q';
  if(currentUser) q('editProfileBtn').style.display = 'inline-block';
  else q('editProfileBtn').style.display = 'none';
}
function renderProfileHeaderGuest(){
  q('profileName').textContent = 'Tizimga kiring';
  q('profilePhone').textContent = '—';
  q('profileRatingBig').textContent = '—';
  q('profileRatingCount').textContent = 'Hozircha baholar yo‘q';
  q('editProfileBtn').style.display = 'none';
}

// ---------------------------
// Regions selects population
// ---------------------------
function loadRegionsToSelects(){
  ['fromRegion','toRegion','filterFromRegion','filterToRegion'].forEach(id=>{
    const sel = q(id);
    if(!sel) return;
    sel.innerHTML = '<option value="">Viloyatni tanlang</option>';
    Object.keys(regions).forEach(r=>{
      const opt = document.createElement('option'); opt.value = r; opt.textContent = r;
      sel.appendChild(opt);
    });
  });
}
function updateDistricts(prefix){
  const regionEl = q(prefix+'Region');
  const districtSel = q(prefix+'District');
  if(!regionEl || !districtSel) return;
  const region = regionEl.value;
  districtSel.innerHTML = '<option value="">Tumanni tanlang</option>';
  if(region && regions[region]){
    regions[region].forEach(d=>{
      const opt = document.createElement('option'); opt.value = d; opt.textContent = d;
      districtSel.appendChild(opt);
    });
  }
}
function updateFilterDistricts(prefix){
  const regionEl = q(prefix+'Region');
  const districtSel = q(prefix+'District');
  if(!regionEl || !districtSel) return;
  const region = regionEl.value;
  districtSel.innerHTML = '<option value="">Tanlang</option>';
  if(region && regions[region]){
    regions[region].forEach(d=>{
      districtSel.add(new Option(d,d));
    });
  }
  renderAdsListFromLocal();
}

// ---------------------------
// Add new ad (writes to ads and userAds and pendingAds)
// ---------------------------
async function addAd(){
  if(!currentUser){
    alert('Avval tizimga kiring!');
    return;
  }
  const type = q('adType').value;
  const fromRegion = (q('fromRegion').value || '').trim();
  const fromDistrict = (q('fromDistrict').value || '').trim();
  const toRegion = (q('toRegion').value || '').trim();
  const toDistrict = (q('toDistrict').value || '').trim();
  const price = (q('price').value || '').trim();
  const comment = (q('adComment').value || '').trim();

  if(!type || !fromRegion || !toRegion){
    alert("Iltimos yo'nalishni to'liq to'ldiring");
    return;
  }

  // create unique id via push
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

  try {
    await set(ref(db, `ads/${adId}`), adData);
    await set(ref(db, `userAds/${currentUser.uid}/${adId}`), adData);
    await set(ref(db, `pendingAds/${adId}`), adData);
    alert("✅ E'lon yuborildi. Admin tasdiqlashini kuting.");
    clearAddForm();
  } catch(e){
    console.error("addAd error", e);
    alert("E'lon yuborishda xatolik yuz berdi");
  }
}

// ---------------------------
// Render user ads from localStorage (compatibility)
// ---------------------------
function renderAdsListFromLocal(){
  // Prefer localStorage if present (keeps backward compatibility)
  const driver = JSON.parse(localStorage.getItem('driverAds') || '[]');
  const passenger = JSON.parse(localStorage.getItem('passengerAds') || '[]');
  const all = [...driver.map(a=>({...a,type:'driver'})), ...passenger.map(a=>({...a,type:'passenger'}))];

  // If DB listener stored true userAds in localStorage we will show those; otherwise show message
  const container = q('myAds');
  if(!container) return;
  container.innerHTML = '';
  if(all.length === 0){
    container.innerHTML = '<p>Hozircha e’lonlar yo‘q.</p>';
    return;
  }
  all.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
  all.forEach(ad=>{
    const div = document.createElement('div');
    div.className = 'ad-box ' + ((ad.status && ad.status.toLowerCase()) || 'pending');
    const from = `${ad.fromRegion || ''} ${ad.fromDistrict || ''}`;
    const to = `${ad.toRegion || ''} ${ad.toDistrict || ''}`;
    const created = ad.createdAt ? new Date(ad.createdAt).toLocaleString() : '—';
    const phone = ad.ownerPhone || ad.phone || '—';
    const actions = (ad.status !== 'approved') ? `<button onclick="startEditAd('${ad.id}')">✏️ Tahrirlash</button>` : `<button disabled style="background:#ccc">✏️ Tahrirlash</button>`;
    div.innerHTML = `
      <div><b>Yo'nalish:</b> ${escapeHtml(from)} → ${escapeHtml(to)}</div>
      <div><b>Narx:</b> ${escapeHtml(ad.price || '—')} so'm</div>
      <div><b>Telefon:</b> ${escapeHtml(phone)}</div>
      <div class="date-info">🕒 Joylangan: ${escapeHtml(created)} · Holat: ${escapeHtml(ad.status || 'pending')}</div>
      <div class="actions">${actions} <button onclick="deleteAd('${ad.id}')">🗑️ O'chirish</button></div>
    `;
    container.appendChild(div);
  });
}

// ---------------------------
// Attach userAds realtime listener (keeps localStorage updated for UI)
// ---------------------------
function attachUserAdsListener(){
  if(!currentUser) return;
  const userAdsRef = ref(db, `userAds/${currentUser.uid}`);
  onValue(userAdsRef, snap=>{
    const dataObj = snap.val() || {};
    const ads = Object.values(dataObj);
    // separate into driver/passenger localStorage keys for old render logic compatibility
    const driver = ads.filter(a=>a.type==='driver');
    const passenger = ads.filter(a=>a.type==='passenger');
    localStorage.setItem('driverAds', JSON.stringify(driver));
    localStorage.setItem('passengerAds', JSON.stringify(passenger));
    // render
    renderAdsListFromLocal();
  }, err=>{
    console.error("userAds listener error", err);
  });
}

// ---------------------------
// Edit and delete ad (works on DB)
// ---------------------------
function startEditAd(adId){
  if(!currentUser) { alert('Tizimga kiring'); return; }
  get(ref(db, `userAds/${currentUser.uid}/${adId}`)).then(snap=>{
    const ad = snap.val();
    if(!ad) return alert("E'lon topilmadi");
    if(ad.status === 'approved') return alert("Tasdiqlangan e'lonni o'zgartirish mumkin emas");
    const newPrice = prompt("Yangi narxni kiriting:", ad.price || "");
    if(newPrice === null) return;
    const updates = { price: newPrice, edited: true, status: 'pending', editedAt: new Date().toISOString() };
    update(ref(db, `ads/${adId}`), updates).catch(console.error);
    update(ref(db, `userAds/${currentUser.uid}/${adId}`), updates).catch(console.error);
    update(ref(db, `pendingAds/${adId}`), updates).catch(console.error);
    alert("✏️ E'lon yangilandi. Admin tasdiqlashini kuting.");
  }).catch(e=>{ console.error(e); alert("Xatolik yuz berdi"); });
}

function deleteAd(adId){
  if(!currentUser){ alert('Tizimga kiring'); return; }
  if(!confirm("Haqiqatan o'chirishni xohlaysizmi?")) return;
  remove(ref(db, `ads/${adId}`)).catch(console.error);
  remove(ref(db, `userAds/${currentUser.uid}/${adId}`)).catch(console.error);
  remove(ref(db, `pendingAds/${adId}`)).catch(console.error);
  alert("🗑️ E'lon o'chirildi");
}

// ---------------------------
// View other profile & ratings
// ---------------------------
function listenUserRatings(uid, cb){
  const ratingsRef = ref(db, `ratings/${uid}`);
  onValue(ratingsRef, snap=>{
    const data = snap.val() || {};
    const list = Object.values(data);
    let avg = 0;
    if(list.length > 0) avg = (list.reduce((s,r)=> s + (Number(r.stars)||0), 0) / list.length).toFixed(2);
    cb({ ratings: list, avg, count: list.length });
  });
}

async function openViewProfile(uid){
  if(!uid) return;
  const uSnap = await get(ref(db, `users/${uid}`));
  const user = uSnap.val() || {};
  q('vpName').textContent = user.name || 'Foydalanuvchi';
  q('vpPhone').textContent = user.phone || '';
  listenUserRatings(uid, (data)=>{
    q('vpRatingSummary').innerHTML = `<strong>${data.avg || '—'} / 5</strong> — ${data.count} ta baho`;
  });
  // load that user's ads (once)
  const userAdsSnap = await get(ref(db, `userAds/${uid}`));
  const adsObj = userAdsSnap.val() || {};
  const ads = Object.values(adsObj);
  const vpList = q('vpAdsList');
  if(!ads.length) vpList.innerHTML = '<p class="small">E\'lonlari yo\'q.</p>';
  else vpList.innerHTML = ads.map(a=>{
    return `<div style="padding:6px;border-bottom:1px solid #eee;"><b>${a.type==='driver'?'Haydovchi':'Yo\\'lovchi'}</b> · ${escapeHtml(a.fromRegion||'')} → ${escapeHtml(a.toRegion||'')} · ${escapeHtml(a.price||'')} so'm<br><small class="small">${new Date(a.createdAt).toLocaleString()}</small></div>`;
  }).join('');
  // rating input area
  const cur = currentUser;
  const vpRateSection = q('vpRateSection');
  if(!cur){
    vpRateSection.innerHTML = '<div class="small">Baholash uchun tizimga kiring.</div>';
  } else if(cur.uid === uid){
    vpRateSection.innerHTML = '<div class="small">Siz o\\'zingizni baholay olmaysiz.</div>';
  } else {
    const alreadySnap = await get(ref(db, `ratings/${uid}/${cur.uid}`));
    if(alreadySnap.exists()){
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
  }
  q('viewProfileModal').style.display = 'flex';
}

async function submitProfileRating(targetUid){
  if(!currentUser){ alert('Baholash uchun tizimga kiring'); return; }
  const stars = Number(q('vpRatingStars').value) || 5;
  const text = (q('vpRatingText').value || '').trim();
  if(currentUser.uid === targetUid){ alert("O'zingizni baholay olmaysiz"); return; }
  await set(ref(db, `ratings/${targetUid}/${currentUser.uid}`), { stars, text, date: new Date().toISOString(), raterUid: currentUser.uid });
  // recompute summary
  const snap = await get(ref(db, `ratings/${targetUid}`));
  const all = snap.val() ? Object.values(snap.val()) : [];
  let avg = 0;
  if(all.length) avg = (all.reduce((s,r)=> s + (Number(r.stars)||0), 0) / all.length);
  await update(ref(db, `users/${targetUid}`), { ratingAvg: +(avg.toFixed(2)), ratingCount: all.length });
  alert('Baho yuborildi!');
  openViewProfile(targetUid);
}

// ---------------------------
// Status sync (alerts on approve/reject)
// ---------------------------
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
        if(now === 'approved') alert(`✅ E'lon tasdiqlandi:\n${ad.fromRegion} → ${ad.toRegion}`);
        else if(now === 'rejected') alert(`❌ E'lon rad etildi:\n${ad.fromRegion} → ${ad.toRegion}`);
      }
      lastStatuses[ad.id] = now;
    });
    renderAdsListFromLocal();
  });
}

// ---------------------------
// Logout
// ---------------------------
function logout(){
  if(!auth){ localStorage.removeItem('currentUser'); location.reload(); return; }
  signOut(auth).then(()=>{ alert('Chiqdingiz'); location.reload(); }).catch(e=>{ console.error(e); alert('Chiqishda xatolik'); });
}

// ---------------------------
// Modal helpers & contact
// ---------------------------
window.closeViewProfile = function(){ const m = q('viewProfileModal'); if(m) m.style.display = 'none'; };
window.contactOwner = function(phone){ if(!phone) return alert('Telefon mavjud emas'); window.location.href = `tel:${phone}`; };

// ---------------------------
// Expose functions to window (so HTML onclick works in module scope)
// ---------------------------
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
window.renderAdsListFromLocal = renderAdsListFromLocal;

// ---------------------------
// Init on DOMContentLoaded (only once)
// ---------------------------
document.addEventListener('DOMContentLoaded', ()=>{
  loadRegionsToSelects();
  // If you've implemented a local debug user, you can call attachUserAdsListener() manually.
  // Otherwise listeners start once auth state becomes available.
  renderAdsListFromLocal();
});
