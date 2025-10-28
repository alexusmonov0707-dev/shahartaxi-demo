// admin.js — 1/3
// ShaharTaxi admin panel yordamchi fayli
// Eslatma: ushbu faylni <script src="admin.js"></script> orqali admin.html ichiga yuklang.

// -------------------- Utils / yordamchi funksiyalar --------------------

/**
 * LocalStorage'dan barcha e'lonlarni qaytaradi.
 * Strukturani o'zgartirishdan qo'rqmaslik uchun mavjud bo'lmasa bo'sh massiv qaytaradi.
 */
function getAdsData() {
  return {
    driver: JSON.parse(localStorage.getItem('driverAds')) || [],
    passenger: JSON.parse(localStorage.getItem('passengerAds')) || []
  };
}

/**
 * Barcha e'lonlarga ID yo'q bo'lsa — avtomatik ID taqdim etish.
 * Bugungi holatlarda turli manbalardan kelgan ID tiplari (raqam yoki string) aralash bo'lishi mumkin,
 * shuning uchun barchasiga id maydonini berib qo'yamiz (faqat kerak bo'lganda).
 */
function ensureIds() {
  let changed = false;
  const data = getAdsData();

  ['driver', 'passenger'].forEach(type => {
    const arr = data[type];
    for (let i = 0; i < arr.length; i++) {
      const ad = arr[i];
      if (ad && (ad.id === undefined || ad.id === null || ad.id === '')) {
        // vaqt va index aralashmasidan noyob string yaratamiz
        ad.id = `${type}_${Date.now()}_${Math.floor(Math.random() * 100000)}_${i}`;
        changed = true;
      }
    }
    // saqlaymiz faqat kerak bo'lsa
    if (changed) {
      localStorage.setItem(type + 'Ads', JSON.stringify(arr));
    }
  });

  return changed;
}

/**
 * Id solishtirishda turli tiplar (string vs number) muammosini bartaraf etish.
 */
function idEquals(a, b) {
  return String(a) === String(b);
}

/**
 * Qo'shimcha: agar admin login tizimi ishlatilsa (overlay), shu funksiyalar orqali nazorat qilamiz.
 * localStorage adminLoggedIn: "true" bo'lsa panel ko'rinadi.
 */
const ADMIN_PASSWORD = "shahartaxi2025"; // agar baribir o'zgartirish kerak bo'lsa admin.html va bu yerda moslang

function isAdminLoggedIn() {
  return localStorage.getItem('adminLoggedIn') === "true";
}

function requireAdminLoginOnLoad() {
  // Agar admin login ishlatilsa overlay ko'rsatiladi
  try {
    const overlay = document.getElementById('loginOverlay');
    if (!overlay) return; // admin.html da overlay yo'q bo'lsa chiqamiz

    if (isAdminLoggedIn()) {
      overlay.style.display = 'none';
    } else {
      overlay.style.display = 'flex';
    }
  } catch (e) {
    console.warn("requireAdminLoginOnLoad:", e);
  }
}

function checkAdminLogin() {
  const user = (document.getElementById('adminUser') || {}).value || '';
  const pass = (document.getElementById('adminPass') || {}).value || '';
  const err = document.getElementById('loginError');
  if (pass === ADMIN_PASSWORD) {
    localStorage.setItem('adminLoggedIn', 'true');
    if (err) err.textContent = '';
    const overlay = document.getElementById('loginOverlay');
    if (overlay) overlay.style.display = 'none';
    // Yuklash
    renderAds();
    updateStats();
  } else {
    if (err) err.textContent = 'Noto‘g‘ri parol — qayta urinib ko‘ring.';
  }
}

function logoutAdmin() {
  localStorage.removeItem('adminLoggedIn');
  const overlay = document.getElementById('loginOverlay');
  if (overlay) overlay.style.display = 'flex';
}

// -------------------- Rendering va boshqaruv --------------------

/**
 * getCombinedAds — driver va passenger massivlarini bitta massivga birlashtiradi
 * va har bir ob'ektga `type` maydoni qo'shadi.
 */
function getCombinedAds() {
  const { driver, passenger } = getAdsData();
  const d = driver.map(a => ({ ...a, type: 'driver' }));
  const p = passenger.map(a => ({ ...a, type: 'passenger' }));
  return [...d, ...p];
}

/**
 * renderAds — asosiy render funksiyasi. filter-larni inobatga oladi.
 */
