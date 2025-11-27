// admins.js (module)
// Joy: /docs/admin/admins.js
// Modul sifatida ishlaydi va firebase.js (ESM) bilan bog'lanadi.

/*
  firebase.js exports used:
    export { db, ref, get, set, update, remove, push, onValue }
  (sen yuborgan firebase.js ga mos)
*/
import { db, ref, get, update, remove } from "./firebase.js";

/**
 * initAdminsPage
 * chaqirilganda sahifani yuklaydi va refresh tugmasini bog'laydi
 */
export function initAdminsPage() {
  // debug log
  // console.log("initAdminsPage run");

  loadAdmins();

  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", loadAdmins);
  }
}

/**
 * loadAdmins() — adminlar ro'yxatini DB dan oladi va jadvalga joylaydi
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

    // render each admin
    Object.keys(data).forEach(id => {
      const a = data[id] || {};
      const full = escapeHtml(a.fullName || a.email || "-");
      const username = escapeHtml(a.username || "-");
      const role = escapeHtml(a.role || "-");

      tbody.insertAdjacentHTML("beforeend", `
        <tr>
          <td>${full}</td>
          <td>${username}</td>
          <td><span class="badge ${role}">${role}</span></td>
          <td>
            <button data-id="${id}" data-action="edit" class="btn">Tahrirlash</button>
            <button data-id="${id}" data-action="delete" class="btn delete">O'chirish</button>
          </td>
        </tr>
      `);
    });

    // event delegation (bitta listener)
    tbody.onclick = function (e) {
      const btn = e.target.closest("button");
      if (!btn) return;
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      if (action === "edit") editAdmin(id);
      if (action === "delete") deleteAdmin(id);
    };

  } catch (err) {
    console.error("loadAdmins error:", err);
    tbody.innerHTML = `<tr><td colspan='4'>Xato: ${escapeHtml(err.message)}</td></tr>`;
  }
}

/**
 * deleteAdmin(id)
 */
async function deleteAdmin(id) {
  if (!confirm("Adminni o'chirishni tasdiqlaysizmi?")) return;

  try {
    await remove(ref(db, "admins/" + id));
    alert("O'chirildi");
    loadAdmins();
  } catch (err) {
    console.error("deleteAdmin error:", err);
    alert("Xato: " + err.message);
  }
}

/**
 * editAdmin(id) — prompt orqali oddiy tahrirlash
 */
async function editAdmin(id) {
  try {
    const snap = await get(ref(db, "admins/" + id));
    if (!snap.exists()) return alert("Admin topilmadi");

    const a = snap.val();

    const newFull = prompt("To'liq ismni kiriting:", a.fullName || "");
    if (newFull === null) return;

    const newRole = prompt("Role (superadmin/admin/moderator):", a.role || "admin");
    if (newRole === null) return;

    await update(ref(db, "admins/" + id), {
      fullName: newFull,
      role: newRole
    });

    alert("Yangilandi");
    loadAdmins();
  } catch (err) {
    console.error("editAdmin error:", err);
    alert("Xato: " + err.message);
  }
}

/* ---------- HELPERS ---------- */
function escapeHtml(s) {
  if (s === undefined || s === null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
