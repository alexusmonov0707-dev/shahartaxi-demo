/* profile.js
   To'liq funktsional: barcha funksiyalar, rating, comment, filter, add/edit/delete, sync, regions integratsiyasi.
   Iltimos: ushbu faylni profile.html bilan birga joylang va regions.js mavjud bo'lsin.
*/

/* -----------------------
   Helper / LocalStorage utils
   ----------------------- */
function safeParse(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch (e) { return []; }
}
function safeParseObj(key) {
  try { return JSON.parse(localStorage.getItem(key)) || {}; } catch(e){ return {}; }
}
function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

/* -----------------------
   Current user / auth (simple localStorage currentUser)
   ----------------------- */
const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
if (!currentUser || !currentUser.phone) {
  alert('Avval tizimga kiring!');
  window.location.href = 'login.html';
} else {
  document.getElementById('userPhone').textContent = `Telefon: ${currentUser.phone}`;
}

/* -----------------------
   Ensure old ads have comment field (backwards compatibility)
   ----------------------- */
function ensureCommentField() {
  const keys = ['driverAds','passengerAds','ads'];
  keys.forEach(k => {
    const arr = safeParse(k);
    let changed = false;
    arr.forEach(a => { if (typeof a.comment === 'undefined') { a.comment = ''; changed = true; } });
    if (changed) save(k, arr);
  });
}
ensureCommentField();

/* -----------------------
   Data access helpers
   ----------------------- */
function getAds() {
  const driver = safeParse('driverAds');
  const passenger = safeParse('passengerAds');
  const main = safeParse('ads'); // some older structure
  return { driver, passenger, main };
}

/* -----------------------
   Regions helpers (expects regions.js defines `regions` object)
   ----------------------- */
function loadRegions() {
  const fromRegion = document.getElementById('fromRegion');
  const toRegion = document.getElementById('toRegion');
  const fFromRegion = document.getElementById('filterFromRegion');
  const fToRegion = document.getElementById('filterToRegion');
  [fromRegion,toRegion,fFromRegion,fToRegion].forEach(sel=>sel.innerHTML='<option value="">Viloyatni tanlang</option>');
  if (typeof regions === 'object') {
    Object.keys(regions).forEach(r => {
      [fromRegion,toRegion,fFromRegion,fToRegion].forEach(sel=>sel.add(new Option(r,r)));
    });
  }
}
function updateDistricts(prefix) {
  const region = document.getElementById(prefix + 'Region').value;
  const districtSelect = document.getElementById(prefix + 'District');
  districtSelect.innerHTML = '<option value="">Tumanni tanlang</option>';
  if (regions && regions[region]) regions[region].forEach(d => districtSelect.add(new Option(d,d)));
}
function updateFilterDistricts(prefix) {
  const regionSelect = document.getElementById(prefix + 'Region');
  const districtSelect = document.getElementById(prefix + 'District');
  const selectedRegion = regionSelect.value;
  districtSelect.innerHTML = '<option value="">Tanlang</option>';
  if (selectedRegion && regions[selectedRegion]) regions[selectedRegion].forEach(t => districtSelect.add(new Option(t,t)));
  applyFilters();
}

/* -----------------------
   Render user ads (profile view)
   ----------------------- */
