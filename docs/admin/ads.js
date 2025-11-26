import { db, ref, get, remove } from "../libs/lib.js";

let adsCache = [];
let usersMap = {}; // user malumotlari uchun

async function loadAds() {
    const tbody = document.getElementById("adsTable");
    tbody.innerHTML = "<tr><td colspan='5'>Yuklanmoqda...</td></tr>";

    const adsSnap = await get(ref(db, "ads"));
    const usersSnap = await get(ref(db, "users"));

    if (usersSnap.exists())
        usersMap = usersSnap.val();

    if (!adsSnap.exists()) {
        tbody.innerHTML = "<tr><td colspan='5'>E’lonlar yo‘q</td></tr>";
        return;
    }

    adsCache = Object.entries(adsSnap.val()).map(([id, a]) => ({
        id,
        ...a
    }));

    renderAds(adsCache);
}

function renderAds(list) {
    const tbody = document.getElementById("adsTable");
    tbody.innerHTML = "";

    list.forEach(ad => {
        const user = usersMap[ad.userId] ?? {};

        tbody.innerHTML += `
            <tr>
                <td>${user.fullName ?? "Noma'lum"}<br>${user.phone ?? ""}</td>
                <td>${ad.from} → ${ad.to}</td>
                <td>${ad.price} so‘m</td>
                <td>${formatDate(ad.date)}</td>
                <td>
                    <button class="btn view" onclick="openModal('${ad.id}')">Ko‘rish</button>
                </td>
            </tr>
        `;
    });
}

// Qidiruv
window.searchAds = function () {
    const q = document.getElementById("search").value.toLowerCase();

    const filtered = adsCache.filter(ad =>
        ad.from.toLowerCase().includes(q) ||
        ad.to.toLowerCase().includes(q)
    );

    renderAds(filtered);
};

// Sana formatlash
function formatDate(ts) {
    if (!ts) return "-";
    const d = new Date(ts);
    return d.toLocaleDateString();
}

// === MODAL ===
window.openModal = function (id) {
    const ad = adsCache.find(a => a.id === id);
    const user = usersMap[ad.userId] ?? {};

    document.getElementById("m_route").textContent = ad.from + " → " + ad.to;
    document.getElementById("m_price").textContent = ad.price + " so‘m";
    document.getElementById("m_date").textContent = formatDate(ad.date);
    document.getElementById("m_seats").textContent = ad.seats ?? "-";

    document.getElementById("m_userName").textContent = user.fullName ?? "Noma'lum";
    document.getElementById("m_userPhone").textContent = user.phone ?? "-";

    document.getElementById("deleteBtn").onclick = () => deleteAd(id);
    document.getElementById("modal").style.display = "flex";
};

window.closeModal = function () {
    document.getElementById("modal").style.display = "none";
};

// DELETE
async function deleteAd(id) {
    if (!confirm("E’lonni o‘chirishni tasdiqlaysizmi?")) return;

    await remove(ref(db, "ads/" + id));

    closeModal();
    loadAds();
}

loadAds();
