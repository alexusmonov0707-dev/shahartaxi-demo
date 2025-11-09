/* profile.js
   Vanilla JavaScript implementation for profile.html (ShaharTaxi).
   Part 1 of 3:
   - Firebase init
   - Auth handling (onAuthStateChanged)
   - Fetching user's ads, rendering profile header and ads list
   - Utilities, status badges, basic UI helpers

   Make sure to:
   - Replace firebaseConfig with your project's values.
   - Include this file after profile.html (script tag at bottom).
*/

/* ============================
   Firebase initialization
   ============================ */
/* NOTE: You must include Firebase SDK scripts in your HTML or serve them
   via bundler. Example CDN (put into your HTML head if not already):
   <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
   <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
   <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>
   <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-storage-compat.js"></script>
   This code uses the compat SDK surface for simpler integration with plain JS.
*/

(function () {
  'use strict';

  // ---------- CONFIG ----------
  const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  };

  // Initialize firebase app only if not already initialized
  if (!window.firebase || !firebase.apps) {
    console.error('Firebase SDK not found. Please include firebase compat SDK scripts in HTML.');
    // We don't throw to allow progressive enhancement (or testing without firebase)
  }

  try {
    if (window.firebase && firebase.apps && firebase.apps.length === 0) {
      firebase.initializeApp(firebaseConfig);
    } else if (window.firebase && !firebase.apps) {
      // older environments: try again safely
      firebase.initializeApp(firebaseConfig);
    }
  } catch (err) {
    // If already initialized, ignore
    // console.warn('Firebase init warning:', err.message);
  }

  // Shortcuts to services if available
  const auth = (window.firebase && firebase.auth && firebase.auth()) || null;
  const db = (window.firebase && firebase.firestore && firebase.firestore()) || null;
  const storage = (window.firebase && firebase.storage && firebase.storage()) || null;

  // ---------- DOM references ----------
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

  // Add ad fields
  const fromEl = document.getElementById('from');
  const toEl = document.getElementById('to');
  const priceEl = document.getElementById('price');
  const descEl = document.getElementById('desc');

  // State
  let currentUser = null;
  let userProfile = null; // will hold profile doc if you store profiles
  let myAds = []; // array of ad objects retrieved from Firestore

  // UI constants for statuses
  const STATUS = {
    PENDING: 'Kutilyapti',
    APPROVED: 'Tasdiqlangan',
    REJECTED: 'Rad etilgan'
  };

  // Small utility functions
  function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    Object.keys(attrs).forEach((k) => {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    (children || []).forEach((c) => {
      if (typeof c === 'string') e.appendChild(document.createTextNode(c));
      else if (c instanceof Node) e.appendChild(c);
    });
    return e;
  }

  function safeText(txt) {
    return (txt === undefined || txt === null) ? '' : String(txt);
  }

  function formatCurrency(v) {
    if (v === undefined || v === null || v === '') return '—';
    const n = Number(v);
    if (isNaN(n)) return safeText(v);
    return n.toLocaleString('uz-UZ') + ' so\'m';
  }

  function formatDate(ts) {
    if (!ts) return '';
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleString();
    } catch (err) {
      return String(ts);
    }
  }

  // Render status badge (returns element)
  function renderStatusBadge(status) {
    const span = el('span', { class: 'ad-status' });
    span.textContent = status || STATUS.PENDING;
    span.classList.add('ad-status');
    if (status === STATUS.APPROVED) {
      span.classList.add('status-approved');
    } else if (status === STATUS.REJECTED) {
      span.classList.add('status-rejected');
    } else {
      span.classList.add('status-pending');
    }
    return span;
  }

  // Phone validator (simple)
  function isValidPhone(phone) {
    if (!phone) return false;
    // allow digits, optional + at start; typical Uzbekistan numbers 9-13 digits
    const cleaned = String(phone).replace(/\s+/g, '');
    return /^[+]?\\d{8,15}$/.test(cleaned);
  }

  // Basic star rendering for average rating
  function renderStars(avg) {
    const container = document.createElement('div');
    container.style.display = 'inline-block';
    container.style.verticalAlign = 'middle';
    container.setAttribute('aria-hidden', 'true');
    const full = Math.floor(avg);
    const half = avg - full >= 0.5;
    for (let i = 1; i <= 5; i++) {
      const span = document.createElement('span');
      span.style.marginRight = '3px';
      span.style.fontSize = '18px';
      if (i <= full) {
        span.textContent = '★';
        span.style.color = 'gold';
      } else if (i === full + 1 && half) {
        span.textContent = '★';
        span.style.color = 'gold';
        // we won't do partial glyphs; half-star not implemented in plain text
      } else {
        span.textContent = '☆';
        span.style.color = '#ccc';
      }
      container.appendChild(span);
    }
    return container;
  }

  // ---------- Auth handling ----------
  function requireAuthAndInit() {
    if (!auth) {
      // If firebase not configured, show placeholder UI
      profileNameEl.textContent = 'Foydalanuvchi (offline)';
      profilePhoneEl.textContent = 'Telefon: —';
      profileEmailEl.textContent = 'Email: —';
      starContainerEl.innerHTML = '';
      avgRatingEl.textContent = '(0.0)';
      // Allow local mocked demo mode (optional)
      console.warn('Firebase Auth not available; running in demo mode.');
      // still attach UI handlers so dev can test
      attachUiHandlers();
      return;
    }

    auth.onAuthStateChanged((u) => {
      if (!u) {
        // redirect to login page if needed (assumes /login)
        // If you don't want redirect, you can show login prompt instead.
        window.location.href = '/login';
        return;
      }
      currentUser = u;
      // Set basic header info
      profileNameEl.textContent = u.displayName || u.email || 'Foydalanuvchi';
      profilePhoneEl.textContent = 'Telefon: ' + (u.phoneNumber || '—');
      profileEmailEl.textContent = 'Email: ' + (u.email || '—');

      // Load profile document if you store additional info
      loadUserProfile(u.uid).then(() => {
        // load ads after profile
        fetchUserAds(u.uid);
      });

      // attach UI handlers (if not already)
      attachUiHandlers();
    });
  }

  // Optional: load user profile stored in Firestore (collection 'users')
  async function loadUserProfile(uid) {
    if (!db) return;
    try {
      const userDoc = await db.collection('users').doc(uid).get();
      if (userDoc.exists) {
        userProfile = userDoc.data();
        // override displayed name/phone/email if profile contains them
        if (userProfile.name) profileNameEl.textContent = userProfile.name;
        if (userProfile.phone) profilePhoneEl.textContent = 'Telefon: ' + userProfile.phone;
        if (userProfile.email) profileEmailEl.textContent = 'Email: ' + userProfile.email;
        // render rating if exists
        if (typeof userProfile.avgRating === 'number') {
          starContainerEl.innerHTML = '';
          starContainerEl.appendChild(renderStars(userProfile.avgRating));
          avgRatingEl.textContent = `(${userProfile.avgRating.toFixed(1)})`;
        }
      }
    } catch (err) {
      console.error('loadUserProfile error:', err);
    }
  }

  // ---------- Fetch user's ads ----------
  async function fetchUserAds(uid) {
    if (!db) {
      // demo fallback: render empty state
      myAds = [];
      renderAds();
      return;
    }
    try {
      // Query: collection 'ads' where userId == uid, order by createdAt desc
      const qSnap = await db.collection('ads')
        .where('userId', '==', uid)
        .orderBy('createdAt', 'desc')
        .get();

      const items = [];
      qSnap.forEach((doc) => {
        const data = doc.data();
        data.id = doc.id;
        items.push(data);
      });
      myAds = items;
      renderAds();
    } catch (err) {
      console.error('fetchUserAds error:', err);
      // fallback: empty
      myAds = [];
      renderAds();
    }
  }

  // ---------- Render ads list ----------
  function clearAds() {
    while (adsContainerEl.firstChild) adsContainerEl.removeChild(adsContainerEl.firstChild);
  }

  function renderAds() {
    clearAds();

    if (!myAds || myAds.length === 0) {
      const empty = el('div', { class: 'ad-card' }, [
        el('p', { text: 'Sizda hali e’lonlar yo‘q.' })
      ]);
      adsContainerEl.appendChild(empty);
      return;
    }

    myAds.forEach((ad) => {
      const card = el('div', { class: 'ad-card', 'data-id': ad.id });

      // header with title + status
      const adHeader = el('div', { class: 'ad-header' });
      const title = el('h4', { text: ad.title || 'E\'lon' });
      const statusBadge = renderStatusBadge(ad.status || STATUS.PENDING);
      adHeader.appendChild(title);
      adHeader.appendChild(statusBadge);

      // body
      const adBody = el('div', { class: 'ad-body' });
      // route line
      const route = el('p', { html: `<strong>Marshrut:</strong> ${safeText(ad.from || ad.origin || '')} → ${safeText(ad.to || ad.destination || '')}` });
      // price
      const price = el('p', { html: `<strong>Narx:</strong> ${formatCurrency(ad.price)}` });
      // description
      const desc = el('p', { html: `<strong>Izoh:</strong> ${safeText(ad.description || '')}` });
      // created date
      const created = ad.createdAt ? formatDate(ad.createdAt) : '';
      const createdLine = el('p', { html: `<small>Joylangan: ${created}</small>` });

      adBody.appendChild(route);
      adBody.appendChild(price);
      adBody.appendChild(desc);
      adBody.appendChild(createdLine);

      // actions
      const actions = el('div', { class: 'ad-actions' });

      const editBtn = el('button', { class: 'edit-btn' , text: 'Tahrirlash' });
      editBtn.addEventListener('click', () => openEditAd(ad));

      const deleteBtn = el('button', { class: 'delete-btn', text: 'O\'chirish' });
      deleteBtn.addEventListener('click', () => confirmDeleteAd(ad));

      // rating summary if exists
      const ratingWrap = el('div', { class: 'rating-section' });
      if (ad.avgRating) {
        ratingWrap.appendChild(el('span', { text: 'Bahosi: ' + Number(ad.avgRating).toFixed(1) }));
      }

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
      actions.appendChild(ratingWrap);

      // comments preview if exists (show last 2)
      if (Array.isArray(ad.comments) && ad.comments.length > 0) {
        const commentSection = el('div', { class: 'comment-box' });
        const titleC = el('div', { html: '<strong>Izohlar:</strong>' });
        commentSection.appendChild(titleC);
        const previewCount = Math.min(2, ad.comments.length);
        for (let i = 0; i < previewCount; i++) {
          const c = ad.comments[i];
          const cEl = el('div', { html: `<small><strong>${safeText(c.author || 'Anonim')}:</strong> ${safeText(c.text)}</small>` });
          commentSection.appendChild(cEl);
        }
        // button to show full comments - optional
        const showAll = el('button', { class: 'edit-btn', text: 'Barcha izohlar' });
        showAll.addEventListener('click', () => openCommentsModal(ad));
        commentSection.appendChild(showAll);
        adBody.appendChild(commentSection);
      }

      card.appendChild(adHeader);
      card.appendChild(adBody);
      card.appendChild(actions);

      adsContainerEl.appendChild(card);
    });
  }

  // ---------- UI actions (open edit, delete confirm, comments modal) ----------
  function openEditAd(ad) {
    // populate add/edit form with ad values and show tahrirlash UI
    // We reuse addFormEl for simplicity but show/hide depending on mode
    // Set a data attribute to indicate edit mode
    addFormEl.dataset.editing = 'true';
    addFormEl.dataset.adId = ad.id;
    addFormEl.querySelector('h3').textContent = 'E\'lonni tahrirlash';
    fromEl.value = ad.from || ad.origin || '';
    toEl.value = ad.to || ad.destination || '';
    priceEl.value = ad.price || '';
    descEl.value = ad.description || '';
    // reveal form
    addFormEl.style.display = 'block';
    // scroll into view
    addFormEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function confirmDeleteAd(ad) {
    // Simple confirm; for better UX replace with custom modal
    const ok = window.confirm('E\\'lonni o\\'chirmoqchimisiz? Bu amal qaytarilmaydi.');
    if (!ok) return;
    deleteAd(ad.id);
  }

  async function deleteAd(adId) {
    if (!db) {
      // offline/demo: remove locally
      myAds = myAds.filter((a) => a.id !== adId);
      renderAds();
      return;
    }
    try {
      await db.collection('ads').doc(adId).delete();
      myAds = myAds.filter((a) => a.id !== adId);
      renderAds();
    } catch (err) {
      console.error('deleteAd error:', err);
      alert('E\'lonni o\'chirishda xatolik yuz berdi.');
    }
  }

  function openCommentsModal(ad) {
    // Minimal comments modal using prompt for posting new comment,
    // and alert for listing all comments. Replace with better UI if needed.
    const list = (ad.comments || []).map((c) => `${c.author || 'Anonim'}: ${c.text}`).join('\\n\\n');
    const action = window.prompt('Izohlar:\\n\\n' + (list || '(Hali izoh yo\\'q)') + '\\n\\nYangi izoh yozish uchun matn kiriting (bekor qilish uchun Cancel).', '');
    if (action && action.trim()) {
      postComment(ad.id, action.trim());
    }
  }

  async function postComment(adId, text) {
    if (!db || !currentUser) {
      alert('Izoh yuborish uchun tizimga kirishingiz kerak.');
      return;
    }
    try {
      const comment = {
        authorId: currentUser.uid,
        author: currentUser.displayName || currentUser.email || 'Foydalanuvchi',
        text: text,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      // Two strategies: push to ad.comments array or have 'comments' subcollection
      // Here we update ad doc with arrayUnion for simplicity
      await db.collection('ads').doc(adId).update({
        comments: firebase.firestore.FieldValue.arrayUnion(comment)
      });
      // Update local cache optimistically
      myAds = myAds.map((a) => {
        if (a.id === adId) {
          const arr = a.comments ? a.comments.slice() : [];
          arr.unshift(comment); // push to front
          return Object.assign({}, a, { comments: arr });
        }
        return a;
      });
      renderAds();
    } catch (err) {
      console.error('postComment error:', err);
      alert('Izoh yuborishda xatolik yuz berdi.');
    }
  }

  // ---------- Form handlers (edit profile & add/edit ad) ----------
  function attachUiHandlers() {
    // avoid attaching multiple times
    if (attachUiHandlers.attached) return;
    attachUiHandlers.attached = true;

    if (editProfileBtn) {
      editProfileBtn.addEventListener('click', () => {
        // toggle edit form
        if (editFormEl.style.display === 'block') {
          editFormEl.style.display = 'none';
        } else {
          // prefill with current displayed values
          editNameEl.value = userProfile && userProfile.name ? userProfile.name : (currentUser ? (currentUser.displayName || '') : '');
          editPhoneEl.value = userProfile && userProfile.phone ? userProfile.phone : (currentUser ? (currentUser.phoneNumber || '') : '');
          editEmailEl.value = userProfile && userProfile.email ? userProfile.email : (currentUser ? (currentUser.email || '') : '');
          editFormEl.style.display = 'block';
          editFormEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (!auth) {
          // demo fallback
          window.location.href = '/login';
          return;
        }
        auth.signOut().then(() => {
          window.location.href = '/login';
        }).catch((err) => {
          console.error('Sign out error:', err);
          alert('Chiqishda xatolik yuz berdi.');
        });
      });
    }

    if (editFormEl) {
      editFormEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleProfileSave();
      });
    }

    if (addAdBtn) {
      addAdBtn.addEventListener('click', () => {
        // open add form (clear fields)
        addFormEl.style.display = 'block';
        addFormEl.removeAttribute('data-editing');
        addFormEl.removeAttribute('data-ad-id');
        addFormEl.querySelector('h3').textContent = 'Yangi e\\'lon joylash';
        fromEl.value = '';
        toEl.value = '';
        priceEl.value = '';
        descEl.value = '';
        addFormEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }

    if (addFormEl) {
      addFormEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        // if addFormEl.dataset.editing is set -> update existing ad
        const isEdit = addFormEl.dataset.editing === 'true';
        if (isEdit) {
          const adId = addFormEl.dataset.adId;
          await handleAdUpdate(adId);
        } else {
          await handleAdCreate();
        }
      });
    }

    // basic input masking for phone in edit form
    if (editPhoneEl) {
      editPhoneEl.addEventListener('input', (e) => {
        // allow digits, +, spaces, dashes; normalize to trimmed form
        const v = e.target.value.replace(/[^\d+\\s-]/g, '');
        e.target.value = v;
      });
    }

    // price input: allow numbers and optional decimal/comma
    if (priceEl) {
      priceEl.addEventListener('input', (e) => {
        const v = e.target.value.replace(/[^0-9.,]/g, '');
        e.target.value = v;
      });
    }
  }

  // ---------- Profile save handler ----------
  async function handleProfileSave() {
    const newName = editNameEl.value.trim();
    const newPhone = editPhoneEl.value.trim();
    const newEmail = editEmailEl.value.trim();

    if (!newName) {
      alert('Ism maydoni bo\'sh bo\'lishi mumkin emas.');
      return;
    }
    if (!isValidPhone(newPhone)) {
      alert('Iltimos, to\'g\'ri telefon raqam kiriting.');
      return;
    }
    if (!newEmail || !/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(newEmail)) {
      alert('Iltimos, to\'g\'ri email manzil kiriting.');
      return;
    }

    // Update Firebase Auth profile (displayName, email) and optional users collection
    try {
      if (auth && currentUser) {
        // update display name and email via Auth API
        const promises = [];
        if (currentUser.updateProfile) {
          promises.push(currentUser.updateProfile({ displayName: newName }));
        }
        // email update may require recent login - handle errors gracefully
        if (currentUser.email !== newEmail && currentUser.updateEmail) {
          promises.push(currentUser.updateEmail(newEmail));
        }
        await Promise.all(promises);
      }

      // Update Firestore 'users' doc for additional fields
      if (db && currentUser) {
        await db.collection('users').doc(currentUser.uid).set({
          name: newName,
          phone: newPhone,
          email: newEmail,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }

      // update local display
      profileNameEl.textContent = newName;
      profilePhoneEl.textContent = 'Telefon: ' + newPhone;
      profileEmailEl.textContent = 'Email: ' + newEmail;
      editFormEl.style.display = 'none';
      alert('Profil ma\'lumotlari saqlandi.');
    } catch (err) {
      console.error('handleProfileSave error:', err);
      // Error handling for reauth requirement for email update
      if (err && err.code === 'auth/requires-recent-login') {
        alert('Emailni yangilash uchun qayta kirish (reauth) talab qilinadi. Iltimos, qayta tizimga kiring va yana urinib ko\'ring.');
      } else {
        alert('Profilni saqlashda xatolik yuz berdi.');
      }
    }
  }

  // ---------- Create new ad ----------
  async function handleAdCreate() {
    const fromVal = fromEl.value.trim();
    const toVal = toEl.value.trim();
    const priceVal = priceEl.value.trim();
    const descVal = descEl.value.trim();

    if (!fromVal || !toVal) {
      alert('Iltimos, qayerdan va qayerga maydonlarini to\'ldiring.');
      return;
    }
    if (!priceVal || isNaN(Number(priceVal))) {
      alert('Iltimos, to\'g\'ri narx kiriting.');
      return;
    }
    if (!currentUser) {
      alert('E\'lon joylash uchun tizimga kirishingiz kerak.');
      return;
    }

    const newAd = {
      title: `${fromVal} → ${toVal}`,
      from: fromVal,
      to: toVal,
      price: Number(priceVal),
      description: descVal || '',
      userId: currentUser.uid,
      userEmail: currentUser.email || '',
      status: STATUS.PENDING,
      createdAt: firebase ? firebase.firestore.FieldValue.serverTimestamp() : new Date(),
      comments: [],
      avgRating: 0
    };

    if (!db) {
      // offline/demo: append locally and re-render
      newAd.id = 'local-' + Date.now();
      myAds.unshift(newAd);
      renderAds();
      addFormEl.style.display = 'none';
      alert('E\'lon lokal ravishda saqlandi (demo).');
      return;
    }

    try {
      const docRef = await db.collection('ads').add(newAd);
      newAd.id = docRef.id;
      myAds.unshift(newAd);
      renderAds();
      addFormEl.style.display = 'none';
      alert('E\'lon muvaffaqiyatli joylandi. Administratsiya tez orada ko\'rib chiqadi.');
    } catch (err) {
      console.error('handleAdCreate error:', err);
      alert('E\'lonni yaratishda xatolik yuz berdi.');
    }
  }

  // ---------- Update existing ad ----------
  async function handleAdUpdate(adId) {
    const fromVal = fromEl.value.trim();
    const toVal = toEl.value.trim();
    const priceVal = priceEl.value.trim();
    const descVal = descEl.value.trim();

    if (!fromVal || !toVal) {
      alert('Iltimos, qayerdan va qayerga maydonlarini to\'ldiring.');
      return;
    }
    if (!priceVal || isNaN(Number(priceVal))) {
      alert('Iltimos, to\'g\'ri narx kiriting.');
      return;
    }

    if (!db) {
      // offline/demo update
      myAds = myAds.map((a) => {
        if (a.id === adId) {
          return Object.assign({}, a, {
            from: fromVal,
            to: toVal,
            price: Number(priceVal),
            description: descVal,
            title: `${fromVal} → ${toVal}`,
            updatedAt: new Date()
          });
        }
        return a;
      });
      renderAds();
      addFormEl.style.display = 'none';
      alert('E\'lon lokal ravishda yangilandi (demo).');
      return;
    }

    try {
      const updateData = {
        from: fromVal,
        to: toVal,
        price: Number(priceVal),
        description: descVal,
        title: `${fromVal} → ${toVal}`,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await db.collection('ads').doc(adId).update(updateData);
      myAds = myAds.map((a) => (a.id === adId ? Object.assign({}, a, updateData) : a));
      renderAds();
      addFormEl.style.display = 'none';
      alert('E\'lon yangilandi.');
    } catch (err) {
      console.error('handleAdUpdate error:', err);
      alert('E\'lonni yangilashda xatolik yuz berdi.');
    }
  }

  // Initialize app (auth and UI)
  requireAuthAndInit();

  // Expose a debug API to console for dev convenience
  window._ShaharTaxiProfile = {
    fetchUserAds,
    renderAds,
    getState: () => ({ currentUser, userProfile, myAds })
  };

  // End of Part 1
})();
/* profile.js
   Part 2 of 3:
   - Filtering/search UI
   - Pagination
   - Rating (baholash) funksiyalari
   - Izoh modalini yaxshilash
   - UX/optimizations

   This file expects Part1 to have run already and exposed:
     window._ShaharTaxiProfile.fetchUserAds
     window._ShaharTaxiProfile.renderAds
     window._ShaharTaxiProfile.getState
*/

(function () {
  'use strict';

  // Helpers to access global state & firebase
  const API = window._ShaharTaxiProfile || {};
  function getState() {
    if (API.getState) return API.getState();
    return { currentUser: null, userProfile: null, myAds: [] };
  }

  // Shortcut to DOM nodes created in Part1
  const adsContainerEl = document.getElementById('adsContainer');
  const addFormEl = document.getElementById('addForm');
  const editFormEl = document.getElementById('editForm');

  // Create filter bar above ads list (inserting into DOM)
  function createFilterBar() {
    // if already added, skip
    if (document.getElementById('filterBarWrap')) return;

    const wrap = document.createElement('div');
    wrap.id = 'filterBarWrap';
    wrap.style.display = 'flex';
    wrap.style.flexWrap = 'wrap';
    wrap.style.gap = '8px';
    wrap.style.marginBottom = '12px';

    // Search input
    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.placeholder = 'Qidiruv: sarlavha, shahar, narx...';
    searchInput.id = 'adsSearchInput';
    searchInput.style.padding = '8px';
    searchInput.style.borderRadius = '8px';
    searchInput.style.border = '1px solid #ccc';
    searchInput.style.minWidth = '200px';

    // Status select
    const statusSelect = document.createElement('select');
    statusSelect.id = 'adsStatusFilter';
    statusSelect.style.padding = '8px';
    statusSelect.style.borderRadius = '8px';
    statusSelect.style.border = '1px solid #ccc';
    const optAll = document.createElement('option'); optAll.value = ''; optAll.textContent = 'Barchasi'; statusSelect.appendChild(optAll);
    const optPending = document.createElement('option'); optPending.value = 'Kutilyapti'; optPending.textContent = 'Kutilyapti'; statusSelect.appendChild(optPending);
    const optApproved = document.createElement('option'); optApproved.value = 'Tasdiqlangan'; optApproved.textContent = 'Tasdiqlangan'; statusSelect.appendChild(optApproved);
    const optRejected = document.createElement('option'); optRejected.value = 'Rad etilgan'; optRejected.textContent = 'Rad etilgan'; statusSelect.appendChild(optRejected);

    // Per-page select
    const perPageSelect = document.createElement('select');
    perPageSelect.id = 'adsPerPage';
    perPageSelect.style.padding = '8px';
    perPageSelect.style.borderRadius = '8px';
    perPageSelect.style.border = '1px solid #ccc';
    [6, 10, 12, 20].forEach((n) => {
      const o = document.createElement('option'); o.value = String(n); o.textContent = `${n} / sahifa`; perPageSelect.appendChild(o);
    });
    perPageSelect.value = '12';

    // Add to wrap
    wrap.appendChild(searchInput);
    wrap.appendChild(statusSelect);
    wrap.appendChild(perPageSelect);

    // Insert before adsContainerEl
    adsContainerEl.parentNode.insertBefore(wrap, adsContainerEl);

    // Event listeners
    let filterTimer = null;
    searchInput.addEventListener('input', () => {
      clearTimeout(filterTimer);
      filterTimer = setTimeout(applyFilters, 250);
    });
    statusSelect.addEventListener('change', applyFilters);
    perPageSelect.addEventListener('change', () => {
      state.perPage = Number(perPageSelect.value);
      state.page = 1;
      applyFilters();
    });
  }

  // Pagination & filter state (client-side)
  const state = {
    page: 1,
    perPage: 12,
    query: '',
    status: '',
    filteredAds: [],
  };

  // Apply client-side filters to current ads (from getState())
  function applyFilters() {
    const s = document.getElementById('adsSearchInput');
    const st = document.getElementById('adsStatusFilter');
    const per = document.getElementById('adsPerPage');
    state.query = s ? s.value.trim().toLowerCase() : '';
    state.status = st ? st.value : '';
    state.perPage = per ? Number(per.value) : state.perPage;

    const stt = getState();
    let items = (stt.myAds || []).slice();

    // status filter
    if (state.status) {
      items = items.filter((a) => (a.status || '').toString() === state.status);
    }

    // search filter
    if (state.query) {
      items = items.filter((a) => {
        const haystack = `${a.title || ''} ${a.description || ''} ${a.from || ''} ${a.to || ''} ${a.city || ''} ${a.region || ''} ${a.price || ''}`.toLowerCase();
        return haystack.indexOf(state.query) !== -1;
      });
    }

    // sort by createdAt desc if available
    items.sort((x, y) => {
      const a = x.createdAt && x.createdAt.seconds ? x.createdAt.seconds : (x.createdAt ? new Date(x.createdAt).getTime() : 0);
      const b = y.createdAt && y.createdAt.seconds ? y.createdAt.seconds : (y.createdAt ? new Date(y.createdAt).getTime() : 0);
      return b - a;
    });

    state.filteredAds = items;
    state.page = Math.min(state.page, Math.max(1, Math.ceil(items.length / state.perPage)));
    renderFilteredAdsPage();
  }

  // Render the page of filteredAds into adsContainerEl
  function renderFilteredAdsPage() {
    // clear container
    while (adsContainerEl.firstChild) adsContainerEl.removeChild(adsContainerEl.firstChild);

    const items = state.filteredAds || [];
    if (!items || items.length === 0) {
      const emp = document.createElement('div');
      emp.className = 'ad-card';
      emp.textContent = 'Sizga mos e\'lon topilmadi.';
      adsContainerEl.appendChild(emp);
      renderPaginationControls();
      return;
    }

    const start = (state.page - 1) * state.perPage;
    const pageItems = items.slice(start, start + state.perPage);

    pageItems.forEach((ad) => {
      const card = document.createElement('div');
      card.className = 'ad-card';
      card.setAttribute('data-id', ad.id);

      // header
      const header = document.createElement('div');
      header.className = 'ad-header';
      const h4 = document.createElement('h4'); h4.textContent = ad.title || 'E\'lon';
      header.appendChild(h4);
      header.appendChild(renderStatusSpan(ad.status || 'Kutilyapti'));
      card.appendChild(header);

      // body
      const body = document.createElement('div'); body.className = 'ad-body';
      const route = document.createElement('p'); route.innerHTML = `<strong>Marshrut:</strong> ${safeText(ad.from || '')} → ${safeText(ad.to || '')}`;
      const price = document.createElement('p'); price.innerHTML = `<strong>Narx:</strong> ${formatCurrency(ad.price)}`;
      const desc = document.createElement('p'); desc.innerHTML = `<strong>Izoh:</strong> ${safeText(ad.description || '')}`;
      body.appendChild(route); body.appendChild(price); body.appendChild(desc);

      // rating & actions row
      const actions = document.createElement('div'); actions.className = 'ad-actions';
      // Edit button (only if current user is owner)
      const stt = getState();
      if (stt.currentUser && ad.userId === stt.currentUser.uid) {
        const editBtn = document.createElement('button'); editBtn.className = 'edit-btn'; editBtn.textContent = 'Tahrirlash';
        editBtn.addEventListener('click', () => {
          // reuse openEditAd from Part1: we call the button click handler from original rendering if exists
          // but since we replaced original DOM, call the global API to open edit: we will mimic a click by populating form
          // Reuse Part1's openEditAd if exposed? Not exposed; so we just populate addForm as edit mode
          addFormEl.dataset.editing = 'true';
          addFormEl.dataset.adId = ad.id;
          addFormEl.querySelector('h3').textContent = 'E\'lonni tahrirlash';
          document.getElementById('from').value = ad.from || '';
          document.getElementById('to').value = ad.to || '';
          document.getElementById('price').value = ad.price || '';
          document.getElementById('desc').value = ad.description || '';
          addFormEl.style.display = 'block';
          addFormEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        actions.appendChild(editBtn);

        const delBtn = document.createElement('button'); delBtn.className = 'delete-btn'; delBtn.textContent = 'O\'chirish';
        delBtn.addEventListener('click', () => {
          if (!confirm('E\'lonni o\'chirmoqchimisiz?')) return;
          // Call delete via firebase directly
          if (window.firebase && firebase.firestore) {
            firebase.firestore().collection('ads').doc(ad.id).delete().then(() => {
              // refresh list
              API.fetchUserAds && API.fetchUserAds(stt.currentUser.uid);
            }).catch((err) => { console.error(err); alert('O\'chirishda xatolik yuz berdi.'); });
          } else {
            // update local state and reapply filters
            const s = getState();
            s.myAds = (s.myAds || []).filter((a) => a.id !== ad.id);
            state.filteredAds = (state.filteredAds || []).filter((a) => a.id !== ad.id);
            applyFilters();
          }
        });
        actions.appendChild(delBtn);
      }

      // Rate button (if user is not the owner)
      const st = getState();
      if (st.currentUser && ad.userId !== st.currentUser.uid) {
        const rateBtn = document.createElement('button'); rateBtn.className = 'edit-btn'; rateBtn.textContent = 'Baholash';
        rateBtn.addEventListener('click', () => rateAdPrompt(ad));
        actions.appendChild(rateBtn);
      }

      // Comments button
      const cBtn = document.createElement('button'); cBtn.className = 'edit-btn'; cBtn.textContent = 'Izoh yozish';
      cBtn.addEventListener('click', () => openCommentsModalImproved(ad));
      actions.appendChild(cBtn);

      card.appendChild(body);
      card.appendChild(actions);

      adsContainerEl.appendChild(card);
    });

    renderPaginationControls();
  }

  // Small helper to render status span (used in filtered render)
  function renderStatusSpan(status) {
    const span = document.createElement('span');
    span.className = 'ad-status';
    span.textContent = status || 'Kutilyapti';
    if (status === 'Tasdiqlangan') {
      span.classList.add('status-approved');
    } else if (status === 'Rad etilgan') {
      span.classList.add('status-rejected');
    } else {
      span.classList.add('status-pending');
    }
    return span;
  }

  // Render pagination controls below adsContainerEl
  function renderPaginationControls() {
    // remove existing pager
    const existing = document.getElementById('adsPager');
    if (existing) existing.remove();

    const pager = document.createElement('div');
    pager.id = 'adsPager';
    pager.style.display = 'flex';
    pager.style.justifyContent = 'space-between';
    pager.style.alignItems = 'center';
    pager.style.marginTop = '12px';

    const total = state.filteredAds.length || 0;
    const totalPages = Math.max(1, Math.ceil(total / state.perPage));
    const left = document.createElement('div');
    left.textContent = `Jami: ${total} e'lon — sahifa ${state.page} / ${totalPages}`;

    const right = document.createElement('div');
    right.style.display = 'flex';
    right.style.gap = '8px';

    const prevBtn = document.createElement('button'); prevBtn.textContent = 'Oldingi'; prevBtn.style.padding = '6px 10px';
    prevBtn.disabled = state.page <= 1;
    prevBtn.addEventListener('click', () => { state.page = Math.max(1, state.page - 1); renderFilteredAdsPage(); });

    const nextBtn = document.createElement('button'); nextBtn.textContent = 'Keyingi'; nextBtn.style.padding = '6px 10px';
    nextBtn.disabled = state.page >= totalPages;
    nextBtn.addEventListener('click', () => { state.page = Math.min(totalPages, state.page + 1); renderFilteredAdsPage(); });

    right.appendChild(prevBtn); right.appendChild(nextBtn);
    pager.appendChild(left); pager.appendChild(right);
    adsContainerEl.parentNode.appendChild(pager);
  }

  // Rating flow: prompt user and store rating in Firestore (or local)
  async function rateAdPrompt(ad) {
    const st = getState();
    if (!st.currentUser) {
      alert('Baholash uchun tizimga kiring.');
      return;
    }
    const scoreStr = prompt('1dan 5.gacha baho bering (raqam):', '5');
    if (!scoreStr) return;
    const score = Number(scoreStr);
    if (!score || score < 1 || score > 5) {
      alert('Iltimos 1-5 oralig‘ida qiymat kiriting.');
      return;
    }
    try {
      if (window.firebase && firebase.firestore) {
        const comment = {
          raterId: st.currentUser.uid,
          score: score,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        // strategy: maintain ratings array (arrayUnion) and compute avg on server or client
        const adRef = firebase.firestore().collection('ads').doc(ad.id);
        await adRef.update({
          ratings: firebase.firestore.FieldValue.arrayUnion(comment)
        });
        // After update, recompute avgRating from server snapshot (safer)
        const snap = await adRef.get();
        if (snap.exists) {
          const data = snap.data();
          const ratings = data.ratings || [];
          const avg = (ratings.reduce((s, r) => s + (r.score || 0), 0)) / (ratings.length || 1);
          await adRef.update({ avgRating: avg });
        }
        // refresh list
        API.fetchUserAds && API.fetchUserAds(st.currentUser.uid);
        alert('Rahmat! Sizning bahongiz qabul qilindi.');
      } else {
        // demo offline: update local object
        const s = getState();
        s.myAds = (s.myAds || []).map((a) => {
          if (a.id === ad.id) {
            const arr = a.ratings ? a.ratings.slice() : [];
            arr.push({ raterId: st.currentUser.uid, score: score, createdAt: new Date() });
            const avg = arr.reduce((s2, r) => s2 + (r.score || 0), 0) / arr.length;
            return Object.assign({}, a, { ratings: arr, avgRating: avg });
          }
          return a;
        });
        applyFilters();
        alert('Baho lokal ravishda saqlandi (demo).');
      }
    } catch (err) {
      console.error('rateAd error:', err);
      alert('Baholashda xatolik yuz berdi.');
    }
  }

  // Improved comments modal: list all comments and allow posting
  function openCommentsModalImproved(ad) {
    // Build a simple modal using native elements
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.left = '0'; overlay.style.top = '0';
    overlay.style.right = '0'; overlay.style.bottom = '0';
    overlay.style.background = 'rgba(0,0,0,0.4)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999';

    const modal = document.createElement('div');
    modal.style.width = '90%';
    modal.style.maxWidth = '720px';
    modal.style.background = '#fff';
    modal.style.borderRadius = '12px';
    modal.style.padding = '16px';
    modal.style.maxHeight = '80vh';
    modal.style.overflow = 'auto';

    const title = document.createElement('h3'); title.textContent = 'Izohlar';
    modal.appendChild(title);

    const list = document.createElement('div'); list.style.marginTop = '10px';
    const comments = ad.comments ? ad.comments.slice() : [];
    if (comments.length === 0) {
      const none = document.createElement('div'); none.textContent = 'Hali izohlar yo‘q.';
      list.appendChild(none);
    } else {
      comments.forEach((c) => {
        const row = document.createElement('div'); row.style.borderBottom = '1px solid #eee'; row.style.padding = '8px 0';
        const who = document.createElement('div'); who.innerHTML = `<strong>${safeText(c.author || c.authorId || 'Anonim')}</strong> <small style="color:#666"> — ${formatDate(c.createdAt)}</small>`;
        const text = document.createElement('div'); text.style.marginTop = '6px'; text.textContent = c.text || '';
        row.appendChild(who); row.appendChild(text);
        list.appendChild(row);
      });
    }
    modal.appendChild(list);

    // New comment form
    const box = document.createElement('div'); box.style.marginTop = '12px';
    const ta = document.createElement('textarea'); ta.style.width = '100%'; ta.style.minHeight = '80px'; ta.placeholder = 'Yangi izoh yozing...';
    const btnRow = document.createElement('div'); btnRow.style.display = 'flex'; btnRow.style.justifyContent = 'flex-end'; btnRow.style.gap = '8px'; btnRow.style.marginTop = '8px';
    const cancelBtn = document.createElement('button'); cancelBtn.className = 'cancel-btn'; cancelBtn.textContent = 'Bekor qilish';
    const postBtn = document.createElement('button'); postBtn.className = 'save-btn'; postBtn.textContent = 'Yuborish';
    btnRow.appendChild(cancelBtn); btnRow.appendChild(postBtn);
    box.appendChild(ta); box.appendChild(btnRow);
    modal.appendChild(box);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    cancelBtn.addEventListener('click', () => document.body.removeChild(overlay));
    postBtn.addEventListener('click', async () => {
      const text = ta.value.trim();
      if (!text) { alert('Iltimos, izoh yozing.'); return; }
      // Use postComment from Part1 if available for consistent behavior
      if (API.postComment) {
        try {
          await API.postComment(ad.id, text);
        } catch (err) {
          console.error(err);
          alert('Izoh yuborishda xatolik yuz berdi.');
          return;
        }
      } else {
        // fallback: direct write
        const st = getState();
        if (!st.currentUser) { alert('Izoh yozish uchun tizimga kiring.'); return; }
        if (window.firebase && firebase.firestore) {
          const comment = {
            authorId: st.currentUser.uid,
            author: st.currentUser.displayName || st.currentUser.email || 'Foydalanuvchi',
            text: text,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          };
          try {
            await firebase.firestore().collection('ads').doc(ad.id).update({
              comments: firebase.firestore.FieldValue.arrayUnion(comment)
            });
            // refresh
            API.fetchUserAds && API.fetchUserAds(st.currentUser.uid);
            alert('Izoh yuborildi.');
            document.body.removeChild(overlay);
          } catch (err) {
            console.error(err); alert('Izoh yuborishda xatolik yuz berdi.');
          }
        } else {
          // local fallback
          const stt = getState();
          stt.myAds = (stt.myAds || []).map((a) => {
            if (a.id === ad.id) {
              const arr = a.comments ? a.comments.slice() : [];
              arr.unshift({ authorId: stt.currentUser.uid, author: stt.currentUser.displayName || stt.currentUser.email || 'Foydalanuvchi', text: text, createdAt: new Date() });
              return Object.assign({}, a, { comments: arr });
            }
            return a;
          });
          applyFilters();
          alert('Izoh lokal tarzda saqlandi (demo).');
          document.body.removeChild(overlay);
        }
      }
    });
  }

  // Wire up initial UI
  function initPart2() {
    createFilterBar();
    // default apply filters after a short delay to allow Part1 to fetch
    setTimeout(() => {
      const stt = getState();
      // set perPage initial
      const perEl = document.getElementById('adsPerPage');
      if (perEl) state.perPage = Number(perEl.value);
      // populate initial filteredAds
      state.filteredAds = stt.myAds ? stt.myAds.slice() : [];
      applyFilters();
    }, 300);

    // Expose some helpers
    window._ShaharTaxiProfile.applyFilters = applyFilters;
    window._ShaharTaxiProfile.rateAdPrompt = rateAdPrompt;
    window._ShaharTaxiProfile.openCommentsModalImproved = openCommentsModalImproved;
  }

  // Small polyfill: attempt to reuse postComment if Part1 attached it to API; if not, attach a wrapper
  if (!API.postComment && window._ShaharTaxiProfile) {
    // try to attach a wrapper that calls global firebase if needed; but keep safe
    window._ShaharTaxiProfile.postComment = async function (adId, text) {
      const st = getState();
      if (!st.currentUser) throw new Error('not-authenticated');
      if (window.firebase && firebase.firestore) {
        const comment = {
          authorId: st.currentUser.uid,
          author: st.currentUser.displayName || st.currentUser.email || 'Foydalanuvchi',
          text: text,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await firebase.firestore().collection('ads').doc(adId).update({
          comments: firebase.firestore.FieldValue.arrayUnion(comment)
        });
        // refresh
        API.fetchUserAds && API.fetchUserAds(st.currentUser.uid);
      } else {
        // local fallback
        st.myAds = (st.myAds || []).map((a) => {
          if (a.id === adId) {
            const arr = a.comments ? a.comments.slice() : [];
            arr.unshift({ authorId: st.currentUser.uid, author: st.currentUser.displayName || st.currentUser.email || 'Foydalanuvchi', text: text, createdAt: new Date() });
            return Object.assign({}, a, { comments: arr });
          }
          return a;
        });
        applyFilters();
      }
    };
  }

  // Run initialization
  initPart2();

  // End of Part 2
})();
/* profile.js
   Part 3 (Final):
   - Profil ma'lumotlarini tahrirlash
   - Internet uzilishi uchun offline rejim
   - Loading indicator va xatolik handlerlar
   - Barcha yordamchi funksiyalarni yakunlash
   - window._ShaharTaxiProfile yakuniy eksport
*/

(function() {
  'use strict';

  const API = window._ShaharTaxiProfile || {};
  const adsContainerEl = document.getElementById('adsContainer');
  const addFormEl = document.getElementById('addForm');

  // ==============================
  // 🔹 Loading indicator
  // ==============================
  const loadingOverlay = document.createElement('div');
  loadingOverlay.style.position = 'fixed';
  loadingOverlay.style.top = '0';
  loadingOverlay.style.left = '0';
  loadingOverlay.style.width = '100%';
  loadingOverlay.style.height = '100%';
  loadingOverlay.style.background = 'rgba(255,255,255,0.6)';
  loadingOverlay.style.display = 'none';
  loadingOverlay.style.alignItems = 'center';
  loadingOverlay.style.justifyContent = 'center';
  loadingOverlay.style.zIndex = '9999';
  loadingOverlay.innerHTML = '<div style="padding:12px 20px;background:#fff;border-radius:10px;box-shadow:0 0 10px rgba(0,0,0,0.1)">Yuklanmoqda...</div>';
  document.body.appendChild(loadingOverlay);

  function showLoading(show = true) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
  }

  // ==============================
  // 🔹 Profilni tahrirlash (ism, telefon)
  // ==============================
  function setupProfileEdit() {
    const nameEl = document.getElementById('profileName');
    const phoneEl = document.getElementById('profilePhone');
    const saveBtn = document.getElementById('saveProfileBtn');

    if (!saveBtn || !nameEl || !phoneEl) return;

    saveBtn.addEventListener('click', async () => {
      const name = nameEl.value.trim();
      const phone = phoneEl.value.trim();
      if (!name) return alert('Ismni kiriting');
      if (!/^[0-9]{8,15}$/.test(phone)) return alert('Telefon raqam xato formatda');

      showLoading(true);
      try {
        const st = API.getState ? API.getState() : {};
        if (!st.currentUser) throw new Error('Tizimga kirmagansiz');

        if (window.firebase && firebase.firestore) {
          const ref = firebase.firestore().collection('users').doc(st.currentUser.uid);
          await ref.update({ name, phone });
          alert('Profil yangilandi');
        } else {
          // Demo offline rejim
          st.userProfile = Object.assign({}, st.userProfile || {}, { name, phone });
          alert('Profil lokal tarzda saqlandi');
        }
      } catch (err) {
        console.error(err);
        alert('Profilni saqlashda xatolik');
      } finally {
        showLoading(false);
      }
    });
  }

  // ==============================
  // 🔹 Offline rejim tekshiruvi
  // ==============================
  function setupOfflineMode() {
    window.addEventListener('offline', () => {
      const msg = document.createElement('div');
      msg.id = 'offlineNotice';
      msg.textContent = 'Internet aloqasi uzildi. Ma\'lumotlar vaqtincha lokalda saqlanadi.';
      msg.style.position = 'fixed';
      msg.style.bottom = '10px';
      msg.style.left = '10px';
      msg.style.background = '#ffdddd';
      msg.style.color = '#b00';
      msg.style.padding = '8px 12px';
      msg.style.border = '1px solid #b00';
      msg.style.borderRadius = '6px';
      msg.style.zIndex = '9999';
      document.body.appendChild(msg);
    });

    window.addEventListener('online', () => {
      const msg = document.getElementById('offlineNotice');
      if (msg) msg.remove();
      alert('Internet tiklandi. Ma\'lumotlar sinxronlanmoqda...');
      if (API.fetchUserAds && API.getState) {
        const st = API.getState();
        if (st.currentUser) API.fetchUserAds(st.currentUser.uid);
      }
    });
  }

  // ==============================
  // 🔹 Xatolik chiqishlari
  // ==============================
  function showError(msg) {
    const box = document.createElement('div');
    box.textContent = msg;
    box.style.position = 'fixed';
    box.style.top = '10px';
    box.style.right = '10px';
    box.style.background = '#f44336';
    box.style.color = '#fff';
    box.style.padding = '10px 16px';
    box.style.borderRadius = '6px';
    box.style.zIndex = '99999';
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 4000);
  }

  // ==============================
  // 🔹 Helper funksiyalarni qayta qo‘shish
  // ==============================
  function safeText(t) { return (t || '').replace(/[<>]/g, ''); }
  function formatCurrency(n) {
    if (!n && n !== 0) return '-';
    const num = Number(n);
    if (isNaN(num)) return n;
    return num.toLocaleString('uz-UZ') + ' so\'m';
  }
  function formatDate(d) {
    try {
      if (!d) return '';
      if (d.seconds) return new Date(d.seconds * 1000).toLocaleString('uz-UZ');
      if (d.toDate) return d.toDate().toLocaleString('uz-UZ');
      return new Date(d).toLocaleString('uz-UZ');
    } catch { return ''; }
  }

  // ==============================
  // 🔹 Yakuniy init
  // ==============================
  function initFinal() {
    setupProfileEdit();
    setupOfflineMode();

    // Agar profil hali yuklanmagan bo‘lsa, keyinroq qayta yukla
    setTimeout(() => {
      const st = API.getState ? API.getState() : {};
      if (!st.userProfile && API.fetchUserAds && st.currentUser) {
        API.fetchUserAds(st.currentUser.uid);
      }
    }, 1000);
  }

  // Eksport
  window._ShaharTaxiProfile = Object.assign({}, API, {
    showLoading,
    showError,
    safeText,
    formatCurrency,
    formatDate,
  });

  // Ishga tushirish
  initFinal();

  console.log('%c✅ ShaharTaxi profile.js to‘liq yuklandi (1+2+3-qism).', 'color:green;font-weight:bold;');
})();
