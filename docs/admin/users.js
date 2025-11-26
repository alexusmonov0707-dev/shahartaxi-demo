import { db, ref, get, update, remove } from "../libs/lib.js";

let usersCache = [];

// USERS LOAD
async function loadUsers() {
    const tbody = document.getElementById("usersTable");
    tbody.innerHTML = "<tr><td colspan='6'>Yuklanmoqda...</td></tr>";

    const snap = await get(ref(db, "users"));

    if (!snap.exists()) {
        tbody.innerHTML = "<tr><td colspan='6'>Userlar topilmadi</td></tr>";
        return;
    }

    usersCache = Object.entries(snap.val()).map(([id, u]) => ({
        id,
        ...u
    }));

    renderUsers(usersCache);
}

function renderUsers(list) {
    const tbody = document.getElementById("usersTable");
    tbody.innerHTML = "";

    list.forEach(u => {
        const region = u.region ?? "-";
        const district = u.district ?? "-";
        const phone = u.phone ?? "-";

        const roleBadge = `
            <span class="badge ${u.role === 'driver' ? 'driver' : 'user'}">
                ${u.role}
            </span>
        `;

        let status = "Foydalanuvchi";

        if (u.role === "driver") {
            if (u.verified === true) status = `<span class="badge verified">Tasdiqlangan</span>`;
            else if (u.verified === false) status = `<span class="badge pending">Kutilmoqda</span>`;
            else if (u.verified === "rejected") status = `<span class="badge rejected">Rad etilgan</span>`;
        }

        tbody.innerHTML += `
            <tr onclick="openModal('${u.id}')">
                <td>${u.fullName ?? "-"}</td>
                <td>${phone}</td>
                <td>${region} / ${district}</td>
                <td>${roleBadge}</td>
                <td>${status}</td>
                <td>
                    ${
                        u.blocked
                        ? `<button class="btn unblock" onclick="event.stopPropagation(); unblockUser('${u.id}')">Unblock</button>`
                        : `<button class="btn block" onclick="event.stopPropagation(); blockUser('${u.id}')">Block</button>`
                    }
                    <button class="btn delete" onclick="event.stopPropagation(); deleteUser('${u.id}')">Delete</button>
                </td>
            </tr>
        `;
    });
}

// SEARCH
window.searchUsers = function () {
    const q = document.getElementById("search").value.toLowerCase();

    const filtered = usersCache.filter(u =>
        (u.fullName ?? "").toLowerCase().includes(q) ||
        (u.phone ?? "").includes(q) ||
        (u.carModel ?? "").toLowerCase().includes(q)
    );

    renderUsers(filtered);
};

// MODAL
window.openModal = function (id) {
    const u = usersCache.find(x => x.id === id);

    document.getElementById("m_fullName").textContent = u.fullName ?? "";
    document.getElementById("m_phone").textContent = u.phone ?? "-";
    document.getElementById("m_region").textContent = u.region ?? "-";
    document.getElementById("m_district").textContent = u.district ?? "-";

    document.getElementById("m_avatar").src = u.avatar ?? "/assets/default.png";

    document.getElementById("m_car").textContent = u.carModel ?? "-";
    document.getElementById("m_color").textContent = u.carColor ?? "-";
    document.getElementById("m_number").textContent = u.carNumber ?? "-";

    let status = "Foydalanuvchi";
    if (u.role === "driver") {
        if (u.verified === true) status = "Tasdiqlangan";
        else if (u.verified === false) status = "Kutilmoqda";
        else if (u.verified === "rejected") status = "Rad etilgan";
    }
    document.getElementById("m_status").textContent = status;

    document.getElementById("m_balance").textContent = (u.balance ?? 0) + " so‘m";

    document.getElementById("modal").style.display = "flex";
};

window.closeModal = function () {
    document.getElementById("modal").style.display = "none";
};

// BLOCK
window.blockUser = async function (id) {
    await update(ref(db, "users/" + id), { blocked: true });
    loadUsers();
};

// UNBLOCK
window.unblockUser = async function (id) {
    await update(ref(db, "users/" + id), { blocked: false });
    loadUsers();
};

// DELETE USER + ADS
window.deleteUser = async function (id) {
    if (!confirm("Userni o‘chirishni tasdiqlaysizmi?")) return;

    await remove(ref(db, "ads_by_user/" + id));
    await remove(ref(db, "users/" + id));

    loadUsers();
};

loadUsers();
