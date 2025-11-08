// profile.js
// Full-featured profile script for ShaharTaxi
// - Compatible with driverAds, passengerAds, ads (legacy), reviews, userRatings, userNotifications, approvalHistory
// - Implements: profile display & edit (1-time), add ad, edit ad (only if not approved, and edit-once per-ad), delete ad,
//   ad filters, search, pagination, rating (profile-level & ad-level), comments, sync notifications, date parsing,
//   CSV export/import helpers, standardize dates, and helper debug utilities.
// - Keep this file complete — do not remove functions if integrating into an existing project.

// ======================== Configuration ========================
const PAGE_SIZE = 8; // ads per page in profile view (adjustable)
const PHONE_REGEX = /^[+]?[0-9\s\-()]{9,20}$/; // relaxed international-ish validation

// LocalStorage keys used across system (keep consistent)
const KEY_DRIVER = 'driverAds';
const KEY_PASSENGER = 'passengerAds';
const KEY_LEGACY_ADS = 'ads';
const KEY_REVIEWS = 'reviews'; // ad-level reviews (legacy places)
const KEY_USER_RATINGS = 'userRatings'; // per-profile ratings
const KEY_USER_NOTIFS = 'userNotifications';
const KEY_APPROVAL_HISTORY = 'approvalHistory';
const KEY_CURRENT_USER = 'currentUser';
const KEY_USER_AD_STATUSES = 'userAdStatuses';