function renderUserAds() {
  const { driver, passenger, main } = getAds();
  const userPhone = String(currentUser.phone);
  // merge all arrays (main optionally)
  let allAds = [];
  if (Array.isArray(main) && main.length) allAds = allAds.concat(main);
  allAds = allAds.concat(driver).concat(passenger);

  // filter only ads of this user (owner of profile)
  allAds = allAds.filter(ad => String(ad.phone) === userPhone);

  // Filters from UI
  const typeFilter = document.getElementById('typeFilter').value;
  const statusFilter = document.getElementById('statusFilter').value;
  const fFromRegion = document.getElementById('filterFromRegion').value;
  const fFromDistrict = document.getElementById('filterFromDistrict').value;
  const fToRegion = document.getElementById('filterToRegion').value;
  const fToDistrict = document.getElementById('filterToDistrict').value;

  if (typeFilter !== 'all') allAds = allAds.filter(a => a.type === typeFilter);
  if (statusFilter !== 'all') allAds = allAds.filter(a => (a.status || 'pending') === statusFilter);
  if (fFromRegion) allAds = allAds.filter(a => (a.fromRegion || a.from || '').includes(fFromRegion));
  if (fFromDistrict) allAds = allAds.filter(a => (a.fromDistrict || '').includes(fFromDistrict));
  if (fToRegion) allAds = allAds.filter(a => (a.toRegion || a.to || '').includes(fToRegion));
  if (fToDistrict) allAds = allAds.filter(a => (a.toDistrict || '').includes(fToDistrict));

  const container = document.getElementById('myAds');
  container.innerHTML = allAds.length ? '' : '<p>Hozircha e’lonlar yo‘q.</p>';

  // update small stats
  document.getElementById('profileStatsRow').style.display = allAds.length ? 'flex' : 'none';
  const approved = allAds.filter(a => (a.status||'pending') === 'approved').length;
  const rejected = allAds.filter(a => (a.status||'pending') === 'rejected').length;
  const pending = allAds.filter(a => (a.status||'pending') === 'pending').length;
  document.getElementById('myAdsCount').textContent = `${allAds.length} e'lon`;
  document.getElementById('myApprovedCount').textContent = `${approved} tasdiq`;
  document.getElementById('myPendingCount').textContent = `${pending} kutish`;
  document.getElementById('myRejectedCount').textContent = `${rejected} rad`;

  // Build each ad card
  allAds.forEach(ad => {
    const div = document.createElement('div');
    div.className = 'ad-box ' + ((ad.status) ? ad.status : 'pending');

    const from = (ad.fromRegion ? ad.fromRegion + (ad.fromDistrict ? ' ' + ad.fromDistrict : '') : (ad.from || '—'));
    const to = (ad.toRegion ? ad.toRegion + (ad.toDistrict ? ' ' + ad.toDistrict : '') : (ad.to || '—'));

    const createdAt = ad.createdAt ? `<p class="date-info">🕒 Joylangan: ${ad.createdAt}</p>` : '';
    const commentHTML = ad.comment ? `<div class="comment-box"><b>Izoh:</b> ${escapeHtml(ad.comment)}</div>` : '';

    div.innerHTML = `
      <p><b>Yo‘nalish:</b> ${escapeHtml(from)} → ${escapeHtml(to)}</p>
      <p><b>Narx:</b> ${escapeHtml(ad.price || 'Ko‘rsatilmagan')} so‘m</p>
      <p><b>Telefon:</b> ${escapeHtml(ad.phone || 'Noma’lum')}</p>
      <p><b>Holat:</b> ${getStatusText(ad.status)}</p>
      ${createdAt}
      ${commentHTML}
      <div class="actions" aria-hidden="false">
        ${ (ad.status !== 'approved') ? `<button onclick="editAdPrompt('${ad.id}', '${ad.type}')">✏️ Tahrirlash</button>` : `<button disabled style="background:#ccc;cursor:not-allowed;">✏️ Tahrirlash</button>` }
        <button onclick="deleteAd('${ad.id}', '${ad.type}')">🗑️ O‘chirish</button>
      </div>
    `;
    container.appendChild(div);
  });
}

/* -----------------------
   Utility: escapeHtml
   ----------------------- */
function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

/* -----------------------
   Status text helper
   ----------------------- */
function getStatusText(status) {
  if (!status) return '⏳ Kutilmoqda';
  status = String(status).toLowerCase();
  if (status === 'approved') return '✅ Tasdiqlangan';
  if (status === 'rejected') return '❌ Rad etilgan';
  return '⏳ Kutilmoqda';
}

/* -----------------------
   Add ad (with comment)
   ----------------------- */
function addAd() {
  const type = document.getElementById('adType').value;
  const fromRegion = document.getElementById('fromRegion').value.trim();
  const fromDistrict = document.getElementById('fromDistrict').value.trim();
  const toRegion = document.getElementById('toRegion').value.trim();
  const toDistrict = document.getElementById('toDistrict').value.trim();
  const price = document.getElementById('price').value.trim();
  const comment = document.getElementById('adComment').value.trim();

  if (!type || !fromRegion || !toRegion) { alert('Iltimos, yo‘nalish ma’lumotlarini to‘ldiring!'); return; }

  const key = (type === 'driver') ? 'driverAds' : 'passengerAds';
  const ads = safeParse(key);

  const id = `${type}_${Date.now()}`;
  const newAd = {
    id,
    phone: String(currentUser.phone),
    fromRegion, fromDistrict,
    toRegion, toDistrict,
    price, type,
    comment: comment || '',
    status: 'pending',
    createdAt: new Date().toLocaleString()
  };

  ads.push(newAd);
  save(key, ads);

  // also keep in stats key (optional)
  updateStatsGlobal();

  alert('✅ E’lon joylandi (Admin tasdiqlashi kutilmoqda).');
  // clear form
  document.getElementById('adType').value = '';
  document.getElementById('fromRegion').value = '';
  document.getElementById('fromDistrict').innerHTML = '<option value="">Tumanni tanlang</option>';
  document.getElementById('toRegion').value = '';
  document.getElementById('toDistrict').innerHTML = '<option value="">Tumanni tanlang</option>';
  document.getElementById('price').value = '';
  document.getElementById('adComment').value = '';
  renderUserAds();
}

