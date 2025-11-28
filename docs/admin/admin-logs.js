/* =====================================================================
   ADMIN LOGS + FIREBASE (ALL-IN-ONE FILE)
   Bitta fayl ichida Firebase v10 + loglarni yuklash + filtrlash + render
   ===================================================================== */

// ------------------- FIREBASE INIT -------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  onValue
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

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

console.log("FIREBASE INITIALIZED");


// ------------------- DOM ELEMENTLAR -------------------
const searchInput = document.getElementById("searchInput");
const dateFrom = document.getElementById("dateFrom");
const dateTo = document.getElementById("dateTo");

const filterBtn = document.getElementById("filterBtn");
const resetBtn = document.getElementById("resetBtn");

const logsBody = document.getElementById("logsBody");
const paginationInfo = document.getElementById("paginationInfo");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");


// ------------------- STATE -------------------
let ALL_LOGS = [];
let FILTERED = [];

let currentPage = 1;
const pageSize = 20;


// ------------------- LOGS YUKLASH -------------------
async function loadLogs() {
  try {
    const logsRef = ref(db, "admin_logs");
    const snapshot = await get(logsRef);

    if (!snapshot.exists()) {
      console.warn("Loglar yo‘q");
      ALL_LOGS = [];
      applyFilters();
      return;
    }

    const data = snapshot.val();

    ALL_LOGS = Object.entries(data).map(([id, log]) => ({
      id,
      ...log
    }));

    // sort desc
    ALL_LOGS.sort((a, b) => b.time - a.time);

    console.log("LOGS LOADED:", ALL_LOGS);

    applyFilters();

  } catch (err) {
    console.error("loadLogs error:", err);
  }
}


// ------------------- FILTRLASH -------------------
function applyFilters() {
  const q = searchInput.value.trim().toLowerCase();
  const from = dateFrom.value ? new Date(dateFrom.value).getTime() : null;
  const to = dateTo.value ? new Date(dateTo.value).getTime() + 86399999 : null;

  FILTERED = ALL_LOGS.filter(log => {
    let text = `${log.action} ${log.admin} ${log.target}`.toLowerCase();
    if (q && !text.includes(q)) return false;

    if (from && log.time < from) return false;
    if (to && log.time > to) return false;

    return true;
  });

  currentPage = 1;
  renderTable();
}


// ------------------- TABLE RENDER -------------------
function renderTable() {
  logsBody.innerHTML = "";

  if (FILTERED.length === 0) {
    logsBody.innerHTML = `
      <tr>
        <td colspan="5" class="px-3 py-4 text-center text-gray-500">
          Hech nima topilmadi
        </td>
      </tr>`;
    paginationInfo.textContent = `0 / 0`;
    return;
  }

  const totalPages = Math.ceil(FILTERED.length / pageSize);
  const start = (currentPage - 1) * pageSize;
  const pageItems = FILTERED.slice(start, start + pageSize);

  pageItems.forEach((log, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="px-3 py-2">${start + idx + 1}</td>
      <td class="px-3 py-2">${log.action}</td>
      <td class="px-3 py-2">${log.target || "-"}</td>
      <td class="px-3 py-2">${log.admin || "-"}</td>
      <td class="px-3 py-2">${formatDate(log.time)}</td>
    `;
    logsBody.appendChild(tr);
  });

  paginationInfo.textContent = `${currentPage} / ${totalPages}`;
}


// ------------------- PAGINATION -------------------
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


// ------------------- UTIL -------------------
function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleString();
}


// ------------------- EVENTS -------------------
filterBtn.addEventListener("click", applyFilters);
resetBtn.addEventListener("click", () => {
  searchInput.value = "";
  dateFrom.value = "";
  dateTo.value = "";
  applyFilters();
});


// ------------------- START -------------------
loadLogs();