// ======================== Utilities ========================
function safeParseJSON(s, fallback) {
  try { return JSON.parse(s || 'null') || fallback; } catch (e) { return fallback; }
}
function nowISO() { return (new Date()).toISOString(); }
function nowLocale() { return (new Date()).toLocaleString(); }
function escapeHtml(str) {
  if (!str && str !== 0) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

// Date parser supporting ISO and DD.MM.YYYY and local strings
function parseDateFlexible(s) {
  if (!s) return null;
  let d = new Date(s);
  if (!isNaN(d)) return d;
  const m = String(s).trim().match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (m) {
    const [, day, month, year, hour='0', minute='0'] = m;
    return new Date(+year, +month-1, +day, +hour, +minute);
  }
  return null;
}

// Normalize status names coming from different places
function normalizeStatus(s) {
  if (!s) return 'pending';
  const st = String(s).toLowerCase();
  if (st.includes('approved') || st.includes('tasdiq') || st.includes('tasdiqlan')) return 'approved';
  if (st.includes('reject') || st.includes('rad')) return 'rejected';
  if (st.includes('pending') || st.includes('kut')) return 'pending';
  return st; // fallback
}

// Merge driver/passenger/legacy lists into a unified array
function loadAllAds() {
  const driver = safeParseJSON(localStorage.getItem(KEY_DRIVER), []);
  const passenger = safeParseJSON(localStorage.getItem(KEY_PASSENGER), []);
  const legacy = safeParseJSON(localStorage.getItem(KEY_LEGACY_ADS), []);
  // Ensure every ad has required fields and id
  const normalize = (a, type) => {
    if (!a) return null;
    const ad = Object.assign({}, a);
    if (!ad.id) ad.id = `${type || ad.type || 'ad'}_${Date.now()}_${Math.floor(Math.random()*10000)}`;
    if (!ad.type) ad.type = type || (ad.phone && ad.phone[0] === '+' ? 'driver' : 'passenger');
    if (!ad.status) ad.status = 'pending';
    if (!ad.createdAt) ad.createdAt = nowISO();
    // ensure arrays
    if (!Array.isArray(ad.ratings)) ad.ratings = ad.ratings || [];
    if (!Array.isArray(ad.comments)) ad.comments = ad.comments || [];
    return ad;
  };
  const out = [
    ...driver.map(a => normalize(a, 'driver')),
    ...passenger.map(a => normalize(a, 'passenger')),
    ...legacy.map(a => normalize(a, a.type || 'legacy'))
  ].filter(Boolean);
  return out;
}

// Save back into driver/passenger storages based on ad.type (keeps legacy untouched)
function saveAdToStorage(ad) {
  if (!ad || !ad.type) return;
  if (ad.type === 'driver') {
    const arr = safeParseJSON(localStorage.getItem(KEY_DRIVER), []);
    const idx = arr.findIndex(x => String(x.id) === String(ad.id));
    if (idx >= 0) arr[idx] = ad; else arr.push(ad);
    localStorage.setItem(KEY_DRIVER, JSON.stringify(arr));
    return;
  }
  if (ad.type === 'passenger') {
    const arr = safeParseJSON(localStorage.getItem(KEY_PASSENGER), []);
    const idx = arr.findIndex(x => String(x.id) === String(ad.id));
    if (idx >= 0) arr[idx] = ad; else arr.push(ad);
    localStorage.setItem(KEY_PASSENGER, JSON.stringify(arr));
    return;
  }
  // fallback: add to legacy list
  const leg = safeParseJSON(localStorage.getItem(KEY_LEGACY_ADS), []);
  const li = leg.findIndex(x => String(x.id) === String(ad.id));
  if (li >= 0) leg[li] = ad; else leg.push(ad);
  localStorage.setItem(KEY_LEGACY_ADS, JSON.stringify(leg));
}

// Delete ad from storage by id & type (keeps legacy too)
function deleteAdFromStorage(id, type) {
  if (type === 'driver') {
    const arr = safeParseJSON(localStorage.getItem(KEY_DRIVER), []);
    localStorage.setItem(KEY_DRIVER, JSON.stringify(arr.filter(a => String(a.id) !== String(id))));
    return;
  }
  if (type === 'passenger') {
    const arr = safeParseJSON(localStorage.getItem(KEY_PASSENGER), []);
    localStorage.setItem(KEY_PASSENGER, JSON.stringify(arr.filter(a => String(a.id) !== String(id))));
    return;
  }
  // legacy
  const leg = safeParseJSON(localStorage.getItem(KEY_LEGACY_ADS), []);
  localStorage.setItem(KEY_LEGACY_ADS, JSON.stringify(leg.filter(a => String(a.id) !== String(id))));
}

// Helper to update stats object (keeps compatibility)
function updateGlobalStats() {
  const all = loadAllAds();
  const stats = {
    drivers: safeParseJSON(localStorage.getItem(KEY_DRIVER), []).length,
    passengers: safeParseJSON(localStorage.getItem(KEY_PASSENGER), []).length,
    approved: all.filter(a => normalizeStatus(a.status) === 'approved').length,
    rejected: all.filter(a => normalizeStatus(a.status) === 'rejected').length,
    pending: all.filter(a => normalizeStatus(a.status) === 'pending').length
  };
  localStorage.setItem('stats', JSON.stringify(stats));
  // also update admin/statistic UI if present
  if (document.getElementById('totalAds')) {
    document.getElementById('totalAds').textContent = stats.drivers + stats.passengers;
    const total = stats.drivers + stats.passengers;
    if (document.getElementById('approvedAds')) document.getElementById('approvedAds').textContent = stats.approved;
    if (document.getElementById('pendingAds')) document.getElementById('pendingAds').textContent = stats.pending;
    if (document.getElementById('rejectedAds')) document.getElementById('rejectedAds').textContent = stats.rejected;
  }
}

// ======================== Profile & Session ========================
let CURRENT_USER = safeParseJSON(localStorage.getItem(KEY_CURRENT_USER), null);
if (!CURRENT_USER) {
  // Attempt to read fallback key
  CURRENT_USER = safeParseJSON(localStorage.getItem('currentUserPhone') || null, null);
  if (CURRENT_USER && typeof CURRENT_USER === 'string') {
    CURRENT_USER = { phone: CURRENT_USER, name: 'Foydalanuvchi', email: '' };
  }
}
// store current user phone separately for legacy compatibility
if (CURRENT_USER && CURRENT_USER.phone) localStorage.setItem('currentUserPhone', CURRENT_USER.phone);

// Determine which profile is being viewed: window.profilePhone or viewingProfile or currentUser
let VIEWING_PROFILE_PHONE = window.profilePhone || localStorage.getItem('viewingProfile') || (CURRENT_USER && CURRENT_USER.phone) || null;

// expose global
window.profilePhone = VIEWING_PROFILE_PHONE;

// ======================== DOM Helpers ========================
function q(id) { return document.getElementById(id); }

// Init: ensure comment/rating fields exist for existing ads (backfill)
function backfillAdFields() {
  const driver = safeParseJSON(localStorage.getItem(KEY_DRIVER), []);
  const passenger = safeParseJSON(localStorage.getItem(KEY_PASSENGER), []);
  let changed = false;
  [driver, passenger].forEach(arr => {
    arr.forEach(a => {
      if (!Array.isArray(a.ratings)) { a.ratings = []; changed = true; }
      if (!Array.isArray(a.comments)) { a.comments = []; changed = true; }
      if (!a.createdAt) { a.createdAt = nowISO(); changed = true; }
      if (!a.id) { a.id = `${a.type||'ad'}_${Date.now()}_${Math.floor(Math.random()*10000)}`; changed = true; }
    });
  });
  if (changed) {
    localStorage.setItem(KEY_DRIVER, JSON.stringify(driver));
    localStorage.setItem(KEY_PASSENGER, JSON.stringify(passenger));
  }
}

// ======================== Render Profile ========================
function renderProfileHeader() {
  // profileName, profilePhone, profileEmail, starContainer, avgRating exist in HTML
  const nameEl = q('profileName');
  const phoneEl = q('profilePhone');
  const emailEl = q('profileEmail');
  const starEl = q('starContainer');
  const avgEl = q('avgRating');

  const viewer = CURRENT_USER || { name: 'Foydalanuvchi', phone: '', email: '' };
  if (nameEl) nameEl.textContent = viewer.name || 'Foydalanuvchi';
  if (phoneEl) phoneEl.textContent = `Telefon: ${viewer.phone || '—'}`;
  if (emailEl) emailEl.textContent = `Email: ${viewer.email || '—'}`;

  renderProfileRating(VIEWING_PROFILE_PHONE || viewer.phone);
}

// Compute and render profile-level rating (based on ads ratings)
function renderProfileRating(profilePhone) {
  const list = getAllProfileRatings(profilePhone);
  const starEl = q('starContainer');
  const avgEl = q('avgRating');
  const avg = list.length ? (list.reduce((s,r)=> s + Number(r.stars||0), 0) / list.length) : 0;
  const avgDisplay = avg ? avg.toFixed(1) : '0.0';
  if (avgEl) avgEl.textContent = `(${avgDisplay})`;
  if (starEl) {
    starEl.innerHTML = '';
    const rounded = Math.round(avg);
    for (let i=1;i<=5;i++){
      const s = document.createElement('span');
      s.textContent = i <= rounded ? '⭐' : '☆';
      starEl.appendChild(s);
    }
  }
}

// Get aggregated profile-level ratings stored in userRatings key (backwards compatibility)
function getAllProfileRatings(profilePhone) {
  // primary structure used earlier: userRatings[profilePhone] = { average, total, ratings: [{from, stars, comment, date}] }
  const ratingsData = safeParseJSON(localStorage.getItem(KEY_USER_RATINGS), {});
  if (ratingsData && ratingsData[profilePhone] && Array.isArray(ratingsData[profilePhone].ratings)) {
    return ratingsData[profilePhone].ratings.map(r => ({ stars: Number(r.stars||0) }));
  }
  // fallback: compute from ads' ratings/comments
  const ads = loadAllAds().filter(a => String(a.phone || a.user || '') === String(profilePhone) || String(a.fromPhone||'')===String(profilePhone));
  const collected = [];
  ads.forEach(ad => {
    if (Array.isArray(ad.ratings)) ad.ratings.forEach(r => collected.push({ stars: Number(r) }));
    // support legacy reviews structure (reviews keyed by adId)
    const revs = safeParseJSON(localStorage.getItem(KEY_REVIEWS), []);
    if (revs && revs.length) {
      revs.filter(rv => String(rv.adId) === String(ad.id)).forEach(rv => {
        if (rv && rv.stars) collected.push({ stars: Number(rv.stars) });
      });
    }
  });
  return collected;
}

// ======================== Ads List Rendering (profile view) ========================
let PROFILE_PAGE = 1;
let PROFILE_FILTER_TYPE = 'all'; // driver/passenger/all
let PROFILE_FILTER_STATUS = 'all';
let PROFILE_SEARCH_Q = '';
let PROFILE_SORT = 'desc'; // by date desc/asc

function gatherProfileAds() {
  // gather all ads then filter by profile owner and filters
  const all = loadAllAds();
  const profilePhone = VIEWING_PROFILE_PHONE || (CURRENT_USER && CURRENT_USER.phone);
  const filteredByOwner = all.filter(ad => {
    // match by phone, user email, or ad.user etc.
    const ownerPhones = [ad.phone, ad.user, ad.fromPhone, ad.owner].map(x => x || '').map(String);
    const match = profilePhone ? ownerPhones.some(p => p && String(p) === String(profilePhone)) : false;
    // if viewing own profile (no viewingProfile set) also show ads created by currentUser.email or phone
    if (!VIEWING_PROFILE_PHONE && CURRENT_USER) {
      const mePhones = [CURRENT_USER.phone, CURRENT_USER.email].map(String);
      if (!match && (mePhones.includes(String(ad.phone)) || mePhones.includes(String(ad.user)))) return true;
    }
    return match;
  });

  // apply filters
  let out = filteredByOwner.slice();
  if (PROFILE_FILTER_TYPE !== 'all') out = out.filter(a => a.type === PROFILE_FILTER_TYPE);
  if (PROFILE_FILTER_STATUS !== 'all') out = out.filter(a => normalizeStatus(a.status) === PROFILE_FILTER_STATUS);
  if (PROFILE_SEARCH_Q) {
    const ql = PROFILE_SEARCH_Q.toLowerCase();
    out = out.filter(a => {
      return (String(a.from || '') + ' ' + String(a.to || '') + ' ' + String(a.phone||'') + ' ' + String(a.id||'')).toLowerCase().includes(ql);
    });
  }

  // sort by createdAt
  out.sort((A,B) => {
    const da = parseDateFlexible(A.createdAt) || new Date(0);
    const db = parseDateFlexible(B.createdAt) || new Date(0);
    return PROFILE_SORT === 'asc' ? da - db : db - da;
  });

  return out;
}

function renderProfileAds() {
  const container = q('adsContainer');
  if (!container) return;
  const all = gatherProfileAds();
  if (!all.length) {
    container.innerHTML = '<p>Hozircha e’lonlar yo‘q.</p>';
    return;
  }

  // pagination
  const pageCount = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  if (PROFILE_PAGE > pageCount) PROFILE_PAGE = pageCount;
  const start = (PROFILE_PAGE -1) * PAGE_SIZE;
  const pageAds = all.slice(start, start + PAGE_SIZE);

  container.innerHTML = ''; // clear

  pageAds.forEach(ad => {
    const card = document.createElement('div');
    card.className = 'ad-card';

    const status = normalizeStatus(ad.status);
    const statusClass =
      status === 'approved' ? 'status-approved' :
      status === 'rejected' ? 'status-rejected' : 'status-pending';
    const statusText =
      status === 'approved' ? 'Tasdiqlangan' :
      status === 'rejected' ? 'Rad etilgan' : 'Kutilmoqda';

    // build HTML
    const created = parseDateFlexible(ad.createdAt);
    const createdStr = created ? created.toLocaleString() : (ad.createdAt || '—');

    const fromEsc = escapeHtml(ad.from || ad.fromRegion || ad.origin || '—');
    const toEsc = escapeHtml(ad.to || ad.toRegion || ad.destination || '—');
    const priceEsc = escapeHtml(ad.price || 'Ko‘rsatilmagan');

    const descEsc = escapeHtml(ad.desc || ad.description || '');

    const editingAllowed = status !== 'approved' && !ad.lockedEdit; // lockedEdit allows "one-time edit" semantics

    // Ratings summary for this ad
    const avgAdRating = (Array.isArray(ad.ratings) && ad.ratings.length) ? (ad.ratings.reduce((s,v)=>s+Number(v||0),0)/ad.ratings.length).toFixed(1) : null;

    card.innerHTML = `
      <div class="ad-header">
        <h4>${fromEsc} → ${toEsc}</h4>
        <span class="ad-status ${statusClass}">${statusText}</span>
      </div>
      <div class="ad-body">
        <p><b>Narx:</b> ${priceEsc} so‘m</p>
        ${descEsc ? `<p>${descEsc}</p>` : ''}
        <p class="date-info">🕒 Joylangan: ${createdStr}</p>
      </div>
      <div class="ad-actions">
        <button class="edit-btn" ${editingAllowed ? '' : 'disabled'} data-adid="${escapeHtml(ad.id)}">Tahrirlash</button>
        <button class="delete-btn" data-adid="${escapeHtml(ad.id)}">O‘chirish</button>
      </div>

      <div class="rating-section" style="margin-top:10px;">
        <div class="ad-rating-summary" style="margin-bottom:6px;">
          ${ avgAdRating ? `<strong>⭐ ${avgAdRating} / 5</strong> (${ad.ratings.length} ta)` : `<strong>⭐ Maksimal: 5.0</strong>` }
        </div>
        <div class="ad-rating-inputs" style="display:flex;gap:6px;align-items:center;">
          <div class="stars" data-adid="${escapeHtml(ad.id)}">
            <span data-rate="1">☆</span><span data-rate="2">☆</span><span data-rate="3">☆</span><span data-rate="4">☆</span><span data-rate="5">☆</span>
          </div>
          <textarea class="rating-comment" data-adid="${escapeHtml(ad.id)}" placeholder="Ixtiyoriy izoh (agar xohlasangiz)"></textarea>
          <button class="rating-submit" data-adid="${escapeHtml(ad.id)}">Baholash</button>
        </div>
      </div>

      <div class="comment-box" style="margin-top:10px;">
        <div class="comments-list" data-adid="${escapeHtml(ad.id)}">
          <!-- existing comments appended here -->
        </div>
        <textarea class="comment-input" data-adid="${escapeHtml(ad.id)}" placeholder="Sharh yozing... (ixtiyoriy)"></textarea>
        <button class="comment-submit" data-adid="${escapeHtml(ad.id)}">Yuborish</button>
      </div>
    `;

    // attach to DOM
    container.appendChild(card);

    // render comments for this ad (combined from ad.comments and reviews storage)
    const commentsListEl = card.querySelector(`.comments-list[data-adid="${escapeHtml(ad.id)}"]`);
    renderCommentsForAd(ad, commentsListEl);

    // wire up buttons
    const editBtn = card.querySelector('.edit-btn');
    const deleteBtn = card.querySelector('.delete-btn');
    const starsWrap = card.querySelector(`.stars[data-adid="${escapeHtml(ad.id)}"]`);
    const ratingSubmit = card.querySelector(`.rating-submit[data-adid="${escapeHtml(ad.id)}"]`);
    const ratingText = card.querySelector(`.rating-comment[data-adid="${escapeHtml(ad.id)}"]`);
    const commentInput = card.querySelector(`.comment-input[data-adid="${escapeHtml(ad.id)}"]`);
    const commentSubmit = card.querySelector(`.comment-submit[data-adid="${escapeHtml(ad.id)}"]`);

    // edit
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        if (!editingAllowed) { alert('Tasdiqlangan e’lonni tahrirlash mumkin emas!'); return; }
        // Open prompt-based quick edit (preserve earlier behavior). Could be improved to inline edit form.
        const newFrom = prompt("Yangi 'Qayerdan' manzil:", ad.from || '');
        const newTo = prompt("Yangi 'Qayerga' manzil:", ad.to || '');
        const newPrice = prompt("Yangi narx (so‘m):", ad.price || '');
        if (newFrom === null || newTo === null || newPrice === null) return; // cancelled
        // update
        ad.from = newFrom.trim();
        ad.to = newTo.trim();
        ad.price = newPrice.trim();
        // mark edited & lock further edits if logic requires (one-time edit per ad)
        ad.edited = true;
        ad.lockedEdit = true; // prevents further inline edits; admin can unlock via admin panel
        ad.status = 'pending'; // after edit -> require re-approval
        saveAdToStorage(ad);
        updateGlobalStats();
        renderProfileAds();
        alert('E’lon tahrirlandi va qayta tasdiqlash talab qilinadi.');
      });
    }

    // delete
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        if (!confirm('E’loni o‘chirmoqchimisiz?')) return;
        deleteAdFromStorage(ad.id, ad.type);
        updateGlobalStats();
        renderProfileAds();
      });
    }

    // stars rating selection (simple visual selection)
    if (starsWrap) {
      const stars = Array.from(starsWrap.querySelectorAll('span'));
      stars.forEach(star => {
        star.addEventListener('click', () => {
          const rs = Number(star.dataset.rate);
          stars.forEach(s => s.textContent = Number(s.dataset.rate) <= rs ? '★' : '☆');
          // store selected on DOM element for later submit
          starsWrap.dataset.selected = rs;
        });
      });
    }

    // rating submit (only viewers other than ad owner can rate)
    if (ratingSubmit) {
      ratingSubmit.addEventListener('click', () => {
        const rater = (CURRENT_USER && CURRENT_USER.phone) || localStorage.getItem('currentUserPhone') || null;
        if (!rater) { alert('Baholash uchun tizimga kiring!'); return; }
        // cannot rate own ad/profile
        const ownerPhones = [ad.phone, ad.user, ad.fromPhone, ad.owner].map(x => String(x||''));
        if (ownerPhones.includes(String(rater))) { alert('Siz o‘zingizning e’loningizni baholay olmaysiz.'); return; }
        // check selection
        const sel = starsWrap && starsWrap.dataset.selected ? Number(starsWrap.dataset.selected) : 0;
        if (!sel) { alert('Iltimos, yulduz tanlang!'); return; }
        // save into ad.ratings and ad.comments optionally
        if (!Array.isArray(ad.ratings)) ad.ratings = [];
        ad.ratings.push(sel);
        // optional comment
        const ctext = (ratingText && ratingText.value || '').trim();
        if (ctext) {
          if (!Array.isArray(ad.comments)) ad.comments = [];
          ad.comments.push({ by: rater, text: ctext, date: nowLocale() });
        }
        saveAdToStorage(ad);
        updateGlobalStats();
        renderProfileAds();
        alert('Baho saqlandi!');
      });
    }

    // comment submit
    if (commentSubmit) {
      commentSubmit.addEventListener('click', () => {
        const writer = (CURRENT_USER && CURRENT_USER.phone) || localStorage.getItem('currentUserPhone') || null;
        if (!writer) { alert('Sharh yozish uchun tizimga kiring!'); return; }
        const txt = (commentInput && commentInput.value || '').trim();
        if (!txt) { alert('Iltimos, sharh yozing!'); return; }
        if (!Array.isArray(ad.comments)) ad.comments = [];
        ad.comments.push({ by: writer, text: txt, date: nowLocale() });
        saveAdToStorage(ad);
        updateGlobalStats();
        renderProfileAds();
        alert('Sharh jo‘natildi!');
      });
    }
  });

  // pagination controls (append after container)
  renderPaginationForProfile(all.length);
}

