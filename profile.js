/* =========================================================================
   profil.js
   To'liq va kengaytirilgan profil sahifasi logikasi
   - LocalStorage asosida ishlaydi
   - Ads (driver/passenger) management: add/edit/delete, one-time edit flag
   - Comments per ad (only poster can add comment when creating ad; others cannot)
   - Ratings: per-ad rating, profile aggregated rating
   - Backward compatibility: adds missing fields to old ads
   - Filters, sorting, pagination for user's ads
   - Notifications / sync with admin changes (localStorage events)
   - Phone validation strictly enforced on profile edit and ad posting
   - Detailed inline comments for maintainability
   ========================================================================= */

/* ============================
   CONFIG / CONSTANTS
   ============================ */
const PROFILE_ADS_PAGE_SIZE = 10; // pagination for profile's ads list (if used)
const LOCAL_KEYS = {
  CURRENT_USER: 'currentUser',
  DRIVER_ADS: 'driverAds',
  PASSENGER_ADS: 'passengerAds',
  USER_NOTIFS: 'userNotifications',
  USER_RATINGS: 'userRatings', // aggregated ratings per profile (object keyed by phone)
  USER_AD_STATUSES: 'userAdStatuses', // used to detect changes for notifications
  APPROVAL_HISTORY: 'approvalHistory',
};
const PHONE_REGEX = /^\+?\d{9,15}$/; // allow 9-15 digits with optional leading +

/* ============================
   UTILITIES
   ============================ */

/**
 * Safe parse JSON
 */
function safeParse(jsonStr, fallback) {
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    return fallback;
  }
}

/**
 * Get current user object from localStorage
 * Return null if not logged
 */
function getCurrentUser() {
  return safeParse(localStorage.getItem(LOCAL_KEYS.CURRENT_USER), null);
}

/**
 * Save current user back to localStorage
 */
function saveCurrentUser(user) {
  if (!user) return;
  localStorage.setItem(LOCAL_KEYS.CURRENT_USER, JSON.stringify(user));
}

/**
 * Get driverAds array
 */
function getDriverAds() {
  return safeParse(localStorage.getItem(LOCAL_KEYS.DRIVER_ADS), []);
}

/**
 * Get passengerAds array
 */
function getPassengerAds() {
  return safeParse(localStorage.getItem(LOCAL_KEYS.PASSENGER_ADS), []);
}

/**
 * Set driverAds
 */
function setDriverAds(arr) {
  localStorage.setItem(LOCAL_KEYS.DRIVER_ADS, JSON.stringify(arr));
}

/**
 * Set passengerAds
 */
function setPassengerAds(arr) {
  localStorage.setItem(LOCAL_KEYS.PASSENGER_ADS, JSON.stringify(arr));
}

/**
 * Merge all ads from multiple storages into a single array
 * Keep ad.type field normalized to 'driver' or 'passenger'
 */
function getAllAdsMerged() {
  const d = getDriverAds().map(a => ({ ...a, type: 'driver' }));
  const p = getPassengerAds().map(a => ({ ...a, type: 'passenger' }));
  return [...d, ...p];
}

/**
 * Save ad to the proper storage by type
 * If ad.id exists -> update, else push new
 */
function saveAdByType(ad) {
  const keyArr = ad.type === 'driver' ? getDriverAds() : getPassengerAds();
  const idx = keyArr.findIndex(a => String(a.id) === String(ad.id));
  if (idx > -1) {
    keyArr[idx] = ad;
  } else {
    keyArr.push(ad);
  }
  if (ad.type === 'driver') setDriverAds(keyArr); else setPassengerAds(keyArr);
}

/**
 * Remove ad by id and type
 */
function removeAdByType(type, id) {
  if (type === 'driver') {
    let arr = getDriverAds().filter(a => String(a.id) !== String(id));
    setDriverAds(arr);
  } else {
    let arr = getPassengerAds().filter(a => String(a.id) !== String(id));
    setPassengerAds(arr);
  }
}

/**
 * Validate phone strictly
 */
function validatePhoneStrict(phone) {
  if (!phone) return false;
  return PHONE_REGEX.test(String(phone).trim());
}

/**
 * Parse date safely
 * Accepts ISO or "DD.MM.YYYY HH:mm" or "DD.MM.YYYY"
 * Returns Date or null
 */
function parseDateFlexible(dateStr) {
  if (!dateStr) return null;
  // Try ISO
  const iso = new Date(dateStr);
  if (!isNaN(iso.getTime())) return iso;
  // Try DD.MM.YYYY [HH:mm]
  const m = String(dateStr).trim().match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (m) {
    const [, dd, mm, yyyy, hh = '0', min = '0'] = m;
    return new Date(+yyyy, +mm - 1, +dd, +hh, +min);
  }
  return null;
}

/* ============================
   BACKWARD COMPATIBILITY FIXES
   - Ensure old ads have required fields: id, createdAt, comment/notes, editable flag, comments array
   - Should be idempotent and safe to run on load
   ============================ */
