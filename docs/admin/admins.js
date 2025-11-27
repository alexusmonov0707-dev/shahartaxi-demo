import { db, ref, get, update, remove } from "./firebase.js";

export function initAdminsPage() {
    loadAdmins();

    document.getElementById("refreshBtn").addEventListener("click", loadAdmins);
}

async function loadAdmins() {
    const tbody = document.getElementById("adminsTable");
    tbody.innerHTML = `
        <tr><td colspan="4">Yuklanmoqda...</td></tr>
    `;

    try {
        const snap = await get(ref(db, "admins"));
        if (!snap.exists()) {
            tbody.innerHTML = `<tr><td colspan="4">Adminlar yo‘q</td></tr>`;
            return;
        }

        const data = snap.val();
        tbody.innerHTML = "";

        Object.keys(data).forEach(id => {
            const a = data[id];

            const full = escapeHtml(a.fullName || a.email || "-");
            const username = escapeHtml(a.username || "-");
            const role = escapeHtml(a.role || "-");

            tbody.insertAdjacentHTML("beforeend", `
                <tr>
                    <td>${full}</td>
                    <td>${username}</td>
                    <td><span class="badge ${role}">${role}</span></td>
                    <td>
                        <div class="action-btns">
                            <button class="btn btn-gray" data-id="${id}" data-action="edit">Tahrirlash</button>
                            <button class="btn btn-red" data-id="${id}" data-action="delete">O'chirish</button>
                        </div>
                    </td>
                </tr>
            `);
        });

        tbody.onclick = handleAction;

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4">Xato: ${err.message}</td></tr>`;
    }
}

function handleAction(e) {
    const btn = e.target.closest("button");
    if (!btn) return;

    const id = btn.dataset.id;
    const action = btn.dataset.action;

    if (action === "delete") deleteAdmin(id);
    if (action === "edit") editAdmin(id);
}

async function deleteAdmin(id) {
    if (!confirm("Haqiqatan o‘chirishni xohlaysizmi?")) return;

    try {
        await remove(ref(db, "admins/" + id));
        loadAdmins();
    } catch (err) {
        alert("Xato: " + err.message);
    }
}

async function editAdmin(id) {
    const snap = await get(ref(db, "admins/" + id));
    if (!snap.exists()) return alert("Admin topilmadi!");

    const a = snap.val();

    const newName = prompt("Ism / FullName:", a.fullName || "");
    if (newName === null) return;

    const newRole = prompt("Role (superadmin/admin/moderator):", a.role || "admin");
    if (newRole === null) return;

    await update(ref(db, "admins/" + id), {
        fullName: newName,
        role: newRole
    });

    loadAdmins();
}

function escapeHtml(s) {
    if (!s) return "";
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}
