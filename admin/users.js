import { db, ref, get, update, remove } from "./firebase.js";

let usersCache = []; // BARCHA USERLAR 1 MARTA OLINADI

async function loadUsers() {
    const tbody = document.getElementById("usersTable");
    tbody.innerHTML = "<tr><td colspan='5'>Yuklanmoqda...</td></tr>";

    const snap = await get(ref(db, "users"));
    if (!snap.exists()) {
        tbody.innerHTML = "<tr><td colspan='5'>Userlar topilmadi</td></tr>";
        return;
    }

    usersCache = Object.entries(snap.val()).map(([id, user]) => ({
        id,
        ...user
    }));

    renderTable(usersCache);
}

function renderTable(list) {
    const tbody = document.getElementById("usersTable");
    tbody.innerHTML = "";

    list.forEach(u => {
        tbody.innerHTML += `
            <tr onclick="openModal('${u.id}')">
                <td>${u.fullName}</td>
                <td>${u.phone}</td>
                <td>${u.region} / ${u.district}</td>
                <td>${u.blocked ? "🚫 Bloklangan" : "✔ Aktiv"}</td>
                <td>
                    ${u.blocked
                        ? `<button class="btn unblock" onclick="event.stopPropagation(); unblockUser('${u.id}')">Unblock</button>`
                        : `<button class="btn block" onclick="event.stopPropagation(); blockUser('${u.id}')">Block</button>`
                    }
                    <button class="btn delete" onclick="event.stopPropagation(); deleteUser('${u.id}')">Delete</button>
                </td>
            </tr>
        `;
    });
}

window.searchUsers = function () {
    const q = document.getElementById("search").value.toLowerCase();

    const filtered = usersCache.filter(u =>
        (u.fullName || "").toLowerCase().includes(q) ||
        (u.phone || "").toLowerCase().includes(q) ||
        (u.carModel || "").toLowerCase().includes(q)
    );

    renderTable(filtered);
};

window.openModal = function (id) {
    const u = usersCache.find(u => u.id === id);

    document.getElementById("m_fullName").textContent = u.fullName;
    document.getElementById("m_phone").textContent = u.phone;
    document.getElementById("m_region").textContent = u.region;
    document.getElementById("m_district").textContent = u.district;
    document.getElementById("m_avatar").src = u.avatar;
    document.getElementById("m_color").textContent = u.carColor;
    document.getElementById("m_car").textContent = u.carModel;
    document.getElementById("m_number").textContent = u.carNumber;
    document.getElementById("m_balance").textContent = u.balance;

    document.getElementById("modal").style.display = "flex";
};

window.closeModal = function () {
    document.getElementById("modal").style.display = "none";
};

window.blockUser = async function (id) {
    await update(ref(db, "users/" + id), { blocked: true });
    loadUsers();
};

window.unblockUser = async function (id) {
    await update(ref(db, "users/" + id), { blocked: false });
    loadUsers();
};

window.deleteUser = async function (id) {
    if (!confirm("Userni o‘chirmoqchimisiz?")) return;
    await remove(ref(db, "users/" + id));
    loadUsers();
};

loadUsers();
