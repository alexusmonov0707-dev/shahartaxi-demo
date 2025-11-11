/*!
  profile.js — ShaharTaxi profile page full logic (offline demo)
  - Preserves original behavior & function names
  - Uses localStorage keys:
      users, currentUser, driverAds, passengerAds, profileRatings, userAdStatuses, tempInlineEdit
  - Supports regions.js if present (fallback internal regions object)
  - Features:
      * loginMock() for demo
      * renderProfileHeader()
      * renderAdsList(), renderAdsListWithInline()
      * addAd(), addAdLegacyFromViloyatForm()
      * editAd() (prompt style) + modal full edit + inline edit
      * deleteAd(), contactOwner()
      * openViewProfile(), submitProfileRating()
      * normalizeOldAds(), parseAdDate(), computeAverage()
      * syncStatuses() (periodic)
      * compatibility & defensive parsing
  - Drop into same folder as profile.html
*/

(function () {
  'use strict';

  /* -------------------------
     Storage helpers
  -------------------------*/
  function safeParse(raw) {
    try { return JSON.parse(raw); } catch(e){ return null; }
  }
  function getJSON(key) {
    try {
      const raw = localStorage.getItem(key);
      if(!raw) return [];
      const val = JSON.parse(raw);
      return Array.isArray(val) ? val : val;
    } catch (e) {
      console.warn('getJSON parse error', key, e);
      return [];
    }
  }
  function setJSON(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.error('setJSON error', key, e);
    }
  }

  /* -------------------------
     Regions loader (supports regions.js or fallback)
  -------------------------*/
  let REGIONS = {
    "Toshkent": ["Bektemir","Chilonzor","Mirzo Ulug'bek","Mirobod"],
    "Samarqand": ["Bulungur","Ishtixon","Urgut","Kattaqo'rg'on"],
    "Namangan": ["Pop","Chust","To'raqo'rg'on"],
    "Andijon": ["Asaka","Andijon sh.","Marhamat"],
    "Farg'ona": ["Qo'qon","Qo'rg'ontepa","Beshariq"],
    "Buxoro": ["Buxoro sh.","G'ijduvon","Jondor"],
    "Xorazm": ["Urgench","Xiva","Shovot"],
    "Qashqadaryo": ["Qarshi","G'uzor","Kitob"]
  };

  function tryLoadRegionsFromFile() {
    // If there's a global variable `regions` (from regions.js), use it
    if (typeof window.regions === 'object' && window.regions !== null) {
      REGIONS = window.regions;
      return;
    }
    // try to fetch regions.js and parse object literal (if running from server). For file:// this may fail -> fallback used.
    if (typeof fetch === 'function') {
      fetch('regions.js').then(r => r.text()).then(txt => {
        // try to evaluate object literal safely by searching for = { ... };
        const m = txt.match(/=\s*(\{[\s\S]*\})/);
        if (m) {
          try {
            /* eslint-disable no-new-func */
            const obj = (new Function('return ' + m[1]))();
            if (typeof obj === 'object') {
              REGIONS = obj;
            }
          } catch (e) {
            // ignore, keep fallback
          }
        }
      }).catch(()=>{/* ignore fetch error */});
    }
  }

  tryLoadRegionsFromFile();

  /* -------------------------
     Utility helpers
  -------------------------*/
  function escapeHtml(str) {
    if (str === undefined || str === null) return '';
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,"&#039;");
  }

  function parseAdDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
    // dd.mm.yyyy or dd.mm.yyyy hh:mm
    const m = String(dateStr).match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
    if (m) {
      const day = parseInt(m[1],10), mon = parseInt(m[2],10)-1, yr = parseInt(m[3],10);
      const hh = m[4]? parseInt(m[4],10):0, mm = m[5]? parseInt(m[5],10):0;
      return new Date(yr,mon,day,hh,mm);
    }
    return null;
  }

  function formatCreatedAt(d) {
    if (!d) return '—';
    const dt = parseAdDate(d) || new Date(d);
    try {
      return dt.toLocaleString();
    } catch(e) {
      return dt.toString();
    }
  }

  function computeAverage(ratings) {
    if (!ratings || ratings.length === 0) return 0;
    const s = ratings.reduce((sum,r)=> sum + (Number(r.stars)||0),0);
    return +(s/ratings.length).toFixed(2);
  }

  /* -------------------------
     Current user detection
  -------------------------*/
  function getCurrentUser() {
    try {
      const cu = JSON.parse(localStorage.getItem('currentUser') || 'null');
      if (cu && (cu.id || cu.phone)) return cu;
    } catch (e) {}
    const users = getJSON('users') || [];
    const active = users.find(u=>u.active);
    if (active) return active;
    return null;
  }

  /* -------------------------
     normalize old ads: ensure fields
  -------------------------*/
  function normalizeOldAds() {
    ['driverAds','passengerAds'].forEach(key => {
      const arr = getJSON(key) || [];
      let changed = false;
      arr.forEach(ad => {
        if (!('comment' in ad)) { ad.comment = ''; changed=true; }
        if (!ad.ownerId && ad.phone) {
          const users = getJSON('users')||[];
          const u = users.find(x=>String(x.phone)===String(ad.phone));
          if (u) { ad.ownerId = u.id; changed=true; }
        }
        if (!ad.createdAt) { ad.createdAt = new Date().toLocaleString(); changed=true; }
      });
      if (changed) setJSON(key, arr);
    });
  }

  /* -------------------------
     loginMock() - create demo users & ads
  -------------------------*/
  function loginMock() {
    let users = getJSON('users');
    if (!users || users.length === 0) {
      users = [
        { id: 'u1', phone: '998901112233', name: 'Ali', active:true },
        { id: 'u2', phone: '998909998877', name: 'Vali', active:false },
        { id: 'u3', phone: '998971234567', name: 'Dilor', active:false }
      ];
      setJSON('users', users);
    }
    const cu = users[0];
    localStorage.setItem('currentUser', JSON.stringify(cu));

    // sample ads if empty
    if ((getJSON('driverAds')||[]).length === 0 && (getJSON('passengerAds')||[]).length === 0) {
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

    // ensure initial stores
    if (!localStorage.getItem('profileRatings')) setJSON('profileRatings', []);
    if (!localStorage.getItem('userAdStatuses')) setJSON('userAdStatuses', {});
    alert('Demo users & ads created. Current user set to first demo account.');
    renderAll();
  }

  /* -------------------------
     Render profile header
  -------------------------*/
  function renderProfileHeader(profileUser) {
    // profileUser: {id, phone, name}
    const elName = document.getElementById('profileName');
    const elPhone = document.getElementById('profilePhone');
    const elRatingBig = document.getElementById('profileRatingBig');
    const elRatingCount = document.getElementById('profileRatingCount');

    if (elName) elName.textContent = profileUser.name || 'Foydalanuvchi';
    if (elPhone) elPhone.textContent = profileUser.phone || '—';

    const ratings = getRatingsForProfile(profileUser.id || profileUser.phone);
    const avg = computeAverage(ratings);
    if (elRatingBig) elRatingBig.textContent = avg>0 ? `${avg} / 5` : '—';
    if (elRatingCount) elRatingCount.textContent = ratings.length ? `${ratings.length} ta baho` : 'Hozircha baholar yo‘q';

    // edit visibility
    const editBtn = document.getElementById('editProfileBtn');
    const cu = getCurrentUser();
    if (editBtn) {
      if (cu && (String(cu.id) === String(profileUser.id) || String(cu.phone) === String(profileUser.phone))) {
        editBtn.style.display = 'inline-block';
      } else {
        editBtn.style.display = 'none';
      }
    }
  }

  /* -------------------------
     Render ads list (main)
  -------------------------*/
  function renderAdsList() {
    normalizeOldAds();

    const cu = getCurrentUser();
    const viewingProfile = window.viewingProfile || (cu? (cu.id||cu.phone) : null);

    // filters (if elements present)
    const searchEl = document.getElementById('searchAdInput');
    const q = searchEl ? (searchEl.value||'').toLowerCase().trim() : '';
    const typeFilterEl = document.getElementById('filterType');
    const typeFilter = typeFilterEl ? typeFilterEl.value : 'all';
    const statusFilterEl = document.getElementById('filterStatus');
    const statusFilter = statusFilterEl ? statusFilterEl.value : 'all';
    const fFromRegion = (document.getElementById('filterFromRegion') ? document.getElementById('filterFromRegion').value : '');
    const fFromDistrict = (document.getElementById('filterFromDistrict') ? document.getElementById('filterFromDistrict').value : '');
    const fToRegion = (document.getElementById('filterToRegion') ? document.getElementById('filterToRegion').value : '');
    const fToDistrict = (document.getElementById('filterToDistrict') ? document.getElementById('filterToDistrict').value : '');

    const driver = getJSON('driverAds') || [];
    const passenger = getJSON('passengerAds') || [];
    let all = [...driver.map(a=>({...a,type:'driver'})), ...passenger.map(a=>({...a,type:'passenger'}))];

    // show only viewingProfile or currentUser's ads
    if (viewingProfile) {
      all = all.filter(a => String(a.ownerId || a.phone) === String(viewingProfile) || String(a.phone) === String(viewingProfile));
    } else {
      const cu2 = getCurrentUser();
      if (cu2) all = all.filter(a => String(a.phone) === String(cu2.phone) || String(a.ownerId) === String(cu2.id));
    }

    if (typeFilter && typeFilter !== 'all') all = all.filter(a=> a.type === typeFilter);
    if (statusFilter && statusFilter !== 'all') all = all.filter(a => (String(a.status||'pending') === String(statusFilter)));
    if (fFromRegion) all = all.filter(a => (a.fromRegion || '').includes(fFromRegion));
    if (fFromDistrict) all = all.filter(a => (a.fromDistrict || '').includes(fFromDistrict));
    if (fToRegion) all = all.filter(a => (a.toRegion || '').includes(fToRegion));
    if (fToDistrict) all = all.filter(a => (a.toDistrict || '').includes(fToDistrict));
    if (q) all = all.filter(a => (String(a.phone||'')+String(a.id||'')+String(a.comment||'')+String(a.fromRegion||'')+String(a.toRegion||'')).toLowerCase().includes(q));

    // sort by createdAt desc
    all.sort((a,b)=> {
      const da = parseAdDate(a.createdAt) || new Date(0);
      const db = parseAdDate(b.createdAt) || new Date(0);
      return db - da;
    });

    const container = document.getElementById('myAds');
    if (!container) return;
    container.innerHTML = '';

    if (!all.length) {
      container.innerHTML = '<p>Hozircha e’lonlar yo‘q.</p>';
      return;
    }

    all.forEach(ad => {
      const div = document.createElement('div');
      div.className = 'ad-box ' + ((ad.status && String(ad.status).toLowerCase()) || 'pending');
      // background style handled by CSS classes .ad-box.pending/.approved/.rejected
      const from = (ad.fromRegion? ad.fromRegion+' ':'') + (ad.fromDistrict? ad.fromDistrict:'');
      const to = (ad.toRegion? ad.toRegion+' ':'') + (ad.toDistrict? ad.toDistrict:'');
      const created = ad.createdAt ? (parseAdDate(ad.createdAt) ? parseAdDate(ad.createdAt).toLocaleString() : ad.createdAt) : '—';
      const statusText = (ad.status === 'approved' || String(ad.status).toLowerCase()==='approved') ? '✅ Tasdiqlangan' : (ad.status === 'rejected' || String(ad.status).toLowerCase()==='rejected' ? '❌ Rad etilgan' : '⏳ Kutilmoqda');
      const ownerId = ad.ownerId || ad.phone;

      const profileBtnHtml = `<button class="view-profile-btn" onclick="openViewProfile('${ownerId}')">🔎 Profilni ko'rish</button>`;

      let actionsHTML = '';
      const cu2 = getCurrentUser();
      const isOwner = cu2 && (String(cu2.phone) === String(ad.phone) || String(cu2.id) === String(ad.ownerId));
      if (isOwner) {
        if (String(ad.status).toLowerCase() !== 'approved') {
          actionsHTML += `<button onclick="startInlineEdit('${encodeURIComponent(ad.type)}','${encodeURIComponent(ad.id)}')">Inline tahrir</button>`;
          actionsHTML += `<button onclick="editAd('${encodeURIComponent(ad.id)}','${encodeURIComponent(ad.type)}')">✏️ Tahrirlash</button>`;
        } else {
          actionsHTML += `<button disabled style="background:#ccc;cursor:not-allowed;">✏️ Tahrirlash</button>`;
        }
        actionsHTML += `<button onclick="deleteAd('${encodeURIComponent(ad.id)}','${encodeURIComponent(ad.type)}')">🗑️ O'chirish</button>`;
      } else {
        actionsHTML += profileBtnHtml;
        actionsHTML += `<button onclick="contactOwner('${encodeURIComponent(ad.phone)}')">📞 Telefon</button>`;
      }

      const commentHTML = ad.comment ? `<div class="comment-box"><b>Izoh:</b> ${escapeHtml(ad.comment)}</div>` : '';

      div.innerHTML = `
        <div><b>Yo'nalish:</b> ${escapeHtml(from)} → ${escapeHtml(to)}</div>
        <div><b>Narx:</b> ${escapeHtml(ad.price || 'Ko‘rsatilmagan')} so'm</div>
        <div><b>Telefon:</b> ${escapeHtml(ad.phone || 'Noma\\'lum')}</div>
        <div class="date-info">🕒 Joylangan: ${escapeHtml(created)} · Holat: ${escapeHtml(statusText)}</div>
        ${commentHTML}
        <div class="actions">${actionsHTML}</div>
      `;
      container.appendChild(div);
    });
  }

  /* -------------------------
     Inline edit handling (temp state stored in localStorage.tempInlineEdit)
  -------------------------*/
  function startInlineEdit(type,id) {
    try {
      const t = { type: decodeURIComponent(type), id: decodeURIComponent(id) };
      localStorage.setItem('tempInlineEdit', JSON.stringify(t));
      renderAdsListWithInline();
    } catch(e){
      console.error('startInlineEdit decode error', e);
    }
  }

  function renderAdsListWithInline() {
    normalizeOldAds();
    const temp = safeParse(localStorage.getItem('tempInlineEdit')) || null;
    const cu = getCurrentUser();
    let all = [...(getJSON('driverAds')||[]).map(a=>({...a,type:'driver'})), ...(getJSON('passengerAds')||[]).map(a=>({...a,type:'passenger'}))];

    if (window.viewingProfile) {
      all = all.filter(a => String(a.ownerId || a.phone) === String(window.viewingProfile) || String(a.phone) === String(window.viewingProfile));
    } else {
      if (cu) all = all.filter(a => String(a.phone) === String(cu.phone) || String(a.ownerId) === String(cu.id));
    }

    const container = document.getElementById('myAds');
    if (!container) return;
    container.innerHTML = '';
    if (all.length === 0) { container.innerHTML = '<p>Hozircha e’lonlar yo‘q.</p>'; return; }

    all.forEach(ad => {
      const div = document.createElement('div');
      div.className = 'ad-box ' + ((ad.status && ad.status.toLowerCase()) || 'pending');
      const from = (ad.fromRegion? ad.fromRegion+' ':'') + (ad.fromDistrict? ad.fromDistrict:'');
      const to = (ad.toRegion? ad.toRegion+' ':'') + (ad.toDistrict? ad.toDistrict:'');
      const created = ad.createdAt ? (parseAdDate(ad.createdAt) ? parseAdDate(ad.createdAt).toLocaleString() : ad.createdAt) : '—';
      const cu2 = getCurrentUser();
      const isOwner = cu2 && (String(cu2.phone) === String(ad.phone) || String(cu2.id) === String(ad.ownerId));

      let actionsHTML = '';
      if (isOwner && temp && temp.type === ad.type && String(temp.id) === String(ad.id)) {
        actionsHTML = `
          <div class="inline-edit">
            <input id="inlinePrice_${ad.id}" type="number" placeholder="Narx" value="${escapeHtml(ad.price || '')}" />
            <button onclick="saveInlineAdmin('${escapeHtml(ad.type)}','${escapeHtml(ad.id)}')">💾 Saqlash</button>
            <button onclick="cancelInlineAdmin()">❌ Bekor</button>
          </div>
        `;
      } else {
        actionsHTML += `<button onclick="startInlineEdit('${escapeHtml(ad.type)}','${escapeHtml(ad.id)}')">Inline tahrir</button>`;
      }

      div.innerHTML = `
        <div><b>Yo'nalish:</b> ${escapeHtml(from)} → ${escapeHtml(to)}</div>
        <div><b>Narx:</b> ${escapeHtml(ad.price || 'Ko‘rsatilmagan')} so'm</div>
        <div><b>Telefon:</b> ${escapeHtml(ad.phone || 'Noma\\'lum')}</div>
        <div class="date-info">🕒 Joylangan: ${escapeHtml(created)} · Holat: ${escapeHtml(ad.status || 'Kutilmoqda')}</div>
        <div class="actions">${actionsHTML}</div>
      `;
      container.appendChild(div);
    });
  }

  function saveInlineAdmin(type,id) {
    const key = type === 'driver' ? 'driverAds' : 'passengerAds';
    const arr = getJSON(key) || [];
    const ad = arr.find(a => String(a.id) === String(id));
    if (!ad) return alert('E\\'lon topilmadi');
    const valEl = document.getElementById(`inlinePrice_${id}`);
    if (!valEl) return alert('Narx input topilmadi');
    const val = valEl.value.trim();
    if (!val) return alert('Narx kiriting');
    ad.price = val;
    ad.edited = true;
    setJSON(key, arr);
    localStorage.removeItem('tempInlineEdit');
    renderAdsList();
    alert('E\\'lon yangilandi (inline).');
  }

  function cancelInlineAdmin() { localStorage.removeItem('tempInlineEdit'); renderAdsList(); }

  /* -------------------------
     Edit ad (prompt simple) + modal edit support
  -------------------------*/
  function editAd(id,type) {
    const key = type === 'driver' ? 'driverAds' : 'passengerAds';
    const arr = getJSON(key) || [];
    const ad = arr.find(a=>String(a.id) === String(id));
    if (!ad) return;
    if (ad.edited) { alert('❗ Ushbu e\\'lon avval tahrirlangan.'); return; }
    const newPrice = prompt('Yangi narxni kiriting:', ad.price || '');
    if (newPrice === null) return;
    ad.price = newPrice.trim();
    ad.edited = true;
    setJSON(key, arr);
    renderAdsList();
    alert('✏️ E\\'lon yangilandi.');
  }

  /* -------------------------
     Delete ad
  -------------------------*/
  function deleteAd(id,type) {
    if (!confirm('Haqiqatan o\\'chirilsinmi?')) return;
    const key = type === 'driver' ? 'driverAds' : 'passengerAds';
    let arr = getJSON(key) || [];
    arr = arr.filter(a => String(a.id) !== String(id));
    setJSON(key, arr);
    renderAdsList();
  }

  /* -------------------------
     Contact owner
  -------------------------*/
  function contactOwner(phoneEnc) {
    const phone = decodeURIComponent(phoneEnc || phoneEnc);
    if (!phone) return alert('Telefon raqam mavjud emas');
    try {
      const a = document.createElement('a'); a.href = 'tel:' + phone; a.click();
    } catch (e) {/* ignore */}
    alert(`Telefon: ${phone} — nusxa oling yoki qo\\'ng\\'iroq qiling.`);
  }

  /* -------------------------
     Add Ad (new modern form)
     IDs expected in profile.html:
       adType, fromRegion, fromDistrict, toRegion, toDistrict, price, adComment
     Legacy fallback: viloyat/shahar/yonalish/sana/vaqt/telefon form -> addAdLegacyFromViloyatForm()
  -------------------------*/
  function addAdFromForm() {
    const cu = getCurrentUser();
    if (!cu) return alert('Avval tizimga kiring!');
    const adTypeEl = document.getElementById('adType');
    const fromRegionEl = document.getElementById('fromRegion');
    const fromDistrictEl = document.getElementById('fromDistrict');
    const toRegionEl = document.getElementById('toRegion');
    const toDistrictEl = document.getElementById('toDistrict');
    const priceEl = document.getElementById('price');
    const commentEl = document.getElementById('adComment');

    const type = adTypeEl ? adTypeEl.value : 'passenger';
    const fromRegion = fromRegionEl ? fromRegionEl.value.trim() : '';
    const fromDistrict = fromDistrictEl ? fromDistrictEl.value.trim() : '';
    const toRegion = toRegionEl ? toRegionEl.value.trim() : '';
    const toDistrict = toDistrictEl ? toDistrictEl.value.trim() : '';
    const price = priceEl ? priceEl.value.trim() : '';
    const comment = commentEl ? commentEl.value.trim() : '';

    if (!type || !fromRegion || !toRegion) return alert('Iltimos yo\\'nalish ma\\'lumotlarini to\\'ldiring!');
    if (!price || isNaN(Number(price))) return alert('Iltimos to\\'g\\'ri narx kiriting!');

    const key = type === 'driver' ? 'driverAds' : 'passengerAds';
    const ads = getJSON(key) || [];
    const id = `${type}_${Date.now()}_${Math.floor(Math.random()*1000)}`;
    const newAd = {
      id,
      phone: cu.phone,
      ownerId: cu.id || cu.phone,
      ownerName: cu.name || '',
      type,
      fromRegion, fromDistrict, toRegion, toDistrict,
      price: String(price),
      comment: comment || '',
      status: 'pending',
      createdAt: new Date().toLocaleString()
    };
    ads.push(newAd);
    setJSON(key, ads);
    renderAdsList();
    alert('✅ E\\'lon joylandi (Admin tasdiqlashi kutilmoqda).');
    // clear form if exists
    const addFormEl = document.getElementById('addForm');
    if (addFormEl) addFormEl.reset();
  }

  function addAdLegacyFromViloyatForm(ev) {
    if (ev) ev.preventDefault();
    const cu = getCurrentUser();
    if (!cu) return alert('Avval tizimga kiring!');
    const vil = document.getElementById('viloyat') ? document.getElementById('viloyat').value.trim() : '';
    const sh = document.getElementById('shahar') ? document.getElementById('shahar').value.trim() : '';
    const yon = document.getElementById('yonalish') ? document.getElementById('yonalish').value.trim() : '';
    const sana = document.getElementById('sana') ? document.getElementById('sana').value : '';
    const vaqt = document.getElementById('vaqt') ? document.getElementById('vaqt').value : '';
    const tel = document.getElementById('telefon') ? document.getElementById('telefon').value.trim() : '';

    if (!vil || !sh || !yon || !sana || !vaqt || !tel) {
      alert('Iltimos barcha maydonlarni to\\'ldiring!');
      return;
    }

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
    alert('E\\'lon joylandi (legacy form)');
    const adFormEl = document.getElementById('adForm');
    if (adFormEl) adFormEl.reset();
  }

  /* -------------------------
     View profile modal & rating handling
  -------------------------*/
  function getProfileRatingsStore() { return JSON.parse(localStorage.getItem('profileRatings') || '[]'); }
  function saveProfileRatingsStore(store) { localStorage.setItem('profileRatings', JSON.stringify(store)); }
  function getRatingsForProfile(profileId) {
    if (!profileId) return [];
    const store = getProfileRatingsStore();
    const e = store.find(it => String(it.phone) === String(profileId));
    return e ? e.ratings : [];
  }
  function addRatingForProfile(profileId, rating) {
    const store = getProfileRatingsStore();
    let entry = store.find(it => String(it.phone) === String(profileId));
    if (!entry) { entry = { phone: String(profileId), ratings: [] }; store.push(entry); }
    entry.ratings.push(rating);
    saveProfileRatingsStore(store);
  }

  function submitProfileRating(profileId) {
    const cur = getCurrentUser();
    if (!cur) return alert('Baholash uchun tizimga kiring!');
    const starsEl = document.getElementById('vpRatingStars');
    const textEl = document.getElementById('vpRatingText');
    const stars = starsEl ? Number(starsEl.value) : 5;
    const text = textEl ? textEl.value.trim() : '';
    const existing = getRatingsForProfile(profileId);
    if (existing.some(r => String(r.raterPhone) === String(cur.phone))) return alert('Siz allaqachon baho berdingiz');
    const r = { raterPhone: cur.phone, stars, text, date: new Date().toLocaleString() };
    addRatingForProfile(profileId, r);
    alert('✅ Baho saqlandi!');
    // rerender modal and header
    if (window.viewingProfile) openViewProfile(window.viewingProfile);
    renderProfileHeader({ id: profileId, phone: profileId, name: '' });
  }

  function openViewProfile(idOrPhone) {
    const users = getJSON('users') || [];
    let user = users.find(u => String(u.id) === String(idOrPhone) || String(u.phone) === String(idOrPhone));
    if (!user) {
      const ads = [...getJSON('driverAds'), ...getJSON('passengerAds')];
      const ad = ads.find(a => String(a.ownerId) === String(idOrPhone) || String(a.phone) === String(idOrPhone));
      if (ad) user = { id: ad.ownerId || ad.phone, phone: ad.phone, name: ad.ownerName || ad.phone };
    }
    if (!user) return alert('Foydalanuvchi topilmadi');
    window.viewingProfile = user.id || user.phone;

    // fill modal elements if exist
    const vpName = document.getElementById('vpName');
    const vpPhone = document.getElementById('vpPhone');
    const vpRatingSummary = document.getElementById('vpRatingSummary');
    const vpAdsList = document.getElementById('vpAdsList');
    const vpRateSection = document.getElementById('vpRateSection');

    if (vpName) vpName.textContent = user.name || 'Foydalanuvchi';
    if (vpPhone) vpPhone.textContent = user.phone || '—';
    const ratings = getRatingsForProfile(user.id || user.phone);
    const avg = computeAverage(ratings);
    if (vpRatingSummary) vpRatingSummary.innerHTML = `<strong>${avg>0 ? avg+' / 5' : 'Hozircha baho yo‘q'}</strong> — ${ratings.length} ta baho`;

    // list ads
    const vpAds = [...getJSON('driverAds'), ...getJSON('passengerAds')].filter(a => String(a.ownerId) === String(user.id) || String(a.phone) === String(user.phone));
    if (vpAdsList) {
      if (vpAds.length === 0) vpAdsList.innerHTML = '<p class="small">Ushbu foydalanuvchining e\\'lonlari mavjud emas.</p>';
      else {
        vpAdsList.innerHTML = vpAds.map(a => {
          const created = a.createdAt? (parseAdDate(a.createdAt)? parseAdDate(a.createdAt).toLocaleString() : a.createdAt) : '';
          return `<div style="padding:6px;border-bottom:1px solid #eee;"><b>${a.type === 'driver'? 'Haydovchi' : 'Yo\\'lovchi'}</b> · ${escapeHtml(a.fromRegion||'')} → ${escapeHtml(a.toRegion||'')} · ${escapeHtml(a.price||'')} so'm<br><small class="small">${escapeHtml(created)}</small></div>`;
        }).join('');
      }
    }

    // rating area
    if (!vpRateSection) {
      // open modal
      const modal = document.getElementById('viewProfileModal');
      if (modal) modal.style.display = 'flex';
      return;
    }
    vpRateSection.innerHTML = '';
    const cur = getCurrentUser();
    if (!cur) vpRateSection.innerHTML = '<div class="small">Baholash uchun avval tizimga kiring.</div>';
    else if (String(cur.id) === String(user.id) || String(cur.phone) === String(user.phone)) vpRateSection.innerHTML = '<div class="small">Siz o\\'zingizni baholay olmaysiz.</div>';
    else {
      const ratingsStore = getProfileRatingsStore();
      const existing = (ratingsStore.find(e=>String(e.phone)===String(user.id)) || {ratings:[]}).ratings || [];
      const already = existing.some(r=>String(r.raterPhone)===String(cur.phone));
      if (already) vpRateSection.innerHTML = '<div class="small">Siz allaqachon bu foydalanuvchini baholagansiz.</div>';
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
          const btn = document.getElementById('vpSubmitRatingBtn');
          if (btn) btn.addEventListener('click', ()=> submitProfileRating(user.id || user.phone));
        }, 50);
      }
    }
    const modal = document.getElementById('viewProfileModal');
    if (modal) modal.style.display = 'flex';
  }

  function closeViewProfile() {
    const modal = document.getElementById('viewProfileModal');
    if (modal) modal.style.display = 'none';
  }

  /* -------------------------
     Rating helpers persisted
  -------------------------*/
  function getProfileRatingsStore() { return JSON.parse(localStorage.getItem('profileRatings') || '[]'); }
  function saveProfileRatingsStore(store) { localStorage.setItem('profileRatings', JSON.stringify(store)); }

  /* -------------------------
     Profile edit modal & save
  -------------------------*/
  function openEditProfile() {
    const cu = getCurrentUser();
    if (!cu) return alert('Tizimga kiring!');
    const elName = document.getElementById('editFullName');
    const elPhone = document.getElementById('editPhoneInput');
    if (elName) elName.value = cu.name || '';
    if (elPhone) elPhone.value = cu.phone || '';
    const modal = document.getElementById('editProfileModal');
    if (modal) modal.style.display = 'flex';
  }
  function closeEditProfile() {
    const modal = document.getElementById('editProfileModal');
    if (modal) modal.style.display = 'none';
  }
  function saveProfileEdit() {
    const name = (document.getElementById('editFullName')||{}).value || '';
    const phone = (document.getElementById('editPhoneInput')||{}).value || '';
    if (!phone) return alert('Telefon raqam kiriting');
    let users = getJSON('users') || [];
    const cur = getCurrentUser();
    if (cur) {
      // update currentUser
      cur.name = name; cur.phone = phone;
      localStorage.setItem('currentUser', JSON.stringify(cur));
      // update users array (by id or phone)
      let idx = users.findIndex(u => String(u.id) === String(cur.id) || String(u.phone) === String(cur.phone));
      if (idx > -1) {
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

  /* -------------------------
     Sync statuses (admin may change) - notify user
  -------------------------*/
  function syncStatuses() {
    const cu = getCurrentUser();
    if (!cu) return;
    const driver = getJSON('driverAds') || [];
    const passenger = getJSON('passengerAds') || [];
    const userAds = [...driver, ...passenger].filter(a => String(a.ownerId) === String(cu.id) || String(a.phone) === String(cu.phone));
    const lastStatuses = JSON.parse(localStorage.getItem('userAdStatuses') || '{}');
    userAds.forEach(ad=>{
      const prev = lastStatuses[ad.id];
      if (prev && prev !== ad.status) {
        if (String(ad.status).toLowerCase() === 'approved' || ad.status === 'approved') alert(`✅ E'loningiz tasdiqlandi: ${ad.fromRegion || ad.from} → ${ad.toRegion || ad.to}`);
        else if (String(ad.status).toLowerCase() === 'rejected' || ad.status === 'rejected') alert(`❌ E'loningiz rad etildi: ${ad.fromRegion || ad.from} → ${ad.toRegion || ad.to}`);
      }
      lastStatuses[ad.id] = ad.status;
    });
    localStorage.setItem('userAdStatuses', JSON.stringify(lastStatuses));
  }

  /* -------------------------
     Logout
  -------------------------*/
  function logout() {
    localStorage.removeItem('currentUser');
    alert('Chiqdingiz.');
    location.reload();
  }

  /* -------------------------
     Initialization & DOM bindings
  -------------------------*/
  function loadRegionsToSelects() {
    ['fromRegion','toRegion','filterFromRegion','filterToRegion','viloyat'].forEach(id=>{
      const sel = document.getElementById(id);
      if (!sel) return;
      sel.innerHTML = '<option value="">Viloyatni tanlang</option>';
      Object.keys(REGIONS).forEach(r => {
        const opt = document.createElement('option'); opt.value = r; opt.textContent = r; sel.appendChild(opt);
      });
    });
    // Attach change listener for viloyat->shahar if legacy form exists
    const vil = document.getElementById('viloyat');
    const sh = document.getElementById('shahar');
    if (vil && sh) {
      vil.addEventListener('change', ()=>{
        sh.innerHTML = '<option value="">Shaharni tanlang</option>';
        const region = vil.value;
        if (region && REGIONS[region]) {
          REGIONS[region].forEach(d => {
            const o = document.createElement('option'); o.value = d; o.textContent = d; sh.appendChild(o);
          });
        }
      });
    }
    // also attach for modern selects if present
    const fromR = document.getElementById('fromRegion');
    const fromD = document.getElementById('fromDistrict');
    if (fromR && fromD) {
      fromR.addEventListener('change', ()=> {
        const region = fromR.value;
        fromD.innerHTML = '<option value="">Tumanni tanlang</option>';
        if (region && REGIONS[region]) REGIONS[region].forEach(d=> fromD.appendChild(new Option(d,d)));
      });
    }
    const toR = document.getElementById('toRegion');
    const toD = document.getElementById('toDistrict');
    if (toR && toD) {
      toR.addEventListener('change', ()=> {
        const region = toR.value;
        toD.innerHTML = '<option value="">Tumanni tanlang</option>';
        if (region && REGIONS[region]) REGIONS[region].forEach(d=> toD.appendChild(new Option(d,d)));
      });
    }
  }

  function bindUI() {
    // add form handlers (modern & legacy)
    const addForm = document.getElementById('addForm');
    if (addForm) {
      addForm.addEventListener('submit', (e)=>{
        e.preventDefault();
        // detect which fields present
        if (document.getElementById('adType')) addAdFromForm();
        else addAdLegacyFromViloyatForm();
      });
    }
    // Modern 'addAd' button
    const addAdBtn = document.getElementById('addAdBtn');
    if (addAdBtn) addAdBtn.addEventListener('click', ()=> {
      const f = document.getElementById('addForm');
      if (f) f.style.display = (f.style.display === 'block') ? 'none' : 'block';
    });
    // edit profile button
    const ep = document.getElementById('editProfileBtn');
    if (ep) ep.addEventListener('click', openEditProfile);
    // edit profile modal save button uses inline onclick in HTML saveProfileEdit()
    // attach close for modals click outside
    document.querySelectorAll('.modal').forEach(m=>{
      m.addEventListener('click', e=>{
        if (e.target === m) m.style.display = 'none';
      });
    });

    // legacy adForm vs adForm id handling already covered
    // bind logout if html button exists
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    // if there is a search input, bind input event
    const searchEl = document.getElementById('searchAdInput');
    if (searchEl) searchEl.addEventListener('input', renderAdsList);

    // attach event to filter selects to re-render
    ['filterType','filterStatus','filterFromRegion','filterFromDistrict','filterToRegion','filterToDistrict'].forEach(id=>{
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', renderAdsList);
    });
  }

  function renderAll() {
    normalizeOldAds();
    loadRegionsToSelects();
    renderProfileHeaderForCurrent();
    renderAdsList();
  }

  function renderProfileHeaderForCurrent() {
    const cu = getCurrentUser();
    if (!cu) {
      // show placeholders
      const elName = document.getElementById('profileName'); if (elName) elName.textContent = 'Tizimga kiring';
      const elPhone = document.getElementById('profilePhone'); if (elPhone) elPhone.textContent = '—';
      return;
    }
    renderProfileHeader(cu);
  }

  /* -------------------------
     Expose debug & public functions
  -------------------------*/
  window._shahartaxi = window._shahartaxi || {};
  Object.assign(window._shahartaxi, {
    getDriverAds: ()=> getJSON('driverAds'),
    getPassengerAds: ()=> getJSON('passengerAds'),
    getUsers: ()=> getJSON('users'),
    getRatings: ()=> getProfileRatingsStore(),
    loginMock,
    renderAdsList,
    renderAll,
    addAdFromForm,
    addAdLegacyFromViloyatForm,
    editAd,
    deleteAd,
    startInlineEdit,
    saveInlineAdmin,
    cancelInlineAdmin,
    openViewProfile,
    closeViewProfile,
    logout
  });

  /* -------------------------
     Auto init on DOMContentLoaded
  -------------------------*/
  document.addEventListener('DOMContentLoaded', function () {
    tryLoadRegionsFromFile();
    bindUI();

    // If 'currentUser' not set but 'activeUserId' exists, pick it from users
    const activeId = localStorage.getItem('activeUserId');
    if (!localStorage.getItem('currentUser') && activeId) {
      const users = getJSON('users') || [];
      const u = users.find(x => String(x.id) === String(activeId));
      if (u) localStorage.setItem('currentUser', JSON.stringify(u));
    }

    renderAll();

    // Periodic sync for status changes (admin simulated)
    setInterval(syncStatuses, 5000);
  });

})(); // end IIFE
