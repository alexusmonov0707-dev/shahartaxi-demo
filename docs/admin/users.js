import { db, ref, get, update, remove } from "../libs/lib.js";

let usersCache = [];

// === LOAD USERS ===
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
        ...u,
        driverInfo: u.driverInfo ?? {}
    }));

    renderUsers(usersCache);
}


// === RENDER USERS TABLE ===
function renderUsers(list) {
    const tbody = document.getElementById("usersTable");
    tbody.innerHTML = "";

    list.forEach(u => {
        const phone = u.phone ?? "-";
        const role = u.role ?? "user";

        const region = u.region ?? "-";
        const district = u.district ?? "-";

        let status = "Foydalanuvchi";
        if (role === "driver") {
            if (u.verified === true) status = `<span class="badge verified">Tasdiqlangan</span>`;
            else if (u.verified === false) status = `<span class="badge pending">Kutilmoqda</span>`;
            else status = `<span class="badge rejected">Rad etilgan</span>`;
        }

        tbody.innerHTML += `
            <tr onclick="openModal('${u.id}')">
                <td>${u.fullName ?? "-"}</td>
                <td>${phone}</td>
                <td>${region} / ${district}</td>
                <td><span class="badge ${role}">${role}</span></td>
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


// === SEARCH ===
window.searchUsers = function () {
    const q = document.getElementById("search").value.toLowerCase();

    const filtered = usersCache.filter(u =>
        (u.fullName ?? "").toLowerCase().includes(q) ||
        (u.phone ?? "").includes(q) ||
        (u.driverInfo?.carModel ?? "").toLowerCase().includes(q)
    );

    renderUsers(filtered);
};


// === MODAL OPEN ===
window.openModal = function (id) {
    const u = usersCache.find(x => x.id === id);

    document.getElementById("m_fullName").textContent = u.fullName ?? "-";
    document.getElementById("m_phone").textContent = u.phone ?? "-";

    document.getElementById("m_region").textContent = u.region ?? "-";
    document.getElementById("m_district").textContent = u.district ?? "-";

    document.getElementById("m_avatar").src = u.avatar ?? "/assets/default.png";

    const d = u.driverInfo ?? {};
    document.getElementById("m_car").textContent = d.carModel ?? "-";
    document.getElementById("m_color").textContent = d.carColor ?? "-";
    document.getElementById("m_number").textContent = d.carNumber ?? "-";

    let status = "Foydalanuvchi";
    if (u.role === "driver") {
        if (u.verified === true) status = "Tasdiqlangan";
        else if (u.verified === false) status = "Kutilmoqda";
        else status = "Rad etilgan";
    }
    document.getElementById("m_status").textContent = status;

    document.getElementById("m_balance").textContent = (u.balance ?? 0) + " so‘m";

    document.getElementById("modal").style.display = "flex";
};


// === MODAL CLOSE ===
window.closeModal = function () {
    document.getElementById("modal").style.display = "none";
};


// === BLOCK USER ===
window.blockUser = async function (id) {
    await update(ref(db, "users/" + id), { blocked: true });
    loadUsers();
};


// === UNBLOCK USER ===
window.unblockUser = async function (id) {
    await update(ref(db, "users/" + id), { blocked: false });
    loadUsers();
};


// === DELETE USER + ADS ===
window.deleteUser = async function (id) {
    if (!confirm("Userni o‘chirishni tasdiqlaysizmi?")) return;

    await remove(ref(db, "ads_by_user/" + id));
    await remove(ref(db, "users/" + id));

    loadUsers();
};

loadUsers();
