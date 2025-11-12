/*
  To'liq ishlaydigan profile.js (ShaharTaxi)
  - Saqlovchi kalitlar: driverAds, passengerAds, currentUser, users, userNotifications, profileRatings
  - View other user's profile: "Profilni ko'rish" (har bir e'lon qatori uchun qo'shing)
  - Rating: faqat boshqa foydalanuvchilar baholaydi; takroriy baho qoldirib bo'lmaydi
  - Regions: ichida objects (agar sizning regions.js bo'lsa uni o'zgartirish shart emas)
*/

/* ---------- REGIONS DATA ---------- */
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

/* ---------- Helpers: storage wrappers ---------- */
function getJSON(key){ try{ return JSON.parse(localStorage.getItem(key)) || []; } catch(e){ return []; } }
function setJSON(key,val){ localStorage.setItem(key, JSON.stringify(val)); }

/* ---------- Current user detection ---------- */
function getCurrentUser(){
  const cu = JSON.parse(localStorage.getItem('currentUser') || 'null');
  if(cu && cu.phone) return cu;
  const users = getJSON('users') || [];
  const active = users.find(u=>u.active) || null;
  if(active) return active;
  return null;
}

/* Test helper: create a mock login user and sample ads if none exist */
function loginMock(){
  let users = getJSON('users');
  if(users.length === 0){
    users = [
      { id: 'u1', phone: '998901112233', name: 'Ali', active: true },
      { id: 'u2', phone: '998909998877', name: 'Vali', active: false },
      { id: 'u3', phone: '998971234567', name: 'Dilor', active: false }
    ];
    setJSON('users', users);
  }
  const currentUser = users[0];
  localStorage.setItem('currentUser', JSON.stringify(currentUser));

  if(getJSON('driverAds').length === 0 && getJSON('passengerAds').length === 0){
    const now = new Date();
    const driverAds = [
      { id: 'driver_1', phone: users[0].phone, ownerId: users[0].id, type:'driver', fromRegion:'Toshkent', fromDistrict:'Chilonzor', toRegion:'Samarqand', toDistrict:'Ishtixon', price:'25000', comment:'Haydovchi 24/7', status:'approved', createdAt: new Date(now.getTime()-86400000*2).toLocaleString() },
      { id: 'driver_2', phone: users[1].phone, ownerId: users[1].id, type:'driver', fromRegion:'Toshkent', fromDistrict:'Mirzo Ulug\'bek', toRegion:'Namangan', toDistrict:'Pop', price:'80000', comment:'Katta yukga bo\'sh joy', status:'pending', createdAt: new Date(now.getTime()-86400000*10).toLocaleString() }
    ];
    const passengerAds = [
      { id: 'pass_1', phone: users[2].phone, ownerId: users[2].id, type:'passenger', fromRegion:'Samarqand', fromDistrict:'Urgut', toRegion:'Toshkent', toDistrict:'Bektemir', price:'30000', comment:'Iltimos tez', status:'rejected', createdAt: new Date(now.getTime()-86400000*1).toLocaleString() },
      { id: 'pass_2', phone: users[0].phone, ownerId: users[0].id, type:'passenger', fromRegion:'Namangan', fromDistrict:'To\'raqo\'rg\'on', toRegion:'Farg\'ona', toDistrict:'Qo\'qon', price:'20000', comment:'Yuk ham olaman', status:'pending', createdAt: new Date(now.getTime()-86400000*4).toLocaleString() }
    ];
    setJSON('driverAds', driverAds);
    setJSON('passengerAds', passengerAds);
  }
}

/* ---------- Utility: parse date safely ---------- */
function parseAdDate(dateStr){
  if(!dateStr) return null;
  const d = new Date(dateStr);
  if(!isNaN(d)) return d;
  const m = String(dateStr).match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if(m){
    const [_,day,mon,yr,h,mn] = m;
    return new Date(+yr, +mon-1, +day, +(h||0), +(mn||0));
  }
  return null;
}

