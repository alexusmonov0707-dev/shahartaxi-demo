// profile.js
// Complete, single-file profile logic for your profile.html
// Replace your existing profile.js with this file. It's written to match the HTML you provided.

// -----------------------------
// IMPORTS (Firebase v9 modular)
// -----------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getDatabase, ref, set, get, update, push, onValue, remove
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
// AppCheck optional (commented out by default)
// import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app-check.js";

// -----------------------------
// FIREBASE CONFIG (your project)
// -----------------------------
const firebaseConfig = {
  apiKey: "AIzaSyApWUG40YuC9aCsE9MOLXwLcYgRihREWvc",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
  projectId: "shahartaxi-demo",
  storageBucket: "shahartaxi-demo.appspot.com",
  messagingSenderId: "874241795701",
  appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};

// -----------------------------
// INIT
// -----------------------------
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Optional: enable App Check with your site key if you have it
// initializeAppCheck(app, { provider: new ReCaptchaV3Provider("YOUR_SITE_KEY"), isTokenAutoRefreshEnabled: true });

// -----------------------------
// GLOBALS & HELPERS
// -----------------------------
let currentUser = null;
let lastStatuses = {}; // used by status sync

function $id(id) { return document.getElementById(id); }
function safe(v){ return (typeof v === 'undefined' || v === null) ? '' : v; }
function escapeHtml(str){
  if(str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

// -----------------------------
// REGIONS DATA
// -----------------------------
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

// -----------------------------
// AUTH STATE LISTENER
// -----------------------------
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    // ensure DB user exists or update phone/name
    try {
      await update(ref(db, `users/${user.uid}`), {
        phone: user.phoneNumber || "",
        name: user.displayName || user.phoneNumber || ""
      });
    } catch(e){
      try {
        await set(ref(db, `users/${user.uid}`), {
          phone: user.phoneNumber || "",
          name: user.displayName || user.phoneNumber || ""
        });
      } catch(err){ console.error("creating user record failed", err); }
    }

    // load UI
    await loadUserProfile();
    loadUserAds();          // realtime listener for user ads
    startStatusSync();      // watch for status changes and alerts
  } else {
    currentUser = null;
    // reset UI header & ad list
    if($id('profileName')) $id('profileName').textContent = 'Foydalanuvchi';
    if($id('profilePhone')) $id('profilePhone').textContent = '—';
    if($id('profileRatingBig')) $id('profileRatingBig').textContent = '—';
    if($id('profileRatingCount')) $id('profileRatingCount').textContent = 'Hozircha baholar yo‘q';
    if($id('myAds')) $id('myAds').innerHTML = "<p>Hozircha e’lonlar yo‘q.</p>";
  }
});

// -----------------------------
// PROFILE: load & header
// -----------------------------
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

function updateProfileHeader(data = {}){
  if(!$id('profileName')) return;
  $id('profileName').textContent = data.name || 'Foydalanuvchi';
  $id('profilePhone').textContent = data.phone || '—';
  $id('profileRatingBig').textContent = data.ratingAvg ? `${data.ratingAvg} / 5` : '—';
  $id('profileRatingCount').textContent = data.ratingCount ? `${data.ratingCount} ta baho` : 'Hozircha baholar yo‘q';
  const editBtn = $id('editProfileBtn');
  if(editBtn) editBtn.style.display = currentUser ? 'inline-block' : 'none';
}

// -----------------------------
// PROFILE EDIT MODAL
// -----------------------------
function openEditProfile(){
  if(!currentUser){ alert('Tizimga kiring'); return; }
  get(ref(db, `users/${currentUser.uid}`)).then(snap=>{
    const data = snap.val() || {};
    if($id('editFullName')) $id('editFullName').value = data.name || '';
    if($id('editPhoneInput')) $id('editPhoneInput').value = data.phone || '';
    if($id('editProfileModal')) $id('editProfileModal').style.display = 'flex';
  }).catch(e=> { console.error(e); alert('Profilni yuklashda xatolik'); });
}
function closeEditProfile(){ if($id('editProfileModal')) $id('editProfileModal').style.display = 'none'; }

