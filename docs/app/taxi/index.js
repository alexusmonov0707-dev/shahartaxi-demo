// === GLOBAL ===
let allAds = [];
let filteredAds = [];
let currentPage = 1;
const adsPerPage = 6;

const adsList = document.getElementById("adsList");
const prevBtn = document.getElementById("prevPage");
const nextBtn = document.getElementById("nextPage");
const pageInfo = document.getElementById("pageInfo");

// === START: load ads using lib.js ===
async function init() {
    adsList.innerHTML = `<div class="loading">Yuklanmoqda...</div>`;

    try {
        // lib.js dan keladi
        allAds = await fetchAllAds();

        // agar hech narsa bo‘lmasa
        if (!Array.isArray(allAds)) allAds = [];

        filteredAds = [...allAds];

        applyFilters();
    } catch (err) {
        adsList.innerHTML = `<div class="loading">Xatolik: ${err.message}</div>`;
    }
}

// === FILTERS ===
function applyFilters() {
    const q = document.getElementById("searchInput").value.toLowerCase();
    const minPrice = Number(document.getElementById("minPrice").value) || 0;
    const maxPrice = Number(document.getElementById("maxPrice").value) || 999999999;

    const fromRegion = document.getElementById("fromRegion").value;
    const fromDistrict = document.getElementById("fromDistrict").value;
    const toRegion = document.getElementById("toRegion").value;
    const toDistrict = document.getElementById("toDistrict").value;

    const sortType = document.getElementById("sortType").value;

    filteredAds = allAds.filter(ad => {
        if (ad.price < minPrice || ad.price > maxPrice) return false;
        if (fromRegion && ad.fromRegion !== fromRegion) return false;
        if (fromDistrict && ad.fromDistrict !== fromDistrict) return false;
        if (toRegion && ad.toRegion !== toRegion) return false;
        if (toDistrict && ad.toDistrict !== toDistrict) return false;

        if (q) {
            const text = `
                ${ad.comment || ""}
                ${ad.fromRegion}
                ${ad.toRegion}
                ${ad.user || ""}
            `.toLowerCase();
            if (!text.includes(q)) return false;
        }

        return true;
    });

    // SORT
    if (sortType === "new") filteredAds.sort((a,b) => b.createdAt - a.createdAt);
    else filteredAds.sort((a,b) => a.createdAt - b.createdAt);

    currentPage = 1;
    renderAds();
}

// === RENDER ADS ===
function renderAds() {
    adsList.innerHTML = "";

    if (filteredAds.length === 0) {
        adsList.innerHTML = `<div class="loading">Hech nima topilmadi</div>`;
        renderPagination();
        return;
    }

    const start = (currentPage - 1) * adsPerPage;
    const pageAds = filteredAds.slice(start, start + adsPerPage);

    pageAds.forEach(ad => {
        adsList.innerHTML += `
        <div class="ad-card">
            <b>${ad.fromRegion} → ${ad.toRegion}</b><br>
            Narx: <b>${ad.price}</b> so'm<br>
            Joylar: ${ad.seats}<br>
            Vaqt: ${new Date(ad.createdAt).toLocaleString()}<br>
            Izoh: ${ad.comment || "-"}
        </div>`;
    });

    renderPagination();
}

// === PAGINATION ===
function renderPagination() {
    const total = Math.max(1, Math.ceil(filteredAds.length / adsPerPage));

    pageInfo.textContent = `${currentPage} / ${total}`;

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === total;
}

prevBtn.onclick = () => { if (currentPage > 1) { currentPage--; renderAds(); } };
nextBtn.onclick = () => {
    const total = Math.ceil(filteredAds.length / adsPerPage);
    if (currentPage < total) { currentPage++; renderAds(); }
};

document.getElementById("filterBtn").onclick = applyFilters;

document.getElementById("clearBtn").onclick = () => {
    document.querySelectorAll("input").forEach(i => i.value = "");
    document.querySelectorAll("select").forEach(s => s.selectedIndex = 0);
    filteredAds = [...allAds];
    currentPage = 1;
    renderAds();
};

// === RUN ===
init();
