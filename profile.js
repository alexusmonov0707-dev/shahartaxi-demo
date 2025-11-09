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