function renderCommentsForAd(ad, containerEl) {
  if (!containerEl) return;
  containerEl.innerHTML = '';
  let comments = Array.isArray(ad.comments) ? ad.comments : [];
  // also pull legacy reviews keyed by ad.id from KEY_REVIEWS
  const legacy = safeParseJSON(localStorage.getItem(KEY_REVIEWS), []);
  if (legacy && legacy.length) {
    const addRev = legacy.filter(r => String(r.adId) === String(ad.id)).map(r => ({
      by: r.phone || r.writer || 'Noma\'lum',
      text: r.text || '',
      date: r.date || nowLocale()
    }));
    comments = comments.concat(addRev);
  }
  if (!comments.length) {
    containerEl.innerHTML = '<p style="color:#666;">Hech qanday sharh yo‘q.</p>';
    return;
  }
  // show newest first
  comments.slice().reverse().forEach(c => {
    const div = document.createElement('div');
    div.style.padding = '8px';
    div.style.borderBottom = '1px solid #eee';
    div.innerHTML = `<div style="font-weight:600;">${escapeHtml(c.by || 'Noma\'lum')}</div>
      <div style="color:#333;margin-top:4px;">${escapeHtml(c.text || '')}</div>
      <div style="font-size:12px;color:#666;margin-top:6px;">${escapeHtml(c.date || '')}</div>`;
    containerEl.appendChild(div);
  });
}

