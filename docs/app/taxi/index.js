// === GLOBAL VARIABLES ===
let allAds = [];
let filteredAds = [];

let currentPage = 1;
const adsPerPage = 6;

const adsList = document.getElementById("adsList");
const pageInfo = document.getElementById("pageInfo");
const prevBtn = document.getElementById("prevPage");
const nextBtn = document.getElementById("nextPage");

// === LOAD ALL ADS FROM lib.js ===
async function loadAds() {
    adsList.innerHTML = `<div class="loading">Yuklanmoqda...</div>`;

    try {
        allAds = await fetchAllAds();   // <-- lib.js function
        filteredAds = allAds;

        applyFilters();
    } catch (err) {
        adsList.innerHTML = `<div class="loading">Xatolik: ${err}</div>`;
    }
}

// === APPLY FILTERS ===
function applyFilters() {
    const q = document.getElementById("searchInput").value.toLowerCase();
    const minPrice = Number(document.getElementById("minPrice").value) || 0;
    const maxPrice = Number(document.getElementById("maxPrice").value) || 999999999;

    const fromReg = document.getElementById("fromRegion").value;
    const fromDis = document.getElementById("fromDistrict").value;
    const toReg = document.getElementById("toRegion").value;
    const toDis = document.getElementById("toDistrict").value;

    const sort = document.getElementById("sortType").value;

    filteredAds = allAds.filter(ad => {
        if (ad.price < minPrice || ad.price > maxPrice) return false;

        if (fromReg && ad.fromRegion !== fromReg) return false;
        if (fromDis && ad.fromDistrict !== fromDis) return false;
        if (toReg && ad.toRegion !== toReg) return false;
        if (toDis && ad.toDistrict !== toDis) return false;

        if (q) {
            const text = `${ad.fromRegion} ${ad.toRegion} ${ad.comment} ${ad.user}`.toLowerCase();
            if (!text.includes(q)) return false;
        }

        return true;
    });

    if (sort === "new") {
        filteredAds.sort((a,b) => b.createdAt - a.createdAt);
    } else {
        filteredAds.sort((a,b) => a.createdAt - b.createdAt);
    }

    currentPage = 1;
    renderAds();
}

// === RENDER PAGINATION ===
function renderPagination() {
    const totalPages = Math.max(1, Math.ceil(filteredAds.length / adsPerPage));

    pageInfo.textContent = `${currentPage} / ${totalPages}`;

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
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
                Izoh: ${ad.comment || "-"}<br>
                Sana: ${new Date(ad.createdAt).toLocaleString()}
            </div>
        `;
    });

    renderPagination();
}

// === EVENTS ===
document.getElementById("filterBtn").onclick = applyFilters;

document.getElementById("clearBtn").onclick = () => {
    document.querySelectorAll("input").forEach(i => i.value = "");
    document.querySelectorAll("select").forEach(s => s.selectedIndex = 0);
    filteredAds = allAds;
    currentPage = 1;
    renderAds();
};

prevBtn.onclick = () => { currentPage--; renderAds(); };
nextBtn.onclick = () => { currentPage++; renderAds(); };

// === START ===
loadAds();