function renderAds() {
  // Agar admin login talab qilingan va admin kirmagan bo'lsa — hech nima ko'rsatmaymiz
  try {
    if (document.getElementById('loginOverlay') && !isAdminLoggedIn()) {
      // overlay mavjud va admin kirmagan — faqat overlay ko'rsatiladi, render qilinmaydi
      return;
    }
  } catch (e) {
    // ignore
  }

  // ID lar borligini tekshiramiz (va kerak bo'lsa kvadrat saqlaymiz)
  ensureIds();

  const combined = getCombinedAds();

  const typeFilter = (document.getElementById('typeFilter') || {}).value || 'all';
  const statusFilter = (document.getElementById('statusFilter') || {}).value || 'all';

  let filtered = combined.slice();

  if (typeFilter !== 'all') {
    filtered = filtered.filter(ad => ad.type === typeFilter);
  }
  if (statusFilter !== 'all') {
    filtered = filtered.filter(ad => ((ad.status || 'pending') === statusFilter));
  }

  const container = document.getElementById('ads');
  if (!container) {
    console.warn("renderAds: #ads elementi topilmadi");
    return;
  }
  container.innerHTML = '';

  if (!filtered.length) {
    container.innerHTML = '<p>E’lonlar topilmadi.</p>';
    return;
  }

  filtered.forEach(ad => {
    // Yo'nalishni tuzatish: eski ob'ektlar `fromRegion/fromDistrict` yoki `from` bo'lishi mumkin.
    const fromParts = (ad.fromRegion && ad.fromDistrict) ? `${ad.fromRegion} ${ad.fromDistrict}` : (ad.from || '');
    const toParts = (ad.toRegion && ad.toDistrict) ? `${ad.toRegion} ${ad.toDistrict}` : (ad.to || '');

    const fromText = fromParts && fromParts.trim() ? fromParts : '—';
    const toText = toParts && toParts.trim() ? toParts : '—';

    const phone = ad.phone || ad.contact || ad.name || 'Noma’lum';
    const price = ad.price ? (ad.price + ' so‘m') : 'Ko‘rsatilmagan';

    const adEl = document.createElement('div');
    adEl.className = 'ad';

    // Qo'shimcha: kichik meta ma'lumot (va avtomatik ravishda IDni data attribute ga qo'yish)
    adEl.setAttribute('data-ad-id', String(ad.id));
    adEl.setAttribute('data-ad-type', ad.type);

    adEl.innerHTML = `
      <p><b>Turi:</b> ${ad.type === 'driver' ? 'Haydovchi' : 'Yo‘lovchi'}</p>
      <p><b>Yo‘nalish:</b> ${escapeHtml(fromText)} → ${escapeHtml(toText)}</p>
      <p><b>Telefon:</b> ${escapeHtml(String(phone))}</p>
      <p><b>Narx:</b> ${escapeHtml(String(price))}</p>
      <p class="status"><b>Holat:</b> ${getStatusText(ad.status)}</p>
      <div class="actions">
        <button class="approve" onclick="updateStatus('${ad.type}', '${ad.id}', 'approved')">Tasdiqlash</button>
        <button class="reject" onclick="updateStatus('${ad.type}', '${ad.id}', 'rejected')">Rad etish</button>
        <button class="edit" onclick="openEdit('${ad.type}', '${ad.id}')">Tahrirlash</button>
        <button class="delete" onclick="deleteAd('${ad.type}', '${ad.id}')">O‘chirish</button>
      </div>
    `;

    container.appendChild(adEl);
  });
}

/**
 * XSS dan himoyalash uchun eng oddiy escape funksiyasi.
 */
function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// -------------------- Part 2 va 3 funksiyalariga tayyor --------------------
// Keyingi qism: updateStatus, saveApprovalHistory, openEdit, saveEdit, deleteAd, updateStats,
// showApprovalHistory, modal boshqarish, va window.onload tugallanadi.

// EOF — admin.js 1/3
// admin.js — 2/3
// --- Tasdiqlash / Status o‘zgartirish funksiyalari ---

function updateStatus(type, id, newStatus) {
  try {
    const ads = JSON.parse(localStorage.getItem(type + 'Ads')) || [];
    const index = ads.findIndex(a => idEquals(a.id, id));

    if (index === -1) {
      alert('E’lon topilmadi.');
      return;
    }

    const oldStatus = ads[index].status || 'pending';
    ads[index].status = newStatus;
    localStorage.setItem(type + 'Ads', JSON.stringify(ads));

    // Tarixga yozamiz
    saveApprovalHistory({
      id,
      type,
      oldStatus,
      newStatus,
      date: new Date().toLocaleString()
    });

    renderAds();
  } catch (e) {
    console.error('updateStatus xatolik:', e);
  }
}

// --- Tasdiqlash tarixi funksiyalari ---

function saveApprovalHistory(entry) {
  try {
    const history = JSON.parse(localStorage.getItem('approvalHistory')) || [];
    history.push(entry);
    localStorage.setItem('approvalHistory', JSON.stringify(history));
  } catch (e) {
    console.error('saveApprovalHistory xatolik:', e);
  }
}

function showApprovalHistory() {
  try {
    const modal = document.getElementById('historyModal');
    const list = document.getElementById('historyList');
    const history = JSON.parse(localStorage.getItem('approvalHistory')) || [];

    if (!history.length) {
      list.innerHTML = '<p>Hozircha tarix yo‘q.</p>';
    } else {
      list.innerHTML = history
        .map(
          (h) => `
          <div style="border-bottom:1px solid #ddd;padding:8px 0;">
            <p><b>ID:</b> ${escapeHtml(h.id)}</p>
            <p><b>Tur:</b> ${escapeHtml(h.type)}</p>
            <p><b>Eski holat:</b> ${escapeHtml(h.oldStatus)}</p>
            <p><b>Yangi holat:</b> ${escapeHtml(h.newStatus)}</p>
            <p><b>Sana:</b> ${escapeHtml(h.date)}</p>
          </div>`
        )
        .join('');
    }

    modal.style.display = 'flex';
  } catch (e) {
    console.error('showApprovalHistory xatolik:', e);
  }
}

