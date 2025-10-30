// === CONFIG ===
const ADMIN_USER = 'admin';
const ADMIN_PASSWORD = 'shahartaxi2025';
const ADMIN_TOKEN_KEY = 'shaharTaxiAdminToken';

// === ADMIN LOGIN ===
function checkAdminLogin() {
  const user = document.getElementById('adminUser').value.trim();
  const pass = document.getElementById('adminPass').value.trim();
  const err = document.getElementById('loginError');

  if (user === ADMIN_USER && pass === ADMIN_PASSWORD) {
    localStorage.setItem(ADMIN_TOKEN_KEY, 'true');
    document.getElementById('loginOverlay').style.display = 'none';
    renderAds();
  } else {
    err.textContent = '❌ Noto‘g‘ri login yoki parol';
  }
}

function logoutAdmin() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  location.reload();
}

// === SHOW LOGIN OVERLAY IF NEEDED ===
if (localStorage.getItem(ADMIN_TOKEN_KEY) !== 'true') {
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('loginOverlay').style.display = 'flex';
  });
}

// === GLOBAL VARIABLES ===
let currentEdit = { type: null, id: null };

// === DATA ACCESS ===
function getAds() {
  return {
    driver: JSON.parse(localStorage.getItem('driverAds')) || [],
    passenger: JSON.parse(localStorage.getItem('passengerAds')) || []
  };
}

// === STATUS TEXT ===
function getStatusText(status) {
  if (status === 'approved') return '✅ Tasdiqlangan';
  if (status === 'rejected') return '❌ Rad etilgan';
  return '⏳ Kutilmoqda';
}

// === RENDER ADS ===
function renderAds() {
  const { driver, passenger } = getAds();

  // ID berish
  let updated = false;
  ['driver', 'passenger'].forEach(type => {
    let arr = type === 'driver' ? driver : passenger;
    arr.forEach((ad, i) => {
      if (!ad.id) {
        ad.id = `${type}_${Date.now()}_${i}`;
        updated = true;
      }
    });
    localStorage.setItem(type + 'Ads', JSON.stringify(arr));
  });
  if (updated) console.log("E’lonlarga ID berildi ✅");

  const typeFilter = document.getElementById('typeFilter').value;
  const statusFilter = document.getElementById('statusFilter').value;

  let ads = [];
  if (typeFilter === 'driver') ads = driver.map(a => ({ ...a, type: 'driver' }));
  else if (typeFilter === 'passenger') ads = passenger.map(a => ({ ...a, type: 'passenger' }));
  else ads = [
    ...driver.map(a => ({ ...a, type: 'driver' })),
    ...passenger.map(a => ({ ...a, type: 'passenger' }))
  ];

  if (statusFilter !== 'all') ads = ads.filter(a => (a.status || 'pending') === statusFilter);

  const container = document.getElementById('ads');
  container.innerHTML = '';

  if (ads.length === 0) {
    container.innerHTML = '<p>E’lonlar topilmadi.</p>';
    return;
  }

  ads.forEach(ad => {
    const from = ad.fromDistrict && ad.fromRegion
      ? `${ad.fromRegion} ${ad.fromDistrict}`
      : (ad.fromRegion || ad.from || '—');
    const to = ad.toDistrict && ad.toRegion
      ? `${ad.toRegion} ${ad.toDistrict}`
      : (ad.toRegion || ad.to || '—');

    const div = document.createElement('div');
    div.className = 'ad';
    div.innerHTML = `
      <p><b>Turi:</b> ${ad.type === 'driver' ? 'Haydovchi' : 'Yo‘lovchi'}</p>
      <p><b>Yo‘nalish:</b> ${from} → ${to}</p>
      <p><b>Telefon:</b> ${ad.phone || 'Noma’lum'}</p>
      <p><b>Narx:</b> ${ad.price ? ad.price + ' so‘m' : 'Ko‘rsatilmagan'}</p>
      <p class="status"><b>Holat:</b> ${getStatusText(ad.status)}</p>
      <div class="actions">
        <button class="approve" onclick="updateStatus('${ad.type}', '${ad.id}', 'approved')">Tasdiqlash</button>
        <button class="reject" onclick="updateStatus('${ad.type}', '${ad.id}', 'rejected')">Rad etish</button>
        <button class="edit" onclick="openEdit('${ad.type}', '${ad.id}')">Tahrirlash</button>
        <button class="delete" onclick="deleteAd('${ad.type}', '${ad.id}')">O‘chirish</button>
      </div>
    `;
    container.appendChild(div);
  });
}

// === UPDATE STATUS ===
function updateStatus(type, id, newStatus) {
  const key = type === 'driver' ? 'driverAds' : 'passengerAds';
  const ads = JSON.parse(localStorage.getItem(key)) || [];
  const index = ads.findIndex(a => String(a.id) === String(id));

  if (index > -1) {
    const oldStatus = ads[index].status || 'pending';
    ads[index].status = newStatus;
    localStorage.setItem(key, JSON.stringify(ads));

    saveApprovalHistory({
      id: ads[index].id,
      type,
      from: ads[index].fromDistrict || ads[index].fromRegion || ads[index].from || '—',
      to: ads[index].toDistrict || ads[index].toRegion || ads[index].to || '—',
      oldStatus,
      newStatus
    });
  }

  renderAds();
  updateStats();
}

// === SAVE HISTORY ===
function saveApprovalHistory(record) {
  const history = JSON.parse(localStorage.getItem('approvalHistory')) || [];
  const entry = {
    id: record.id || '—',
    type: record.type,
    from: record.from,
    to: record.to,
    oldStatus: record.oldStatus,
    newStatus: record.newStatus,
    date: new Date().toLocaleString()
  };
  history.push(entry);
  localStorage.setItem('approvalHistory', JSON.stringify(history));
}

