/* profile.js
   ShaharTaxi — profile.html bilan mos, localStorage-based demo implementation.
   No Firebase. Single-file, self-contained.
   Features:
     - profile (view/edit)
     - add/edit/delete ads
     - status badges (Kutilyapti/Tasdiqlangan/Rad etilgan)
     - comments & ratings
     - search, filters, pagination
     - CSV export
     - image preview & storage (base64 in localStorage)
     - validation & UX helpers
*/

// Immediately-Invoked Function Expression to avoid global leaks
(function () {
  'use strict';

  // ---------- CONFIG ----------
  const STORAGE_KEYS = {
    PROFILE: 'shahartaxi_profile_v1',
    ADS: 'shahartaxi_ads_v1',
  };

  // Default demo user (since there's no auth)
  const DEMO_USER = {
    id: 'demo-user-1',
    name: 'Foydalanuvchi',
    email: '',
    phone: '',
  };

  const STATUSES = {
    PENDING: 'Kutilyapti',
    APPROVED: 'Tasdiqlangan',
    REJECTED: 'Rad etilgan',
  };

  // Pagination default
  const DEFAULT_PER_PAGE = 6;

  // ---------- DOM refs (from profile.html) ----------
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

  // Add form fields
  const fromEl = document.getElementById('from');
  const toEl = document.getElementById('to');
  const priceEl = document.getElementById('price');
  const descEl = document.getElementById('desc');

  // ---------- State ----------
  let currentUser = Object.assign({}, DEMO_USER);
  let profile = null; // loaded profile object
  let ads = []; // array of ad objects
  let filters = {
    query: '',
    status: '',
    perPage: DEFAULT_PER_PAGE,
    page: 1,
  };

  // Utility: safe text
  function safeText(s) {
    if (s === undefined || s === null) return '';
    return String(s);
  }

  // Utility: generate random id
  function genId(prefix = '') {
    return prefix + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  // Utility: format currency
  function formatCurrency(v) {
    if (v === undefined || v === null || v === '') return '—';
    const n = Number(v);
    if (isNaN(n)) return safeText(v);
    return n.toLocaleString('uz-UZ') + " so'm";
  }

  // Utility: format date
  function formatDateISO(d) {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleString();
  }

  // ---------- Storage helpers ----------
  function saveProfileToStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    } catch (err) {
      console.error('saveProfileToStorage error', err);
      alert('Profilni saqlashda xatolik yuz berdi (localStorage).');
    }
  }

  function loadProfileFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (!raw) {
        profile = Object.assign({}, currentUser); // start with demo
        saveProfileToStorage();
      } else {
        profile = JSON.parse(raw);
      }
    } catch (err) {
      console.error('loadProfileFromStorage error', err);
      profile = Object.assign({}, currentUser);
    }
  }

  function saveAdsToStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.ADS, JSON.stringify(ads));
    } catch (err) {
      console.error('saveAdsToStorage error', err);
      alert('E\'lonlarni saqlashda xatolik yuz berdi (localStorage).');
    }
  }

  function loadAdsFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ADS);
      if (!raw) {
        ads = [];
        saveAdsToStorage();
      } else {
        ads = JSON.parse(raw);
      }
    } catch (err) {
      console.error('loadAdsFromStorage error', err);
      ads = [];
    }
  }

  // ---------- Initial load ----------
  function init() {
    loadProfileFromStorage();
    loadAdsFromStorage();
    bindUiActions();
    renderProfileHeader();
    injectFilterUI();
    applyFiltersAndRender();
  }

  // ---------- Render profile header ----------
  function renderProfileHeader() {
    profileNameEl.textContent = safeText(profile.name || currentUser.name || 'Foydalanuvchi');
    profilePhoneEl.textContent = 'Telefon: ' + (profile.phone || '');
    profileEmailEl.textContent = 'Email: ' + (profile.email || '');
    renderProfileRating();
  }

  function renderProfileRating() {
    // Compute average rating across user's ads (how others rated this user's ads)
    let total = 0;
    let count = 0;
    for (const a of ads) {
      if (a.userId === profile.id && Array.isArray(a.ratings) && a.ratings.length > 0) {
        for (const r of a.ratings) {
          total += (r.score || 0);
          count++;
        }
      }
    }
    const avg = count === 0 ? 0 : total / count;
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
      s.style.fontSize = '18px';
      s.style.marginRight = '3px';
      if (i <= full) {
        s.textContent = '★';
        s.style.color = 'gold';
      } else if (i === full + 1 && half) {
        s.textContent = '★';
        s.style.color = 'gold';
      } else {
        s.textContent = '☆';
        s.style.color = '#ccc';
      }
      cont.appendChild(s);
    }
    return cont;
  }

  // ---------- UI binding ----------
  function bindUiActions() {
    // Edit profile button toggles the edit form
    if (editProfileBtn) {
      editProfileBtn.addEventListener('click', () => {
        if (!editFormEl) return;
        // Prefill
        editNameEl.value = profile.name || '';
        editPhoneEl.value = profile.phone || '';
        editEmailEl.value = profile.email || '';
        editFormEl.style.display = editFormEl.style.display === 'block' ? 'none' : 'block';
        editFormEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }

    // Add ad button toggles add form
    if (addAdBtn) {
      addAdBtn.addEventListener('click', () => {
        resetAddForm();
        addFormEl.style.display = addFormEl.style.display === 'block' ? 'none' : 'block';
        addFormEl.removeAttribute('data-editing');
        addFormEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }

    // Logout button - demo: clear profile and redirect? We'll just show an alert
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (confirm('Chiqishni xohlaysizmi? (demo)')) {
          // In demo we won't delete data, just reload to simulate logout
          window.location.reload();
        }
      });
    }

    // Edit profile form submit
    if (editFormEl) {
      editFormEl.addEventListener('submit', (e) => {
        e.preventDefault();
        handleProfileSave();
      });
    }

    // Add form submit (create or update)
    if (addFormEl) {
      addFormEl.addEventListener('submit', (e) => {
        e.preventDefault();
        const isEdit = addFormEl.dataset.editing === 'true';
        if (isEdit) {
          const adId = addFormEl.dataset.adId;
          handleAdUpdate(adId);
        } else {
          handleAdCreate();
        }
      });
    }

    // Input validation for phone in edit form
    if (editPhoneEl) {
      editPhoneEl.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^\d+]/g, '');
      });
    }

    // Price input formatting
    if (priceEl) {
      priceEl.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9.,]/g, '');
      });
    }
  }

  // ---------- Profile save ----------
  function handleProfileSave() {
    const name = editNameEl.value.trim();
    const phone = editPhoneEl.value.trim();
    const email = editEmailEl.value.trim();

    if (!name) {
      alert('Ism kiritilishi shart.');
      return;
    }
    if (phone && !/^[+]?[\d\s-]{8,15}$/.test(phone)) {
      alert('Telefon formatida xato. Faqat raqamlar va + belgisi ruxsat etiladi.');
      return;
    }
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      alert('Email formatida xato.');
      return;
    }

    profile.name = name;
    profile.phone = phone;
    profile.email = email;
    saveProfileToStorage();
    renderProfileHeader();
    editFormEl.style.display = 'none';
    alert('Profil ma\'lumotlari saqlandi.');
  }

  // ---------- Add / Edit Ad ----------
  function resetAddForm() {
    fromEl.value = '';
    toEl.value = '';
    priceEl.value = '';
    descEl.value = '';
    // remove image input if any (we'll create one inline)
    let imgInput = addFormEl.querySelector('input[type="file"]');
    if (imgInput) {
      imgInput.value = '';
    } else {
      // create file input for optional image
      imgInput = document.createElement('input');
      imgInput.type = 'file';
      imgInput.accept = 'image/*';
      imgInput.style.display = 'block';
      imgInput.style.marginTop = '6px';
      imgInput.id = 'adImageInput';
      addFormEl.appendChild(imgInput);
      const preview = document.createElement('div');
      preview.id = 'adImagePreview';
      preview.style.marginTop = '8px';
      addFormEl.appendChild(preview);

      imgInput.addEventListener('change', (ev) => {
        const f = ev.target.files && ev.target.files[0];
        if (f) {
          const reader = new FileReader();
          reader.onload = function (e) {
            const data = e.target.result; // base64
            preview.innerHTML = `<img src="${data}" alt="preview" style="max-width:160px;max-height:120px;border-radius:8px">`;
            // temporarily store on form dataset
            addFormEl.dataset.imageData = data;
          };
          reader.readAsDataURL(f);
        } else {
          preview.innerHTML = '';
          delete addFormEl.dataset.imageData;
        }
      });
    }
    // clear edit data attributes
    addFormEl.removeAttribute('data-editing');
    addFormEl.removeAttribute('data-ad-id');
  }

  function handleAdCreate() {
    const from = fromEl.value.trim();
    const to = toEl.value.trim();
    const price = priceEl.value.trim();
    const desc = descEl.value.trim();
    const imageData = addFormEl.dataset.imageData || null;

    if (!from || !to) {
      alert('Marshrutni to\'ldiring (Qayerdan / Qayerga).');
      return;
    }
    if (!price || isNaN(Number(price))) {
      alert('Iltimos, haqiqiy narx kiriting.');
      return;
    }

    const ad = {
      id: genId('ad-'),
      title: `${from} → ${to}`,
      from,
      to,
      price: Number(price),
      description: desc,
      userId: profile.id,
      userEmail: profile.email || '',
      status: STATUSES.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      comments: [],
      ratings: [],
      avgRating: 0,
      imageData: imageData || null, // store base64 data
    };

    // Prepend new ad
    ads.unshift(ad);
    saveAdsToStorage();
    renderProfileRating();
    applyFiltersAndRender();
    addFormEl.style.display = 'none';
    resetAddForm();
    alert('E\'lon joylandi. Administratsiya uni tekshiradi.');
  }

  function handleAdUpdate(adId) {
    const from = fromEl.value.trim();
    const to = toEl.value.trim();
    const price = priceEl.value.trim();
    const desc = descEl.value.trim();
    const imageData = addFormEl.dataset.imageData || null;

    if (!from || !to) {
      alert('Marshrutni to\'ldiring (Qayerdan / Qayerga).');
      return;
    }
    if (!price || isNaN(Number(price))) {
      alert('Iltimos, haqiqiy narx kiriting.');
      return;
    }

    const idx = ads.findIndex((a) => a.id === adId);
    if (idx === -1) {
      alert('E\'lon topilmadi.');
      return;
    }

    const updated = Object.assign({}, ads[idx], {
      from,
      to,
      price: Number(price),
      description: desc,
      title: `${from} → ${to}`,
      updatedAt: new Date().toISOString(),
    });
    if (imageData) updated.imageData = imageData;

    ads.splice(idx, 1, updated);
    saveAdsToStorage();
    renderProfileRating();
    applyFiltersAndRender();
    addFormEl.style.display = 'none';
    resetAddForm();
    alert('E\'lon yangilandi.');
  }

  // ---------- Delete ad ----------
  function handleDeleteAd(adId) {
    if (!confirm('E\'lonni o\'chirishni xohlaysizmi? Bu amal qaytarilmaydi.')) return;
    const idx = ads.findIndex((a) => a.id === adId);
    if (idx === -1) return alert('E\'lon topilmadi.');
    ads.splice(idx, 1);
    saveAdsToStorage();
    renderProfileRating();
    applyFiltersAndRender();
    alert('E\'lon o\'chirildi.');
  }

  // ---------- Open ad for edit ----------
  function openEditAd(ad) {
    addFormEl.dataset.editing = 'true';
    addFormEl.dataset.adId = ad.id;
    addFormEl.querySelector('h3').textContent = 'E\'lonni tahrirlash';
    fromEl.value = ad.from || '';
    toEl.value = ad.to || '';
    priceEl.value = ad.price || '';
    descEl.value = ad.description || '';
    // set image preview / dataset
    const preview = document.getElementById('adImagePreview');
    if (preview) {
      if (ad.imageData) {
        preview.innerHTML = `<img src="${ad.imageData}" alt="preview" style="max-width:160px;max-height:120px;border-radius:8px">`;
        addFormEl.dataset.imageData = ad.imageData;
      } else {
        preview.innerHTML = '';
        delete addFormEl.dataset.imageData;
      }
    }
    addFormEl.style.display = 'block';
    addFormEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ---------- Comments ----------
  function openCommentsModal(ad) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.left = 0;
    overlay.style.top = 0;
    overlay.style.right = 0;
    overlay.style.bottom = 0;
    overlay.style.background = 'rgba(0,0,0,0.4)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = 9999;

    const modal = document.createElement('div');
    modal.style.width = '92%';
    modal.style.maxWidth = '720px';
    modal.style.background = '#fff';
    modal.style.borderRadius = '10px';
    modal.style.padding = '16px';
    modal.style.maxHeight = '80vh';
    modal.style.overflow = 'auto';

    const title = document.createElement('h3');
    title.textContent = 'Izohlar';
    modal.appendChild(title);

    const list = document.createElement('div');
    list.style.marginTop = '8px';

    const comments = ad.comments && Array.isArray(ad.comments) ? ad.comments.slice() : [];
    if (comments.length === 0) {
      const none = document.createElement('div');
      none.textContent = 'Hali izoh yo\'q.';
      list.appendChild(none);
    } else {
      comments.forEach((c) => {
        const row = document.createElement('div');
        row.style.padding = '8px 0';
        row.style.borderBottom = '1px solid #eee';
        row.innerHTML = `<strong>${safeText(c.author || 'Anonim')}</strong> <small style="color:#666">— ${formatDateISO(c.createdAt)}</small><div style="margin-top:6px">${safeText(c.text)}</div>`;
        list.appendChild(row);
      });
    }
    modal.appendChild(list);

    // new comment form
    const ta = document.createElement('textarea');
    ta.placeholder = 'Yangi izoh...';
    ta.style.width = '100%';
    ta.style.minHeight = '80px';
    ta.style.marginTop = '12px';
    modal.appendChild(ta);

    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.justifyContent = 'flex-end';
    btnRow.style.gap = '8px';
    btnRow.style.marginTop = '8px';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Bekor qilish';
    cancelBtn.className = 'cancel-btn';
    const postBtn = document.createElement('button');
    postBtn.textContent = 'Yuborish';
    postBtn.className = 'save-btn';

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(postBtn);
    modal.appendChild(btnRow);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    postBtn.addEventListener('click', () => {
      const text = ta.value.trim();
      if (!text) {
        alert('Izoh yozing.');
        return;
      }
      const comment = {
        id: genId('c-'),
        authorId: profile.id,
        author: profile.name || 'Foydalanuvchi',
        text,
        createdAt: new Date().toISOString(),
      };
      // add to ad
      const idx = ads.findIndex((a) => a.id === ad.id);
      if (idx === -1) {
        alert('E\'lon topilmadi.');
        return;
      }
      ads[idx].comments = ads[idx].comments || [];
      ads[idx].comments.unshift(comment);
      saveAdsToStorage();
      applyFiltersAndRender();
      document.body.removeChild(overlay);
      alert('Izoh yuborildi.');
    });
  }

  // ---------- Ratings ----------
  function rateAdPrompt(ad) {
    const scoreStr = prompt('1 dan 5 gacha baho bering (raqam):', '5');
    if (!scoreStr) return;
    const score = Number(scoreStr);
    if (!score || score < 1 || score > 5) {
      alert('Iltimos 1-5 oralig‘ida qiymat kiriting.');
      return;
    }
    const idx = ads.findIndex((a) => a.id === ad.id);
    if (idx === -1) return alert('E\'lon topilmadi.');
    const r = {
      id: genId('r-'),
      raterId: profile.id,
      score,
      createdAt: new Date().toISOString(),
    };
    ads[idx].ratings = ads[idx].ratings || [];
    ads[idx].ratings.push(r);
    // recompute avg
    const sum = ads[idx].ratings.reduce((s, it) => s + (it.score || 0), 0);
    ads[idx].avgRating = sum / ads[idx].ratings.length;
    saveAdsToStorage();
    renderProfileRating();
    applyFiltersAndRender();
    alert('Rahmat! Baho qabul qilindi.');
  }

  // ---------- Filters UI ----------
  function injectFilterUI() {
    // Create a wrapper before adsContainerEl
    const container = adsContainerEl.parentNode;
    if (!container) return;
    // Check if already exists
    if (document.getElementById('st-filter-bar')) return;

    const wrap = document.createElement('div');
    wrap.id = 'st-filter-bar';
    wrap.style.display = 'flex';
    wrap.style.flexWrap = 'wrap';
    wrap.style.gap = '8px';
    wrap.style.margin = '12px 0';

    // search
    const search = document.createElement('input');
    search.type = 'search';
    search.placeholder = 'Qidiruv: sarlavha, shahar, narx...';
    search.id = 'st-search';
    search.style.padding = '8px';
    search.style.borderRadius = '8px';
    search.style.border = '1px solid #ccc';
    search.style.minWidth = '200px';
    wrap.appendChild(search);

    // status select
    const statusSel = document.createElement('select');
    statusSel.id = 'st-status';
    statusSel.style.padding = '8px';
    statusSel.style.borderRadius = '8px';
    statusSel.style.border = '1px solid #ccc';
    const optAll = document.createElement('option'); optAll.value = ''; optAll.textContent = 'Barchasi'; statusSel.appendChild(optAll);
    const optPending = document.createElement('option'); optPending.value = STATUSES.PENDING; optPending.textContent = STATUSES.PENDING; statusSel.appendChild(optPending);
    const optApproved = document.createElement('option'); optApproved.value = STATUSES.APPROVED; optApproved.textContent = STATUSES.APPROVED; statusSel.appendChild(optApproved);
    const optRejected = document.createElement('option'); optRejected.value = STATUSES.REJECTED; optRejected.textContent = STATUSES.REJECTED; statusSel.appendChild(optRejected);
    wrap.appendChild(statusSel);

    // per page
    const perSel = document.createElement('select');
    perSel.id = 'st-perpage';
    [6, 10, 12, 20].forEach((n) => {
      const o = document.createElement('option'); o.value = String(n); o.textContent = `${n} / sahifa`; perSel.appendChild(o);
    });
    perSel.value = String(DEFAULT_PER_PAGE);
    wrap.appendChild(perSel);

    // export CSV
    const csvBtn = document.createElement('button');
    csvBtn.textContent = 'CSV export';
    csvBtn.className = 'save-btn';
    csvBtn.style.marginLeft = 'auto';
    wrap.appendChild(csvBtn);

    container.insertBefore(wrap, adsContainerEl);

    // Events
    let searchTimer = null;
    search.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        filters.query = search.value.trim().toLowerCase();
        filters.page = 1;
        applyFiltersAndRender();
      }, 250);
    });
    statusSel.addEventListener('change', () => {
      filters.status = statusSel.value;
      filters.page = 1;
      applyFiltersAndRender();
    });
    perSel.addEventListener('change', () => {
      filters.perPage = Number(perSel.value);
      filters.page = 1;
      applyFiltersAndRender();
    });
    csvBtn.addEventListener('click', exportFilteredToCSV);
  }

  // ---------- Apply filters and render ----------
  function applyFiltersAndRender() {
    // produce filtered array
    let list = ads.slice();

    // status filter
    if (filters.status) {
      list = list.filter((a) => (a.status || STATUSES.PENDING) === filters.status);
    }

    // query filter
    if (filters.query) {
      const q = filters.query;
      list = list.filter((a) => {
        const hay = `${a.title || ''} ${a.description || ''} ${a.from || ''} ${a.to || ''} ${a.price || ''}`.toLowerCase();
        return hay.indexOf(q) !== -1;
      });
    }

    // sort newest first
    list.sort((x, y) => {
      const ax = x.createdAt ? new Date(x.createdAt).getTime() : 0;
      const by = y.createdAt ? new Date(y.createdAt).getTime() : 0;
      return by - ax;
    });

    renderAdsPaginated(list);
  }

  function renderAdsPaginated(list) {
    // pagination
    const total = list.length;
    const per = filters.perPage || DEFAULT_PER_PAGE;
    const pages = Math.max(1, Math.ceil(total / per));
    if (filters.page > pages) filters.page = pages;
    const start = (filters.page - 1) * per;
    const pageItems = list.slice(start, start + per);

    // clear container
    adsContainerEl.innerHTML = '';

    if (!pageItems || pageItems.length === 0) {
      const none = document.createElement('div');
      none.className = 'ad-card';
      none.innerHTML = `<p>Sizda hali e'lonlar yo'q yoki filtrga mos e'lon topilmadi.</p>`;
      adsContainerEl.appendChild(none);
    } else {
      pageItems.forEach((ad) => {
        const card = buildAdCard(ad);
        adsContainerEl.appendChild(card);
      });
    }

    // pagination controls
    renderPaginationControls(total, pages);
  }

  function renderPaginationControls(total, pages) {
    // remove existing pager
    const existing = document.getElementById('st-pager');
    if (existing) existing.remove();

    const pager = document.createElement('div');
    pager.id = 'st-pager';
    pager.style.display = 'flex';
    pager.style.justifyContent = 'space-between';
    pager.style.alignItems = 'center';
    pager.style.marginTop = '12px';

    const left = document.createElement('div');
    left.textContent = `Jami: ${total} e'lon — sahifa ${filters.page} / ${pages}`;

    const right = document.createElement('div');
    right.style.display = 'flex';
    right.style.gap = '8px';

    const prev = document.createElement('button');
    prev.textContent = 'Oldingi';
    prev.disabled = filters.page <= 1;
    prev.addEventListener('click', () => {
      filters.page = Math.max(1, filters.page - 1);
      applyFiltersAndRender();
    });

    const next = document.createElement('button');
    next.textContent = 'Keyingi';
    next.disabled = filters.page >= pages;
    next.addEventListener('click', () => {
      filters.page = Math.min(pages, filters.page + 1);
      applyFiltersAndRender();
    });

    right.appendChild(prev);
    right.appendChild(next);
    pager.appendChild(left);
    pager.appendChild(right);

    adsContainerEl.parentNode.appendChild(pager);
  }

  // ---------- Build ad card DOM ----------
  function buildAdCard(ad) {
    const card = document.createElement('div');
    card.className = 'ad-card';
    card.dataset.id = ad.id;

    // header
    const header = document.createElement('div');
    header.className = 'ad-header';
    const h4 = document.createElement('h4');
    h4.textContent = ad.title || 'E\'lon';
    header.appendChild(h4);
    header.appendChild(renderStatusBadge(ad.status || STATUSES.PENDING));
    card.appendChild(header);

    // body
    const body = document.createElement('div');
    body.className = 'ad-body';
    const route = document.createElement('p');
    route.innerHTML = `<strong>Marshrut:</strong> ${safeText(ad.from || '')} → ${safeText(ad.to || '')}`;
    const price = document.createElement('p');
    price.innerHTML = `<strong>Narx:</strong> ${formatCurrency(ad.price)}`;
    const desc = document.createElement('p');
    desc.innerHTML = `<strong>Izoh:</strong> ${safeText(ad.description || '')}`;
    const created = document.createElement('p');
    created.innerHTML = `<small>Joylangan: ${formatDateISO(ad.createdAt)}</small>`;
    body.appendChild(route);
    body.appendChild(price);
    body.appendChild(desc);
    body.appendChild(created);

    // image preview (if any)
    if (ad.imageData) {
      const imgWrap = document.createElement('div');
      imgWrap.style.marginTop = '8px';
      const img = document.createElement('img');
      img.src = ad.imageData;
      img.style.maxWidth = '180px';
      img.style.maxHeight = '120px';
      img.style.borderRadius = '8px';
      imgWrap.appendChild(img);
      body.appendChild(imgWrap);
    }

    card.appendChild(body);

    // actions
    const actions = document.createElement('div');
    actions.className = 'ad-actions';

    // Edit & delete only for owner
    if (ad.userId === profile.id) {
      const editBtn = document.createElement('button');
      editBtn.className = 'edit-btn';
      editBtn.textContent = 'Tahrirlash';
      editBtn.addEventListener('click', () => openEditAd(ad));
      actions.appendChild(editBtn);

      const delBtn = document.createElement('button');
      delBtn.className = 'delete-btn';
      delBtn.textContent = 'O\'chirish';
      delBtn.addEventListener('click', () => handleDeleteAd(ad.id));
      actions.appendChild(delBtn);
    }

    // Rating: if not owner, can rate
    if (ad.userId !== profile.id) {
      const rateBtn = document.createElement('button');
      rateBtn.className = 'edit-btn';
      rateBtn.textContent = 'Baholash';
      rateBtn.addEventListener('click', () => rateAdPrompt(ad));
      actions.appendChild(rateBtn);
    } else {
      // show avg rating for owner
      const starWrap = document.createElement('div');
      starWrap.style.marginLeft = '8px';
      starWrap.style.display = 'inline-block';
      if (ad.avgRating) {
        starWrap.appendChild(renderSmallStars(ad.avgRating));
      } else {
        starWrap.textContent = 'Baholar: —';
      }
      actions.appendChild(starWrap);
    }

    // Comments button
    const commentsBtn = document.createElement('button');
    commentsBtn.className = 'edit-btn';
    commentsBtn.textContent = 'Izoh yozish';
    commentsBtn.addEventListener('click', () => openCommentsModal(ad));
    actions.appendChild(commentsBtn);

    card.appendChild(actions);

    return card;
  }

  function renderSmallStars(avg) {
    const cont = document.createElement('div');
    for (let i = 1; i <= 5; i++) {
      const s = document.createElement('span');
      s.style.fontSize = '16px';
      s.style.marginRight = '2px';
      if (i <= Math.round(avg)) {
        s.textContent = '★';
        s.style.color = 'gold';
      } else {
        s.textContent = '☆';
        s.style.color = '#ccc';
      }
      cont.appendChild(s);
    }
    return cont;
  }

  function renderStatusBadge(status) {
    const span = document.createElement('span');
    span.className = 'ad-status';
    span.textContent = status || STATUSES.PENDING;
    if (status === STATUSES.APPROVED) {
      span.classList.add('status-approved');
    } else if (status === STATUSES.REJECTED) {
      span.classList.add('status-rejected');
    } else {
      span.classList.add('status-pending');
    }
    return span;
  }

  // ---------- CSV Export ----------
  function exportFilteredToCSV() {
    // build CSV from currently filtered list
    let list = ads.slice();
    if (filters.status) list = list.filter((a) => a.status === filters.status);
    if (filters.query) {
      const q = filters.query;
      list = list.filter((a) => `${a.title} ${a.description} ${a.from} ${a.to} ${a.price}`.toLowerCase().indexOf(q) !== -1);
    }
    const columns = ['id', 'title', 'from', 'to', 'price', 'status', 'createdAt', 'avgRating'];
    const rows = list.map((r) => columns.map((c) => {
      let v = r[c];
      if (c === 'createdAt') v = r.createdAt ? formatDateISO(r.createdAt) : '';
      if (c === 'avgRating') v = r.avgRating ? Number(r.avgRating).toFixed(2) : '';
      if (v === undefined || v === null) v = '';
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(','));
    const csv = `"${columns.join('","')}"\n` + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shahartaxi-ads-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ---------- Init demo sample data (optional) ----------
  function ensureDemoData() {
    // If no profile name set, set demo and add sample ads
    if (!profile || !profile.name) {
      profile = Object.assign({}, DEMO_USER);
      saveProfileToStorage();
    }
    if (!ads || ads.length === 0) {
      // put 2 sample ads for demo
      ads = [
        {
          id: genId('ad-'),
          title: 'Andijon → Toshkent',
          from: 'Andijon',
          to: 'Toshkent',
          price: 70000,
          description: 'Har kuni 18:00 da qatnov.',
          userId: profile.id,
          userEmail: profile.email || '',
          status: STATUSES.APPROVED,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
          updatedAt: null,
          comments: [{ id: genId('c-'), author: 'Ali', authorId: 'u2', text: 'Rahmat yaxshi xizmat!', createdAt: new Date().toISOString() }],
          ratings: [{ id: genId('r-'), raterId: 'u2', score: 5, createdAt: new Date().toISOString() }],
          avgRating: 5,
          imageData: null,
        },
        {
          id: genId('ad-'),
          title: 'Buxoro → Samarqand',
          from: 'Buxoro',
          to: 'Samarqand',
          price: 40000,
          description: 'Vaqtlari mos kelganda chiqamiz.',
          userId: profile.id,
          userEmail: profile.email || '',
          status: STATUSES.PENDING,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
          updatedAt: null,
          comments: [],
          ratings: [],
          avgRating: 0,
          imageData: null,
        }
      ];
      saveAdsToStorage();
    }
  }

  // ---------- Expose small debug API ----------
  window.ShaharTaxiLocal = {
    getProfile: () => profile,
    getAds: () => ads,
    resetData: () => {
      if (confirm('Demo ma\'lumotlarni tiklamoqchimisiz?')) {
        localStorage.removeItem(STORAGE_KEYS.PROFILE);
        localStorage.removeItem(STORAGE_KEYS.ADS);
        loadProfileFromStorage();
        loadAdsFromStorage();
        ensureDemoData();
        renderProfileHeader();
        applyFiltersAndRender();
        alert('Tiklandi');
      }
    }
  };

  // ---------- Run initialization ----------
  ensureDemoData();
  init();

  // ---------- End ----------
})();
