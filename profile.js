/* =========================================================
   SHAHARTAXI — profile.js (Single-file, FIREBASE v8)
   - Phone Auth (SMS)
   - Realtime ads: ads/{uid}/{adId}
   - Pending index: pendingAds/{adId}
   - Ratings: ratings/{targetUid}/{raterUid}
   - Users: users/{uid}
   - No localStorage (faqat session uchun minimal)
   ========================================================= */

/* -------------------------
   FIREBASE CONFIG — o'zgartirmang
   ------------------------- */
const firebaseConfig = {
  apiKey: "AIzaSyApWUG40YuC9aCsE9MOLXwLcYgRihREWvc",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
  projectId: "shahartaxi-demo",
  storageBucket: "shahartaxi-demo.firebasestorage.app",
  messagingSenderId: "874241795701",
  appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};

// init
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

/* -------------------------
   GLOBALS
   ------------------------- */
let currentUser = null;    // firebase.User
let userData = {};         // users/{uid}
let userAdsCache = [];     // ads for current user (array)
let userAdsRef = null;     // db ref for listener

/* -------------------------
   REGIONS
   ------------------------- */
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

/* -------------------------
   HELPERS
   ------------------------- */
function escapeHtml(str){
  if(str === undefined || str === null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function formatPhoneIntl(phone){
  // keep as +998901234567 or return phone as-is
  if(!phone) return '';
  return String(phone);
}

/* -------------------------
   PHONE AUTH (reCAPTCHA + send + verify)
   ------------------------- */
function ensureRecaptcha(){
  // create container if not exists
  if(document.getElementById('recaptcha-container')) return;
  const div = document.createElement('div');
  div.id = 'recaptcha-container';
  div.style.display = 'none';
  document.body.appendChild(div);
}

async function startPhoneLogin(phoneInputValue){
  // phoneInputValue expected in +998XXXXXXXXX format
  const phone = phoneInputValue.trim();
  const phoneRegex = /^\+998\d{9}$/;
  if(!phoneRegex.test(phone)){
    alert("Telefonni +998XXXXXXXXX formatida kiriting (masalan +998901234567).");
    return;
  }

  ensureRecaptcha();

  // invisible reCAPTCHA verifier
  window._recaptchaVerifier = window._recaptchaVerifier || new firebase.auth.RecaptchaVerifier('recaptcha-container', {
    size: 'invisible'
  });

  try {
    const confirmation = await auth.signInWithPhoneNumber(phone, window._recaptchaVerifier);
    // store confirmationResult globally for verify step
    window._confirmationResult = confirmation;
    // show code input modal (you should have a UI to enter code)
    const code = prompt("SMS kodni kiriting:");
    if(code) await verifyCode(code);
  } catch(err){
    console.error("SMS yuborilmadi:", err);
    alert("SMS jo'natishda xatolik: " + (err.message || err));
    // reset recaptcha on error for retry
    if(window._recaptchaVerifier) window._recaptchaVerifier.clear();
    window._recaptchaVerifier = null;
  }
}

async function verifyCode(code){
  try {
    const result = await window._confirmationResult.confirm(code);
    // user is signed in
    currentUser = result.user;
    await postLoginInit();
  } catch(err){
    console.error("Kod tasdiqlanmadi:", err);
    alert("Kod noto'g'ri yoki xatolik yuz berdi: " + (err.message || err));
  }
}

/* -------------------------
   POST LOGIN: create/update user record + load ads
   ------------------------- */
async function postLoginInit(){
  if(!auth.currentUser) return;
  currentUser = auth.currentUser;

  // create/update user record
  const uRef = db.ref("users/" + currentUser.uid);
  await uRef.update({
    phone: currentUser.phoneNumber || "",
    name: currentUser.phoneNumber || "",
    updatedAt: new Date().toISOString()
  });

  const snap = await uRef.once('value');
  userData = snap.val() || {};
  updateProfileHeader(userData);

  // listen to user's ads realtime
  attachUserAdsListener(currentUser.uid);

  // optionally listen to ratings summary for header
  listenUserRatings(currentUser.uid, (data)=>{
    // store avg in userData (not required but helpful)
    userData.ratingAvg = data.avg;
    userData.ratingCount = data.count;
    updateProfileHeader(userData);
  });
}

/* -------------------------
   UPDATE PROFILE HEADER (UI)
   ------------------------- */
function updateProfileHeader(user){
  document.getElementById('profileName').textContent = user.name || 'Foydalanuvchi';
  document.getElementById('profilePhone').textContent = formatPhoneIntl(user.phone || '');
  if(user.ratingAvg){
    document.getElementById('profileRatingBig').textContent = user.ratingAvg + ' / 5';
    document.getElementById('profileRatingCount').textContent = `${user.ratingCount||0} ta baho`;
  } else {
    document.getElementById('profileRatingBig').textContent = '—';
    document.getElementById('profileRatingCount').textContent = 'Hozircha baholar yo‘q';
  }
  // show edit if current user is viewing own profile
  const editBtn = document.getElementById('editProfileBtn');
  if(currentUser) editBtn.style.display = 'inline-block'; else editBtn.style.display = 'none';
}

/* -------------------------
   REGION SELECTS helpers
   ------------------------- */
function loadRegionsToSelects(){
  ['fromRegion','toRegion','filterFromRegion','filterToRegion','editFromRegion','editToRegion'].forEach(id=>{
    const sel = document.getElementById(id);
    if(!sel) return;
    sel.innerHTML = '<option value="">Viloyatni tanlang</option>';
    Object.keys(regions).forEach(r => {
      const opt = document.createElement('option');
      opt.value = r; opt.textContent = r;
      sel.appendChild(opt);
    });
  });
}
function updateDistricts(prefix){
  const region = document.getElementById(prefix + 'Region').value;
  const sel = document.getElementById(prefix + 'District');
  if(!sel) return;
  sel.innerHTML = '<option value="">Tumanni tanlang</option>';
  if(region && regions[region]) regions[region].forEach(d => sel.appendChild(new Option(d,d)));
}
function updateFilterDistricts(prefix){
  const region = document.getElementById(prefix + 'Region').value;
  const sel = document.getElementById(prefix + 'District');
  if(!sel) return;
  sel.innerHTML = '<option value="">Tanlang</option>';
  if(region && regions[region]) regions[region].forEach(d => sel.appendChild(new Option(d,d)));
  renderUserAdsList(); // re-render with new filter
}

/* -------------------------
   ADS: add / attach listener / render / edit / delete
   ------------------------- */
async function addAd(){
  if(!currentUser){ alert('Avval tizimga kiring!'); return; }

  const type = (document.getElementById('adType')||{}).value;
  const fromRegion = (document.getElementById('fromRegion')||{}).value;
  const fromDistrict = (document.getElementById('fromDistrict')||{}).value;
  const toRegion = (document.getElementById('toRegion')||{}).value;
  const toDistrict = (document.getElementById('toDistrict')||{}).value;
  const price = (document.getElementById('price')||{}).value.trim();
  const comment = (document.getElementById('adComment')||{}).value.trim();

  if(!type || !fromRegion || !toRegion){
    alert("Iltimos yo'nalishni to'liq tanlang.");
    return;
  }

  const adId = Date.now().toString();

  const ad = {
    id: adId,
    ownerUid: currentUser.uid,
    ownerPhone: currentUser.phoneNumber || '',
    type,
    fromRegion, fromDistrict,
    toRegion, toDistrict,
    price: price || '',
    comment: comment || '',
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  // write to user's ads and pendingAds index
  await db.ref(`ads/${currentUser.uid}/${adId}`).set(ad);
  await db.ref(`pendingAds/${adId}`).set({
    ...ad,
    ownerUid: currentUser.uid
  });

  clearAddForm();
  alert('✅ E’lon yuborildi. Admin tasdiqlashini kuting.');
}

/* Attach realtime listener for current user's ads */
function attachUserAdsListener(uid){
  if(userAdsRef) userAdsRef.off();
  userAdsRef = db.ref(`ads/${uid}`);
  userAdsRef.on('value', snap => {
    const obj = snap.val() || {};
    userAdsCache = Object.values(obj);
    renderUserAdsList();
  });
}

/* Render user ads with filters */
function renderUserAdsList(){
  const container = document.getElementById('myAds');
  container.innerHTML = '';

  let list = Array.isArray(userAdsCache) ? [...userAdsCache] : [];

  // apply filters
  const q = (document.getElementById('searchAdInput')||{}).value || '';
  const typeFilter = (document.getElementById('filterType')||{}).value || 'all';
  const statusFilter = (document.getElementById('filterStatus')||{}).value || 'all';
  const fFromRegion = (document.getElementById('filterFromRegion')||{}).value || '';
  const fFromDistrict = (document.getElementById('filterFromDistrict')||{}).value || '';
  const fToRegion = (document.getElementById('filterToRegion')||{}).value || '';
  const fToDistrict = (document.getElementById('filterToDistrict')||{}).value || '';

  if(typeFilter !== 'all') list = list.filter(a => a.type === typeFilter);
  if(statusFilter !== 'all') list = list.filter(a => (a.status||'pending') === statusFilter);
  if(fFromRegion) list = list.filter(a => (a.fromRegion||'').includes(fFromRegion));
  if(fFromDistrict) list = list.filter(a => (a.fromDistrict||'').includes(fFromDistrict));
  if(fToRegion) list = list.filter(a => (a.toRegion||'').includes(fToRegion));
  if(fToDistrict) list = list.filter(a => (a.toDistrict||'').includes(fToDistrict));
  if(q) {
    const qq = q.toLowerCase();
    list = list.filter(a => (a.phone||a.ownerPhone||a.id||a.comment||'').toString().toLowerCase().includes(qq));
  }

  if(list.length === 0){
    container.innerHTML = '<p>Hozircha e’lonlar yo‘q.</p>';
    return;
  }

  // sort by date desc
  list.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));

  list.forEach(ad=>{
    const div = document.createElement('div');
    div.className = 'ad-box ' + (ad.status || 'pending');
    const from = `${escapeHtml(ad.fromRegion||'')} ${escapeHtml(ad.fromDistrict||'')}`;
    const to = `${escapeHtml(ad.toRegion||'')} ${escapeHtml(ad.toDistrict||'')}`;
    const created = ad.createdAt ? new Date(ad.createdAt).toLocaleString() : '—';
    const statusText = ad.status === 'approved' ? '✅ Tasdiqlangan' : ad.status === 'rejected' ? '❌ Rad etilgan' : '⏳ Kutilmoqda';

    // when owner, show edit/delete; otherwise contact/profile
    const isOwner = currentUser && (String(currentUser.uid) === String(ad.ownerUid));

    let actions = '';
    if(isOwner){
      if(ad.status !== 'approved'){
        actions += `<button onclick="openEditAd('${ad.id}')">✏️ Tahrirlash</button>`;
      } else {
        actions += `<button disabled style="background:#ccc;cursor:not-allowed;">✏️ Tahrirlash</button>`;
      }
      actions += `<button onclick="deleteAdConfirm('${ad.id}')">🗑️ O'chirish</button>`;
    } else {
      actions += `<button class="view-profile-btn" onclick="openViewProfile('${ad.ownerUid}')">🔎 Profilni ko'rish</button>`;
      actions += `<button onclick="contactOwner('${escapeHtml(ad.ownerPhone||ad.ownerPhone||'')}')">📞 Telefon</button>`;
    }

    div.innerHTML = `
      <div><b>Yo'nalish:</b> ${from} → ${to}</div>
      <div><b>Narx:</b> ${escapeHtml(ad.price || '—')} so'm</div>
      <div><b>Telefon:</b> ${escapeHtml(ad.ownerPhone || '')}</div>
      <div class="date-info">🕒 Joylangan: ${escapeHtml(created)} · Holat: ${escapeHtml(statusText)}</div>
      ${ad.comment ? `<div class="comment-box"><b>Izoh:</b> ${escapeHtml(ad.comment)}</div>` : ''}
      <div class="actions">${actions}</div>
    `;
    container.appendChild(div);
  });
}

/* delete flow: confirm and remove both ad and pending index */
function deleteAdConfirm(adId){
  if(!confirm("Haqiqatan o'chirishni xohlaysizmi?")) return;
  deleteAd(adId);
}
async function deleteAd(adId){
  if(!currentUser) { alert('Avval tizimga kiring'); return; }
  await db.ref(`ads/${currentUser.uid}/${adId}`).remove();
  await db.ref(`pendingAds/${adId}`).remove();
  alert('🗑️ E\'lon o\'chirildi.');
}

/* Edit ad modal open/save */
async function openEditAd(adId){
  if(!currentUser) return;
  const snap = await db.ref(`ads/${currentUser.uid}/${adId}`).once('value');
  const ad = snap.val();
  if(!ad) return;
  if(ad.status === 'approved'){ alert("Tasdiqlangan e'londa o'zgartirish mumkin emas."); return; }

  // populate modal inputs - ensure modal inputs exist in HTML
  document.getElementById('editFromRegion').value = ad.fromRegion || '';
  // update districts if needed
  updateDistricts('editFrom');
  document.getElementById('editFromDistrict').value = ad.fromDistrict || '';
  document.getElementById('editToRegion').value = ad.toRegion || '';
  updateDistricts('editTo');
  document.getElementById('editToDistrict').value = ad.toDistrict || '';
  document.getElementById('editPrice').value = ad.price || '';
  document.getElementById('editComment').value = ad.comment || '';

  window._editingAdId = adId;
  document.getElementById('editAdModal').style.display = 'flex';
}
function closeEditAd(){
  window._editingAdId = null;
  document.getElementById('editAdModal').style.display = 'none';
}
async function saveEditedAd(){
  const adId = window._editingAdId;
  if(!adId) return;
  const updated = {
    fromRegion: document.getElementById('editFromRegion').value,
    fromDistrict: document.getElementById('editFromDistrict').value,
    toRegion: document.getElementById('editToRegion').value,
    toDistrict: document.getElementById('editToDistrict').value,
    price: document.getElementById('editPrice').value.trim(),
    comment: document.getElementById('editComment').value.trim(),
    status: 'pending',
    editedAt: new Date().toISOString()
  };

  await db.ref(`ads/${currentUser.uid}/${adId}`).update(updated);
  await db.ref(`pendingAds/${adId}`).set({
    id: adId,
    ownerUid: currentUser.uid,
    ...updated
  });

  closeEditAd();
  alert('✏️ E\'lon tahrirlandi. Admin tasdiqlashini kuting.');
}

/* -------------------------
   VIEW OTHER PROFILE + RATINGS
   ------------------------- */
async function openViewProfile(uid){
  if(!uid) return;
  document.getElementById('viewProfileModal').style.display = 'flex';

  const snap = await db.ref(`users/${uid}`).once('value');
  const user = snap.val() || {};
  document.getElementById('vpName').textContent = user.name || 'Foydalanuvchi';
  document.getElementById('vpPhone').textContent = user.phone || '';

  // ratings summary listener
  listenUserRatings(uid, (data)=>{
    document.getElementById('vpRatingSummary').innerHTML = `<strong>${data.avg || '—'} / 5</strong> — ${data.count} ta baho`;
  });

  // rate section
  const sec = document.getElementById('vpRateSection');
  if(!currentUser || currentUser.uid === uid){
    sec.innerHTML = `<div class="small">Siz o'zingizni baholay olmaysiz.</div>`;
  } else {
    // check if already rated
    const existsSnap = await db.ref(`ratings/${uid}/${currentUser.uid}`).once('value');
    if(existsSnap.exists()){
      sec.innerHTML = `<div class="small">Siz allaqachon bu foydalanuvchini baholagansiz.</div>`;
    } else {
      sec.innerHTML = `
        <div style="margin-top:8px;">
          <label><b>⭐ Baho tanlang</b></label>
          <div style="margin-top:6px;">
            <select id="vpRatingStars">
              <option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option>
            </select>
          </div>
          <div style="margin-top:6px;">
            <textarea id="vpRatingText" rows="2" placeholder="Ixtiyoriy izoh..."></textarea>
          </div>
          <div style="text-align:right;margin-top:6px;">
            <button onclick="submitProfileRating('${uid}')">Yuborish</button>
          </div>
        </div>
      `;
    }
  }

  // load this user's ads (once)
  loadOtherUserAds(uid);
}
function closeViewProfile(){ document.getElementById('viewProfileModal').style.display = 'none'; }

function loadOtherUserAds(uid){
  db.ref(`ads/${uid}`).once('value').then(snap=>{
    const list = Object.values(snap.val() || {});
    const box = document.getElementById('vpAdsList');
    if(!list.length) { box.innerHTML = "<p class='small'>E’lonlari mavjud emas.</p>"; return; }
    box.innerHTML = list.map(a=>{
      return `<div style="padding:6px;border-bottom:1px solid #eee;"><b>${a.type === 'driver' ? 'Haydovchi' : 'Yo‘lovchi'}</b> · ${escapeHtml(a.fromRegion||'')} → ${escapeHtml(a.toRegion||'')} · ${escapeHtml(a.price||'')} so'm<br><small class='small'>${new Date(a.createdAt).toLocaleString()}</small></div>`;
    }).join('');
  });
}

/* -------------------------
   RATINGS: listen + submit + compute -> store avg in users/{uid}
   ------------------------- */
function listenUserRatings(uid, callback){
  db.ref(`ratings/${uid}`).on('value', snap=>{
    const obj = snap.val() || {};
    const list = Object.values(obj);
    let avg = 0;
    if(list.length) {
      avg = list.reduce((s,r)=> s + Number(r.stars||0), 0) / list.length;
      avg = +(avg.toFixed(1));
    }
    // update user's aggregated fields (optional)
    db.ref(`users/${uid}`).update({ ratingAvg: avg, ratingCount: list.length }).catch(()=>{});
    callback({ ratings: list, avg, count: list.length });
  });
}

async function submitProfileRating(targetUid){
  if(!currentUser){ alert('Baholash uchun tizimga kiring!'); return; }
  if(currentUser.uid === targetUid){ alert("O'zingizni baholay olmaysiz!"); return; }

  const stars = Number(document.getElementById('vpRatingStars').value || 5);
  const text = (document.getElementById('vpRatingText')||{}).value || '';
  const raterUid = currentUser.uid;

  // prevent double rate
  const exists = await db.ref(`ratings/${targetUid}/${raterUid}`).once('value');
  if(exists.exists()){ alert("Siz allaqachon baho bergansiz."); return; }

  await db.ref(`ratings/${targetUid}/${raterUid}`).set({
    stars, text, date: new Date().toISOString(), raterUid
  });

  alert('⭐ Baho yuborildi!');
  // UI refresh handled by realtime listener
  // close modal or update view
  openViewProfile(targetUid);
}

/* -------------------------
   AUTH LISTENER (global)
   ------------------------- */
auth.onAuthStateChanged((user)=>{
  currentUser = user || null;
  if(user){
    // load user record + attach ads listener + header
    postLoginInit().catch(console.error);
  } else {
    // signed out: clear UI where needed
    userAdsCache = [];
    renderUserAdsList();
    updateProfileHeader({}); // resets header
  }
});

/* -------------------------
   LOGIN UI helpers (exposed)
   - call startPhoneLogin('+998901234567')
   - add a "logout" button calls logout()
   ------------------------- */
function logout(){
  auth.signOut();
  alert('Chiqdingiz.');
  location.reload();
}

/* -------------------------
   CONTACT OWNER
   ------------------------- */
function contactOwner(phone){
  if(!phone) { alert('Telefon mavjud emas'); return; }
  alert(`Telefon: ${phone} — telefonni nusxa oling yoki qo'ng'iroq qiling.`);
}

/* -------------------------
   FORM UTIL
   ------------------------- */
function clearAddForm(){
  const ids = ['adType','fromRegion','fromDistrict','toRegion','toDistrict','price','adComment'];
  ids.forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  // reset district selects
  ['fromDistrict','toDistrict'].forEach(id=>{ const el=document.getElementById(id); if(el) el.innerHTML = '<option value=\"\">Tumanni tanlang</option>'; });
}

/* -------------------------
   ON DOM READY: init selects and attach UI events
   ------------------------- */
document.addEventListener('DOMContentLoaded', ()=>{
  loadRegionsToSelects();

  // close modals on background click
  document.querySelectorAll('.modal').forEach(m=>{
    m.addEventListener('click', e=>{
      if(e.target === m) m.style.display = 'none';
    });
  });

  // Attach initial render if user already signed in
  if(auth.currentUser){
    currentUser = auth.currentUser;
    postLoginInit().catch(console.error);
  }
});

/* -------------------------
   DEBUG helpers (console)
   ------------------------- */
window._shahartaxi = {
  startPhoneLogin, verifyCode, currentUser: () => auth.currentUser,
  getAdsSnapshot: () => db.ref('ads').once('value').then(s=>s.val()),
  getPending: () => db.ref('pendingAds').once('value').then(s=>s.val()),
  getUsers: () => db.ref('users').once('value').then(s=>s.val())
};
