/* profile.js
   Unified ShaharTaxi profile script (single-file).
   - localStorage-based demo (no Firebase)
   - Region->City selects (converted from inputs)
   - Status badges with background classes
   - CRUD for ads, comments, ratings
   - Image preview (base64 stored)
   - Filters, pagination, CSV export
   - Defensive: recover from corrupted localStorage
   - No eval, no smart-quotes, CSP-safe
*/

(function () {
  'use strict';

  /* ---------- Config ---------- */
  const STORAGE = {
    PROFILE: 'shahartaxi_profile_v_final',
    ADS: 'shahartaxi_ads_v_final',
  };

  const STATUS = {
    PENDING: 'Kutilyapti',
    APPROVED: 'Tasdiqlangan',
    REJECTED: 'Rad etilgan',
  };

  const DEFAULT_PER_PAGE = 6;

  // Region -> cities map (extend if needed)
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

  const DEMO_USER = { id: 'demo-user-1', name: 'Foydalanuvchi', email: '', phone: '' };

  /* ---------- Safe DOM getter ---------- */
  function q(id) { return document.getElementById(id); }

  /* ---------- DOM references ---------- */
  const refs = {
    profileName: q('profileName'),
    profilePhone: q('profilePhone'),
    profileEmail: q('profileEmail'),
    starContainer: q('starContainer'),
    avgRating: q('avgRating'),

    editProfileBtn: q('editProfileBtn'),
    addAdBtn: q('addAdBtn'),
    logoutBtn: q('logoutBtn'),

    editForm: q('editForm'),
    editName: q('editName'),
    editPhone: q('editPhone'),
    editEmail: q('editEmail'),

    addForm: q('addForm'),
    from: q('from'),
    to: q('to'),
    price: q('price'),
    desc: q('desc'),

    adsContainer: q('adsContainer')
  };

  /* Validate presence of required elements (but continue even if some missing) */
  (function checkRequired() {
    const missing = [];
    Object.keys(refs).forEach((k) => { if (!refs[k]) missing.push(k); });
    if (missing.length) {
      console.warn('profile.js: quyidagi element(lar) topilmadi (HTML bilan ID mosligini tekshiring):', missing);
    } else {
      console.log('profile.js: barcha kerakli elementlar topildi.');
    }
  })();

  /* ---------- Utilities ---------- */
  function safe(v) { return v === undefined || v === null ? '' : String(v); }
  function genId(prefix = '') { return prefix + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }
  function fmtPrice(v) {
    if (v === undefined || v === null || v === '') return '—';
    const n = Number(v);
    if (isNaN(n)) return safe(v);
    return n.toLocaleString('uz-UZ') + " so'm";
  }
  function fmtDate(d) { if (!d) return ''; try { return new Date(d).toLocaleString(); } catch (e) { return String(d); } }

  function toast(msg) {
    // one non-blocking message box in top-right
    const id = 'st-toast-area';
    let area = document.getElementById(id);
    if (!area) {
      area = document.createElement('div');
      area.id = id;
      area.style.position = 'fixed';
      area.style.top = '12px';
      area.style.right = '12px';
      area.style.zIndex = '99999';
      document.body.appendChild(area);
    }
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.background = '#222';
    el.style.color = '#fff';
    el.style.padding = '8px 12px';
    el.style.borderRadius = '8px';
    el.style.marginTop = '6px';
    el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    area.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity 300ms';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 350);
    }, 2200);
  }

  /* ---------- Robust localStorage helpers ---------- */
  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      console.warn('profile.js: corrupted localStorage key', key, '; resetting to fallback.', err);
      localStorage.removeItem(key);
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error('profile.js: saveJSON error', err);
      toast('Ma\'lumotlarni saqlashda xatolik yuz berdi.');
    }
  }

  /* ---------- App state ---------- */
  let profile = null;
  let ads = [];
  const filters = { query: '', status: '', perPage: DEFAULT_PER_PAGE, page: 1 };

  /* ---------- Initialization data ---------- */
  function ensureInitialData() {
    profile = loadJSON(STORAGE.PROFILE, null);
    if (!profile) {
      profile = Object.assign({}, DEMO_USER);
      saveJSON(STORAGE.PROFILE, profile);
    }
    ads = loadJSON(STORAGE.ADS, []);
    if (!Array.isArray(ads)) {
      ads = [];
      saveJSON(STORAGE.ADS, ads);
    }

    // Add demo ads if none exist (useful for first run)
    if (ads.length === 0) {
      ads = [
        {
          id: genId('ad-'),
          title: 'Andijon → Toshkent',
          from: 'Andijon',
          to: 'Toshkent',
          price: 70000,
          description: 'Har kuni 18:00 da qatnov.',
          userId: profile.id,
          status: STATUS.APPROVED,
          createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
          updatedAt: null,
          comments: [{ id: genId('c-'), author: 'Ali', text: 'Rahmat!', createdAt: new Date().toISOString() }],
          ratings: [{ id: genId('r-'), raterId: 'u2', score: 5, createdAt: new Date().toISOString() }],
          avgRating: 5,
          imageData: null
        },
        {
          id: genId('ad-'),
          title: 'Buxoro → Samarqand',
          from: 'Buxoro',
          to: 'Samarqand',
          price: 40000,
          description: 'Vaqtlari mos kelganda chiqamiz.',
          userId: profile.id,
          status: STATUS.PENDING,
          createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
          updatedAt: null,
          comments: [],
          ratings: [],
          avgRating: 0,
          imageData: null
        }
      ];
      saveJSON(STORAGE.ADS, ads);
      console.log('profile.js: demo ads created');
    }
  }

  /* ---------- UI: region/city selects ---------- */
  function replaceRouteInputs() {
    // If 'from' exists and is an <input>, convert to <select>
    if (!refs.addForm) return;
    let fromEl = refs.from;
    if (!fromEl) return;
    if (fromEl.tagName.toLowerCase() !== 'select') {
      const sel = document.createElement('select');
      sel.id = 'from';
      sel.style.width = '100%';
      sel.style.padding = '8px';
      sel.style.borderRadius = '6px';
      sel.style.border = '1px solid #ccc';
      const def = document.createElement('option'); def.value = ''; def.textContent = 'Viloyatni tanlang'; sel.appendChild(def);
      Object.keys(REGION_CITY).forEach((r) => {
        const o = document.createElement('option'); o.value = r; o.textContent = r; sel.appendChild(o);
      });
      try { fromEl.parentNode.replaceChild(sel, fromEl); } catch (e) { /* ignore */ }
      refs.from = sel;
    }
    // 'to' -> city select
    let toEl = refs.to;
    if (!toEl) return;
    if (toEl.tagName.toLowerCase() !== 'select') {
      const sel = document.createElement('select');
      sel.id = 'to';
      sel.style.width = '100%';
      sel.style.padding = '8px';
      sel.style.borderRadius = '6px';
      sel.style.border = '1px solid #ccc';
      const def = document.createElement('option'); def.value = ''; def.textContent = 'Shaharni tanlang'; sel.appendChild(def);
      try {
        if (toEl.parentNode) toEl.parentNode.replaceChild(sel, toEl);
        else refs.addForm.appendChild(sel);
      } catch (e) { /* ignore */ }
      refs.to = sel;
    }

    // Bind region change to populate cities
    if (refs.from) {
      refs.from.addEventListener('change', () => {
        const region = refs.from.value;
        refs.to.innerHTML = '';
        const d = document.createElement('option'); d.value = ''; d.textContent = 'Shaharni tanlang'; refs.to.appendChild(d);
        if (region && REGION_CITY[region]) {
          REGION_CITY[region].forEach((c) => {
            const o = document.createElement('option'); o.value = c; o.textContent = c; refs.to.appendChild(o);
          });
        }
      });
    }
  }

  /* ---------- Image input ---------- */
  function ensureImageInput() {
    if (!refs.addForm) return;
    if (refs.addForm.querySelector('#adImageInput')) return;
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.id = 'adImageInput';
    fileInput.style.display = 'block';
    fileInput.style.marginTop = '6px';
    refs.addForm.appendChild(fileInput);

    const preview = document.createElement('div');
    preview.id = 'adImagePreview';
    preview.style.marginTop = '8px';
    refs.addForm.appendChild(preview);

    fileInput.addEventListener('change', (ev) => {
      const f = ev.target.files && ev.target.files[0];
      if (!f) {
        preview.innerHTML = '';
        delete refs.addForm.dataset.imageData;
        return;
      }
      const reader = new FileReader();
      reader.onload = function (e) {
        const data = e.target.result;
        preview.innerHTML = `<img src="${data}" alt="preview" style="max-width:160px;max-height:120px;border-radius:8px">`;
        refs.addForm.dataset.imageData = data;
      };
      reader.readAsDataURL(f);
    });
  }

  /* ---------- Render profile header (name, phone, email, avg rating) ---------- */
  function renderProfileHeader() {
    if (refs.profileName) refs.profileName.textContent = safe(profile.name || DEMO_USER.name);
    if (refs.profilePhone) refs.profilePhone.textContent = 'Telefon: ' + (profile.phone || '');
    if (refs.profileEmail) refs.profileEmail.textContent = 'Email: ' + (profile.email || '');
    renderProfileAvg();
  }

  function renderProfileAvg() {
    let total = 0, count = 0;
    ads.forEach((a) => {
      if (a.userId === profile.id && Array.isArray(a.ratings)) {
        a.ratings.forEach((r) => { total += (r.score || 0); count++; });
      }
    });
    const avg = count ? total / count : 0;
    if (refs.starContainer) {
      refs.starContainer.innerHTML = '';
      refs.starContainer.appendChild(renderStars(avg));
    }
    if (refs.avgRating) refs.avgRating.textContent = `(${avg.toFixed(1)})`;
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

  /* ---------- Render ads list ---------- */
  function renderAdsList(filteredAds) {
    if (!refs.adsContainer) return;
    refs.adsContainer.innerHTML = '';

    // Filter for current user only
    const myAll = (filteredAds || ads).filter((a) => a.userId === profile.id);

    if (myAll.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'ad-card';
      empty.innerHTML = '<p>Sizda hali e\'lonlar yo\'q.</p>';
      refs.adsContainer.appendChild(empty);
      return;
    }

    // ensure sort newest first
    myAll.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    myAll.forEach((ad) => {
      const card = document.createElement('div');
      card.className = 'ad-card';
      card.dataset.id = ad.id;

      // header
      const header = document.createElement('div');
      header.className = 'ad-header';
      const h4 = document.createElement('h4');
      h4.textContent = ad.title || `${ad.from} → ${ad.to}`;
      header.appendChild(h4);

      const badge = document.createElement('span');
      badge.className = 'ad-status';
      badge.textContent = ad.status || STATUS.PENDING;
      if (ad.status === STATUS.APPROVED) badge.classList.add('status-approved');
      else if (ad.status === STATUS.REJECTED) badge.classList.add('status-rejected');
      else badge.classList.add('status-pending');

      header.appendChild(badge);
      card.appendChild(header);

      // body
      const body = document.createElement('div');
      body.className = 'ad-body';
      const route = document.createElement('p');
      route.innerHTML = `<strong>Marshrut:</strong> ${safe(ad.from)} → ${safe(ad.to)}`;
      const price = document.createElement('p');
      price.innerHTML = `<strong>Narx:</strong> ${fmtPrice(ad.price)}`;
      const desc = document.createElement('p');
      desc.innerHTML = `<strong>Izoh:</strong> ${safe(ad.description || '')}`;
      body.appendChild(route); body.appendChild(price); body.appendChild(desc);

      // image if exists
      if (ad.imageData) {
        const imgWrap = document.createElement('div');
        imgWrap.style.marginTop = '8px';
        const img = document.createElement('img');
        img.src = ad.imageData;
        img.alt = 'ad-image';
        img.style.maxWidth = '180px';
        img.style.maxHeight = '120px';
        img.style.borderRadius = '8px';
        imgWrap.appendChild(img);
        body.appendChild(imgWrap);
      }

      // createdAt
      const created = document.createElement('p');
      created.innerHTML = `<small>Joylangan: ${fmtDate(ad.createdAt)}</small>`;
      body.appendChild(created);

      card.appendChild(body);

      // actions
      const actions = document.createElement('div');
      actions.className = 'ad-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'edit-btn';
      editBtn.textContent = 'Tahrirlash';
      editBtn.addEventListener('click', () => openEditAd(ad.id));
      actions.appendChild(editBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = 'O\'chirish';
      deleteBtn.addEventListener('click', () => {
        if (confirm('E\'lonni o\'chirishni xohlaysizmi?')) deleteAd(ad.id);
      });
      actions.appendChild(deleteBtn);

      // rating or rate button: owner sees avg, others would see rate (since no auth, we show avg)
      const ratingWrap = document.createElement('div');
      ratingWrap.style.marginLeft = '8px';
      if (ad.avgRating && ad.avgRating > 0) ratingWrap.appendChild(renderSmallStars(ad.avgRating));
      else ratingWrap.textContent = 'Baholar: —';
      actions.appendChild(ratingWrap);

      // comment preview
      if (Array.isArray(ad.comments) && ad.comments.length > 0) {
        const commentWrap = document.createElement('div');
        commentWrap.className = 'comment-box';
        const title = document.createElement('div');
        title.innerHTML = '<strong>Izohlar (so\'nggi 2):</strong>';
        commentWrap.appendChild(title);
        ad.comments.slice(0, 2).forEach((c) => {
          const cdiv = document.createElement('div');
          cdiv.innerHTML = `<small><strong>${safe(c.author)}</strong>: ${safe(c.text)}</small>`;
          commentWrap.appendChild(cdiv);
        });
        const moreBtn = document.createElement('button');
        moreBtn.className = 'edit-btn';
        moreBtn.style.marginTop = '6px';
        moreBtn.textContent = 'Barcha izohlar';
        moreBtn.addEventListener('click', () => openCommentsModal(ad.id));
        commentWrap.appendChild(moreBtn);
        actions.appendChild(commentWrap);
      } else {
        const commentBtn = document.createElement('button');
        commentBtn.className = 'edit-btn';
        commentBtn.textContent = 'Izoh yozish';
        commentBtn.addEventListener('click', () => openCommentsModal(ad.id));
        actions.appendChild(commentBtn);
      }

      // rate button (allow rating)
      const rateBtn = document.createElement('button');
      rateBtn.className = 'edit-btn';
      rateBtn.textContent = 'Baholash';
      rateBtn.addEventListener('click', () => openRatePrompt(ad.id));
      actions.appendChild(rateBtn);

      card.appendChild(actions);

      refs.adsContainer.appendChild(card);
    });
  }

  function renderSmallStars(avg) {
    const cont = document.createElement('div');
    for (let i = 1; i <= 5; i++) {
      const s = document.createElement('span');
      s.style.fontSize = '14px';
      s.style.marginRight = '2px';
      if (i <= Math.round(avg)) { s.textContent = '★'; s.style.color = 'gold'; } else { s.textContent = '☆'; s.style.color = '#ccc'; }
      cont.appendChild(s);
    }
    return cont;
  }

  /* ---------- Create / Update / Delete ad ---------- */
  function resetAddForm() {
    if (!refs.addForm) return;
    const h = refs.addForm.querySelector('h3'); if (h) h.textContent = 'Yangi e\'lon joylash';
    if (refs.from && refs.from.tagName.toLowerCase() === 'select') refs.from.value = '';
    if (refs.to && refs.to.tagName.toLowerCase() === 'select') {
      refs.to.innerHTML = '';
      const def = document.createElement('option'); def.value = ''; def.textContent = 'Shaharni tanlang'; refs.to.appendChild(def);
    }
    if (refs.price) refs.price.value = '';
    if (refs.desc) refs.desc.value = '';
    const prev = document.getElementById('adImagePreview'); if (prev) prev.innerHTML = '';
    delete refs.addForm.dataset.editing;
    delete refs.addForm.dataset.adId;
    delete refs.addForm.dataset.imageData;
  }

  function createAdFromForm() {
    if (!refs.addForm) return;
    const region = refs.from ? refs.from.value.trim() : '';
    const city = refs.to ? refs.to.value.trim() : '';
    const price = refs.price ? refs.price.value.trim() : '';
    const desc = refs.desc ? refs.desc.value.trim() : '';
    const image = refs.addForm.dataset.imageData || null;

    if (!region) { toast('Iltimos viloyatni tanlang.'); return; }
    if (!city) { toast('Iltimos shaharni tanlang.'); return; }
    if (!price || isNaN(Number(price))) { toast('Iltimos to\'g\'ri narx kiriting.'); return; }

    const ad = {
      id: genId('ad-'),
      title: `${region} — ${city}`,
      from: region,
      to: city,
      price: Number(price),
      description: desc || '',
      userId: profile.id,
      userEmail: profile.email || '',
      status: STATUS.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      comments: [],
      ratings: [],
      avgRating: 0,
      imageData: image
    };

    ads.unshift(ad);
    saveJSON(STORAGE.ADS, ads);
    renderProfileHeader();
    applyFiltersAndRender();
    resetAddForm();
    if (refs.addForm) refs.addForm.style.display = 'none';
    toast('E\'lon joylandi. Administratsiya tekshiradi.');
  }

  function updateAdFromForm(adId) {
    if (!refs.addForm) return;
    const region = refs.from ? refs.from.value.trim() : '';
    const city = refs.to ? refs.to.value.trim() : '';
    const price = refs.price ? refs.price.value.trim() : '';
    const desc = refs.desc ? refs.desc.value.trim() : '';
    const image = refs.addForm.dataset.imageData || null;

    if (!region) { toast('Iltimos viloyatni tanlang.'); return; }
    if (!city) { toast('Iltimos shaharni tanlang.'); return; }
    if (!price || isNaN(Number(price))) { toast('Iltimos to\'g\'ri narx kiriting.'); return; }

    const idx = ads.findIndex((a) => a.id === adId);
    if (idx === -1) { toast('E\'lon topilmadi.'); return; }

    const updated = Object.assign({}, ads[idx], {
      from: region,
      to: city,
      title: `${region} — ${city}`,
      price: Number(price),
      description: desc,
      updatedAt: new Date().toISOString()
    });
    if (image) updated.imageData = image;

    ads.splice(idx, 1, updated);
    saveJSON(STORAGE.ADS, ads);
    renderProfileHeader();
    applyFiltersAndRender();
    resetAddForm();
    if (refs.addForm) refs.addForm.style.display = 'none';
    toast('E\'lon yangilandi.');
  }

  function openEditAd(adId) {
    const ad = ads.find((a) => a.id === adId);
    if (!ad) { toast('E\'lon topilmadi.'); return; }
    if (refs.addForm) {
      refs.addForm.dataset.editing = 'true';
      refs.addForm.dataset.adId = adId;
    }
    const h = refs.addForm ? refs.addForm.querySelector('h3') : null; if (h) h.textContent = 'E\'lonni tahrirlash';
    if (refs.from && refs.from.tagName.toLowerCase() === 'select') {
      refs.from.value = ad.from || '';
      // trigger change to populate cities
      refs.from.dispatchEvent(new Event('change'));
    }
    if (refs.to && refs.to.tagName.toLowerCase() === 'select') refs.to.value = ad.to || '';
    if (refs.price) refs.price.value = ad.price || '';
    if (refs.desc) refs.desc.value = ad.description || '';
    if (ad.imageData) {
      const prev = document.getElementById('adImagePreview');
      if (prev) prev.innerHTML = `<img src="${ad.imageData}" alt="preview" style="max-width:160px;max-height:120px;border-radius:8px">`;
      refs.addForm.dataset.imageData = ad.imageData;
    }
    if (refs.addForm) refs.addForm.style.display = 'block';
    if (refs.addForm) refs.addForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function deleteAd(adId) {
    const idx = ads.findIndex((a) => a.id === adId);
    if (idx === -1) { toast('E\'lon topilmadi.'); return; }
    ads.splice(idx, 1);
    saveJSON(STORAGE.ADS, ads);
    renderProfileHeader();
    applyFiltersAndRender();
    toast('E\'lon o\'chirildi.');
  }

  /* ---------- Comments & Ratings ---------- */
  function openCommentsModal(adId) {
    const ad = ads.find((a) => a.id === adId);
    if (!ad) { toast('E\'lon topilmadi.'); return; }

    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.background = 'rgba(0,0,0,0.4)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '99999';

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
    const comments = (ad.comments || []).slice();
    if (comments.length === 0) {
      const none = document.createElement('div'); none.textContent = 'Hali izohlar yo\'q.'; list.appendChild(none);
    } else {
      comments.forEach((c) => {
        const row = document.createElement('div');
        row.style.padding = '8px 0';
        row.style.borderBottom = '1px solid #eee';
        row.innerHTML = `<strong>${safe(c.author)}</strong> <small style="color:#666">— ${fmtDate(c.createdAt)}</small><div style="margin-top:6px">${safe(c.text)}</div>`;
        list.appendChild(row);
      });
    }
    modal.appendChild(list);

    const ta = document.createElement('textarea');
    ta.placeholder = 'Yangi izoh...';
    ta.style.width = '100%';
    ta.style.minHeight = '80px';
    ta.style.marginTop = '12px';
    modal.appendChild(ta);

    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'flex-end';
    row.style.gap = '8px';
    row.style.marginTop = '8px';

    const cancel = document.createElement('button');
    cancel.className = 'cancel-btn';
    cancel.textContent = 'Bekor';

    const post = document.createElement('button');
    post.className = 'save-btn';
    post.textContent = 'Yuborish';

    row.appendChild(cancel); row.appendChild(post);
    modal.appendChild(row);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    cancel.addEventListener('click', () => overlay.remove());

    post.addEventListener('click', () => {
      const text = ta.value.trim();
      if (!text) { toast('Iltimos izoh yozing.'); return; }
      const comment = {
        id: genId('c-'),
        authorId: profile.id,
        author: profile.name || profile.email || 'Foydalanuvchi',
        text: text,
        createdAt: new Date().toISOString()
      };
      ad.comments = ad.comments || [];
      ad.comments.unshift(comment);
      saveJSON(STORAGE.ADS, ads);
      applyFiltersAndRender();
      overlay.remove();
      toast('Izoh yuborildi.');
    });
  }

  function openRatePrompt(adId) {
    const n = prompt('1 dan 5 gacha baho bering (raqam):', '5');
    if (!n) return;
    const score = Number(n);
    if (!score || score < 1 || score > 5) { toast('Iltimos 1-5 oralig\'ida baho kiriting.'); return; }
    const ad = ads.find((a) => a.id === adId);
    if (!ad) { toast('E\'lon topilmadi.'); return; }
    const rate = { id: genId('r-'), raterId: profile.id, score: score, createdAt: new Date().toISOString() };
    ad.ratings = ad.ratings || [];
    ad.ratings.push(rate);
    // recompute avg
    const sum = ad.ratings.reduce((s, r) => s + (r.score || 0), 0);
    ad.avgRating = sum / ad.ratings.length;
    saveJSON(STORAGE.ADS, ads);
    renderProfileHeader();
    applyFiltersAndRender();
    toast('Rahmat! Baho qabul qilindi.');
  }

  /* ---------- Filters / Pagination / CSV ---------- */
  function injectFilterBar() {
    if (!refs.adsContainer) return;
    if (document.getElementById('st-filter-bar')) return;
    const wrap = document.createElement('div');
    wrap.id = 'st-filter-bar';
    wrap.style.display = 'flex';
    wrap.style.flexWrap = 'wrap';
    wrap.style.gap = '8px';
    wrap.style.margin = '12px 0';

    const search = document.createElement('input');
    search.type = 'search';
    search.id = 'st-search';
    search.placeholder = 'Qidiruv: sarlavha, izoh, narx...';
    search.style.padding = '8px';
    search.style.border = '1px solid #ccc';
    search.style.borderRadius = '8px';
    search.style.minWidth = '220px';

    const statusSel = document.createElement('select');
    statusSel.id = 'st-status';
    statusSel.style.padding = '8px';
    statusSel.style.border = '1px solid #ccc';
    statusSel.style.borderRadius = '8px';
    ['', STATUS.PENDING, STATUS.APPROVED, STATUS.REJECTED].forEach((v) => {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = v ? v : 'Barchasi';
      statusSel.appendChild(o);
    });

    const perSel = document.createElement('select');
    perSel.id = 'st-per';
    [6, 10, 12].forEach((n) => {
      const o = document.createElement('option'); o.value = n; o.textContent = `${n} / sahifa`; perSel.appendChild(o);
    });
    perSel.value = String(DEFAULT_PER_PAGE);

    const csvBtn = document.createElement('button');
    csvBtn.className = 'save-btn';
    csvBtn.style.marginLeft = 'auto';
    csvBtn.textContent = 'CSV export';

    wrap.appendChild(search);
    wrap.appendChild(statusSel);
    wrap.appendChild(perSel);
    wrap.appendChild(csvBtn);

    refs.adsContainer.parentNode.insertBefore(wrap, refs.adsContainer);

    let timer = null;
    search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { filters.query = search.value.trim().toLowerCase(); filters.page = 1; applyFiltersAndRender(); }, 220); });
    statusSel.addEventListener('change', () => { filters.status = statusSel.value; filters.page = 1; applyFiltersAndRender(); });
    perSel.addEventListener('change', () => { filters.perPage = Number(perSel.value); filters.page = 1; applyFiltersAndRender(); });
    csvBtn.addEventListener('click', exportFilteredCSV);
  }

  function applyFiltersAndRender() {
    // start from ads owned by profile
    let list = ads.slice().filter((a) => a.userId === profile.id);

    if (filters.status) list = list.filter((a) => (a.status || STATUS.PENDING) === filters.status);
    if (filters.query) {
      const q = filters.query;
      list = list.filter((a) => (`${a.title || ''} ${a.description || ''} ${a.from || ''} ${a.to || ''} ${a.price || ''}`).toLowerCase().includes(q));
    }

    // sort by createdAt desc
    list.sort((x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime());

    // paginate
    const total = list.length;
    const per = filters.perPage || DEFAULT_PER_PAGE;
    const pages = Math.max(1, Math.ceil(total / per));
    if (filters.page > pages) filters.page = pages;
    const start = (filters.page - 1) * per;
    const pageItems = list.slice(start, start + per);

    // render
    renderAdsList(pageItems);
    renderPager(total, pages);
  }

  function renderPager(total, pages) {
    const existing = document.getElementById('st-pager');
    if (existing) existing.remove();
    if (!refs.adsContainer) return;
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
    prev.addEventListener('click', () => { filters.page = Math.max(1, filters.page - 1); applyFiltersAndRender(); });

    const next = document.createElement('button');
    next.textContent = 'Keyingi';
    next.disabled = filters.page >= pages;
    next.addEventListener('click', () => { filters.page = Math.min(pages, filters.page + 1); applyFiltersAndRender(); });

    right.appendChild(prev);
    right.appendChild(next);

    pager.appendChild(left);
    pager.appendChild(right);
    refs.adsContainer.parentNode.appendChild(pager);
  }

  function exportFilteredCSV() {
    let list = ads.slice().filter((a) => a.userId === profile.id);
    if (filters.status) list = list.filter((a) => (a.status || STATUS.PENDING) === filters.status);
    if (filters.query) {
      const q = filters.query;
      list = list.filter((a) => (`${a.title || ''} ${a.description || ''} ${a.from || ''} ${a.to || ''} ${a.price || ''}`).toLowerCase().includes(q));
    }
    const columns = ['id', 'title', 'from', 'to', 'price', 'status', 'createdAt', 'avgRating', 'commentsCount'];
    const rows = list.map((r) => columns.map((c) => {
      let v = r[c];
      if (c === 'commentsCount') v = (r.comments && r.comments.length) || 0;
      if (c === 'createdAt') v = r.createdAt ? fmtDate(r.createdAt) : '';
      if (v === undefined || v === null) v = '';
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(','));
    const csv = `"${columns.join('","')}"\n` + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shahartaxi-ads-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /* ---------- Profile form handlers and attach buttons ---------- */
  function attachProfileHandlers() {
    if (refs.editForm) {
      refs.editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = refs.editName ? refs.editName.value.trim() : '';
        const phone = refs.editPhone ? refs.editPhone.value.trim() : '';
        const email = refs.editEmail ? refs.editEmail.value.trim() : '';
        if (!name) { toast('Ism kiritilishi shart.'); return; }
        if (phone && !/^[+]?[\d\s-]{8,15}$/.test(phone)) { toast('Telefon formati xato.'); return; }
        if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast('Email formati xato.'); return; }
        profile.name = name; profile.phone = phone; profile.email = email;
        saveJSON(STORAGE.PROFILE, profile);
        renderProfileHeader();
        refs.editForm.style.display = 'none';
        toast('Profil saqlandi.');
      });
    }

    if (refs.editProfileBtn) {
      refs.editProfileBtn.addEventListener('click', () => {
        if (!refs.editForm) return;
        if (refs.editForm.style.display === 'block') { refs.editForm.style.display = 'none'; return; }
        refs.editName.value = profile.name || '';
        refs.editPhone.value = profile.phone || '';
        refs.editEmail.value = profile.email || '';
        refs.editForm.style.display = 'block';
        refs.editForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }

    if (refs.logoutBtn) {
      refs.logoutBtn.addEventListener('click', () => {
        if (confirm('Chiqishni xohlaysizmi? (demo)')) {
          window.location.reload();
        }
      });
    }
  }

  function attachAddFormHandlers() {
    if (!refs.addForm) return;
    refs.addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const isEdit = refs.addForm.dataset.editing === 'true';
      if (isEdit) updateAdFromForm(refs.addForm.dataset.adId);
      else createAdFromForm();
    });

    if (refs.addAdBtn) {
      refs.addAdBtn.addEventListener('click', () => {
        resetAddForm();
        if (!refs.addForm) return;
        refs.addForm.style.display = refs.addForm.style.display === 'block' ? 'none' : 'block';
        refs.addForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }

  /* ---------- Storage change listener (sync across tabs) ---------- */
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE.ADS || e.key === STORAGE.PROFILE) {
      // reload and re-render
      ads = loadJSON(STORAGE.ADS, ads);
      profile = loadJSON(STORAGE.PROFILE, profile);
      renderProfileHeader();
      applyFiltersAndRender();
    }
  });

  /* ---------- Public debug API ---------- */
  window._ShaharTaxi = {
    getState: () => ({ profile: profile, ads: ads }),
    resetData: function () {
      if (!confirm('Demo ma\'lumotlarni tozalamoqchimisiz?')) return;
      localStorage.removeItem(STORAGE.PROFILE);
      localStorage.removeItem(STORAGE.ADS);
      location.reload();
    }
  };

  /* ---------- Boot (DOMContentLoaded) ---------- */
  function boot() {
    console.log('profile.js: booting...');
    ensureInitialData();
    replaceRouteInputs();
    ensureImageInput();
    injectFilterBar();
    attachProfileHandlers();
    attachAddFormHandlers();
    renderProfileHeader();
    applyFiltersAndRender();
    console.log('profile.js: ready — ads count =', ads.length);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  /* ---------- Diagnostics instructions (if still errors) ----------
     If something still fails, run these in browser Console and paste results:
       1) window._ShaharTaxi && window._ShaharTaxi.getState ? window._ShaharTaxi.getState() : null
       2) localStorage.getItem('shahartaxi_profile_v_final')
       3) localStorage.getItem('shahartaxi_ads_v_final')
       4) document.querySelectorAll('#adsContainer, #editForm, #addForm')
     Also paste any red error messages from Console.
  ------------------------------------------------------------------- */

})();