function fixOldAds() {
  // driverAds
  let changed = false;
  ['driver', 'passenger'].forEach(type => {
    const key = type === 'driver' ? LOCAL_KEYS.DRIVER_ADS : LOCAL_KEYS.PASSENGER_ADS;
    let arr = safeParse(localStorage.getItem(key), []);
    if (!Array.isArray(arr)) arr = [];
    arr = arr.map((ad, i) => {
      // Ensure id
      if (!ad.id) {
        ad.id = `${type}_${Date.now()}_${i}`;
        changed = true;
      }
      // Ensure type
      ad.type = type;
      // Ensure createdAt
      if (!ad.createdAt) {
        // if there's date or dateString fields, try to normalize
        if (ad.date) ad.createdAt = ad.date;
        else if (ad.created) ad.createdAt = ad.created;
        else ad.createdAt = new Date().toISOString();
        changed = true;
      }
      // Normalize status
      if (!ad.status) {
        ad.status = 'pending';
        changed = true;
      } else {
        // map some non-standard values to expected ones
        const s = String(ad.status).toLowerCase();
        if (s.includes('tasdiq') || s.includes('approved')) ad.status = 'approved';
        else if (s.includes('rad') || s.includes('rejected')) ad.status = 'rejected';
        else ad.status = 'pending';
      }
      // Ensure comments array
      if (!Array.isArray(ad.comments)) {
        ad.comments = [];
        changed = true;
      }
      // Ensure editable flag (default true until first inline edit)
      if (typeof ad.editable === 'undefined') {
        ad.editable = true;
        changed = true;
      }
      // Ensure rating field
      if (typeof ad.rating === 'undefined') {
        ad.rating = 0;
        changed = true;
      }
      // Ensure phone field present
      if (!ad.phone) {
        ad.phone = ad.userPhone || (ad.user && ad.user.phone) || 'Noma\'lum';
        changed = true;
      }
      return ad;
    });
    if (changed) {
      localStorage.setItem(key, JSON.stringify(arr));
    } else {
      // Even if not changed, still ensure saved structure is array
      localStorage.setItem(key, JSON.stringify(arr));
    }
  });
  // Return whether changed (not used but helpful)
  return changed;
}

/* ============================
   RATING / REVIEWS STORAGE
   - We keep per-profile aggregated record under 'userRatings' key (object keyed by phone)
   - Also per-ad comments stored inside ad.comments (array)
   ============================ */

function getUserRatingsStore() {
  return safeParse(localStorage.getItem(LOCAL_KEYS.USER_RATINGS), {});
}
function saveUserRatingsStore(store) {
  localStorage.setItem(LOCAL_KEYS.USER_RATINGS, JSON.stringify(store));
}

/**
 * Recompute aggregated profile rating from ads' ratings
 */
function recomputeProfileRatingForPhone(phone) {
  const allAds = getAllAdsMerged();
  const adsByUser = allAds.filter(a => String(a.phone) === String(phone) || String(a.userPhone) === String(phone) || String(a.userId) === String(phone));
  const rated = adsByUser.filter(a => Number(a.rating) > 0);
  const store = getUserRatingsStore();
  if (rated.length === 0) {
    // remove or set to zero
    if (store[phone]) {
      delete store[phone];
      saveUserRatingsStore(store);
    }
    return null;
  }
  const sum = rated.reduce((acc, r) => acc + Number(r.rating), 0);
  const avg = +(sum / rated.length).toFixed(2);
  store[phone] = {
    average: avg,
    total: rated.length,
    // keep last few rating samples optional
    sample: rated.slice(-50).map(a => ({ adId: a.id, rating: a.rating, date: a.createdAt || a.date || '' }))
  };
  saveUserRatingsStore(store);
  return store[phone];
}

/* ============================
   RENDER / UI BINDINGS
   (Assumes the HTML contains many ids/classes used below)
   ============================ */

// Helper to safely get element by id
function $id(id) { return document.getElementById(id); }

// On-page elements (these ids should exist in HTML)
const elUserPhone = $id('userPhone'); // shows current user's phone
const elMyAds = $id('myAds');         // container to list user's ads
const elAdType = $id('adType') || null;
const elFromRegion = $id('fromRegion') || null;
const elFromDistrict = $id('fromDistrict') || null;
const elToRegion = $id('toRegion') || null;
const elToDistrict = $id('toDistrict') || null;
const elPrice = $id('price') || null;
const elAdComment = $id('adComment') || null;
// Filters
const elTypeFilter = $id('typeFilter') || null;
const elStatusFilter = $id('statusFilter') || null;
const elFilterFromRegion = $id('filterFromRegion') || null;
const elFilterFromDistrict = $id('filterFromDistrict') || null;
const elFilterToRegion = $id('filterToRegion') || null;
const elFilterToDistrict = $id('filterToDistrict') || null;

