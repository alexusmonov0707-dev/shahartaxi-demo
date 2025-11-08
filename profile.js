/* profil.js
   To'liq ishlaydigan fayl — profilingiz sahifasi uchun barcha funksiyalar:
   - e'lonlar (driverAds / passengerAds) ro'yxati, filtrlash
   - yangi e'lon qo'shish (telefon validate: raqam)
   - inline tahrir (faqat 1 marta ruxsat, ad.edited flag)
   - o'chirish
   - createdAt parsing / eski formatlarni qo'llab-quvvatlash
   - izoh (comment) qo'shish / ko'rsatish
   - rating (profile) tizimi: profileRatings localStorage
   - sync va storage event handler
*/

(function () {
  // --- Helper utilities ---
  function $(id) { return document.getElementById(id); }

  function nowISO() { return (new Date()).toLocaleString(); }

  // Parse date string robustly (ISO or "DD.MM.YYYY[ HH:mm]")
  function parseAdDate(dateStr) {
    if (!dateStr) return null;
    // try JS Date parse for ISO-like strings
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
    // try dd.mm.yyyy hh:mm
    const m = String(dateStr).match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
    if (m) {
      const day = parseInt(m[1], 10);
      const month = parseInt(m[2], 10) - 1;
      const year = parseInt(m[3], 10);
      const hour = parseInt(m[4] || "0", 10);
      const minute = parseInt(m[5] || "0", 10);
      return new Date(year, month, day, hour, minute);
    }
    return null;
  }

  // safe stringify fallback
  function readJSON(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; } }
  function writeJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

  // Get ads, ensure older objects have comment property
  function getAdsObj() {
    const driver = readJSON('driverAds', []);
    const passenger = readJSON('passengerAds', []);
    // normalize comment and id if missing
    let changed = false;
    [ {arr: driver, key:'driver'}, {arr: passenger, key:'passenger'} ].forEach(group=>{
      group.arr.forEach((ad, i)=>{
        if (!('comment' in ad)) { ad.comment = ""; changed = true; }
        if (!ad.type) ad.type = group.key;
        if (!ad.id) { ad.id = `${group.key}_${Date.now()}_${i}`; changed = true; }
      });
    });
    if (changed) {
      writeJSON('driverAds', driver);
      writeJSON('passengerAds', passenger);
    }
    return { driver, passenger };
  }

  // --- UI population for regions/districts ---
  // If you have regions.js in project, it should define `regions` object.
  function loadRegionsUI() {
    const fromRegion = $('fromRegion'), toRegion = $('toRegion'), fFrom = $('filterFromRegion'), fTo = $('filterToRegion');
    [fromRegion, toRegion, fFrom, fTo].forEach(sel => {
      if (!sel) return;
      sel.innerHTML = "<option value=''>Viloyatni tanlang</option>";
    });
    if (typeof regions === 'object') {
      Object.keys(regions).forEach(r => {
        [fromRegion, toRegion, fFrom, fTo].forEach(sel=>{
          if (sel) sel.add(new Option(r, r));
        });
      });
    }
  }
  function updateDistricts(prefix) {
    const region = $(prefix + 'Region').value;
    const districtSelect = $(prefix + 'District');
    districtSelect.innerHTML = "<option value=''>Tumanni tanlang</option>";
    if (regions && regions[region]) regions[region].forEach(d => districtSelect.add(new Option(d, d)));
  }
  function updateFilterDistricts(prefix) {
    updateDistricts(prefix);
    applyFilters();
  }

  // --- Render Ads for current user ---
  function renderUserAds() {
    const { driver, passenger } = getAdsObj();
    const currentUser = readJSON('currentUser', null);
    const userPhone = (currentUser && currentUser.phone) ? String(currentUser.phone) : null;
    $('userPhone').textContent = userPhone ? `Telefon: ${userPhone}` : 'Telefon: not logged';

    let all = [...driver, ...passenger].filter(a => String(a.phone) === String(userPhone));

    // filters
    const typeFilter = $('typeFilter').value;
    const statusFilter = $('statusFilter').value;
    const fFromRegion = $('filterFromRegion').value;
    const fFromDistrict = $('filterFromDistrict').value;
    const fToRegion = $('filterToRegion').value;
    const fToDistrict = $('filterToDistrict').value;

    if (typeFilter !== 'all') all = all.filter(a => a.type === typeFilter);
    if (statusFilter !== 'all') all = all.filter(a => (a.status || 'pending') === statusFilter);
    if (fFromRegion) all = all.filter(a => (a.fromRegion || '').includes(fFromRegion));
    if (fFromDistrict) all = all.filter(a => (a.fromDistrict || '').includes(fFromDistrict));
    if (fToRegion) all = all.filter(a => (a.toRegion || '').includes(fToRegion));
    if (fToDistrict) all = all.filter(a => (a.toDistrict || '').includes(fToDistrict));

    const container = $('myAds');
    container.innerHTML = all.length ? "" : "<p>Hozircha e'lonlar yo'q.</p>";

    all.forEach(ad=>{
      const from = (ad.fromRegion ? ad.fromRegion + (ad.fromDistrict ? ` ${ad.fromDistrict}` : '') : (ad.from || '—'));
      const to = (ad.toRegion ? ad.toRegion + (ad.toDistrict ? ` ${ad.toDistrict}` : '') : (ad.to || '—'));
      const status = (ad.status || 'pending');
      const createdAt = ad.createdAt ? (parseAdDate(ad.createdAt) ? parseAdDate(ad.createdAt).toLocaleString() : ad.createdAt) : '—';
      const cls = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending';

      const div = document.createElement('div');
      div.className = `ad-box ${cls}`;
      div.innerHTML = `
        <div class="ad-meta"><b>Yo'nalish:</b> ${escapeHtml(from)} → ${escapeHtml(to)}</div>
        <div class="ad-meta"><b>Narx:</b> ${escapeHtml(String(ad.price || 'Ko‘rsatilmagan'))} so'm</div>
        <div class="ad-meta"><b>Telefon:</b> ${escapeHtml(String(ad.phone || 'Noma\'lum'))}</div>
        <div class="ad-meta"><b>Holat:</b> ${status === 'approved' ? '✅ Tasdiqlangan' : status === 'rejected' ? '❌ Rad etilgan' : '⏳ Kutilmoqda'}</div>
        <div class="ad-meta date-info">🕒 Joylangan: ${escapeHtml(createdAt)}</div>
        ${ad.comment ? `<div class="comment-box"><b>Izoh:</b> ${escapeHtml(ad.comment)}</div>` : ''}
      `;

      // actions: edit (disabled if approved or already edited), delete
      const actions = document.createElement('div');
      actions.className = 'actions';

      if (status !== 'approved' && !ad.edited) {
        const btnEdit = document.createElement('button');
        btnEdit.className = 'small btn-edit';
        btnEdit.textContent = '✏️ Tahrirlash';
        btnEdit.onclick = () => { startInlineEdit(ad.id, ad.type); };
        actions.appendChild(btnEdit);
      } else {
        const disabledBtn = document.createElement('button');
        disabledBtn.className = 'small';
        disabledBtn.style.background = '#ccc';
        disabledBtn.style.cursor = 'not-allowed';
        disabledBtn.textContent = '✏️ Tahrirlash';
        actions.appendChild(disabledBtn);
      }

      const btnDelete = document.createElement('button');
      btnDelete.className = 'small btn-delete';
      btnDelete.textContent = '🗑️ O‘chirish';
      btnDelete.onclick = ()=> { deleteAd(ad.id, ad.type); };
      actions.appendChild(btnDelete);

      div.appendChild(actions);
      container.appendChild(div);
    });
  }

  // Escape HTML helper
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  // --- Add Ad ---
  function addAd() {
    const type = $('adType').value;
    const fromRegion = $('fromRegion').value.trim();
    const fromDistrict = $('fromDistrict').value.trim();
    const toRegion = $('toRegion').value.trim();
    const toDistrict = $('toDistrict').value.trim();
    const price = $('price').value.trim();
    const comment = $('adComment').value.trim();
    const adPhone = $('adPhone').value.trim();

    // phone validation: must be digits and length 9..13 (simple)
    if (!/^\d{9,13}$/.test(adPhone)) {
      alert('Telefon formati noto\'g\'ri. Faqat raqamlar kiriting (masalan: 998901234567 yoki 901234567).');
      return;
    }

    if (!type || !fromRegion || !toRegion) { alert('Iltimos yo\'nalishni to\'liq kiriting'); return; }

    const key = type === 'driver' ? 'driverAds' : 'passengerAds';
    const ads = readJSON(key, []);

    const newAd = {
      id: `${type}_${Date.now()}`,
      phone: adPhone,
      fromRegion, fromDistrict,
      toRegion, toDistrict,
      price: price || '',
      comment: comment || '',
      type,
      status: 'pending',
      createdAt: new Date().toLocaleString()
    };
    ads.push(newAd);
    writeJSON(key, ads);
    alert('✅ E\'lon joylandi (Admin tasdiqlashi kutilmoqda).');
    // clear inputs
    $('price').value = '';
    $('adComment').value = '';
    $('adPhone').value = '';
    renderUserAds();
    // optionally update admin stats if admin page reads same localStorage
    localStorage.setItem('lastChange', Date.now());
  }

  // --- Inline Edit (only one-time allowed) ---
  function startInlineEdit(id, type) {
    // find ad and present inline inputs in the ad-box replaced actions
    const key = type === 'driver' ? 'driverAds' : 'passengerAds';
    const ads = readJSON(key, []);
    const idx = ads.findIndex(a => String(a.id) === String(id));
    if (idx === -1) return;
    const ad = ads[idx];
    if (ad.edited) { alert('❗ Ushbu e\'lon allaqachon tahrirlangan — yana tahrirlash mumkin emas.'); return; }
    // find DOM node for this ad (by matching createdAt+phone+from maybe)
    // Simpler: prompt for new price and comment inline
    const newPrice = prompt('Yangi narxni kiriting (bo\'sh qoldirsangiz bekor qilinadi):', ad.price || '');
    if (newPrice === null) return; // cancel
    if (String(newPrice).trim() === '') { alert('Narx kiritilmadi. Bekor qilindi.'); return; }
    // save
    ad.price = newPrice.trim();
    ad.edited = true;
    // mark that it was edited once (no further inline edits)
    ads[idx] = ad;
    writeJSON(key, ads);
    alert('✏️ E\'lon tahrirlandi (inline).');
    renderUserAds();
    localStorage.setItem('lastChange', Date.now());
  }

  // --- Edit via prompt (older method) ---
  function editAd(id, type) {
    const key = type === 'driver' ? 'driverAds' : 'passengerAds';
    const ads = readJSON(key, []);
    const idx = ads.findIndex(a => String(a.id) === String(id));
    if (idx === -1) return;
    const ad = ads[idx];
    if (ad.edited) { alert('❗ Ushbu e\'lon allaqachon tahrirlangan.'); return; }
    const newPrice = prompt('Yangi narxni kiriting:', ad.price || '');
    if (newPrice === null) return;
    ad.price = newPrice.trim();
    ad.edited = true;
    ads[idx] = ad;
    writeJSON(key, ads);
    renderUserAds();
    localStorage.setItem('lastChange', Date.now());
  }

  // --- Delete Ad ---
  function deleteAd(id, type) {
    if (!confirm('E\'lonni o\'chirmoqchimisiz?')) return;
    const key = type === 'driver' ? 'driverAds' : 'passengerAds';
    let ads = readJSON(key, []);
    ads = ads.filter(a => String(a.id) !== String(id));
    writeJSON(key, ads);
    renderUserAds();
    localStorage.setItem('lastChange', Date.now());
  }

  // --- Filters helpers ---
  function applyFilters() { renderUserAds(); }
  function clearFilters() {
    $('typeFilter').value = 'all';
    $('statusFilter').value = 'all';
    $('filterFromRegion').value = '';
    $('filterFromDistrict').innerHTML = '<option value="">Qayerdan (tuman)</option>';
    $('filterToRegion').value = '';
    $('filterToDistrict').innerHTML = '<option value="">Qayerga (tuman)</option>';
    renderUserAds();
  }

  // --- Rating system (profile-level) ---
  // store structure: profileRatings = [ { phone: "99890...", ratings: [ { raterPhone, stars, text, date } ] }, ... ]
  function getProfileRatingsStore() { return readJSON('profileRatings', []); }
  function saveProfileRatingsStore(store) { writeJSON('profileRatings', store); }

  function getRatingsForProfile(profilePhone) {
    const store = getProfileRatingsStore();
    const entry = store.find(e => String(e.phone) === String(profilePhone));
    return entry ? entry.ratings : [];
  }

  function addRatingForProfile(profilePhone, rating) {
    const store = getProfileRatingsStore();
    let entry = store.find(e => String(e.phone) === String(profilePhone));
    if (!entry) { entry = { phone: String(profilePhone), ratings: [] }; store.push(entry); }
    // prevent same rater multiple ratings (business rule) -> update existing
    const already = entry.ratings.find(r => String(r.raterPhone) === String(rating.raterPhone));
    if (already) {
      already.stars = rating.stars;
      already.text = rating.text;
      already.date = rating.date;
    } else {
      entry.ratings.push(rating);
    }
    saveProfileRatingsStore(store);
  }

  function computeAvg(ratings) {
    if (!ratings || ratings.length === 0) return 5.00; // requirement: show maximal when no ratings
    const s = ratings.reduce((acc, r) => acc + (Number(r.stars) || 0), 0);
    return +(s / ratings.length).toFixed(2);
  }

  function renderRatingsUI(profilePhone) {
    const summaryEl = $('ratingSummary');
    const formWrap = $('ratingFormWrap');
    const listEl = $('ratingList');

    const ratings = getRatingsForProfile(profilePhone);
    const avg = computeAvg(ratings);
    summaryEl.innerHTML = ratings.length > 0 ? `⭐ ${avg} / 5 (${ratings.length} ta baho)` : `⭐ ${avg} / 5 (0 ta baho — hozircha maksimal ko'rsatildi)`;

    // Render list
    if (!ratings || ratings.length === 0) {
      listEl.innerHTML = `<p style="text-align:center;color:#666;">Hozircha baholashlar yo'q.</p>`;
    } else {
      listEl.innerHTML = ratings.slice().reverse().map(r =>
        `<div class="rating-card"><div style="font-weight:700">⭐ ${escapeHtml(String(r.stars))} / 5</div>
         ${r.text ? `<div style="margin-top:6px;color:#333">${escapeHtml(r.text)}</div>` : ''}
         <div style="font-size:12px;color:#666;margin-top:6px">${escapeHtml(r.raterPhone)} · ${escapeHtml(r.date)}</div></div>`
      ).join('');
    }

    // Render form if viewer exists and viewer != profile owner
    const currentUser = readJSON('currentUser', null);
    const viewerPhone = currentUser && currentUser.phone ? String(currentUser.phone) : null;
    formWrap.innerHTML = '';

    if (!viewerPhone) {
      formWrap.innerHTML = `<p style="text-align:center;color:#666;">Baholash qo'shish uchun tizimga kiring.</p>`;
      return;
    }
    if (String(viewerPhone) === String(profilePhone)) {
      formWrap.innerHTML = `<p style="text-align:center;color:#666;">Siz o'zingizni baholay olmaysiz.</p>`;
      return;
    }
    // prevent duplicate rating (business rule)
    const already = ratings.some(r => String(r.raterPhone) === String(viewerPhone));
    if (already) {
      formWrap.innerHTML = `<p style="text-align:center;color:#666;">Siz allaqachon bu foydalanuvchini baholagansiz.</p>`;
      return;
    }
    // show form
    formWrap.innerHTML = `
      <div style="background:#f8f9ff;padding:12px;border-radius:8px;border:1px solid #e6eefc;">
        <label style="display:block;margin-bottom:6px;"><strong>⭐ Baho tanlang</strong></label>
        <select id="ratingStars" style="padding:8px;border-radius:6px;border:1px solid #ccc;">
          <option value="5">5 — A’lo</option>
          <option value="4">4 — Yaxshi</option>
          <option value="3">3 — O‘rtacha</option>
          <option value="2">2 — Yomon</option>
          <option value="1">1 — Juda yomon</option>
        </select>
        <textarea id="ratingText" rows="3" placeholder="Ixtiyoriy izoh..." style="width:100%;margin-top:8px;padding:8px;border-radius:6px;border:1px solid #ccc;"></textarea>
        <div style="text-align:center;margin-top:10px;">
          <button id="submitRatingBtn">Baholashni yuborish</button>
        </div>
      </div>`;
    $('submitRatingBtn').onclick = () => {
      const stars = Number($('ratingStars').value) || 5;
      const text = $('ratingText').value.trim();
      const r = { raterPhone: viewerPhone, stars, text, date: new Date().toLocaleString() };
      addRatingForProfile(profilePhone, r);
      renderRatingsUI(profilePhone);
      alert('Baho saqlandi!');
    };
  }

  // -----------------------------------------
  // Initialization: determine profile phone
  // if viewingProfile exists in localStorage -> show that, else show currentUser
  function initProfilePage() {
    const currentUser = readJSON('currentUser', null);
    const profilePhoneFromStorage = localStorage.getItem('viewingProfile');
    const profilePhone = profilePhoneFromStorage || (currentUser && currentUser.phone) || null;
    window.profilePhone = profilePhone;

    // load regions select
    loadRegionsUI();

    // update districts if prefilled
    // init event listeners for region selects
    ['from','to','filterFrom','filterTo'].forEach(pref => {
      const el = $(pref + 'Region');
      if (el) {
        el.addEventListener('change', ()=> updateDistricts(pref));
      }
    });

    // render ads and ratings
    renderUserAds();
    if (profilePhone) renderRatingsUI(profilePhone);

    // Polling: keep in sync with changes in localStorage (admin actions)
    setInterval(()=> {
      renderUserAds();
      if (profilePhone) renderRatingsUI(profilePhone);
    }, 4000);
  }

  // --- Storage event to update across tabs ---
  window.addEventListener('storage', (e) => {
    if (["driverAds","passengerAds","profileRatings","currentUser","viewingProfile","lastChange"].includes(e.key)) {
      renderUserAds();
      const maybeProfile = window.profilePhone || localStorage.getItem('viewingProfile') || (readJSON('currentUser',null) && readJSON('currentUser',null).phone);
      if (maybeProfile) renderRatingsUI(maybeProfile);
    }
  });

  // --- Expose some functions to global (for inline HTML onclick) ---
  window.applyFilters = applyFilters;
  window.clearFilters = clearFilters;
  window.updateFilterDistricts = updateFilterDistricts;
  window.updateDistricts = updateDistricts;
  window.addAd = addAd;
  window.editAd = editAd;
  window.deleteAd = deleteAd;
  window.startInlineEdit = startInlineEdit;
  window.renderUserAds = renderUserAds;

  // Logout function
  window.logout = function() {
    localStorage.removeItem('currentUser');
    // it's common to store currentUserPhone separate; remove if exists
    localStorage.removeItem('currentUserPhone');
    alert('Siz tizimdan chiqdingiz.');
    window.location.href = 'login.html';
  };

  // On DOM ready
  document.addEventListener('DOMContentLoaded', function(){
    initProfilePage();
  });

})();
