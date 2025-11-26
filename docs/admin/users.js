import { db, ref, onValue, remove, update } from "../libs/lib.js";

const tbody = document.getElementById("usersTable");
const searchInput = document.getElementById("search");

if (!tbody) {
    console.error("❌ Xato: #usersTable topilmadi!");
}

let USERS = {};

onValue(ref(db, "users"), (snap) => {
    USERS = snap.val() || {};
    renderUsers(USERS);
});

/* ============================
   Foydalanuvchilarni chiqarish
============================= */

function renderUsers(data) {
    if (!tbody) return;

    tbody.innerHTML = "";

    Object.entries(data).forEach(([id, user]) => {

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${user.name || ""}</td>
            <td>${user.phone || ""}</td>
            <td>${(user.region || "undefined") + " / " + (user.city || "undefined")}</td>
            <td>${user.active ? "✓ Aktiv" : "❌ Bloklangan"}</td>
            <td>
                <button class="btn btn-warning btn-sm" onclick="blockUser('${id}', ${user.active})">Block</button>
                <button class="btn btn-danger btn-sm" onclick="deleteUser('${id}')">Delete</button>
            </td>
        `;

        tr.onclick = () => showModal(user);

        tbody.appendChild(tr);
    });
}

/* ============================
          Qidiruv
============================= */

searchInput?.addEventListener("input", () => {
    const txt = searchInput.value.toLowerCase();
    const filtered = {};

    for (const id in USERS) {
        const u = USERS[id];
        if (
            (u.name || "").toLowerCase().includes(txt) ||
            (u.phone || "").includes(txt) ||
            (u.carModel || "").toLowerCase().includes(txt)
        ) {
            filtered[id] = u;
        }
    }
    renderUsers(filtered);
});

/* ============================
        Block / Unblock
============================= */

window.blockUser = (id, active) => {
    update(ref(db, "users/" + id), { active: !active });
};

/* ============================
            Delete
============================= */

window.deleteUser = (id) => {
    if (confirm("Rostdan ham o‘chirilsinmi?")) {
        remove(ref(db, "users/" + id));
    }
};

/* ============================
           MODAL
============================= */

const modal = document.getElementById("userModal");
const modalBody = document.getElementById("modalBody");

function showModal(user) {
    if (!modal || !modalBody) return;

    modal.style.display = "flex";

    modalBody.innerHTML = `
        <h3>${user.name}</h3>
        <img src="${user.avatar || '../img/avatar-default.png'}" class="avatar">
        <p><b>Telefon:</b> ${user.phone}</p>
        <p><b>Hudud:</b> ${user.region || ''}</p>
        <p><b>Tuman:</b> ${user.city || ''}</p>
        <p><b>Mašina:</b> ${user.carModel || ''}</p>
        <p><b>Rangi:</b> ${user.carColor || ''}</p>
        <p><b>Raqami:</b> ${user.carNumber || ''}</p>
        <p><b>Balans:</b> ${user.balance || 0}</p>
        <button onclick="closeModal()" class="btn btn-success">Yopish</button>
    `;
}

window.closeModal = () => {
    if (modal) modal.style.display = "none";
};
