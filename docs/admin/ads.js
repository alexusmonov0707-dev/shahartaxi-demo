/* -------------------------
   FINAL FULLY FIXED ADS.JS
   ShaharTaxi Admin Panel
---------------------------- */

/* UTILITIES */
function el(id) { return document.getElementById(id); }
function fmtDate(ts) {
    if (!ts) return "—";
    const d = new Date(Number(ts));
    return isNaN(d.getTime()) ? "—" : d.toLocaleString();
}
function safeNum(v, def = 0) {
    const n = Number(v);
    return isNaN(n) ? def : n;
}

/* DOM ELEMENTS */
const searchInput = el("searchInput");
const fromRegionFilter = el("fromRegionFilter");
const toRegionFilter = el("toRegionFilter");
const fromDistrictFilter = el("fromDistrictFilter");
const toDistrictFilter = el("toDistrictFilter");

const minPrice = el("minPrice");
const maxPrice = el("maxPrice");
const seatsFilter = el("seatsFilter");
const categoryFilter = el("categoryFilter");
const dateFrom = el("dateFrom");
const dateTo = el("dateTo");
const userIdFilter = el("userIdFilter");

const applyFiltersBtn = el("applyFiltersBtn");
const resetFiltersBtn = el("resetFiltersBtn");

const sortBy = el("sortBy");
const pageSize = el("pageSize");
const prevPageBtn = el("prevPageBtn");
const nextPageBtn = el("nextPageBtn");
const paginationInfo = el("paginationInfo");

const tableWrap = el("tableWrap");
const adsTableBody = el("adsTableBody");
const loadingSkeleton = el("loadingSkeleton");

const realtimeToggle = el("realtimeToggle");
const btnExportCsv = el("btnExportCsv");

/* STATE */
let ALL_ADS = [];
let FILTERED = [];
let currentPage = 1;
let currentPageSize = 50;
let realtimeEnabled = realtimeToggle?.checked;
let adsRef = null;
let realtimeAttached = false;

/* -------------------------
   WAIT FOR FIREBASE
---------------------------- */
function waitForFirebase() {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const check = () => {
            if (window.firebase && firebase.database) return resolve(firebase);
            if (Date.now() - start > 7000) return reject("Firebase load timeout");
            setTimeout(check, 100);
        };
        check();
    });
}

/* -------------------------
   FLATTEN (1 / 2 / 3 LEVEL)
---------------------------- */
function flattenAdsSnapshot(snapshot) {
    const results = [];
    if (!snapshot || !snapshot.exists()) return results;

    const root = snapshot.val();
    if (!root || typeof root !== "object") return results;

    Object.entries(root).forEach(([k, v]) => {

        // LEVEL 1 → ads/adId
        if (isAdItem(v)) {
            results.push({ id: k, data: v });
            return;
        }

        // LEVEL 2 → ads/category/adId
        if (v && typeof v === "object") {
            Object.entries(v).forEach(([k2, v2]) => {

                if (isAdItem(v2)) {
                    results.push({ id: k2, data: v2 });
                    return;
                }

                // LEVEL 3 → ads/userId/adId/data
                if (v2 && typeof v2 === "object") {
                    Object.entries(v2).forEach(([k3, v3]) => {
                        if (isAdItem(v3)) {
                            results.push({ id: k3, data: v3 });
                        }
                    });
                }

            });
        }
    });

    return results;
}

function isAdItem(obj) {
    return obj &&
        typeof obj === "object" &&
        (obj.createdAt || obj.fromRegion || obj.toRegion || obj.price);
}

/* -------------------------
   INIT
---------------------------- */
waitForFirebase().then(() => init());

function init() {
    currentPageSize = Number(pageSize.value) || 50;

    if (realtimeEnabled) attachRealtime();
    else loadOnce();

    applyFiltersBtn.onclick = () => applyFilters(true);
    resetFiltersBtn.onclick = resetFilters;

    sortBy.onchange = () => applyFilters(true);
    pageSize.onchange = () => {
        currentPageSize = Number(pageSize.value);
        currentPage = 1;
        renderTable();
    };

    prevPageBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    };

    nextPageBtn.onclick = () => {
        const totalPages = Math.ceil(FILTERED.length / currentPageSize);
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    };

    realtimeToggle.onchange = e => {
        realtimeEnabled = e.target.checked;
        if (realtimeEnabled) attachRealtime();
        else detachRealtime(), loadOnce();
    };

    btnExportCsv.onclick = exportCSV;
}

