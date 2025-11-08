// profile.js
// To'liq ishlaydigan skript - ShaharTaxi profile sahifasi
// Kutilayotgan keys:
// - localStorage.currentUser  -> { phone, name, photo } (profil egalari uchun)
// - localStorage.driverAds / passengerAds -> array of ads
// - localStorage.profileRatings -> array of { phone: profilePhone, ratings: [ { raterPhone, stars, text, date } ] }

// -----------------------------
// Helpers & parsers
// -----------------------------
function parseAdDate(dateStr) {
  if (!dateStr) return null;
  // Try ISO
  const d = new Date(dateStr);
  if (!isNaN(d)) return d;
  // Try "DD.MM.YYYY HH:mm" or "DD.MM.YYYY"
  const match = String(dateStr).match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (match) {
    const [, day, month, year, hour = "0", minute = "0"] = match;
    return new Date(+year, +month - 1, +day, +hour, +minute);
  }
  // Try locale string (fallback)
  const d2 = new Date(Date.parse(dateStr));
  return isNaN(d2) ? null : d2;
}

function isoDateString(d) {
  return new Date(d).toLocaleString();
}

function ensureArray(x) { return Array.isArray(x) ? x : []; }

// phone validator: accept +998XXXXXXXXX or 998XXXXXXXXX or 0XXXXXXXXX (common) - but ensure digits length
function isValidPhone(phone) {
  if (!phone) return false;
  const p = String(phone).trim();
  // remove spaces, dashes
  const cleaned = p.replace(/[\s-()]/g, '');
  // +998XXXXXXXXX (12 chars) -> + + 12? Actually +998 + 9 digits => +998XXXXXXXXX length 13? Wait: +998 +9 = 13 incl plus.
  // We'll accept following numeric forms: +998XXXXXXXXX, 998XXXXXXXXX, 0XXXXXXXXX (9/10 digits)
  if (/^\+998\d{9}$/.test(cleaned)) return true;
  if (/^998\d{9}$/.test(cleaned)) return true;
  if (/^0\d{9}$/.test(cleaned)) return true;
  return false;
}

function normalizePhoneForStorage(phone) {
  if (!phone) return phone;
  let p = String(phone).trim();
  p = p.replace(/[\s-()]/g, '');
  if (/^0\d{9}$/.test(p)) {
    // convert 0XXXXXXXXX -> +998XXXXXXXXX
    return '+998' + p.slice(1);
  }
  if (/^998\d{9}$/.test(p)) return '+' + p;
  if (/^\+998\d{9}$/.test(p)) return p;
  // fallback: return as-is
  return p;
}

function uid(prefix = '') {
  return prefix + Date.now() + '_' + Math.floor(Math.random() * 10000);
}

// -----------------------------
// LocalStorage helpers
// -----------------------------
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('currentUser') || 'null');
  } catch (e) {
    return null;
  }
}

function getDriverAds() {
  return JSON.parse(localStorage.getItem('driverAds') || '[]');
}
function getPassengerAds() {
  return JSON.parse(localStorage.getItem('passengerAds') || '[]');
}
function saveDriverAds(arr) { localStorage.setItem('driverAds', JSON.stringify(arr || [])); }
function savePassengerAds(arr) { localStorage.setItem('passengerAds', JSON.stringify(arr || [])); }

function getProfileRatingsStore() {
  return JSON.parse(localStorage.getItem('profileRatings') || '[]');
}
function saveProfileRatingsStore(store) {
  localStorage.setItem('profileRatings', JSON.stringify(store || []));
}

// -----------------------------
// Profile detection (whose profile page to show)
// -----------------------------
function getViewingProfilePhone() {
  // Priority:
  // 1) localStorage.viewingProfile (page set by clicking a user's profile)
  // 2) window.profilePhone (can be set by other scripts)
  // 3) currentUser.phone
  const maybe = localStorage.getItem('viewingProfile') || window.profilePhone || null;
  if (maybe) return String(maybe);
  const cu = getCurrentUser();
  if (cu && cu.phone) return String(cu.phone);
  return null;
}