// Pagination rendering helper (profile)
function renderPaginationForProfile(totalCount) {
  // remove old controls if any
  const existing = document.getElementById('profilePaginationControls');
  if (existing) existing.remove();
  const container = q('adsContainer');
  if (!container) return;
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  if (pageCount <= 1) return;
  const wrapper = document.createElement('div');
  wrapper.id = 'profilePaginationControls';
  wrapper.className = 'pagination';
  wrapper.style.marginTop = '12px';
  // prev
  const prev = document.createElement('button'); prev.textContent = '◀'; prev.onclick = () => { if (PROFILE_PAGE>1) { PROFILE_PAGE--; renderProfileAds(); }};
  wrapper.appendChild(prev);
  // pages (compact - show up to 7)
  const start = Math.max(1, PROFILE_PAGE - 3);
  const end = Math.min(pageCount, PROFILE_PAGE + 3);
  for (let p = start; p <= end; p++) {
    const b = document.createElement('button');
    b.textContent = String(p);
    if (p === PROFILE_PAGE) b.style.background = '#0056b3';
    b.onclick = (() => { const pp = p; return () => { PROFILE_PAGE = pp; renderProfileAds(); }; })();
    wrapper.appendChild(b);
  }
  const next = document.createElement('button'); next.textContent = '▶'; next.onclick = () => { if (PROFILE_PAGE < pageCount) { PROFILE_PAGE++; renderProfileAds(); }};
  wrapper.appendChild(next);
  container.parentNode.appendChild(wrapper);
}