/* ---------- Ensure comments & ownerId exist on old ads ---------- */
function normalizeOldAds(){
  ['driverAds','passengerAds'].forEach(key=>{
    const ads = getJSON(key);
    let changed=false;
    ads.forEach(a=>{
      if(!('comment' in a)){ a.comment = ''; changed=true; }
      if(!a.ownerId && a.phone){
        const users = getJSON('users') || [];
        const u = users.find(x=>String(x.phone)===String(a.phone));
        if(u){ a.ownerId = u.id; changed=true; }
      }
      if(!a.createdAt){
        a.createdAt = new Date().toLocaleString();
        changed=true;
      }
    });
    if(changed) setJSON(key, ads);
  });
}
/* ---------- RENDER PROFILE HEADER ---------- */
function renderProfileHeader(profileUser){
  document.getElementById('profileName').textContent = profileUser.name || 'Foydalanuvchi';
  document.getElementById('profilePhone').textContent = profileUser.phone || '—';

  const ratings = getRatingsForProfile(profileUser.id || profileUser.phone);
  const avg = computeAverage(ratings);
  document.getElementById('profileRatingBig').textContent = avg>0 ? `${avg} / 5` : '—';
  document.getElementById('profileRatingCount').textContent = ratings.length ? `${ratings.length} ta baho` : 'Hozircha baholar yo‘q';

  const cu = getCurrentUser();
  const editBtn = document.getElementById('editProfileBtn');
  if(cu && (String(cu.id) === String(profileUser.id) || String(cu.phone) === String(profileUser.phone))){
    editBtn.style.display = 'inline-block';
  } else {
    editBtn.style.display = 'none';
  }
}

/* ---------- RENDER ADS LIST ---------- */
function renderAdsList(){
  normalizeOldAds();
  const cu = getCurrentUser();
  const viewingProfile = window.viewingProfile || (cu? (cu.id||cu.phone) : null);

  const q = (document.getElementById('searchAdInput').value || '').toLowerCase().trim();
  const typeFilter = document.getElementById('filterType').value;
  const statusFilter = document.getElementById('filterStatus').value;
  const fFromRegion = document.getElementById('filterFromRegion').value;
  const fFromDistrict = document.getElementById('filterFromDistrict').value;
  const fToRegion = document.getElementById('filterToRegion').value;
  const fToDistrict = document.getElementById('filterToDistrict').value;

  const driver = getJSON('driverAds') || [];
  const passenger = getJSON('passengerAds') || [];
  let all = [...driver.map(a=>({...a,type:'driver'})), ...passenger.map(a=>({...a,type:'passenger'}))];

  if(viewingProfile){
    all = all.filter(a => String(a.ownerId || a.phone) === String(viewingProfile) || String(a.phone) === String(viewingProfile));
  } else {
    const cu2 = getCurrentUser();
    if(cu2) all = all.filter(a => String(a.phone) === String(cu2.phone) || String(a.ownerId) === String(cu2.id));
  }

  if(typeFilter !== 'all') all = all.filter(a => a.type === typeFilter);
  if(statusFilter !== 'all') all = all.filter(a => (a.status||'pending') === statusFilter);
  if(fFromRegion) all = all.filter(a => (a.fromRegion || '').includes(fFromRegion));
  if(fFromDistrict) all = all.filter(a => (a.fromDistrict || '').includes(fFromDistrict));
  if(fToRegion) all = all.filter(a => (a.toRegion || '').includes(fToRegion));
  if(fToDistrict) all = all.filter(a => (a.toDistrict || '').includes(fToDistrict));
  if(q) all = all.filter(a => (String(a.phone||'')+String(a.id||'')+String(a.comment||'')).toLowerCase().includes(q));

  all.sort((a,b)=>{
    const da = parseAdDate(a.createdAt) || new Date(0);
    const db = parseAdDate(b.createdAt) || new Date(0);
    return db - da;
  });

  const container = document.getElementById('myAds');
  container.innerHTML = '';
  if(all.length === 0){
    container.innerHTML = '<p>Hozircha e’lonlar yo‘q.</p>';
    return;
  }

  all.forEach(ad=>{
    const div = document.createElement('div');
    div.className = 'ad-box ' + ((ad.status && ad.status.toLowerCase()) || 'pending');

    const from = (ad.fromRegion? ad.fromRegion+' ':'') + (ad.fromDistrict? ad.fromDistrict:'');
    const to = (ad.toRegion? ad.toRegion+' ':'') + (ad.toDistrict? ad.toDistrict:'');
    const created = ad.createdAt ? (parseAdDate(ad.createdAt) ? parseAdDate(ad.createdAt).toLocaleString() : ad.createdAt) : '—';
    const statusText = ad.status === 'approved' ? '✅ Tasdiqlangan' : ad.status === 'rejected' ? '❌ Rad etilgan' : '⏳ Kutilmoqda';
    const ownerId = ad.ownerId || ad.phone;
    const cu2 = getCurrentUser();
    const isOwner = cu2 && (String(cu2.phone) === String(ad.phone) || String(cu2.id) === String(ad.ownerId));

    let actionsHTML = '';
    if(isOwner){
      if(ad.status !== 'approved'){
        actionsHTML += `<button onclick="startInlineEdit('${ad.type}','${ad.id}')">Inline tahrir</button>`;
        actionsHTML += `<button onclick="editAd('${ad.id}','${ad.type}')">✏️ Tahrirlash</button>`;
      } else {
        actionsHTML += `<button disabled style="background:#ccc;cursor:not-allowed;">✏️ Tahrirlash</button>`;
      }
      actionsHTML += `<button onclick="deleteAd('${ad.id}','${ad.type}')">🗑️ O'chirish</button>`;
    } else {
      actionsHTML += `<button class="view-profile-btn" onclick="openViewProfile('${ownerId}')">🔎 Profilni ko'rish</button>`;
      actionsHTML += `<button onclick="contactOwner('${ad.phone}')">📞 Telefon</button>`;
    }

    const commentHTML = ad.comment ? `<div class="comment-box"><b>Izoh:</b> ${escapeHtml(ad.comment)}</div>` : '';
    div.innerHTML = `
      <div><b>Yo'nalish:</b> ${escapeHtml(from)} → ${escapeHtml(to)}</div>
      <div><b>Narx:</b> ${escapeHtml(ad.price || 'Ko‘rsatilmagan')} so'm</div>
      <div><b>Telefon:</b> ${escapeHtml(ad.phone || 'Noma\'lum')}</div>
      <div class="date-info">🕒 Joylangan: ${escapeHtml(created)} · Holat: ${escapeHtml(statusText)}</div>
      ${commentHTML}
      <div class="actions">${actionsHTML}</div>
    `;
    container.appendChild(div);
  });
}

