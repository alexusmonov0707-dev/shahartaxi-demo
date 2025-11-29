// ------------------ IMPORT FIREBASE ------------------
import {
  db,
  ref,
  get,
  push,
  set
} from "./firebase.js";

// ------------------ ELEMENTS ------------------
const tbody = document.getElementById("logsTableBody");
const searchInput = document.getElementById("searchInput");
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");

const prevBtn = document.getElementById("prevPageBtn");
const nextBtn = document.getElementById("nextPageBtn");
const pageInfo = document.getElementById("paginationInfo");

const filterBtn = document.getElementById("filterBtn");
const clearBtn = document.getElementById("clearBtn");
const testBtn = document.getElementById("testLogBtn");

// ------------------ DATA ------------------
let logs = [];
let filteredLogs = [];

let currentPage = 1;
let pageSize = 30;

// ------------------ LOAD LOGS ------------------
async function loadLogs() {
  try {
    const snap = await get(ref(db, "admin_logs"));
    logs = [];

    if (!snap.exists()) {
      renderTable([]);
      return;
    }

    snap.forEach(userSnap => {

      // ❗ timestamp node-ni o'tkazib yuboramiz
      if (typeof userSnap.val() !== "object") {
        return;
      }

      userSnap.forEach(logSnap => {
        const data = logSnap.val();

        logs.push({
          id: logSnap.key,
          action: data.action || "-",
          admin: data.admin || "unknown",
          target: data.target || "-",
          time: data.time || 0
        });
      });
    });

    logs.sort((a, b) => b.time - a.time);
    applyFilters();

  } catch (err) {
    console.error("Loglarni olishda xato:", err);
  }
}


// ------------------ FILTERS ------------------
function applyFilters() {
  let search = searchInput.value.trim().toLowerCase();
  let start = startDateInput.value ? new Date(startDateInput.value).getTime() : 0;
  let end = endDateInput.value ? new Date(endDateInput.value).getTime() + 86400000 : Infinity;

  filteredLogs = logs.filter(log => {
    let matchText =
      log.action.toLowerCase().includes(search) ||
      log.admin.toLowerCase().includes(search) ||
      log.target.toLowerCase().includes(search);

    let matchDate = log.time >= start && log.time <= end;
    return matchText && matchDate;
  });

  currentPage = 1;
  renderPage();
}

// ------------------ RENDER PAGE ------------------
function renderPage() {
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));

  if (currentPage > totalPages) currentPage = totalPages;
  let start = (currentPage - 1) * pageSize;
  let end = start + pageSize;

  let pageItems = filteredLogs.slice(start, end);

  renderTable(pageItems);
  pageInfo.textContent = `${currentPage} / ${totalPages}`;
}

// ------------------ RENDER TABLE ------------------
function renderTable(rows) {
  tbody.innerHTML = "";

  if (!rows.length) {
    tbody.innerHTML = `<tr>
      <td colspan="5" style="text-align:center; padding:20px;">Hech narsa topilmadi</td>
    </tr>`;
    return;
  }

  rows.forEach((log, index) => {
    let tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${log.action}</td>
      <td>${log.target}</td>
      <td>${log.admin}</td>
      <td>${formatTime(log.time)}</td>
    `;

    tbody.appendChild(tr);
  });
}

// ------------------ FORMAT DATE ------------------
function formatTime(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("uz-UZ");
}

// ------------------ PAGINATION ------------------
prevBtn.onclick = () => {
  if (currentPage > 1) {
    currentPage--;
    renderPage();
  }
};

nextBtn.onclick = () => {
  const totalPages = Math.ceil(filteredLogs.length / pageSize);
  if (currentPage < totalPages) {
    currentPage++;
    renderPage();
  }
};

// ------------------ CLEAR FILTER ------------------
clearBtn.onclick = () => {
  searchInput.value = "";
  startDateInput.value = "";
  endDateInput.value = "";
  applyFilters();
};

// ------------------ APPLY FILTER BUTTON ------------------
filterBtn.onclick = () => applyFilters();

// ------------------ TEST LOG ------------------
testBtn.onclick = async () => {
  try {
    const testRef = push(ref(db, "admin_logs/test_admin"));
    await set(testRef, {
      action: "test-action",
      admin: "test-panel",
      target: "test-target",
      time: Date.now()
    });

    alert("Test log yozildi!");
    loadLogs();

  } catch (e) {
    console.error(e);
    alert("Xatolik!");
  }
};

// ------------------ INIT ------------------
loadLogs();