// ======================== Filters/Search Controls binding ========================
function bindFilterControls() {
  const tf = q('typeFilter');
  const sf = q('statusFilter');
  const searchEl = q('searchInput');
  const sortEl = q('sortFilter');

  if (tf) {
    tf.addEventListener('change', () => { PROFILE_FILTER_TYPE = tf.value || 'all'; PROFILE_PAGE = 1; renderProfileAds(); });
  }
  if (sf) {
    sf.addEventListener('change', () => { PROFILE_FILTER_STATUS = sf.value || 'all'; PROFILE_PAGE = 1; renderProfileAds(); });
  }
  if (searchEl) {
    searchEl.addEventListener('input', () => { PROFILE_SEARCH_Q = searchEl.value || ''; PROFILE_PAGE = 1; renderProfileAds(); });
  }
  if (sortEl) {
    sortEl.addEventListener('change', () => { PROFILE_SORT = sortEl.value || 'desc'; PROFILE_PAGE = 1; renderProfileAds(); });
  }
}

// ======================== Add / Edit Forms binding ========================
function bindProfileActions() {
  const editBtn = q('editProfileBtn');
  const addBtn = q('addAdBtn');
  const logoutBtn = q('logoutBtn');

  const editForm = q('editForm');
  const addForm = q('addForm');

  // Toggle logic
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      if (!CURRENT_USER) { alert('Profilni tahrirlash uchun tizimga kiring!'); return; }
      // one-time edit enforcement: check localStorage flag
      const allowed = localStorage.getItem('profileEditAllowed') !== 'false'; // default true
      if (localStorage.getItem('profileEdited') === 'true' && !allowed) {
        alert('Profilni faqat bir marta tahrirlash mumkin.'); return;
      }
      if (addForm) addForm.style.display = 'none';
      if (editForm) {
        // prefill
        const eName = q('editName'); const ePhone = q('editPhone'); const eEmail = q('editEmail');
        if (eName) eName.value = CURRENT_USER.name || '';
        if (ePhone) ePhone.value = CURRENT_USER.phone || '';
        if (eEmail) eEmail.value = CURRENT_USER.email || '';
        editForm.style.display = editForm.style.display === 'block' ? 'none' : 'block';
      }
    });
  }

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      if (!CURRENT_USER) { alert('E’lon joylash uchun tizimga kiring!'); return; }
      if (editForm) editForm.style.display = 'none';
      if (addForm) addForm.style.display = addForm.style.display === 'block' ? 'none' : 'block';
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Chiqishni xohlaysizmi?')) {
        localStorage.removeItem(KEY_CURRENT_USER);
        localStorage.removeItem('currentUserPhone');
        window.location.href = 'login.html';
      }
    });
  }

  // editForm submit
  if (editForm) {
    editForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = q('editName').value.trim();
      const phone = q('editPhone').value.trim();
      const email = q('editEmail').value.trim();
      if (!name || !phone) { alert('Iltimos ism va telefonni to‘ldiring.'); return; }
      if (!PHONE_REGEX.test(phone)) { alert('Iltimos telefon formatini tekshiring.'); return; }
      // save
      CURRENT_USER = { name, phone, email };
      localStorage.setItem(KEY_CURRENT_USER, JSON.stringify(CURRENT_USER));
      localStorage.setItem('currentUserPhone', phone);
      // mark edited one-time
      localStorage.setItem('profileEdited', 'true');
      // optional: allow future edits disabled: leave as is (we enforce server-side later)
      // re-render
      renderProfileHeader();
      editForm.style.display = 'none';
      alert('Profil saqlandi.');
    });
  }

  // addForm submit (create new ad)
  if (addForm) {
    addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const from = (q('from') && q('from').value.trim()) || '';
      const to = (q('to') && q('to').value.trim()) || '';
      const price = (q('price') && q('price').value.trim()) || '';
      const desc = (q('desc') && q('desc').value.trim()) || '';
      const type = (q('adType') && q('adType').value) || (q('adType') ? q('adType').value : 'driver'); // optional adType input
      if (!from || !to) { alert('Iltimos yo‘nalishni to‘liq kiriting.'); return; }
      // build ad
      const ad = {
        id: `${type || 'ad'}_${Date.now()}_${Math.floor(Math.random()*10000)}`,
        type: type || 'driver',
        from, to, price, desc,
        phone: CURRENT_USER.phone || '',
        user: CURRENT_USER && CURRENT_USER.email || '',
        status: 'pending',
        createdAt: nowISO(),
        ratings: [],
        comments: []
      };
      // save to appropriate storage
      saveAdToStorage(ad);
      updateGlobalStats();
      // clear form & hide
      if (q('from')) q('from').value = '';
      if (q('to')) q('to').value = '';
      if (q('price')) q('price').value = '';
      if (q('desc')) q('desc').value = '';
      addForm.style.display = 'none';
      renderProfileAds();
      alert('E’lon joylandi. Admin tasdiqlashi kerak.');
    });
  }
}

