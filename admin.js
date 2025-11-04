// === CONFIG ===
const ADMIN_USER = 'admin';
const ADMIN_PASSWORD = 'shahartaxi2025';
const ADMIN_TOKEN_KEY = 'shaharTaxiAdminToken';
const PAGE_SIZE = 10; // pagination
let currentPage = 1;
let currentSearch = '';
let notificationsEnabled = false;

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

// === UTIL: parse date from various formats ===
function parseAdDate(dateStr) {
  if (!dateStr) return null;
  // Try ISO parse
  const d1 = new Date(dateStr);
  if (!isNaN(d1)) return d1;
  // Try common "DD.MM.YYYY HH:mm" or "DD.MM.YYYY"
  const match = String(dateStr).match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (match) {
    const [, day, month, year, hour = '0', minute = '0'] = match;
    return new Date(+year, +month - 1, +day, +hour, +minute);
  }
  // fallback null
  return null;
}

// === RENDER ADS with search, filters, pagination and checkboxes ===
function renderAds() {
  const { driver, passenger } = getAds();

  // Ensure IDs (existing one-time fix kept)
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

  // Gather filters
  const typeFilter = document.getElementById('typeFilter').value;
  const statusFilter = document.getElementById('statusFilter').value;
  const sortFilter = document.getElementById('sortFilter') ? document.getElementById('sortFilter').value : 'desc';
  const search = currentSearch.trim().toLowerCase();

  let ads = [];
  if (typeFilter === 'driver') ads = driver.map(a => ({ ...a, type: 'driver' }));
  else if (typeFilter === 'passenger') ads = passenger.map(a => ({ ...a, type: 'passenger' }));
  else ads = [
    ...driver.map(a => ({ ...a, type: 'driver' })),
    ...passenger.map(a => ({ ...a, type: 'passenger' }))
  ];

  if (statusFilter !== 'all') ads = ads.filter(a => (a.status || 'pending') === statusFilter);

  // Search filter (by phone or id)
  if (search) {
    ads = ads.filter(a => {
      const phone = String(a.phone || '').toLowerCase();
      const id = String(a.id || '').toLowerCase();
      return phone.includes(search) || id.includes(search);
    });
  }

  // Sort by createdAt using parseAdDate; missing date -> 0
  ads.sort((a, b) => {
    const dateA = parseAdDate(a.createdAt) || new Date(0);
    const dateB = parseAdDate(b.createdAt) || new Date(0);
    return sortFilter === 'asc' ? dateA - dateB : dateB - dateA;
  });

  // Pagination
  const total = ads.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (currentPage > pageCount) currentPage = pageCount;
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageAds = ads.slice(start, start + PAGE_SIZE);

  const container = document.getElementById('ads');
  container.innerHTML = '';
  document.getElementById('adsInfo').textContent = `Topilgan e’lonlar: ${total} — Sahifa ${currentPage}/${pageCount}`;

  if (ads.length === 0) {
    container.innerHTML = '<p>E’lonlar topilmadi.</p>';
    renderPagination(0, 1);
    return;
  }

  // Render each ad with checkbox
  pageAds.forEach(ad => {
    const from = ad.fromDistrict && ad.fromRegion
      ? `${ad.fromRegion} ${ad.fromDistrict}` : (ad.fromRegion || ad.from || '—');
    const to = ad.toDistrict && ad.toRegion
      ? `${ad.toRegion} ${ad.toDistrict}` : (ad.toRegion || ad.to || '—');

    const createdDate = ad.createdAt ? (parseAdDate(ad.createdAt) ? parseAdDate(ad.createdAt).toLocaleString() : ad.createdAt) : '—';

    const div = document.createElement('div');
    div.className = 'ad';
    div.innerHTML = `
      <div class="ad-left">
        <input type="checkbox" id="select_${ad.id}" data-id="${ad.id}" />
      </div>
      <div class="ad-body">
        <div class="ad-meta"><b>Turi:</b> ${ad.type === 'driver' ? 'Haydovchi' : 'Yo‘lovchi'} — <b>ID:</b> ${ad.id}</div>
        <div class="ad-meta"><b>Yo‘nalish:</b> ${from} → ${to}</div>
        <div class="ad-meta"><b>Telefon:</b> ${ad.phone || 'Noma’lum'} — <b>Narx:</b> ${ad.price ? ad.price + ' so‘m' : 'Ko‘rsatilmagan'}</div>
        <div class="ad-meta"><b>Sana:</b> ${createdDate}</div>
        <div class="ad-meta"><b>Holat:</b> <span class="status">${getStatusText(ad.status)}</span></div>

        <div class="actions" id="actions_${ad.id}">
          <button class="approve" onclick="updateStatus('${ad.type}', '${ad.id}', 'approved')">Tasdiqlash</button>
          <button class="reject" onclick="updateStatus('${ad.type}', '${ad.id}', 'rejected')">Rad etish</button>
          <button class="edit" onclick="openEdit('${ad.type}', '${ad.id}')">Modal tahrirlash</button>
          <button class="small-btn" onclick="startInlineEdit('${ad.type}', '${ad.id}')">Inline tahrir</button>
          <button class="delete" onclick="deleteAd('${ad.type}', '${ad.id}')">O‘chirish</button>
        </div>
      </div>
    `;
    container.appendChild(div);
  });

  renderPagination(pageCount, currentPage);
}

