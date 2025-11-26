// Firebase config
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

// HTML elementlari
const adsTable = document.getElementById("adsTableBody");
const searchInput = document.getElementById("searchInput");

// Modal elementlari
const modal = document.getElementById("detailsModal");
const modalUserName = document.getElementById("modalUserName");
const modalUserPhone = document.getElementById("modalPhone");
const modalComment = document.getElementById("modalComment");
const modalRoute = document.getElementById("modalRoute");
const modalPrice = document.getElementById("modalPrice");
const modalSeats = document.getElementById("modalSeats");
const modalDate = document.getElementById("modalDate");
const modalCloseBtn = document.getElementById("closeModal");

// Delete modal button
const deleteInModalBtn = document.getElementById("deleteInModal");

// Adsni yuklash
function loadAds() {
    adsTable.innerHTML = "";

    db.ref("ads").once("value", snapshot => {
        snapshot.forEach(userAds => {
            const userId = userAds.key;

            userAds.forEach(adSnap => {
                const adId = adSnap.key;
                const ad = adSnap.val();

                // User ma’lumotini olish
                db.ref("users/" + userId).once("value", userSnap => {
                    const user = userSnap.val() || {
                        fullName: "Noma'lum",
                        phone: "-"
                    };

                    addRow(ad, user, userId, adId);
                });
            });
        });
    });
}

loadAds();

// Jadvalga qo‘shish
function addRow(ad, user, userId, adId) {
    const tr = document.createElement("tr");

    const from = `${ad.fromRegion || "-"} / ${ad.fromDistrict || "-"}`;
    const to = `${ad.toRegion || "-"} / ${ad.toDistrict || "-"}`;

    const route = `${from} → ${to}`;
    const date = ad.departureTime ? new Date(ad.departureTime).toLocaleString() : "-";
    const price = ad.price ? `${ad.price} so'm` : "-";

    tr.innerHTML = `
        <td>
            <strong>${user.fullName || "Noma'lum"}</strong><br>
            <small>${user.phone || "-"}</small>
        </td>

        <td>${route}</td>
        <td>${price}</td>
        <td>${date}</td>

        <td>
            <button class="btn btn-primary btn-sm" onclick="openModal('${userId}', '${adId}')">Ko'rish</button>
            <button class="btn btn-danger btn-sm" onclick="deleteAd('${userId}', '${adId}')">Delete</button>
        </td>
    `;

    adsTable.appendChild(tr);
}

// Modalni ochish
function openModal(userId, adId) {
    db.ref(`ads/${userId}/${adId}`).once("value", adSnap => {
        const ad = adSnap.val();

        db.ref("users/" + userId).once("value", userSnap => {
            const user = userSnap.val();

            modalUserName.innerText = user.fullName;
            modalUserPhone.innerText = user.phone;

            modalComment.innerText = ad.comment || "-";
            modalRoute.innerText = `${ad.fromRegion} / ${ad.fromDistrict} → ${ad.toRegion} / ${ad.toDistrict}`;
            modalPrice.innerText = ad.price + " so'm";
            modalSeats.innerText = ad.seats;
            modalDate.innerText = new Date(ad.departureTime).toLocaleString();

            deleteInModalBtn.setAttribute("onclick", `deleteAd('${userId}', '${adId}', true)`);

            modal.style.display = "block";
        });
    });
}

modalCloseBtn.onclick = () => modal.style.display = "none";

// Delete
function deleteAd(userId, adId, fromModal = false) {
    if (!confirm("Rostdan ham o'chirmoqchimisiz?")) return;

    db.ref(`ads/${userId}/${adId}`).remove().then(() => {
        alert("O'chirildi!");
        modal.style.display = "none";
        loadAds();
    });
}
