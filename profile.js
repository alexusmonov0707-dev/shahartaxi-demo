// profile.js
// Modul: Firebase v9 modular imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getDatabase, ref, set, get, update, push, onValue, remove
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// -----------------------
// Firebase config (sening project)
// -----------------------
const firebaseConfig = {
  apiKey: "AIzaSyApWUG40YuC9aCsE9MOLXwLcYgRihREWvc",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
  projectId: "shahartaxi-demo",
  storageBucket: "shahartaxi-demo.appspot.com",
  messagingSenderId: "874241795701",
  appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};

// Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// -----------------------
// Helpers & globals
// -----------------------
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
let lastStatuses = {}; // for status change alerts

function $id(id){ return document.getElementById(id); }
function escapeHtml(s){ if(s === undefined || s === null) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }

// -----------------------
// Auth state listener
// -----------------------
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if(user){
    // ensure user record exists
    try {
      await update(ref(db, `users/${user.uid}`), {
        phone: user.phoneNumber || "",
        name: user.displayName || (user.phoneNumber || "")
      });
    } catch(e){
      // if update fails (no record), set
      await set(ref(db, `users/${user.uid}`), {
        phone: user.phoneNumber || "",
        name: user.displayName || (user.phoneNumber || "")
      }).catch(()=>{});
    }

    loadUserProfile();
    loadUserAds();
    startStatusSync();
  } else {
    // logged out: update small UI pieces
    if($id('profileName')) $id('profileName').textContent = 'Foydalanuvchi';
    if($id('profilePhone')) $id('profilePhone').textContent = '—';
    if($id('myAds')) $id('myAds').innerHTML = '<p>Hozircha e’lonlar yo‘q.</p>';
  }
});

// -----------------------
// Load / update profile header
// -----------------------
async function loadUserProfile(){
  if(!currentUser) return;
  try {
    const snap = await get(ref(db, `users/${currentUser.uid}`));
    const data = snap.val() || {};
    if($id('profileName')) $id('profileName').textContent = data.name || 'Foydalanuvchi';
    if($id('profilePhone')) $id('profilePhone').textContent = data.phone || '—';
    if($id('profileRatingBig')) $id('profileRatingBig').textContent = data.ratingAvg ? `${data.ratingAvg} / 5` : '—';
    if($id('profileRatingCount')) $id('profileRatingCount').textContent = data.ratingCount ? `${data.ratingCount} ta baho` : '—';
  } catch(e){
    console.error('loadUserProfile error', e);
  }
}

// -----------------------
// Edit profile modal functions
// -----------------------
function openEditProfile(){
  if(!currentUser){ alert('Avval tizimga kiring'); return; }
  get(ref(db, `users/${currentUser.uid}`)).then(snap=>{
    const data = snap.val() || {};
    if($id('editFullName')) $id('editFullName').value = data.name || '';
    if($id('editPhoneInput')) $id('editPhoneInput').value = data.phone || '';
    const modal = $id('editProfileModal');
    if(modal) modal.style.display = 'flex';
  }).catch(e => {
    console.error('openEditProfile error', e);
    alert('Profilni yuklashda xatolik');
  });
}

function closeEditProfile(){
  const m = $id('editProfileModal'); if(m) m.style.display = 'none';
}

async function saveProfileEdit(){
  if(!currentUser) return alert('Tizimga kiring');
  const name = ($id('editFullName') && $id('editFullName').value.trim()) || '';
  const phone = ($id('editPhoneInput') && $id('editPhoneInput').value.trim()) || '';
  if(!/^\+998\d{9}$/.test(phone)) return alert("Telefonni to'g'ri kiriting (+998901234567)");
  try {
    await update(ref(db, `users/${currentUser.uid}`), { name, phone });
    alert('Profil yangilandi');
    loadUserProfile();
    closeEditProfile();
  } catch(e){
    console.error('saveProfileEdit error', e);
    alert('Saqlashda xatolik');
  }
}