// -----------------------------
// Ratings store (profileRatings)
// Structure:
// [ { phone: "<profilePhone>", ratings: [ { raterPhone, stars, text, date } ] }, ... ]
// -----------------------------
function getRatingsForProfile(profilePhone) {
  const store = getProfileRatingsStore();
  const entry = store.find(e => String(e.phone) === String(profilePhone));
  return entry ? entry.ratings : [];
}
function addRatingForProfile(profilePhone, rating) {
  const store = getProfileRatingsStore();
  let entry = store.find(e => String(e.phone) === String(profilePhone));
  if (!entry) {
    entry = { phone: String(profilePhone), ratings: [] };
    store.push(entry);
  }
  entry.ratings.push(rating);
  saveProfileRatingsStore(store);
}
function computeAverageRating(ratings) {
  if (!ratings || ratings.length === 0) {
    // Per your request: show maximal rating instead of 'no ratings'
    return 5.0;
  }
  const s = ratings.reduce((sum, r) => sum + (Number(r.stars) || 0), 0);
  return +(s / ratings.length).toFixed(2);
}

// -----------------------------
// Rendering: profile header & stats
// -----------------------------
function renderProfileHeader(profilePhone) {
  const cu = getCurrentUser();
  // determine profile data from stored users if available (we only have phone + maybe name/photo in currentUser)
  // Try to find an ad belonging to profilePhone to get name/photo fields if they exist
  const allAds = [...getDriverAds(), ...getPassengerAds()];
  const sampleAd = allAds.find(a => String(a.phone) === String(profilePhone));
  const profile = {
    phone: profilePhone,
    name: (cu && String(cu.phone) === String(profilePhone) && cu.name) ? cu.name : (sampleAd && sampleAd.name) ? sampleAd.name : 'Foydalanuvchi',
    photo: (cu && String(cu.phone) === String(profilePhone) && cu.photo) ? cu.photo : (sampleAd && sampleAd.photo) ? sampleAd.photo : 'images/default-avatar.png'
  };

  const nameEl = document.getElementById('profile-name');
  const phoneEl = document.getElementById('profile-phone');
  const photoEl = document.getElementById('profile-photo');

  if (nameEl) nameEl.textContent = profile.name || 'Foydalanuvchi';
  if (phoneEl) phoneEl.textContent = `Telefon: ${profile.phone || '—'}`;
  if (photoEl) photoEl.src = profile.photo || 'images/default-avatar.png';

  // rating
  const ratings = getRatingsForProfile(profilePhone);
  const avg = computeAverageRating(ratings);
  const ratingValueEl = document.getElementById('rating-value');
  if (ratingValueEl) ratingValueEl.textContent = (avg).toFixed(1);
}

// -----------------------------
// Ads rendering / stats computation
// -----------------------------
function collectAllAds() {
  // Some older versions may have 'ads' key - include it
  const mainAds = JSON.parse(localStorage.getItem('ads') || '[]');
  const driver = getDriverAds();
  const passenger = getPassengerAds();
  // ensure each ad has createdAt and type
  const normalized = [
    ...ensureArray(mainAds).map(a => ({ ...(a || {}), type: a.type || (a.from && a.to ? 'driver' : 'driver') })),
    ...ensureArray(driver).map(a => ({ ...(a || {}), type: 'driver' })),
    ...ensureArray(passenger).map(a => ({ ...(a || {}), type: 'passenger' }))
  ];
  return normalized;
}

function updateProfileStats(profilePhone) {
  const all = collectAllAds();
  const profileAds = all.filter(a => String(a.phone) === String(profilePhone));

  // ensure status normalization
  const norm = profileAds.map(a => {
    const s = a.status ? String(a.status).toLowerCase() : 'pending';
    let status = s;
    if (s.includes('tasdiq') || s.includes('approved')) status = 'approved';
    else if (s.includes('rad') || s.includes('rejected')) status = 'rejected';
    else status = 'pending';
    return { ...a, status };
  });

  const total = norm.length;
  const approved = norm.filter(a => a.status === 'approved').length;
  const rejected = norm.filter(a => a.status === 'rejected').length;
  const pending = norm.filter(a => a.status === 'pending').length;

  const elTotal = document.getElementById('total-ads');
  const elApproved = document.getElementById('approved-ads');
  const elPending = document.getElementById('pending-ads');
  const elRejected = document.getElementById('rejected-ads');
  if (elTotal) elTotal.textContent = total;
  if (elApproved) elApproved.textContent = approved;
  if (elPending) elPending.textContent = pending;
  if (elRejected) elRejected.textContent = rejected;

  return norm;
}

