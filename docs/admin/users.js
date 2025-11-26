import { db, ref, get, update, remove } from "../libs/lib.js";

const usersTable = document.getElementById("usersTable");
const searchInput = document.getElementById("searchInput");

loadUsers();

async function loadUsers() {
    const snap = await get(ref(db, "users"));
    usersTable.innerHTML = "";

    if (!snap.exists()) return;

    const users = snap.val();

    Object.entries(users).forEach(([id, user]) => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${user.fullName || "Nomalum"}</td>
            <td>${user.phone || "-"}</td>
            <td>${user.region || "/"}</td>
            <td>${user.blocked ? "Bloklangan" : "✓ Aktiv"}</td>
            <td>
                <button onclick="openModal('${id}')">Ko‘rish</button>
                <button onclick="blockUser('${id}', ${user.blocked})">Block</button>
                <button onclick="deleteUser('${id}')">Delete</button>
            </td>
        `;

        usersTable.appendChild(tr);
    });
}

window.openModal = async function (id) {
    const snap = await get(ref(db, "users/" + id));
    if (!snap.exists()) return;

    const u = snap.val();

    document.getElementById("modalName").innerText = u.fullName || "Noma'lum";
    document.getElementById("modalAvatar").src = u.techPassportUrl || "https://i.ibb.co/zG0Z3Qx/avatar.png";

    document.getElementById("modalPhone").innerText = u.phone || "-";
    document.getElementById("modalRegion").innerText = u.region || "/";
    document.getElementById("modalDistrict").innerText = u.district || "/";
    document.getElementById("modalStatus").innerText = u.blocked ? "Bloklangan" : "Aktiv";

    document.getElementById("userModal").style.display = "flex";
};

window.closeModal = function () {
    document.getElementById("userModal").style.display = "none";
};

window.blockUser = async function (id, state) {
    await update(ref(db, "users/" + id), { blocked: !state });
    loadUsers();
};

window.deleteUser = async function (id) {
    if (!confirm("O‘chirasizmi?")) return;
    await remove(ref(db, "users/" + id));
    loadUsers();
};

searchInput.addEventListener("input", () => {
    const value = searchInput.value.toLowerCase();
    const rows = usersTable.querySelectorAll("tr");

    rows.forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(value)
            ? ""
            : "none";
    });
});
