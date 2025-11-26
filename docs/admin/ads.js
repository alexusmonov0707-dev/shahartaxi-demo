import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, onValue, remove, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyA8aGr9VeXTC1cN8XbVCuVTfviZKfEdS20",
    authDomain: "shahartaxi-demo.firebaseapp.com",
    databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com/",
    projectId: "shahartaxi-demo",
    storageBucket: "shahartaxi-demo.appspot.com",
    messagingSenderId: "130460780201",
    appId: "1:130460780201:web:d5cb488d2a8c6054f49dda"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const adsRef = ref(db, "ads");
const usersRef = ref(db, "users");

const adsTable = document.getElementById("adsTable");
const searchInput = document.getElementById("search");

// MODAL ELEMENTLAR
const modal = document.getElementById("modal");
const closeBtn = document.getElementById("closeBtn");
const deleteBtn = document.getElementById("deleteBtn");

// Modal ma'lumot joylari
const m_route    = document.getElementById("m_route");
const m_depart   = document.getElementById("m_depart");
const m_price    = document.getElementById("m_price");
const m_seats    = document.getElementById("m_seats");
const m_dseats   = document.getElementById("m_dseats");
const m_comment  = document.getElementById("m_comment");
const m_created  = document.getElementById("m_created");

const m_avatar   = document.getElementById("m_avatar");
const m_userName = document.getElementById("m_userName");
const m_userPhone = document.getElementById("m_userPhone");
const m_userRole = document.getElementById("m_userRole");

// GLOBAL DELETE ID
let selectedAdId = null;

// =========================
//    E’lonlarni chiqarish
// =========================
onValue(adsRef, async (snapshot) => {
    adsTable.innerHTML = "";

    const ads = snapshot.val();
    if (!ads) return;

    for (const adId in ads) {
        const ad = ads[adId];

        // userni olish
        const userSnap = await get(ref(db, `users/${ad.uid}`));
        const user = userSnap.exists() ? userSnap.val() : {};

        const from = `${ad.fromRegion || "-"} / ${ad.fromDistrict || "-"}`;
        const to   = `${ad.toRegion || "-"} / ${ad.toDistrict || "-"}`;
        const route = `${from} → ${to}`;

        const row = document.createElement("tr");
        row.setAttribute("data-id", adId);

        row.innerHTML = `
            <td>
                ${user.fullName || "Noma'lum"}<br>
                <small>${user.phone || "-"}</small>
            </td>
            <td>${route}</td>
            <td>${ad.price ? ad.price + " so'm" : "-"}</td>
            <td>${ad.departureTime ? formatDate(ad.departureTime) : "-"}</td>
            <td>
                <button class="btn view" onclick="openModal('${adId}')">Ko'rish</button>
                <button class="btn delete" onclick="deleteAd('${adId}')">Delete</button>
            </td>
        `;

        adsTable.appendChild(row);
    }
});

// =========================
//   Sana formatlash
// =========================
function formatDate(t) {
    return new Date(Number(t)).toLocaleString("uz-UZ", {
        hour12: false
    });
}

// =========================
//   Qidiruv
// =========================
window.searchAds = function () {
    const q = searchInput.value.toLowerCase();

    Array.from(adsTable.children).forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(q) ? "" : "none";
    });
};

// =========================
//   MODAL OCHISH
// =========================
window.openModal = async function (adId) {
    selectedAdId = adId;

    const adSnap = await get(ref(db, `ads/${adId}`));
    const ad = adSnap.val();

    const userSnap = await get(ref(db, `users/${ad.uid}`));
    const user = userSnap.exists() ? userSnap.val() : {};

    // Modalga joylash
    m_route.textContent = `${ad.fromRegion} / ${ad.fromDistrict} → ${ad.toRegion} / ${ad.toDistrict}`;
    m_depart.textContent = ad.departureTime ? formatDate(ad.departureTime) : "-";
    m_price.textContent = ad.price ? ad.price + " so'm" : "-";
    m_seats.textContent = ad.seats || "-";
    m_dseats.textContent = ad.driverSeats || "-";
    m_comment.textContent = ad.comment || "-";
    m_created.textContent = ad.createdAt ? formatDate(ad.createdAt) : "-";

    // User info
    m_avatar.src = user.avatar || "./user.png";
    m_userName.textContent = user.fullName || "Noma'lum";
    m_userPhone.textContent = user.phone || "-";
    m_userRole.textContent = user.role || "-";

    modal.style.display = "flex";
};

// =========================
//   MODAL YOPISH
// =========================
closeBtn.onclick = () => {
    modal.style.display = "none";
};

// =========================
//   DELETE FUNKSIYASI
// =========================
window.deleteAd = async function (id) {
    if (!confirm("E'lonni o'chirishni tasdiqlang!")) return;

    await remove(ref(db, `ads/${id}`));

    modal.style.display = "none";
    alert("E'lon o'chirildi");
};

// modal ichidagi delete tugmasi
deleteBtn.onclick = () => {
    if (selectedAdId) deleteAd(selectedAdId);
};