/* -----------------------
   Edit ad (prompt based) with phone validation for phone edit
   ----------------------- */
function editAdPrompt(id, type) {
  const key = (type === 'driver') ? 'driverAds' : 'passengerAds';
  const ads = safeParse(key);
  const idx = ads.findIndex(a => String(a.id) === String(id));
  if (idx === -1) return;
  const ad = ads[idx];

  // Ask user which field to edit (simple prompt flow)
  const choice = prompt('Qaysi maydonni o\'zgartirmoqchisiz? (phone/price/from/to/comment)', 'price');
  if (!choice) return;
  const field = String(choice).toLowerCase().trim();

  if (field === 'phone') {
    const newPhone = prompt('Yangi telefon raqamini kiriting (faqat raqamlar):', ad.phone || '');
    if (!newPhone) return;
    if (!/^\d{7,15}$/.test(newPhone.trim())) { alert('Telefon raqam noto\'g\'ri. Faqat 7-15 ta raqam kiriting.'); return; }
    ad.phone = newPhone.trim();
  } else if (field === 'price') {
    const newPrice = prompt('Yangi narxni kiriting:', ad.price || '');
    if (newPrice === null) return;
    ad.price = newPrice.trim();
  } else if (field === 'from') {
    const newFrom = prompt('Yangi Qayerdan (viloyat yoki to\'liq yozuv):', ad.fromRegion || ad.from || '');
    if (newFrom === null) return;
    ad.fromRegion = newFrom.trim();
  } else if (field === 'to') {
    const newTo = prompt('Yangi Qayerga (viloyat yoki to\'liq yozuv):', ad.toRegion || ad.to || '');
    if (newTo === null) return;
    ad.toRegion = newTo.trim();
  } else if (field === 'comment') {
    // only owner (we are owner) can edit comment
    const newComment = prompt('Izohni tahrirlash (faqat egasi uchun):', ad.comment || '') || '';
    ad.comment = newComment.trim();
  } else {
    alert('Noma\'lum maydon.');
    return;
  }

  ads[idx] = ad;
  save(key, ads);
  alert('✏️ E’lon yangilandi.');
  renderUserAds();
  updateStatsGlobal();
}

/* -----------------------
   Delete ad
   ----------------------- */
function deleteAd(id, type) {
  if (!confirm('Haqiqatan o‘chirilsinmi?')) return;
  const key = (type === 'driver') ? 'driverAds' : 'passengerAds';
  let ads = safeParse(key);
  ads = ads.filter(a => String(a.id) !== String(id));
  save(key, ads);
  renderUserAds();
  updateStatsGlobal();
}

/* -----------------------
   Filters helpers
   ----------------------- */
function applyFilters() { renderUserAds(); }
function clearFilters() {
  document.getElementById('typeFilter').value = 'all';
  document.getElementById('statusFilter').value = 'all';
  document.getElementById('filterFromRegion').value = '';
  document.getElementById('filterFromDistrict').innerHTML = '<option value="">Qayerdan (tuman)</option>';
  document.getElementById('filterToRegion').value = '';
  document.getElementById('filterToDistrict').innerHTML = '<option value="">Qayerga (tuman)</option>';
  renderUserAds();
}

/* -----------------------
   Sync statuses (notices for user)
   ----------------------- */
function syncStatuses() {
  const { driver, passenger } = getAds();
  const userPhone = String(currentUser.phone);
  const userAds = [...driver, ...passenger].filter(ad => String(ad.phone) === userPhone);
  const lastStatuses = safeParseObj('userAdStatuses');
  userAds.forEach(ad => {
    const prev = lastStatuses[ad.id];
    if (prev && prev !== ad.status) {
      if (ad.status === 'approved') alert(`✅ "${ad.fromRegion || ad.from} → ${ad.toRegion || ad.to}" TASDIQLANDI!`);
      else if (ad.status === 'rejected') alert(`❌ "${ad.fromRegion || ad.from} → ${ad.toRegion || ad.to}" RAD ETILDI.`);
    }
    lastStatuses[ad.id] = ad.status;
  });
  localStorage.setItem('userAdStatuses', JSON.stringify(lastStatuses));
  renderUserAds();
}

