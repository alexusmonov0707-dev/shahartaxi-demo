<script>
/* ===========================
   ADMIN SCRIPT - SYNCHRONIZING
   ===========================
   Replace only the <script>...</script> contents in admin.html with this.
   Do NOT remove other HTML.
*/

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

// show login overlay if not logged in
if (localStorage.getItem(ADMIN_TOKEN_KEY) !== 'true') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('loginOverlay')) {
      document.getElementById('loginOverlay').style.display = 'flex';
    }
  });
}

// === HELPERS: read/write storages and normalize ===
function readStorage(name) {
  try {
    return JSON.parse(localStorage.getItem(name)) || [];
  } catch (e) {
    return [];
  }
}
function writeStorage(name, val) {
  localStorage.setItem(name, JSON.stringify(val));
}

// Normalize old ad objects -> ensure fields exist
function normalizeAd(ad, inferredType = null) {
  return {
    id: ad.id !== undefined ? ad.id : (ad.routeId || ad._id || null),
    type: ad.type || inferredType || (String(ad.id || '').startsWith('drv') ? 'driver' : (String(ad.id || '').startsWith('psg') ? 'passenger' : (ad.ownerPhone || ad.driver ? 'driver' : 'passenger'))),
    fromRegion: ad.fromRegion || ad.from || (ad.route ? (ad.route.split('→')[0] || '').trim() : '') || '—',
    fromDistrict: ad.fromDistrict || '',
    toRegion: ad.toRegion || ad.to || (ad.route ? (ad.route.split('→')[1] || '').trim() : '') || '—',
    toDistrict: ad.toDistrict || '',
    driver: ad.driver || ad.name || ad.ownerName || '',
    phone: ad.phone || ad.ownerPhone || ad.phoneNumber || '',
    price: ad.price || ad.fee || '—',
    status: (ad.status || ad.state || 'pending'),
    date: ad.date || ad.createdAt || new Date().toLocaleString(),
    // keep original so we don't lose unknown fields if needed
    __orig: ad
  };
}

// Unified getter: returns { all, driver, passenger }
function getAllSources() {
  const allAds = readStorage('allAds');
  const driverAds = readStorage('driverAds');
  const passengerAds = readStorage('passengerAds');

  // normalize all
  const all = [];
  allAds.forEach(a => all.push(normalizeAd(a, a.type || null)));
  driverAds.forEach(a => all.push(normalizeAd(a, 'driver')));
  passengerAds.forEach(a => all.push(normalizeAd(a, 'passenger')));

  // de-duplicate by id (prefer first occurrence from unified sources)
  const seen = new Map();
  const unified = [];
  all.forEach(a => {
    const key = a.id ? String(a.id) : null;
    if (key && !seen.has(key)) {
      seen.set(key, true);
      unified.push(a);
    } else if (!key) {
      // keep those without id too (will be fixed later)
      unified.push(a);
    }
  });

  // build separate lists from unified (driver/passenger) by type
  const drivers = unified.filter(a => a.type === 'driver');
  const passengers = unified.filter(a => a.type === 'passenger');

  return { unified, drivers, passengers, raw: { allAds, driverAds, passengerAds } };
}

// One-time fix: assign IDs for old ads without id (keeps prefix so we can recognize)
(function fixOldAdsWithoutID() {
  let changedAny = false;
  ['allAds', 'driverAds', 'passengerAds'].forEach(key => {
    const arr = readStorage(key);
    let changed = false;
    for (let i = 0; i < arr.length; i++) {
      if (!arr[i].id && !arr[i].routeId && !arr[i]._id) {
        const prefix = key === 'driverAds' ? 'drv' : (key === 'passengerAds' ? 'psg' : 'ads');
        arr[i].id = `${prefix}-${Date.now()}-${i}`;
        changed = true;
      }
    }
    if (changed) {
      writeStorage(key, arr);
      changedAny = true;
    }
  });
  if (changedAny) console.log('🔧 Eski e’lonlarga ID berildi (one-time fix).');
})();

