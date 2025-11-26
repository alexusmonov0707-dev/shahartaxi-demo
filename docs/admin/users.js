import { db, ref, get, update, onValue } from "../libs/lib.js";

// DOM
const searchInput = document.getElementById("searchInput");
const roleFilter = document.getElementById("roleFilter");
const statusFilter = document.getElementById("statusFilter");
const usersTable = document.getElementById("usersTable");

let usersData = {};

// --- LOAD USERS REALTIME ---
onValue(ref(db, "users"), snap => {
    usersData = snap.exists() ? snap.val() : {};
    renderUsers();
});

// --- RENDER TABLE ---
function renderUsers() {
    usersTable.innerHTML = "";

    const search = searchInput.value.toLowerCase();
    const role = roleFilter.value;
    const status = statusFilter.value;

    Object.entries(usersData).forEach(([uid, user]) => {
        if (!user.fullName) return;

        // SEARCH
        if (
            user.fullName.toLowerCase().includes(search) === false &&
            user.phone?.includes(search) === false
        ) return;

        // ROLE FILTER
        if (role !== "all" && user.role !== role) return;

        // STATUS FILTER
        if (status !== "all") {
            if (status === "verified" && user.verified !== true) return;
            if (status === "pending" && user.verified !== false) return;
            if (status === "rejected" && user.verified !== "rejected") return;
        }

        // ROW
        const tr = document.createElement("tr");
        tr.className = "border-b hover:bg-gray-50";

        // STATUS BADGE
        let statusBadge = "";
        if (user.role === "driver") {
            if (user.verified === true)
                statusBadge = `<span class="text-green-600 font-semibold">Tasdiqlangan</span>`;
            else if (user.verified === false)
                statusBadge = `<span class="text-yellow-600 font-semibold">Kutilmoqda</span>`;
            else if (user.verified === "rejected")
                statusBadge = `<span class="text-red-600 font-semibold">Rad etilgan</span>`;
        } else {
            statusBadge = `<span class="text-blue-600">Yo‘lovchi</span>`;
        }

        // ROLE BADGE
        let roleBadge =
            user.role === "driver"
                ? `<span class="text-purple-600 font-semibold">Haydovchi</span>`
                : `<span class="text-gray-700">Yo‘lovchi</span>`;

        // ACTION BUTTON (BLOCK)
        const blockBtn = `
            <button data-block="${uid}"
                    class="px-2 py-1 rounded text-white 
                     ${user.blocked ? "bg-green-600" : "bg-red-600"}">
                ${user.blocked ? "Aktivlash" : "Bloklash"}
            </button>
        `;

        tr.innerHTML = `
            <td class="p-3">${user.fullName}</td>
            <td class="p-3">${user.phone || "-"}</td>
            <td class="p-3">${roleBadge}</td>
            <td class="p-3">${statusBadge}</td>
            <td class="p-3">${user.balance || 0} so‘m</td>
            <td class="p-3">${blockBtn}</td>
        `;

        usersTable.appendChild(tr);
    });

    attachActions();
}

// --- ACTION HANDLERS ---
function attachActions() {
    document.querySelectorAll("[data-block]").forEach(btn => {
        btn.onclick = async () => {
            const uid = btn.dataset.block;
            const user = usersData[uid];

            await update(ref(db, "users/" + uid), {
                blocked: !user.blocked
            });
        };
    });
}

// --- LIVE FILTER / SEARCH ---
searchInput.oninput = renderUsers;
roleFilter.onchange = renderUsers;
statusFilter.onchange = renderUsers;