async function saveProfileEdit(){
  if(!currentUser) return alert('Tizimga kiring');
  const name = $id('editFullName') ? $id('editFullName').value.trim() : '';
  const phone = $id('editPhoneInput') ? $id('editPhoneInput').value.trim() : '';

  if(!/^\+998\d{9}$/.test(phone)) return alert("Telefon raqamni to‘g‘ri kiriting! (+998901234567)");

  try {
    await update(ref(db, `users/${currentUser.uid}`), { name, phone });
    alert('Profil yangilandi');
    await loadUserProfile();
    closeEditProfile();
  } catch(e){
    console.error("saveProfileEdit error", e);
    alert('Profilni saqlashda xatolik');
  }
}

// -----------------------------
// REGIONS selects
// -----------------------------
function loadRegionsToSelects(){
  const ids = ['fromRegion','toRegion','filterFromRegion','filterToRegion'];
  ids.forEach(id=>{
    const sel = $id(id);
    if(!sel) return;
    sel.innerHTML = '<option value="">Viloyatni tanlang</option>';
    Object.keys(regions).forEach(r=>{
      const opt = document.createElement('option'); opt.value = r; opt.textContent = r;
      sel.appendChild(opt);
    });
  });
}

function updateDistricts(prefix){
  const regionSelect = $id(prefix + 'Region');
  const districtSel = $id(prefix + 'District');
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
  const regionSelect = $id(prefix + 'Region');
  const districtSel = $id(prefix + 'District');
  if(!regionSelect || !districtSel) return;
  const region = regionSelect.value;
  districtSel.innerHTML = '<option value="">Tanlang</option>';
  if(region && regions[region]){
    regions[region].forEach(d=> districtSel.add(new Option(d,d)));
  }
  renderAdsListFromLocal();
}

