import { db, ref, get, update, remove } from "./firebase.js";

let usersCache = [];

async function loadUsers() {
    const tbody = document.getElementById("usersTable");
    tbody.innerHTML = "<tr><td colspan='6'>Yuklanmoqda...</td></tr>";

    const snap = await get(ref(db, "users"));
    if (!snap.exists()) {
        tbody.innerHTML = "<tr><td colspan='6'>Userlar topilmadi</td></tr>";
        return;
    }

    usersCache = Object.entries(snap.val()).map(([id, user]) => ({ id, ...user }));
    renderTable(usersCache);
}

function renderTable(list) {
    const tbody = document.getElementById("usersTable");
    tbody.innerHTML = "";

    list.forEach(u => {
        const roleBadge = `
            <span class="badge ${u.role === 'driver' ? 'driver' : 'user'}">
                ${u.role}
            </span>`;

        let statusBadge = "";
        if (u.role === "driver") {
            if (u.verified === true) statusBadge = `<span class="badge verified">Tasdiqlangan</span>`;
            else if (u.verified === false) statusBadge = `<span class="badge pending">Kutilmoqda</span>`;
            else if (u.verified === "rejected") statusBadge = `<span class="badge rejected">Rad etilgan</span>`;
        } else {
            statusBadge = `<span class="badge user">Foydalanuvchi</span>`;
        }

        tbody.innerHTML += `
            <tr onclick="openModal('${u.id}')">
                <td>${u.fullName}</td>
                <td>${u.phone}</td>
                <td>${u.region} / ${u.district}</td>
                <td>${roleBadge}</td>
                <td>${statusBadge}</td>

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
    const u = usersCache.find(x => x.id === id);

    document.getElementById("m_fullName").textContent = u.fullName;
    document.getElementById("m_phone").textContent = u.phone;
    document.getElementById("m_region").textContent = u.region;
    document.getElementById("m_district").textContent = u.district;
    document.getElementById("m_avatar").src = u.avatar;
    document.getElementById("m_color").textContent = u.carColor;
    document.getElementById("m_car").textContent = u.carModel;
    document.getElementById("m_number").textContent = u.carNumber;

    // DRIVER STATUS
    if (u.role === "driver") {
        if (u.verified === true) document.getElementById("m_status").textContent = "Tasdiqlangan";
        else if (u.verified === false) document.getElementById("m_status").textContent = "Tasdiq kutmoqda";
        else document.getElementById("m_status").textContent = "Rad etilgan";
    } else {
        document.getElementById("m_status").textContent = "Foydalanuvchi";
    }

    document.getElementById("m_balance").textContent = u.balance + " so‘m";

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

    // BIRINCHI ADS NI O‘CHIRAMIZ
    await remove(ref(db, "ads_by_user/" + id));

    // SO‘NG USERNI O‘CHIRAMIZ
    await remove(ref(db, "users/" + id));

    loadUsers();
};

loadUsers();
