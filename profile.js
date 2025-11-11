/* profile.js
   ShaharTaxi — profile page JavaScript (offline demo)
   - Uses localStorage keys: users, currentUser, driverAds, passengerAds, profileRatings, userAdStatuses
   - Preserves all original functions: addAd, editAd, deleteAd, inline edit, view profile modal, rating
   - No eval, CSP-safe, defensive parsing
*/

/* ============================
   Utilities & storage helpers
   ============================ */
(function () {
  'use strict';

  // --- Storage wrapper (safe)
  function getJSON(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      console.warn('getJSON parse error for', key, e);
      return [];
    }
  }
  function setJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('setJSON error', key, e);
    }
  }

  // Single-object getters
  function getCurrentUser() {
    try {
      const cu = JSON.parse(localStorage.getItem('currentUser') || 'null');
      if (cu && (cu.id || cu.phone)) return cu;
    } catch (e) { /* ignore */ }
    // fallback: users array with active flag
    const users = getJSON('users');
    const active = users.find(u => u.active);
    if (active) return active;
    return null;
  }

  // Ensure arrays exist
  function ensureKeyArr(k) { if (!localStorage.getItem(k)) setJSON(k, []); }

  /* ============================
     Regions data (original)
     ============================ */
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

  /* ============================
     DOM refs
     ============================ */
  const $ = (id) => document.getElementById(id);

  const refs = {
    adsList: $('adsList'),
    adForm: $('adForm'),
    viloyat: $('viloyat'),
    shahar: $('shahar'),
    yonalish: $('yonalish'),
    sana: $('sana'),
    vaqt: $('vaqt'),
    telefon: $('telefon'),

    editModal: $('editModal'),
    closeEdit: $('closeEdit'),
    editForm: $('editForm'),
    editYonalish: $('editYonalish'),
    editSana: $('editSana'),
    editVaqt: $('editVaqt'),

    profileName: $('usernameDisplay'),
    logoutBtn: $('logoutBtn'),

    profileIsm: $('profilIsm'),
    profileTel: $('profilTel'),
    profileCount: $('profilCount'),

    tabBtns: document.querySelectorAll('.tab-btn'),
    tabs: document.querySelectorAll('.tab-content'),

    // viewProfile modal elements (from HTML previously)
    viewProfileModal: $('viewProfileModal'),
    vpName: $('vpName'),
    vpPhone: $('vpPhone'),
    vpRatingSummary: $('vpRatingSummary'),
    vpAdsList: $('vpAdsList'),
    vpRateSection: $('vpRateSection'),
  };

  // Defensive: if some refs missing, create no-op to avoid runtime errors
  Object.keys(refs).forEach(k => { if (refs[k] === null || refs[k] === undefined) refs[k] = null; });

  /* ============================
     Initialization helpers
     ============================ */
  function ensureInitialStorage() {
    ['users','driverAds','passengerAds','profileRatings','userAdStatuses'].forEach(ensureKeyArr);
  }

  /* ============================
     Mock login (for testing)
     ============================ */
  function loginMock() {
    let users = getJSON('users');
    if (!users || users.length === 0) {
      users = [
        { id: 'u1', phone: '998901112233', name: 'Ali', active: true },
        { id: 'u2', phone: '998909998877', name: 'Vali', active: false },
        { id: 'u3', phone: '998971234567', name: 'Dilor', active: false }
      ];
      setJSON('users', users);
    }
    // set currentUser to first
    const currentUser = users[0];
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    // sample ads if none
    const driverAds = getJSON('driverAds');
    const passengerAds = getJSON('passengerAds');
    if ((driverAds && driverAds.length) === 0 && (passengerAds && passengerAds.length) === 0) {
      const now = new Date();
      const d = [
        { id: 'driver_1', phone: users[0].phone, ownerId: users[0].id, type:'driver', fromRegion:'Toshkent', fromDistrict:'Chilonzor', toRegion:'Samarqand', toDistrict:'Ishtixon', price:'25000', comment:'Haydovchi 24/7', status:'approved', createdAt: new Date(now.getTime()-86400000*2).toLocaleString() },
        { id: 'driver_2', phone: users[1].phone, ownerId: users[1].id, type:'driver', fromRegion:'Toshkent', fromDistrict:'Mirzo Ulug\'bek', toRegion:'Namangan', toDistrict:'Pop', price:'80000', comment:'Katta yukga bo\'sh joy', status:'pending', createdAt: new Date(now.getTime()-86400000*10).toLocaleString() }
      ];
      const p = [
        { id: 'pass_1', phone: users[2].phone, ownerId: users[2].id, type:'passenger', fromRegion:'Samarqand', fromDistrict:'Urgut', toRegion:'Toshkent', toDistrict:'Bektemir', price:'30000', comment:'Iltimos tez', status:'rejected', createdAt: new Date(now.getTime()-86400000*1).toLocaleString() },
        { id: 'pass_2', phone: users[0].phone, ownerId: users[0].id, type:'passenger', fromRegion:'Namangan', fromDistrict:'To\'raqo\'rg\'on', toRegion:'Farg\'ona', toDistrict:'Qo\'qon', price:'20000', comment:'Yuk ham olaman', status:'pending', createdAt: new Date(now.getTime()-86400000*4).toLocaleString() }
      ];
      setJSON('driverAds', d);
      setJSON('passengerAds', p);
    }
    renderAll();
    alert('loginMock: demo users & ads created. Current user set to first demo user.');
  }

  /* ============================
     Normalize old ads (compatibility)
     ============================ */
  function normalizeOldAds() {
    ['driverAds','passengerAds'].forEach(k => {
      const arr = getJSON(k);
      let changed = false;
      arr.forEach(ad => {
        if (!('comment' in ad)) { ad.comment = ''; changed = true; }
        if (!ad.ownerId && ad.phone) { // map phone to user id if exists
          const u = (getJSON('users')||[]).find(x => String(x.phone) === String(ad.phone));
          if (u) { ad.ownerId = u.id; changed = true; }
        }
        if (!ad.createdAt) { ad.createdAt = new Date().toLocaleString(); changed = true; }
      });
      if (changed) setJSON(k, arr);
    });
  }

  /* ============================
     UI helpers
     ============================ */
  function escapeHtml(str) {
    if (str === undefined || str === null) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,"&#039;");
  }

  function formatDateLocale(d) {
    if (!d) return '—';
    try {
      const dt = parseAdDate(d) || new Date(d);
      return dt.toLocaleString();
    } catch (e) { return String(d); }
  }

  /* ============================
     Parse dates robustly
     ============================ */
  function parseAdDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
    // support dd.mm.yyyy hh:mm
    const m = String(dateStr).match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
    if (m) {
      const day = parseInt(m[1],10), mon = parseInt(m[2],10)-1, yr = parseInt(m[3],10);
      const hh = m[4] ? parseInt(m[4],10) : 0, mm = m[5] ? parseInt(m[5],10) : 0;
      return new Date(yr,mon,day,hh,mm);
    }
    return null;
  }

  /* ============================
     Load region selects
     ============================ */
  function loadRegionsToSelects() {
    const ids = ['fromRegion','toRegion','filterFromRegion','filterToRegion','viloyat'];
    ids.forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      // preserve current value
      const cur = sel.value || '';
      sel.innerHTML = '<option value="">Viloyatni tanlang</option>';
      Object.keys(regions).forEach(r => {
        const o = document.createElement('option'); o.value = r; o.textContent = r; sel.appendChild(o);
      });
      if (cur) sel.value = cur;
    });
    // If page has shahar select with id 'shahar' and region 'viloyat' exists, populate
    const vil = document.getElementById('viloyat');
    const sh = document.getElementById('shahar');
    if (vil && sh) {
      vil.addEventListener('change', () => {
        const region = vil.value;
        sh.innerHTML = '<option value="">Tumanni tanlang</option>';
        if (region && regions[region]) {
          regions[region].forEach(d => {
            const opt = document.createElement('option'); opt.value = d; opt.textContent = d; sh.appendChild(opt);
          });
        }
      });
    }

    // load filters also
    const fFrom = document.getElementById('filterFromRegion');
    const fTo = document.getElementById('filterToRegion');
    if (fFrom) fFrom.addEventListener('change', ()=> updateFilterDistricts('filterFrom'));
    if (fTo) fTo.addEventListener('change', ()=> updateFilterDistricts('filterTo'));
  }

  function updateDistricts(prefix) {
    // prefix: 'from' or 'to' (based on HTML ids)
    const regionSel = document.getElementById(prefix + 'Region');
    const districtSel = document.getElementById(prefix + 'District');
    if (!regionSel || !districtSel) return;
    const region = regionSel.value;
    districtSel.innerHTML = '<option value="">Tumanni tanlang</option>';
    if (region && regions[region]) {
      regions[region].forEach(d => {
        const o = document.createElement('option'); o.value = d; o.textContent = d; districtSel.appendChild(o);
      });
    }
  }

  function updateFilterDistricts(prefix) {
    // prefix 'filterFrom' or 'filterTo' -> maps to filterFromRegion/filterFromDistrict etc
    const regionSelId = prefix + 'Region';
    const districtSelId = prefix + 'District';
    const regionSel = document.getElementById(regionSelId);
    const districtSel = document.getElementById(districtSelId);
    if (!regionSel || !districtSel) return;
    districtSel.innerHTML = '<option value="">Tanlang</option>';
    const region = regionSel.value;
    if (region && regions[region]) {
      regions[region].forEach(d => districtSel.add(new Option(d,d)));
    }
    renderAdsList();
  }

  /* ============================
     Render ads list (main)
     ============================ */
  function renderAdsList() {
    normalizeOldAds();
    const cu = getCurrentUser();
    let viewingProfile = window.viewingProfile || null;
    if (!viewingProfile && cu) viewingProfile = (cu.id || cu.phone);

    // gather filters
    const q = (document.getElementById('searchAdInput') ? document.getElementById('searchAdInput').value : '') .toLowerCase().trim();
    const typeFilter = (document.getElementById('filterType') ? document.getElementById('filterType').value : 'all');
    const statusFilter = (document.getElementById('filterStatus') ? document.getElementById('filterStatus').value : 'all');
    const fFromRegion = (document.getElementById('filterFromRegion') ? document.getElementById('filterFromRegion').value : '');
    const fFromDistrict = (document.getElementById('filterFromDistrict') ? document.getElementById('filterFromDistrict').value : '');
    const fToRegion = (document.getElementById('filterToRegion') ? document.getElementById('filterToRegion').value : '');
    const fToDistrict = (document.getElementById('filterToDistrict') ? document.getElementById('filterToDistrict').value : '');

    const driver = getJSON('driverAds') || [];
    const passenger = getJSON('passengerAds') || [];
    let all = [...driver.map(a=>({...a, type:'driver'})), ...passenger.map(a=>({...a, type:'passenger'}))];

    // filter by viewingProfile or currentUser if not viewing specific
    if (window.viewingProfile) {
      all = all.filter(a => String(a.ownerId || a.phone) === String(window.viewingProfile) || String(a.phone) === String(window.viewingProfile));
    } else {
      const cu2 = getCurrentUser();
      if (cu2) all = all.filter(a => String(a.phone) === String(cu2.phone) || String(a.ownerId) === String(cu2.id));
    }

    if (typeFilter !== 'all') all = all.filter(a => a.type === typeFilter);
    if (statusFilter !== 'all') all = all.filter(a => ((a.status||'pending') === statusFilter));
    if (fFromRegion) all = all.filter(a => (a.fromRegion||'').includes(fFromRegion));
    if (fFromDistrict) all = all.filter(a => (a.fromDistrict||'').includes(fFromDistrict));
    if (fToRegion) all = all.filter(a => (a.toRegion||'').includes(fToRegion));
    if (fToDistrict) all = all.filter(a => (a.toDistrict||'').includes(fToDistrict));
    if (q) all = all.filter(a => (String(a.phone||'') + String(a.id||'') + String(a.comment||'') + String(a.fromRegion||'') + String(a.toRegion||'')).toLowerCase().includes(q));

    // sort by createdAt desc
    all.sort((a,b)=> {
      const da = parseAdDate(a.createdAt) || new Date(0);
      const db = parseAdDate(b.createdAt) || new Date(0);
      return db - da;
    });

    const container = document.getElementById('myAds') || refs.adsList || null;
    if (!container) return;

    container.innerHTML = '';
    if (!all.length) {
      const p = document.createElement('p'); p.className = 'no-ads'; p.textContent = "Hozircha e’lonlar yo‘q.";
      container.appendChild(p);
      updateProfileSummary();
      return;
    }

    all.forEach(ad => {
      const card = document.createElement('div');
      card.className = 'ad-card';

      // status class and text mapping
      let statusClass = 'pending';
      let statusText = 'Kutilmoqda';
      if (ad.status === 'approved' || ad.status === 'Tasdiqlangan') { statusClass = 'approved'; statusText = 'Tasdiqlangan'; }
      else if (ad.status === 'rejected' || ad.status === 'Rad etilgan') { statusClass = 'rejected'; statusText = 'Rad etilgan'; }
      else { statusClass = 'pending'; statusText = (ad.status || 'Kutilmoqda'); }

      const from = (ad.fromRegion || ad.from || '') + (ad.fromDistrict ? ' / ' + ad.fromDistrict : '');
      const to = (ad.toRegion || ad.to || '') + (ad.toDistrict ? ' / ' + ad.toDistrict : '');
      const created = ad.createdAt ? formatDateLocale(ad.createdAt) : '—';

      const header = document.createElement('div'); header.className = 'ad-header';
      const h3 = document.createElement('h3'); h3.textContent = `${from} → ${to}`;
      const st = document.createElement('div'); st.className = 'status ' + statusClass; st.textContent = statusText;
      header.appendChild(h3); header.appendChild(st);

      const body = document.createElement('div'); body.className = 'ad-body';
      const priceP = document.createElement('p'); priceP.innerHTML = `<strong>Narx:</strong> ${escapeHtml(ad.price || 'Ko‘rsatilmagan')} so'm`;
      const phoneP = document.createElement('p'); phoneP.innerHTML = `<strong>Telefon:</strong> ${escapeHtml(ad.phone || 'Noma\'lum')}`;
      const dateP = document.createElement('p'); dateP.className = 'date-info'; dateP.textContent = `Joylangan: ${created}`;
      const commentP = document.createElement('p'); commentP.innerHTML = `<strong>Izoh:</strong> ${escapeHtml(ad.comment || '')}`;

      body.appendChild(priceP);
      body.appendChild(phoneP);
      body.appendChild(dateP);
      if (ad.comment) body.appendChild(commentP);

      const actions = document.createElement('div'); actions.className = 'ad-actions';

      const cu2 = getCurrentUser();
      const isOwner = cu2 && (String(cu2.phone) === String(ad.phone) || String(cu2.id) === String(ad.ownerId));
      if (isOwner) {
        // owner actions: edit (if not approved), delete, inline edit
        const editBtn = document.createElement('button'); editBtn.className = 'btn edit'; editBtn.textContent = 'Tahrirlash';
        editBtn.onclick = function () { openEditModal(ad); };
        if (statusClass === 'approved') editBtn.disabled = true;
        const inlineBtn = document.createElement('button'); inlineBtn.className = 'btn'; inlineBtn.textContent = 'Inline tahrir';
        inlineBtn.onclick = function () { startInlineEdit(ad); };
        const delBtn = document.createElement('button'); delBtn.className = 'btn delete'; delBtn.textContent = "O'chirish";
        delBtn.onclick = function () { deleteAd(ad.id, ad.type); };

        actions.appendChild(inlineBtn);
        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
      } else {
        // not owner: view profile & contact
        const viewBtn = document.createElement('button'); viewBtn.className = 'btn'; viewBtn.textContent = "Profilni ko'rish";
        viewBtn.onclick = function () { openViewProfile(ad.ownerId || ad.phone); };
        const contactBtn = document.createElement('button'); contactBtn.className = 'btn'; contactBtn.textContent = "Telefon";
        contactBtn.onclick = function () { contactOwner(ad.phone); };
        actions.appendChild(viewBtn); actions.appendChild(contactBtn);
      }

      card.appendChild(header);
      card.appendChild(body);
      card.appendChild(actions);
      container.appendChild(card);
    });

    updateProfileSummary();
  }

  /* ============================
     Inline edit (stores temp state in localStorage.tempInlineEdit)
     ============================ */
  function startInlineEdit(ad) {
    // Save to tempInlineEdit (type, id)
    const tmp = { type: ad.type, id: ad.id };
    localStorage.setItem('tempInlineEdit', JSON.stringify(tmp));
    // Render a simple prompt inline by re-rendering list with input for that ad
    renderAdsListWithInline();
  }

  function renderAdsListWithInline() {
    // Reuse renderAdsList but when tempInlineEdit matches show inline inputs
    const tmp = JSON.parse(localStorage.getItem('tempInlineEdit') || 'null');
    normalizeOldAds();

    const cu = getCurrentUser();
    let all = [...(getJSON('driverAds')||[]).map(a=>({...a,type:'driver'})), ...(getJSON('passengerAds')||[]).map(a=>({...a,type:'passenger'}))];

    if (window.viewingProfile) {
      all = all.filter(a => String(a.ownerId || a.phone) === String(window.viewingProfile) || String(a.phone) === String(window.viewingProfile));
    } else {
      if (cu) all = all.filter(a => String(a.phone) === String(cu.phone) || String(a.ownerId) === String(cu.id));
    }

    const container = document.getElementById('myAds') || refs.adsList;
    if (!container) return;
    container.innerHTML = '';
    if (all.length === 0) { container.innerHTML = '<p class="no-ads">Hozircha e’lonlar yo‘q.</p>'; return; }

    all.forEach(ad => {
      const card = document.createElement('div'); card.className = 'ad-card';
      const header = document.createElement('div'); header.className = 'ad-header';
      const h3 = document.createElement('h3'); h3.textContent = `${(ad.fromRegion||'')} → ${(ad.toRegion||'')}`;
      header.appendChild(h3);
      card.appendChild(header);

      const body = document.createElement('div'); body.className = 'ad-body';
      body.innerHTML = `<p><strong>Narx:</strong> ${escapeHtml(ad.price||'')}</p><p><strong>Telefon:</strong> ${escapeHtml(ad.phone||'')}</p>`;
      card.appendChild(body);

      const actions = document.createElement('div'); actions.className = 'ad-actions';
      // if tmp matches, show inline form
      if (tmp && tmp.type === ad.type && String(tmp.id) === String(ad.id)) {
        const input = document.createElement('input'); input.type = 'number'; input.value = ad.price || '';
        input.style.marginRight = '8px';
        const saveBtn = document.createElement('button'); saveBtn.className = 'btn edit'; saveBtn.textContent = 'Saqlash';
        saveBtn.onclick = function () { saveInlineAdmin(ad.type, ad.id, input.value); };
        const cancelBtn = document.createElement('button'); cancelBtn.className = 'btn'; cancelBtn.textContent = 'Bekor';
        cancelBtn.onclick = function () { localStorage.removeItem('tempInlineEdit'); renderAdsList(); };
        actions.appendChild(input); actions.appendChild(saveBtn); actions.appendChild(cancelBtn);
      } else {
        const inlineBtn = document.createElement('button'); inlineBtn.className = 'btn'; inlineBtn.textContent = 'Inline tahrir';
        inlineBtn.onclick = function () { startInlineEdit(ad); };
        actions.appendChild(inlineBtn);
      }
      card.appendChild(actions);
      container.appendChild(card);
    });
  }

  function saveInlineAdmin(type, id, newPrice) {
    const key = type === 'driver' ? 'driverAds' : 'passengerAds';
    const arr = getJSON(key);
    const idx = arr.findIndex(a => String(a.id) === String(id));
    if (idx === -1) return alert('E\'lon topilmadi');
    if (!newPrice) return alert('Narx kiriting');
    arr[idx].price = String(newPrice).trim();
    arr[idx].edited = true;
    setJSON(key, arr);
    localStorage.removeItem('tempInlineEdit');
    renderAdsList();
    alert('E\'lon yangilandi (inline).');
  }

  /* ============================
     Edit modal (full edit)
     ============================ */
  let editingAdMeta = null; // {id, type}

  function openEditModal(ad) {
    // prefill modal from ad
    if (!refs.editModal) return;
    editingAdMeta = { id: ad.id, type: ad.type };
    refs.editYonalish.value = ad.fromRegion ? `${ad.fromRegion} - ${ad.toRegion}` : (ad.from || '');
    // Attempt to parse created date into date/time fields if present
    try {
      const dt = parseAdDate(ad.createdAt) || new Date();
      // set date YYYY-MM-DD and time HH:MM
      refs.editSana.value = dt.toISOString().slice(0,10);
      refs.editVaqt.value = dt.toTimeString().slice(0,5);
    } catch (e) {
      refs.editSana.value = ''; refs.editVaqt.value = '';
    }
    refs.editModal.classList.add('active');
  }

  if (refs.closeEdit) refs.closeEdit.addEventListener('click', ()=> {
    refs.editModal.classList.remove('active'); editingAdMeta = null;
  });

  if (refs.editForm) refs.editForm.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (!editingAdMeta) return;
    const newY = refs.editYonalish.value.trim();
    const newS = refs.editSana.value;
    const newV = refs.editVaqt.value;
    const key = editingAdMeta.type === 'driver' ? 'driverAds' : 'passengerAds';
    const arr = getJSON(key);
    const idx = arr.findIndex(a => String(a.id) === String(editingAdMeta.id));
    if (idx === -1) { alert('E\'lon topilmadi'); return; }
    // Update fields: we only have fields mapped; preserve rest
    arr[idx].fromRegion = (newY.split('-')[0] || arr[idx].fromRegion).trim();
    arr[idx].toRegion = (newY.split('-')[1] || arr[idx].toRegion).trim();
    arr[idx].createdAt = (newS && newV) ? `${newS} ${newV}` : arr[idx].createdAt;
    arr[idx].edited = true;
    setJSON(key, arr);
    editingAdMeta = null;
    refs.editModal.classList.remove('active');
    renderAdsList();
    alert('E\'lon saqlandi.');
  });

  /* ============================
     Delete ad
     ============================ */
  function deleteAd(id, type) {
    if (!confirm('Haqiqatan o\'chirilsinmi?')) return;
    const key = type === 'driver' ? 'driverAds' : 'passengerAds';
    let arr = getJSON(key);
    arr = arr.filter(a => String(a.id) !== String(id));
    setJSON(key, arr);
    renderAdsList();
  }

  /* ============================
     Add ad (from form)
     ============================ */
  function addAd() {
    const cu = getCurrentUser();
    if (!cu) { alert('Avval tizimga kiring!'); return; }
    const type = document.getElementById('adType') ? document.getElementById('adType').value : (document.getElementById('adType') ? document.getElementById('adType').value : null);
    // In provided HTML the add form fields are 'adType','fromRegion','fromDistrict','toRegion','toDistrict','price','adComment'
    const at = document.getElementById('adType');
    const fromRegion = document.getElementById('fromRegion') ? document.getElementById('fromRegion').value.trim() : '';
    const fromDistrict = document.getElementById('fromDistrict') ? document.getElementById('fromDistrict').value.trim() : '';
    const toRegion = document.getElementById('toRegion') ? document.getElementById('toRegion').value.trim() : '';
    const toDistrict = document.getElementById('toDistrict') ? document.getElementById('toDistrict').value.trim() : '';
    const price = document.getElementById('price') ? document.getElementById('price').value.trim() : '';
    const comment = document.getElementById('adComment') ? document.getElementById('adComment').value.trim() : '';
    const adTypeVal = at ? at.value : (type || 'driver');

    if (!adTypeVal || !fromRegion || !toRegion) {
      alert('Iltimos yo‘nalish ma\'lumotlarini to‘ldiring!');
      return;
    }
    if (!price || isNaN(Number(price))) {
      alert('Iltimos to‘g‘ri narx kiriting!');
      return;
    }

    const key = adTypeVal === 'driver' ? 'driverAds' : 'passengerAds';
    const ads = getJSON(key);
    const id = `${adTypeVal}_${Date.now()}_${Math.floor(Math.random()*1000)}`;
    const newAd = {
      id,
      phone: cu.phone,
      ownerId: cu.id || cu.phone,
      ownerName: cu.name || '',
      type: adTypeVal,
      fromRegion, fromDistrict, toRegion, toDistrict,
      price: String(price),
      comment: comment || '',
      status: 'pending',
      createdAt: new Date().toLocaleString()
    };
    ads.push(newAd);
    setJSON(key, ads);

    // UI updates
    renderAdsList();
    alert('✅ E’lon joylandi (Admin tasdiqlashi kutilmoqda).');
    // clear form (if exists with those ids)
    const adFormEl = document.getElementById('adForm') || null;
    if (adFormEl) adFormEl.reset();
  }

  // If the HTML used an older simpler add form (viloyat/shahar/yonalish/sana/vaqt/telefon),
  // we also support that: the form in the larger HTML uses 'viloyat','shahar','yonalish','sana','vaqt','telefon'
  function addAdLegacyFromViloyatForm(ev) {
    if (ev) ev.preventDefault();
    const cu = getCurrentUser();
    if (!cu) { alert('Avval tizimga kiring!'); return; }
    const vil = document.getElementById('viloyat') ? document.getElementById('viloyat').value.trim() : '';
    const sh = document.getElementById('shahar') ? document.getElementById('shahar').value.trim() : '';
    const yon = document.getElementById('yonalish') ? document.getElementById('yonalish').value.trim() : '';
    const sana = document.getElementById('sana') ? document.getElementById('sana').value : '';
    const vaqt = document.getElementById('vaqt') ? document.getElementById('vaqt').value : '';
    const tel = document.getElementById('telefon') ? document.getElementById('telefon').value.trim() : '';

    if (!vil || !sh || !yon || !sana || !vaqt || !tel) {
      alert('Iltimos barcha maydonlarni to‘ldiring!');
      return;
    }

    // default to passenger ad type for this legacy form
    const key = 'passengerAds';
    const ads = getJSON(key);
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
    alert('E\'lon joylandi (legacy form)');
    renderAdsList();
    // clear legacy form
    if (document.getElementById('adForm')) document.getElementById('adForm').reset();
  }

  /* ============================
     Edit ad helper used by earlier implementation (prompt style)
     ============================ */
  function editAd(id, type) {
    const key = type === 'driver' ? 'driverAds' : 'passengerAds';
    const ads = getJSON(key);
    const ad = ads.find(a => String(a.id) === String(id));
    if (!ad) return;
    if (ad.edited) { alert('❗ Ushbu e\'lon avval tahrirlangan.'); return; }
    const newPrice = prompt('Yangi narxni kiriting:', ad.price || '');
    if (newPrice === null) return;
    ad.price = String(newPrice).trim();
    ad.edited = true;
    setJSON(key, ads);
    renderAdsList();
    alert('✏️ E\'lon yangilandi.');
  }

  /* ============================
     Contact owner
     ============================ */
  function contactOwner(phone) {
    if (!phone) { alert('Telefon raqam mavjud emas'); return; }
    try {
      // try to open tel: link in supported environment
      const a = document.createElement('a'); a.href = 'tel:' + phone;
      // in many desktops this will not do anything but show link; we also show alert
      a.click();
    } catch (e) { /* ignore */ }
    alert(`Telefon: ${phone} — qo'ng'iroq qiling yoki raqamni nusxa oling.`);
  }

  /* ============================
     View profile modal & rating
     ============================ */
  function openViewProfile(idOrPhone) {
    const users = getJSON('users') || [];
    let user = users.find(u => String(u.id) === String(idOrPhone) || String(u.phone) === String(idOrPhone));
    if (!user) {
      // fallback: find ad owner
      const ads = [...getJSON('driverAds'), ...getJSON('passengerAds')];
      const a = ads.find(x => String(x.ownerId) === String(idOrPhone) || String(x.phone) === String(idOrPhone));
      if (a) user = { id: a.ownerId || a.phone, phone: a.phone, name: a.ownerName || a.phone };
    }
    if (!user) return alert('Foydalanuvchi topilmadi');
    window.viewingProfile = user.id || user.phone;

    if (refs.vpName) refs.vpName.textContent = user.name || 'Foydalanuvchi';
    if (refs.vpPhone) refs.vpPhone.textContent = user.phone || '—';

    const ratings = getRatingsForProfile(user.id || user.phone);
    const avg = computeAverage(ratings);
    if (refs.vpRatingSummary) refs.vpRatingSummary.innerHTML = `<strong>${avg>0 ? avg + ' / 5' : 'Hozircha baho yo‘q'}</strong> — ${ratings.length} ta baho`;

    // list ads
    const vpAds = [...getJSON('driverAds'), ...getJSON('passengerAds')].filter(a => String(a.ownerId) === String(user.id) || String(a.phone) === String(user.phone));
    if (refs.vpAdsList) {
      if (!vpAds.length) refs.vpAdsList.innerHTML = '<p class="small">Ushbu foydalanuvchining e\'lonlari mavjud emas.</p>';
      else {
        refs.vpAdsList.innerHTML = vpAds.map(a => {
          const created = a.createdAt ? (parseAdDate(a.createdAt) ? parseAdDate(a.createdAt).toLocaleString() : a.createdAt) : '';
          return `<div style="padding:6px;border-bottom:1px solid #eee;"><b>${a.type === 'driver'? 'Haydovchi' : 'Yo\'lovchi'}</b> · ${escapeHtml(a.fromRegion||'')} → ${escapeHtml(a.toRegion||'')} · ${escapeHtml(a.price||'')} so'm<br><small class="small">${escapeHtml(created)}</small></div>`;
        }).join('');
      }
    }

    // rating input area
    const cur = getCurrentUser();
    if (!refs.vpRateSection) return openModalViewProfile();
    refs.vpRateSection.innerHTML = '';
    if (!cur) {
      refs.vpRateSection.innerHTML = '<div class="small">Baholash uchun avval tizimga kiring.</div>';
    } else if (String(cur.id) === String(user.id) || String(cur.phone) === String(user.phone)) {
      refs.vpRateSection.innerHTML = '<div class="small">Siz o\'zingizni baholay olmaysiz.</div>';
    } else {
      const ratingsStore = getProfileRatingsStore();
      const existing = (ratingsStore.find(e=>String(e.phone)===String(user.id)) || {ratings:[]}).ratings || [];
      const already = existing.some(r => String(r.raterPhone) === String(cur.phone));
      if (already) refs.vpRateSection.innerHTML = '<div class="small">Siz allaqachon bu foydalanuvchini baholagansiz.</div>';
      else {
        refs.vpRateSection.innerHTML = `
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
        // attach handler
        setTimeout(()=> {
          const btn = document.getElementById('vpSubmitRatingBtn');
          if (btn) btn.addEventListener('click', ()=> submitProfileRating(user.id || user.phone));
        }, 50);
      }
    }
    openModalViewProfile();
  }

  function openModalViewProfile() {
    if (!refs.viewProfileModal) return;
    refs.viewProfileModal.style.display = 'flex';
  }
  function closeViewProfile() {
    if (!refs.viewProfileModal) return;
    refs.viewProfileModal.style.display = 'none';
  }

  // profile ratings store
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
  function computeAverage(ratings) {
    if (!ratings || ratings.length === 0) return 0;
    const s = ratings.reduce((sum, r) => sum + (Number(r.stars) || 0), 0);
    return +(s / ratings.length).toFixed(2);
  }

  function submitProfileRating(profileId) {
    const cur = getCurrentUser();
    if (!cur) { alert('Baholash uchun tizimga kiring!'); return; }
    const starsEl = document.getElementById('vpRatingStars');
    const textEl = document.getElementById('vpRatingText');
    const stars = starsEl ? Number(starsEl.value) : 5;
    const text = textEl ? textEl.value.trim() : '';
    const existing = getRatingsForProfile(profileId);
    if (existing.some(r => String(r.raterPhone) === String(cur.phone))) { alert('Siz allaqachon baho berdingiz'); return; }
    const r = { raterPhone: cur.phone, stars, text, date: new Date().toLocaleString() };
    addRatingForProfile(profileId, r);
    alert('✅ Baho saqlandi!');
    // rerender
    if (window.viewingProfile) openViewProfile(window.viewingProfile);
    // update header summary if own profile
    renderProfileHeaderForCurrent();
  }

  /* ============================
     Profile header / summary updates
     ============================ */
  function renderProfileHeaderForCurrent() {
    const cu = getCurrentUser();
    if (!cu) {
      if (refs.profileName) refs.profileName.textContent = 'Foydalanuvchi';
      if (refs.profileIsm) refs.profileIsm.textContent = '';
      if (refs.profileTel) refs.profileTel.textContent = '';
      if (refs.profileCount) refs.profileCount.textContent = '0';
      return;
    }
    if (refs.profileName) refs.profileName.textContent = cu.name || (cu.phone || 'Foydalanuvchi');
    if (refs.profileIsm) refs.profileIsm.textContent = cu.name || '';
    if (refs.profileTel) refs.profileTel.textContent = cu.phone || '';
    // count ads
    const driver = getJSON('driverAds') || []; const passenger = getJSON('passengerAds') || [];
    const userAds = [...driver, ...passenger].filter(a => String(a.ownerId) === String(cu.id) || String(a.phone) === String(cu.phone));
    if (refs.profileCount) refs.profileCount.textContent = String(userAds.length || 0);
  }

  function updateProfileSummary() {
    // called after rendering list; also ensure profile header reflects current viewing (if any)
    renderProfileHeaderForCurrent();
  }

  /* ============================
     Sync statuses (notify owner when admin changes)
     ============================ */
  function syncStatuses() {
    const cu = getCurrentUser();
    if (!cu) return;
    const driver = getJSON('driverAds') || [];
    const passenger = getJSON('passengerAds') || [];
    const userAds = [...driver, ...passenger].filter(a => String(a.ownerId) === String(cu.id) || String(a.phone) === String(cu.phone));
    const lastStatuses = JSON.parse(localStorage.getItem('userAdStatuses') || '{}');
    userAds.forEach(ad => {
      const prev = lastStatuses[ad.id];
      if (prev && prev !== ad.status) {
        if (ad.status === 'approved') alert(`✅ E'loningiz tasdiqlandi: ${ad.fromRegion || ad.from} → ${ad.toRegion || ad.to}`);
        else if (ad.status === 'rejected') alert(`❌ E'loningiz rad etildi: ${ad.fromRegion || ad.from} → ${ad.toRegion || ad.to}`);
      }
      lastStatuses[ad.id] = ad.status;
    });
    localStorage.setItem('userAdStatuses', JSON.stringify(lastStatuses));
  }

  /* ============================
     Logout
     ============================ */
  function logout() {
    localStorage.removeItem('currentUser');
    alert('Chiqdingiz.');
    location.reload();
  }

  // Attach logout to button
  if (refs.logoutBtn) refs.logoutBtn.addEventListener('click', logout);

  /* ============================
     Render helpers for legacy forms
     ============================ */
  // The provided HTML had various forms; binding them conditionally

  // If there is a modern 'adForm' (#adForm), attach its submit to addAd (new style)
  const adFormEl = document.getElementById('adForm');
  if (adFormEl) {
    // If adForm follows the newer fields (viloyat/shahar/yonalish/sana/vaqt/telefon)
    adFormEl.addEventListener('submit', function (ev) {
      ev.preventDefault();
      // detect if it's legacy layout (viloyat present)
      if (document.getElementById('viloyat')) {
        addAdLegacyFromViloyatForm();
      } else {
        // else assume modern multi-selects (adType/fromRegion/fromDistrict/toRegion/toDistrict/price/adComment)
        addAd();
      }
    });
  }

  // If earlier HTML had other add buttons (addAd button id), attach
  const addAdBtn = document.getElementById('addAdBtn');
  if (addAdBtn) addAdBtn.addEventListener('click', ()=> {
    const f = document.getElementById('addForm');
    if (f) f.style.display = (f.style.display === 'block') ? 'none' : 'block';
  });

  /* ============================
     Utility: render ads list with full features on load
     ============================ */
  function renderAll() {
    ensureInitialStorage();
    normalizeOldAds();
    loadRegionsToSelects();
    renderAdsList();
    renderProfileHeaderForCurrent();
  }

  /* ============================
     Event: tab switching (UI minor behavior)
     ============================ */
  function attachTabs() {
    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach(b => {
      b.addEventListener('click', () => {
        btns.forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        const target = b.getAttribute('data-tab');
        document.querySelectorAll('.tab-content').forEach(tc => {
          if (tc.id === target) tc.classList.add('active'); else tc.classList.remove('active');
        });
        // If switched to adsTab, re-render ads
        if (target === 'adsTab') renderAdsList();
      });
    });
  }

  /* ============================
     Misc: close view profile modal on click outside
     ============================ */
  (function attachModalClose() {
    document.addEventListener('click', function (ev) {
      // close edit modal by clicking outside content (modal has id editModal)
      const editM = document.getElementById('editModal');
      if (editM && editM.classList.contains('active') && ev.target === editM) editM.classList.remove('active');
      const vp = document.getElementById('viewProfileModal');
      if (vp && vp.style.display === 'flex' && ev.target === vp) vp.style.display = 'none';
    });
  })();

  /* ============================
     Expose debug & public functions
     ============================ */
  window._shahartaxi = window._shahartaxi || {};
  Object.assign(window._shahartaxi, {
    getDriverAds: ()=> getJSON('driverAds'),
    getPassengerAds: ()=> getJSON('passengerAds'),
    getUsers: ()=> getJSON('users'),
    getRatings: ()=> getProfileRatingsStore(),
    loginMock,
    renderAdsList,
    renderAll,
    addAd,
    addAdLegacyFromViloyatForm,
    editAd,
    deleteAd,
    openViewProfile,
    closeViewProfile,
    logout
  });

  /* ============================
     Bootstrap on DOMContentLoaded
     ============================ */
  document.addEventListener('DOMContentLoaded', function () {
    ensureInitialStorage();
    attachTabs();
    // If no current user but activeUserId exists, set it
    const activeId = localStorage.getItem('activeUserId');
    if (!localStorage.getItem('currentUser') && activeId) {
      const users = getJSON('users') || [];
      const u = users.find(x => String(x.id) === String(activeId));
      if (u) localStorage.setItem('currentUser', JSON.stringify(u));
    }

    // Bind edit modal close button if exists
    const closeBtn = document.getElementById('closeEdit');
    if (closeBtn) closeBtn.addEventListener('click', ()=> {
      const m = document.getElementById('editModal');
      if (m) m.classList.remove('active');
    });

    // Bind legacy add button if present
    const legacyAddBtn = document.querySelector('#addForm button[type="submit"], #addForm button');
    // (Handled by adForm submit for modern/legacy)

    // Show current profile and ads
    renderAll();
    // periodic sync for statuses (to detect admin changes)
    setInterval(syncStatuses, 5000);
  });

})();