// -----------------------
// Regions -> selects
// -----------------------
function loadRegionsToSelects(){
  ['fromRegion','toRegion'].forEach(id=>{
    const sel = $id(id);
    if(!sel) return;
    sel.innerHTML = '<option value="">Viloyatni tanlang</option>';
    Object.keys(regions).forEach(r=>{
      const opt = document.createElement('option'); opt.value = r; opt.textContent = r; sel.appendChild(opt);
    });
  });
  // also ensure districts have default
  if($id('fromDistrict')) $id('fromDistrict').innerHTML = '<option value="">Tumanni tanlang</option>';
  if($id('toDistrict')) $id('toDistrict').innerHTML = '<option value="">Tumanni tanlang</option>';
}

function updateDistricts(prefix){
  // prefix 'from' or 'to'
  const regionSel = $id(prefix + 'Region');
  const districtSel = $id(prefix + 'District');
  if(!regionSel || !districtSel) return;
  const region = regionSel.value;
  districtSel.innerHTML = '<option value="">Tumanni tanlang</option>';
  if(region && regions[region]){
    regions[region].forEach(d=>{
      const opt = document.createElement('option'); opt.value = d; opt.textContent = d; districtSel.appendChild(opt);
    });
  }
}

// -----------------------
// Add ad
// -----------------------
async function addAd(){
  if(!currentUser) return alert('Avval tizimga kiring');
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
    const ad = {
      id: adId,
      ownerUid: currentUser.uid,
      ownerPhone: currentUser.phoneNumber || "",
      type,
      fromRegion, fromDistrict,
      toRegion, toDistrict,
      price, comment,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    await set(ref(db, `ads/${adId}`), ad);
    await set(ref(db, `userAds/${currentUser.uid}/${adId}`), ad);
    await set(ref(db, `pendingAds/${adId}`), ad);

    alert("E'lon yuborildi. Admin tasdiqlashini kuting.");
    clearAddForm();
  } catch(e){
    console.error('addAd error', e);
    alert("E'lon yaratishda xatolik");
  }
}

function clearAddForm(){
  ['adType','fromRegion','fromDistrict','toRegion','toDistrict','price','adComment'].forEach(id=>{
    const el = $id(id);
    if(!el) return;
    el.value = '';
  });
  if($id('fromDistrict')) $id('fromDistrict').innerHTML = '<option value="">Tumanni tanlang</option>';
  if($id('toDistrict')) $id('toDistrict').innerHTML = '<option value="">Tumanni tanlang</option>';
}

// -----------------------
// Load user ads realtime
// -----------------------
function loadUserAds(){
  if(!currentUser) return;
  const userAdsRef = ref(db, `userAds/${currentUser.uid}`);
  onValue(userAdsRef, snap=>{
    const obj = snap.val() || {};
    const list = Object.values(obj || []);
    // save local copies by type for backward compatibility
    localStorage.setItem('driverAds', JSON.stringify(list.filter(a=>a.type==='driver')));
    localStorage.setItem('passengerAds', JSON.stringify(list.filter(a=>a.type==='passenger')));
    renderAdsListFromLocal();
  }, err=>{
    console.error('loadUserAds onValue error', err);
  });
}