// === FIX OLD HISTORY ===
function fixApprovalHistory() {
  let approvalHistory = JSON.parse(localStorage.getItem("approvalHistory")) || [];
  let driverAds = JSON.parse(localStorage.getItem("driverAds")) || [];
  let passengerAds = JSON.parse(localStorage.getItem("passengerAds")) || [];

  let updated = false;

  approvalHistory = approvalHistory.map(history => {
    if (!history.id || history.id === "undefined" || history.id === "—") {
      const matchedAd = [...driverAds, ...passengerAds].find(
        ad => ad.type === history.type && (
          ad.from === history.from ||
          ad.fromDistrict === history.from ||
          ad.fromRegion === history.from
        )
      );
      if (matchedAd) {
        history.id = matchedAd.id;
        updated = true;
      }
    }
    return history;
  });

  if (updated) {
    localStorage.setItem("approvalHistory", JSON.stringify(approvalHistory));
    console.log("🧩 Eski tasdiqlash tarixlariga ID biriktirildi");
  }
}

// === SHOW HISTORY ===
function showApprovalHistory() {
  const history = JSON.parse(localStorage.getItem('approvalHistory')) || [];
  const list = document.getElementById('historyList');

  list.innerHTML = history.length
    ? history.map(h => `
      <div style="border-bottom:1px solid #ddd;padding:8px 0;">
        <p><b>ID:</b> ${h.id}</p>
        <p><b>Tur:</b> ${h.type === 'driver' ? 'Haydovchi' : 'Yo‘lovchi'}</p>
        <p><b>Eski holat:</b> ${getStatusText(h.oldStatus)}</p>
        <p><b>Yangi holat:</b> ${getStatusText(h.newStatus)}</p>
        <p><b>Sana:</b> ${h.date}</p>
      </div>
    `).join('')
    : '<p>Hozircha tasdiqlash tarixi yo‘q.</p>';

  document.getElementById('historyModal').style.display = 'flex';
}

function closeHistory() {
  document.getElementById('historyModal').style.display = 'none';
}

// === EDIT MODAL ===
function openEdit(type, id) {
  const { driver, passenger } = getAds();
  const ads = type === 'driver' ? driver : passenger;
  const ad = ads.find(a => String(a.id) === String(id));
  if (!ad) return;

  currentEdit = { type, id };
  document.getElementById('editPhone').value = ad.phone || '';
  document.getElementById('editPrice').value = ad.price || '';
  document.getElementById('editFrom').value = ad.from || ad.fromRegion || '';
  document.getElementById('editTo').value = ad.to || ad.toRegion || '';
  document.getElementById('editStatus').value = ad.status || 'pending';
  document.getElementById('editModal').style.display = 'flex';
}

function saveEdit() {
  const { type, id } = currentEdit;
  const key = type === 'driver' ? 'driverAds' : 'passengerAds';
  const ads = JSON.parse(localStorage.getItem(key)) || [];
  const index = ads.findIndex(a => String(a.id) === String(id));
  if (index > -1) {
    ads[index].phone = document.getElementById('editPhone').value;
    ads[index].price = document.getElementById('editPrice').value;
    ads[index].from = document.getElementById('editFrom').value;
    ads[index].to = document.getElementById('editTo').value;
    ads[index].status = document.getElementById('editStatus').value;
    localStorage.setItem(key, JSON.stringify(ads));
  }
  closeModal();
  renderAds();
  updateStats();
}

function closeModal() {
  document.getElementById('editModal').style.display = 'none';
}

// === DELETE AD ===
function deleteAd(type, id) {
  const key = type === 'driver' ? 'driverAds' : 'passengerAds';
  let ads = JSON.parse(localStorage.getItem(key)) || [];
  ads = ads.filter(a => String(a.id) !== String(id));
  localStorage.setItem(key, JSON.stringify(ads));
  renderAds();
  updateStats();
}

// === STATISTICS ===
function updateStats() {
  const { driver, passenger } = getAds();
  const all = [...driver, ...passenger];
  const stats = {
    drivers: driver.length,
    passengers: passenger.length,
    approved: all.filter(a => a.status === 'approved').length,
    rejected: all.filter(a => a.status === 'rejected').length,
    pending: all.filter(a => !a.status || a.status === 'pending').length
  };
  localStorage.setItem('stats', JSON.stringify(stats));
}

// === NAVIGATION ===
function goToStats() {
  updateStats();
  window.location.href = 'admin-stat.html';
}

function goToAdd() {
  window.location.href = 'admin-add.html';
}

// === ONE-TIME FIX: eski e’lonlarga ID berish ===
(function fixOldAdsWithoutID() {
  let changed = false;
  ['driverAds', 'passengerAds'].forEach(type => {
    let ads = JSON.parse(localStorage.getItem(type)) || [];
    ads.forEach((ad, i) => {
      if (!ad.id) {
        const prefix = type === 'driverAds' ? 'drv' : 'psg';
        ad.id = `${prefix}-${Date.now()}-${i}`;
        changed = true;
      }
    });
    if (changed) localStorage.setItem(type, JSON.stringify(ads));
  });
  if (changed) console.log('🔧 Eski e’lonlarga ID biriktirildi');
})();

// === INITIALIZE ===
window.onload = () => {
  renderAds();
  updateStats();
  fixApprovalHistory();
  setInterval(() => renderAds(), 5000);
};
