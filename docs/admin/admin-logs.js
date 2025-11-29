// admin-logs.js — to'liq, ESM module (joylashtirish: docs/admin/admin-logs.js)
// Ushbu fayl firebase.js bilan bir papkada bo'lishi kerak.

// Import firebase wrapper (sening firebase.js faylingga mos)
import { db, ref, get, push, onValue, logAction as firebaseLogAction } from "./firebase.js";

// ----------------------- DOM refs (baribir mavjudligini tekshiramiz) -----------------------
const $ = id => document.getElementById(id);

const searchInput = $("searchInput");
const fromDate = $("fromDate");
const toDate = $("toDate");
const filterBtn = $("filterBtn");
const resetBtn = $("resetBtn");
const testLogBtn = $("testLogBtn");

const logsTableBody = $("logsTableBody");
const prevPageBtn = $("prevPageBtn");
const nextPageBtn = $("nextPageBtn");
const paginationInfo = $("paginationInfo");

// minimal safety
if (!logsTableBody) {
  console.error("admin-logs.js: #logsTableBody topilmadi");
}

// ----------------------- State -----------------------
let ALL_LOGS = [];   // [{ id, action, target, admin, timestamp }]
let FILTERED = [];
let currentPage = 1;
const PAGE_SIZE = 20;

// ----------------------- Utils -----------------------
function fmtDate(ts) {
  if (!ts) return "-";
  const d = new Date(Number(ts));
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function safeStr(v) {
  if (v === null || v === undefined) return "-";
  return String(v);
}

// ----------------------- Render -----------------------
function renderTable() {
  if (!logsTableBody) return;

  logsTableBody.innerHTML = "";

  const total = FILTERED.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const start = (currentPage - 1) * PAGE_SIZE;
  const page = FILTERED.slice(start, start + PAGE_SIZE);

  if (page.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="5" style="padding:18px;">Hech nima topilmadi</td>`;
    logsTableBody.appendChild(tr);
  } else {
    page.forEach((log, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${start + i + 1}</td>
        <td>${safeStr(log.action)}</td>
        <td>${safeStr(log.target)}</td>
        <td>${safeStr(log.admin)}</td>
        <td>${fmtDate(log.timestamp || log.time || log.ts)}</td>
      `;
      logsTableBody.appendChild(tr);
    });
  }

  if (paginationInfo) paginationInfo.innerText = `${currentPage} / ${totalPages}`;
}

// ----------------------- Filtering -----------------------
function applyFilters() {
  // defensive: if inputs missing, treat as "no filter"
  const q = (searchInput && searchInput.value || "").trim().toLowerCase();
  const from = (fromDate && fromDate.value) ? new Date(fromDate.value + "T00:00:00").getTime() : null;
  const to = (toDate && toDate.value) ? new Date(toDate.value + "T23:59:59").getTime() : null;

  FILTERED = ALL_LOGS.filter(l => {
    // search by action/admin/target
    const haystack = `${l.action || ""} ${l.admin || ""} ${l.target || ""}`.toLowerCase();
    if (q && !haystack.includes(q)) return false;

    const ts = Number(l.timestamp || l.time || l.ts) || 0;
    if (from && ts < from) return false;
    if (to && ts > to) return false;

    return true;
  });

  currentPage = 1;
  renderTable();
}

function resetFilters() {
  if (searchInput) searchInput.value = "";
  if (fromDate) fromDate.value = "";
  if (toDate) toDate.value = "";
  applyFilters();
}

// ----------------------- Pagination handlers -----------------------
if (prevPageBtn) prevPageBtn.addEventListener("click", () => {
  if (currentPage > 1) { currentPage--; renderTable(); }
});
if (nextPageBtn) nextPageBtn.addEventListener("click", () => {
  const totalPages = Math.max(1, Math.ceil(FILTERED.length / PAGE_SIZE));
  if (currentPage < totalPages) { currentPage++; renderTable(); }
});

// ----------------------- UI events -----------------------
if (filterBtn) filterBtn.addEventListener("click", applyFilters);
if (resetBtn) resetBtn.addEventListener("click", resetFilters);

