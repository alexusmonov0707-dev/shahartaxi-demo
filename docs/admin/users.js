import { db, ref, get, remove, update } from "../libs/lib.js";

const usersList = document.getElementById("usersList");

// MODAL ELEMENTS
const modal = document.getElementById("userModal");
const closeModal = document.getElementById("closeModal");
const closeBtn = document.getElementById("closeBtn");

function openModal() { modal.style.display = "block"; }
function hideModal() { modal.style.display = "none"; }

closeModal.onclick = hideModal;
closeBtn.onclick = hideModal;

// USERS NI CHAQISH
async function loadUsers() {
    const usersRef = ref(db, "users");
    const snap = await get(usersRef);

    usersList.innerHTML = "";

    if (!snap.exists()) return;

    const users = snap.val();

    Object.entries(users).forEach(([uid, user]) => {
        const name = user.name ?? "No name";
        const phone = user.phone ?? "---";
        const region = user.region ?? "/";
        const avatar = user.avatar ?? "../assets/default-avatar.png";
        const status = user.status === "active" ? "✓ Aktiv" : "Block";

        usersList.innerHTML += `
        <tr>
            <td><img src="${avatar}" class="avatar-sm"></td>
            <td>${name}</td>
            <td>${phone}</td>
            <td>${region}</td>
            <td>${status}</td>
            <td>
                <button onclick="showUser('${uid}')">Ko'rish</button>
                <button onclick="blockUser('${uid}')">Block</button>
                <button onclick="deleteUser('${uid}')">Delete</button>
            </td>
        </tr>`;
    });
}

window.showUser = async function (uid) {
    const snap = await get(ref(db, "users/" + uid));
    if (!snap.exists()) return;

    const user = snap.val();

    document.getElementById("m_name").innerText = user.name ?? "No name";
    document.getElementById("m_avatar").src = user.avatar ?? "../assets/default-avatar.png";
    document.getElementById("m_phone").innerText = user.phone ?? "-";
    document.getElementById("m_region").innerText = user.region ?? "-";
    document.getElementById("m_district").innerText = user.district ?? "-";
    document.getElementById("m_car").innerText = user.car ?? "-";
    document.getElementById("m_color").innerText = user.carColor ?? "-";
    document.getElementById("m_number").innerText = user.carNumber ?? "-";
    document.getElementById("m_balance").innerText = user.balance ?? "0";

    openModal();
};

window.blockUser = async function (uid) {
    await update(ref(db, "users/" + uid), { status: "blocked" });
    loadUsers();
};

window.deleteUser = async function (uid) {
    await remove(ref(db, "users/" + uid));
    loadUsers();
};

loadUsers();
