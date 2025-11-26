import { db, ref, get, update, remove } from "../libs/lib.js";

const usersTable = document.getElementById("usersTableBody");

// Fetch users
async function loadUsers() {
    const usersRef = ref(db, "users");
    const snapshot = await get(usersRef);

    usersTable.innerHTML = "";

    if (!snapshot.exists()) return;

    const users = snapshot.val();

    Object.keys(users).forEach((uid) => {
        const u = users[uid];

        const fullName = u.fullName || "Noma'lum";
        const phone = u.phone || "Noma'lum";
        const region = u.region || "/";
        const district = u.district || "/";
        const blocked = u.blocked ? "Bloklangan" : "✓ Aktiv";

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${fullName}</td>
            <td>${phone}</td>
            <td>${region} / ${district}</td>
            <td>${blocked}</td>
            <td>
                <button onclick="openModal('${uid}')" class="blockBtn">Block</button>
                <button onclick="deleteUser('${uid}')" class="deleteBtn">Delete</button>
            </td>
        `;

        usersTable.appendChild(tr);
    });
}

loadUsers();


// ====================== MODAL ======================

const modal = document.getElementById("userModal");
const modalName = document.getElementById("modalName");
const modalPhone = document.getElementById("modalPhone");
const modalRegion = document.getElementById("modalRegion");
const modalDistrict = document.getElementById("modalDistrict");
const modalStatus = document.getElementById("modalStatus");
const modalAvatar = document.getElementById("modalAvatar");

window.openModal = async function (uid) {
    const userRef = ref(db, "users/" + uid);
    const snapshot = await get(userRef);

    if (!snapshot.exists()) return;

    const u = snapshot.val();

    modalName.innerText = u.fullName || "Noma'lum";
    modalPhone.innerText = u.phone || "Noma'lum";
    modalRegion.innerText = u.region || "/";
    modalDistrict.innerText = u.district || "/";
    modalStatus.innerText = u.blocked ? "Bloklangan" : "✓ Aktiv";
    modalAvatar.src = u.techPassportUrl || "https://i.ibb.co/5BCc1cv/default-avatar.png";

    modal.style.display = "flex";
};

window.closeModal = function () {
    modal.style.display = "none";
};


// ====================== BLOCK USER ======================

window.blockUser = async function(uid){
    const userRef = ref(db, "users/" + uid);
    await update(userRef, { blocked: true });
    loadUsers();
    closeModal();
};

// ====================== DELETE USER ======================

window.deleteUser = async function(uid){
    if (!confirm("Rostdan o‘chirilsinmi?")) return;
    const userRef = ref(db, "users/" + uid);
    await remove(userRef);
    loadUsers();
};

