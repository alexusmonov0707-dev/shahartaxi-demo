// users.js
// module: saqlang va users.html ichida <script type="module" src="./users.js"></script> bilan chaqiring

import { db, ref, onValue, remove, get } from "../libs/lib.js";

// --- CONFIG ---
const DEFAULT_AVATAR = "https://i.ibb.co/4nMfDymT/avatar-default-png.jpg"; // agar kerak bo'lsa o'zgartiring

// DOM elementlar
const usersTable = document.getElementById("usersTable");       // <tbody> yoki container
const searchInput = document.getElementById("searchInput");     // qidiruv input
const userModal = document.getElementById("userModal");         // modal container
const modalName = document.getElementById("modalName");
const modalPhone = document.getElementById("modalPhone");
const modalRegion = document.getElementById("modalRegion");
const modalDistrict = document.getElementById("modalDistrict");
const modalAvatar = document.getElementById("modalAvatar");
const modalStatus = document.getElementById("modalStatus");
const modalCloseBtn = document.getElementById("modalCloseBtn");

// xavfsizlik: elementlar mavjudligini tekshirish
function elOrNull(id) { return document.getElementById(id) || null; }

if (!usersTable) {
  console.warn("usersTable elementi topilmadi. users.html ichida id='usersTable' qo'shing.");
}

// --- Modal funksiyalari ---
function openModal(data = {}) {
  if (!userModal) return;
  modalName && (modalName.textContent = data.fullName || "Noma'lum");
  modalPhone && (modalPhone.textContent = data.phone || "/");
  modalRegion && (modalRegion.textContent = (data.driverInfo && data.driverInfo.fromRegion) || "/");
  modalDistrict && (modalDistrict.textContent = (data.driverInfo && data.driverInfo.fromDistrict) || "/");
  modalStatus && (modalStatus.textContent = data.blocked ? "Bloklangan" : "Aktiv");
  modalAvatar && (modalAvatar.src = (data.techPassportUrl || data.avatar || DEFAULT_AVATAR));
  userModal.style.display = "block";
}
function closeModal() {
  if (!userModal) return;
  userModal.style.display = "none";
}
if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeModal);

// hamma joyda foydalanish uchun global (agar kerak bo'lsa)
window.openUserModal = openModal;
window.closeModal = closeModal;

// --- Helper: create table row ---
function createUserRow(uid, userData) {
  const tr = document.createElement("tr");

  const name = userData.fullName || (userData.driverInfo && userData.driverInfo.fullName) || "Noma'lum";
  const phone = userData.phone || "/";
  const region = (userData.driverInfo && userData.driverInfo.fromRegion) || "/";
  const blocked = !!userData.blocked;

  tr.innerHTML = `
    <td>${escapeHtml(name)}</td>
    <td>${escapeHtml(phone)}</td>
    <td>${escapeHtml(region)}</td>
    <td>${blocked ? "Bloklangan" : "✓ Aktiv"}</td>
    <td>
      <button class="btn-block" data-uid="${uid}">Block</button>
      <button class="btn-delete" data-uid="${uid}">Delete</button>
      <button class="btn-view" data-uid="${uid}">View</button>
    </td>
  `;

  // voqealar
  tr.querySelector(".btn-delete")?.addEventListener("click", async () => {
    if (!confirm("Foydalanuvchini o‘chirmoqchimisiz?")) return;
    try {
      await remove(ref(db, `users/${uid}`));
      // tafsilot: agar ads yoki boshqa manbalardan ham tozalash kerak bo'lsa qo'shing
      alert("O‘chirildi.");
    } catch (err) {
      console.error(err);
      alert("O'chirishda xato.");
    }
  });

  tr.querySelector(".btn-block")?.addEventListener("click", async () => {
    try {
      // toggle blocked — Read current then update
      const userRef = ref(db, `users/${uid}`);
      const snap = await get(userRef);
      const u = snap.exists() ? snap.val() : null;
      if (!u) { alert("Foydalanuvchi topilmadi."); return; }
      await userRef.update
        ? userRef.update({ blocked: !u.blocked })  // agar API update mavjud bo'lsa
        : set(ref(db, `users/${uid}/blocked`), !u.blocked); // yoki fallback
      alert("Holat o'zgardi.");
    } catch (err) {
      console.error(err);
      alert("Holatni o'zgartirishda xato.");
    }
  });

  tr.querySelector(".btn-view")?.addEventListener("click", async () => {
    // modal ochish uchun original ma'lumotni olib kelamiz
    try {
      const snap = await get(ref(db, `users/${uid}`));
      const data = snap.exists() ? snap.val() : {};
      openModal(data);
    } catch (err) {
      console.error(err);
      alert("Foydalanuvchi ma'lumotini olishda xato.");
    }
  });

  return tr;
}

// --- XSS dan saqlash ---
function escapeHtml(str) {
  if (typeof str !== "string") return str || "";
  return str.replace(/[&<>"'`=\/]/g, function(s) {
    return ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    })[s];
  });
}

// --- Yuklash / real-time kuzatuv ---
async function loadUsers() {
  if (!usersTable) return;
  try {
    const usersRef = ref(db, "users");
    onValue(usersRef, (snapshot) => {
      // sahifa bo'shatish
      usersTable.innerHTML = "";
      const val = snapshot.val();
      if (!val) return;
      Object.keys(val).forEach(uid => {
        const u = val[uid];
        const row = createUserRow(uid, u);
        usersTable.appendChild(row);
      });
    }, (err) => {
      console.error("DB onValue error:", err);
    });
  } catch (err) {
    console.error(err);
  }
}

// qidiruv (oddiy filter client-side)
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    const q = (e.target.value || "").toLowerCase();
    const rows = usersTable?.querySelectorAll("tr") || [];
    rows.forEach(r => {
      const text = r.textContent.toLowerCase();
      r.style.display = text.indexOf(q) === -1 ? "none" : "";
    });
  });
}

// DOM tayyor bo'lgandan so'ng ishga tushirish
document.addEventListener("DOMContentLoaded", () => {
  // elementlar mavjudligini yana tekshirish
  if (!usersTable) {
    console.warn("usersTable topilmadi — users.html ichida <tbody id='usersTable'> qo'shing.");
    return;
  }
  loadUsers();
});
