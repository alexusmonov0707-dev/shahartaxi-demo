// admin-logs.js — Admin logs manager (Firebase v10 ESM)
// FAYL JOYI: admin/admin-logs.js
// Bu fayl admin-logs.html bilan bir joyda bo'lishi kerak.

// ---> IMPORT: firebase wrapper (sizning firebase init faylingiz)
import { db, ref, get, push, onValue } from './firebase.js';

// ----------------------------
// DOM
// ----------------------------
const qInput = document.getElementById('qInput');
const dateFrom = document.getElementById('dateFrom');
const dateTo = document.getElementById('dateTo');
const filterBtn = document.getElementById('filterBtn');
const clearBtn = document.getElementById('clearBtn');
const testWriteBtn = document.getElementById('testWriteBtn');

const logsTbody = document.getElementById('logsTbody');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageInfo = document.getElementById('pageInfo');

let ALL_LOGS = [];   // array of { id, data }
let FILTERED = [];
let perPage = 10;
let currentPage = 1;

// ----------------------------
// helper: format date
// ----------------------------
function fmt(ts) {
  if (!ts) return '-';
  const d = new Date(Number(ts));
  if (isNaN(d.getTime())) return '-';
  // YYYY-MM-DD hh:mm:ss (local)
  return d.toLocaleString();
}

// ----------------------------
// flatten snapshot — supports admin_logs/{user}/{logId} structure
// ----------------------------
function flattenAdminLogs(snapshot) {
  const results = [];
  if (!snapshot) return results;
  const root = snapshot.val ? snapshot.val() : snapshot;
  if (!root || typeof root !== 'object') return results;

  // structure: admin_logs -> uid -> logId -> { action, admin, target, time }
  Object.entries(root).forEach(([userKey, node]) => {
    if (!node) return;
    if (typeof node === 'object') {
      Object.entries(node).forEach(([logId, logVal]) => {
        if (logVal && (logVal.action || logVal.time || logVal.admin)) {
          results.push({ id: logId, data: { ...logVal, userKey } });
        }
      });
    }
  });

  // sort newest first by default
  results.sort((a, b) => (Number(b.data.time || 0) - Number(a.data.time || 0)));
  return results;
}

// ----------------------------
// Load logs from Realtime DB once
// ----------------------------
async function loadLogsOnce() {
  logsTbody.innerHTML = `<tr><td colspan="5" class="muted">Yuklanmoqda...</td></tr>`;
  try {
    const logsRef = ref(db, 'admin_logs');
    const snap = await get(logsRef);
    ALL_LOGS = flattenAdminLogs(snap);
    applyFilters();
  } catch (err) {
    console.error('Loglarni yuklash xato:', err);
    logsTbody.innerHTML = `<tr><td colspan="5" class="muted">Loglarni yuklashda xato.</td></tr>`;
  }
}

// ----------------------------
// Attach realtime listener (optional)
// ----------------------------
function attachRealtimeLogs() {
  try {
    const logsRef = ref(db, 'admin_logs');
    onValue(logsRef, (snap) => {
      ALL_LOGS = flattenAdminLogs(snap);
      applyFilters();
    }, (err) => {
      console.error('Realtime admin_logs onValue error:', err);
    });
  } catch (e) {
    console.warn('Realtime attach error:', e);
  }
}

// ----------------------------
// Filtering
// ----------------------------
function applyFilters(resetPage = true) {
  const q = (qInput.value || '').trim().toLowerCase();
  const from = dateFrom.value ? new Date(dateFrom.value + 'T00:00:00').getTime() : null;
  const to = dateTo.value ? new Date(dateTo.value + 'T23:59:59').getTime() : null;

  FILTERED = ALL_LOGS.filter(item => {
    const d = item.data || {};
    if (q) {
      const haystack = [
        d.action || '',
        d.admin || '',
        d.target || '',
        d.userKey || ''
      ].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    const t = Number(d.time || 0);
    if (from && t < from) return false;
    if (to && t > to) return false;

    return true;
  });

  if (resetPage) currentPage = 1;
  renderTable();
}

// ----------------------------
// Render paginated table
// ----------------------------
function renderTable() {
  const total = FILTERED.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * perPage;
  const pageItems = FILTERED.slice(start, start + perPage);

  if (!pageItems.length) {
    logsTbody.innerHTML = `<tr><td colspan="5" class="muted">Hech nima topilmadi</td></tr>`;
  } else {
    logsTbody.innerHTML = pageItems.map((it, idx) => {
      const d = it.data || {};
      return `
        <tr>
          <td>${start + idx + 1}</td>
          <td>${escapeHtml(d.action || '-')}</td>
          <td>${escapeHtml(d.target || '-')}</td>
          <td>${escapeHtml(d.admin || '-')}</td>
          <td>${fmt(d.time)}</td>
        </tr>
      `;
    }).join('');
  }

  pageInfo.textContent = `${currentPage} / ${Math.max(1, Math.ceil(total / perPage))} — ${total} log`;
}

// ----------------------------
// helpers
// ----------------------------
function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
}

// ----------------------------
// pagination controls
// ----------------------------
prevBtn.onclick = () => {
  if (currentPage > 1) {
    currentPage--;
    renderTable();
  }
};
nextBtn.onclick = () => {
  const totalPages = Math.max(1, Math.ceil(FILTERED.length / perPage));
  if (currentPage < totalPages) {
    currentPage++;
    renderTable();
  }
};

// ----------------------------
// UI events
// ----------------------------
filterBtn.onclick = () => applyFilters(true);
clearBtn.onclick = () => {
  qInput.value = '';
  dateFrom.value = '';
  dateTo.value = '';
  applyFilters(true);
};

// Test write: yozish — admin logs ga test yozadi
testWriteBtn.onclick = async () => {
  try {
    const logsRef = ref(db, 'admin_logs');
    // test uchun oddiy yozuv: server timestamp bo'lmasa Date.now()
    const newLog = {
      action: 'test-action',
      target: 'test-target',
      admin: 'unknown',
      time: Date.now()
    };
    await push(logsRef, newLog);
    alert('Test log yozildi');
  } catch (err) {
    console.error('Test log yozishda xato:', err);
    alert('Yozishda xato: ' + (err && err.message));
  }
};

// ----------------------------
// START
// ----------------------------
(function init() {
  // avval realtime ga qo'shilamiz (agar kerak bo'lsa)
  try {
    attachRealtimeLogs();
    // agar realtime ishlamasa, load once fallback:
    // loadLogsOnce();
  } catch (e) {
    console.warn('Realtime attach failed, loading once', e);
    loadLogsOnce();
  }
})();
