/* profile.js
   Full standalone script for the profile.html you provided.
   - Uses localStorage keys: users, currentUser, driverAds, passengerAds, profileRatings, userAdStatuses, tempInlineEdit
   - Preserves original behavior and IDs from your HTML
   - No external dependencies
*/

/* ===========================
   Fallback REGIONS object
   (If you have regions.js exposing `regions`, it will be used instead)
   =========================== */
const REGIONS = (function(){
  // if a global `regions` exists (from regions.js), use that
  if (typeof window !== 'undefined' && window.regions && typeof window.regions === 'object') {
    return window.regions;
  }
  return {
    "Toshkent": ["Bektemir","Chilonzor","Mirzo Ulug'bek","Mirobod"],
    "Samarqand": ["Bulungur","Ishtixon","Urgut","Kattaqo'rg'on"],
    "Namangan": ["Pop","Chust","To'raqo'rg'on"],
    "Andijon": ["Asaka","Andijon sh.","Marhamat"],
    "Farg'ona": ["Qo'qon","Qo'rg'ontepa","Beshariq"],
    "Buxoro": ["Buxoro sh.","G'ijduvon","Jondor"],
    "Xorazm": ["Urgench","Xiva","Shovot"],
    "Qashqadaryo": ["Qarshi","G'uzor","Kitob"]
  };
})();

/* ===========================
   Storage helpers
   =========================== */