// -----------------------------
// ADD AD
// -----------------------------
async function addAd(){
  if(!currentUser) return alert('Avval tizimga kiring!');
  const type = ($id('adType') && $id('adType').value) || '';
  const fromRegion = ($id('fromRegion') && $id('fromRegion').value) || '';
  const fromDistrict = ($id('fromDistrict') && $id('fromDistrict').value) || '';
  const toRegion = ($id('toRegion') && $id('toRegion').value) || '';
  const toDistrict = ($id('toDistrict') && $id('toDistrict').value) || '';
  const price = ($id('price') && $id('price').value.trim()) || '';
  const comment = ($id('adComment') && $id('adComment').value.trim()) || '';

  if(!type || !fromRegion || !toRegion) return alert("Iltimos yo'nalishni to'liq to'ldiring");

  try {
    const newRef = push(ref(db, 'ads'));
    const adId = newRef.key;
    const adData = {
      id: adId,
      ownerUid: currentUser.uid,
      ownerPhone: currentUser.phoneNumber || '',
      type, fromRegion, fromDistrict, toRegion, toDistrict,
      price, comment,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    await set(ref(db, `ads/${adId}`), adData);
    await set(ref(db, `userAds/${currentUser.uid}/${adId}`), adData);
    await set(ref(db, `pendingAds/${adId}`), adData); // for admin review
    alert("✅ E'lon yuborildi. Admin tasdiqlashini kuting.");
    clearAddForm();
  } catch(e){
    console.error("addAd error", e);
    alert("E'lon yuborishda xatolik");
  }
}

function clearAddForm(){
  ['adType','fromRegion','fromDistrict','toRegion','toDistrict','price','adComment'].forEach(id=>{
    const el = $id(id); if(!el) return; el.value = '';
    if(el.tagName === 'SELECT') el.selectedIndex = 0;
  });
  if($id('fromDistrict')) $id('fromDistrict').innerHTML = '<option value="">Tumanni tanlang</option>';
  if($id('toDistrict')) $id('toDistrict').innerHTML = '<option value="">Tumanni tanlang</option>';
}

// -----------------------------
// LOAD USER ADS (realtime)
// -----------------------------
function loadUserAds(){
  if(!currentUser) return;
  const userAdsRef = ref(db, `userAds/${currentUser.uid}`);
  onValue(userAdsRef, snap=>{
    const obj = snap.val() || {};
    const list = Object.values(obj || []);
    // provide both driver & passenger to localStorage for render compatibility
    localStorage.setItem('driverAds', JSON.stringify(list.filter(a=>a.type === 'driver')));
    localStorage.setItem('passengerAds', JSON.stringify(list.filter(a=>a.type === 'passenger')));
    renderAdsListFromLocal();
  }, err => console.error("loadUserAds onValue err", err));
}

// -----------------------------
// RENDER ADS (fallback)
// -----------------------------
function renderAdsListFromLocal(){
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
        ${(ad.status !== 'approved') ? `<button onclick="startEditAd('${ad.id}')">✏️ Tahrirlash</button>` : `<button disabled style="background:#ccc">✏️ Tahrirlash</button>`}
        <button onclick="deleteAd('${ad.id}')">🗑️ O'chirish</button>
      </div>
    `;
    container.appendChild(div);
  });
}

// -----------------------------
// EDIT / DELETE ADS
// -----------------------------
async function startEditAd(adId){
  if(!currentUser) return alert('Tizimga kiring');
  try {
    const snap = await get(ref(db, `userAds/${currentUser.uid}/${adId}`));
    const ad = snap.val();
    if(!ad) return alert("E'lon topilmadi");
    if(ad.status === 'approved') return alert("Tasdiqlangan e'londa o'zgartirish mumkin emas");
    const newPrice = prompt("Yangi narxni kiriting:", ad.price || '');
    if(newPrice === null) return;
    const updates = { price: newPrice, edited: true, status: 'pending', editedAt: new Date().toISOString() };
    await update(ref(db, `ads/${adId}`), updates).catch(()=>{});
    await update(ref(db, `userAds/${currentUser.uid}/${adId}`), updates).catch(()=>{});
    await update(ref(db, `pendingAds/${adId}`), updates).catch(()=>{});
    alert("E'lon yangilandi. Admin tasdiqlashini kuting.");
  } catch(e){ console.error("startEditAd error", e); alert("Tahrirlashda xatolik"); }
}

async function deleteAd(adId){
  if(!currentUser) return alert('Tizimga kiring');
  if(!confirm("Haqiqatan o'chirmoqchimisiz?")) return;
  try {
    await remove(ref(db, `ads/${adId}`)).catch(()=>{});
    await remove(ref(db, `userAds/${currentUser.uid}/${adId}`)).catch(()=>{});
    await remove(ref(db, `pendingAds/${adId}`)).catch(()=>{});
    alert("E'lon o'chirildi");
  } catch(e){ console.error("deleteAd error", e); alert("O'chirishda xatolik"); }
}

// -----------------------------
// VIEW PROFILE & RATINGS
// -----------------------------
function listenUserRatings(uid, cb){
  const rRef = ref(db, `ratings/${uid}`);
  onValue(rRef, snap=>{
    const obj = snap.val() || {};
    const list = Object.values(obj || []);
    let avg = 0;
    if(list.length) avg = (list.reduce((s,r)=> s + (Number(r.stars)||0), 0) / list.length).toFixed(2);
    cb({ ratings: list, avg, count: list.length });
  }, err => { console.error("listenUserRatings err", err); cb({ ratings:[], avg:0, count:0 }); });
}

async function openViewProfile(uid){
  if(!uid) return;
  try {
    const uSnap = await get(ref(db, `users/${uid}`));
    const user = uSnap.val() || {};
    if($id('vpName')) $id('vpName').textContent = user.name || 'Foydalanuvchi';
    if($id('vpPhone')) $id('vpPhone').textContent = user.phone || '';
    listenUserRatings(uid, data => { if($id('vpRatingSummary')) $id('vpRatingSummary').innerHTML = `<strong>${data.avg || '—'} / 5</strong> — ${data.count} ta baho`; });
    // load their ads once
    const aSnap = await get(ref(db, `userAds/${uid}`));
    const ads = aSnap.val() ? Object.values(aSnap.val()) : [];
    const vpList = $id('vpAdsList');
    if(vpList){
      if(!ads.length) vpList.innerHTML = `<p class="small">E'lonlari yo'q.</p>`;
      else vpList.innerHTML = ads.map(a=>`<div style="padding:6px;border-bottom:1px solid #eee;"><b>${a.type==='driver'?'Haydovchi':'Yo\\'lovchi'}</b> · ${escapeHtml(a.fromRegion||'')} → ${escapeHtml(a.toRegion||'')} · ${escapeHtml(a.price||'')} so'm<br><small class="small">${new Date(a.createdAt).toLocaleString()}</small></div>`).join('');
    }
    // rating UI
    const cur = currentUser;
    const vpRateSection = $id('vpRateSection');
    if(vpRateSection){
      if(!cur) vpRateSection.innerHTML = '<div class="small">Baholash uchun tizimga kiring.</div>';
      else if(cur.uid === uid) vpRateSection.innerHTML = '<div class="small">Siz o\\'zingizni baholay olmaysiz.</div>';
      else {
        const ratedSnap = await get(ref(db, `ratings/${uid}/${cur.uid}`));
        if(ratedSnap.exists()) vpRateSection.innerHTML = '<div class="small">Siz allaqachon baho bergansiz.</div>';
        else {
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
          const btn = $id('vpSubmitBtn');
          if(btn) btn.addEventListener('click', ()=> submitProfileRating(uid));
        }
      }
    }
    const modal = $id('viewProfileModal'); if(modal) modal.style.display = 'flex';
  } catch(e){ console.error("openViewProfile error", e); alert("Profilni ochishda xatolik"); }
}

async function submitProfileRating(targetUid){
  if(!currentUser) return alert('Baholash uchun tizimga kiring');
  if(currentUser.uid === targetUid) return alert("O'zingizni baholay olmaysiz");
  const starsEl = $id('vpRatingStars'); if(!starsEl) return alert('Baho elementi topilmadi');
  const stars = Number(starsEl.value) || 5;
  const text = ($id('vpRatingText') && $id('vpRatingText').value.trim()) || '';
  try {
    await set(ref(db, `ratings/${targetUid}/${currentUser.uid}`), { stars, text, date: new Date().toISOString(), raterUid: currentUser.uid });
    const snap = await get(ref(db, `ratings/${targetUid}`));
    const all = snap.val() ? Object.values(snap.val()) : [];
    let avg = 0; if(all.length) avg = (all.reduce((s,r)=> s + (Number(r.stars)||0), 0) / all.length);
    await update(ref(db, `users/${targetUid}`), { ratingAvg: +(avg.toFixed(2)), ratingCount: all.length });
    alert('Baho yuborildi!');
    openViewProfile(targetUid);
  } catch(e){ console.error("submitProfileRating error", e); alert('Baho yuborishda xatolik'); }
}

// -----------------------------
// STATUS SYNC (alerts when admin changes status)
// -----------------------------
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
        if(now === 'approved') alert(`✅ E'lon tasdiqlandi:\n${ad.fromRegion} → ${ad.toRegion}`);
        else if(now === 'rejected') alert(`❌ E'lon rad etildi:\n${ad.fromRegion} → ${ad.toRegion}`);
      }
      lastStatuses[ad.id] = now;
    });
    renderAdsListFromLocal();
  }, err => console.error("startStatusSync err", err));
}