/* ---------- ADD NEW AD ---------- */
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

  const key = type === 'driver' ? 'driverAds' : 'passengerAds';
  const ads = getJSON(key);
  const id = `${type}_${Date.now()}_${Math.floor(Math.random()*1000)}`;
  const newAd = {
    id,
    phone: cu.phone,
    ownerId: cu.id || cu.phone,
    type,
    fromRegion, fromDistrict, toRegion, toDistrict,
    price, comment: comment || '',
    status: 'pending',
    createdAt: new Date().toLocaleString()
  };
  ads.push(newAd);
  setJSON(key, ads);

  renderAdsList();
  alert('✅ E’lon joylandi (Admin tasdiqlashi kutilmoqda).');
  clearAddForm();
}

/* ---------- EDIT AD ---------- */
function editAd(id,type){
  const key = type === 'driver' ? 'driverAds' : 'passengerAds';
  const ads = getJSON(key);
  const ad = ads.find(a=>String(a.id) === String(id));
  if(!ad) return;
  if(ad.edited){ alert('❗ Ushbu e\'lon avval tahrirlangan.'); return; }
  const newPrice = prompt('Yangi narxni kiriting:', ad.price || '');
  if(newPrice === null) return;
  ad.price = newPrice;
  ad.edited = true;
  setJSON(key, ads);
  renderAdsList();
  alert('✏️ E\'lon yangilandi.');
}

/* ---------- DELETE AD ---------- */
function deleteAd(id,type){
  if(!confirm('Haqiqatan o\'chirilsinmi?')) return;
  const key = type === 'driver' ? 'driverAds' : 'passengerAds';
  let ads = getJSON(key);
  ads = ads.filter(a => String(a.id) !== String(id));
  setJSON(key, ads);
  renderAdsList();
}
/* ---------- INLINE EDIT START ---------- */
function startInlineEdit(type,id){
  const temp = { type, id };
  localStorage.setItem('tempInlineEdit', JSON.stringify(temp));
  renderAdsListWithInline();
}

