import { db, ref, onValue, get } from "./firebase_v10.js";

// DOM
const logsTableBody = document.getElementById("logsTableBody");
const searchInput = document.getElementById("searchInput");
const filterBtn = document.getElementById("filterBtn");
const resetBtn = document.getElementById("resetBtn");
const dateFrom = document.getElementById("dateFrom");
const dateTo = document.getElementById("dateTo");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const paginationInfo = document.getElementById("paginationInfo");

let ALL_LOGS = [];
let FILTERED = [];

let page = 1;
let pageSize = 30;

// Format
function fmtDate(ts) {
    const d = new Date(ts);
    return d.toLocaleString("uz-UZ");
}

// Load Logs
function loadLogs() {
    onValue(ref(db, "admin_logs"), (snap) => {
        const val = snap.val() || {};

        ALL_LOGS = Object.entries(val).map(([id, log]) => ({
            id,
            ...log
        })).sort((a, b) => b.timestamp - a.timestamp);

        FILTERED = ALL_LOGS;
        page = 1;
        renderTable();
    });
}

// Apply filters
function applyFilters() {
    const q = searchInput.value.trim().toLowerCase();
    const from = dateFrom.value ? new Date(dateFrom.value).getTime() : null;
    const to = dateTo.value ? new Date(dateTo.value + " 23:59:59").getTime() : null;

    FILTERED = ALL_LOGS.filter(l => {
        const matchText =
            (l.action || "").toLowerCase().includes(q) ||
            (l.admin || "").toLowerCase().includes(q) ||
            (l.target || "").toLowerCase().includes(q);

        if (!matchText) return false;

        if (from && l.timestamp < from) return false;
        if (to && l.timestamp > to) return false;

        return true;
    });

    page = 1;
    renderTable();
}

// Reset filters
function resetFilters() {
    searchInput.value = "";
    dateFrom.value = "";
    dateTo.value = "";
    FILTERED = ALL_LOGS;
    page = 1;
    renderTable();
}

// Render table
function renderTable() {
    logsTableBody.innerHTML = "";

    const total = FILTERED.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) page = totalPages;

    const start = (page - 1) * pageSize;
    const rows = FILTERED.slice(start, start + pageSize);

    if (rows.length === 0) {
        logsTableBody.innerHTML = `
            <tr><td colspan="5" style="padding:10px;">Hech narsa topilmadi</td></tr>`;
    } else {
        rows.forEach((l, idx) => {
            const tr = document.createElement("tr");
            tr.className = "log-row";
            tr.innerHTML = `
                <td>${start + idx + 1}</td>
                <td>${l.action}</td>
                <td>${l.target}</td>
                <td>${l.admin}</td>
                <td>${fmtDate(l.timestamp)}</td>
            `;
            logsTableBody.appendChild(tr);
        });
    }

    paginationInfo.textContent = `${page} / ${totalPages}`;
}

// Pagination
prevPageBtn.onclick = () => {
    if (page > 1) {
        page--;
        renderTable();
    }
};
nextPageBtn.onclick = () => {
    const totalPages = Math.ceil(FILTERED.length / pageSize);
    if (page < totalPages) {
        page++;
        renderTable();
    }
};

// Bind
filterBtn.onclick = applyFilters;
resetBtn.onclick = resetFilters;

// Init
loadLogs();
