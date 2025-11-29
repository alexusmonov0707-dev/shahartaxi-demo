// =========================================================
//  FIREBASE INIT (ESM v10)
// =========================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  push,
  set
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


// =========================================================
//  ELEMENTLARNI OLAMIZ
// =========================================================
const tbody = document.getElementById("logsTableBody");
const paginationInfo = document.getElementById("paginationInfo");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");

const searchInput = document.getElementById("searchInput");
const fromDate = document.getElementById("fromDate");
const toDate = document.getElementById("toDate");
const filterBtn = document.getElementById("filterBtn");
const clearBtn = document.getElementById("clearBtn");
const testBtn = document.getElementById("testBtn");


// =========================================================
//  GLOBAL OZGARUVCHILAR
// =========================================================
let allLogs = [];
let filteredLogs = [];
let currentPage = 1;
const pageSize = 20;


// =========================================================
//  ADMIN LOG OLISH
// =========================================================
async function loadLogs() {
  tbody.innerHTML = `<tr><td colspan="5">Yuklanmoqda...</td></tr>`;

  try {
    const logsRef = ref(db, "admin_logs");
    const snap = await get(logsRef);

    if (!snap.exists()) {
      tbody.innerHTML = `<tr><td colspan="5">Hech nima topilmadi</td></tr>`;
      return;
    }

    allLogs = [];

    snap.forEach(userNode => {
      const userId = userNode.key;

      userNode.forEach(logNode => {
        const logId = logNode.key;
        const log = logNode.val();

        allLogs.push({
          id: logId,
          action: log.action || "-",
          target: log.target || "-",
          admin: log.admin || "-",
          time: log.time || 0
        });
      });
    });

    // Yangi loglarni oxirida emas → yuqorida chiqishi uchun
    allLogs.sort((a, b) => b.time - a.time);

    applyFilters();

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5">Xatolik: ${err}</td></tr>`;
  }
}


// =========================================================
//  FILTRLARNI QO‘LLASH
// =========================================================
function applyFilters() {
  const text = searchInput.value.toLowerCase();
  const from = fromDate.value ? new Date(fromDate.value).getTime() : 0;
  const to = toDate.value ? new Date(toDate.value).getTime() + 86400000 : Infinity;

  filteredLogs = allLogs.filter(log => {
    const t = log.time || 0;
    const textMatch =
      log.action.toLowerCase().includes(text) ||
      log.target.toLowerCase().includes(text) ||
      log.admin.toLowerCase().includes(text);

    return textMatch && t >= from && t <= to;
  });

  currentPage = 1;
  renderPage();
}


// =========================================================
//  SAHIFA CHIZISH
// =========================================================
function renderPage() {
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));

  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * pageSize;
  const items = filteredLogs.slice(start, start + pageSize);

  tbody.innerHTML = "";

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5">Hech nima topilmadi</td></tr>`;
  } else {
    items.forEach((log, index) => {
      const date = new Date(log.time).toLocaleString("uz-UZ");

      tbody.innerHTML += `
        <tr>
          <td>${start + index + 1}</td>
          <td>${log.action}</td>
          <td>${log.target}</td>
          <td>${log.admin}</td>
          <td>${date}</td>
        </tr>`;
    });
  }

  paginationInfo.textContent = `${currentPage} / ${totalPages}`;
}


// =========================================================
//  PAGINATSIYA
// =========================================================
prevPageBtn.onclick = () => {
  if (currentPage > 1) {
    currentPage--;
    renderPage();
  }
};

nextPageBtn.onclick = () => {
  const totalPages = Math.ceil(filteredLogs.length / pageSize);
  if (currentPage < totalPages) {
    currentPage++;
    renderPage();
  }
};


// =========================================================
//  FILTR TUGMALARI
// =========================================================
filterBtn.onclick = () => applyFilters();

clearBtn.onclick = () => {
  searchInput.value = "";
  fromDate.value = "";
  toDate.value = "";
  applyFilters();
};


// =========================================================
//  TEST LOG YOZISH (tekshirish uchun)
// =========================================================
testBtn.onclick = async () => {
  const testRef = ref(db, "admin_logs/testUser");
  const newRef = push(testRef);

  await set(newRef, {
    action: "test-action",
    target: "test-target",
    admin: "test-admin",
    time: Date.now()
  });

  alert("Test log yozildi!");
  loadLogs();
};


// =========================================================
//  BOSHLASH
// =========================================================
loadLogs();
