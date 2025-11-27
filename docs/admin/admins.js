// ===============
// Adminlar ro'yxati
// ===============

function loadAdmins() {
  const tbody = document.getElementById("adminsTable");
  tbody.innerHTML = "<tr><td colspan='4'>Yuklanmoqda...</td></tr>";

  db.ref("admins").once("value")
    .then(snap => {
      if (!snap.exists()) {
        tbody.innerHTML = "<tr><td colspan='4'>Hech narsa yo'q</td></tr>";
        return;
      }

      const data = snap.val();
      tbody.innerHTML = "";

      Object.keys(data).forEach(id => {
        const a = data[id];

        tbody.innerHTML += `
        <tr>
          <td>${a.fullName || '-'}</td>
          <td>${a.username}</td>
          <td>${a.role}</td>
          <td>
            <button onclick="editAdmin('${id}')">Tahrirlash</button>
            <button onclick="deleteAdmin('${id}')">O'chirish</button>
          </td>
        </tr>`;
      });
    });
}

// ===============
// O‘CHIRISH
// ===============
function deleteAdmin(id) {
  if (!confirm("O‘chirishni tasdiqlaysizmi?")) return;

  db.ref("admins/" + id).remove()
    .then(() => {
      alert("O‘chirildi!");
      loadAdmins();
    });
}

// ===============
// TAHRIRLASH
// ===============
function editAdmin(id) {
  db.ref("admins/" + id).once("value").then(s => {
    if (!s.exists()) return;

    const a = s.val();
    const newName = prompt("Yangi ism:", a.fullName || "");
    if (newName === null) return;

    const newRole = prompt("Role:", a.role);
    if (newRole === null) return;

    db.ref("admins/" + id).update({
      fullName: newName,
      role: newRole
    }).then(() => {
      alert("Yangilandi!");
      loadAdmins();
    });
  });
}

// Ishga tushirish
window.addEventListener("load", loadAdmins);

// Globalga chiqaramiz
window.loadAdmins = loadAdmins;
window.deleteAdmin = deleteAdmin;
window.editAdmin = editAdmin;
