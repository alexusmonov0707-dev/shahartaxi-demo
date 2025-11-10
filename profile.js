/* profile.js
   Unified, robust localStorage-based ShaharTaxi profile script.
   - Matches the provided profile.html IDs
   - Handles region->city selects, status colors, images (base64), comments, ratings
   - Safe init (waits DOMContentLoaded), recovers from corrupted localStorage
   - Diagnostic console logs to help debugging
*/

(function () {
  'use strict';

  /* ---------- Config & Data ---------- */
  const STORAGE = {
    PROFILE: 'shahartaxi_profile_v_final',
    ADS: 'shahartaxi_ads_v_final'
  };

  const STATUSES = {
    PENDING: 'Kutilyapti',
    APPROVED: 'Tasdiqlangan',
    REJECTED: 'Rad etilgan'
  };

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
  const DEFAULT_PER_PAGE = 6;

  /* ---------- Safe DOM getter ---------- */
  function q(id) { return document.getElementById(id); }

  /* ---------- DOM refs (must match profile.html) ---------- */
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

  /* Check required DOM elements and warn */
  const missing = [];
  Object.keys(refs).forEach(k => { if (!refs[k]) missing.push(k); });
  if (missing.length) {
    console.warn('profile.js: quyidagi element(lar) topilmadi (HTML bilan ID mosligini tekshiring):', missing);
    // still continue; we'll guard uses of these refs
  } else {
    console.log('profile.js: barcha kerakli elementlar topildi ✅');
  }

  /* ---------- Utilities ---------- */
  function safe(v) { return v === null || v === undefined ? '' : String(v); }
  function genId(p = '') { return p + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }
  function fmtPrice(v) { if (v === '' || v === undefined || v === null) return '—'; const n = Number(v); return isNaN(n) ? safe(v) : n.toLocaleString('uz-UZ') + " so'm"; }
  function fmtDateISO(d) { if (!d) return ''; try { const dt = new Date(d); return dt.toLocaleString(); } catch { return String(d); } }

  function toast(msg) { // simple user message (non-blocking)
    // create small transient toast at top-right
    const id = 'st-toast';
    let box = document.getElementById(id);
    if (!box) {
      box = document.createElement('div'); box.id = id;
      box.style.position = 'fixed'; box.style.top = '12px'; box.style.right = '12px';
      box.style.zIndex = '99999'; document.body.appendChild(box);
    }
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.background = '#111'; el.style.color = '#fff'; el.style.padding = '8px 12px';
    el.style.borderRadius = '8px'; el.style.marginTop = '6px'; el.style.opacity = '0.95';
    box.appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity 300ms'; el.style.opacity = '0'; setTimeout(()=>el.remove(), 350); }, 2500);
  }

  /* ---------- Storage (robust) ---------- */
  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      console.warn('Corrupted localStorage for', key, '; resetting to fallback.', err);
      localStorage.removeItem(key);
      return fallback;
    }
  }
  function saveJSON(key, obj) {
    try { localStorage.setItem(key, JSON.stringify(obj)); }
    catch (err) { console.error('saveJSON error', err); }
  }

  /* ---------- app state ---------- */
  let profile = null;
  let ads = [];
  let filters = { query: '', status: '', perPage: DEFAULT_PER_PAGE, page: 1 };

  /* ---------- Init / ensure demo data ---------- */
  function ensureInitialData() {
    profile = loadJSON(STORAGE.PROFILE, null);
    if (!profile) {
      profile = Object.assign({}, DEMO_USER);
      saveJSON(STORAGE.PROFILE, profile);
    }
    ads = loadJSON(STORAGE.ADS, []);
    if (!Array.isArray(ads)) { ads = []; saveJSON(STORAGE.ADS, ads); }

    // if no ads at all, create couple demo records
    if (ads.length === 0) {
      const sample1 = {
        id: genId('ad-'), title: 'Andijon → Toshkent', from: 'Andijon', to: 'Toshkent', price: 70000,
        description: 'Har kuni 18:00', userId: profile.id, status: STATUSES.APPROVED,
        createdAt: new Date(Date.now() - 3*24*3600*1000).toISOString(), updatedAt: null,
        comments: [{ id: genId('c-'), author: 'Ali', text: 'Rahmat!', createdAt: new Date().toISOString() }],
        ratings: [{ id: genId('r-'), raterId: 'u2', score: 5, createdAt: new Date().toISOString() }],
        avgRating: 5.0, imageData: null
      };
      const sample2 = {
        id: genId('ad-'), title: 'Buxoro → Samarqand', from: 'Buxoro', to: 'Samarqand', price: 40000,
        description: '', userId: profile.id, status: STATUSES.PENDING,
        createdAt: new Date(Date.now() - 1*24*3600*1000).toISOString(), updatedAt: null,
        comments: [], ratings: [], avgRating: 0, imageData: null
      };
      ads = [sample1, sample2];
      saveJSON(STORAGE.ADS, ads);
      console.log('profile.js: demo ads yaratildi');
    }
  }

  /* ---------- Render profile header ---------- */
  function renderProfileHeader() {
    if (refs.profileName) refs.profileName.textContent = safe(profile.name || DEMO_USER.name);
    if (refs.profilePhone) refs.profilePhone.textContent = 'Telefon: ' + (profile.phone || '');
    if (refs.profileEmail) refs.profileEmail.textContent = 'Email: ' + (profile.email || '');
    renderProfileAvgRating();
  }

  function renderProfileAvgRating() {
    let total = 0, cnt = 0;
    ads.forEach(a => {
      if (a.userId === profile.id && Array.isArray(a.ratings)) {
        a.ratings.forEach(r => { total += (r.score||0); cnt++; });
      }
    });
    const avg = cnt ? (total / cnt) : 0;
    if (refs.starContainer) {
      refs.starContainer.innerHTML = '';
      refs.starContainer.appendChild(renderStars(avg));
    }
    if (refs.avgRating) refs.avgRating.textContent = `(${avg.toFixed(1)})`;
  }

  function renderStars(avg) {
    const cont = document.createElement('div'); cont.style.display = 'inline-block';
    const full = Math.floor(avg); const half = avg - full >= 0.5;
    for (let i=1;i<=5;i++){
      const s = document.createElement('span'); s.style.marginRight='3px'; s.style.fontSize='18px';
      if (i<=full) { s.textContent='★'; s.style.color='gold'; }
      else if (i===full+1 && half) { s.textContent='★'; s.style.color='gold'; }
      else { s.textContent='☆'; s.style.color='#ccc'; }
      cont.appendChild(s);
    }
    return cont;
  }

  /* ---------- region/city selects ---------- */
  function replaceRouteInputsWithSelects() {
    // if 'from' / 'to' exist but are input, convert to <select>
    // Only operate if DOM refs exist
    if (!refs.addForm) return;
    // from
    let fromEl = refs.from;
    if (!fromEl) return;
    if (fromEl.tagName.toLowerCase() !== 'select') {
      const sel = document.createElement('select'); sel.id = 'from';
      sel.style.width = '100%'; sel.style.padding='8px'; sel.style.borderRadius='6px'; sel.style.border='1px solid #ccc';
      const def = document.createElement('option'); def.value=''; def.textContent='Viloyatni tanlang'; sel.appendChild(def);
      Object.keys(REGION_CITY).forEach(r => { const o=document.createElement('option'); o.value=r; o.textContent=r; sel.appendChild(o); });
      fromEl.parentNode.replaceChild(sel, fromEl);
      refs.from = sel;
    }
    // to
    let toEl = refs.to;
    if (!toEl) return;
    if (toEl.tagName.toLowerCase() !== 'select') {
      const sel = document.createElement('select'); sel.id = 'to';
      sel.style.width = '100%'; sel.style.padding='8px'; sel.style.borderRadius='6px'; sel.style.border='1px solid #ccc';
      const def = document.createElement('option'); def.value=''; def.textContent='Shaharni tanlang'; sel.appendChild(def);
      if (toEl.parentNode) toEl.parentNode.replaceChild(sel, toEl);
      refs.to = sel;
    }
    // bind region change
    refs.from.addEventListener('change', () => {
      const region = refs.from.value;
      refs.to.innerHTML = '';
      const def = document.createElement('option'); def.value=''; def.textContent='Shaharni tanlang'; refs.to.appendChild(def);
      if (region && REGION_CITY[region]) {
        REGION_CITY[region].forEach(c => { const o=document.createElement('option'); o.value=c; o.textContent=c; refs.to.appendChild(o); });
      }
    });
  }

  /* ---------- Render ads list ---------- */
  function renderAdsList(filtered) {
    if (!refs.adsContainer) return;
    refs.adsContainer.innerHTML = '';
    // consider only profile's ads
    const myAds = (filtered || ads).filter(a => a.userId === profile.id);
    if (myAds.length === 0) {
      const d = document.createElement('div'); d.className='ad-card'; d.innerHTML = '<p>Sizda hali e\\'lonlar yo\\'q.</p>';
      refs.adsContainer.appendChild(d); return;
    }
    // sort desc by createdAt
    myAds.sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    myAds.forEach(ad => {
      const card = document.createElement('div'); card.className='ad-card'; card.dataset.id = ad.id;
      // header
      const header = document.createElement('div'); header.className='ad-header';
      const h4 = document.createElement('h4'); h4.textContent = ad.title || `${ad.from} → ${ad.to}`;
      header.appendChild(h4);
      const badge = document.createElement('span'); badge.className='ad-status'; badge.textContent = ad.status || STATUSES.PENDING;
      if (ad.status === STATUSES.APPROVED) badge.classList.add('status-approved');
      else if (ad.status === STATUSES.REJECTED) badge.classList.add('status-rejected');
      else badge.classList.add('status-pending');
      header.appendChild(badge);
      card.appendChild(header);
      // body
      const body = document.createElement('div'); body.className='ad-body';
      body.innerHTML = `<p><strong>Marshrut:</strong> ${safe(ad.from)} → ${safe(ad.to)}</p>
                        <p><strong>Narx:</strong> ${fmtPrice(ad.price)}</p>
                        <p><strong>Izoh:</strong> ${safe(ad.description || '')}</p>
                        <p><small>Joylangan: ${fmtDateISO(ad.createdAt)}</small></p>`;
      if (ad.imageData) {
        const imgWrap = document.createElement('div'); imgWrap.style.marginTop='8px';
        const img = document.createElement('img'); img.src = ad.imageData; img.style.maxWidth='180px'; img.style.maxHeight='120px'; img.style.borderRadius='8px';
        imgWrap.appendChild(img); body.appendChild(imgWrap);
      }
      card.appendChild(body);
      // actions
      const actions = document.createElement('div'); actions.className='ad-actions';
      const editBtn = document.createElement('button'); editBtn.className='edit-btn'; editBtn.textContent='Tahrirlash';
      editBtn.addEventListener('click', ()=> openEditAd(ad.id));
      const delBtn = document.createElement('button'); delBtn.className='delete-btn'; delBtn.textContent="O'chirish";
      delBtn.addEventListener('click', ()=> { if (confirm("E'lonni o'chirishni xohlaysizmi?")) deleteAd(ad.id); });
      // rating / comments
      const rateBtn = document.createElement('button'); rateBtn.className='edit-btn'; rateBtn.textContent='Baholash';
      rateBtn.addEventListener('click', ()=> openRatePrompt(ad.id));
      const commentBtn = document.createElement('button'); commentBtn.className='edit-btn'; commentBtn.textContent='Izoh yozish';
      commentBtn.addEventListener('click', ()=> openCommentsModal(ad.id));
      // avg rating show
      const ratingWrap = document.createElement('div'); ratingWrap.style.marginLeft='8px';
      ratingWrap.appendChild(renderSmallStars(ad.avgRating || 0));
      actions.appendChild(editBtn); actions.appendChild(delBtn); actions.appendChild(rateBtn); actions.appendChild(commentBtn); actions.appendChild(ratingWrap);
      card.appendChild(actions);
      refs.adsContainer.appendChild(card);
    });
  }

  function renderSmallStars(avg) {
    const cont = document.createElement('div');
    for (let i=1;i<=5;i++){
      const s=document.createElement('span'); s.style.fontSize='14px'; s.style.marginRight='2px';
      if (i <= Math.round(avg)) { s.textContent='★'; s.style.color='gold'; } else { s.textContent='☆'; s.style.color='#ccc'; }
      cont.appendChild(s);
    }
    return cont;
  }

  /* ---------- Add / Edit Ad logic ---------- */
  function setupImageInput() {
    if (!refs.addForm) return;
    if (refs.addForm.querySelector('#adImageInput')) return;
    const fileInput = document.createElement('input'); fileInput.type='file'; fileInput.id='adImageInput'; fileInput.accept='image/*'; fileInput.style.display='block'; fileInput.style.marginTop='6px';
    refs.addForm.appendChild(fileInput);
    const preview = document.createElement('div'); preview.id='adImagePreview'; preview.style.marginTop='8px'; refs.addForm.appendChild(preview);
    fileInput.addEventListener('change', (ev) => {
      const f = ev.target.files && ev.target.files[0];
      if (!f) { preview.innerHTML=''; delete refs.addForm.dataset.imageData; return; }
      const reader = new FileReader();
      reader.onload = (e)=> {
        const data = e.target.result;
        preview.innerHTML = `<img src="${data}" style="max-width:160px;max-height:120px;border-radius:8px">`;
        refs.addForm.dataset.imageData = data;
      };
      reader.readAsDataURL(f);
    });
  }

  function resetAddForm() {
    if (!refs.addForm) return;
    const h = refs.addForm.querySelector('h3'); if (h) h.textContent = "Yangi e'lon joylash";
    if (refs.from && refs.from.tagName.toLowerCase()==='select') refs.from.value='';
    if (refs.to && refs.to.tagName.toLowerCase()==='select') { refs.to.innerHTML=''; const o=document.createElement('option'); o.value=''; o.textContent='Shaharni tanlang'; refs.to.appendChild(o); }
    if (refs.price) refs.price.value=''; if (refs.desc) refs.desc.value='';
    const prev = document.getElementById('adImagePreview'); if (prev) prev.innerHTML='';
    delete refs.addForm.dataset.editing; delete refs.addForm.dataset.adId; delete refs.addForm.dataset.imageData;
  }

  function createAdFromForm() {
    if (!refs.addForm) return;
    const region = refs.from && refs.from.value ? refs.from.value.trim() : '';
    const city   = refs.to && refs.to.value ? refs.to.value.trim() : '';
    const price  = refs.price ? refs.price.value.trim() : '';
    const desc   = refs.desc ? refs.desc.value.trim() : '';
    const image  = refs.addForm.dataset.imageData || null;
    if (!region) return toast('Viloyatni tanlang.');
    if (!city) return toast('Shaharni tanlang.');
    if (!price || isNaN(Number(price))) return toast('To\'g\'ri narx kiriting.');
    const ad = {
      id: genId('ad-'),
      title: `${region} — ${city}`,
      from: region, to: city, price: Number(price), description: desc,
      userId: profile.id, status: STATUSES.PENDING,
      createdAt: new Date().toISOString(), updatedAt: null,
      comments: [], ratings: [], avgRating: 0,
      imageData: image
    };
    ads.unshift(ad); saveJSON(STORAGE.ADS, ads); renderProfileHeader(); renderAdsList(); resetAddForm(); if (refs.addForm) refs.addForm.style.display='none'; toast('E\'lon joylandi.'); 
  }

  function updateAdFromForm(adId) {
    if (!refs.addForm) return;
    const region = refs.from && refs.from.value ? refs.from.value.trim() : '';
    const city   = refs.to && refs.to.value ? refs.to.value.trim() : '';
    const price  = refs.price ? refs.price.value.trim() : '';
    const desc   = refs.desc ? refs.desc.value.trim() : '';
    const image  = refs.addForm.dataset.imageData || null;
    if (!region) return toast('Viloyatni tanlang.');
    if (!city) return toast('Shaharni tanlang.');
    if (!price || isNaN(Number(price))) return toast('To\'g\'ri narx kiriting.');
    const idx = ads.findIndex(a => a.id === adId);
    if (idx === -1) return toast('E\'lon topilmadi.');
    const updated = Object.assign({}, ads[idx], {
      from: region, to: city, price: Number(price), description: desc,
      title: `${region} — ${city}`, updatedAt: new Date().toISOString()
    });
    if (image) updated.imageData = image;
    ads.splice(idx,1, updated); saveJSON(STORAGE.ADS, ads); renderProfileHeader(); renderAdsList(); resetAddForm(); if (refs.addForm) refs.addForm.style.display='none'; toast('E\'lon yangilandi.');
  }

  function openEditAd(adId) {
    const ad = ads.find(a=>a.id===adId);
    if (!ad) return toast('E\'lon topilmadi.');
    if (refs.addForm) { refs.addForm.dataset.editing='true'; refs.addForm.dataset.adId=adId; }
    const h = refs.addForm ? refs.addForm.querySelector('h3') : null; if (h) h.textContent = "E'lonni tahrirlash";
    if (refs.from && refs.from.tagName.toLowerCase()==='select') { refs.from.value = ad.from || ''; refs.from.dispatchEvent(new Event('change')); }
    if (refs.to && refs.to.tagName.toLowerCase()==='select') refs.to.value = ad.to || '';
    if (refs.price) refs.price.value = ad.price || '';
    if (refs.desc) refs.desc.value = ad.description || '';
    if (ad.imageData) { const prev = document.getElementById('adImagePreview'); if (prev) prev.innerHTML = `<img src="${ad.imageData}" style="max-width:160px;max-height:120px;border-radius:8px">`; refs.addForm.dataset.imageData = ad.imageData; }
    if (refs.addForm) refs.addForm.style.display='block';
    if (refs.addForm) refs.addForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function deleteAd(adId) {
    const idx = ads.findIndex(a=>a.id===adId);
    if (idx===-1) return toast('E\'lon topilmadi.');
    ads.splice(idx,1); saveJSON(STORAGE.ADS, ads); renderProfileHeader(); renderAdsList(); toast('E\'lon o\'chirildi.');
  }

  /* ---------- Comments & Ratings ---------- */
  function openCommentsModal(adId) {
    const ad = ads.find(a=>a.id===adId); if (!ad) return toast('E\'lon topilmadi.');
    const overlay = document.createElement('div'); overlay.style.position='fixed'; overlay.style.left=0; overlay.style.top=0; overlay.style.right=0; overlay.style.bottom=0; overlay.style.background='rgba(0,0,0,0.4)'; overlay.style.display='flex'; overlay.style.alignItems='center'; overlay.style.justifyContent='center'; overlay.style.zIndex=99999;
    const modal = document.createElement('div'); modal.style.width='92%'; modal.style.maxWidth='720px'; modal.style.background='#fff'; modal.style.borderRadius='10px'; modal.style.padding='16px'; modal.style.maxHeight='80vh'; modal.style.overflow='auto';
    const title = document.createElement('h3'); title.textContent='Izohlar'; modal.appendChild(title);
    const list = document.createElement('div'); list.style.marginTop='8px';
    const comments = (ad.comments||[]).slice();
    if (comments.length===0) { const n=document.createElement('div'); n.textContent='Hali izoh yo\'q.'; list.appendChild(n); }
    else comments.forEach(c => { const r=document.createElement('div'); r.style.borderBottom='1px solid #eee'; r.style.padding='8px 0'; r.innerHTML=`<strong>${safe(c.author)}</strong> <small style="color:#666">— ${fmtDateISO(c.createdAt)}</small><div style="margin-top:6px">${safe(c.text)}</div>`; list.appendChild(r); });
    modal.appendChild(list);
    const ta = document.createElement('textarea'); ta.placeholder='Yangi izoh...'; ta.style.width='100%'; ta.style.minHeight='80px'; ta.style.marginTop='12px'; modal.appendChild(ta);
    const row = document.createElement('div'); row.style.display='flex'; row.style.justifyContent='flex-end'; row.style.gap='8px'; row.style.marginTop='8px';
    const cancel = document.createElement('button'); cancel.className='cancel-btn'; cancel.textContent='Bekor'; const post = document.createElement('button'); post.className='save-btn'; post.textContent='Yuborish';
    row.appendChild(cancel); row.appendChild(post); modal.appendChild(row);
    overlay.appendChild(modal); document.body.appendChild(overlay);
    cancel.addEventListener('click', ()=> overlay.remove());
    post.addEventListener('click', ()=> {
      const text = ta.value.trim(); if (!text) return toast('Izoh yozing.'); const comment = { id: genId('c-'), authorId: profile.id, author: profile.name||profile.email||'Foydalanuvchi', text, createdAt: new Date().toISOString() };
      ad.comments = ad.comments || []; ad.comments.unshift(comment); saveJSON(STORAGE.ADS, ads); applyFiltersRender(); overlay.remove(); toast('Izoh yuborildi.');
    });
  }

  function openRatePrompt(adId) {
    const n = prompt('1 dan 5 gacha baho bering (raqam):', '5'); if (!n) return; const s = Number(n); if (!s || s<1 || s>5) return toast('1-5 oralig\'ida kiriting.'); const ad = ads.find(a=>a.id===adId); if (!ad) return toast('E\'lon topilmadi.'); const r = { id: genId('r-'), raterId: profile.id, score: s, createdAt: new Date().toISOString() }; ad.ratings = ad.ratings || []; ad.ratings.push(r); ad.avgRating = ad.ratings.reduce((acc,it)=>acc+(it.score||0),0)/ad.ratings.length; saveJSON(STORAGE.ADS, ads); renderProfileHeader(); applyFiltersRender(); toast('Rahmat! Baho qabul qilindi.'); 
  }

  /* ---------- Filters, pagination & CSV ---------- */
  function injectFilterControlsOnce() {
    if (!refs.adsContainer) return;
    if (document.getElementById('st-filter-bar')) return;
    const wrap = document.createElement('div'); wrap.id='st-filter-bar'; wrap.style.display='flex'; wrap.style.flexWrap='wrap'; wrap.style.gap='8px'; wrap.style.margin='12px 0';
    const search = document.createElement('input'); search.type='search'; search.id='st-search'; search.placeholder = 'Qidiruv: sarlavha, izoh, narx...'; search.style.padding='8px'; search.style.border='1px solid #ccc'; search.style.borderRadius='8px'; search.style.minWidth='220px';
    const statusSel = document.createElement('select'); statusSel.id='st-status'; statusSel.style.padding='8px'; statusSel.style.border='1px solid #ccc'; statusSel.style.borderRadius='8px';
    ['','Kutilyapti','Tasdiqlangan','Rad etilgan'].forEach(v => { const o=document.createElement('option'); o.value=v; o.textContent = v? v : 'Barchasi'; statusSel.appendChild(o); });
    const perSel = document.createElement('select'); perSel.id='st-per'; [6,10,12].forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=`${n} / sahifa`; perSel.appendChild(o); }); perSel.value = DEFAULT_PER_PAGE;
    const csvBtn = document.createElement('button'); csvBtn.className='save-btn'; csvBtn.style.marginLeft='auto'; csvBtn.textContent='CSV export';
    wrap.appendChild(search); wrap.appendChild(statusSel); wrap.appendChild(perSel); wrap.appendChild(csvBtn);
    refs.adsContainer.parentNode.insertBefore(wrap, refs.adsContainer);
    let t = null;
    search.addEventListener('input', ()=>{ clearTimeout(t); t=setTimeout(()=>{ filters.query = search.value.trim().toLowerCase(); filters.page=1; applyFiltersRender(); }, 220); });
    statusSel.addEventListener('change', ()=>{ filters.status = statusSel.value; filters.page=1; applyFiltersRender(); });
    perSel.addEventListener('change', ()=>{ filters.perPage = Number(perSel.value); filters.page=1; applyFiltersRender(); });
    csvBtn.addEventListener('click', exportFilteredCSV);
  }

  function applyFiltersRender() {
    // produce filtered array (only profile's ads)
    let list = ads.slice().filter(a => a.userId === profile.id);
    if (filters.status) list = list.filter(a => (a.status||STATUSES.PENDING) === filters.status);
    if (filters.query) {
      const q = filters.query;
      list = list.filter(a => (`${a.title} ${a.description} ${a.from} ${a.to} ${a.price}`).toLowerCase().includes(q));
    }
    // sort newest first
    list.sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    // paginate
    const total = list.length; const per = filters.perPage || DEFAULT_PER_PAGE; const pages = Math.max(1, Math.ceil(total/per));
    if (filters.page > pages) filters.page = pages;
    const start = (filters.page - 1) * per; const pageItems = list.slice(start, start + per);
    // render subset
    renderAdsList(pageItems);
    renderPager(total, pages);
  }

  function renderPager(total, pages) {
    const existing = document.getElementById('st-pager'); if (existing) existing.remove();
    if (!refs.adsContainer) return;
    const pager = document.createElement('div'); pager.id='st-pager'; pager.style.display='flex'; pager.style.justifyContent='space-between'; pager.style.alignItems='center'; pager.style.marginTop='12px';
    const left = document.createElement('div'); left.textContent = `Jami: ${total} e'lon — sahifa ${filters.page} / ${pages}`;
    const right = document.createElement('div'); right.style.display='flex'; right.style.gap='8px';
    const prev = document.createElement('button'); prev.textContent='Oldingi'; prev.disabled = filters.page <= 1; prev.addEventListener('click', ()=>{ filters.page = Math.max(1, filters.page - 1); applyFiltersRender(); });
    const next = document.createElement('button'); next.textContent='Keyingi'; next.disabled = filters.page >= pages; next.addEventListener('click', ()=>{ filters.page = Math.min(pages, filters.page + 1); applyFiltersRender(); });
    right.appendChild(prev); right.appendChild(next); pager.appendChild(left); pager.appendChild(right); refs.adsContainer.parentNode.appendChild(pager);
  }

  function exportFilteredCSV() {
    let list = ads.slice().filter(a => a.userId === profile.id);
    if (filters.status) list = list.filter(a => (a.status||STATUSES.PENDING) === filters.status);
    if (filters.query) { const q = filters.query; list = list.filter(a => (`${a.title} ${a.description} ${a.from} ${a.to} ${a.price}`).toLowerCase().includes(q)); }
    const columns = ['id','title','from','to','price','status','createdAt','avgRating','commentsCount'];
    const rows = list.map(r => columns.map(c => {
      let v = r[c];
      if (c === 'commentsCount') v = (r.comments && r.comments.length) || 0;
      if (v === undefined || v === null) v = '';
      return `"${String(v).replace(/"/g,'""')}"`;
    }).join(','));
    const csv = `"${columns.join('","')}"\n` + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `shahartaxi-ads-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  /* ---------- Profile form handling ---------- */
  function attachProfileHandlers() {
    if (!refs.editForm) return;
    refs.editForm.addEventListener('submit', (e)=>{ e.preventDefault();
      const name = refs.editName ? refs.editName.value.trim() : ''; const phone = refs.editPhone ? refs.editPhone.value.trim() : ''; const email = refs.editEmail ? refs.editEmail.value.trim() : '';
      if (!name) return toast('Ism kiriting.'); if (phone && !/^[+]?[\d\s-]{8,15}$/.test(phone)) return toast('Telefon formati xato.'); if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast('Email formatida xato.');
      profile.name = name; profile.phone = phone; profile.email = email; saveJSON(STORAGE.PROFILE, profile); renderProfileHeader(); refs.editForm.style.display='none'; toast('Profil saqlandi.');
    });
    if (refs.editProfileBtn) refs.editProfileBtn.addEventListener('click', ()=> {
      if (!refs.editForm) return;
      if (refs.editForm.style.display === 'block') { refs.editForm.style.display='none'; return; }
      refs.editName.value = profile.name || ''; refs.editPhone.value = profile.phone || ''; refs.editEmail.value = profile.email || ''; refs.editForm.style.display='block'; refs.editForm.scrollIntoView({behavior:'smooth', block:'center'});
    });
    if (refs.logoutBtn) refs.logoutBtn.addEventListener('click', ()=> { if (confirm('Chiqish? (demo)')) window.location.reload(); });
  }

  /* ---------- Add form submit binding ---------- */
  function attachAddFormHandlers() {
    if (!refs.addForm) return;
    refs.addForm.addEventListener('submit', (e)=>{ e.preventDefault();
      const isEdit = refs.addForm.dataset.editing === 'true';
      if (isEdit) updateAdFromForm(refs.addForm.dataset.adId); else createAdFromForm();
    });
    if (refs.addAdBtn) refs.addAdBtn.addEventListener('click', ()=> {
      resetAddForm(); if (!refs.addForm) return; refs.addForm.style.display = refs.addForm.style.display === 'block' ? 'none' : 'block'; refs.addForm.scrollIntoView({behavior:'smooth', block:'center'});
    });
  }

  /* ---------- Helpers to open UI from outside (debug) ---------- */
  window._ShaharTaxi = {
    openEditAd, deleteAd, openCommentsModal, openRatePrompt, applyFiltersRender, getState: ()=>({profile,ads})
  };

  /* ---------- Bootstrap: run on DOMContentLoaded ---------- */
  function boot() {
    console.log('profile.js: booting...');
    ensureInitialData();
    // ensure selects and image input
    replaceRouteInputsWithSelects();
    setupImageInput();
    injectFilterControlsOnce();
    attachProfileHandlers();
    attachAddFormHandlers();
    renderProfileHeader();
    applyFiltersRender(); // initial render of ads with filters/pagination
    console.log('profile.js: ready. profile and ads loaded. ads count =', ads.length);
  }

  // If DOM already loaded, boot immediately; otherwise wait
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  /* ---------- If something still not working: diagnostics ----------
     Paste the output of these commands in console back to me:
     1) window._ShaharTaxi && window._ShaharTaxi.getState ? window._ShaharTaxi.getState() : null
     2) localStorage.getItem('shahartaxi_profile_v_final')
     3) localStorage.getItem('shahartaxi_ads_v_final')
     4) document.querySelectorAll('#adsContainer, #editForm, #addForm')
     Also, if you see any errors in Console (red), copy-paste them here.
  --------------------------------------------------------------- */

})();