// -----------------------
// Render ads from localStorage (used by UI)
// -----------------------
function renderAdsListFromLocal(){
  const driver = JSON.parse(localStorage.getItem('driverAds') || '[]');
  const passenger = JSON.parse(localStorage.getItem('passengerAds') || '[]');
  const all = [...driver, ...passenger];
  const cont = $id('myAds');
  if(!cont) return;
  cont.innerHTML = '';
  if(all.length === 0){ cont.innerHTML = '<p>Hozircha e’lonlar yo‘q.</p>'; return; }
  all.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
  all.forEach(ad=>{
    const div = document.createElement('div');
    div.className = 'ad-box ' + (ad.status || 'pending');
    const from = `${ad.fromRegion || ''} ${ad.fromDistrict || ''}`.trim();
    const to = `${ad.toRegion || ''} ${ad.toDistrict || ''}`.trim();
    div.innerHTML = `
      <div><b>Yo'nalish:</b> ${escapeHtml(from)} → ${escapeHtml(to)}</div>
      <div><b>Narx:</b> ${escapeHtml(ad.price || '—')} so'm</div>
      <div><b>Telefon:</b> ${escapeHtml(ad.ownerPhone || '—')}</div>
      <div class="date-info">🕒 ${new Date(ad.createdAt).toLocaleString()} · Holat: ${escapeHtml(ad.status || 'pending')}</div>
      <div style="margin-top:8px;display:flex;gap:8px">
        ${ad.status !== 'approved' ? `<button onclick="startEditAd('${ad.id}')">Tahrirlash</button>` : `<button disabled style="background:#aaa">Tahrirlash</button>`}
        <button onclick="deleteAd('${ad.id}')">O'chirish</button>
        <button onclick="openViewProfile('${ad.ownerUid}')">Profil</button>
      </div>
    `;
    cont.appendChild(div);
  });
}