function closeHistory() {
  const modal = document.getElementById('historyModal');
  if (modal) modal.style.display = 'none';
}

// --- E’lon tahrirlash funksiyalari ---

let currentEdit = { type: '', id: '' };

function openEdit(type, id) {
  try {
    const ads = JSON.parse(localStorage.getItem(type + 'Ads')) || [];
    const ad = ads.find(a => idEquals(a.id, id));
    if (!ad) {
      alert('E’lon topilmadi.');
      return;
    }

    currentEdit = { type, id };

    document.getElementById('editPhone').value = ad.phone || '';
    document.getElementById('editPrice').value = ad.price || '';
    document.getElementById('editFrom').value =
      ad.from || ad.fromDistrict || ad.fromRegion || '';
    document.getElementById('editTo').value =
      ad.to || ad.toDistrict || ad.toRegion || '';
    document.getElementById('editStatus').value = ad.status || 'pending';

    const modal = document.getElementById('editModal');
    modal.style.display = 'flex';
  } catch (e) {
    console.error('openEdit xatolik:', e);
  }
}

function saveEdit() {
  try {
    const { type, id } = currentEdit;
    if (!type || !id) {
      alert('Xatolik: tahrirlanayotgan e’lon aniqlanmadi.');
      return;
    }

    const ads = JSON.parse(localStorage.getItem(type + 'Ads')) || [];
    const index = ads.findIndex(a => idEquals(a.id, id));
    if (index === -1) {
      alert('E’lon topilmadi.');
      return;
    }

    ads[index].phone = document.getElementById('editPhone').value.trim();
    ads[index].price = document.getElementById('editPrice').value.trim();
    ads[index].from = document.getElementById('editFrom').value.trim();
    ads[index].to = document.getElementById('editTo').value.trim();
    ads[index].status = document.getElementById('editStatus').value;

    localStorage.setItem(type + 'Ads', JSON.stringify(ads));
    closeModal();
    renderAds();
  } catch (e) {
    console.error('saveEdit xatolik:', e);
  }
}

function closeModal() {
  const modal = document.getElementById('editModal');
  if (modal) modal.style.display = 'none';
}

// --- E’lonni o‘chirish ---

function deleteAd(type, id) {
  if (!confirm('Haqiqatan ham o‘chirmoqchimisiz?')) return;

  try {
    let ads = JSON.parse(localStorage.getItem(type + 'Ads')) || [];
    ads = ads.filter(a => !idEquals(a.id, id));
    localStorage.setItem(type + 'Ads', JSON.stringify(ads));
    renderAds();
  } catch (e) {
    console.error('deleteAd xatolik:', e);
  }
}
// admin.js — 3/3
// --- Qo‘shimcha yordamchi funksiyalar ---

function getStatusText(status) {
  switch (status) {
    case 'pending': return '⏳ Kutilmoqda';
    case 'approved': return '✅ Tasdiqlangan';
    case 'rejected': return '❌ Rad etilgan';
    default: return 'Noma’lum';
  }
}

function updateStats() {
  try {
    const driverAds = JSON.parse(localStorage.getItem('driverAds')) || [];
    const passengerAds = JSON.parse(localStorage.getItem('passengerAds')) || [];
    const all = driverAds.concat(passengerAds);
    const approved = all.filter(a => a.status === 'approved').length;
    const pending = all.filter(a => a.status === 'pending').length;
    const rejected = all.filter(a => a.status === 'rejected').length;

    console.log(`📊 Statistika: Tasdiqlangan: ${approved}, Kutilmoqda: ${pending}, Rad etilgan: ${rejected}`);
  } catch (e) {
    console.error('updateStats xatolik:', e);
  }
}

// --- Navigatsiya tugmalari ---

function goToStats() {
  alert('📊 Statistika hali to‘liq sahifa sifatida yaratilmagan, ammo konsolda ko‘rish mumkin.');
  updateStats();
}

function goToAdd() {
  alert('➕ Yangi e’lon qo‘shish sahifasi hozircha admin panel ichida mavjud.');
}

// --- Sahifa yuklanganda avtomatik ishlaydigan qism ---

document.addEventListener('DOMContentLoaded', () => {
  renderAds();
  requireAdminLoginOnLoad();
});

// --- Admin loginni sahifa yuklanganda tekshirish ---

function requireAdminLoginOnLoad() {
  const overlay = document.getElementById('loginOverlay');
  const adminLoggedIn = sessionStorage.getItem('adminLoggedIn');

  if (!adminLoggedIn) {
    overlay.style.display = 'flex';
  } else {
    overlay.style.display = 'none';
    renderAds();
  }
}