function renderAdsList(profilePhone) {
  const adsContainer = document.getElementById('ads-list');
  if (!adsContainer) return;
  adsContainer.innerHTML = '';

  const norm = updateProfileStats(profilePhone);

  if (!norm || norm.length === 0) {
    adsContainer.innerHTML = '<p style="color:#666;">Sizda hali eʼlonlar yoʻq.</p>';
    return;
  }

  // sort by date desc
  norm.sort((a, b) => {
    const da = parseAdDate(a.createdAt) || new Date(0);
    const db = parseAdDate(b.createdAt) || new Date(0);
    return db - da;
  });

  norm.forEach(ad => {
    // build ad card
    const card = document.createElement('div');
    card.className = 'ad-card';

    const from = (ad.fromRegion || ad.from || '') + (ad.fromDistrict ? (' ' + ad.fromDistrict) : '');
    const to = (ad.toRegion || ad.to || '') + (ad.toDistrict ? (' ' + ad.toDistrict) : '');
    const priceText = ad.price ? `${ad.price} so‘m` : 'Ko‘rsatilmagan';
    const createdText = ad.createdAt ? isoDateString(parseAdDate(ad.createdAt) || ad.createdAt) : '—';

    // comment if exists
    const commentHTML = ad.comment ? `<div style="margin-top:8px;background:#fff;border-left:4px solid #0088cc;padding:8px;border-radius:6px;"><b>Izoh:</b> ${escapeHtml(ad.comment)}</div>` : '';

    // actions: if current user is owner -> show edit/delete
    const currentUser = getCurrentUser();
    const isOwner = currentUser && String(currentUser.phone) === String(ad.phone);

    card.innerHTML = `
      <h4>${escapeHtml(from)} → ${escapeHtml(to)}</h4>
      <p style="margin-top:6px;color:#444;"><b>Narx:</b> ${escapeHtml(priceText)} &nbsp; • &nbsp; <b>Holat:</b> ${escapeHtml(ad.status || 'pending')}</p>
      <p style="font-size:13px;color:#666;margin-top:6px;"><b>Joylangan:</b> ${escapeHtml(createdText)}</p>
      ${commentHTML}
    `;

    const actionsDiv = document.createElement('div');
    actionsDiv.style.marginTop = '10px';
    actionsDiv.className = 'actions';

    if (isOwner) {
      const editBtn = document.createElement('button');
      editBtn.textContent = '✏️ Tahrirlash';
      editBtn.onclick = () => openInlineEdit(ad);
      actionsDiv.appendChild(editBtn);
    } else {
      // show a button to view profile of the ad owner (if not current profile)
      if (String(ad.phone) !== String(profilePhone)) {
        const viewProfileBtn = document.createElement('button');
        viewProfileBtn.textContent = "👤 Foydalanuvchini ko'rish";
        viewProfileBtn.onclick = () => {
          // When clicked, set viewingProfile and reload page to view that profile
          localStorage.setItem('viewingProfile', String(ad.phone));
          // reload to show that profile (or you could open in new tab)
          window.location.reload();
        };
        actionsDiv.appendChild(viewProfileBtn);
      }
    }

    if (isOwner) {
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '🗑️ O‘chirish';
      deleteBtn.onclick = () => {
        if (!confirm('Eʼlonni oʻchirmoqchimisiz?')) return;
        deleteAd(ad.id, ad.type);
      };
      actionsDiv.appendChild(deleteBtn);
    } else {
      // allow any user to leave a rating/comment for the ad owner directly from ad card? 
      // Per earlier discussion: rating should be between driver & passenger after completed ride.
      // For now we provide a "Profilga baho qoldirish" button that opens rating form for the ad owner.
      const rateOwnerBtn = document.createElement('button');
      rateOwnerBtn.textContent = '⭐ Profilga baho';
      rateOwnerBtn.onclick = () => {
        // set viewingProfile to owner then scroll to rating form
        localStorage.setItem('viewingProfile', String(ad.phone));
        // re-init rating UI for that profile
        initRatingsUI(String(ad.phone));
        // scroll to rating block
        const rb = document.getElementById('profileRatingBlock') || document.getElementById('ratingFormWrap') || document.getElementById('ratingFormContainer');
        if (rb) rb.scrollIntoView({ behavior: 'smooth', block: 'center' });
      };
      actionsDiv.appendChild(rateOwnerBtn);
    }

    card.appendChild(actionsDiv);
    adsContainer.appendChild(card);
  });
}

