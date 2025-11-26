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

// === ADS YUKLASH ===
function loadAds() {
    adsTable.innerHTML = "";

    db.ref("ads").once("value", snapshot => {
        snapshot.forEach(userSnap => {
            const userId = userSnap.key;

            userSnap.forEach(adSnap => {
                const adId = adSnap.key;
                const ad = adSnap.val();

                db.ref("users/" + userId).once("value", u => {
                    const user = u.val() || { fullName: "Noma'lum", phone: "-", role: "-" };

                    drawRow(ad, user, userId, adId);
                });
            });
        });
    });
}

loadAds();

function drawRow(ad, user, userId, adId) {
    const tr = document.createElement("tr");

    const route = `${ad.fromRegion} / ${ad.fromDistrict} → ${ad.toRegion} / ${ad.toDistrict}`;
    const price = ad.price ? `${ad.price} so‘m` : "-";
    const date = ad.departureTime ? new Date(ad.departureTime).toLocaleString() : "-";

    tr.innerHTML = `
        <td><strong>${user.fullName}</strong><br><small>${user.phone}</small></td>
        <td>${route}</td>
        <td>${price}</td>
        <td>${date}</td>
        <td>
            <button class="btn viewBtn" data-open="${userId}|${adId}">Ko‘rish</button>
            <button class="btn delete" data-del="${userId}|${adId}">Delete</button>
        </td>
    `;

    // Ko‘rish tugmasini majburan aktiv qilamiz
    const viewBtn = tr.querySelector(".viewBtn");
    viewBtn.removeAttribute("disabled");
    viewBtn.style.pointerEvents = "auto";
    viewBtn.style.opacity = "1";

    adsTable.appendChild(tr);
}


// === EVENT delegation (module bo‘lmaganda ishlaydi) ===
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
            const user = uSnap.val();

            m_route.innerText = `${ad.fromRegion} / ${ad.fromDistrict} → ${ad.toRegion} / ${ad.toDistrict}`;
            m_depart.innerText = new Date(ad.departureTime).toLocaleString();
            m_price.innerText = ad.price + " so‘m";
            m_seats.innerText = ad.seats;
            m_dseats.innerText = ad.driverSeats;
            m_comment.innerText = ad.comment || "-";
            m_created.innerText = new Date(ad.createdAt).toLocaleString();

            m_userName.innerText = user.fullName;
            m_userPhone.innerText = user.phone;
            m_userRole.innerText = user.role;
            m_avatar.src = user.avatar || "default.png";

            modal.style.display = "block";
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
