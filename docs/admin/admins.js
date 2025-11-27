// admins.js — adminlarni ko'rish, qo'shish, o'chirish, role o'zgartirish
// Joylashuv: /docs/admin/admins.js

import { db, ref, get, set, remove, update, push } from "../libs/lib.js"; // agar loyihada libs boshqa nom bo'lsa pathni moslang

// (1) Inits page, chaqiriladi from admins.html
export function initAdminsPage() {
  loadAdmins();
}

// (2) Load admins and render
export async function loadAdmins() {
  const tbody = document.getElementById("adminsTable");
  tbody.innerHTML = "<tr><td colspan='4'>Yuklanmoqda...</td></tr>";

  try {
    const snap = await get(ref(db, "admins"));
    if (!snap.exists()) {
      tbody.innerHTML = "<tr><td colspan='4'>Adminlar topilmadi</td></tr>";
      return;
    }

    const data = snap.val(); // object
    tbody.innerHTML = "";

    for (const key of Object.keys(data)) {
      const a = data[key];
      const full = a.fullName ?? a.email ?? key;
      const username = a.username ?? key;
      const role = a.role ?? "admin";

      tbody.innerHTML += `
        <tr>
          <td>${escapeHtml(full)}</td>
          <td>${escapeHtml(username)}</td>
          <td><span class="badge ${escapeHtml(role)}">${escapeHtml(role)}</span></td>
          <td>
            <button onclick="event.stopPropagation(); editAdmin('${key}')" class="btn">Tahrirlash</button>
            <button onclick="event.stopPropagation(); deleteAdmin('${key}')" class="btn delete">O'chirish</button>
          </td>
        </tr>
      `;
    }
  } catch (err) {
    console.error("loadAdmins error:", err);
    tbody.innerHTML = `<tr><td colspan='4'>Xato: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function escapeHtml(str) {
  if (typeof str !== "string") return str ?? "";
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// (3) Add admin — bu funksiya global bo'lishi kerak (admin-add.html chaqiradi)
window.addAdmin = async function () {
  const msg = document.getElementById("msg");
  msg.textContent = "";

  const fullName = document.getElementById("fullName").value.trim();
  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const role = document.getElementById("role").value;

  if (!username || !password) {
    msg.textContent = "Username va parol kiritilishi lozim.";
    return;
  }

  try {
    // check unique username
    const allSnap = await get(ref(db, "admins"));
    const all = allSnap.exists() ? allSnap.val() : {};

    // ensure username is unique (username field or key)
    for (const k of Object.keys(all)) {
      const a = all[k];
      if ((a.username && a.username === username) || k === username) {
        msg.textContent = "Bu username allaqachon mavjud. Boshqasini tanlang.";
        return;
      }
    }

    // create new admin with push (key generated)
    const newKeyRef = push(ref(db, "admins"));
    const adminId = newKeyRef.key;

    const adminObj = {
      username,
      fullName: fullName || username,
      email: email || "",
      password: password,
      role: role || "admin"
    };

    await set(ref(db, "admins/" + adminId), adminObj);

    // muvaffaqiyat
    alert("Admin qo'shildi.");
    location.href = "admins.html";
  } catch (err) {
    console.error("addAdmin error:", err);
    msg.textContent = "Xatolik: " + err.message;
  }
};

// (4) Delete admin
window.deleteAdmin = async function (id) {
  if (!confirm("Adminni o'chirishni tasdiqlaysizmi?")) return;
  try {
    await remove(ref(db, "admins/" + id));
    alert("O'chirildi.");
    loadAdmins();
  } catch (err) {
    console.error("deleteAdmin error:", err);
    alert("O'chirishda xato: " + err.message);
  }
};

// (5) Edit admin — oddiy prompt orqali tahrirlash (soddalashtirilgan)
window.editAdmin = async function (id) {
  try {
    const snap = await get(ref(db, "admins/" + id));
    if (!snap.exists()) return alert("Admin topilmadi.");

    const a = snap.val();
    const newFull = prompt("To'liq ism:", a.fullName || "");
    if (newFull === null) return;
    const newRole = prompt("Role (superadmin/admin/moderator):", a.role || "admin");
    if (newRole === null) return;

    await update(ref(db, "admins/" + id), {
      fullName: newFull,
      role: newRole
    });

    alert("Yangilandi.");
    loadAdmins();
  } catch (err) {
    console.error("editAdmin error:", err);
    alert("Tahrirlashda xato: " + err.message);
  }
};