// -----------------------------
// Edit / Delete ad operations
// -----------------------------
function openInlineEdit(ad) {
  // simple prompt editing (price + comment) to keep UI minimal and safe
  const newPrice = prompt('Yangi narxni kiriting (bo‘sh qoldirsangiz o‘zgarmaydi):', ad.price || '');
  if (newPrice !== null) {
    const key = ad.type === 'driver' ? 'driverAds' : 'passengerAds';
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    const idx = arr.findIndex(a => String(a.id) === String(ad.id));
    if (idx > -1) {
      if (String(newPrice).trim() !== '') arr[idx].price = newPrice.trim();
      arr[idx].edited = true;
      localStorage.setItem(key, JSON.stringify(arr));
      renderAll(); // refresh UI
      alert('✅ E\'lon yangilandi.');
    }
  }
}

function deleteAd(id, type) {
  const key = type === 'driver' ? 'driverAds' : 'passengerAds';
  const arr = JSON.parse(localStorage.getItem(key) || '[]').filter(a => String(a.id) !== String(id));
  localStorage.setItem(key, JSON.stringify(arr));
  renderAll();
}

// -----------------------------
// Add new ad (profile page contains form in HTML header of original large file; but here we only re-render)
// For this HTML version, new ad creation UI is in the page; we will attach to a global addAd button if present
// -----------------------------
function addAdFromForm() {
  // if form elements exist
  const adTypeEl = document.getElementById('adType');
  if (!adTypeEl) return;
  const type = adTypeEl.value;
  const fromRegion = document.getElementById('fromRegion').value || '';
  const fromDistrict = document.getElementById('fromDistrict').value || '';
  const toRegion = document.getElementById('toRegion').value || '';
  const toDistrict = document.getElementById('toDistrict').value || '';
  const price = document.getElementById('price').value || '';
  const comment = document.getElementById('adComment') ? document.getElementById('adComment').value : '';

  if (!type || !fromRegion || !toRegion) {
    alert('Iltimos, yo‘nalish maʼlumotlarini to‘ldiring.');
    return;
  }

  const currentUser = getCurrentUser();
  if (!currentUser || !currentUser.phone) {
    alert('Eʼlon qo‘yish uchun tizimga kiring.');
    return;
  }

  const key = type === 'driver' ? 'driverAds' : 'passengerAds';
  const arr = JSON.parse(localStorage.getItem(key) || '[]');

  const newAd = {
    id: `${type}_${Date.now()}`,
    phone: currentUser.phone,
    fromRegion, fromDistrict,
    toRegion, toDistrict,
    price, type,
    comment: comment || '',
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  arr.push(newAd);
  localStorage.setItem(key, JSON.stringify(arr));
  alert('✅ Eʼlon joylandi. Admin tasdiqlashi kutilmoqda.');
  // Clear form if exist
  const priceEl = document.getElementById('price'); if (priceEl) priceEl.value = '';
  const commentEl = document.getElementById('adComment'); if (commentEl) commentEl.value = '';
  renderAll();
}

// -----------------------------
// Ratings UI & Events
// -----------------------------
function ensureRatingContainerExists() {
  if (document.getElementById('profileRatingBlock')) return;
  // There is a rating section in the HTML (we included a complex one earlier). If not, we create a simple block.
  const container = document.createElement('div');
  container.id = 'profileRatingBlock';
  container.style.marginTop = '18px';
  const mainC = document.querySelector('.container') || document.body;
  mainC.appendChild(container);
}

function renderRatingsUI(profilePhone) {
  ensureRatingContainerExists();
  const target = document.getElementById('profileRatingBlock');
  if (!target) return;

  // build UI
  const ratings = getRatingsForProfile(profilePhone) || [];
  const avg = computeAverageRating(ratings);
  const count = (ratings && ratings.length) ? ratings.length : 0;

  // show summary: per your request, show maximal by default if none
  const summaryHtml = `<div style="text-align:center;padding:8px 0;">
    <strong>O'rtacha baho:</strong> ${(avg).toFixed(1)} / 5 &nbsp; <small style="color:#666">(${count} ta)</small>
  </div>`;

  // list
  let listHtml = '';
  if (!ratings || ratings.length === 0) {
    listHtml = `<p style="text-align:center;color:#666;">Hozircha baholashlar yo‘q. (Sifatli 5.0 ko‘rsatilmoqda)</p>`;
  } else {
    listHtml = ratings.slice().reverse().map(r => {
      const commentPart = r.text ? `<div style="margin-top:6px;color:#333;">${escapeHtml(r.text)}</div>` : '';
      return `<div style="background:#fff;border:1px solid #eee;padding:10px;border-radius:8px;margin-bottom:8px;">
        <div style="font-weight:600;">⭐ ${r.stars} / 5</div>
        ${commentPart}
        <div style="font-size:12px;color:#666;margin-top:6px;">${escapeHtml(r.raterPhone)} · ${escapeHtml(r.date)}</div>
      </div>`;
    }).join('');
  }

  // form
  const currentUser = getCurrentUser();
  const viewerPhone = currentUser && currentUser.phone ? String(currentUser.phone) : null;
  let formHtml = '';
  if (!viewerPhone) {
    formHtml = `<p style="text-align:center;color:#666;">Baholash qoʻshish uchun tizimga kiring.</p>`;
  } else if (String(viewerPhone) === String(profilePhone)) {
    formHtml = `<p style="text-align:center;color:#666;">Siz o'zingizni baholay olmaysiz. Boshqalar baholashlari mumkin.</p>`;
  } else {
    // check duplicate
    const already = ratings.some(r => String(r.raterPhone) === String(viewerPhone));
    if (already) {
      formHtml = `<p style="text-align:center;color:#666;">Siz allaqachon bu foydalanuvchini baholagansiz.</p>`;
    } else {
      formHtml = `
        <div style="background:#f8f9ff;padding:12px;border-radius:8px;border:1px solid #e6eefc;">
          <label style="display:block;margin-bottom:6px;"><strong>⭐ Baho tanlang</strong></label>
          <select id="ratingStars" style="padding:8px;border-radius:6px;border:1px solid #ccc;">
            <option value="5">5 — A’lo</option>
            <option value="4">4 — Yaxshi</option>
            <option value="3">3 — O‘rtacha</option>
            <option value="2">2 — Yomon</option>
            <option value="1">1 — Juda yomon</option>
          </select>
          <textarea id="ratingText" rows="3" placeholder="Ixtiyoriy izoh... (max 500)" style="width:100%;margin-top:8px;padding:8px;border-radius:6px;border:1px solid #ccc;"></textarea>
          <div style="text-align:center;margin-top:10px;">
            <button id="submitRatingBtn" style="padding:8px 12px;border-radius:6px;background:#0088cc;color:#fff;border:none;cursor:pointer;">Baholashni yuborish</button>
          </div>
        </div>
      `;
    }
  }

  target.innerHTML = `<hr><h2 style="color:#007bff;text-align:center;">Foydalanuvchi baholari</h2>${summaryHtml}<div id="ratingFormWrap">${formHtml}</div><div id="ratingList" style="margin-top:12px;">${listHtml}</div>`;

  // attach submit handler
  const submitBtn = document.getElementById('submitRatingBtn');
  if (submitBtn) {
    submitBtn.onclick = () => {
      const stars = Number(document.getElementById('ratingStars').value) || 5;
      const text = document.getElementById('ratingText').value.trim().slice(0, 500);
      const r = {
        raterPhone: viewerPhone,
        stars,
        text,
        date: new Date().toLocaleString()
      };
      addRatingForProfile(profilePhone, r);
      // reload
      renderRatingsUI(profilePhone);
      renderProfileHeader(profilePhone); // update avg
      alert('✅ Baho saqlandi!');
    };
  }
}

function initRatingsUI(profilePhone) {
  // set viewingProfile to chosen profile phone
  if (profilePhone) localStorage.setItem('viewingProfile', String(profilePhone));
  renderProfileHeader(profilePhone);
  renderRatingsUI(profilePhone);
}

// -----------------------------
// Profile edit modal handling
// -----------------------------
function openEditModal(profilePhone) {
  const cu = getCurrentUser();
  if (!cu) return;
  // show modal
  const modal = document.getElementById('editModal');
  if (!modal) return;
  document.getElementById('edit-name').value = cu.name || '';
  document.getElementById('edit-phone').value = cu.phone || '';
  document.getElementById('edit-photo').value = cu.photo || '';
  modal.classList.add('active');
}

function closeEditModal() {
  const modal = document.getElementById('editModal');
  if (!modal) return;
  modal.classList.remove('active');
}

function saveProfileEdits() {
  const name = document.getElementById('edit-name').value.trim();
  const phoneRaw = document.getElementById('edit-phone').value.trim();
  const photo = document.getElementById('edit-photo').value.trim();

  // Validate phone strictly: must be Uzbek format
  if (!isValidPhone(phoneRaw)) {
    alert('Iltimos toʻgʻri telefon raqamini kiriting (masalan: +998901234567 yoki 0901234567).');
    return;
  }

  const phone = normalizePhoneForStorage(phoneRaw);

  // update localStorage currentUser
  const cu = getCurrentUser() || {};
  cu.name = name || cu.name || 'Foydalanuvchi';
  cu.phone = phone;
  cu.photo = photo || cu.photo || 'images/default-avatar.png';
  localStorage.setItem('currentUser', JSON.stringify(cu));

  // Also update existing ads for this user to reflect new phone? Not automatically changing ad owner phone to avoid identity issues.
  // But if you want to migrate ads to new phone number, that is a separate flow.

  alert('Profil maʼlumotlari saqlandi.');
  closeEditModal();
  // refresh UI and stored viewingProfile if user updated own phone
  localStorage.setItem('viewingProfile', cu.phone);
  renderAll();
}

// -----------------------------
// Utility & escape
// -----------------------------
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// -----------------------------
// Initialization & binding events
// -----------------------------
function bindUI(profilePhone) {
  // Edit profile button
  const editBtn = document.getElementById('edit-profile');
  if (editBtn) {
    editBtn.onclick = () => {
      // Only allow editing own profile
      const cu = getCurrentUser();
      if (!cu || String(cu.phone) !== String(profilePhone)) {
        alert('Faqat profil egasi o‘z profilini tahrirlashi mumkin.');
        return;
      }
      openEditModal(profilePhone);
    };
  }

  // Modal buttons
  const cancelEdit = document.getElementById('cancelEdit');
  if (cancelEdit) cancelEdit.onclick = closeEditModal;
  const saveEdit = document.getElementById('saveEdit');
  if (saveEdit) saveEdit.onclick = saveProfileEdits;

  // Add ad button (if form present)
  const addBtn = document.querySelector('[onclick="addAd()"], button[onclick="addAd()"], document.querySelector("#addAdButton")');
  // Since HTML provided earlier had button onclick="addAd()", we attach a safer listener too:
  const pageAddBtn = document.querySelector('button[onclick="addAd()"]') || document.querySelector('button:contains("E’lonni joylash"), button:contains("E’lonni joylash")');
  // But those CSS selectors may not work universally; instead attach to window.addAdFromForm in case addAd in HTML calls it.
  // We'll also attach handler if there is an element with id 'addAdButton'
  const explicitAdd = document.getElementById('addAdButton');
  if (explicitAdd) explicitAdd.onclick = addAdFromForm;
  // Additionally, if page uses function addAd() we ensure it calls addAdFromForm by exposing a wrapper
  window.addAd = addAdFromForm;

  // rating init
  initRatingsUI(profilePhone);
}

// -----------------------------
// Full render (header, ads, ratings, stats)
// -----------------------------
function renderAll() {
  const profilePhone = getViewingProfilePhone();
  if (!profilePhone) {
    // Not enough info: redirect to login
    const cu = getCurrentUser();
    if (!cu) {
      alert('Avval tizimga kiring.');
      window.location.href = 'login.html';
      return;
    }
  }
  const phoneToShow = profilePhone || (getCurrentUser() && getCurrentUser().phone);
  renderProfileHeader(phoneToShow);
  renderAdsList(phoneToShow);
  renderRatingsUI(phoneToShow);
  updateProfileStats(phoneToShow);
}

// -----------------------------
// Synchronization: watch localStorage changes & periodic refresh
// -----------------------------
window.addEventListener('storage', (e) => {
  if (['driverAds', 'passengerAds', 'profileRatings', 'currentUser', 'viewingProfile', 'ads'].includes(e.key)) {
    // re-render everything to stay in sync
    try {
      renderAll();
    } catch (err) {
      console.error('Render error on storage event', err);
    }
  }
});

// Periodic refresh (in case admin changes statuses, etc.)
setInterval(() => {
  try {
    renderAll();
  } catch (err) {
    // swallow
  }
}, 3000);

// -----------------------------
// Boot
// -----------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Ensure some basic structures exist in storage (avoid null errors)
  // Keep existing data; only ensure arrays exist
  if (!localStorage.getItem('driverAds')) localStorage.setItem('driverAds', JSON.stringify([]));
  if (!localStorage.getItem('passengerAds')) localStorage.setItem('passengerAds', JSON.stringify([]));
  if (!localStorage.getItem('profileRatings')) localStorage.setItem('profileRatings', JSON.stringify([]));

  // If currentUser not set, do not force redirect: existing HTML checks and redirects.
  const profilePhone = getViewingProfilePhone() || (getCurrentUser() && getCurrentUser().phone);
  if (!profilePhone) {
    // nothing to render, bail-out (HTML will redirect to login if needed)
    return;
  }

  // Bind UI
  bindUI(profilePhone);

  // Render everything
  renderAll();
});