// ======================== Sync with Admin notifications / polling ========================
function syncUserNotifications() {
  // Show alerts for any changes in ad status for the current user's ads
  const allAds = loadAllAds();
  const myPhone = (CURRENT_USER && CURRENT_USER.phone) || localStorage.getItem('currentUserPhone');
  if (!myPhone) return;
  const userAds = allAds.filter(a => String(a.phone || a.user || '') === String(myPhone));
  const lastStatuses = safeParseJSON(localStorage.getItem(KEY_USER_AD_STATUSES), {});
  let changedAny = false;

  userAds.forEach(ad => {
    const prev = lastStatuses[ad.id];
    if (prev && prev !== ad.status) {
      // new status change — notify
      const msg = ad.status === 'approved' ? `✅ E’lon tasdiqlandi: ${ad.from} → ${ad.to}` : `❌ E’lon rad etildi: ${ad.from} → ${ad.to}`;
      // push to userNotifications
      const store = safeParseJSON(localStorage.getItem(KEY_USER_NOTIFS), []);
      store.push({ phone: myPhone, adId: ad.id, message: msg, date: nowISO() });
      localStorage.setItem(KEY_USER_NOTIFS, JSON.stringify(store));
      // also show browser alert (if user enabled)
      try {
        if (window.Notification && Notification.permission === 'granted') {
          new Notification('ShaharTaxi', { body: msg });
        }
      } catch(e){}
      changedAny = true;
    }
    lastStatuses[ad.id] = ad.status;
  });

  if (changedAny) {
    localStorage.setItem(KEY_USER_AD_STATUSES, JSON.stringify(lastStatuses));
    // optionally re-render
    renderProfileAds();
  }
}

