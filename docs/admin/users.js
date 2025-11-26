import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyB3R.....",
    authDomain: "shahartaxi-demo.firebaseapp.com",
    databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
    projectId: "shahartaxi-demo",
    storageBucket: "shahartaxi-demo.appspot.com",
    messagingSenderId: "00000000",
    appId: "1:111:web:222"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const usersList = document.getElementById("usersList");
const search = document.getElementById("search");

function loadUsers() {
    const usersRef = ref(db, "users");
    onValue(usersRef, snap => {
        usersList.innerHTML = "";

        snap.forEach(child => {
            const d = child.val();
            const id = child.key;

            const name = d.fullName || "Noma'lum";
            const phone = d.phone || "/";
            const region = d.region || "/";
            const district = d.district || "/";
            const avatar = d.techPassportUrl || "../img/default.png";
            const status = d.blocked ? "❌ Bloklangan" : "✓ Aktiv";

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${name}</td>
                <td>${phone}</td>
                <td>${region}</td>
                <td>${status}</td>
                <td>
                    <button onclick="openModal('${id}')">Ko'rish</button>
                    <button onclick="blockUser('${id}', ${d.blocked})">Block</button>
                    <button onclick="deleteUser('${id}')">Delete</button>
                </td>
            `;

            usersList.appendChild(tr);
        });
    });
}

loadUsers();

// ********* MODAL **********

window.openModal = function (id) {
    const userRef = ref(db, "users/" + id);

    onValue(userRef, snap => {
        const d = snap.val();

        document.getElementById("m_fullName").textContent = d.fullName || "Noma'lum";
        document.getElementById("m_avatar").src = d.techPassportUrl || "../img/default.png";
        document.getElementById("m_phone").textContent = d.phone || "/";
        document.getElementById("m_region").textContent = d.region || "/";
        document.getElementById("m_district").textContent = d.district || "/";
        document.getElementById("m_status").textContent = d.blocked ? "❌ Bloklangan" : "✓ Aktiv";

        document.getElementById("userModal").style.display = "block";
    }, { onlyOnce: true });
};

window.closeModal = function () {
    document.getElementById("userModal").style.display = "none";
};

// ********* BLOCK **********

window.blockUser = function (id, currentState) {
    update(ref(db, "users/" + id), { blocked: !currentState });
};

// ********* DELETE **********

window.deleteUser = function (id) {
    if (confirm("Rostdan ham o‘chirasizmi?")) {
        remove(ref(db, "users/" + id));
    }
};

// ********* SEARCH **********

search.addEventListener("input", function () {
    const q = this.value.toLowerCase();
    const rows = usersList.getElementsByTagName("tr");

    for (let r of rows) {
        r.style.display = r.innerText.toLowerCase().includes(q) ? "" : "none";
    }
});