function renderAdsListWithInline(){
  normalizeOldAds();
  const temp = JSON.parse(localStorage.getItem('tempInlineEdit') || 'null');
  const cu = getCurrentUser();
  const viewingProfile = window.viewingProfile || (cu? (cu.id||cu.phone) : null);

  const q = (document.getElementById('searchAdInput').value || '').toLowerCase().trim();
  const typeFilter = document.getElementById('filterType').value;
  const statusFilter = document.getElementById('filterStatus').value;
  const fFromRegion = document.getElementById('filterFromRegion').value;
  const fFromDistrict = document.getElementById('filterFromDistrict').value;
  const fToRegion = document.getElementById('filterToRegion').value;
  const fToDistrict = document.getElementById('filterToDistrict').value;

  const driver = getJSON('driverAds') || [];
  const passenger = getJSON('passengerAds') || [];
  let all = [...driver.map(a=>({...a,type:'driver'})), ...passenger.map(a=>({...a,type:'passenger'}))];

  if(viewingProfile){
    all = all.filter(a => String(a.ownerId || a.phone) === String(viewingProfile) || String(a.phone) === String(viewingProfile));
  } else {
    const cu2 = getCurrentUser();
    if(cu2) all = all.filter(a => String(a.phone) === String(cu2.phone) || String(a.ownerId) === String(cu2.id));
  }

  if(typeFilter !== 'all') all = all.filter(a => a.type === typeFilter);
  if(statusFilter !== 'all') all = all.filter(a => (a.status||'pending') === statusFilter);
  if(fFromRegion) all = all.filter(a => (a.fromRegion || '').includes(fFromRegion));
  if(fFromDistrict) all = all.filter(a => (a.fromDistrict || '').includes(fFromDistrict));
  if(fToRegion) all = all.filter(a => (a.toRegion || '').includes(fToRegion));
  if(fToDistrict) all = all.filter(a => (a.toDistrict || '').includes(fToDistrict));
  if(q) all = all.filter(a => (String(a.phone||'')+String(a.id||'')+String(a.comment||'')).toLowerCase().includes(q));

  all.sort((a,b)=>{
    const da = parseAdDate(a.createdAt) || new Date(0);
    const db = parseAdDate(b.createdAt) || new Date(0);
    return db - da;
  });

  const container = document.getElementById('myAds');
  container.innerHTML = '';
  if(all.length === 0){ container.innerHTML = '<p>Hozircha e’lonlar yo‘q.</p>'; return; }

  all.forEach(ad=>{
    const div = document.createElement('div');
    div.className = 'ad-box ' + ((ad.status && ad.status.toLowerCase()) || 'pending');
    const from = (ad.fromRegion? ad.fromRegion+' ':'') + (ad.fromDistrict? ad.fromDistrict:'');
    const to = (ad.toRegion? ad.toRegion+' ':'') + (ad.toDistrict? ad.toDistrict:'');
    const created = ad.createdAt ? (parseAdDate(ad.createdAt) ? parseAdDate(ad.createdAt).toLocaleString() : ad.createdAt) : '—';
    const statusText = ad.status === 'approved' ? '✅ Tasdiqlangan' : ad.status === 'rejected' ? '❌ Rad etilgan' : '⏳ Kutilmoqda';
    const ownerId = ad.ownerId || ad.phone;
    const cu2 = getCurrentUser();
    const isOwner = cu2 && (String(cu2.phone) === String(ad.phone) || String(cu2.id) === String(ad.ownerId));

    let actionsHTML = '';
    if(isOwner){
      if(temp && temp.type === ad.type && String(temp.id) === String(ad.id)){
        actionsHTML = `
          <div class="inline-edit">
            <input id="inlinePrice_${ad.id}" type="number" placeholder="Narx" value="${escapeHtml(ad.price || '')}" />
            <button onclick="saveInlineAdmin('${ad.type}','${ad.id}')">💾 Saqlash</button>
            <button onclick="cancelInlineAdmin()">❌ Bekor</button>
          </div>
        `;
      } else {
        if(ad.status !== 'approved'){
          actionsHTML += `<button onclick="startInlineEdit('${ad.type}','${ad.id}')">Inline tahrir</button>`;
          actionsHTML += `<button onclick="editAd('${ad.id}','${ad.type}')">✏️ Tahrirlash</button>`;
        } else {
          actionsHTML += `<button disabled style="background:#ccc;cursor:not-allowed;">✏️ Tahrirlash</button>`;
        }
        actionsHTML += `<button onclick="deleteAd('${ad.id}','${ad.type}')">🗑️ O'chirish</button>`;
      }
    } else {
      actionsHTML += `<button class="view-profile-btn" onclick="openViewProfile('${ownerId}')">🔎 Profilni ko'rish</button>`;
      actionsHTML += `<button onclick="contactOwner('${ad.phone}')">📞 Telefon</button>`;
    }

    const commentHTML = ad.comment ? `<div class="comment-box"><b>Izoh:</b> ${escapeHtml(ad.comment)}</div>` : '';
    div.innerHTML = `
      <div><b>Yo'nalish:</b> ${escapeHtml(from)} → ${escapeHtml(to)}</div>
      <div><b>Narx:</b> ${escapeHtml(ad.price || 'Ko‘rsatilmagan')} so'm</div>
      <div><b>Telefon:</b> ${escapeHtml(ad.phone || 'Noma\'lum')}</div>
      <div class="date-info">🕒 Joylangan: ${escapeHtml(created)} · Holat: ${escapeHtml(statusText)}</div>
      ${commentHTML}
      <div class="actions">${actionsHTML}</div>
    `;
    container.appendChild(div);
  });
}