// === Pagination render ===
function renderPagination(pageCount, page) {
  const c = document.getElementById('paginationControls');
  c.innerHTML = '';
  if (pageCount <= 1) return;
  const prev = document.createElement('button');
  prev.textContent = '◀';
  prev.onclick = () => { if (currentPage > 1) { currentPage--; renderAds(); } };
  c.appendChild(prev);

  // show up to 7 pages
  const start = Math.max(1, page - 3);
  const end = Math.min(pageCount, page + 3);
  for (let i = start; i <= end; i++) {
    const b = document.createElement('button');
    b.textContent = i;
    b.style.background = i === page ? '#0056b3' : '';
    b.onclick = () => { currentPage = i; renderAds(); };
    c.appendChild(b);
  }

  const next = document.createElement('button');
  next.textContent = '▶';
  next.onclick = () => { if (currentPage < pageCount) { currentPage++; renderAds(); } };
  c.appendChild(next);
}

// === SEARCH helper ===
function onSearchChange() {
  currentSearch = document.getElementById('searchInput').value;
  currentPage = 1;
  renderAds();
}

// === SELECT ALL toggle ===
function selectAllToggle() {
  const check = document.querySelectorAll('#ads input[type="checkbox"]');
  if (check.length === 0) return;
  // if any unchecked -> check all; else uncheck all
  const anyUnchecked = Array.from(check).some(cb => !cb.checked);
  check.forEach(cb => cb.checked = anyUnchecked);
}

// === Get selected ads (returns array of {type,id}) ===
function getSelectedIds() {
  const selected = [];
  document.querySelectorAll('#ads input[type="checkbox"]').forEach(cb => {
    if (cb.checked) selected.push(cb.dataset.id);
  });
  // Map to full objects (search both lists)
  const { driver, passenger } = getAds();
  const all = [...driver.map(a => ({...a, type:'driver'})), ...passenger.map(a => ({...a, type:'passenger'}))];
  return all.filter(a => selected.includes(String(a.id)));
}

// === Bulk update status ===
function bulkUpdateStatus(newStatus) {
  const selected = getSelectedIds();
  if (selected.length === 0) {
    alert('Iltimos, avval e’lonlarni tanlang!');
    return;
  }
  if (!confirm(`Tanlangan ${selected.length} e’lonni "${newStatus}" qilinsinmi?`)) return;

  const grouped = { driver: [], passenger: [] };
  selected.forEach(ad => grouped[ad.type].push(ad.id));

  ['driver','passenger'].forEach(type => {
    if (grouped[type].length === 0) return;
    const key = type === 'driver' ? 'driverAds' : 'passengerAds';
    const ads = JSON.parse(localStorage.getItem(key)) || [];
    let changed = false;
    ads.forEach(a => {
      if (grouped[type].includes(String(a.id))) {
        const old = a.status || 'pending';
        a.status = newStatus;
        saveApprovalHistory({
          id: a.id,
          type,
          from: a.fromDistrict || a.fromRegion || a.from || '—',
          to: a.toDistrict || a.toRegion || a.to || '—',
          oldStatus: old,
          newStatus
        });
        changed = true;
        // push notification for user
        pushUserNotification(a.phone, a.id, old, newStatus, a.fromRegion||a.from, a.toRegion||a.to);
      }
    });
    if (changed) localStorage.setItem(key, JSON.stringify(ads));
  });

  renderAds();
  updateStats();
  alert('Bulk operatsiya bajarildi.');
}