// Stat cards (if exist)
const elTotalAds = $id('totalAds') || null;
const elApprovedAds = $id('approvedAds') || null;
const elPendingAds = $id('pendingAds') || null;
const elRejectedAds = $id('rejectedAds') || null;

// More UI elements (profile editing, logout, rating form inside profile, etc.)
const elCurrentUserName = $id('userName') || null;
const elLogoutBtn = $id('logout') || $id('logoutBtn') || null;

/* ============================
   RENDER PROFILE HEADER (phone/name)
   ============================ */
function renderProfileHeader() {
  const current = getCurrentUser();
  if (!current) {
    // if not logged in, redirect to login page
    // (we do a safe redirect only if login.html exists in flow)
    // window.location.href = 'login.html';
    return;
  }
  if (elUserPhone) elUserPhone.textContent = `Telefon: ${current.phone || '—'}`;
  if (elCurrentUserName) elCurrentUserName.textContent = current.name || 'Foydalanuvchi';
  // also compute aggregated rating
  const ratingStore = getUserRatingsStore();
  const pr = ratingStore[current.phone];
  if (pr) {
    // show somewhere if element exists: e.g., elAvgRating
    const elAvg = $id('avgRating') || null;
    if (elAvg) elAvg.textContent = `⭐ ${pr.average} (${pr.total} ta)`;
  } else {
    const elAvg = $id('avgRating') || null;
    if (elAvg) elAvg.textContent = '⭐ Hozircha baho yo‘q';
  }
}

/* ============================
   RENDER USER ADS (profile page)
   - Shows user's ads with actions: edit, delete, comment/rate
   - Keeps filters applied
   - Preserves ability to add ad (form located in HTML)
   ============================ */