function saveInlineAdmin(type,id){
  const key = type === 'driver' ? 'driverAds' : 'passengerAds';
  const ads = getJSON(key);
  const ad = ads.find(a=>String(a.id) === String(id));
  if(!ad) return;
  const val = document.getElementById(`inlinePrice_${id}`).value.trim();
  if(!val){ alert('Narx kiriting'); return; }
  ad.price = val;
  ad.edited = true;
  setJSON(key, ads);
  localStorage.removeItem('tempInlineEdit');
  renderAdsList();
  alert('E\'lon yangilandi (inline).');
}

function cancelInlineAdmin(){
  localStorage.removeItem('tempInlineEdit');
  renderAdsList();
}

/* ---------- CONTACT OWNER ---------- */
function contactOwner(phone){
  if(!phone){ alert('Telefon raqam mavjud emas'); return; }
  alert(`Telefon: ${phone} (telefonni nusxa oling yoki qo'ng'iroq qiling)`);
}

/* ---------- CLEAR ADD FORM ---------- */
function clearAddForm(){
  document.getElementById('adType').value = '';
  document.getElementById('fromRegion').value = '';
  document.getElementById('fromDistrict').innerHTML = '<option value="">Tumanni tanlang</option>';
  document.getElementById('toRegion').value = '';
  document.getElementById('toDistrict').innerHTML = '<option value="">Tumanni tanlang</option>';
  document.getElementById('price').value = '';
  document.getElementById('adComment').value = '';
}
/* ---------- Filters: populate regions/district selects ---------- */
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
  districtSel.innerHTML = '<option value="">Tumanni tanlang</option>';
  if(region && regions[region]){
    regions[region].forEach(d => {
      const opt = document.createElement('option'); opt.value = d; opt.textContent = d;
      districtSel.appendChild(opt);
    });
  }
}

function updateFilterDistricts(prefix){
  const region = document.getElementById(prefix+'Region').value;
  const districtSel = document.getElementById(prefix+'District');
  districtSel.innerHTML = '<option value="">Tanlang</option>';
  if(region && regions[region]){
    regions[region].forEach(d => districtSel.add(new Option(d,d)));
  }
  renderAdsList();
}

