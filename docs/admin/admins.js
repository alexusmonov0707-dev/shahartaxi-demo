// GLOBAL admins.js
// GitHub pages uchun module emas format

// Firebase import (sen ishlatayotgan uslub asosida)
import { db } from "./firebase.js";
import {
  ref,
  get,
  set,
  remove,
  update,
  push
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// =========================
// ADMINLARNI YUKLASH
// =========================
async function loadAdmins() {
  const tbody = document.getElementById("adminsTable");
  tbody.innerHTML = "<tr><td colspan='4'>Yuklanmoqda...</td></tr>";

  try {
    const snap = await get(ref(db, "admins"));
    if (!snap.exists()) {
      tbody.innerHTML = "<tr><td colspan='4'>Adminlar topilmadi</td></tr>";
      return;
    }

    const data = snap.val();
    tbody.innerHTML = "";

    Object.keys(data).forEach(key => {
      const a = data[key];

      tbody.innerHTML += `
      <tr>
        <td>${escapeHtml(a.fullName || a.email || "-")}</td>
        <td>${escapeHtml(a.username)}</td>
        <td><span class="badge ${a.role}">${a.role}</span></td>
        <td>
          <button class="btn" onclick="editAdmin('${key}')">Tahrirlash</button>
          <button class="btn delete" onclick="deleteAdmin('${key}')">O'chirish</button>
        </td>
      </tr>`;
    });

  } catch (err) {
    console.error("loadAdmins error:", err);
    tbody.innerHTML = `<tr><td colspan='4'>Xato: ${err.message}</td></tr>`;
  }
}

// Escape
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// =========================
// ADMINNI O'CHIRISH
// =========================
async function deleteAdmin(id) {
  if (!confirm("Adminni o'chirishni tasdiqlaysizmi?")) return;

  try {
    await remove(ref(db, "admins/" + id));
    alert("O'chirildi!");
    loadAdmins();
  } catch (err) {
    alert("Xato: " + err.message);
  }
}

// =========================
// ADMIN TAHRIRLASH
// =========================
async function editAdmin(id) {
  const snap = await get(ref(db, "admins/" + id));
  if (!snap.exists()) return alert("Admin topilmadi!");

  const a = snap.val();

  const newName = prompt("Yangi ism:", a.fullName || "");
  if (newName === null) return;

  const newRole = prompt("Role (superadmin/admin/moderator):", a.role);
  if (newRole === null) return;

  await update(ref(db, "admins/" + id), {
    fullName: newName,
    role: newRole
  });

  alert("Yangilandi!");
  loadAdmins();
}

// ==========================
// GLOBALLASHTIRAMIZ
// ==========================
window.loadAdmins = loadAdmins;
window.deleteAdmin = deleteAdmin;
window.editAdmin = editAdmin;

// Sahifa yuklanganda avtomatik yuklash
window.addEventListener("load", loadAdmins);