/* -------------------------
   REALTIME LISTENER
---------------------------- */
function attachRealtime() {
    if (realtimeAttached) return;

    adsRef = firebase.database().ref("ads");

    adsRef.on("value", snap => {
        ALL_ADS = flattenAdsSnapshot(snap);
        normalizeCategories();
        fillFilterOptions();
        renderTableWithoutFiltering();
    });

    realtimeAttached = true;
}

function detachRealtime() {
    if (adsRef && realtimeAttached) adsRef.off();
    realtimeAttached = false;
}

/* -------------------------
   LOAD ONCE
---------------------------- */
function loadOnce() {
    firebase.database().ref("ads").once("value").then(snap => {
        ALL_ADS = flattenAdsSnapshot(snap);
        normalizeCategories();
        fillFilterOptions();
        renderTableWithoutFiltering();
    });
}

/* Normalize: category default */
function normalizeCategories() {
    ALL_ADS.forEach(item => {
        if (!item.data.category)
            item.data.category = item.data.type || "taxi";
    });
}

/* -------------------------
   FILL FILTER OPTIONS
---------------------------- */
function fillFilterOptions() {
    const frSet = new Set();
    const trSet = new Set();
    const fdSet = new Set();
    const tdSet = new Set();

    ALL_ADS.forEach(({ data }) => {
        if (data.fromRegion) frSet.add(data.fromRegion);
        if (data.toRegion) trSet.add(data.toRegion);
        if (data.fromDistrict) fdSet.add(data.fromDistrict);
        if (data.toDistrict) tdSet.add(data.toDistrict);
    });

    fillSelect(fromRegionFilter, frSet);
    fillSelect(toRegionFilter, trSet);
    fillSelect(fromDistrictFilter, fdSet);
    fillSelect(toDistrictFilter, tdSet);
}

function fillSelect(select, set) {
    const old = select.value;
    select.innerHTML = `<option value="">Hammasi</option>`;
    Array.from(set).sort().forEach(v => {
        const opt = document.createElement("option");
        opt.value = v;
        opt.textContent = v;
        select.appendChild(opt);
    });
    select.value = old;
}

/* -------------------------
   APPLY FILTERS
---------------------------- */
function applyFilters(reset = true) {
    const q = searchInput.value.trim().toLowerCase();
    const fr = fromRegionFilter.value.toLowerCase();
    const tr = toRegionFilter.value.toLowerCase();
    const fd = fromDistrictFilter.value.toLowerCase();
    const td = toDistrictFilter.value.toLowerCase();

    let seatsMin = 0;
    if (seatsFilter.value) seatsMin = Number(seatsFilter.value.replace("+", ""));

    const cat = categoryFilter.value.toLowerCase();
    const uid = userIdFilter.value.trim().toLowerCase();

    const minP = safeNum(minPrice.value, 0);
    const maxP = safeNum(maxPrice.value, Number.MAX_SAFE_INTEGER);

    let dateStart = dateFrom.value ? new Date(dateFrom.value).getTime() : null;
    let dateEnd = dateTo.value ? new Date(dateTo.value).getTime() : null;

    FILTERED = ALL_ADS.filter(({ data }) => {

        if (q) {
            const text = (
                (data.comment || "") +
                (data.fromRegion || "") +
                (data.toRegion || "") +
                (data.userId || "")
            ).toLowerCase();
            if (!text.includes(q)) return false;
        }

        if (fr && (data.fromRegion || "").toLowerCase() !== fr) return false;
        if (tr && (data.toRegion || "").toLowerCase() !== tr) return false;
        if (fd && (data.fromDistrict || "").toLowerCase() !== fd) return false;
        if (td && (data.toDistrict || "").toLowerCase() !== td) return false;

        if (cat && (data.category || "").toLowerCase() !== cat) return false;
        if (uid && !(data.userId || "").toLowerCase().includes(uid)) return false;

        const p = safeNum(data.price);
        if (p < minP || p > maxP) return false;

        const s = safeNum(data.seats || data.driverSeats);
        if (seatsMin && s < seatsMin) return false;

        const created = safeNum(data.createdAt);
        if (dateStart && created < dateStart) return false;
        if (dateEnd && created > dateEnd) return false;

        return true;
    });

    sortFiltered();

    if (reset) currentPage = 1;
    renderTable();
}

/* -------------------------
   SORTING
---------------------------- */
function sortFiltered() {
    const [field, dir] = sortBy.value.split("_");

    FILTERED.sort((a, b) => {
        let A = a.data[field];
        let B = b.data[field];

        if (field === "createdAt" || field === "price" || field === "seats") {
            A = safeNum(A);
            B = safeNum(B);
            return dir === "asc" ? A - B : B - A;
        }

        A = String(A || "").toLowerCase();
        B = String(B || "").toLowerCase();
        return dir === "asc" ? A.localeCompare(B) : B.localeCompare(A);
    });
}

