/**
 * admin-logs.js
 * - self-contained module (imports Firebase v10 from CDN)
 * - reads /admin_logs (or /admin_logs) realtime
 * - supports search, date range, pagination
 * - tolerant to small differences in field names (timestamp vs time)
 *
 * Usage: put this file in the same folder as admin-logs.html and include:
 * <script type="module" src="./admin-logs.js"></script>
 */

// ------------------------- FIREBASE (CDN ESM) -------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getDatabase,
  ref as dbRef,
  get as dbGet,
  onValue as dbOnValue
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

// Replace with your project's config (kept same as you used earlier)
const firebaseConfig = {
  apiKey: "AIzaSyApWUG40YuC9aCsE9MOLXwLcYgRihREWvc",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
  projectId: "shahartaxi-demo",
  storageBucket: "shahartaxi-demo.appspot.com",
  messagingSenderId: "874241795701",
  appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ------------------------- DOM SELECTORS (tolerant) -------------------------
const $ = id => document.getElementById(id);

const searchInput = $("searchInput");
const dateFromEl = $("dateFrom");
const dateToEl = $("dateTo");
const filterBtn = $("filterBtn") || $("applyFiltersBtn");
const resetBtn = $("resetBtn") || $("resetFiltersBtn");

// table body id may be logsTableBody or logsBody in different HTML versions
const logsTbody = $("logsTableBody") || $("logsBody") || (function(){
  // try to find the first tbody in page's main card (fallback)
  const tb = document.querySelector("tbody");
  return tb || null;
})();

const prevPageBtn = $("prevPageBtn");
const nextPageBtn = $("nextPageBtn");
const paginationInfo = $("paginationInfo") || $("paginationInfoSpan") || (function(){
  const el = document.querySelector(".pagination span, #paginationInfo");
  return el || null;
})();

// safety checks
if (!logsTbody) {
  console.warn("admin-logs.js: logs table body not found (expected id 'logsTableBody' or 'logsBody').");
}
if (!filterBtn) console.warn("admin-logs.js: filter button not found (id 'filterBtn' or 'applyFiltersBtn').");
if (!resetBtn) console.warn("admin-logs.js: reset button not found (id 'resetBtn' or 'resetFiltersBtn').");
if (!prevPageBtn || !nextPageBtn) console.warn("admin-logs.js: pagination buttons missing.");
if (!paginationInfo) console.warn("admin-logs.js: pagination info element missing.");

// ------------------------- STATE -------------------------
let ALL_LOGS = [];   // full list from DB [{id, action, target, admin, timestamp|time, ...}]
let FILTERED = [];   // after search/date filter
let currentPage = 1;
const PAGE_SIZE = 20;

// helper: normalize log timestamp field
function getLogTime(log) {
  // supports log.timestamp, log.time, log.ts
  const t = log && (log.timestamp || log.time || log.ts);
  return Number(t) || 0;
}

// date formatting
function fmtDate(ts) {
  if (!ts) return "-";
  const d = new Date(Number(ts));
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

// escape html (very small)
function esc(s) {
  if (s === null || s === undefined) return "";
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// ------------------------- RENDER TABLE -------------------------
function renderTable() {
  if (!logsTbody) return;

  logsTbody.innerHTML = "";

  const total = FILTERED.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageSlice = FILTERED.slice(start, start + PAGE_SIZE);

  if (pageSlice.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="5" style="padding:18px;">Hech nima topilmadi</td>`;
    logsTbody.appendChild(tr);
  } else {
    pageSlice.forEach((log, idx) => {
      const rowIndex = start + idx + 1;
      const action = esc(log.action || log.type || "-");
      const target = esc(log.target || log.ref || log.subject || "-");
      const admin = esc(log.admin || "-");
      const timestamp = getLogTime(log);
      const dateStr = fmtDate(timestamp);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="px-3 py-2 text-sm">${rowIndex}</td>
        <td class="px-3 py-2 text-sm">${action}</td>
        <td class="px-3 py-2 text-sm">${target}</td>
        <td class="px-3 py-2 text-sm">${admin}</td>
        <td class="px-3 py-2 text-sm">${dateStr}</td>
      `;
      logsTbody.appendChild(tr);
    });
  }

  // pagination info
  if (paginationInfo) {
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    paginationInfo.innerText = `${currentPage} / ${totalPages}`;
  }
}

// ------------------------- APPLY FILTERS -------------------------
function applyFilters() {
  const q = (searchInput && searchInput.value || "").trim().toLowerCase();
  const fromVal = (dateFromEl && dateFromEl.value) ? new Date(dateFromEl.value + "T00:00:00").getTime() : null;
  const toVal = (dateToEl && dateToEl.value) ? (new Date(dateToEl.value + "T23:59:59").getTime()) : null;

  FILTERED = ALL_LOGS.filter(log => {
    // search in action, admin, target
    const text = `${log.action || log.type || ""} ${log.admin || ""} ${log.target || log.ref || ""}`.toLowerCase();
    if (q && !text.includes(q)) return false;

    const t = getLogTime(log);
    if (fromVal && t < fromVal) return false;
    if (toVal && t > toVal) return false;

    return true;
  });

  currentPage = 1;
  renderTable();
}

// ------------------------- RESET -------------------------
function resetFilters() {
  if (searchInput) searchInput.value = "";
  if (dateFromEl) dateFromEl.value = "";
  if (dateToEl) dateToEl.value = "";
  FILTERED = ALL_LOGS.slice();
  currentPage = 1;
  renderTable();
}

// ------------------------- PAGINATION HANDLERS -------------------------
if (prevPageBtn) prevPageBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderTable();
  }
});
if (nextPageBtn) nextPageBtn.addEventListener("click", () => {
  const totalPages = Math.max(1, Math.ceil(FILTERED.length / PAGE_SIZE));
  if (currentPage < totalPages) {
    currentPage++;
    renderTable();
  }
});

