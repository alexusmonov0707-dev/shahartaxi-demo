// ============================
//  USER & DATA LOAD
// ============================

// LocalStorage-dan aktiv user
const currentUser = JSON.parse(localStorage.getItem("activeUser") || "{}");

// Agar user bo'lmasa login sahifasiga qaytarish
if (!currentUser.id) {
    window.location.href = "/shahartaxi-demo/login.html";
}

// HTML elementlari
const adsContainer = document.getElementById("ads");
const searchInput = document.getElementById("search");
const priceMin = document.getElementById("priceMin");
const priceMax = document.getElementById("priceMax");
const sortSelect = document.getElementById("sortSelect");
const roleFilter = document.getElementById("roleFilter");
const regionFilter = document.getElementById("regionFilter");
const resetBtn = document.getElementById("resetBtn");

// Taxi viloyatlar (regions-taxi.js yuklangan bo'ladi)
console.log("TAXI REGIONS loaded:", regionsData);

// E’lonlar ro‘yhatini olish
async function loadAds() {
    const ads = JSON.parse(localStorage.getItem("ads") || "[]");
    return ads;
}

// ============================
//   ADS RENDER FUNCTION
// ============================

function renderAds(list) {
    adsContainer.innerHTML = "";

    if (list.length === 0) {
        adsContainer.innerHTML = "<p>Hech qanday e’lon topilmadi.</p>";
        return;
    }

    list.forEach(ad => {
        const div = document.createElement("div");
        div.className = "ad-item";

        div.innerHTML = `
            <h3>${ad.from.region} → ${ad.to.region}</h3>
            <p><b>Narx:</b> ${ad.price} so'm</p>
            <p><b>Kim:</b> ${ad.role === "driver" ? "Haydovchi" : "Yo'lovchi"}</p>
            <small>${new Date(ad.date).toLocaleString()}</small>
        `;

        adsContainer.appendChild(div);
    });
}

// ============================
//   FILTER + SORT
// ============================

function applyFilters(allAds) {
    let filtered = [...allAds];

    // Qidiruv
    const s = searchInput.value.trim().toLowerCase();
    if (s) {
        filtered = filtered.filter(ad =>
            ad.from.region.toLowerCase().includes(s) ||
            ad.to.region.toLowerCase().includes(s) ||
            (ad.comment || "").toLowerCase().includes(s)
        );
    }

    // Narx bo‘yicha filtr
    if (priceMin.value) {
        filtered = filtered.filter(ad => ad.price >= Number(priceMin.value));
    }

    if (priceMax.value) {
        filtered = filtered.filter(ad => ad.price <= Number(priceMax.value));
    }

    // Rol bo‘yicha filtr
    if (roleFilter.value !== "all") {
        filtered = filtered.filter(ad => ad.role === roleFilter.value);
    }

    // Viloyat bo‘yicha filtr
    if (regionFilter.value !== "all") {
        filtered = filtered.filter(
            ad => ad.from.region === regionFilter.value
        );
    }

    // Saralash
    if (sortSelect.value === "newest") {
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    if (sortSelect.value === "oldest") {
        filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    return filtered;
}

// ============================
//   LOGOUT FUNCTION
// ============================

function logout() {
    localStorage.removeItem("activeUser");
    window.location.href = "/shahartaxi-demo/login.html";
}
window.logout = logout; // HTML onclick uchun

// ============================
//   INIT
// ============================

(async () => {
    const ads = await loadAds();
    renderAds(ads);

    // Event listeners
    [searchInput, priceMin, priceMax, sortSelect, roleFilter, regionFilter]
        .forEach(el => el.addEventListener("input", () => {
            renderAds(applyFilters(ads));
        }));

    resetBtn.addEventListener("click", () => {
        location.reload();
    });
})();
