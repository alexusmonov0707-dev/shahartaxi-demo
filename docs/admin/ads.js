import { db, ref, get, remove } from "../libs/lib.js";

let adsCache = [];
let usersMap = {}; 

async function loadAds() {
    const tbody = document.getElementById("adsTable");
    tbody.innerHTML = "<tr><td colspan='5'>Yuklanmoqda...</td></tr>";

    const adsSnap = await get(ref(db, "ads"));
    const usersSnap = await get(ref(db, "users"));

    if (usersSnap.exists())
        usersMap = usersSnap.val();

    if (!adsSnap.exists()) {
        tbody.innerHTML = "<tr><td colspan='5'>E’lonlar mavjud emas</td></tr>";
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
        const user = usersMap[ad.delivery_eYs8ytEJv] ?? {}; // e’lon egasi ID

        const route = `${ad.fromRegion ?? '-'} / ${ad.fromDistrict ?? '-'} → ${ad.toRegion ?? '-'} / ${ad.toDistrict ?? '-'}`;

        tbody.innerHTML += `
            <tr>
                <td>
                    ${user.fullName ?? "Noma'lum"} <br>
                    ${user.phone ?? ""}
                </td>

                <td>${route}</td>

                <td>${ad.price ?? '-'} so‘m</td>

                <td>${formatDate(ad.createdAt)}</td>

                <td>
                    <button class="btn view" onclick="openModal('${ad.id}')">Ko‘rish</button>
                    <button class="btn delete" onclick="deleteAd('${ad.id}')">Delete</button>
                </td>
            </tr>
        `;
    });
}

window.searchAds = function () {
    const q = document.getElementById("search").value.toLowerCase();

    const filtered = adsCache.filter(ad =>
        (ad.fromRegion ?? "").toLowerCase().includes(q) ||
        (ad.fromDistrict ?? "").toLowerCase().includes(q) ||
        (ad.toRegion ?? "").toLowerCase().includes(q) ||
        (ad.toDistrict ?? "").toLowerCase().includes(q)
    );

    renderAds(filtered);
};

function formatDate(ts) {
    if (!ts) return "-";
    return new Date(ts).toLocaleString();
}

window.openModal = function (id) {
    const ad = adsCache.find(a => a.id === id);
    const user = usersMap[ad.delivery_eYs8ytEJv] ?? {};

    const route = `${ad.fromRegion} / ${ad.fromDistrict} → ${ad.toRegion} / ${ad.toDistrict}`;

    document.getElementById("m_route").innerText = route;
    document.getElementById("m_price").innerText = ad.price + " so‘m";
    document.getElementById("m_date").innerText = formatDate(ad.createdAt);
    document.getElementById("m_seats").innerText = ad.seats;

    document.getElementById("m_userName").innerText = user.fullName ?? "Noma'lum";
    document.getElementById("m_userPhone").innerText = user.phone ?? "-";

    document.getElementById("deleteBtn").onclick = () => deleteAd(id);

    document.getElementById("modal").style.display = "flex";
}

window.closeModal = function () {
    document.getElementById("modal").style.display = "none";
};

async function deleteAd(id) {
    if (!confirm("E’lonni o‘chirilsinmi?")) return;
    
    await remove(ref(db, "ads/" + id));

    closeModal();
    loadAds();
}

loadAds();