// Utility: write back updates to storages where ad exists
function upsertAdToStorages(ad) {
  // ad is normalized object (has id)
  const idStr = ad.id ? String(ad.id) : null;

  // update allAds
  let allAds = readStorage('allAds');
  let found = false;
  for (let i = 0; i < allAds.length; i++) {
    if (String(allAds[i].id) === idStr) {
      allAds[i] = { ...allAds[i], ...ad };
      found = true;
      break;
    }
  }
  if (!found) {
    // push if not present
    allAds.push(ad);
  }
  writeStorage('allAds', allAds);

  // update driverAds/passengerAds according to ad.type
  if (ad.type === 'driver') {
    let driverAds = readStorage('driverAds');
    let idx = driverAds.findIndex(a => String(a.id) === idStr);
    if (idx > -1) driverAds[idx] = { ...driverAds[idx], ...ad };
    else driverAds.push(ad);
    writeStorage('driverAds', driverAds);

    // remove from passengerAds if exists
    let passengerAds = readStorage('passengerAds');
    passengerAds = passengerAds.filter(a => String(a.id) !== idStr);
    writeStorage('passengerAds', passengerAds);
  } else { // passenger
    let passengerAds = readStorage('passengerAds');
    let idx = passengerAds.findIndex(a => String(a.id) === idStr);
    if (idx > -1) passengerAds[idx] = { ...passengerAds[idx], ...ad };
    else passengerAds.push(ad);
    writeStorage('passengerAds', passengerAds);

    // remove from driverAds if exists
    let driverAds = readStorage('driverAds');
    driverAds = driverAds.filter(a => String(a.id) !== idStr);
    writeStorage('driverAds', driverAds);
  }
}

// === RENDER ADS ===
function renderAds() {
  const { unified, drivers, passengers } = getAllSources();

  // filters from UI (if they exist)
  const typeFilterEl = document.getElementById('typeFilter');
  const statusFilterEl = document.getElementById('statusFilter');
  const typeFilter = typeFilterEl ? typeFilterEl.value : 'all';
  const statusFilter = statusFilterEl ? statusFilterEl.value : 'all';

  let ads = [];
  if (typeFilter === 'driver') ads = drivers.slice();
  else if (typeFilter === 'passenger') ads = passengers.slice();
  else ads = unified.slice();

  if (statusFilter !== 'all') {
    ads = ads.filter(a => (a.status || 'pending') === statusFilter);
  }

  const container = document.getElementById('ads') || document.getElementById('adsContainer') || document.getElementById('adsList') || document.createElement('div');
  // clear container (if we used fallback, don't remove)
  if (container.id) container.innerHTML = '';

  if (ads.length === 0) {
    if (container.id) container.innerHTML = '<p>E’lonlar topilmadi.</p>';
    return;
  }

  ads.forEach(ad => {
    const from = (ad.fromRegion || '—') + (ad.fromDistrict ? ' ' + ad.fromDistrict : '');
    const to = (ad.toRegion || '—') + (ad.toDistrict ? ' ' + ad.toDistrict : '');

    const div = document.createElement('div');
    div.className = 'ad';
    div.innerHTML = `
      <p><b>ID:</b> ${ad.id || '—'}</p>
      <p><b>Turi:</b> ${ad.type === 'driver' ? 'Haydovchi' : 'Yo‘lovchi'}</p>
      <p><b>Yo‘nalish:</b> ${from} → ${to}</p>
      <p><b>Telefon:</b> ${ad.phone || 'Noma’lum'}</p>
      <p><b>Narx:</b> ${ad.price ? ad.price + ' so‘m' : 'Ko‘rsatilmagan'}</p>
      <p class="status"><b>Holat:</b> ${getStatusText(ad.status)}</p>
      <div class="actions">
        <button class="approve" onclick="updateStatus('${ad.type}', '${String(ad.id)}', 'approved')">Tasdiqlash</button>
        <button class="reject" onclick="updateStatus('${ad.type}', '${String(ad.id)}', 'rejected')">Rad etish</button>
        <button class="edit" onclick="openEdit('${ad.type}', '${String(ad.id)}')">Tahrirlash</button>
        <button class="delete" onclick="deleteAd('${ad.type}', '${String(ad.id)}')">O‘chirish</button>
      </div>
    `;
    if (container.id) container.appendChild(div);
  });
}

// === STATUS UPDATE + HISTORY SAVE ===
function updateStatus(type, id, newStatus) {
  // find in all storages and update
  const idStr = String(id);
  // helper to update array
  function updateIn(key) {
    let arr = readStorage(key);
    let changed = false;
    for (let i = 0; i < arr.length; i++) {
      if (String(arr[i].id) === idStr) {
        const oldStatus = arr[i].status || 'pending';
        arr[i].status = newStatus;
        writeStorage(key, arr);
        // save history record (give precedence to full ad details)
        const adNorm = normalizeAd(arr[i], type);
        saveApprovalHistory(adNorm, oldStatus, newStatus);
        changed = true;
        break;
      }
    }
    return changed;
  }

  // try update in each storage
  const updatedAll = updateIn('allAds');
  const updatedDrv = updateIn('driverAds');
  const updatedPsg = updateIn('passengerAds');

  // If not found anywhere but we have unified list, try to upsert using unified data
  if (!updatedAll && !updatedDrv && !updatedPsg) {
    // attempt to find details from unified (in case id was generated in other place)
    const { unified } = getAllSources();
    const ad = unified.find(a => String(a.id) === idStr);
    if (ad) {
      ad.status = newStatus;
      upsertAdToStorages(ad);
      saveApprovalHistory(ad, ad.status || 'pending', newStatus);
    }
  }

  renderAds();
  updateStats();
}

