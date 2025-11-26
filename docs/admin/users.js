// users.js
// To'liq: search + filters + client-side pagination (50/page) + export (SheetJS) + loader + modal + block/unblock/delete
import { db, ref, get, update, remove } from "../libs/lib.js";

let usersCache = [];       // All users loaded from Firebase
let filteredCache = [];    // After applying search & filters
let currentPage = 1;
const perPage = 50;        // As requested
let totalPages = 1;

// ------------------ UTIL / UI ------------------
function setTableLoading(text = "Yuklanmoqda...") {
    const tbody = document.getElementById("usersTable");
    tbody.innerHTML = `<tr><td colspan="6">${text}</td></tr>`;
}

function updatePageInfo() {
    document.getElementById("pageInfo").textContent = `${currentPage} / ${totalPages}`;
}

function clampPage() {
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;
}

// ------------------ LOAD USERS ------------------
export async function loadUsers() {
    setTableLoading();
    try {
        const snap = await get(ref(db, "users"));

        if (!snap.exists()) {
            usersCache = [];
            filteredCache = [];
            totalPages = 1;
            currentPage = 1;
            setTableLoading("Userlar topilmadi");
            updatePageInfo();
            return;
        }

        // Convert snapshot to array of user objects
        usersCache = Object.entries(snap.val()).map(([id, u]) => ({
            id,
            ...u,
            driverInfo: u.driverInfo ?? {},
        }));

        // Default sort: newest first if createdAt exists, else by fullName
        usersCache.sort((a, b) => {
            const at = a.createdAt ?? 0;
            const bt = b.createdAt ?? 0;
            if (at !== bt) return bt - at;
            return (a.fullName ?? "").localeCompare(b.fullName ?? "");
        });

        // Initialize filters/search
        applyFilters();
    } catch (err) {
        console.error("loadUsers error:", err);
        setTableLoading("Xato yuz berdi. Console'ga qarang.");
    }
}

// ------------------ RENDER ------------------
function renderUsersPage() {
    const tbody = document.getElementById("usersTable");
    tbody.innerHTML = "";

    if (!filteredCache.length) {
        tbody.innerHTML = `<tr><td colspan="6">Foydalanuvchilar topilmadi</td></tr>`;
        totalPages = 1;
        currentPage = 1;
        updatePageInfo();
        return;
    }

    // Pagination math
    totalPages = Math.max(1, Math.ceil(filteredCache.length / perPage));
    clampPage();
    updatePageInfo();

    const start = (currentPage - 1) * perPage;
    const end = Math.min(start + perPage, filteredCache.length);
    const pageSlice = filteredCache.slice(start, end);

    for (const u of pageSlice) {
        const phone = u.phone ?? "-";
        const role = u.role ?? "user";
        // region/district may be stored in profile or root; try both
        const region = u.region ?? (u.profile?.region ?? "-");
        const district = u.district ?? (u.profile?.district ?? "-");

        let status = "Foydalanuvchi";
        if (role === "driver") {
            if (u.verified === true) status = `<span class="badge verified">Tasdiqlangan</span>`;
            else if (u.verified === false) status = `<span class="badge pending">Kutilmoqda</span>`;
            else status = `<span class="badge rejected">Rad etilgan</span>`;
        }

        const blocked = !!u.blocked;

        tbody.innerHTML += `
            <tr onclick="openModal('${u.id}')">
                <td>${escapeHtml(u.fullName ?? "-")}</td>
                <td>${escapeHtml(phone)}</td>
                <td>${escapeHtml(region)} / ${escapeHtml(district)}</td>
                <td><span class="badge ${role}">${escapeHtml(role)}</span></td>
                <td>${status}</td>
                <td>
                    ${
                        blocked
                        ? `<button class="btn unblock" onclick="event.stopPropagation(); unblockUser('${u.id}')">Unblock</button>`
                        : `<button class="btn block" onclick="event.stopPropagation(); blockUser('${u.id}')">Block</button>`
                    }
                    <button class="btn delete" onclick="event.stopPropagation(); deleteUser('${u.id}')">Delete</button>
                </td>
            </tr>
        `;
    }
}

