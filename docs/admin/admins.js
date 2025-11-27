// admins.js — MODULE VERSION

import { db, ref, get, update, remove } from "./firebase.js";

export function initAdminsPage() {
    console.log("initAdminsPage RUN"); // debugging
    loadAdmins();

    const btn = document.getElementById("refreshBtn");
    if (btn) {
        btn.addEventListener("click", loadAdmins);
    }
}

async function loadAdmins() {
    const tbody = document.getElementById("adminsTable");
    tbody.innerHTML = "<tr><td colspan='4'>Yuklanmoqda...</td></tr>";

    try {
        const snap = await get(ref(db, "admins"));
        if (!snap.exists()) {
            tbody.innerHTML = "<tr><td colspan='4'>Adminlar yo'q</td></tr>";
            return;
        }

        const data = snap.val();
        tbody.innerHTML = "";

        Object.keys(data).forEach(id => {
            const a = data[id];

            tbody.innerHTML += `
                <tr>
                    <td>${a.fullName || '-'}</td>
                    <td>${a.username || '-'}</td>
                    <td>${a.role || '-'}</td>
                    <td>
                        <button data-id="${id}" data-action="edit">Tahrirlash</button>
                        <button data-id="${id}" data-action="delete">O'chirish</button>
                    </td>
                </tr>
            `;
        });

        tbody.onclick = function (e) {
            const btn = e.target.closest("button");
            if (!btn) return;

            const id = btn.dataset.id;
            const act = btn.dataset.action;

            if (act === "delete") deleteAdmin(id);
            if (act === "edit") editAdmin(id);
        };

    } catch (err) {
        tbody.innerHTML = "<tr><td colspan='4'>Xato: " + err.message + "</td></tr>";
    }
}

async function deleteAdmin(id) {
    if (!confirm("Rostan o'chirasizmi?")) return;

    await remove(ref(db, "admins/" + id));
    alert("O'chirildi!");
    loadAdmins();
}

async function editAdmin(id) {
    const snap = await get(ref(db, "admins/" + id));
    if (!snap.exists()) return alert("Admin topilmadi");

    const a = snap.val();

    const newName = prompt("Yangi ism:", a.fullName);
    if (newName === null) return;

    const newRole = prompt("Role:", a.role);
    if (newRole === null) return;

    await update(ref(db, "admins/" + id), {
        fullName: newName,
        role: newRole
    });

    alert("Yangilandi!");
    loadAdmins();
}