function getJSON(key){
  try{
    const raw = localStorage.getItem(key);
    if(!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed;
  } catch(e){
    console.warn('getJSON parse error for', key, e);
    return [];
  }
}
function setJSON(key, val){
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch(e){
    console.error('setJSON error', key, e);
  }
}

/* ===========================
   Utility helpers
   =========================== */
function escapeHtml(str){
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

// Parse flexible date strings (ISO or dd.mm.yyyy or builtin)
function parseAdDate(dateStr){
  if(!dateStr) return null;
  const d = new Date(dateStr);
  if(!isNaN(d.getTime())) return d;
  // try dd.mm.yyyy[ hh:mm]
  const m = String(dateStr).match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if(m){
    const day = parseInt(m[1],10);
    const mon = parseInt(m[2],10)-1;
    const yr = parseInt(m[3],10);
    const hh = m[4] ? parseInt(m[4],10) : 0;
    const mm = m[5] ? parseInt(m[5],10) : 0;
    return new Date(yr,mon,day,hh,mm);
  }
  return null;
}

/* Format createdAt to readable string */
function formatCreatedAt(createdAt){
  const d = parseAdDate(createdAt) || new Date(createdAt || Date.now());
  try {
    return d.toLocaleString();
  } catch(e) {
    return d.toString();
  }
}

/* Average compute */
function computeAverage(ratings){
  if(!ratings || ratings.length === 0) return 0;
  const s = ratings.reduce((sum,r)=> sum + (Number(r.stars)||0), 0);
  return +(s/ratings.length).toFixed(2);
}

/* ---------------------------
   Current user detection
   - Support currentUser object OR users array with active flag
   --------------------------- */
function getCurrentUser(){
  try {
    const cuRaw = localStorage.getItem('currentUser');
    if(cuRaw){
      const cu = JSON.parse(cuRaw);
      if(cu && (cu.phone || cu.id)) return cu;
    }
  } catch(e){}
  const users = getJSON('users') || [];
  const active = users.find(u => u.active);
  if(active) return active;
  return null;
}

/* ---------------------------
   Normalize old ads (compatibility)
   ensure fields exist: comment, ownerId, createdAt
   --------------------------- */
function normalizeOldAds(){
  ['driverAds','passengerAds'].forEach(key=>{
    const ads = getJSON(key) || [];
    let changed = false;
    ads.forEach(a=>{
      if(!('comment' in a)){ a.comment = ''; changed = true; }
      if(!a.ownerId && a.phone){
        const users = getJSON('users') || [];
        const u = users.find(x=>String(x.phone) === String(a.phone));
        if(u){ a.ownerId = u.id; changed = true; }
      }
      if(!a.createdAt){ a.createdAt = new Date().toLocaleString(); changed = true; }
      // ensure status normalization
      if(!a.status) a.status = 'pending';
    });
    if(changed) setJSON(key, ads);
  });
}

/* ---------------------------
   Rating store helpers
   - profileRatings stored as [{phone: "<id-or-phone>", ratings: [{raterPhone,stars,text,date}, ...]}]
   --------------------------- */
function getProfileRatingsStore(){
  try { return JSON.parse(localStorage.getItem('profileRatings') || '[]'); } catch(e){ return []; }
}
function saveProfileRatingsStore(store){
  try { localStorage.setItem('profileRatings', JSON.stringify(store)); } catch(e){}
}
function getRatingsForProfile(profileId){
  if(!profileId) return [];
  const store = getProfileRatingsStore();
  const entry = store.find(it=> String(it.phone) === String(profileId));
  return entry ? entry.ratings : [];
}
function addRatingForProfile(profileId, rating){
  const store = getProfileRatingsStore();
  let entry = store.find(it=> String(it.phone) === String(profileId));
  if(!entry){ entry = { phone: String(profileId), ratings: [] }; store.push(entry); }
  entry.ratings.push(rating);
  saveProfileRatingsStore(store);
}

/* ---------------------------
   DOM Utilities: query by id with safe fallback
   --------------------------- */
function $id(id){ return document.getElementById(id); }

/* ===========================
   UI: populate region/district selects
   IDs used in HTML: fromRegion, fromDistrict, toRegion, toDistrict, filterFromRegion, filterFromDistrict, filterToRegion, filterToDistrict, viloyat (legacy), shahar (legacy)
   =========================== */
function loadRegionsToSelects(){
  const selectIds = ['fromRegion','toRegion','filterFromRegion','filterToRegion','viloyat'];
  selectIds.forEach(id=>{
    const el = $id(id);
    if(!el) return;
    el.innerHTML = '<option value="">Viloyatni tanlang</option>';
    Object.keys(REGIONS).forEach(region=>{
      const opt = document.createElement('option');
      opt.value = region; opt.textContent = region;
      el.appendChild(opt);
    });
  });

  // attach change listeners where needed
  const fromR = $id('fromRegion'), fromD = $id('fromDistrict');
  if(fromR && fromD){
    fromR.addEventListener('change', ()=> {
      updateDistricts('from');
    });
  }
  const toR = $id('toRegion'), toD = $id('toDistrict');
  if(toR && toD){
    toR.addEventListener('change', ()=> {
      updateDistricts('to');
    });
  }
  // filter selects
  ['filterFromRegion','filterToRegion'].forEach(id => {
    const el = $id(id);
    if(el){
      el.addEventListener('change', ()=> updateFilterDistricts(id==='filterFromRegion' ? 'filterFrom' : 'filterTo'));
    }
  });

  // legacy viloyat->shahar
  const vil = $id('viloyat'), shah = $id('shahar');
  if(vil && shah){
    vil.addEventListener('change', ()=>{
      shah.innerHTML = '<option value="">Shaharni tanlang</option>';
      const region = vil.value;
      if(region && REGIONS[region]){
        REGIONS[region].forEach(city => shah.appendChild(new Option(city,city)));
      }
    });
  }
}

/* updateDistricts(prefix) expects prefix 'from' or 'to' and builds <prefix>District from <prefix>Region */
function updateDistricts(prefix){
  const regEl = $id(prefix + 'Region');
  const districtEl = $id(prefix + 'District');
  if(!regEl || !districtEl) return;
  const region = regEl.value;
  districtEl.innerHTML = '<option value="">Tumanni tanlang</option>';
  if(region && REGIONS[region]){
    REGIONS[region].forEach(d => {
      districtEl.appendChild(new Option(d,d));
    });
  }
}

/* updateFilterDistricts(prefix) where prefix is 'filterFrom' or 'filterTo' */
function updateFilterDistricts(prefix){
  const regEl = $id(prefix + 'Region');
  const districtEl = $id(prefix + 'District');
  if(!regEl || !districtEl) return;
  districtEl.innerHTML = '<option value="">Tanlang</option>';
  const region = regEl.value;
  if(region && REGIONS[region]){
    REGIONS[region].forEach(d => districtEl.add(new Option(d,d)));
  }
  // re-render after changing filter
  renderAdsList();
}

/* ===========================
   Render profile header
   IDs in HTML: profileName, profilePhone, profileRatingBig, profileRatingCount, editProfileBtn
   =========================== */
function renderProfileHeader(profileUser){
  const nameEl = $id('profileName'), phoneEl = $id('profilePhone'), bigEl = $id('profileRatingBig'), countEl = $id('profileRatingCount');
  if(nameEl) nameEl.textContent = profileUser.name || 'Foydalanuvchi';
  if(phoneEl) phoneEl.textContent = profileUser.phone || '—';
  if(bigEl){
    const ratings = getRatingsForProfile(profileUser.id || profileUser.phone);
    const avg = computeAverage(ratings);
    bigEl.textContent = avg > 0 ? `${avg} / 5` : '—';
  }
  if(countEl){
    const ratings = getRatingsForProfile(profileUser.id || profileUser.phone);
    countEl.textContent = ratings.length ? `${ratings.length} ta baho` : 'Hozircha baholar yo‘q';
  }
  // show/hide edit button if current user
  const editBtn = $id('editProfileBtn');
  const cu = getCurrentUser();
  if(editBtn){
    if(cu && (String(cu.id) === String(profileUser.id) || String(cu.phone) === String(profileUser.phone))) editBtn.style.display = 'inline-block';
    else editBtn.style.display = 'none';
  }
}

/* ===========================
   Render ads list (main)
   IDs: myAds, searchAdInput, filterType, filterStatus, filterFromRegion, filterFromDistrict, filterToRegion, filterToDistrict
   =========================== */
function renderAdsList(){
  normalizeOldAds();

  const cu = getCurrentUser();
  const viewingProfile = window.viewingProfile || (cu ? (cu.id || cu.phone) : null);

  const q = ($id('searchAdInput') ? ($id('searchAdInput').value||'').toLowerCase().trim() : '');
  const typeFilter = $id('filterType') ? $id('filterType').value : 'all';
  const statusFilter = $id('filterStatus') ? $id('filterStatus').value : 'all';
  const fFromRegion = $id('filterFromRegion') ? $id('filterFromRegion').value : '';
  const fFromDistrict = $id('filterFromDistrict') ? $id('filterFromDistrict').value : '';
  const fToRegion = $id('filterToRegion') ? $id('filterToRegion').value : '';
  const fToDistrict = $id('filterToDistrict') ? $id('filterToDistrict').value : '';

  const driver = getJSON('driverAds') || [];
  const passenger = getJSON('passengerAds') || [];
  let all = [...driver.map(a=>({...a, type:'driver'})), ...passenger.map(a=>({...a, type:'passenger'}))];

  // show only viewingProfile or currentUser's ads
  if(viewingProfile){
    all = all.filter(a => String(a.ownerId || a.phone) === String(viewingProfile) || String(a.phone) === String(viewingProfile));
  } else {
    const cu2 = getCurrentUser();
    if(cu2) all = all.filter(a => String(a.phone) === String(cu2.phone) || String(a.ownerId) === String(cu2.id));
  }

  if(typeFilter && typeFilter !== 'all') all = all.filter(a => a.type === typeFilter);
  if(statusFilter && statusFilter !== 'all') all = all.filter(a => (String(a.status||'pending') === String(statusFilter)));
  if(fFromRegion) all = all.filter(a => (a.fromRegion || '').includes(fFromRegion));
  if(fFromDistrict) all = all.filter(a => (a.fromDistrict || '').includes(fFromDistrict));
  if(fToRegion) all = all.filter(a => (a.toRegion || '').includes(fToRegion));
  if(fToDistrict) all = all.filter(a => (a.toDistrict || '').includes(fToDistrict));
  if(q) all = all.filter(a => (String(a.phone||'')+String(a.id||'')+String(a.comment||'')+String(a.fromRegion||'')+String(a.toRegion||'')).toLowerCase().includes(q));

  // sort by createdAt desc
  all.sort((a,b)=> {
    const da = parseAdDate(a.createdAt) || new Date(0);
    const db = parseAdDate(b.createdAt) || new Date(0);
    return db - da;
  });

  const container = $id('myAds');
  if(!container) return;
  container.innerHTML = '';

  if(all.length === 0){
    container.innerHTML = '<p>Hozircha e’lonlar yo‘q.</p>';
    return;
  }

  all.forEach(ad => {
    const div = document.createElement('div');
    div.className = 'ad-box ' + ((ad.status && ad.status.toLowerCase()) || 'pending');

    // status background classes are defined in CSS in your HTML: .ad-box.pending, .approved, .rejected
    const from = (ad.fromRegion ? ad.fromRegion + ' ' : '') + (ad.fromDistrict ? ad.fromDistrict : '');
    const to = (ad.toRegion ? ad.toRegion + ' ' : '') + (ad.toDistrict ? ad.toDistrict : '');
    const created = ad.createdAt ? (parseAdDate(ad.createdAt) ? parseAdDate(ad.createdAt).toLocaleString() : ad.createdAt) : '—';
    const statusText = (String(ad.status).toLowerCase() === 'approved') ? '✅ Tasdiqlangan' : (String(ad.status).toLowerCase() === 'rejected' ? '❌ Rad etilgan' : '⏳ Kutilmoqda');
    const ownerId = ad.ownerId || ad.phone;

    // create actions
    const cu2 = getCurrentUser();
    const isOwner = cu2 && (String(cu2.phone) === String(ad.phone) || String(cu2.id) === String(ad.ownerId));
    let actionsHTML = '';

    if(isOwner){
      if(String(ad.status).toLowerCase() !== 'approved'){
        actionsHTML += `<button onclick="startInlineEdit('${escapeHtml(ad.type)}','${escapeHtml(ad.id)}')">Inline tahrir</button>`;
        actionsHTML += `<button onclick="editAd('${escapeHtml(ad.id)}','${escapeHtml(ad.type)}')">✏️ Tahrirlash</button>`;
      } else {
        actionsHTML += `<button disabled style="background:#ccc;cursor:not-allowed;">✏️ Tahrirlash</button>`;
      }
      actionsHTML += `<button onclick="deleteAd('${escapeHtml(ad.id)}','${escapeHtml(ad.type)}')">🗑️ O'chirish</button>`;
    } else {
      actionsHTML += `<button class="view-profile-btn" onclick="openViewProfile('${escapeHtml(ownerId)}')">🔎 Profilni ko'rish</button>`;
      actionsHTML += `<button onclick="contactOwner('${escapeHtml(ad.phone || '')}')">📞 Telefon</button>`;
    }

    const commentHTML = ad.comment ? `<div class="comment-box"><b>Izoh:</b> ${escapeHtml(ad.comment)}</div>` : '';

    div.innerHTML = `
      <div><b>Yo'nalish:</b> ${escapeHtml(from)} → ${escapeHtml(to)}</div>
      <div><b>Narx:</b> ${escapeHtml(ad.price || 'Ko‘rsatilmagan')} so'm</div>
      <div><b>Telefon:</b> ${escapeHtml(ad.phone || 'Noma\\'lum')}</div>
      <div class="date-info">🕒 Joylangan: ${escapeHtml(created)} · Holat: ${escapeHtml(statusText)}</div>
      ${commentHTML}
      <div class="ad-actions">${actionsHTML}</div>
    `;
    container.appendChild(div);
  });
}

/* ===========================
   Render with inline edit state
   uses localStorage.tempInlineEdit = { type, id }
   =========================== */
function renderAdsListWithInline(){
  normalizeOldAds();
  const temp = (function(){ try { return JSON.parse(localStorage.getItem('tempInlineEdit')||'null'); } catch(e){ return null; } })();
  const cu = getCurrentUser();
  const viewingProfile = window.viewingProfile || (cu ? (cu.id || cu.phone) : null);

  const driver = getJSON('driverAds') || [];
  const passenger = getJSON('passengerAds') || [];
  let all = [...driver.map(a=>({...a,type:'driver'})), ...passenger.map(a=>({...a,type:'passenger'}))];

  if(viewingProfile){
    all = all.filter(a => String(a.ownerId || a.phone) === String(viewingProfile) || String(a.phone) === String(viewingProfile));
  } else {
    const cu2 = getCurrentUser();
    if(cu2) all = all.filter(a => String(a.phone) === String(cu2.phone) || String(a.ownerId) === String(cu2.id));
  }

  // sort by createdAt desc
  all.sort((a,b)=> {
    const da = parseAdDate(a.createdAt) || new Date(0);
    const db = parseAdDate(b.createdAt) || new Date(0);
    return db - da;
  });

  const container = $id('myAds');
  if(!container) return;
  container.innerHTML = '';
  if(all.length === 0){ container.innerHTML = '<p>Hozircha e’lonlar yo‘q.</p>'; return; }

  all.forEach(ad => {
    const div = document.createElement('div');
    div.className = 'ad-box ' + ((ad.status && ad.status.toLowerCase()) || 'pending');

    const from = (ad.fromRegion ? ad.fromRegion + ' ' : '') + (ad.fromDistrict ? ad.fromDistrict : '');
    const to = (ad.toRegion ? ad.toRegion + ' ' : '') + (ad.toDistrict ? ad.toDistrict : '');
    const created = ad.createdAt ? (parseAdDate(ad.createdAt) ? parseAdDate(ad.createdAt).toLocaleString() : ad.createdAt) : '—';
    const cu2 = getCurrentUser();
    const isOwner = cu2 && (String(cu2.phone) === String(ad.phone) || String(cu2.id) === String(ad.ownerId));
    let actionsHTML = '';

    if(isOwner && temp && String(temp.type) === String(ad.type) && String(temp.id) === String(ad.id)){
      // show inline form
      const idSafe = ad.id.replace(/[^a-zA-Z0-9_\-]/g,'_');
      actionsHTML = `
        <div class="inline-edit">
          <input id="inlinePrice_${idSafe}" type="number" placeholder="Narx" value="${escapeHtml(ad.price || '')}" />
          <button onclick="saveInlineAdmin('${escapeHtml(ad.type)}','${escapeHtml(ad.id)}')">💾 Saqlash</button>
          <button onclick="cancelInlineAdmin()">❌ Bekor</button>
        </div>
      `;
    } else {
      if(isOwner){
        actionsHTML += `<button onclick="startInlineEdit('${escapeHtml(ad.type)}','${escapeHtml(ad.id)}')">Inline tahrir</button>`;
        actionsHTML += `<button onclick="editAd('${escapeHtml(ad.id)}','${escapeHtml(ad.type)}')">✏️ Tahrirlash</button>`;
        actionsHTML += `<button onclick="deleteAd('${escapeHtml(ad.id)}','${escapeHtml(ad.type)}')">🗑️ O'chirish</button>`;
      } else {
        actionsHTML += `<button class="view-profile-btn" onclick="openViewProfile('${escapeHtml(ad.ownerId || ad.phone)}')">🔎 Profilni ko'rish</button>`;
        actionsHTML += `<button onclick="contactOwner('${escapeHtml(ad.phone || '')}')">📞 Telefon</button>`;
      }
    }

    div.innerHTML = `
      <div><b>Yo'nalish:</b> ${escapeHtml(from)} → ${escapeHtml(to)}</div>
      <div><b>Narx:</b> ${escapeHtml(ad.price || 'Ko‘rsatilmagan')} so'm</div>
      <div><b>Telefon:</b> ${escapeHtml(ad.phone || 'Noma\\'lum')}</div>
      <div class="date-info">🕒 Joylangan: ${escapeHtml(created)} · Holat: ${escapeHtml(ad.status || 'Kutilmoqda')}</div>
      <div class="ad-actions">${actionsHTML}</div>
    `;
    container.appendChild(div);
  });
}

/* ===========================
   Inline edit actions
   saveInlineAdmin, cancelInlineAdmin, startInlineEdit
   =========================== */
function startInlineEdit(type,id){
  // store temp state and re-render with inline inputs
  try {
    const temp = { type: decodeURIComponent(type), id: decodeURIComponent(id) };
    localStorage.setItem('tempInlineEdit', JSON.stringify(temp));
  } catch(e){
    // fallback: store raw
    localStorage.setItem('tempInlineEdit', JSON.stringify({ type, id }));
  }
  renderAdsListWithInline();
}

function saveInlineAdmin(type,id){
  // type and id may be encoded
  try {
    type = decodeURIComponent(type);
    id = decodeURIComponent(id);
  } catch(e){}
  const key = (String(type) === 'driver') ? 'driverAds' : 'passengerAds';
  const arr = getJSON(key) || [];
  const adIdx = arr.findIndex(a => String(a.id) === String(id));
  if(adIdx === -1){ alert('E\\'lon topilmadi'); return; }
  const safeId = arr[adIdx].id.replace(/[^a-zA-Z0-9_\-]/g,'_');
  const input = document.getElementById(`inlinePrice_${safeId}`);
  if(!input){ alert('Narx input topilmadi'); return; }
  const val = input.value.trim();
  if(!val){ alert('Narx kiriting'); return; }
  arr[adIdx].price = val;
  arr[adIdx].edited = true;
  setJSON(key, arr);
  localStorage.removeItem('tempInlineEdit');
  renderAdsList();
  alert('E\\'lon yangilandi (inline).');
}

function cancelInlineAdmin(){
  localStorage.removeItem('tempInlineEdit');
  renderAdsList();
}

/* ===========================
   Edit ad (prompt simple)
   =========================== */
function editAd(id,type){
  try { id = decodeURIComponent(id); type = decodeURIComponent(type); } catch(e){}
  const key = (String(type) === 'driver') ? 'driverAds' : 'passengerAds';
  const arr = getJSON(key) || [];
  const idx = arr.findIndex(a => String(a.id) === String(id));
  if(idx === -1) return;
  const ad = arr[idx];
  if(ad.edited){ alert('❗ Ushbu e\\'lon avval tahrirlangan.'); return; }
  const newPrice = prompt('Yangi narxni kiriting:', ad.price || '');
  if(newPrice === null) return;
  ad.price = newPrice.trim();
  ad.edited = true;
  setJSON(key, arr);
  renderAdsList();
  alert('✏️ E\\'lon yangilandi.');
}

/* ===========================
   Delete ad
   =========================== */
function deleteAd(id,type){
  try { id = decodeURIComponent(id); type = decodeURIComponent(type); } catch(e){}
  if(!confirm('Haqiqatan o\\'chirilsinmi?')) return;
  const key = (String(type) === 'driver') ? 'driverAds' : 'passengerAds';
  let arr = getJSON(key) || [];
  arr = arr.filter(a => String(a.id) !== String(id));
  setJSON(key, arr);
  renderAdsList();
}

/* ===========================
   Contact owner (simple)
   =========================== */
function contactOwner(phone){
  if(!phone){ alert('Telefon raqam mavjud emas'); return; }
  // simply show alert with phone; in mobile, `tel:` could be used
  alert(`Telefon: ${phone} — nusxa oling yoki qo'ng'iroq qiling`);
}

/* ===========================
   Add Ad (modern form)
   HTML IDs used: adType, fromRegion, fromDistrict, toRegion, toDistrict, price, adComment, addForm (or addForm submission)
   =========================== */
function addAd(){
  const cu = getCurrentUser();
  if(!cu){ alert('Avval tizimga kiring!'); return; }
  const type = ($id('adType') ? $id('adType').value : '') || 'passenger';
  const fromRegion = $id('fromRegion') ? $id('fromRegion').value.trim() : '';
  const fromDistrict = $id('fromDistrict') ? $id('fromDistrict').value.trim() : '';
  const toRegion = $id('toRegion') ? $id('toRegion').value.trim() : '';
  const toDistrict = $id('toDistrict') ? $id('toDistrict').value.trim() : '';
  const price = $id('price') ? $id('price').value.trim() : '';
  const comment = $id('adComment') ? $id('adComment').value.trim() : '';

  if(!type || !fromRegion || !toRegion){
    alert('Iltimos yo‘nalish ma\'lumotlarini to‘ldiring!');
    return;
  }

  if(price && isNaN(Number(price))){ alert('Iltimos to\'g\'ri narx kiriting'); return; }

  const key = (type === 'driver') ? 'driverAds' : 'passengerAds';
  const ads = getJSON(key) || [];
  const id = `${type}_${Date.now()}_${Math.floor(Math.random()*1000)}`;
  const newAd = {
    id,
    phone: cu.phone,
    ownerId: cu.id || cu.phone,
    ownerName: cu.name || '',
    type,
    fromRegion, fromDistrict, toRegion, toDistrict,
    price: price || '',
    comment: comment || '',
    status: 'pending',
    createdAt: new Date().toLocaleString()
  };
  ads.push(newAd);
  setJSON(key, ads);
  renderAdsList();
  alert('✅ Eʼlon joylandi (Admin tasdiqlashi kutilmoqda).');
  clearAddForm();
}

/* ===========================
   Legacy add form (viloyat/shahar/yonalish/sana/vaqt/telefon)
   IDs in legacy form: viloyat, shahar, yonalish, sana, vaqt, telefon, adForm (optional)
   =========================== */
function addAdLegacyFromViloyatForm(ev){
  if(ev && ev.preventDefault) ev.preventDefault();
  const cu = getCurrentUser();
  if(!cu){ alert('Avval tizimga kiring!'); return; }
  const vil = $id('viloyat') ? $id('viloyat').value.trim() : '';
  const sh = $id('shahar') ? $id('shahar').value.trim() : '';
  const yon = $id('yonalish') ? $id('yonalish').value.trim() : '';
  const sana = $id('sana') ? $id('sana').value.trim() : '';
  const vaqt = $id('vaqt') ? $id('vaqt').value.trim() : '';
  const tel = $id('telefon') ? $id('telefon').value.trim() : (cu.phone || '');

  if(!vil || !sh || !yon || !sana || !vaqt || !tel){ alert('Iltimos barcha maydonlarni to\'ldiring!'); return; }

  const key = 'passengerAds';
  const ads = getJSON(key) || [];
  const id = `legacy_${Date.now()}`;
  const newAd = {
    id,
    phone: tel,
    ownerId: cu.id || cu.phone,
    ownerName: cu.name || '',
    type: 'passenger',
    fromRegion: vil,
    fromDistrict: sh,
    toRegion: yon,
    toDistrict: '',
    price: '',
    comment: '',
    status: 'pending',
    createdAt: `${sana} ${vaqt}`
  };
  ads.push(newAd);
  setJSON(key, ads);
  renderAdsList();
  alert('E\'lon joylandi (legacy form)');
  const adForm = $id('adForm');
  if(adForm) adForm.reset();
}

/* ===========================
   Clear add form
   =========================== */
function clearAddForm(){
  if($id('adType')) $id('adType').value = '';
  if($id('fromRegion')) $id('fromRegion').value = '';
  if($id('fromDistrict')) $id('fromDistrict').innerHTML = '<option value="">Tumanni tanlang</option>';
  if($id('toRegion')) $id('toRegion').value = '';
  if($id('toDistrict')) $id('toDistrict').innerHTML = '<option value="">Tumanni tanlang</option>';
  if($id('price')) $id('price').value = '';
  if($id('adComment')) $id('adComment').value = '';
}

/* ===========================
   View profile modal & rating submission
   IDs expected: viewProfileModal, vpName, vpPhone, vpRatingSummary, vpAdsList, vpRateSection
   =========================== */
function openViewProfile(idOrPhone){
  const users = getJSON('users') || [];
  let user = users.find(u => String(u.id) === String(idOrPhone) || String(u.phone) === String(idOrPhone));
  if(!user){
    const ads = [...getJSON('driverAds'), ...getJSON('passengerAds')];
    const ad = ads.find(a => String(a.ownerId) === String(idOrPhone) || String(a.phone) === String(idOrPhone));
    if(ad) user = { id: ad.ownerId || ad.phone, phone: ad.phone, name: ad.ownerName || ad.phone };
  }
  if(!user){ alert('Foydalanuvchi topilmadi'); return; }
  window.viewingProfile = user.id || user.phone;

  const vpName = $id('vpName'), vpPhone = $id('vpPhone'), vpRatingSummary = $id('vpRatingSummary'), vpAdsList = $id('vpAdsList'), vpRateSection = $id('vpRateSection');
  if(vpName) vpName.textContent = user.name || 'Foydalanuvchi';
  if(vpPhone) vpPhone.textContent = user.phone || '—';

  const ratings = getRatingsForProfile(user.id || user.phone);
  const avg = computeAverage(ratings);
  if(vpRatingSummary) vpRatingSummary.innerHTML = `<strong>${avg>0 ? avg+' / 5' : 'Hozircha baho yo‘q'}</strong> — ${ratings.length} ta baho`;

  // user's ads
  const vpAds = [...getJSON('driverAds'), ...getJSON('passengerAds')].filter(a => String(a.ownerId) === String(user.id) || String(a.phone) === String(user.phone));
  if(vpAdsList){
    if(vpAds.length === 0) vpAdsList.innerHTML = '<p class="small">Ushbu foydalanuvchining e\\'lonlari mavjud emas.</p>';
    else {
      vpAdsList.innerHTML = vpAds.map(a=>{
        const created = a.createdAt ? (parseAdDate(a.createdAt) ? parseAdDate(a.createdAt).toLocaleString() : a.createdAt) : '';
        return `<div style="padding:6px;border-bottom:1px solid #eee;"><b>${a.type === 'driver'? 'Haydovchi' : 'Yo\\'lovchi'}</b> · ${escapeHtml(a.fromRegion||'')} → ${escapeHtml(a.toRegion||'')} · ${escapeHtml(a.price||'')} so'm<br><small class="small">${escapeHtml(created)}</small></div>`;
      }).join('');
    }
  }

  // rating input area
  if(vpRateSection){
    vpRateSection.innerHTML = '';
    const cur = getCurrentUser();
    if(!cur) vpRateSection.innerHTML = '<div class="small">Baholash uchun avval tizimga kiring.</div>';
    else if(String(cur.id) === String(user.id) || String(cur.phone) === String(user.phone)) vpRateSection.innerHTML = '<div class="small">Siz o\\'zingizni baholay olmaysiz.</div>';
    else {
      const store = getProfileRatingsStore();
      const existing = (store.find(e=>String(e.phone) === String(user.id)) || {ratings:[]}).ratings || [];
      const already = existing.some(r => String(r.raterPhone) === String(cur.phone));
      if(already) vpRateSection.innerHTML = '<div class="small">Siz allaqachon bu foydalanuvchini baholagansiz.</div>';
      else {
        vpRateSection.innerHTML = `
          <div style="margin-top:8px;">
            <label><b>⭐ Baho tanlang</b></label>
            <div style="margin-top:6px;">
              <select id="vpRatingStars">
                <option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option>
              </select>
            </div>
            <div style="margin-top:6px;"><textarea id="vpRatingText" rows="2" placeholder="Ixtiyoriy izoh..."></textarea></div>
            <div style="margin-top:8px;text-align:right;"><button id="vpSubmitRatingBtn">Yuborish</button></div>
          </div>
        `;
        setTimeout(()=> {
          const btn = $id('vpSubmitRatingBtn');
          if(btn) btn.addEventListener('click', ()=> submitProfileRating(user.id || user.phone));
        }, 50);
      }
    }
  }

  const modal = $id('viewProfileModal');
  if(modal) modal.style.display = 'flex';
}

function closeViewProfile(){
  const modal = $id('viewProfileModal');
  if(modal) modal.style.display = 'none';
}

/* ===========================
   Submit profile rating
   =========================== */
function submitProfileRating(profileId){
  const cur = getCurrentUser();
  if(!cur){ alert('Baholash uchun tizimga kiring!'); return; }
  const starsEl = $id('vpRatingStars'), textEl = $id('vpRatingText');
  const stars = starsEl ? Number(starsEl.value) : 5;
  const text = textEl ? textEl.value.trim() : '';
  const existing = getRatingsForProfile(profileId);
  if(existing.some(r=> String(r.raterPhone) === String(cur.phone))) { alert('Siz allaqachon baho berdingiz'); return; }
  const r = { raterPhone: cur.phone, stars, text, date: new Date().toLocaleString() };
  addRatingForProfile(profileId, r);
  alert('✅ Baho saqlandi!');
  if(window.viewingProfile) openViewProfile(window.viewingProfile);
  renderProfileHeader({ id: profileId, phone: profileId, name: '' });
}

/* ===========================
   Profile edit modal
   IDs: editProfileModal, editFullName, editPhoneInput
   =========================== */
function openEditProfile(){
  const cu = getCurrentUser();
  if(!cu){ alert('Tizimga kiring!'); return; }
  if($id('editFullName')) $id('editFullName').value = cu.name || '';
  if($id('editPhoneInput')) $id('editPhoneInput').value = cu.phone || '';
  const modal = $id('editProfileModal');
  if(modal) modal.style.display = 'flex';
}
function closeEditProfile(){
  const modal = $id('editProfileModal');
  if(modal) modal.style.display = 'none';
}
function saveProfileEdit(){
  const name = $id('editFullName') ? $id('editFullName').value.trim() : '';
  const phone = $id('editPhoneInput') ? $id('editPhoneInput').value.trim() : '';
  if(!phone){ alert('Telefon raqam kiriting'); return; }
  let users = getJSON('users') || [];
  const cur = getCurrentUser();
  if(cur){
    cur.name = name; cur.phone = phone;
    localStorage.setItem('currentUser', JSON.stringify(cur));
    let idx = users.findIndex(u => String(u.id) === String(cur.id) || String(u.phone) === String(cur.phone));
    if(idx > -1){
      users[idx].name = name; users[idx].phone = phone;
    } else {
      const newid = cur.id || `u_${Date.now()}`;
      users.push({ id:newid, phone, name, active:true });
      cur.id = newid;
      localStorage.setItem('currentUser', JSON.stringify(cur));
    }
    setJSON('users', users);
    alert('Profil saqlandi');
    renderProfileHeader(cur);
    renderAdsList();
  } else {
    alert('Foydalanuvchi topilmadi');
  }
  closeEditProfile();
}

/* ===========================
   View own ads convenience
   =========================== */
function viewOwnAds(){
  const cu = getCurrentUser();
  if(!cu) return;
  window.viewingProfile = cu.id || cu.phone;
  renderAdsList();
}

/* ===========================
   Sync statuses: notify user when admin changes ad status
   stores last statuses in userAdStatuses key
   =========================== */
function syncStatuses(){
  const cu = getCurrentUser();
  if(!cu) return;
  const driver = getJSON('driverAds') || [];
  const passenger = getJSON('passengerAds') || [];
  const userAds = [...driver, ...passenger].filter(a => String(a.ownerId) === String(cu.id) || String(a.phone) === String(cu.phone));
  const last = JSON.parse(localStorage.getItem('userAdStatuses') || '{}');
  userAds.forEach(ad=>{
    const prev = last[ad.id];
    if(prev && prev !== ad.status){
      if(String(ad.status).toLowerCase() === 'approved') alert(`✅ E'loningiz tasdiqlandi: ${ad.fromRegion || ad.from} → ${ad.toRegion || ad.to}`);
      else if(String(ad.status).toLowerCase() === 'rejected') alert(`❌ E'loningiz rad etildi: ${ad.fromRegion || ad.from} → ${ad.toRegion || ad.to}`);
    }
    last[ad.id] = ad.status;
  });
  localStorage.setItem('userAdStatuses', JSON.stringify(last));
}

/* ===========================
   Logout
   =========================== */
function logout(){
  localStorage.removeItem('currentUser');
  alert('Chiqdingiz.');
  location.reload();
}

/* ===========================
   Demo helper: loginMock()
   Creates users & sample ads if none exist (for local testing)
   =========================== */
function loginMock(){
  let users = getJSON('users');
  if(!users || users.length === 0){
    users = [
      { id: 'u1', phone: '998901112233', name: 'Ali', active: true },
      { id: 'u2', phone: '998909998877', name: 'Vali', active: false },
      { id: 'u3', phone: '998971234567', name: 'Dilor', active: false }
    ];
    setJSON('users', users);
  }
  const currentUser = users[0];
  localStorage.setItem('currentUser', JSON.stringify(currentUser));

  // sample ads if empty
  if((getJSON('driverAds')||[]).length === 0 && (getJSON('passengerAds')||[]).length === 0){
    const now = new Date();
    const driverAds = [
      { id: 'driver_1', phone: users[0].phone, ownerId: users[0].id, ownerName: users[0].name, type:'driver', fromRegion:'Toshkent', fromDistrict:'Chilonzor', toRegion:'Samarqand', toDistrict:'Ishtixon', price:'25000', comment:'Haydovchi 24/7', status:'approved', createdAt: new Date(now.getTime()-86400000*2).toLocaleString() },
      { id: 'driver_2', phone: users[1].phone, ownerId: users[1].id, ownerName: users[1].name, type:'driver', fromRegion:'Toshkent', fromDistrict:'Mirzo Ulug\'bek', toRegion:'Namangan', toDistrict:'Pop', price:'80000', comment:'Katta yukga bo\'sh joy', status:'pending', createdAt: new Date(now.getTime()-86400000*10).toLocaleString() }
    ];
    const passengerAds = [
      { id: 'pass_1', phone: users[2].phone, ownerId: users[2].id, ownerName: users[2].name, type:'passenger', fromRegion:'Samarqand', fromDistrict:'Urgut', toRegion:'Toshkent', toDistrict:'Bektemir', price:'30000', comment:'Iltimos tez', status:'rejected', createdAt: new Date(now.getTime()-86400000*1).toLocaleString() },
      { id: 'pass_2', phone: users[0].phone, ownerId: users[0].id, ownerName: users[0].name, type:'passenger', fromRegion:'Namangan', fromDistrict:'To\'raqo\'rg\'on', toRegion:'Farg\'ona', toDistrict:'Qo\'qon', price:'20000', comment:'Yuk ham olaman', status:'pending', createdAt: new Date(now.getTime()-86400000*4).toLocaleString() }
    ];
    setJSON('driverAds', driverAds);
    setJSON('passengerAds', passengerAds);
  }
  if(!localStorage.getItem('profileRatings')) setJSON('profileRatings', []);
  if(!localStorage.getItem('userAdStatuses')) localStorage.setItem('userAdStatuses', JSON.stringify({}));
  alert('Demo yaratildi: currentUser set. console: _shahartaxi.loginMock() mavjud.');
  renderAll();
}

/* ===========================
   Expose debug API
   =========================== */
window._shahartaxi = window._shahartaxi || {};
Object.assign(window._shahartaxi, {
  getDriverAds: ()=> getJSON('driverAds'),
  getPassengerAds: ()=> getJSON('passengerAds'),
  getUsers: ()=> getJSON('users'),
  getRatings: ()=> getProfileRatingsStore(),
  loginMock,
  renderAdsList,
  renderAdsListWithInline,
  renderAll,
  addAd,
  addAdLegacyFromViloyatForm: addAdLegacyFromViloyatForm,
  editAd,
  deleteAd,
  startInlineEdit,
  saveInlineAdmin,
  cancelInlineAdmin,
  openViewProfile,
  closeViewProfile,
  logout
});

/* ===========================
   Initialization on DOMContentLoaded
   - binds UI events (buttons, forms)
   - loads regions into selects
   - populates profile header and ads
   - sets periodic syncStatuses
   =========================== */
document.addEventListener('DOMContentLoaded', ()=>{
  // Load regions into selects
  loadRegionsToSelects();

  // Ensure normalized old ads
  normalizeOldAds();

  // Auto-map activeUserId to currentUser if present
  const activeId = localStorage.getItem('activeUserId');
  if(!localStorage.getItem('currentUser') && activeId){
    const users = getJSON('users') || [];
    const u = users.find(x => String(x.id) === String(activeId));
    if(u) localStorage.setItem('currentUser', JSON.stringify(u));
  }

  // Render header & list using currentUser if present
  const cu = getCurrentUser();
  if(cu){
    renderProfileHeader(cu);
    // auto-fill phone in forms if they exist (non-editable)
    // In your profile.html, the add form doesn't have phone field; we still ensure any 'telefon' field in legacy is filled and readonly
    const phoneDisplay = $id('profilePhone');
    if(phoneDisplay) phoneDisplay.textContent = cu.phone || '—';

    const telefonField = $id('telefon');
    if(telefonField){
      telefonField.value = cu.phone || '';
      telefonField.setAttribute('readonly','readonly');
    }
  } else {
    // if no currentUser, leave header blank and advise to login or run loginMock()
    const nameEl = $id('profileName'); if(nameEl) nameEl.textContent = 'Tizimga kiring';
    const phoneEl = $id('profilePhone'); if(phoneEl) phoneEl.textContent = '—';
  }

  // Bind add buttons/forms
  const addForm = $id('addForm'); // modern form id in your HTML
  if(addForm) {
    // The HTML in your profile.html had <form id="addForm" class="add-form"> — bind to its submit
    addForm.addEventListener('submit', (ev)=>{
      ev.preventDefault();
      // Use addAd() which uses currentUser.phone
      addAd();
    });
  } else {
    // fallback: if there's a button with onclick addAd(), also allow that
    const addAdBtn = $id('addAdBtn');
    if(addAdBtn){
      addAdBtn.addEventListener('click', ()=>{
        const addFormEl = $id('addForm');
        if(addFormEl) addFormEl.style.display = (addFormEl.style.display === 'block') ? 'none' : 'block';
      });
    }
  }

  // Bind legacy form if present (id "adForm" or similar)
  const legacyForm = $id('adForm');
  if(legacyForm) legacyForm.addEventListener('submit', addAdLegacyFromViloyatForm);

  // Bind edit profile modal save (HTML buttons may call saveProfileEdit via onclick, but we add safety)
  const saveProfileBtn = $id('saveProfileBtn');
  if(saveProfileBtn) saveProfileBtn.addEventListener('click', saveProfileEdit);

  // Bind editProfileBtn open
  const editProfileBtn = $id('editProfileBtn');
  if(editProfileBtn) editProfileBtn.addEventListener('click', openEditProfile);

  // Bind logout if exists
  const logoutBtn = $id('logoutBtn');
  if(logoutBtn) logoutBtn.addEventListener('click', logout);

  // Attach search/filter change handlers to re-render
  const searchEl = $id('searchAdInput');
  if(searchEl) searchEl.addEventListener('input', renderAdsList);

  ['filterType','filterStatus','filterFromRegion','filterFromDistrict','filterToRegion','filterToDistrict'].forEach(id=>{
    const el = $id(id);
    if(el) el.addEventListener('change', renderAdsList);
  });

  // Click outside modal to close (generic)
  document.querySelectorAll('.modal').forEach(m=>{
    m.addEventListener('click', e=>{
      if(e.target === m) m.style.display = 'none';
    });
  });

  // Initial render
  renderAdsList();

  // Periodic sync statuses
  setInterval(syncStatuses, 5000);
});

/* ===========================
   End of profile.js
   =========================== */