/* -----------------------
   Ratings system (profile-level) stored under 'profileRatings'
   structure: [{ phone: "<profilePhone>", ratings: [ { raterPhone, stars, text, date } ] }, ... ]
   ----------------------- */
function getProfileRatingsStore() {
  try { return JSON.parse(localStorage.getItem('profileRatings') || '[]'); } catch(e){ return []; }
}
function saveProfileRatingsStore(store) { localStorage.setItem('profileRatings', JSON.stringify(store)); }
function getRatingsForProfile(profilePhone) {
  const store = getProfileRatingsStore();
  const entry = store.find(e => String(e.phone) === String(profilePhone));
  return entry ? entry.ratings : [];
}
function addRatingForProfile(profilePhone, rating) {
  const store = getProfileRatingsStore();
  let entry = store.find(e => String(e.phone) === String(profilePhone));
  if (!entry) { entry = { phone: String(profilePhone), ratings: [] }; store.push(entry); }
  entry.ratings.push(rating);
  saveProfileRatingsStore(store);
}

/* Render the rating UI in page */
function renderRatingsUI(profilePhone) {
  const ratings = getRatingsForProfile(profilePhone) || [];
  const summaryEl = document.getElementById('ratingSummary');
  const listEl = document.getElementById('ratingList');
  const formWrap = document.getElementById('ratingFormWrap');

  // If no ratings, show maximal rating per your request
  let avg = 0;
  if (ratings.length === 0) {
    avg = 5.0; // show maximum if none exist
  } else {
    const s = ratings.reduce((acc, r) => acc + (Number(r.stars)||0), 0);
    avg = +(s / ratings.length).toFixed(2);
  }
  summaryEl.innerHTML = `<b>O'rtacha baho:</b> ${avg} / 5 (${ratings.length} ta baho)`;

  // list
  if (!ratings.length) {
    listEl.innerHTML = `<p class="small">Hozircha baholashlar yo‘q.</p>`;
  } else {
    listEl.innerHTML = ratings.slice().reverse().map(r => {
      return `<div style="border:1px solid #eee;padding:8px;border-radius:8px;margin-bottom:6px;">
        <div style="font-weight:600;">⭐ ${escapeHtml(String(r.stars))} / 5</div>
        ${ r.text ? `<div style="margin-top:6px;color:#333;">${escapeHtml(r.text)}</div>` : '' }
        <div style="font-size:12px;color:#666;margin-top:6px;">${escapeHtml(r.raterPhone)} · ${escapeHtml(r.date)}</div>
      </div>`;
    }).join('');
  }

  // Form: only show if logged-in viewer exists and viewer != profile owner
  const viewer = JSON.parse(localStorage.getItem('currentUser') || 'null');
  const viewerPhone = viewer && viewer.phone ? String(viewer.phone) : null;

  formWrap.innerHTML = '';
  if (!viewerPhone) {
    formWrap.innerHTML = `<p class="small">Baholash uchun tizimga kiring.</p>`;
    return;
  }
  if (String(viewerPhone) === String(profilePhone)) {
    formWrap.innerHTML = `<p class="small">Siz o'zingizni baholay olmaysiz. Boshqalar baholashlari mumkin.</p>`;
    return;
  }
  // Check duplicate rating (prevent multiple from same rater)
  const already = ratings.some(r => String(r.raterPhone) === String(viewerPhone));
  if (already) {
    formWrap.innerHTML = `<p class="small">Siz allaqachon bu foydalanuvchini baholagansiz.</p>`;
    return;
  }

  // Render submit form
  formWrap.innerHTML = `
    <div style="background:#f8f9ff;padding:12px;border-radius:8px;border:1px solid #e6eefc;">
      <label><strong>⭐ Baho tanlang</strong></label>
      <select id="ratingStars" style="padding:8px;border-radius:6px;border:1px solid #ccc;width:100%;">
        <option value="5">5 — A’lo</option>
        <option value="4">4 — Yaxshi</option>
        <option value="3">3 — O‘rtacha</option>
        <option value="2">2 — Yomon</option>
        <option value="1">1 — Juda yomon</option>
      </select>
      <textarea id="ratingText" rows="3" placeholder="Ixtiyoriy izoh... (max 500)" style="width:100%;margin-top:8px;padding:8px;border-radius:6px;border:1px solid #ccc;"></textarea>
      <div style="text-align:center;margin-top:10px;">
        <button id="submitRatingBtn" style="padding:8px 12px;border-radius:6px;background:#007bff;color:#fff;border:none;cursor:pointer;">Baholashni yuborish</button>
      </div>
    </div>
  `;

  document.getElementById('submitRatingBtn').onclick = function() {
    const stars = Number(document.getElementById('ratingStars').value) || 5;
    const text = document.getElementById('ratingText').value.trim();
    const ratingObj = { raterPhone: viewerPhone, stars, text, date: new Date().toLocaleString() };
    addRatingForProfile(profilePhone, ratingObj);
    renderRatingsUI(profilePhone);
  };
}