// -----------------------
// Edit / delete functions (simple flows)
// -----------------------
async function startEditAd(adId){
  if(!currentUser) return alert('Tizimga kiring');
  try{
    const snap = await get(ref(db, `userAds/${currentUser.uid}/${adId}`));
    const ad = snap.val();
    if(!ad) return alert("E'lon topilmadi");
    if(ad.status === 'approved') return alert("Tasdiqlangan e'lonni o'zgartirib bo'lmaydi");
    const newPrice = prompt("Yangi narx kiriting:", ad.price || '');
    if(newPrice === null) return;
    const updates = { price: newPrice, edited: true, status: 'pending', editedAt: new Date().toISOString() };
    await update(ref(db, `ads/${adId}`), updates).catch(()=>{});
    await update(ref(db, `userAds/${currentUser.uid}/${adId}`), updates).catch(()=>{});
    await update(ref(db, `pendingAds/${adId}`), updates).catch(()=>{});
    alert("E'lon yangilandi. Admin tasdiqlashini kuting.");
  } catch(e){
    console.error('startEditAd error', e); alert('E'lonni tahrirlashda xatolik');
  }
}

async function deleteAd(adId){
  if(!currentUser) return alert('Tizimga kiring');
  if(!confirm("Haqiqatan o'chirmoqchimisiz?")) return;
  try{
    await remove(ref(db, `ads/${adId}`)).catch(()=>{});
    await remove(ref(db, `userAds/${currentUser.uid}/${adId}`)).catch(()=>{});
    await remove(ref(db, `pendingAds/${adId}`)).catch(()=>{});
    alert("E'lon o'chirildi");
  } catch(e){
    console.error('deleteAd error', e); alert('O\'chirishda xatolik');
  }
}

// -----------------------
// View other user's profile + ratings
// -----------------------
async function openViewProfile(uid){
  if(!uid) return;
  try {
    const uSnap = await get(ref(db, `users/${uid}`));
    const user = uSnap.val() || {};
    if($id('vpName')) $id('vpName').textContent = user.name || 'Foydalanuvchi';
    if($id('vpPhone')) $id('vpPhone').textContent = user.phone || '—';

    // ratings (one-time)
    const ratingsSnap = await get(ref(db, `ratings/${uid}`));
    const ratingsList = ratingsSnap.val() ? Object.values(ratingsSnap.val()) : [];
    if($id('vpRatingSummary')) {
      const avg = ratingsList.length ? (ratingsList.reduce((s,r)=> s + (Number(r.stars)||0), 0) / ratingsList.length).toFixed(2) : '—';
      $id('vpRatingSummary').innerHTML = `<strong>${avg} / 5</strong> — ${ratingsList.length} ta baho`;
    }

    // user's ads
    const adsSnap = await get(ref(db, `userAds/${uid}`));
    const ads = adsSnap.val() ? Object.values(adsSnap.val()) : [];
    if($id('vpAdsList')) {
      if(!ads.length) $id('vpAdsList').innerHTML = `<p class="small">E'lonlari yo'q.</p>`;
      else $id('vpAdsList').innerHTML = ads.map(a=>`<div style="padding:6px;border-bottom:1px solid #eee;"><b>${a.type==='driver'?'Haydovchi':'Yo\\'lovchi'}</b> · ${escapeHtml(a.fromRegion||'')} → ${escapeHtml(a.toRegion||'')} · ${escapeHtml(a.price||'')} so'm<br><small>${new Date(a.createdAt).toLocaleString()}</small></div>`).join('');
    }

    // rating input (basic)
    if($id('vpRateSection')) {
      if(!currentUser) $id('vpRateSection').innerHTML = '<div class="small">Baholash uchun tizimga kiring.</div>';
      else if(currentUser.uid === uid) $id('vpRateSection').innerHTML = '<div class="small">O\'zingizni baholay olmaysiz.</div>';
      else {
        const ratedSnap = await get(ref(db, `ratings/${uid}/${currentUser.uid}`));
        if(ratedSnap.exists()) $id('vpRateSection').innerHTML = '<div class="small">Siz allaqachon baho bergansiz.</div>';
        else {
          $id('vpRateSection').innerHTML = `
            <div>
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
  } catch(e){
    console.error('openViewProfile error', e); alert('Profilni ochishda xatolik');
  }
}

async function submitProfileRating(targetUid){
  if(!currentUser){ alert('Baholash uchun tizimga kiring'); return; }
  if(currentUser.uid === targetUid) return alert("O'zingizni baholay olmaysiz");
  const stars = Number($id('vpRatingStars') && $id('vpRatingStars').value) || 5;
  const text = ($id('vpRatingText') && $id('vpRatingText').value.trim()) || '';
  try {
    await set(ref(db, `ratings/${targetUid}/${currentUser.uid}`), { stars, text, date: new Date().toISOString(), raterUid: currentUser.uid });
    // recompute and store summary
    const snap = await get(ref(db, `ratings/${targetUid}`));
    const all = snap.val() ? Object.values(snap.val()) : [];
    let avg = 0;
    if(all.length) avg = (all.reduce((s,r)=> s + (Number(r.stars)||0), 0) / all.length);
    await update(ref(db, `users/${targetUid}`), { ratingAvg: +(avg.toFixed(2)), ratingCount: all.length });
    alert('Baho yuborildi!');
    openViewProfile(targetUid);
  } catch(e){
    console.error('submitProfileRating error', e);
    alert('Baho yuborishda xatolik');
  }
}

// -----------------------
// Status sync (notify on change)
// -----------------------
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
  }, err => console.error('startStatusSync error', err));
}

// -----------------------
// Utils: logout, close view
// -----------------------
function logout(){
  signOut(auth).then(()=> { alert('Chiqdingiz'); location.href = '/'; }).catch(e=> { console.error(e); alert('Chiqishda xatolik'); });
}
function closeViewProfile(){ const m = $id('viewProfileModal'); if(m) m.style.display = 'none'; }

// -----------------------
// Export functions to window for HTML onclicks
// -----------------------
window.logout = logout;
window.openEditProfile = openEditProfile;
window.closeEditProfile = closeEditProfile;
window.saveProfileEdit = saveProfileEdit;
window.loadRegionsToSelects = loadRegionsToSelects;
window.updateDistricts = updateDistricts;
window.addAd = addAd;
window.clearAddForm = clearAddForm;
window.startEditAd = startEditAd;
window.deleteAd = deleteAd;
window.openViewProfile = openViewProfile;
window.submitProfileRating = submitProfileRating;
window.closeViewProfile = closeViewProfile;

// -----------------------
// Init on DOMContentLoaded
// -----------------------
document.addEventListener('DOMContentLoaded', ()=>{
  loadRegionsToSelects();
  // if user already logged in, onAuthStateChanged will call loadUserAds etc.
  setTimeout(()=>{ if(currentUser) startStatusSync(); }, 600);
});