// === SAVE APPROVAL HISTORY ===
function saveApprovalHistory(ad, oldStatus, newStatus) {
  const history = readStorage('approvalHistory') || [];

  const entry = {
    id: ad.id || '—',
    type: ad.type || '—',
    from: ad.fromDistrict || ad.fromRegion || ad.from || '—',
    to: ad.toDistrict || ad.toRegion || ad.to || '—',
    oldStatus: oldStatus || 'pending',
    newStatus: newStatus || ad.status || 'pending',
    date: new Date().toLocaleString()
  };
  history.push(entry);
  writeStorage('approvalHistory', history);
}

// === SHOW APPROVAL HISTORY ===
function showApprovalHistory() {
  const history = readStorage('approvalHistory') || [];
  const list = document.getElementById('historyList');
  if (!list) {
    alert('historyList elementi topilmadi (HTMLda mavjudligiga ishonch hosil qiling).');
    return;
  }

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
  const idStr = String(id);
  // search in storages
  let ad = null;
  ['allAds','driverAds','passengerAds'].some(key => {
    const arr = readStorage(key);
    const found = arr.find(a => String(a.id) === idStr);
    if (found) {
      ad = normalizeAd(found, type);
      return true;
    }
  });
  if (!ad) return;
  currentEdit = { type, id: idStr };
  document.getElementById('editPhone').value = ad.phone || '';
  document.getElementById('editPrice').value = ad.price || '';
  document.getElementById('editFrom').value = ad.fromRegion || '';
  document.getElementById('editTo').value = ad.toRegion || '';
  document.getElementById('editStatus').value = ad.status || 'pending';
  document.getElementById('editModal').style.display = 'flex';
}

function saveEdit() {
  const { type, id } = currentEdit;
  const idStr = String(id);
  // find and update in each storage (if exists), otherwise upsert
  ['allAds','driverAds','passengerAds'].forEach(key => {
    let arr = readStorage(key);
    let idx = arr.findIndex(a => String(a.id) === idStr);
    if (idx > -1) {
      arr[idx].phone = document.getElementById('editPhone').value;
      arr[idx].price = document.getElementById('editPrice').value;
      // preserve region/district fields if provided
      arr[idx].fromRegion = document.getElementById('editFrom').value || arr[idx].fromRegion;
      arr[idx].toRegion = document.getElementById('editTo').value || arr[idx].toRegion;
      arr[idx].status = document.getElementById('editStatus').value;
      writeStorage(key, arr);
    }
  });

  // ensure unified storages synced
  const updatedAd = {
    id: idStr,
    type,
    phone: document.getElementById('editPhone').value,
    price: document.getElementById('editPrice').value,
    fromRegion: document.getElementById('editFrom').value,
    toRegion: document.getElementById('editTo').value,
    status: document.getElementById('editStatus').value,
    date: new Date().toLocaleString()
  };
  upsertAdToStorages(updatedAd);

  closeModal();
  renderAds();
  updateStats();
}

function closeModal() {
  document.getElementById('editModal').style.display = 'none';
}

// === DELETE AD ===
function deleteAd(type, id) {
  const idStr = String(id);
  ['allAds','driverAds','passengerAds'].forEach(key => {
    let arr = readStorage(key);
    arr = arr.filter(a => String(a.id) !== idStr);
    writeStorage(key, arr);
  });
  renderAds();
  updateStats();
}

// === STATS ===
function updateStats() {
  const { unified } = getAllSources();
  const all = unified;
  const stats = {
    drivers: all.filter(a => a.type === 'driver').length,
    passengers: all.filter(a => a.type === 'passenger').length,
    approved: all.filter(a => a.status === 'approved').length,
    rejected: all.filter(a => a.status === 'rejected').length,
    pending: all.filter(a => !a.status || a.status === 'pending').length
  };
  writeStorage('stats', stats);
}

// === NAVIGATION ===
function goToStats() {
  updateStats();
  window.location.href = 'admin-stat.html';
}
function goToAdd() {
  window.location.href = 'admin-add.html';
}

// INITIALIZE
window.onload = () => {
  renderAds();
  updateStats();
  setInterval(() => renderAds(), 5000);
};
</script>
