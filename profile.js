/* profile-part1.js
   ShaharTaxi — Part 1/2
   - localStorage init (profile + ads)
   - transforms "from" / "to" text inputs into region/city selects
   - render profile header
   - fetch & render all user's ads
   - create/edit/delete basics (no comment/rating UI yet)
*/

(function () {
  'use strict';

  // ---------- CONFIG ----------
  const STORAGE = {
    PROFILE: 'shahartaxi_profile_v2',
    ADS: 'shahartaxi_ads_v2',
  };

  const STATUSES = {
    PENDING: 'Kutilyapti',
    APPROVED: 'Tasdiqlangan',
    REJECTED: 'Rad etilgan',
  };

  // regions -> cities dataset (you can extend)
  const REGION_CITY = {
    "Toshkent viloyati": ["Toshkent", "Chirchiq", "Angren"],
    "Andijon": ["Andijon", "Asaka", "Xonobod"],
    "Farg'ona": ["Farg'ona", "Qo'qon", "Marg'ilon"],
    "Namangan": ["Namangan", "Kosonsoy", "Namangan shahar"],
    "Samarqand": ["Samarqand", "Kattaqo'rg'on", "Narpay"],
    "Buxoro": ["Buxoro", "G'ijduvon", "Kogon"],
    "Xorazm": ["Xiva", "Urganch", "Shovot"],
    "Navoiy": ["Navoiy", "Konimex"],
    "Qashqadaryo": ["Qarshi", "Shahrisabz"],
    "Sirdaryo": ["Guliston", "Yangiyer"]
  };

  // ---------- DOM refs ----------
  const profileNameEl = document.getElementById('profileName');
  const profilePhoneEl = document.getElementById('profilePhone');
  const profileEmailEl = document.getElementById('profileEmail');
  const starContainerEl = document.getElementById('starContainer');
  const avgRatingEl = document.getElementById('avgRating');

  const editProfileBtn = document.getElementById('editProfileBtn');
  const addAdBtn = document.getElementById('addAdBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  const editFormEl = document.getElementById('editForm');
  const addFormEl = document.getElementById('addForm');

  const adsContainerEl = document.getElementById('adsContainer');

  // Edit form fields
  const editNameEl = document.getElementById('editName');
  const editPhoneEl = document.getElementById('editPhone');
  const editEmailEl = document.getElementById('editEmail');

  // Route / price / desc elements (these are inputs in HTML, we'll transform them)
  let fromInputEl = document.getElementById('from'); // will become region select
  let toInputEl = document.getElementById('to');     // will become city select
  const priceEl = document.getElementById('price');
  const descEl = document.getElementById('desc');

  // ---------- State ----------
  let profile = null;
  let ads = [];
  const DEMO_USER = { id: 'demo-1', name: 'Foydalanuvchi', email: '', phone: '' };

  // ---------- Helpers ----------
  function genId(prefix = '') {
    return prefix + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }
  function safeText(v) {
    return v === undefined || v === null ? '' : String(v);
  }
  function formatCurrency(v) {
    if (v === undefined || v === null || v === '') return '—';
    const n = Number(v);
    return isNaN(n) ? safeText(v) : n.toLocaleString('uz-UZ') + " so'm";
  }
  function formatDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleString();
  }

  // ---------- Storage ----------
  function loadProfile() {
    try {
      const raw = localStorage.getItem(STORAGE.PROFILE);
      if (!raw) {
        profile = Object.assign({}, DEMO_USER);
        saveProfile();
      } else profile = JSON.parse(raw);
    } catch (err) {
      console.error('loadProfile', err);
      profile = Object.assign({}, DEMO_USER);
    }
  }
  function saveProfile() {
    try {
      localStorage.setItem(STORAGE.PROFILE, JSON.stringify(profile));
    } catch (err) {
      console.error('saveProfile', err);
    }
  }
  function loadAds() {
    try {
      const raw = localStorage.getItem(STORAGE.ADS);
      if (!raw) {
        ads = [];
        saveAds();
      } else ads = JSON.parse(raw);
    } catch (err) {
      console.error('loadAds', err);
      ads = [];
    }
  }
  function saveAds() {
    try {
      localStorage.setItem(STORAGE.ADS, JSON.stringify(ads));
    } catch (err) {
      console.error('saveAds', err);
    }
  }

  // ---------- UI: transform 'from'/'to' inputs into region/city selects ----------
  function ensureRegionCitySelects() {
    // Replace 'from' input with region select
    if (!fromInputEl) return;
    // If already transformed, skip
    if (fromInputEl.tagName.toLowerCase() === 'select') {
      // ensure we also have toInputEl as select
      toInputEl = document.getElementById('to');
      return;
    }

    // create region select to replace 'from' input
    const regionSelect = document.createElement('select');
    regionSelect.id = 'from';
    regionSelect.style.width = '100%';
    regionSelect.style.padding = '8px';
    regionSelect.style.borderRadius = '6px';
    regionSelect.style.border = '1px solid #ccc';

    const defaultOpt = document.createElement('option'); defaultOpt.value = ''; defaultOpt.textContent = 'Viloyatni tanlang'; regionSelect.appendChild(defaultOpt);
    Object.keys(REGION_CITY).forEach((reg) => {
      const o = document.createElement('option'); o.value = reg; o.textContent = reg; regionSelect.appendChild(o);
    });

    fromInputEl.parentNode.replaceChild(regionSelect, fromInputEl);
    fromInputEl = regionSelect;

    // replace 'to' input with city select
    const citySelect = document.createElement('select');
    citySelect.id = 'to';
    citySelect.style.width = '100%';
    citySelect.style.padding = '8px';
    citySelect.style.borderRadius = '6px';
    citySelect.style.border = '1px solid #ccc';
    const defCity = document.createElement('option'); defCity.value = ''; defCity.textContent = 'Shaharni tanlang'; citySelect.appendChild(defCity);

    // insert after region select
    // if old toInputEl exists replace it
    if (toInputEl && toInputEl.parentNode) {
      toInputEl.parentNode.replaceChild(citySelect, toInputEl);
    } else {
      fromInputEl.parentNode.insertBefore(citySelect, fromInputEl.nextSibling);
    }
    toInputEl = citySelect;

    // event: when region changes, populate cities
    regionSelect.addEventListener('change', () => {
      const sel = regionSelect.value;
      populateCitiesForRegion(sel);
    });
  }

  function populateCitiesForRegion(region) {
    // clears and fills toInputEl
    if (!toInputEl) return;
    toInputEl.innerHTML = '';
    const def = document.createElement('option'); def.value = ''; def.textContent = 'Shaharni tanlang'; toInputEl.appendChild(def);
    if (!region || !REGION_CITY[region]) return;
    REGION_CITY[region].forEach((c) => {
      const o = document.createElement('option'); o.value = c; o.textContent = c; toInputEl.appendChild(o);
    });
  }

  // ---------- Render profile header ----------
  function renderProfileHeader() {
    profileNameEl.textContent = safeText(profile.name || DEMO_USER.name);
    profilePhoneEl.textContent = 'Telefon: ' + (profile.phone || '');
    profileEmailEl.textContent = 'Email: ' + (profile.email || '');
    renderProfileAvgRating();
  }

  function renderProfileAvgRating() {
    // average rating across user's ads
    let total = 0, count = 0;
    ads.forEach((a) => {
      if (a.userId === profile.id && Array.isArray(a.ratings)) {
        a.ratings.forEach((r) => { total += (r.score || 0); count++; });
      }
    });
    const avg = count ? (total / count) : 0;
    starContainerEl.innerHTML = '';
    starContainerEl.appendChild(renderStars(avg));
    avgRatingEl.textContent = `(${avg.toFixed(1)})`;
  }

  function renderStars(avg) {
    const cont = document.createElement('div');
    cont.style.display = 'inline-block';
    const full = Math.floor(avg);
    const half = avg - full >= 0.5;
    for (let i = 1; i <= 5; i++) {
      const s = document.createElement('span');
      s.style.marginRight = '3px';
      s.style.fontSize = '18px';
      if (i <= full) { s.textContent = '★'; s.style.color = 'gold'; }
      else if (i === full + 1 && half) { s.textContent = '★'; s.style.color = 'gold'; }
      else { s.textContent = '☆'; s.style.color = '#ccc'; }
      cont.appendChild(s);
    }
    return cont;
  }

  // ---------- Render ads list (show all user's ads) ----------
  function renderAds() {
    // Clear
    adsContainerEl.innerHTML = '';

    // Show all ads that belong to current user
    const myAds = ads.filter((a) => a.userId === profile.id);

    if (!myAds || myAds.length === 0) {
      const empty = document.createElement('div'); empty.className = 'ad-card'; empty.innerHTML = '<p>Sizda hali e\\'lonlar yo\\'q.</p>';
      adsContainerEl.appendChild(empty);
      return;
    }

    // Sort newest first
    myAds.sort((a, b) => (new Date(b.createdAt)).getTime() - (new Date(a.createdAt)).getTime());

    myAds.forEach((ad) => {
      const card = document.createElement('div'); card.className = 'ad-card'; card.dataset.id = ad.id;

      // header
      const header = document.createElement('div'); header.className = 'ad-header';
      const title = document.createElement('h4'); title.textContent = ad.title || `${ad.from} → ${ad.to}`;
      header.appendChild(title);
      const badge = document.createElement('span');
      badge.className = 'ad-status';
      badge.textContent = ad.status || STATUSES.PENDING;
      // apply background classes as in CSS: status-approved / status-pending / status-rejected
      if (ad.status === STATUSES.APPROVED) badge.classList.add('status-approved');
      else if (ad.status === STATUSES.REJECTED) badge.classList.add('status-rejected');
      else badge.classList.add('status-pending');
      header.appendChild(badge);
      card.appendChild(header);

      // body
      const body = document.createElement('div'); body.className = 'ad-body';
      const route = document.createElement('p'); route.innerHTML = `<strong>Marshrut:</strong> ${safeText(ad.from)} → ${safeText(ad.to)}`;
      const price = document.createElement('p'); price.innerHTML = `<strong>Narx:</strong> ${formatCurrency(ad.price)}`;
      const desc = document.createElement('p'); desc.innerHTML = `<strong>Izoh:</strong> ${safeText(ad.description || '')}`;
      body.appendChild(route); body.appendChild(price); body.appendChild(desc);

      // image if exists
      if (ad.imageData) {
        const imgWrap = document.createElement('div'); imgWrap.style.marginTop = '8px';
        const img = document.createElement('img'); img.src = ad.imageData; img.style.maxWidth = '180px'; img.style.maxHeight = '120px'; img.style.borderRadius = '8px';
        imgWrap.appendChild(img); body.appendChild(imgWrap);
      }

      // createdAt
      const created = document.createElement('p'); created.innerHTML = `<small>Joylangan: ${formatDate(ad.createdAt)}</small>`;
      body.appendChild(created);

      card.appendChild(body);

      // actions
      const actions = document.createElement('div'); actions.className = 'ad-actions';
      const editBtn = document.createElement('button'); editBtn.className = 'edit-btn'; editBtn.textContent = 'Tahrirlash';
      editBtn.addEventListener('click', () => openEditAd(ad.id));
      const deleteBtn = document.createElement('button'); deleteBtn.className = 'delete-btn'; deleteBtn.textContent = 'O\'chirish';
      deleteBtn.addEventListener('click', () => { handleDeleteAd(ad.id); });

      // show rating summary
      const ratingWrap = document.createElement('div'); ratingWrap.style.marginLeft = '8px';
      if (ad.avgRating && ad.avgRating > 0) ratingWrap.appendChild(renderSmallStars(ad.avgRating));
      else ratingWrap.textContent = 'Baholar: —';

      // comments preview
      const commentWrap = document.createElement('div'); commentWrap.style.marginTop = '8px';
      if (Array.isArray(ad.comments) && ad.comments.length) {
        const p = document.createElement('div'); p.innerHTML = `<strong>Izohlar (so'nggi 2):</strong>`;
        commentWrap.appendChild(p);
        ad.comments.slice(0,2).forEach((c) => {
          const ce = document.createElement('div'); ce.innerHTML = `<small><strong>${safeText(c.author)}</strong>: ${safeText(c.text)}</small>`;
          commentWrap.appendChild(ce);
        });
        const more = document.createElement('button'); more.className = 'edit-btn'; more.style.marginTop = '6px'; more.textContent = 'Barcha izohlar';
        more.addEventListener('click', () => openCommentsModal(ad.id));
        commentWrap.appendChild(more);
      }

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
      actions.appendChild(ratingWrap);
      actions.appendChild(commentWrap);

      card.appendChild(actions);

      adsContainerEl.appendChild(card);
    });
  }

  function renderSmallStars(avg) {
    const cont = document.createElement('div');
    for (let i = 1; i <= 5; i++) {
      const s = document.createElement('span');
      s.style.fontSize = '14px';
      s.style.marginRight = '2px';
      if (i <= Math.round(avg)) { s.textContent = '★'; s.style.color = 'gold'; }
      else { s.textContent = '☆'; s.style.color = '#ccc'; }
      cont.appendChild(s);
    }
    return cont;
  }

  // ---------- Add & Edit flow basic ----------
  function resetAddForm() {
    // set header text
    const h = addFormEl.querySelector('h3'); if (h) h.textContent = "Yangi e'lon joylash";
    // clear selects/inputs
    if (fromInputEl && fromInputEl.tagName.toLowerCase() === 'select') fromInputEl.value = '';
    if (toInputEl && toInputEl.tagName.toLowerCase() === 'select') {
      toInputEl.innerHTML = ''; const def = document.createElement('option'); def.value = ''; def.textContent = 'Shaharni tanlang'; toInputEl.appendChild(def);
    }
    priceEl.value = '';
    descEl.value = '';
    // remove image preview & dataset
    const prev = document.getElementById('adImagePreview'); if (prev) prev.innerHTML = '';
    delete addFormEl.dataset.editing;
    delete addFormEl.dataset.adId;
    delete addFormEl.dataset.imageData;
  }

  function handleCreateAd() {
    // read fields
    const region = fromInputEl && fromInputEl.value ? fromInputEl.value.trim() : '';
    const city = toInputEl && toInputEl.value ? toInputEl.value.trim() : '';
    const price = priceEl.value.trim();
    const desc = descEl.value.trim();
    const imageData = addFormEl.dataset.imageData || null;

    if (!region) return alert('Iltimos viloyatni tanlang.');
    if (!city) return alert('Iltimos shaharni tanlang.');
    if (!price || isNaN(Number(price))) return alert('Iltimos toʻgʻri narx kiriting.');

    const newAd = {
      id: genId('ad-'),
      title: `${region} — ${city}`,
      from: region,
      to: city,
      price: Number(price),
      description: desc || '',
      userId: profile.id,
      status: STATUSES.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      comments: [],
      ratings: [],
      avgRating: 0,
      imageData: imageData || null,
    };

    ads.unshift(newAd);
    saveAds();
    renderProfileAvgRating();
    renderAds();
    addFormEl.style.display = 'none';
    resetAddForm();
    alert('E\'lon joylandi. Administratsiya tez orada ko\'rib chiqadi.');
  }

  function handleUpdateAd(adId) {
    const region = fromInputEl && fromInputEl.value ? fromInputEl.value.trim() : '';
    const city = toInputEl && toInputEl.value ? toInputEl.value.trim() : '';
    const price = priceEl.value.trim();
    const desc = descEl.value.trim();
    const imageData = addFormEl.dataset.imageData || null;

    if (!region) return alert('Iltimos viloyatni tanlang.');
    if (!city) return alert('Iltimos shaharni tanlang.');
    if (!price || isNaN(Number(price))) return alert('Iltimos toʻgʻri narx kiriting.');

    const idx = ads.findIndex((a) => a.id === adId);
    if (idx === -1) return alert('E\'lon topilmadi.');

    const old = ads[idx];
    const updated = Object.assign({}, old, {
      from: region,
      to: city,
      title: `${region} — ${city}`,
      price: Number(price),
      description: desc,
      updatedAt: new Date().toISOString(),
    });
    if (imageData) updated.imageData = imageData;
    ads.splice(idx, 1, updated);
    saveAds();
    renderProfileAvgRating();
    renderAds();
    addFormEl.style.display = 'none';
    resetAddForm();
    alert('E\'lon yangilandi.');
  }

  function openEditAd(adId) {
    const ad = ads.find((a) => a.id === adId);
    if (!ad) return alert('E\'lon topilmadi.');
    addFormEl.dataset.editing = 'true';
    addFormEl.dataset.adId = adId;
    const h = addFormEl.querySelector('h3'); if (h) h.textContent = "E'lonni tahrirlash";
    // populate selects
    if (fromInputEl && fromInputEl.tagName.toLowerCase() === 'select') {
      fromInputEl.value = ad.from || '';
      populateCitiesForRegion(ad.from || '');
      toInputEl.value = ad.to || '';
    } else {
      // fallback: set values to inputs
      if (fromInputEl) fromInputEl.value = ad.from || '';
      if (toInputEl) toInputEl.value = ad.to || '';
    }
    priceEl.value = ad.price || '';
    descEl.value = ad.description || '';
    // show preview
    const prev = document.getElementById('adImagePreview');
    if (prev) {
      prev.innerHTML = ad.imageData ? `<img src="${ad.imageData}" style="max-width:160px;max-height:120px;border-radius:8px">` : '';
      if (ad.imageData) addFormEl.dataset.imageData = ad.imageData;
      else delete addFormEl.dataset.imageData;
    }
    addFormEl.style.display = 'block';
    addFormEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function handleDeleteAd(adId) {
    if (!confirm('E\'lonni o\'chirishni xohlaysizmi?')) return;
    const idx = ads.findIndex((a) => a.id === adId);
    if (idx === -1) return alert('E\'lon topilmadi.');
    ads.splice(idx, 1);
    saveAds();
    renderProfileAvgRating();
    renderAds();
    alert('E\'lon o\'chirildi.');
  }

  // ---------- Image input setup for addForm ----------
  function ensureImageInput() {
    // create image input and preview if not present
    if (!addFormEl) return;
    let fileInput = addFormEl.querySelector('input[type="file"]#adImageInput');
    let preview = document.getElementById('adImagePreview');
    if (!fileInput) {
      fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.id = 'adImageInput';
      fileInput.style.display = 'block';
      fileInput.style.marginTop = '6px';
      addFormEl.appendChild(fileInput);
      fileInput.addEventListener('change', (ev) => {
        const f = ev.target.files && ev.target.files[0];
        preview = document.getElementById('adImagePreview');
        if (!preview) {
          preview = document.createElement('div');
          preview.id = 'adImagePreview';
          preview.style.marginTop = '8px';
          addFormEl.appendChild(preview);
        }
        if (f) {
          const reader = new FileReader();
          reader.onload = function (e) {
            const data = e.target.result;
            preview.innerHTML = `<img src="${data}" style="max-width:160px;max-height:120px;border-radius:8px">`;
            addFormEl.dataset.imageData = data;
          };
          reader.readAsDataURL(f);
        } else {
          preview.innerHTML = '';
          delete addFormEl.dataset.imageData;
        }
      });
    } else {
      // ensure preview exists
      if (!preview) {
        preview = document.createElement('div');
        preview.id = 'adImagePreview';
        preview.style.marginTop = '8px';
        addFormEl.appendChild(preview);
      }
    }
  }

  // ---------- Edit profile handlers ----------
  function setupProfileFormHandlers() {
    if (editFormEl) {
      editFormEl.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = editNameEl.value.trim();
        const phone = editPhoneEl.value.trim();
        const email = editEmailEl.value.trim();
        if (!name) return alert('Ismni kiriting.');
        if (phone && !/^[+]?[\d\s-]{8,15}$/.test(phone)) return alert('Telefon formati xato.');
        if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return alert('Email formati xato.');
        profile.name = name; profile.phone = phone; profile.email = email;
        saveProfile();
        renderProfileHeader();
        editFormEl.style.display = 'none';
        alert('Profil saqlandi.');
      });
    }
  }

  // ---------- Attach UI actions (buttons) ----------
  function attachButtons() {
    if (editProfileBtn) {
      editProfileBtn.addEventListener('click', () => {
        // prefill
        editNameEl.value = profile.name || '';
        editPhoneEl.value = profile.phone || '';
        editEmailEl.value = profile.email || '';
        editFormEl.style.display = editFormEl.style.display === 'block' ? 'none' : 'block';
        editFormEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
    if (addAdBtn) {
      addAdBtn.addEventListener('click', () => {
        resetAddForm();
        addFormEl.style.display = addFormEl.style.display === 'block' ? 'none' : 'block';
        addFormEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (confirm('Chiqishni xohlaysizmi? (demo)')) window.location.reload();
      });
    }
    if (addFormEl) {
      addFormEl.addEventListener('submit', (e) => {
        e.preventDefault();
        const isEdit = addFormEl.dataset.editing === 'true';
        if (isEdit) handleUpdateAd(addFormEl.dataset.adId);
        else handleCreateAd();
      });
    }
  }

  // ---------- Comments modal reference (will be implemented in Part 2) ----------
  function openCommentsModal(adId) {
    // placeholder: Part 2 will replace this with full modal
    // for now show simple prompt to add comment and store locally
    const ad = ads.find((a) => a.id === adId);
    if (!ad) return alert('E\'lon topilmadi.');
    const text = prompt('Izoh yozing (oddiy demo):');
    if (!text || !text.trim()) return;
    const comment = { id: genId('c-'), author: profile.name || 'Foydalanuvchi', authorId: profile.id, text: text.trim(), createdAt: new Date().toISOString() };
    ad.comments = ad.comments || [];
    ad.comments.unshift(comment);
    saveAds();
    renderAds();
    alert('Izoh saqlandi (demo).');
  }

  // ---------- Init ----------
  function init() {
    loadProfile();
    loadAds();
    ensureRegionCitySelects();
    ensureImageInput();
    renderProfileHeader();
    attachButtons();
    setupProfileFormHandlers();
    renderAds();
    // expose debug
    window._ShaharTaxiLocal = { profile: () => profile, ads: () => ads, save: saveAds, reload: () => { loadAds(); renderAds(); } };
  }

  // Run
  init();

  // Expose some functions for part2 to call
  window._ST_Part1 = {
    openEditAd,
    handleDeleteAd,
    openCommentsModal,
    ensureRegionCitySelects,
    populateCitiesForRegion,
    renderAds,
    saveAds,
    loadAds,
  };

})();
/* profile-part2.js
   ShaharTaxi — Part 2/2
   - comments modal (full)
   - rating (baholash)
   - filters (status + search) and pagination
   - CSV export
   - small fixes (ensure all ads show, status background class applied)
*/

(function () {
  'use strict';

  // ensure Part1 loaded
  if (!window._ST_Part1) {
    console.error('Part1 kodi yuklanmagan. Iltimos profile-part1.js ni profile-part2.js oldin yuklang.');
    return;
  }

  // reuse storage keys from Part1 (they are same)
  const STORAGE = { PROFILE: 'shahartaxi_profile_v2', ADS: 'shahartaxi_ads_v2' };
  const STATUSES = { PENDING: 'Kutilyapti', APPROVED: 'Tasdiqlangan', REJECTED: 'Rad etilgan' };

  // DOM refs (same as Part1)
  const adsContainerEl = document.getElementById('adsContainer');
  const addFormEl = document.getElementById('addForm');
  const fromEl = document.getElementById('from'); // select
  const toEl = document.getElementById('to');     // select
  const priceEl = document.getElementById('price');
  const descEl = document.getElementById('desc');

  // Filters UI injection
  function injectFilters() {
    if (!adsContainerEl) return;
    if (document.getElementById('st-filter-bar-v2')) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'st-filter-bar-v2';
    wrapper.style.display = 'flex';
    wrapper.style.gap = '8px';
    wrapper.style.flexWrap = 'wrap';
    wrapper.style.margin = '12px 0';

    const search = document.createElement('input');
    search.type = 'search';
    search.id = 'st-search-v2';
    search.placeholder = 'Qidiruv: sarlavha, izoh, narx...';
    search.style.padding = '8px'; search.style.border = '1px solid #ccc'; search.style.borderRadius = '8px'; search.style.minWidth = '220px';

    const statusSel = document.createElement('select');
    statusSel.id = 'st-status-v2'; statusSel.style.padding = '8px'; statusSel.style.border = '1px solid #ccc'; statusSel.style.borderRadius = '8px';
    const oAll = document.createElement('option'); oAll.value = ''; oAll.textContent = 'Barchasi'; statusSel.appendChild(oAll);
    const oP = document.createElement('option'); oP.value = STATUSES.PENDING; oP.textContent = STATUSES.PENDING; statusSel.appendChild(oP);
    const oA = document.createElement('option'); oA.value = STATUSES.APPROVED; oA.textContent = STATUSES.APPROVED; statusSel.appendChild(oA);
    const oR = document.createElement('option'); oR.value = STATUSES.REJECTED; oR.textContent = STATUSES.REJECTED; statusSel.appendChild(oR);

    const perSel = document.createElement('select');
    perSel.id = 'st-per-v2'; [6, 10, 12].forEach((n) => { const o = document.createElement('option'); o.value = n; o.textContent = `${n} / sahifa`; perSel.appendChild(o); });
    perSel.value = 6;

    const csvBtn = document.createElement('button'); csvBtn.textContent = 'CSV export'; csvBtn.className = 'save-btn'; csvBtn.style.marginLeft = 'auto';

    wrapper.appendChild(search); wrapper.appendChild(statusSel); wrapper.appendChild(perSel); wrapper.appendChild(csvBtn);
    adsContainerEl.parentNode.insertBefore(wrapper, adsContainerEl);

    // events
    let timer = null;
    search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { applyFiltersAndRender(); }, 220); });
    statusSel.addEventListener('change', () => applyFiltersAndRender());
    perSel.addEventListener('change', () => applyFiltersAndRender());
    csvBtn.addEventListener('click', exportCSVFromFiltered);
  }

  // Load from localStorage helpers
  function loadAdsFromStorage() {
    try { const raw = localStorage.getItem(STORAGE.ADS); return raw ? JSON.parse(raw) : []; } catch (e) { console.error(e); return []; }
  }
  function loadProfileFromStorage() { try { const raw = localStorage.getItem(STORAGE.PROFILE); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }

  // Filters state
  const state = { query: '', status: '', per: 6, page: 1 };

  function getFiltersValues() {
    const s = document.getElementById('st-search-v2'); state.query = s ? s.value.trim().toLowerCase() : '';
    const st = document.getElementById('st-status-v2'); state.status = st ? st.value : '';
    const per = document.getElementById('st-per-v2'); state.per = per ? Number(per.value) : 6;
  }

  function applyFiltersAndRender() {
    const profile = loadProfileFromStorage() || { id: 'demo-1' };
    let all = loadAdsFromStorage() || [];
    // only show user's ads
    all = all.filter((a) => a.userId === profile.id);

    getFiltersValues();

    if (state.status) all = all.filter((a) => (a.status || STATUSES.PENDING) === state.status);

    if (state.query) {
      const q = state.query;
      all = all.filter((a) => `${a.title} ${a.description} ${a.from} ${a.to} ${a.price}`.toLowerCase().includes(q));
    }

    all.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    renderPaginated(all);
  }

  function renderPaginated(list) {
    // clear container
    adsContainerEl.innerHTML = '';

    const total = list.length;
    const per = state.per || 6;
    const pages = Math.max(1, Math.ceil(total / per));
    if (state.page > pages) state.page = pages;
    const start = (state.page - 1) * per;
    const pageItems = list.slice(start, start + per);

    if (!pageItems || pageItems.length === 0) {
      const empty = document.createElement('div'); empty.className = 'ad-card'; empty.innerHTML = '<p>Sizga mos e\\'lon topilmadi.</p>';
      adsContainerEl.appendChild(empty);
    } else {
      pageItems.forEach((ad) => {
        const el = buildCardWithActions(ad);
        adsContainerEl.appendChild(el);
      });
    }
    renderPager(total, pages);
  }

  function renderPager(total, pages) {
    const existing = document.getElementById('st-pager-v2');
    if (existing) existing.remove();
    const pager = document.createElement('div'); pager.id = 'st-pager-v2'; pager.style.display = 'flex'; pager.style.justifyContent = 'space-between'; pager.style.marginTop = '12px';
    const left = document.createElement('div'); left.textContent = `Jami: ${total} e'lon — sahifa ${state.page} / ${pages}`;
    const right = document.createElement('div'); right.style.display = 'flex'; right.style.gap = '8px';
    const prev = document.createElement('button'); prev.textContent = 'Oldingi'; prev.disabled = state.page <= 1;
    prev.addEventListener('click', () => { state.page = Math.max(1, state.page - 1); applyFiltersAndRender(); });
    const next = document.createElement('button'); next.textContent = 'Keyingi'; next.disabled = state.page >= pages;
    next.addEventListener('click', () => { state.page = Math.min(pages, state.page + 1); applyFiltersAndRender(); });
    right.appendChild(prev); right.appendChild(next);
    pager.appendChild(left); pager.appendChild(right);
    adsContainerEl.parentNode.appendChild(pager);
  }

  // Build card with actions (replaces Part1's simpler card)
  function buildCardWithActions(ad) {
    const card = document.createElement('div'); card.className = 'ad-card'; card.dataset.id = ad.id;

    // header
    const header = document.createElement('div'); header.className = 'ad-header';
    const h4 = document.createElement('h4'); h4.textContent = ad.title || `${ad.from} → ${ad.to}`;
    header.appendChild(h4);
    const badge = document.createElement('span'); badge.className = 'ad-status'; badge.textContent = ad.status || STATUSES.PENDING;
    if (ad.status === STATUSES.APPROVED) badge.classList.add('status-approved');
    else if (ad.status === STATUSES.REJECTED) badge.classList.add('status-rejected');
    else badge.classList.add('status-pending');
    header.appendChild(badge);
    card.appendChild(header);

    // body
    const body = document.createElement('div'); body.className = 'ad-body';
    body.innerHTML = `<p><strong>Marshrut:</strong> ${safe(ad.from)} → ${safe(ad.to)}</p>
                      <p><strong>Narx:</strong> ${formatPrice(ad.price)}</p>
                      <p><strong>Izoh:</strong> ${safe(ad.description || '')}</p>
                      <p><small>Joylangan: ${formatDate(ad.createdAt)}</small></p>`;
    if (ad.imageData) {
      const imgWrap = document.createElement('div'); imgWrap.style.marginTop = '8px';
      const img = document.createElement('img'); img.src = ad.imageData; img.style.maxWidth = '180px'; img.style.maxHeight = '120px'; img.style.borderRadius = '8px';
      imgWrap.appendChild(img); body.appendChild(imgWrap);
    }
    card.appendChild(body);

    // actions
    const actions = document.createElement('div'); actions.className = 'ad-actions';
    const editBtn = document.createElement('button'); editBtn.className = 'edit-btn'; editBtn.textContent = 'Tahrirlash';
    editBtn.addEventListener('click', () => window._ST_Part1.openEditAd(ad.id));
    const delBtn = document.createElement('button'); delBtn.className = 'delete-btn'; delBtn.textContent = 'O\'chirish';
    delBtn.addEventListener('click', () => { if (confirm('O\'chirishni xohlaysizmi?')) window._ST_Part1.handleDeleteAd(ad.id); });

    // comments & rating
    const commentBtn = document.createElement('button'); commentBtn.className = 'edit-btn'; commentBtn.textContent = 'Izohlar';
    commentBtn.addEventListener('click', () => openCommentsModalFull(ad.id));
    const rateBtn = document.createElement('button'); rateBtn.className = 'edit-btn'; rateBtn.textContent = 'Baholash';
    rateBtn.addEventListener('click', () => openRatePrompt(ad.id));

    // avg rating display
    const avgWrap = document.createElement('div'); avgWrap.style.marginLeft = '8px';
    avgWrap.appendChild(renderSmallStars(ad.avgRating || 0));

    actions.appendChild(editBtn); actions.appendChild(delBtn); actions.appendChild(commentBtn); actions.appendChild(rateBtn); actions.appendChild(avgWrap);
    card.appendChild(actions);

    return card;
  }

  // Utilities for part2
  function safe(v) { return v === undefined || v === null ? '' : String(v); }
  function formatPrice(v) { if (v === undefined || v === null || v === '') return '—'; const n = Number(v); return isNaN(n) ? v : n.toLocaleString('uz-UZ') + " so'm"; }
  function formatDate(d) { if (!d) return ''; return new Date(d).toLocaleString(); }
  function renderSmallStars(avg) { const cont = document.createElement('div'); for (let i=1;i<=5;i++){ const s=document.createElement('span'); s.style.fontSize='14px'; s.style.marginRight='2px'; if(i<=Math.round(avg)) { s.textContent='★'; s.style.color='gold'; } else { s.textContent='☆'; s.style.color='#ccc'; } cont.appendChild(s);} return cont; }

  // Comments modal (full)
  function openCommentsModalFull(adId) {
    const ads = loadAdsFromStorage();
    const ad = ads.find(a => a.id === adId); if (!ad) return alert('E\'lon topilmadi.');

    const overlay = document.createElement('div');
    overlay.style = 'position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:9999;';

    const modal = document.createElement('div'); modal.style = 'width:95%;max-width:720px;background:#fff;border-radius:10px;padding:16px;max-height:80vh;overflow:auto;';
    const title = document.createElement('h3'); title.textContent = 'Izohlar'; modal.appendChild(title);

    const list = document.createElement('div'); list.style.marginTop = '8px';
    const comments = (ad.comments && Array.isArray(ad.comments)) ? ad.comments.slice() : [];
    if (comments.length === 0) { const n = document.createElement('div'); n.textContent = 'Hozircha izohlar yo‘q.'; list.appendChild(n); }
    else {
      comments.forEach(c => {
        const r = document.createElement('div'); r.style.borderBottom='1px solid #eee'; r.style.padding='8px 0';
        r.innerHTML = `<strong>${safe(c.author)}</strong> <small style="color:#666">— ${formatDate(c.createdAt)}</small><div style="margin-top:6px">${safe(c.text)}</div>`;
        list.appendChild(r);
      });
    }
    modal.appendChild(list);

    const ta = document.createElement('textarea'); ta.style.width='100%'; ta.style.minHeight='80px'; ta.style.marginTop='12px'; ta.placeholder='Yangi izoh...';
    modal.appendChild(ta);

    const row = document.createElement('div'); row.style.display='flex'; row.style.justifyContent='flex-end'; row.style.gap='8px'; row.style.marginTop='8px';
    const cancel = document.createElement('button'); cancel.className='cancel-btn'; cancel.textContent='Bekor'; const post = document.createElement('button'); post.className='save-btn'; post.textContent='Yuborish';
    row.appendChild(cancel); row.appendChild(post); modal.appendChild(row);

    overlay.appendChild(modal); document.body.appendChild(overlay);

    cancel.addEventListener('click', () => document.body.removeChild(overlay));
    post.addEventListener('click', () => {
      const text = ta.value.trim(); if (!text) return alert('Izoh kiriting.');
      const profile = loadProfileFromStorage() || { id:'demo-1', name:'Foydalanuvchi' };
      const comment = { id: genId('c-'), authorId: profile.id, author: profile.name||profile.email||'Foydalanuvchi', text, createdAt: new Date().toISOString() };
      ad.comments = ad.comments || []; ad.comments.unshift(comment);
      // save back
      const all = loadAdsFromStorage(); const idx = all.findIndex(a => a.id === ad.id); if (idx !== -1) { all[idx] = ad; localStorage.setItem(STORAGE.ADS, JSON.stringify(all)); }
      applyFiltersAndRender();
      document.body.removeChild(overlay);
      alert('Izoh yuborildi.');
    });
  }

  // Rate prompt
  function openRatePrompt(adId) {
    const n = prompt('1 dan 5 gacha baho bering (raqam):', '5'); if (!n) return;
    const score = Number(n); if (!score || score < 1 || score > 5) return alert('1-5 oralig\'ida kiriting.');
    const profile = loadProfileFromStorage() || { id:'demo-1', name:'Foydalanuvchi' };
    const all = loadAdsFromStorage(); const idx = all.findIndex(a => a.id===adId); if (idx===-1) return alert('E\'lon topilmadi.');
    all[idx].ratings = all[idx].ratings || []; all[idx].ratings.push({ id: genId('r-'), raterId: profile.id, score, createdAt: new Date().toISOString() });
    // recompute avg
    const sum = all[idx].ratings.reduce((s,it)=>(s+(it.score||0)),0); all[idx].avgRating = sum / all[idx].ratings.length;
    localStorage.setItem(STORAGE.ADS, JSON.stringify(all));
    applyFiltersAndRender();
    alert('Rahmat! Baho qabul qilindi.');
  }

  // CSV export from filtered list
  function exportCSVFromFiltered() {
    const ads = loadAdsFromStorage();
    const profile = loadProfileFromStorage() || { id:'demo-1' };
    let list = ads.filter(a => a.userId === profile.id);
    const searchEl = document.getElementById('st-search-v2'); const stSel = document.getElementById('st-status-v2');
    const q = searchEl && searchEl.value.trim().toLowerCase(); const st = stSel && stSel.value;
    if (st) list = list.filter(a => (a.status||'') === st);
    if (q) list = list.filter(a => (`${a.title} ${a.description} ${a.from} ${a.to} ${a.price}`).toLowerCase().includes(q));
    const columns = ['id','title','from','to','price','status','createdAt','avgRating','commentsCount'];
    const rows = list.map(r => columns.map(c => {
      let v = r[c];
      if (c === 'commentsCount') v = (r.comments && r.comments.length) || 0;
      if (v === undefined || v === null) v = '';
      return `"${String(v).replace(/"/g,'""')}"`;
    }).join(','));
    const csv = `"${columns.join('","')}"\n` + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `shahartaxi-ads-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  // small helper genId (same as Part1)
  function genId(prefix='') { return prefix + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8); }

  // On init: inject filters and render filtered list
  function initPart2() {
    injectFilters();
    applyFiltersAndRender();

    // If region select exists, ensure it populates cities (in case page was loaded after part1)
    const region = document.getElementById('from'); if (region && region.tagName.toLowerCase()==='select') {
      region.addEventListener('change', () => {
        // call populateCitiesForRegion from part1 if exists; otherwise do local populate
        if (window._ST_Part1 && window._ST_Part1.populateCitiesForRegion) window._ST_Part1.populateCitiesForRegion(region.value);
      });
    }

    // Listen to storage changes in case other tab updated data
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE.ADS || e.key === STORAGE.PROFILE) applyFiltersAndRender();
    });
  }

  // Run
  initPart2();

  // Expose for debugging
  window._ST_Part2 = { applyFiltersAndRender, openCommentsModalFull, openRatePrompt };

})();