/* ---------- Profile viewing modal & rating ---------- */
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

  document.getElementById('vpName').textContent = user.name || 'Foydalanuvchi';
  document.getElementById('vpPhone').textContent = user.phone || '—';

  const ratings = getRatingsForProfile(user.id || user.phone);
  const avg = computeAverage(ratings);
  document.getElementById('vpRatingSummary').innerHTML = `<strong>${avg>0 ? avg+' / 5' : 'Hozircha baho yo‘q'}</strong> — ${ratings.length} ta baho`;

  const vpAds = [...getJSON('driverAds'), ...getJSON('passengerAds')].filter(a => String(a.ownerId) === String(user.id) || String(a.phone) === String(user.phone));
  const vpList = document.getElementById('vpAdsList');
  if(vpAds.length === 0) vpList.innerHTML = '<p class="small">Ushbu foydalanuvchining e\'lonlari mavjud emas.</p>';
  else {
    vpList.innerHTML = vpAds.map(a => {
      const created = a.createdAt? (parseAdDate(a.createdAt)? parseAdDate(a.createdAt).toLocaleString() : a.createdAt) : '';
      return `<div style="padding:6px;border-bottom:1px solid #eee;"><b>${a.type === 'driver'? 'Haydovchi' : 'Yo\'lovchi'}</b> · ${escapeHtml(a.fromRegion||'')} → ${escapeHtml(a.toRegion||'')} · ${escapeHtml(a.price||'')} so'm<br><small class="small">${escapeHtml(created)}</small></div>`;
    }).join('');
  }

  const cur = getCurrentUser();
  const vpRateSection = document.getElementById('vpRateSection');
  vpRateSection.innerHTML = '';
  if(!cur){
    vpRateSection.innerHTML = '<div class="small">Baholash uchun tizimga kiring.</div>';
  } else if(String(cur.id) === String(user.id) || String(cur.phone) === String(user.phone)){
    vpRateSection.innerHTML = '<div class="small">Siz o\'zingizni baholay olmaysiz.</div>';
  } else {
    const ratingsStore = getProfileRatingsStore();
    const existing = (ratingsStore.find(e=>String(e.phone)===String(user.id)) || {ratings:[]}).ratings || [];
    const already = existing.some(r=>String(r.raterPhone)===String(cur.phone));
    if(already){
      vpRateSection.innerHTML = '<div class="small">Siz allaqachon bu foydalanuvchini baholagansiz.</div>';
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
          <div style="margin-top:8px;text-align:right;"><button onclick="submitProfileRating('${user.id||user.phone}')">Yuborish</button></div>
        </div>
      `;
    }
  }

  document.getElementById('viewProfileModal').style.display = 'flex';
}

function closeViewProfile(){
  document.getElementById('viewProfileModal').style.display = 'none';
}

/* ---------- PROFILE RATING STORE ---------- */
function getProfileRatingsStore(){ return JSON.parse(localStorage.getItem('profileRatings') || '[]'); }
function saveProfileRatingsStore(store){ localStorage.setItem('profileRatings', JSON.stringify(store)); }
function getRatingsForProfile(profileId){
  if(!profileId) return [];
  const store = getProfileRatingsStore();
  const e = store.find(it=>String(it.phone)===String(profileId));
  return e? e.ratings : [];
}
function addRatingForProfile(profileId, rating){
  const store = getProfileRatingsStore();
  let entry = store.find(it=>String(it.phone)===String(profileId));
  if(!entry){ entry = { phone: String(profileId), ratings: [] }; store.push(entry); }
  entry.ratings.push(rating);
  saveProfileRatingsStore(store);
}
function computeAverage(ratings){
  if(!ratings || ratings.length === 0) return 0;
  const s = ratings.reduce((sum,r)=> sum + (Number(r.stars)||0), 0);
  return +(s / ratings.length).toFixed(2);
}

function submitProfileRating(profileId){
  const cur = getCurrentUser();
  if(!cur){ alert('Baholash uchun tizimga kiring!'); return; }
  const stars = Number(document.getElementById('vpRatingStars').value) || 5;
  const text = (document.getElementById('vpRatingText').value || '').trim();
  const existing = getRatingsForProfile(profileId);
  if(existing.some(r=>String(r.raterPhone) === String(cur.phone))){ alert('Siz allaqachon baho berdingiz'); return; }
  const r = { raterPhone: cur.phone, stars, text, date: new Date().toLocaleString() };
  addRatingForProfile(profileId, r);
  alert('✅ Baho saqlandi!');
  if(window.viewingProfile) openViewProfile(window.viewingProfile);
  renderProfileHeader({ id: profileId, phone: profileId, name: '' });
}

/* ---------- Profile edit ---------- */
function openEditProfile(){
  const cu = getCurrentUser();
  if(!cu){ alert('Tizimga kiring!'); return; }
  document.getElementById('editFullName').value = cu.name || '';
  document.getElementById('editPhoneInput').value = cu.phone || '';
  document.getElementById('editProfileModal').style.display = 'flex';
}

function closeEditProfile(){ document.getElementById('editProfileModal').style.display = 'none'; }
function saveProfileEdit(){
  const name = document.getElementById('editFullName').value.trim();
  const phone = document.getElementById('editPhoneInput').value.trim();

  // ✅ Faqat +998 bilan boshlanadigan 13 belgili raqamga ruxsat
  const phoneRegex = /^\+998\d{9}$/;
  if(!phoneRegex.test(phone)){
    alert("Telefon raqamni to‘g‘ri kiriting! (Masalan: +998901234567)");
    return;
  }

  let users = getJSON('users') || [];
  const cur = getCurrentUser();
  if(cur){
    cur.name = name;
    cur.phone = phone;
    localStorage.setItem('currentUser', JSON.stringify(cur));

    let uidx = users.findIndex(u => String(u.id) === String(cur.id) || String(u.phone) === String(cur.phone));
    if(uidx > -1){
      users[uidx].name = name;
      users[uidx].phone = phone;
    } else {
      const newid = cur.id || `u_${Date.now()}`;
      users.push({ id: newid, phone, name, active:true });
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

/* ---------- View own ads ---------- */
function viewOwnAds(){
  const cu = getCurrentUser();
  if(!cu) return;
  window.viewingProfile = cu.id || cu.phone;
  renderAdsList();
}

/* ---------- Sync statuses ---------- */
function syncStatuses(){
  const cu = getCurrentUser();
  if(!cu) return;
  const driver = getJSON('driverAds') || [];
  const passenger = getJSON('passengerAds') || [];
  const userAds = [...driver, ...passenger].filter(a => String(a.ownerId) === String(cu.id) || String(a.phone) === String(cu.phone));
  const lastStatuses = JSON.parse(localStorage.getItem('userAdStatuses') || '{}');
  userAds.forEach(ad=>{
    const prev = lastStatuses[ad.id];
    if(prev && prev !== ad.status){
      if(ad.status === 'approved') alert(`✅ E'loningiz tasdiqlandi: ${ad.fromRegion || ad.from} → ${ad.toRegion || ad.to}`);
      else if(ad.status === 'rejected') alert(`❌ E'loningiz rad etildi: ${ad.fromRegion || ad.from} → ${ad.toRegion || ad.to}`);
    }
    lastStatuses[ad.id] = ad.status;
  });
  localStorage.setItem('userAdStatuses', JSON.stringify(lastStatuses));
}

