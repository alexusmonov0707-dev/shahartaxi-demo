import { db, ref, get, remove } from "../libs/lib.js";

let adsCache = [];
let usersMap = {};

async function loadAds() {
    const tbody = document.getElementById("adsTable");
    tbody.innerHTML = "<tr><td colspan='5'>Yuklanmoqda...</td></tr>";

    const adsSnap = await get(ref(db, "ads"));
    const usersSnap = await get(ref(db, "users"));

    if (usersSnap.exists()) usersMap = usersSnap.val();

    if (!adsSnap.exists()) {
        tbody.innerHTML = "<tr><td colspan='5'>E’lonlar yo‘q</td></tr>";
        return;
    }

    adsCache = [];

    const adsData = adsSnap.val();

    // 1st level: userId
    for (const userId in adsData) {
        const userAds = adsData[userId];

        // 2nd level: adId
        for (const adId in userAds) {
            const ad = userAds[adId];
            adsCache.push({
                userId,
                adId,
                ...ad
            });
        }
    }

    renderAds(adsCache);
}

function renderAds(list) {
    const tbody = document.getElementById("adsTable");
    tbody.innerHTML = "";

    list.forEach(ad => {
        const user = usersMap[ad.userId] ?? {};

        const route = `${ad.fromRegion ?? '-'} / ${ad.fromDistrict ?? '-'} → ${ad.toRegion ?? '-'} / ${ad.toDistrict ?? '-'}`;

        tbody.innerHTML += `
            <tr>
                <td>${user.fullName ?? "Noma'lum"}<br>${user.phone ?? "-"}</td>
                <td>${route}</td>
                <td>${ad.price ?? "-"} so‘m</td>
                <td>${formatDate(ad.createdAt)}</td>
                <td>
                    <button class="btn view" onclick="openModal('${ad.userId}', '${ad.adId}')">Ko‘rish</button>
                    <button class="btn delete" onclick="deleteAd('${ad.userId}', '${ad.adId}')">Delete</button>
                </td>
            </tr>
        `;
    });
}

function formatDate(ts) {
    if (!ts) return "-";
    return new Date(ts).toLocaleString();
}

window.openModal = function (userId, adId) {
    const ad = adsCache.find(a => a.userId === userId && a.adId === adId);
    const user = usersMap[userId] ?? {};

    const route = `${ad.fromRegion} / ${ad.fromDistrict} → ${ad.toRegion} / ${ad.toDistrict}`;

    document.getElementById("m_route").innerText = route;
    document.getElementById("m_price").innerText = ad.price + " so‘m";
    document.getElementById("m_date").innerText = formatDate(ad.createdAt);
    document.getElementById("m_seats").innerText = ad.seats ?? "-";

    document.getElementById("m_comment").innerText = ad.comment ?? "-";  // <-- YANGI QATOR

    document.getElementById("m_userName").innerText = user.fullName ?? "Noma'lum";
    document.getElementById("m_userPhone").innerText = user.phone ?? "-";

    document.getElementById("deleteBtn").onclick = () => deleteAd(userId, adId);

    document.getElementById("modal").style.display = "flex";
};

window.closeModal = function () {
    document.getElementById("modal").style.display = "none";
};

async function deleteAd(userId, adId) {
    if (!confirm("E’lonni o‘chirilsinmi?")) return;

    await remove(ref(db, `ads/${userId}/${adId}`));

    closeModal();
    loadAds();
}

loadAds();