// Simple escape to avoid injecting HTML from DB fields
function escapeHtml(str) {
    if (typeof str !== "string") return str;
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ------------------ SEARCH & FILTERS ------------------
window.searchUsers = function () {
    // trigger filters pipeline
    currentPage = 1;
    applyFilters();
};

function getFilterValues() {
    const q = (document.getElementById("search")?.value ?? "").trim().toLowerCase();
    const role = (document.getElementById("filterRole")?.value ?? "").trim();
    const verify = (document.getElementById("filterVerify")?.value ?? "").trim();
    const blocked = (document.getElementById("filterBlocked")?.value ?? "").trim();
    return { q, role, verify, blocked };
}

window.applyFilters = function () {
    const { q, role, verify, blocked } = getFilterValues();

    filteredCache = usersCache.filter(u => {
        // role filter
        if (role) {
            if ((u.role ?? "user") !== role) return false;
        }

        // verify filter
        if (verify) {
            if (verify === "pending") {
                if (!(u.role === "driver" && (u.verified === false || u.verified === undefined))) return false;
            } else if (verify === "verified") {
                if (u.verified !== true) return false;
            } else if (verify === "rejected") {
                if (u.verified !== "rejected") return false;
            }
        }

        // blocked filter
        if (blocked) {
            if (blocked === "blocked" && !u.blocked) return false;
            if (blocked === "active" && u.blocked) return false;
        }

        // search q — name, phone, carModel
        if (q) {
            const name = (u.fullName ?? "").toLowerCase();
            const phone = (u.phone ?? "").toLowerCase();
            const car = (u.driverInfo?.carModel ?? "").toLowerCase();
            if (!name.includes(q) && !phone.includes(q) && !car.includes(q)) return false;
        }

        return true;
    });

    // After filtering, render
    renderUsersPage();
};

// ------------------ PAGINATION CONTROLS ------------------
window.prevPage = function () {
    if (currentPage <= 1) return;
    currentPage--;
    renderUsersPage();
};

window.nextPage = function () {
    if (currentPage >= totalPages) return;
    currentPage++;
    renderUsersPage();
};

// ------------------ MODAL ------------------
window.openModal = function (id) {
    const u = usersCache.find(x => x.id === id);
    if (!u) return;

    document.getElementById("m_fullName").textContent = u.fullName ?? "-";
    document.getElementById("m_phone").textContent = u.phone ?? "-";

    document.getElementById("m_region").textContent = u.region ?? (u.profile?.region ?? "-");
    document.getElementById("m_district").textContent = u.district ?? (u.profile?.district ?? "-");

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

    // Show modal
    document.getElementById("modal").style.display = "flex";
};

window.closeModal = function () {
    document.getElementById("modal").style.display = "none";
};

// Close modal when clicking outside content
document.addEventListener("click", function (e) {
    const modal = document.getElementById("modal");
    if (!modal) return;
    if (modal.style.display === "flex") {
        const content = document.getElementById("modalContent");
        if (!content.contains(e.target)) {
            modal.style.display = "none";
        }
    }
});

// ------------------ BLOCK / UNBLOCK ------------------
window.blockUser = async function (id) {
    if (!confirm("Userni block qilamizmi?")) return;
    try {
        await update(ref(db, "users/" + id), { blocked: true });
        // Update cache locally for snappy UI
        const u = usersCache.find(x => x.id === id);
        if (u) u.blocked = true;
        applyFilters();
    } catch (err) {
        console.error("blockUser error:", err);
        alert("Block qilishda xato.");
    }
};

window.unblockUser = async function (id) {
    if (!confirm("Userni unblock qilamizmi?")) return;
    try {
        await update(ref(db, "users/" + id), { blocked: false });
        const u = usersCache.find(x => x.id === id);
        if (u) u.blocked = false;
        applyFilters();
    } catch (err) {
        console.error("unblockUser error:", err);
        alert("Unblock qilishda xato.");
    }
};

// ------------------ DELETE USER + ADS ------------------
window.deleteUser = async function (id) {
    if (!confirm("Userni o‘chirishni tasdiqlaysizmi? (Ads ham o‘chadi)")) return;
    try {
        await remove(ref(db, "ads_by_user/" + id));
        await remove(ref(db, "users/" + id));
        // Remove from local cache
        usersCache = usersCache.filter(x => x.id !== id);
        applyFilters();
    } catch (err) {
        console.error("deleteUser error:", err);
        alert("O'chirishda xato.");
    }
};

// ------------------ EXPORT TO EXCEL (SheetJS) ------------------
window.exportExcel = function () {
    if (typeof XLSX === "undefined") {
        alert("SheetJS kutubxonasi yuklanmagan.");
        return;
    }

    // Export currently filtered users (all pages)
    const rows = filteredCache.map(u => {
        const region = u.region ?? (u.profile?.region ?? "");
        const district = u.district ?? (u.profile?.district ?? "");
        return {
            id: u.id,
            fullName: u.fullName ?? "",
            phone: u.phone ?? "",
            region,
            district,
            role: u.role ?? "user",
            verified: u.verified === true ? "yes" : (u.verified === "rejected" ? "rejected" : "no"),
            createdAt: u.createdAt ? (new Date(u.createdAt)).toLocaleString() : "",
            balance: u.balance ?? 0
        };
    });

    if (!rows.length) {
        alert("Export uchun user topilmadi.");
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
    const now = new Date().toISOString().slice(0,19).replace(/[:T]/g, "-");
    XLSX.writeFile(workbook, `users-export-${now}.xlsx`);
};

// ------------------ INIT ------------------
// Load users on script load
loadUsers();

// Expose loadUsers for potential manual refresh button in future
window.reloadUsers = loadUsers;