function renderProfileAds({ page = 1, pageSize = PROFILE_ADS_PAGE_SIZE } = {}) {
  const current = getCurrentUser();
  if (!current) {
    if (elMyAds) elMyAds.innerHTML = '<p>Tizimga kiring (login).</p>';
    return;
  }

  // Ensure old ads are fixed before render
  fixOldAds();

  // Get all ads merged
  const all = getAllAdsMerged();

  // Filter to only current user's ads (phone match or userId if used)
  const myAds = all.filter(ad => {
    // allow matching by phone or userId
    const userPhone = String(current.phone);
    return String(ad.phone) === userPhone || String(ad.userId) === userPhone || String(ad.userId) === String(current.id);
  });

  // Apply top-level filters from UI (if present)
  let filtered = [...myAds];
  if (elTypeFilter && elTypeFilter.value && elTypeFilter.value !== 'all') {
    filtered = filtered.filter(a => a.type === elTypeFilter.value);
  }
  if (elStatusFilter && elStatusFilter.value && elStatusFilter.value !== 'all') {
    filtered = filtered.filter(a => (a.status || 'pending') === elStatusFilter.value);
  }
  if (elFilterFromRegion && elFilterFromRegion.value) {
    const fr = elFilterFromRegion.value;
    filtered = filtered.filter(a => (a.fromRegion || a.from || '').includes(fr) || (a.fromRegion || '').includes(fr));
  }
  if (elFilterFromDistrict && elFilterFromDistrict.value) {
    const fd = elFilterFromDistrict.value;
    filtered = filtered.filter(a => (a.fromDistrict || '').includes(fd));
  }
  if (elFilterToRegion && elFilterToRegion.value) {
    const tr = elFilterToRegion.value;
    filtered = filtered.filter(a => (a.toRegion || a.to || '').includes(tr));
  }
  if (elFilterToDistrict && elFilterToDistrict.value) {
    const td = elFilterToDistrict.value;
    filtered = filtered.filter(a => (a.toDistrict || '').includes(td));
  }

  // Sort newest first by createdAt if present or by id
  filtered.sort((A, B) => {
    const da = parseDateFlexible(A.createdAt || A.date) || new Date(0);
    const db = parseDateFlexible(B.createdAt || B.date) || new Date(0);
    return db - da;
  });

  // Pagination
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (page > pages) page = pages;
  const start = (page - 1) * pageSize;
  const pageAds = filtered.slice(start, start + pageSize);

  // Render DOM
  if (!elMyAds) return;
  elMyAds.innerHTML = '';

  // show header info
  const summary = document.createElement('div');
  summary.className = 'profile-ads-summary';
  summary.style.marginBottom = '10px';
  summary.innerHTML = `<div style="font-weight:600">Topilgan e'lonlar: ${total}</div>`;
  elMyAds.appendChild(summary);

  if (pageAds.length === 0) {
    elMyAds.insertAdjacentHTML('beforeend', '<p>Hozircha e’lonlar yo‘q.</p>');
    return;
  }

  pageAds.forEach(ad => {
    const adDiv = document.createElement('div');
    adDiv.className = `ad-box ${ad.status || 'pending'}`;
    adDiv.style.padding = '10px';
    adDiv.style.borderRadius = '8px';
    adDiv.style.border = '1px solid #e6eefc';
    adDiv.style.marginBottom = '10px';
    // Build ad inner HTML carefully escaped
    const from = escapeHtml(ad.fromRegion || ad.from || '');
    const fromD = escapeHtml(ad.fromDistrict || '');
    const to = escapeHtml(ad.toRegion || ad.to || '');
    const toD = escapeHtml(ad.toDistrict || '');
    const phone = escapeHtml(ad.phone || '');
    const price = escapeHtml(ad.price || '');
    const created = escapeHtml(ad.createdAt || ad.date || '');

    // status label with colors
    let statusText = '⏳ Kutilmoqda';
    let statusColor = '#6c757d';
    if ((ad.status || 'pending') === 'approved') {
      statusText = '✅ Tasdiqlangan';
      statusColor = '#28a745';
    } else if ((ad.status || 'pending') === 'rejected') {
      statusText = '❌ Rad etilgan';
      statusColor = '#dc3545';
    }

    // Comments summary (if any)
    let commentsHtml = '';
    if (Array.isArray(ad.comments) && ad.comments.length > 0) {
      commentsHtml = `<div style="margin-top:8px;"><strong>Izohlar (${ad.comments.length}):</strong>`;
      ad.comments.forEach(c => {
        commentsHtml += `<div style="background:#fff;padding:6px;border-radius:6px;margin-top:6px;border:1px solid #eee;">
          <div style="font-weight:600;">${escapeHtml(c.author || c.rater || c.from || 'Anonim')}</div>
          <div style="font-size:14px;">${escapeHtml(c.text || c.comment || '')}</div>
          <div style="font-size:12px;color:#666;margin-top:4px;">${escapeHtml(c.date || '')}</div>
        </div>`;
      });
      commentsHtml += `</div>`;
    }

    // Build action buttons
    const canEdit = !!ad.editable && (ad.status !== 'approved' && ad.status !== 'rejected'); // allowed only if ad.editable true and not approved/rejected
    const editBtn = `<button onclick="profileEditAd('${ad.type}','${ad.id}')" ${!canEdit ? 'disabled style="opacity:0.6;cursor:not-allowed;"' : ''}>✏️ Tahrirlash</button>`;
    const deleteBtn = `<button onclick="profileDeleteAd('${ad.type}','${ad.id}')">🗑️ O'chirish</button>`;

    // Rating UI for each ad (if approved)
    let ratingUI = '';
    if ((ad.status || 'pending') === 'approved') {
      // render stars interactive (1..5). Each star calls profileRateAd
      const ratedVal = Number(ad.rating) || 0;
      ratingUI += `<div style="margin-top:8px;"><strong>Baho:</strong> `;
      for (let s = 1; s <= 5; s++) {
        ratingUI += `<span style="cursor:pointer;font-size:18px;margin-right:4px;" onclick="profileRateAd('${ad.type}','${ad.id}',${s})">${s <= ratedVal ? '⭐' : '☆'}</span>`;
      }
      ratingUI += `</div>`;
      // comments for ad (public)
      // existing comments already shown above; allow current user to add comment if they are the ad owner (per your earlier requirement: "elon joylagan odam izoh qismini qoshadi holos")
      // So: only ad owner can add comment for his own ad when creating it (we implemented at add time). But also allow editing of ad.comment field? Here we allow ad owner to see and add comment if none
      if (!Array.isArray(ad.comments) || ad.comments.length === 0) {
        // show mini input for ad owner to add comment (if current user is owner)
        if (String(getCurrentUser().phone) === String(ad.phone) || String(getCurrentUser().id) === String(ad.userId)) {
          ratingUI += `<div style="margin-top:8px;">
            <textarea id="profile_ad_comment_input_${ad.id}" rows="2" style="width:100%;padding:6px;border-radius:6px;border:1px solid #ccc;" placeholder="Qo‘shimcha izoh (faqat siz ko‘rasiz)"></textarea>
            <div style="margin-top:6px;"><button onclick="profileSaveAdComment('${ad.type}','${ad.id}')">Izohni saqlash</button></div>
          </div>`;
        }
      }
    }

    // Compose innerHTML
    adDiv.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="font-weight:700;">${from}${fromD ? ' ' + fromD : ''} → ${to}${toD ? ' ' + toD : ''}</div>
        <div style="background:${statusColor};color:white;padding:6px 8px;border-radius:6px;font-weight:600;">${statusText}</div>
      </div>
      <div style="margin-top:8px;">
        <div><strong>Narx:</strong> ${price ? price + ' so‘m' : '—'}</div>
        <div style="margin-top:6px;"><strong>Telefon:</strong> ${phone}</div>
        <div style="margin-top:6px;"><strong>Sana:</strong> ${created}</div>
        <div style="margin-top:6px;"><strong>Qo‘shimcha:</strong> ${escapeHtml(ad.desc || ad.comment || '')}</div>
        ${commentsHtml}
        ${ratingUI}
      </div>
      <div style="margin-top:8px;display:flex;gap:8px;">${editBtn} ${deleteBtn}</div>
    `;
    elMyAds.appendChild(adDiv);
  });

  // Render pagination controls if needed
  if (total > pageSize) {
    const pagDiv = document.createElement('div');
    pagDiv.style.marginTop = '10px';
    pagDiv.style.display = 'flex';
    pagDiv.style.gap = '6px';
    // prev
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '◀ Oldingi';
    prevBtn.onclick = () => {
      const nextPage = Math.max(1, page - 1);
      renderProfileAds({ page: nextPage, pageSize });
    };
    pagDiv.appendChild(prevBtn);
    // pages numeric
    for (let i = 1; i <= pages; i++) {
      const b = document.createElement('button');
      b.textContent = i;
      if (i === page) b.style.background = '#0056b3';
      b.onclick = () => { renderProfileAds({ page: i, pageSize }); };
      pagDiv.appendChild(b);
    }
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Keyingi ▶';
    nextBtn.onclick = () => {
      const nextPage = Math.min(pages, page + 1);
      renderProfileAds({ page: nextPage, pageSize });
    };
    pagDiv.appendChild(nextBtn);
    elMyAds.appendChild(pagDiv);
  }
}

/* ============================
   PROFILE: Add new ad (form)
   - Must validate phone matches current user (server side later)
   - New ad gets createdAt and id, editable true
   ============================ */
function profileAddAdFromForm() {
  const current = getCurrentUser();
  if (!current) return alert('Tizimga kiring.');

  const type = (elAdType && elAdType.value) ? elAdType.value : null;
  const from = (elFromRegion && elFromRegion.value) ? elFromRegion.value : (document.getElementById('from') ? document.getElementById('from').value : '');
  const fromDistrict = (elFromDistrict && elFromDistrict.value) ? elFromDistrict.value : (document.getElementById('fromDistrict') ? document.getElementById('fromDistrict').value : '');
  const to = (elToRegion && elToRegion.value) ? elToRegion.value : (document.getElementById('to') ? document.getElementById('to').value : '');
  const toDistrict = (elToDistrict && elToDistrict.value) ? elToDistrict.value : (document.getElementById('toDistrict') ? document.getElementById('toDistrict').value : '');
  const price = (elPrice && elPrice.value) ? elPrice.value : (document.getElementById('price') ? document.getElementById('price').value : '');
  const comment = (elAdComment && elAdComment.value) ? elAdComment.value : (document.getElementById('adComment') ? document.getElementById('adComment').value : '');

  if (!type || !from || !to) {
    return alert('Iltimos yo‘nalish ma’lumotlarini to‘ldiring.');
  }

  // Ensure phone valid
  if (!validatePhoneStrict(String(current.phone))) {
    return alert('Profil telefoningiz formati noto‘g‘ri. Profilni tahrirlab to‘g‘rilang (faqat + va raqamlar, 9-15 ta raqam).');
  }

  // Compose new ad
  const newAd = {
    id: `${type}_${Date.now()}`, // unique-ish
    type,
    phone: String(current.phone),
    userId: current.id || current.phone,
    userName: current.name || '',
    fromRegion: from,
    fromDistrict: fromDistrict || '',
    toRegion: to,
    toDistrict: toDistrict || '',
    price: price || '',
    desc: comment || '',
    comment: comment || '',
    createdAt: new Date().toISOString(),
    status: 'pending',
    editable: true,
    comments: [], // later ad owner may add one comment
    rating: 0
  };

  // Save into respective storage
  if (type === 'driver') {
    const arr = getDriverAds();
    arr.push(newAd);
    setDriverAds(arr);
  } else {
    const arr = getPassengerAds();
    arr.push(newAd);
    setPassengerAds(arr);
  }

  // optionally update stats and re-render
  renderProfileAds({ page: 1, pageSize: PROFILE_ADS_PAGE_SIZE });
  updateAdminStatsIfPresent();
  // Clear form values if present
  if (elAdType) elAdType.value = '';
  if (elFromRegion) elFromRegion.value = '';
  if (elFromDistrict) elFromDistrict.innerHTML = '<option value="">Qayerdan (tuman)</option>';
  if (elToRegion) elToRegion.value = '';
  if (elToDistrict) elToDistrict.innerHTML = '<option value="">Qayerga (tuman)</option>';
  if (elPrice) elPrice.value = '';
  if (elAdComment) elAdComment.value = '';

  alert('✅ E’lon joylandi. Admin tasdiqlashi kutilmoqda.');
}

/* ============================
   PROFILE: Edit ad (prompt-based or inline)
   - Only allowed if ad.editable true and not approved/rejected
   - After edit, mark editable = false (only one time edit allowed)
   ============================ */
function profileEditAd(type, id) {
  // Find ad
  const arr = type === 'driver' ? getDriverAds() : getPassengerAds();
  const idx = arr.findIndex(a => String(a.id) === String(id));
  if (idx === -1) return alert('E’lon topilmadi.');
  const ad = arr[idx];

  // Check editable flag
  if (!ad.editable) return alert('❗ Bu e’lonni tahrirlash ruxsat etilmagan.');

  // Prompt user for new values
  const newFrom = prompt('Qayerdan?', ad.fromRegion || ad.from || '') || '';
  const newFromDistrict = prompt('Qayerdan (tuman)?', ad.fromDistrict || '') || '';
  const newTo = prompt('Qayerga?', ad.toRegion || ad.to || '') || '';
  const newToDistrict = prompt('Qayerga (tuman)?', ad.toDistrict || '') || '';
  const newPrice = prompt('Narx (so\'m):', ad.price || '') || '';
  const newDesc = prompt('Qo\'shimcha (ixtiyoriy):', ad.desc || ad.comment || '') || '';

  if (!newFrom || !newTo) return alert('Yo‘nalishni aniqlang.');

  // Apply changes
  arr[idx] = {
    ...ad,
    fromRegion: newFrom,
    fromDistrict: newFromDistrict,
    toRegion: newTo,
    toDistrict: newToDistrict,
    price: newPrice,
    desc: newDesc,
    comment: newDesc,
    // update timestamp
    createdAt: new Date().toISOString(),
    // block future edits
    editable: false
  };

  // Save back
  if (type === 'driver') setDriverAds(arr); else setPassengerAds(arr);

  // Trigger UI update and profile rating recompute
  renderProfileAds({ page: 1, pageSize: PROFILE_ADS_PAGE_SIZE });
  updateAdminStatsIfPresent();
  alert('✅ E’lon yangilandi. Endi uni qayta tahrirlash mumkin emas.');
}

/* ============================
   PROFILE: Delete ad
   - Ask for confirmation
   ============================ */
function profileDeleteAd(type, id) {
  if (!confirm('E’loni o‘chirilsinmi?')) return;
  removeAdByType(type, id);
  renderProfileAds();
  updateAdminStatsIfPresent();
  alert('🗑 E’lon o‘chirildi.');
}

/* ============================
   PROFILE: Per-ad comment save (ad owner only)
   - This is the extra "izoh" field that ad owner can add when creating ad
   - The UI input id used earlier: profile_ad_comment_input_${ad.id}
   ============================ */
function profileSaveAdComment(type, id) {
  const current = getCurrentUser();
  if (!current) return alert('Tizimga kiring.');

  const input = document.getElementById(`profile_ad_comment_input_${id}`);
  if (!input) return alert('Izoh maydoni topilmadi.');
  const text = String(input.value || '').trim();
  if (!text) return alert('Iltimos izoh kiriting.');

  // Find ad and push comment into ad.comments
  const arr = type === 'driver' ? getDriverAds() : getPassengerAds();
  const idx = arr.findIndex(a => String(a.id) === String(id));
  if (idx === -1) return alert('E’lon topilmadi.');
  const ad = arr[idx];

  // Check owner
  if (!(String(ad.phone) === String(current.phone) || String(ad.userId) === String(current.id))) {
    return alert('Siz bu e’lon egasi emassiz.');
  }

  // Add comment (structure: text, author, date)
  if (!Array.isArray(ad.comments)) ad.comments = [];
  ad.comments.push({ text, author: current.name || current.phone, date: new Date().toLocaleString() });
  arr[idx] = ad;

  // Save
  if (type === 'driver') setDriverAds(arr); else setPassengerAds(arr);

  // Rerender
  renderProfileAds();
  alert('✅ Izoh saqlandi (faqat siz va admin ko‘radi).');
}

/* ============================
   PROFILE: Rate ad
   - Any user (except ad owner) can rate ad when ad is approved
   - After rating, recompute aggregated profile rating
   - You told earlier that rating should be between driver and passenger for a completed job,
     but in current local model we allow any logged-in user to rate any approved ad. This is configurable.
   ============================ */
function profileRateAd(type, id, stars) {
  const current = getCurrentUser();
  if (!current) return alert('Baholash uchun tizimga kiring.');
  const arr = type === 'driver' ? getDriverAds() : getPassengerAds();
  const idx = arr.findIndex(a => String(a.id) === String(id));
  if (idx === -1) return alert('E’lon topilmadi.');
  const ad = arr[idx];

  if ((ad.status || 'pending') !== 'approved') return alert('Faqat tasdiqlangan e’lonlarni baholash mumkin.');

  // Optionally prevent owner from rating own ad
  if (String(ad.phone) === String(current.phone) || String(ad.userId) === String(current.id)) {
    return alert('Siz o‘zingizning e’loningizni baholay olmaysiz.');
  }

  // Save rating on ad
  ad.rating = Number(stars) || 0;

  // Save rating metadata (who rated) to prevent double rating by same user on same ad
  // We'll maintain ad.ratingsDetail = [{ by, stars, date, comment? }]
  if (!Array.isArray(ad.ratingsDetail)) ad.ratingsDetail = [];
  const existing = ad.ratingsDetail.find(r => String(r.by) === String(current.phone) || String(r.by) === String(current.id));
  if (existing) {
    existing.stars = stars;
    existing.date = new Date().toISOString();
  } else {
    ad.ratingsDetail.push({ by: current.phone || current.id, stars, date: new Date().toISOString() });
  }

  arr[idx] = ad;
  if (type === 'driver') setDriverAds(arr); else setPassengerAds(arr);

  // recompute aggregated profile rating for the ad owner
  const adOwnerPhone = ad.phone || ad.userId;
  recomputeProfileRatingForPhone(adOwnerPhone);

  // Rerender
  renderProfileAds();
  updateAdminStatsIfPresent();
  alert('✅ Baho saqlandi.');
}

/* ============================
   UPDATE ADMIN STAT CARDS IF ADMIN PANEL EXISTS
   - This function will update DOM elements in admin.html if they are present on the page where this script runs.
   - It is safe to call; if admin elements aren't present, it quietly does nothing.
   ============================ */
function updateAdminStatsIfPresent() {
  // Collect all ads (merged)
  const all = getAllAdsMerged();
  // Normalize statuses
  const normalized = all.map(a => ({ ...a, status: String(a.status || 'pending').toLowerCase() }));
  const total = normalized.length;
  const approved = normalized.filter(a => a.status === 'approved').length;
  const rejected = normalized.filter(a => a.status === 'rejected').length;
  const pending = normalized.filter(a => a.status === 'pending').length;

  if (elTotalAds) elTotalAds.textContent = String(total);
  if (elApprovedAds) elApprovedAds.textContent = String(approved);
  if (elRejectedAds) elRejectedAds.textContent = String(rejected);
  if (elPendingAds) elPendingAds.textContent = String(pending);
}

/* ============================
   SYNC / NOTIFICATIONS
   - Keeps user notified when admin changes ad status
   - We store last known status per ad in USER_AD_STATUSES in localStorage for comparison
   - On periodic check, show alert or badge if ad status changed
   ============================ */
function syncAdStatusesForUser() {
  const current = getCurrentUser();
  if (!current) return;
  const all = getAllAdsMerged();
  const myAds = all.filter(a => String(a.phone) === String(current.phone) || String(a.userId) === String(current.id));
  const last = safeParse(localStorage.getItem(LOCAL_KEYS.USER_AD_STATUSES), {});
  let updatedLast = { ...last };
  myAds.forEach(ad => {
    const prev = last[ad.id];
    const cur = ad.status || 'pending';
    if (prev && prev !== cur) {
      // Notify user
      if (cur === 'approved') alert(`✅ Sizning e’loni tasdiqlandi: ${ad.fromRegion||ad.from} → ${ad.toRegion||ad.to}`);
      else if (cur === 'rejected') alert(`❌ Sizning e’loni rad etildi: ${ad.fromRegion||ad.from} → ${ad.toRegion||ad.to}`);
    }
    updatedLast[ad.id] = cur;
  });
  localStorage.setItem(LOCAL_KEYS.USER_AD_STATUSES, JSON.stringify(updatedLast));
}

/* ============================
   GLOBAL STORAGE EVENT LISTENER
   - When admin.js or other tab modifies driverAds/passengerAds, we re-render profile UI
   ============================ */
window.addEventListener('storage', function (evt) {
  try {
    if (!evt.key) return;
    if ([LOCAL_KEYS.DRIVER_ADS, LOCAL_KEYS.PASSENGER_ADS].includes(evt.key)) {
      // Try to keep UI in sync; re-render ads and stats
      renderProfileAds();
      updateAdminStatsIfPresent();
      syncAdStatusesForUser();
    }
    if (evt.key === LOCAL_KEYS.USER_RATINGS || evt.key === LOCAL_KEYS.USER_AD_STATUSES) {
      renderProfileAds();
      updateAdminStatsIfPresent();
    }
  } catch (e) {
    console.error('storage listener error', e);
  }
});

/* ============================
   PROFILE EDIT FORM HANDLING
   - Assumes HTML form fields with ids:
     editName, editPhone, editEmail and a submit button that calls profileSaveProfile()
   ============================ */
function profilePopulateEditForm() {
  const curr = getCurrentUser();
  if (!curr) return;
  const nameEl = $id('editName');
  const phoneEl = $id('editPhone');
  const emailEl = $id('editEmail');
  if (nameEl) nameEl.value = curr.name || '';
  if (phoneEl) phoneEl.value = curr.phone || '';
  if (emailEl) emailEl.value = curr.email || '';
}

function profileSaveProfileFromForm(e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  const nameEl = $id('editName');
  const phoneEl = $id('editPhone');
  const emailEl = $id('editEmail');
  const curr = getCurrentUser();
  if (!curr) return alert('Tizimga kiring.');

  const newName = nameEl ? nameEl.value.trim() : curr.name;
  const newPhone = phoneEl ? phoneEl.value.trim() : curr.phone;
  const newEmail = emailEl ? emailEl.value.trim() : curr.email;

  if (!validatePhoneStrict(newPhone)) {
    return alert('Telefon raqam noto\'g\'ri. Faqat + va raqamlar, 9-15 raqam qabul qilinadi.');
  }

  // Update current user and also update ads that have old phone if necessary
  const oldPhone = curr.phone;
  curr.name = newName;
  curr.phone = newPhone;
  curr.email = newEmail;
  saveCurrentUser(curr);

  // Update ads owned by this user phone / id
  let driver = getDriverAds();
  let passenger = getPassengerAds();
  driver = driver.map(a => {
    if (String(a.phone) === String(oldPhone) || String(a.userId) === String(curr.id)) {
      return { ...a, phone: curr.phone, userName: curr.name };
    }
    return a;
  });
  passenger = passenger.map(a => {
    if (String(a.phone) === String(oldPhone) || String(a.userId) === String(curr.id)) {
      return { ...a, phone: curr.phone, userName: curr.name };
    }
    return a;
  });
  setDriverAds(driver);
  setPassengerAds(passenger);

  alert('✅ Profil ma\'lumotlari yangilandi.');
  renderProfileHeader();
  renderProfileAds({ page: 1, pageSize: PROFILE_ADS_PAGE_SIZE });
}

/* ============================
   HELPERS: escapeHtml
   ============================ */
function escapeHtml(input) {
  if (input === null || typeof input === 'undefined') return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ============================
   INITIALIZATION
   - Bind UI event listeners if elements exist
   - Run backward fixes
   - Render initial UI
   ============================ */
function initProfileModule() {
  // Run compatibility fix
  fixOldAds();

  // Bind add ad button (if present)
  const addBtn = $id('addAdButton') || $id('addAd') || $id('addAdBtn');
  if (addBtn) {
    addBtn.addEventListener('click', function (e) {
      e.preventDefault();
      profileAddAdFromForm();
    });
  }

  // If there's an edit profile form submit
  const editForm = $id('editProfileForm') || $id('editForm');
  if (editForm) {
    editForm.addEventListener('submit', profileSaveProfileFromForm);
  }

  // If there is a manual "save ad comment" function (button) those are created inline

  // Bind logout if exists
  if (elLogoutBtn) {
    elLogoutBtn.addEventListener('click', function () {
      if (confirm('Chiqishni xohlaysizmi?')) {
        localStorage.removeItem(LOCAL_KEYS.CURRENT_USER);
        // Redirect to login (if available)
        try { window.location.href = 'login.html'; } catch(e){ window.location.reload(); }
      }
    });
  }

  // Bind filter change events to re-render
  if (elTypeFilter) elTypeFilter.addEventListener('change', () => renderProfileAds({ page: 1 }));
  if (elStatusFilter) elStatusFilter.addEventListener('change', () => renderProfileAds({ page: 1 }));
  if (elFilterFromRegion) elFilterFromRegion.addEventListener('change', () => renderProfileAds({ page: 1 }));
  if (elFilterFromDistrict) elFilterFromDistrict.addEventListener('change', () => renderProfileAds({ page: 1 }));
  if (elFilterToRegion) elFilterToRegion.addEventListener('change', () => renderProfileAds({ page: 1 }));
  if (elFilterToDistrict) elFilterToDistrict.addEventListener('change', () => renderProfileAds({ page: 1 }));

  // Auto-sync check interval for status changes (admin actions)
  setInterval(() => {
    try {
      syncAdStatusesForUser();
      // update admin stats on any page to keep cards in sync
      updateAdminStatsIfPresent();
    } catch (e) {
      console.error('sync interval error', e);
    }
  }, 5000);

  // initial render
  renderProfileHeader();
  renderProfileAds({ page: 1, pageSize: PROFILE_ADS_PAGE_SIZE });

  // update admin stat cards if present on same page
  updateAdminStatsIfPresent();
}

// Run initialization on DOMContentLoaded (safe)
document.addEventListener('DOMContentLoaded', initProfileModule);

/* ============================
   EXPORTS for console/debug (optional)
   ============================ */
window.profileModule = {
  getCurrentUser,
  saveCurrentUser,
  getAllAdsMerged,
  saveAdByType,
  removeAdByType,
  profileAddAdFromForm,
  profileEditAd,
  profileDeleteAd,
  profileRateAd,
  profileSaveAdComment,
  renderProfileAds,
  renderProfileHeader,
  recomputeProfileRatingForPhone,
  updateAdminStatsIfPresent,
  fixOldAds
};

/* =========================================================================
   END OF profil.js
   ========================================================================= */