// === UPDATE STATUS (keeps history & notifications) ===
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

    // send notification to user
    pushUserNotification(ads[index].phone, ads[index].id, oldStatus, newStatus, ads[index].fromRegion||ads[index].from, ads[index].toRegion||ads[index].to);
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

// === PUSH USER NOTIFICATION (localStorage + Notifications API) ===
function pushUserNotification(phone, adId, oldStatus, newStatus, from, to) {
  // Store notification so profile can read if needed
  const notifStore = JSON.parse(localStorage.getItem('userNotifications')) || [];
  notifStore.push({
    phone,
    adId,
    oldStatus,
    newStatus,
    message: newStatus === 'approved' ? `✅ E’lon tasdiqlandi: ${from} → ${to}` : `❌ E’lon rad etildi: ${from} → ${to}`,
    date: new Date().toISOString()
  });
  localStorage.setItem('userNotifications', JSON.stringify(notifStore));

  // Try browser Notification (if permission and enabling toggled)
  if (notificationsEnabled && "Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification('ShaharTaxi', { body: (newStatus === 'approved' ? 'E’lon tasdiqlandi' : 'E’lon rad etildi') + ` — ${from} → ${to}` });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(p => {
        if (p === "granted") {
          new Notification('ShaharTaxi', { body: (newStatus === 'approved' ? 'E’lon tasdiqlandi' : 'E’lon rad etildi') + ` — ${from} → ${to}` });
        }
      });
    }
  }
}

// === Toggle notifications on admin UI (for demo) ===
function toggleNotifications() {
  notificationsEnabled = !notificationsEnabled;
  alert('Notifications ' + (notificationsEnabled ? 'yoqildi' : 'o‘chirildi') + '. Foydalanuvchi brauzeri ruxsat berishi kerak.');
}

