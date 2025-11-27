// admins.js  — MODULE VERSION (GitHub Pages uchun to‘liq mos)

// Firebase imports (module variant)
import { db, ref, get, set, remove, update, push } from "../firebase.js";

/*
 * Sahifa yuklanganda adminlar ro'yxatini yuklaymiz
 * VA yangilash tugmasini ishlatamiz
 */
export function initAdminsPage() {
    loadAdmins();

    // Yangilash tugmasi modul ichidan boshqariladi
    const refreshBtn = document.getElementById("refreshBtn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadAdmins);
    }
}

/*
 * Adminlarni yuklash
 */
async function loadAdmins() {
    const tbody = document.getElementById("adminsTable");
    if (!tbody) return;

    tbody.innerHTML = "<tr><td colspan='4'>Yuklanmoqda...</td></tr>";

    try {
        const snap = await get(ref(db, "admins"));
        if (!snap.exists()) {
            tbody.innerHTML = "<tr><td colspan='4'>Adminlar topilmadi</td></tr>";
            return;
        }

        const data = snap.val();
        tbody.innerHTML = "";

        for (const key of Object.keys(data)) {
            const a = data[key];

            tbody.innerHTML += `
                <tr>
                    <td>${escape(a.fullName || a.email || "-")}</td>
                    <td>${escape(a.username || "-")}</td>
                    <td><span class="badge ${escape(a.role)}">${escape(a.role)}</span></td>
                    <td>
                        <button class="btn" data-id="${key}" data-action="edit">Tahrirlash</button>
                        <button class="btn delete" data-id="${key}" data-action="delete">O'chirish</button>
                    </td>
                </tr>
            `;
        }

        // Event delegation — tahrirlash va o‘chirish
        tbody.addEventListener("click", tableActions);

    } catch (err) {
        console.error("loadAdmins error:", err);
        tbody.innerHTML = `<tr><td colspan='4'>Xato: ${err.message}</td></tr>`;
    }
}

/*
 * Jadvaldagi tugmalar boshqaruvi
 */
function tableActions(e) {
    const btn = e.target.closest("button");
    if (!btn) return;

    const id = btn.dataset.id;
    const action = btn.dataset.action;

    if (action === "edit") editAdmin(id);
    if (action === "delete") deleteAdmin(id);
}

/*
 * Adminni o'chirish
 */
async function deleteAdmin(id) {
    if (!confirm("Adminni o‘chirishni tasdiqlaysizmi?")) return;

    try {
        await remove(ref(db, "admins/" + id));
        alert("O‘chirildi");
        loadAdmins();
    } catch (err) {
        alert("Xato: " + err.message);
    }
}

/*
 * Admin tahrirlash
 */
async function editAdmin(id) {
    try {
        const snap = await get(ref(db, "admins/" + id));
        if (!snap.exists()) return alert("Admin topilmadi");

        const a = snap.val();

        const newName = prompt("Yangi ism:", a.fullName || "");
        if (newName === null) return;

        const newRole = prompt("Yangi rol (superadmin/admin/moderator):", a.role);
        if (newRole === null) return;

        await update(ref(db, "admins/" + id), {
            fullName: newName,
            role: newRole
        });

        alert("Yangilandi");
        loadAdmins();

    } catch (err) {
        alert("Xato: " + err.message);
    }
}

/*
 * XSSdan himoya
 */
function escape(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}
