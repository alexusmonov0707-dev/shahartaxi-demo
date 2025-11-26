import { db, ref, onValue, update, remove } from "../libs/lib.js";

const usersTable = document.getElementById("usersTable");
const searchInput = document.getElementById("search");
const modal = document.getElementById("userModal");

let allUsers = {};

onValue(ref(db, "users"), (snapshot) => {
    usersTable.innerHTML = "";
    allUsers = snapshot.val() || {};

    Object.entries(allUsers).forEach(([uid, u]) => {
        let region = u.region || "/";
        let district = u.district || "/";

        let row = `
            <tr>
                <td onclick="openModal('${uid}')" style="cursor:pointer">${u.name}</td>
                <td>${u.phone}</td>
                <td>${region}</td>
                <td>${u.active === false ? "❌ Block" : "✓ Aktiv"}</td>
                <td>
                    <button onclick="blockUser('${uid}', ${u.active})">Block</button>
                    <button onclick="deleteUser('${uid}')">Delete</button>
                </td>
            </tr>
        `;

        usersTable.innerHTML += row;
    });
});

/* 🔍 Qidiruv */
searchInput.addEventListener("input", () => {
    let v = searchInput.value.toLowerCase();

    Array.from(usersTable.rows).forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(v) ? "" : "none";
    });
});

/* 🟦 Modalni ochish */
window.openModal = function (uid) {
    const u = allUsers[uid];
    if (!u) return;

    document.getElementById("m_name").textContent = u.name;
    document.getElementById("m_phone").textContent = u.phone;
    document.getElementById("m_region").textContent = u.region || "/";
    document.getElementById("m_district").textContent = u.district || "/";
    document.getElementById("m_car").textContent = u.car || "/";
    document.getElementById("m_color").textContent = u.color || "/";
    document.getElementById("m_number").textContent = u.number || "/";
    document.getElementById("m_balance").textContent = u.balance ?? 0;

    modal.style.display = "flex";
}

/* ❌ Modalni yopish */
window.closeModal = function () {
    modal.style.display = "none";
};

/* 🟥 Foydalanuvchini Block qilish */
window.blockUser = function (uid, status) {
    update(ref(db, "users/" + uid), { active: !status });
};

/* 🗑 Delete */
window.deleteUser = function (uid) {
    if (confirm("Rostan o‘chirilsinmi?")) {
        remove(ref(db, "users/" + uid));
    }
}