// start periodic sync (every 4-5 sec)
let SYNC_INTERVAL = null;
function startSyncLoop() {
  if (SYNC_INTERVAL) clearInterval(SYNC_INTERVAL);
  SYNC_INTERVAL = setInterval(() => {
    try { syncUserNotifications(); updateGlobalStats(); } catch(e) { console.error(e); }
  }, 5000);
}

// ======================== CSV Export / Import helpers (profile-level utility) ========================
function exportAdsCSV() {
  const all = loadAllAds();
  if (!all.length) { alert('E’lonlar mavjud emas.'); return; }
  // choose fields to export
  const headers = ['id','type','phone','user','from','to','price','status','createdAt','desc'];
  const rows = [headers.join(',')];
  all.forEach(a => {
    const vals = headers.map(h => `"${String(a[h]||'').replace(/"/g,'""')}"`);
    rows.push(vals.join(','));
  });
  const csv = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `shahartaxi_ads_export_${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url);
}

function importAdsCSV(file, onDone) {
  if (!file) { if (onDone) onDone(false, 'file missing'); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) { if (onDone) onDone(false, 'empty file'); return; }
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g,'').trim());
    const rows = lines.slice(1);
    const driver = safeParseJSON(localStorage.getItem(KEY_DRIVER), []);
    const passenger = safeParseJSON(localStorage.getItem(KEY_PASSENGER), []);
    rows.forEach(r => {
      // naive CSV parse supporting quoted fields
      const matches = r.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
      const obj = {};
      matches.forEach((cell, i) => { obj[headers[i]] = cell.replace(/^"|"$/g,''); });
      const type = obj.type || 'driver';
      // convert to basic ad shape
      const ad = {
        id: obj.id || `${type}_${Date.now()}_${Math.floor(Math.random()*10000)}`,
        type,
        phone: obj.phone || '',
        user: obj.user || '',
        from: obj.from || '',
        to: obj.to || '',
        price: obj.price || '',
        status: obj.status || 'pending',
        createdAt: obj.createdAt || nowISO(),
        desc: obj.desc || '',
        ratings: [],
        comments: []
      };
      if (type === 'driver') driver.push(ad); else passenger.push(ad);
    });
    localStorage.setItem(KEY_DRIVER, JSON.stringify(driver));
    localStorage.setItem(KEY_PASSENGER, JSON.stringify(passenger));
    if (onDone) onDone(true, 'ok');
  };
  reader.readAsText(file,'utf-8');
}

// ======================== Standardize Dates Tool ========================
function standardizeAllDates() {
  if (!confirm('Eski e’lonlardagi sana formatlarini ISO formatga o‘zgartirishni xohlaysizmi?')) return;
  ['driverAds','passengerAds','ads'].forEach(key => {
    const list = safeParseJSON(localStorage.getItem(key), []);
    const out = list.map(a => {
      const parsed = parseDateFlexible(a.createdAt);
      if (parsed) a.createdAt = parsed.toISOString();
      return a;
    });
    localStorage.setItem(key, JSON.stringify(out));
  });
  alert('Sana formatlari yangilandi.');
  renderProfileAds();
}

// ======================== Compatibility fixers / one-time migration helpers ========================
function oneTimeMigrations() {
  // ensure ads have ids and array fields
  backfillAdFields();
  // update stats
  updateGlobalStats();
}

// ======================== Admin history viewer (profile can view admin approval history for own ads) ========================
function viewApprovalHistoryForUser() {
  const hist = safeParseJSON(localStorage.getItem(KEY_APPROVAL_HISTORY), []);
  const myPhone = (CURRENT_USER && CURRENT_USER.phone) || localStorage.getItem('currentUserPhone');
  if (!myPhone) { alert('Tizimga kirilmadi.'); return; }
  const myEntries = hist.filter(h => {
    return String(h.phone || h.owner || '') === String(myPhone) || String(h.id||'').includes(String(myPhone));
  });
  // show in alert (simple)
  if (!myEntries.length) { alert('Sizga oid tasdiqlash tarixi topilmadi.'); return; }
  const msg = myEntries.map(h => `${h.date || h.when} — ${h.id} — ${h.oldStatus} → ${h.newStatus}`).join('\n');
  alert(msg);
}

// ======================== Init & Bindings on DOMContentLoaded ========================
function initProfilePage() {
  oneTimeMigrations();

  // render header
  renderProfileHeader();

  // bind controls
  bindFilterControls();
  bindProfileActions();

  // initial ads render
  renderProfileAds();

  // start sync loop
  startSyncLoop();

  // hook window events for showing ratings UI if used elsewhere
  // If user wants to view another profile, set localStorage.viewingProfile and reload
  // Expose some functions for console debugging:
  window._shahar = {
    loadAllAds, saveAdToStorage, deleteAdFromStorage, renderProfileAds, exportAdsCSV, importAdsCSV, standardizeAllDates
  };
}

// run when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProfilePage);
} else {
  initProfilePage();
}

// ======================== END profile.js ========================