// === FIX OLD history (unchanged) ===
function fixApprovalHistory() {
  let approvalHistory = JSON.parse(localStorage.getItem("approvalHistory")) || [];
  let driverAds = JSON.parse(localStorage.getItem("driverAds")) || [];
  let passengerAds = JSON.parse(localStorage.getItem("passengerAds")) || [];

  let updated = false;
  approvalHistory = approvalHistory.map(history => {
    if (!history.id || history.id === "undefined" || history.id === "—") {
      const matchedAd = [...driverAds, ...passengerAds].find(
        ad => (ad.type === history.type || true) && (
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
function closeHistory() { document.getElementById('historyModal').style.display = 'none'; }

// === EDIT MODAL & INLINE EDIT ===
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
    const oldStatus = ads[index].status || 'pending';
    ads[index].phone = document.getElementById('editPhone').value;
    ads[index].price = document.getElementById('editPrice').value;
    ads[index].from = document.getElementById('editFrom').value;
    ads[index].to = document.getElementById('editTo').value;
    ads[index].status = document.getElementById('editStatus').value;
    localStorage.setItem(key, JSON.stringify(ads));

    if (oldStatus !== ads[index].status) {
      saveApprovalHistory({
        id: ads[index].id,
        type,
        from: ads[index].fromDistrict || ads[index].fromRegion || ads[index].from || '—',
        to: ads[index].toDistrict || ads[index].toRegion || ads[index].to || '—',
        oldStatus,
        newStatus: ads[index].status
      });
      pushUserNotification(ads[index].phone, ads[index].id, oldStatus, ads[index].status, ads[index].fromRegion||ads[index].from, ads[index].toRegion||ads[index].to);
    }
  }
  closeModal();
  renderAds();
  updateStats();
}
function closeModal() { document.getElementById('editModal').style.display = 'none'; }

// Inline edit in-card (adds inputs to actions area)
function startInlineEdit(type, id) {
  const key = type === 'driver' ? 'driverAds' : 'passengerAds';
  const ads = JSON.parse(localStorage.getItem(key)) || [];
  const ad = ads.find(a => String(a.id) === String(id));
  if (!ad) return;
  if (ad.edited) { alert('❗ Ushbu e’lon oldin tahrirlangan. Qayta o‘zgartirish mumkin emas.'); return; }

  const actions = document.getElementById(`actions_${id}`);
  if (!actions) return;
  // replace actions with inline inputs
  actions.innerHTML = `
    <input id="inlinePrice_${id}" class="inline-edit-input" type="number" value="${ad.price || ''}" placeholder="Narx">
    <button class="small-btn" onclick="saveInlineAdmin('${type}','${id}')">💾 Saqlash</button>
    <button class="small-btn" onclick="renderAds()">❌ Bekor</button>
  `;
}

function saveInlineAdmin(type, id) {
  const key = type === 'driver' ? 'driverAds' : 'passengerAds';
  const ads = JSON.parse(localStorage.getItem(key)) || [];
  const ad = ads.find(a => String(a.id) === String(id));
  if (!ad) return;
  const newPrice = document.getElementById(`inlinePrice_${id}`).value.trim();
  if (!newPrice) { alert('Narx kiriting'); return; }
  ad.price = newPrice;
  ad.edited = true;
  localStorage.setItem(key, JSON.stringify(ads));
  alert('E’lon tahrirlandi (inline).');
  renderAds();
}

// === DELETE AD ===
function deleteAd(type, id) {
  if (!confirm('Haqiqatan o‘chirilsinmi?')) return;
  const key = type === 'driver' ? 'driverAds' : 'passengerAds';
  let ads = JSON.parse(localStorage.getItem(key)) || [];
  ads = ads.filter(a => String(a.id) !== String(id));
  localStorage.setItem(key, JSON.stringify(ads));
  renderAds();
  updateStats();
}

// === STATS UPDATE ===
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
function goToStats() { updateStats(); window.location.href = 'admin-stat.html'; }
function goToAdd() { window.location.href = 'admin-add.html'; }

// === CSV Export/Import ===
function exportAllCSV() {
  const { driver, passenger } = getAds();
  const all = [...driver.map(a => ({...a, type:'driver'})), ...passenger.map(a => ({...a, type:'passenger'}))];
  if (all.length === 0) { alert('E’lonlar yo‘q'); return; }
  const headers = Object.keys(all[0]);
  const rows = [headers.join(',')].concat(all.map(a => headers.map(h => `"${String(a[h]||'').replace(/"/g,'""')}"`).join(',')));
  const csv = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `shahartaxi_ads_${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url);
}

function importCSV(files) {
  if (!files || !files[0]) return;
  const file = files[0];
  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target.result;
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) { alert('CSV bo‘sh yoki noto‘g‘ri'); return; }
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g,'').trim());
    const rows = lines.slice(1).map(l => {
      // naive CSV parse: split by "," not inside quotes
      const values = l.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
      return values.map(v => v.replace(/^"|"$/g,''));
    });
    const ads = rows.map(vals => {
      const obj = {};
      headers.forEach((h,i) => obj[h] = vals[i] || '');
      // try to push as driver or passenger depending on obj.type
      return obj;
    });

    // split by type
    const driverAds = JSON.parse(localStorage.getItem('driverAds')) || [];
    const passengerAds = JSON.parse(localStorage.getItem('passengerAds')) || [];
    ads.forEach(a => {
      if (a.type === 'driver') driverAds.push(a);
      else passengerAds.push(a);
    });
    localStorage.setItem('driverAds', JSON.stringify(driverAds));
    localStorage.setItem('passengerAds', JSON.stringify(passengerAds));
    alert('CSV import bajarildi.');
    renderAds();
    updateStats();
  };
  reader.readAsText(file, 'utf-8');
}

// === STANDARDIZE createdAt dates (mass-fix) ===
function standardizeDates() {
  if (!confirm('Eski e’lonlardagi sana formatlarini ISO formatga o‘zgartirishni xohlaysizmi?')) return;
  ['driverAds', 'passengerAds'].forEach(key => {
    let ads = JSON.parse(localStorage.getItem(key)) || [];
    ads = ads.map(a => {
      if (!a.createdAt) {
        // leave as is
        return a;
      }
      const parsed = parseAdDate(a.createdAt);
      if (parsed) a.createdAt = parsed.toISOString();
      return a;
    });
    localStorage.setItem(key, JSON.stringify(ads));
  });
  alert('Sana formatlari yangilandi.');
  renderAds();
}

// === ONE-TIME FIX: eski e’lonlarga ID berish (unchanged) ===
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
  setInterval(() => { renderAds(); updateStats(); }, 5000);
};

// === Helper: search from other scripts can call this ===
window.adminRefresh = () => { renderAds(); updateStats(); };

