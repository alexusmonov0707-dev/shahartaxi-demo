// === FIREBASE ===
const firebaseConfig = {
    apiKey: "AIzaSyD3vG5X6Y9...",
    authDomain: "shahartaxi-demo.firebaseapp.com",
    databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
    projectId: "shahartaxi-demo",
    storageBucket: "shahartaxi-demo.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcd1234"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// === ELEMENTLAR ===
const adsTable = document.getElementById("adsTable");
const searchInput = document.getElementById("search");

// MODAL elementlari
const modal = document.getElementById("modal");
const m_route = document.getElementById("m_route");
const m_depart = document.getElementById("m_depart");
const m_price = document.getElementById("m_price");
const m_seats = document.getElementById("m_seats");
const m_dseats = document.getElementById("m_dseats");
const m_comment = document.getElementById("m_comment");
const m_created = document.getElementById("m_created");
const m_userName = document.getElementById("m_userName");
const m_userPhone = document.getElementById("m_userPhone");
const m_userRole = document.getElementById("m_userRole");
const m_avatar = document.getElementById("m_avatar");

const deleteBtn = document.getElementById("deleteBtn");
const closeBtn = document.getElementById("closeBtn");

let CURRENT_USER_ID = null;
let CURRENT_AD_ID = null;
let ALL_ADS = [];  // qidiruv uchun

// === ADS YUKLASH ===
function loadAds() {
    adsTable.innerHTML = "";

    db.ref("ads").once("value", snapshot => {
        ALL_ADS = [];

        snapshot.forEach(userSnap => {
            const userId = userSnap.key;

            userSnap.forEach(adSnap => {
                const adId = adSnap.key;
                const ad = adSnap.val();

                ALL_ADS.push({ userId, adId, ad });
            });
        });

        renderTable(ALL_ADS);
    });
}

loadAds();

function renderTable(list) {
    adsTable.innerHTML = "";

    list.forEach(item => {
        const { userId, adId, ad } = item;

        db.ref("users/" + userId).once("value", u => {
            const user = u.val() || {};

            drawRow(ad, user, userId, adId);
        });
    });
}

function drawRow(ad, user, userId, adId) {
    const tr = document.createElement("tr");

    // eski va yangi taksi strukturalarini qo‘llab-quvvatlaymiz
    const fromRegion  = ad.fromRegion  || ad.region  || "-";
    const fromDistrict = ad.fromDistrict || ad.district || "-";
    const toRegion  = ad.toRegion  || ad.regionTo  || "-";
    const toDistrict = ad.toDistrict || ad.districtTo || "-";

    const route = `${fromRegion} / ${fromDistrict} → ${toRegion} / ${toDistrict}`;

    const price = ad.price ? `${ad.price} so‘m` : "-";
    const date = ad.departureTime ? new Date(ad.departureTime).toLocaleString() : "-";

    tr.innerHTML = `
        <td><strong>${user.fullName || "Noma'lum"}</strong><br><small>${user.phone || "-"}</small></td>
        <td>${route}</td>
        <td>${price}</td>
        <td>${date}</td>
        <td>
            <button class="btn btn-view" data-open="${userId}|${adId}">Ko‘rish</button>
            <button class="btn btn-delete" data-del="${userId}|${adId}">Delete</button>
        </td>
    `;

    adsTable.appendChild(tr);
}

// === SEARCH ===
searchInput.addEventListener("keyup", () => {
    const q = searchInput.value.toLowerCase();

    const filtered = ALL_ADS.filter(({ ad }) => {
        return (
            (ad.fromRegion || "").toLowerCase().includes(q) ||
            (ad.toRegion || "").toLowerCase().includes(q) ||
            (ad.comment || "").toLowerCase().includes(q)
        );
    });

    renderTable(filtered);
});

// === EVENT delegation ===
document.addEventListener("click", e => {
    if (e.target.dataset.open) {
        const [u, a] = e.target.dataset.open.split("|");
        openModal(u, a);
    }

    if (e.target.dataset.del) {
        const [u, a] = e.target.dataset.del.split("|");
        deleteAd(u, a);
    }
});

// === MODAL ===
function openModal(userId, adId) {
    CURRENT_USER_ID = userId;
    CURRENT_AD_ID = adId;

    db.ref(`ads/${userId}/${adId}`).once("value", adSnap => {
        const ad = adSnap.val();

        db.ref(`users/${userId}`).once("value", uSnap => {
            const user = uSnap.val() || {};

            // fallback region formats
            m_route.innerText =
                `${ad.fromRegion || ad.region || "-"} / ${ad.fromDistrict || ad.district || "-"} → ` +
                `${ad.toRegion || ad.regionTo || "-"} / ${ad.toDistrict || ad.districtTo || "-"}`;

            m_depart.innerText = ad.departureTime ? new Date(ad.departureTime).toLocaleString() : "-";
            m_price.innerText = ad.price ? ad.price + " so‘m" : "-";
            m_seats.innerText = ad.seats || "-";
            m_dseats.innerText = ad.driverSeats || "-";
            m_comment.innerText = ad.comment || "-";
            m_created.innerText = ad.createdAt ? new Date(ad.createdAt).toLocaleString() : "-";

            m_userName.innerText = user.fullName || "-";
            m_userPhone.innerText = user.phone || "-";
            m_userRole.innerText = user.role || "-";
            m_avatar.src = user.avatar || "default.png";

            modal.style.display = "flex";
        });
    });
}

closeBtn.onclick = () => modal.style.display = "none";

deleteBtn.onclick = () => {
    deleteAd(CURRENT_USER_ID, CURRENT_AD_ID);
};

// === DELETE ===
function deleteAd(userId, adId) {
    if (!confirm("Rostdan ham o‘chirmoqchimisiz?")) return;

    db.ref(`ads/${userId}/${adId}`).remove().then(() => {
        alert("O‘chirildi!");
        modal.style.display = "none";
        loadAds();
    });
}
