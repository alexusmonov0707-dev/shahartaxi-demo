// =========================
// 1. LOGIN TEKSHIRISH
// =========================
const user = JSON.parse(localStorage.getItem("user"));

if (!user || !user.uid) {
    localStorage.removeItem("user");
    window.location.href = "login.html";
}

// =========================
// 2. ELEMENTLAR
// =========================
const adsList = document.getElementById("adsList");
const loading = document.getElementById("loading");

const fromRegion = document.getElementById("fromRegion");
const fromDistrict = document.getElementById("fromDistrict");
const regionSelect = document.getElementById("regionSelect");

// =========================
// 3. REGIONS LOAD
// =========================

Object.keys(regionsData).forEach(region => {
    fromRegion.innerHTML += `<option value="${region}">${region}</option>`;
    regionSelect.innerHTML += `<option value="${region}">${region}</option>`;
});

fromRegion.onchange = () => {
    const region = fromRegion.value;
    fromDistrict.innerHTML = `<option value="">Tuman</option>`;
    if (!region) return;

    regionsData[region].forEach(d => {
        fromDistrict.innerHTML += `<option value="${d}">${d}</option>`;
    });
};

// =========================
// 4. E’LONLARNI YUKLASH
// =========================

let AllAds = [];

async function loadAds() {
    loading.style.display = "block";
    adsList.innerHTML = "";

    const db = firebase.database().ref("ads");
    db.on("value", snapshot => {
        AllAds = [];
        snapshot.forEach(child => {
            AllAds.push({ id: child.key, ...child.val() });
        });

        loading.style.display = "none";
        renderAds(AllAds);
    });
}

loadAds();

// =========================
// 5. E’LONLARNI CHIZISH
// =========================

function renderAds(list) {
    adsList.innerHTML = "";

    if (list.length === 0) {
        adsList.innerHTML = "<p>E’lon topilmadi...</p>";
        return;
    }

    list.forEach(ad => {
        adsList.innerHTML += `
            <div class="ad-card">
                <p><b>${ad.fromRegion} ${ad.fromDistrict}</b> → <b>${ad.toRegion} ${ad.toDistrict}</b></p>
                <p>Narx: <b>${ad.price}</b> so'm</p>
                <p>Sanasi: ${ad.date}</p>
                <p>${ad.comment || ""}</p>
            </div>
        `;
    });
}

// =========================
// 6. FILTRLAR
// =========================

function applyFilters() {
    let filtered = [...AllAds];

    const s = document.getElementById("searchInput").value.toLowerCase();
    const sort = document.getElementById("sortSelect").value;
    const time = document.getElementById("timeSelect").value;
    const min = document.getElementById("minPrice").value;
    const max = document.getElementById("maxPrice").value;

    const region = regionSelect.value;
    const fr = fromRegion.value;
    const fd = fromDistrict.value;

    if (s) {
        filtered = filtered.filter(ad =>
            JSON.stringify(ad).toLowerCase().includes(s)
        );
    }

    if (region) filtered = filtered.filter(a => a.fromRegion === region);
    if (fr) filtered = filtered.filter(a => a.fromRegion === fr);
    if (fd) filtered = filtered.filter(a => a.fromDistrict === fd);

    if (min) filtered = filtered.filter(a => a.price >= min);
    if (max) filtered = filtered.filter(a => a.price <= max);

    if (sort === "new") filtered.sort((a, b) => b.createdAt - a.createdAt);
    if (sort === "old") filtered.sort((a, b) => a.createdAt - b.createdAt);

    renderAds(filtered);
}

document.querySelectorAll("input,select").forEach(el => {
    el.oninput = applyFilters;
});

// =========================
// 7. RESET
// =========================
function resetFilters() {
    document.getElementById("searchInput").value = "";
    document.getElementById("sortSelect").value = "new";
    document.getElementById("timeSelect").value = "all";
    document.getElementById("minPrice").value = "";
    document.getElementById("maxPrice").value = "";
    regionSelect.value = "";
    fromRegion.value = "";
    fromDistrict.innerHTML = `<option value="">Tuman</option>`;
    renderAds(AllAds);
}

// =========================
// 8. LOGOUT
// =========================
function logout() {
    localStorage.removeItem("user");
    window.location.href = "login.html";
}