// ------------------------- UI EVENTS -------------------------
if (filterBtn) filterBtn.addEventListener("click", applyFilters);
if (resetBtn) resetBtn.addEventListener("click", resetFilters);
if (searchInput) {
  // searchEnter
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") applyFilters();
  });
}

// ------------------------- LOAD LOGS (REALTIME + ONE-TIME FALLBACK) -------------------------
function subscribeLogsRealtime() {
  try {
    const logsRef = dbRef(db, "admin_logs");
    dbOnValue(logsRef, snap => {
      const val = snap.val() || {};
      ALL_LOGS = Object.entries(val).map(([id, it]) => ({ id, ...it }));
      // normalize time field names and ensure number
      ALL_LOGS.forEach(l => {
        // keep both for safety
        if (!l.timestamp && l.time) l.timestamp = l.time;
        if (!l.time && l.timestamp) l.time = l.timestamp;
      });
      // sort newest first (by timestamp or time)
      ALL_LOGS.sort((a, b) => getLogTime(b) - getLogTime(a));
      // initial filtered copy
      FILTERED = ALL_LOGS.slice();
      currentPage = 1;
      renderTable();
    }, err => {
      console.error("Realtime admin_logs onValue error:", err);
      // fallback to one-time load on error
      loadLogsOnce();
    });
  } catch (err) {
    console.error("subscribeLogsRealtime error:", err);
    loadLogsOnce();
  }
}

async function loadLogsOnce() {
  try {
    const snap = await dbGet(dbRef(db, "admin_logs"));
    const val = snap.exists() ? snap.val() : {};
    ALL_LOGS = Object.entries(val || {}).map(([id, it]) => ({ id, ...it }));
    ALL_LOGS.forEach(l => { if (!l.timestamp && l.time) l.timestamp = l.time; if (!l.time && l.timestamp) l.time = l.timestamp; });
    ALL_LOGS.sort((a, b) => getLogTime(b) - getLogTime(a));
    FILTERED = ALL_LOGS.slice();
    currentPage = 1;
    renderTable();
  } catch (err) {
    console.error("loadLogsOnce error:", err);
    ALL_LOGS = [];
    FILTERED = [];
    renderTable();
  }
}

// Start
subscribeLogsRealtime();

// ------------------------- OPTIONAL: expose a helper to add logs from other modules -------------------------
export async function logAction(action, target, adminName) {
  // helper to push a log from browser (only if used)
  try {
    const pushModule = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js");
    const pushFn = pushModule.push;
    const refFn = pushModule.ref;
    const logsRef = refFn(db, "admin_logs");
    await pushFn(logsRef, {
      action,
      target,
      admin: adminName || sessionStorage.getItem("admin") || "unknown",
      timestamp: Date.now()
    });
  } catch (err) {
    console.error("logAction error:", err);
  }
}
