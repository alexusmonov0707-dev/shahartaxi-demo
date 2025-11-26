import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "...",
    authDomain: "...",
    databaseURL: "...",
    projectId: "...",
    storageBucket: "...",
    messagingSenderId: "...",
    appId: "..."
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const usersRef = ref(db, "users");
let allUsers = {};

// ==== LOAD USERS ====
onValue(usersRef, snapshot => {
    allUsers = snapshot.val() || {};
    renderUsers(allUsers);
});

// ==== RENDER USERS ====
function renderUsers(data) {
    const table = document.getElementById("usersTable");
    table.innerHTML = "";

    Object.entries(data).forEach(([id, user]) => {
        let tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${user.fullName || "Noma'lum"}</td>
            <td>${user.phone || "-"}</td>
            <td>${user.region || "/"}</td>
            <td>${user.role || "-"}</td>
            <td>${user.blocked ? "❌ Bloklangan" : "✓ Aktiv"}</td>
            <td>
                <button class="btn block" onclick="toggleBlock('${id}', ${user.blocked})">
                    ${user.blocked ? "Unblock" : "Block"}
                </button>
                <button class="btn delete" onclick="deleteUser('${id}')">Delete</button>
                <button class="btn unblock" onclick="openModal('${id}')">Info</button>
            </td>
        `;

        table.appendChild(tr);
    });
}

// ==== SEARCH ====
window.searchUsers = function () {
    let q = document.getElementById("search").value.toLowerCase().trim();

    let filtered = {};
    Object.entries(allUsers).forEach(([id, u]) => {
        if (
            (u.fullName || "").toLowerCase().includes(q) ||
            (u.phone || "").toLowerCase().includes(q) ||
            (u.carModel || "").toLowerCase().includes(q)
        ) {
            filtered[id] = u;
        }
    });

    renderUsers(filtered);
};

// ==== BLOCK/UNBLOCK ====
window.toggleBlock = function (id, state) {
    update(ref(db, "users/" + id), { blocked: !state });
};

// ==== DELETE ====
window.deleteUser = function (id) {
    update(ref(db, "users/" + id), null);
};

// ==== MODAL ====
window.openModal = function (id) {
    const user = allUsers[id];
    if (!user) return;

    document.getElementById("m_fullName").innerText = user.fullName;
    document.getElementById("m_phone").innerText = user.phone;
    document.getElementById("m_region").innerText = user.region || "/";
    document.getElementById("m_district").innerText = user.district || "/";
    document.getElementById("m_car").innerText = user.carModel || "/";
    document.getElementById("m_color").innerText = user.carColor || "/";
    document.getElementById("m_number").innerText = user.carNumber || "/";
    document.getElementById("m_status").innerText = user.blocked ? "Bloklangan" : "Aktiv";
    document.getElementById("m_balance").innerText = user.balance || 0;

    document.getElementById("m_avatar").src = user.avatar || "./avatar-default.png";

    document.getElementById("modal").style.display = "flex";
};

window.closeModal = function () {
    document.getElementById("modal").style.display = "none";
};