// Test button — sahifada tugma bor: bosilsa test log yozadi.
// (agar test tugmasi yo'q bo'lsa, hech narsa bo'lmaydi)
if (testLogBtn) testLogBtn.addEventListener("click", async () => {
  try {
    // bu function firebase.js ichida ham export qilingan logAction bilan bir xil nomli
    if (typeof firebaseLogAction === "function") {
      await firebaseLogAction("test-action", "test-target");
      // qisqa xabar berish (vizual) — quyidagi chiziqni o'zgartirish mumkin
      alert("Test log yozildi — sahifani yangilang (Ctrl+Shift+R)");
    } else {
      // fallback: push bevosita (agar firebase wrapperda push va ref eksport qilingan bo'lsa)
      const { push, ref } = await import("./firebase.js");
      await push(ref(db, "admin_logs"), { action: "test-action", target: "test-target", admin: "test", timestamp: Date.now() });
      alert("Test log yozildi (fallback) — sahifani yangilang");
    }
  } catch (err) {
    console.error("Test log yozishda xato:", err);
    alert("Test log yozishda xato: konsolni tekshir");
  }
});

// ----------------------- Subscribe realtime (preferable) / fallback load -----------------------
function attachRealtime() {
  try {
    const logsRef = ref(db, "admin_logs");
    // onValue imported from firebase wrapper
    onValue(logsRef, snap => {
      const val = snap.val();
      if (!val) {
        ALL_LOGS = [];
        FILTERED = [];
        renderTable();
        return;
      }
      // flatten
      ALL_LOGS = Object.entries(val).map(([id, data]) => {
        // ensure timestamp field named consistently
        if (!data.timestamp && data.time) data.timestamp = data.time;
        if (!data.timestamp && data.ts) data.timestamp = data.ts;
        return { id, ...data };
      });

      // sort newest first
      ALL_LOGS.sort((a, b) => (Number(b.timestamp || 0) - Number(a.timestamp || 0)));

      // initially show all
      FILTERED = ALL_LOGS.slice();
      currentPage = 1;
      renderTable();
    }, err => {
      console.error("Realtime admin_logs xato:", err);
      // fallback to one-time load
      loadOnce();
    });
  } catch (err) {
    console.error("attachRealtime error:", err);
    loadOnce();
  }
}

async function loadOnce() {
  try {
    const snap = await get(ref(db, "admin_logs"));
    const val = snap ? snap.val() : null;
    if (!val) {
      ALL_LOGS = [];
      FILTERED = [];
      renderTable();
      return;
    }
    ALL_LOGS = Object.entries(val).map(([id, data]) => {
      if (!data.timestamp && data.time) data.timestamp = data.time;
      if (!data.timestamp && data.ts) data.timestamp = data.ts;
      return { id, ...data };
    });
    ALL_LOGS.sort((a,b) => Number(b.timestamp||0) - Number(a.timestamp||0));
    FILTERED = ALL_LOGS.slice();
    renderTable();
  } catch (err) {
    console.error("loadOnce error:", err);
    ALL_LOGS = [];
    FILTERED = [];
    renderTable();
  }
}

// Start realtime subscription
attachRealtime();

// ----------------------- Export helper logAction (agar boshqa fayllar chaqirmoqchi bo'lsa) -----------------------
// Ammo sening firebase.js ichida ham logAction mavjud (agar kerak fallback qilish)
// Quyidagi funksiya boshqa modullardan import qilinishi mumkin
export async function logAction(action, target, adminName = null) {
  try {
    // agar firebase.js da logAction eksport bo'lsa uni chaqiramiz
    if (typeof firebaseLogAction === "function") {
      await firebaseLogAction(action, target);
      return;
    }
    // fallback: push bevosita
    const { push, ref } = await import("./firebase.js");
    await push(ref(db, "admin_logs"), { action, target, admin: adminName || "admin", timestamp: Date.now() });
  } catch (err) {
    console.error("logAction (fallback) error:", err);
  }
}
