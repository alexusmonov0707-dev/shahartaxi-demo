// -------------------------------
// IMPORT FIREBASE
// -------------------------------
import {
  db,
  ref,
  get,
  push,
  set
} from "./firebase.js";


// -------------------------------
// DOM ELEMENTLAR
// -------------------------------
const searchInput = document.getElementById("searchInput");
const fromDate = document.getElementById("fromDate");
const toDate = document.getElementById("toDate");

const logsTableBody = document.getElementById("logsTableBody");
const paginationInfo = document.getElementById("paginationInfo");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const filterBtn = document.getElementById("filterBtn");
const resetBtn = document.getElementById("resetBtn");

// -------------------------------
// GLOBAL STATE
// -------------------------------
let ALL_LOGS = [];
let FILTERED = [];
let currentPage = 1;
let pageSize = 20;


// -------------------------------
// FORMAT DATE
// -------------------------------
function fmt(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString();
}


// -------------------------------
// LOAD ADMIN LOGS
// -------------------------------
async function loadLogs() {
  try {
    const snapshot = await get(ref(db, "admin_logs"));

    const data = snapshot.val();

    if (!data) {
      ALL_LOGS = [];
      renderTable();
      return;
    }

    // flatten → {id, data}
    ALL_LOGS = Object.keys(data).map(id => ({
      id,
      ...data[id]
    }));

    applyFilters();

  } catch (err) {
    console.error("Loglarni olishda xato:", err);
  }
}


// -------------------------------
// FILTER FUNKSIYASI
// -------------------------------
function applyFilters() {
  let q = (searchInput.value || "").toLowerCase().trim();
  let d1 = fromDate.value ? new Date(fromDate.value + " 00:00:00").getTime() : 0;
  let d2 = toDate.value ? new Date(toDate.value + " 23:59:59").getTime() : Infinity;

  FILTERED = ALL_LOGS.filter(log => {
    let haystack = `${log.action} ${log.target} ${log.admin}`.toLowerCase();

    // text search
    if (q && !haystack.includes(q)) return false;

    // date filter
    if (log.time < d1) return false;
    if (log.time > d2) return false;

    return true;
  });

  currentPage = 1;
  renderTable();
}


// -------------------------------
// RESET FILTERS
// -------------------------------
function resetFilters() {
  searchInput.value = "";
  fromDate.value = "";
  toDate.value = "";
  applyFilters();
}


// -------------------------------
// PAGINATION RENDER
// -------------------------------
function renderTable() {
  logsTableBody.innerHTML = "";

  let total = FILTERED.length;
  let totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (currentPage > totalPages) currentPage = totalPages;

  let start = (currentPage - 1) * pageSize;
  let end = start + pageSize;

  let pageSlice = FILTERED.slice(start, end);

  if (pageSlice.length === 0) {
    logsTableBody.innerHTML = `
      <tr><td colspan="5" class="text-center py-4">Hech narsa topilmadi</td></tr>
    `;
  } else {
    pageSlice.forEach((log, idx) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${start + idx + 1}</td>
        <td>${log.action}</td>
        <td>${log.target}</td>
        <td>${log.admin}</td>
        <td>${fmt(log.time)}</td>
      `;

      logsTableBody.appendChild(tr);
    });
  }

  paginationInfo.textContent = `${currentPage} / ${totalPages}`;
}


// -------------------------------
// PAGINATION EVENTS
// -------------------------------
prevPageBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderTable();
  }
});

nextPageBtn.addEventListener("click", () => {
  const totalPages = Math.ceil(FILTERED.length / pageSize);
  if (currentPage < totalPages) {
    currentPage++;
    renderTable();
  }
});

filterBtn.addEventListener("click", applyFilters);
resetBtn.addEventListener("click", resetFilters);


// -------------------------------
// LOG YOZILISHI – universal funksiya
// BUNI BOSHQA SAHIFALAR HAM CHAQIRA OLADI
// -------------------------------
export async function logAction(action, target = "-", admin = "admin") {
  try {
    const id = push(ref(db, "admin_logs")).key;

    await set(ref(db, "admin_logs/" + id), {
      action,
      target,
      admin,
      time: Date.now()
    });

  } catch (err) {
    console.error("Log yozishda xato:", err);
  }
}


// -------------------------------
// INITIAL LOAD
// -------------------------------
loadLogs();