// -----------------------------
// UTILS: logout, close modal, contact
// -----------------------------
function logout(){
  signOut(auth).then(()=> { alert('Chiqdingiz'); location.reload(); }).catch(e=> { console.error("logout err", e); alert('Chiqishda xatolik'); });
}
function closeViewProfile(){ const m = $id('viewProfileModal'); if(m) m.style.display = 'none'; }
function contactOwner(phone){ if(!phone) return alert("Telefon mavjud emas"); window.location.href = `tel:${phone}`; }

// small helper used in HTML — show only user's ads
function viewOwnAds(){ renderAdsListFromLocal(); }

// -----------------------------
// WINDOW EXPORTS (so HTML onclick works)
// -----------------------------
window.openEditProfile = openEditProfile;
window.closeEditProfile = closeEditProfile;
window.saveProfileEdit = saveProfileEdit;
window.loadRegionsToSelects = loadRegionsToSelects;
window.updateDistricts = updateDistricts;
window.updateFilterDistricts = updateFilterDistricts;
window.addAd = addAd;
window.clearAddForm = clearAddForm;
window.startEditAd = startEditAd;
window.deleteAd = deleteAd;
window.openViewProfile = openViewProfile;
window.submitProfileRating = submitProfileRating;
window.startStatusSync = startStatusSync;
window.closeViewProfile = closeViewProfile;
window.contactOwner = contactOwner;
window.logout = logout;
window.viewOwnAds = viewOwnAds;
window.renderAdsListFromLocal = renderAdsListFromLocal;

// -----------------------------
// AUTO INIT ON DOM READY
// -----------------------------
document.addEventListener('DOMContentLoaded', ()=>{
  try {
    loadRegionsToSelects();
    // Bind any basic UI fallback elements (if present) to avoid "is not defined" console errors:
    // (these are no-ops if not present)
    if($id('myAds') && !$id('myAds').innerHTML) $id('myAds').innerHTML = '<p>Hozircha e’lonlar yo‘q.</p>';
    // Delay status sync start until auth listener runs (auth listener will call startStatusSync when user present)
    setTimeout(()=>{ if(currentUser) startStatusSync(); }, 600);
  } catch(e){ console.error("init error", e); }
});