/* -----------------------
   Init rating & profile detection
   ----------------------- */
function initProfileAndRatings() {
  // Determine profile phone (viewingProfile can be set by other pages)
  let profilePhone = localStorage.getItem('viewingProfile') || null;
  if (!profilePhone && currentUser && currentUser.phone) profilePhone = String(currentUser.phone);
  if (!profilePhone) {
    console.warn('Profile phone not found; ratings disabled.');
    document.getElementById('profileRatingArea').style.display = 'none';
    return;
  }
  // render ratings UI
  renderRatingsUI(profilePhone);
}

/* -----------------------
   Global stats update (for admin/statcards integration)
   Keeps compatibility with how you track ads
   ----------------------- */
function getAllAdsFlattened() {
  const { driver, passenger, main } = getAds();
  let all = [];
  if (Array.isArray(main) && main.length) all = all.concat(main);
  if (Array.isArray(driver)) all = all.concat(driver);
  if (Array.isArray(passenger)) all = all.concat(passenger);
  return all;
}
function normalizeStatus(status) {
  if (!status) return 'pending';
  const s = String(status).toLowerCase();
  if (s.includes('tasdiq') || s === 'approved') return 'approved';
  if (s.includes('rad') || s === 'rejected') return 'rejected';
  if (s.includes('kut') || s.includes('pend')) return 'pending';
  return s;
}
function updateStatsGlobal() {
  const all = getAllAdsFlattened();
  const normalized = all.map(a => ({ ...a, status: normalizeStatus(a.status) }));
  const total = normalized.length;
  const approved = normalized.filter(a => a.status === 'approved').length;
  const pending = normalized.filter(a => a.status === 'pending').length;
  const rejected = normalized.filter(a => a.status === 'rejected').length;

  // If admin stat cells exist on page (profile.html may not have them)
  if (document.getElementById('totalAds')) document.getElementById('totalAds').textContent = total;
  if (document.getElementById('approvedAds')) document.getElementById('approvedAds').textContent = approved;
  if (document.getElementById('pendingAds')) document.getElementById('pendingAds').textContent = pending;
  if (document.getElementById('rejectedAds')) document.getElementById('rejectedAds').textContent = rejected;

  // also return stats
  return { total, approved, pending, rejected };
}

/* -----------------------
   Phone validation (utility)
   Accept only digits (length check 7-15 digits)
   ----------------------- */
function isValidPhone(s) {
  if (!s) return false;
  return /^\d{7,15}$/.test(String(s).trim());
}

/* -----------------------
   Event loop / init
   ----------------------- */
window.onload = function() {
  // load regions dropdowns if regions.js present
  if (typeof regions === 'object') loadRegions();
  renderUserAds();
  initProfileAndRatings();
  updateStatsGlobal();
  // sync statuses periodically
  setInterval(syncStatuses, 5000);
  // also update global stats if any admin cards exist
  setInterval(updateStatsGlobal, 5000);
};
window.addEventListener('storage', function(e) {
  if (['driverAds','passengerAds','ads','profileRatings','reviews'].includes(e.key)) {
    // refresh view
    renderUserAds();
    initProfileAndRatings();
    updateStatsGlobal();
  }
});

/* -----------------------
   Small helpers for backwards compatibility
   ----------------------- */
function editAd(id, type) { editAdPrompt(id, type); } // keep old name
function logout() { localStorage.removeItem('currentUser'); window.location.href = 'login.html'; }