/* ---------- Helper: Escape HTML ---------- */
function escapeHtml(str){
  if(!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

/* ---------- INIT PROFILE ON LOAD ---------- */
function initProfileOnLoad(){
  normalizeOldAds();
  loadRegionsToSelects();
  const maybeProfile = window.profilePhone || localStorage.getItem('viewingProfile') || null;
  let profileUser = null;
  if(maybeProfile){
    const users = getJSON('users') || [];
    profileUser = users.find(u=>String(u.id)===String(maybeProfile) || String(u.phone)===String(maybeProfile));
    if(!profileUser){
      const ads = [...getJSON('driverAds'), ...getJSON('passengerAds')];
      const ad = ads.find(a => String(a.ownerId)===String(maybeProfile) || String(a.phone)===String(maybeProfile));
      if(ad) profileUser = { id: ad.ownerId||ad.phone, phone: ad.phone, name: ad.ownerName || ad.phone };
    }
  }
  const cu = getCurrentUser();
  if(!profileUser && cu) profileUser = cu;
  if(!profileUser){
    document.getElementById('profileName').textContent = 'Tizimga kiring';
    document.getElementById('profilePhone').textContent = '—';
  } else {
    renderProfileHeader(profileUser);
    window.viewingProfile = profileUser.id || profileUser.phone;
  }
  renderAdsList();
  setInterval(syncStatuses, 5000);
}

/* ---------- LOGOUT ---------- */
function logout(){
  localStorage.removeItem('currentUser');
  alert('Chiqdingiz.');
  location.reload();
}

/* ---------- ON LOAD ---------- */
document.addEventListener('DOMContentLoaded', ()=>{
  const activeId = localStorage.getItem('activeUserId');
  if(!localStorage.getItem('currentUser') && activeId){
    const users = getJSON('users') || [];
    const u = users.find(x=> String(x.id) === String(activeId));
    if(u) localStorage.setItem('currentUser', JSON.stringify(u));
  }

  loadRegionsToSelects();
  initProfileOnLoad();

  document.querySelectorAll('.modal').forEach(m=>{
    m.addEventListener('click', e=>{
      if(e.target === m) m.style.display = 'none';
    });
  });
});

/* ---------- Debug helpers ---------- */
window._debug = {
  getDriverAds: ()=>getJSON('driverAds'),
  getPassengerAds: ()=>getJSON('passengerAds'),
  getUsers: ()=>getJSON('users'),
  getRatings: ()=>getProfileRatingsStore(),
  loginMock
};
