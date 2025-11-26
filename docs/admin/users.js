// users.js — modul sifatida yuklanadi
import { db, ref, get, update, remove } from "./firebase.js";

let usersCache = []; // barcha userlarni cache qilamiz

// DOM tayyorligini kutamiz — skript pastda bo'lsa ham, qo'shimcha himoya
document.addEventListener("DOMContentLoaded", () => {
  // yuklash
  loadUsers().catch(err => {
    console.error("Load users error:", err);
    const tbody = document.getElementById("usersTable");
    if (tbody) tbody.innerHTML = "<tr><td colspan='5'>Xatolik yuz berdi</td></tr>";
  });
});

async function loadUsers() {
  const tbody = document.getElementById("usersTable");
  if (!tbody) return; // element topilmasa chiqamiz

  tbody.innerHTML = "<tr><td colspan='5'>Yuklanmoqda...</td></tr>";

  const snap = await get(ref(db, "users"));
  if (!snap || !snap.exists()) {
    tbody.innerHTML = "<tr><td colspan='5'>Foydalanuvchilar topilmadi</td></tr>";
    usersCache = [];
    return;
  }

  const data = snap.val();
  usersCache = Object.entries(data).map(([id, u]) => ({ id, ...u }));

  renderTable(usersCache);
}

function safe(v, def = "") {
  return (v === undefined || v === null) ? def : v;
}

function renderTable(list) {
  const tbody = document.getElementById("usersTable");
  if (!tbody) return;
  if (!Array.isArray(list) || list.length === 0) {
    tbody.innerHTML = "<tr><td colspan='5'>Foydalanuvchilar topilmadi</td></tr>";
    return;
  }

  // To'g'ri event bubbling uchun har bir satr ichida tugmalarni alohida handler bilan yaratamiz
  tbody.innerHTML = list.map(u => {
    const name = safe(u.fullName, "Noma'lum");
    const phone = safe(u.phone, "");
    const region = safe(u.fromRegion, "/");
    const district = safe(u.fromDistrict, "/");
    const status = (u.blocked) ? "🚫 Bloklangan" : "✔ Aktiv";

    const blockBtnHtml = u.blocked
      ? `<button class="btn unblock" data-action="unblock" data-id="${u.id}">Unblock</button>`
      : `<button class="btn block" data-action="block" data-id="${u.id}">Block</button>`;

    return `
      <tr data-id="${u.id}" class="user-row" style="cursor:pointer">
        <td class="u-name">${escapeHtml(name)}</td>
        <td class="u-phone">${escapeHtml(phone)}</td>
        <td class="u-region">${escapeHtml(region)} / ${escapeHtml(district)}</td>
        <td class="u-status">${escapeHtml(status)}</td>
        <td class="u-actions">
          ${blockBtnHtml}
          <button class="btn delete" data-action="delete" data-id="${u.id}">Delete</button>
        </td>
      </tr>
    `;
  }).join("");

  // satr bosilganda modal ochish
  tbody.querySelectorAll(".user-row").forEach(row => {
    row.addEventListener("click", (e) => {
      const id = row.getAttribute("data-id");
      openModal(id);
    });
  });

  // action tugmalariga event
  tbody.querySelectorAll(".u-actions button").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const action = btn.getAttribute("data-action");
      const id = btn.getAttribute("data-id");
      if (action === "block") blockUser(id);
      if (action === "unblock") unblockUser(id);
      if (action === "delete") deleteUser(id);
    });
  });
}

// qidiruv funksiyasi
window.searchUsers = function() {
  const q = (document.getElementById("search")?.value || "").toLowerCase();
  const filtered = usersCache.filter(u => {
    return (safe(u.fullName, "").toLowerCase().includes(q)) ||
           (safe(u.phone, "").toLowerCase().includes(q)) ||
           (safe(u.carModel, "").toLowerCase().includes(q));
  });
  renderTable(filtered);
};

// modal
window.openModal = function(id) {
  const u = usersCache.find(x => x.id === id);
  if (!u) return;
  document.getElementById("m_fullName").textContent = safe(u.fullName, "Noma'lum");
  document.getElementById("m_phone").textContent = safe(u.phone, "-");
  document.getElementById("m_region").textContent = safe(u.fromRegion, "/");
  document.getElementById("m_district").textContent = safe(u.fromDistrict, "/");
  document.getElementById("m_car").textContent = safe(u.carModel, "-");
  document.getElementById("m_color").textContent = safe(u.carColor, "-");
  document.getElementById("m_number").textContent = safe(u.carNumber, "-");
  document.getElementById("m_balance").textContent = safe(u.balance, 0);

  // avatar: agar techPassportUrl yoki avatar mavjud bo'lsa foydalanamiz, aks holda default
  const avatarUrl = safe(u.techPassportUrl, "") || safe(u.avatar, "") || "https://i.ibb.co/0jKq0s3/avatar-default.png";
  const imgEl = document.getElementById("m_avatar");
  if (imgEl) imgEl.src = avatarUrl;

  const modal = document.getElementById("modal");
  if (modal) {
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
  }
};

window.closeModal = function() {
  const modal = document.getElementById("modal");
  if (modal) {
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
  }
};

// bloklash/ochish/o'chirish
async function reloadAndKeepSelection() {
  await loadUsers();
}

window.blockUser = async function(id) {
  if (!id) return;
  await update(ref(db, `users/${id}`), { blocked: true });
  await reloadAndKeepSelection();
};

window.unblockUser = async function(id) {
  if (!id) return;
  await update(ref(db, `users/${id}`), { blocked: false });
  await reloadAndKeepSelection();
};

window.deleteUser = async function(id) {
  if (!id) return;
  if (!confirm("Foydalanuvchini o‘chirilsinmi?")) return;
  await remove(ref(db, `users/${id}`));
  await reloadAndKeepSelection();
};

// yordamchi: XSSdan himoya uchun oddiy escape
function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return "";
  return String(unsafe)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