/* -------------------------
   RENDER TABLE
---------------------------- */
function renderTableWithoutFiltering() {
    FILTERED = ALL_ADS;
    currentPage = 1;
    renderTable();
}

function renderTable() {
    adsTableBody.innerHTML = "";

    const total = FILTERED.length;
    const totalPages = Math.max(1, Math.ceil(total / currentPageSize));

    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * currentPageSize;
    const pageItems = FILTERED.slice(start, start + currentPageSize);

    if (!pageItems.length) {
        adsTableBody.innerHTML = `<tr><td colspan="8">Hech nima topilmadi</td></tr>`;
    } else {
        pageItems.forEach((item, idx) => {
            const d = item.data;
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${start + idx + 1}</td>
                <td>${d.fromRegion}<div class="text-xs">${d.fromDistrict || ""}</div></td>
                <td>${d.toRegion}<div class="text-xs">${d.toDistrict || ""}</div></td>
                <td>${d.seats || d.driverSeats || ""}</td>
                <td>${d.price || ""}</td>
                <td>${d.category || "taxi"}</td>
                <td>${fmtDate(d.createdAt)}</td>
                <td>
                    <button class="btn-view" data-id="${item.id}">Ko'rish</button>
                    <button class="btn-delete" data-id="${item.id}">O'chirish</button>
                </td>
            `;

            adsTableBody.appendChild(tr);
        });

        adsTableBody.querySelectorAll(".btn-view").forEach(btn => {
            btn.onclick = () => viewAd(btn.dataset.id);
        });

        adsTableBody.querySelectorAll(".btn-delete").forEach(btn => {
            btn.onclick = () => deleteAd(btn.dataset.id);
        });
    }

    paginationInfo.innerText = `${currentPage} / ${totalPages} sahifa — ${total} e'lon`;
    loadingSkeleton.style.display = "none";
    tableWrap.classList.remove("hidden");
}

/* -------------------------
   VIEW AD
---------------------------- */
function viewAd(id) {
    const item = ALL_ADS.find(x => x.id === id);
    if (!item) return alert("Ad topilmadi");

    const d = item.data;
    alert(
        `ID: ${id}\nUser: ${d.userId}\nFrom: ${d.fromRegion} ${d.fromDistrict}\nTo: ${d.toRegion} ${d.toDistrict}\nSeats: ${d.seats}\nPrice: ${d.price}\nCreated: ${fmtDate(d.createdAt)}`
    );
}

/* -------------------------
   DELETE
---------------------------- */
function deleteAd(id) {
    if (!confirm("O‘chirishga ishonchingiz komilmi?")) return;

    const root = firebase.database().ref("ads");

    // remove level 1, 2, 3
    root.once("value").then(snap => {
        let removed = false;

        snap.forEach(level1 => {
            level1.forEach(level2 => {
                if (level2.key === id) {
                    level2.ref.remove();
                    removed = true;
                }

                level2.forEach(level3 => {
                    if (level3.key === id) {
                        level3.ref.remove();
                        removed = true;
                    }
                });
            });
        });

        if (!removed) alert("Topilmadi!");
        else alert("O‘chirildi!");

    });
}

/* -------------------------
   RESET
---------------------------- */
function resetFilters() {
    searchInput.value = "";
    fromRegionFilter.value = "";
    toRegionFilter.value = "";
    fromDistrictFilter.value = "";
    toDistrictFilter.value = "";
    minPrice.value = "";
    maxPrice.value = "";
    seatsFilter.value = "";
    categoryFilter.value = "";
    dateFrom.value = "";
    dateTo.value = "";
    userIdFilter.value = "";
    applyFilters(true);
}

/* -------------------------
   CSV EXPORT
---------------------------- */
function exportCSV() {
    if (!FILTERED.length) return alert("Hech narsa yo‘q");

    const rows = [];
    const header = [
        "id", "userId", "category", "fromRegion",
        "fromDistrict", "toRegion", "toDistrict",
        "seats", "price", "departureTime",
        "createdAt", "comment"
    ];

    rows.push(header.join(","));

    FILTERED.forEach(({ id, data }) => {
        rows.push([
            id,
            data.userId || "",
            data.category || "taxi",
            data.fromRegion || "",
            data.fromDistrict || "",
            data.toRegion || "",
            data.toDistrict || "",
            data.seats || "",
            data.price || "",
            data.departureTime || "",
            data.createdAt || "",
            data.comment || ""
        ].join(","));
    });

    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ads_export.csv";
    a.click();
}
