import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getDatabase,
    ref,
    onValue,
    update,
    remove,
    get,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
    databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const usersRef = ref(db, "users");
const usersTable = document.getElementById("usersTable");

// DEFAULT AVATAR
const defaultAvatar = "https://i.ibb.co/0jKq0s3/avatar-default.png";

// LOAD USERS
onValue(usersRef, (snapshot) => {
    usersTable.innerHTML = "";

    snapshot.forEach(user => {
        const data = user.val();

        const name = data.fullName ?? "Noma'lum";
        const phone = data.phone ?? "/";
        const region = data.region ?? "/";
        const district = data.district ?? "/";
        const status = data.blocked ? "❌ Bloklangan" : "✓ Aktiv";
        const avatar = data.avatar ?? defaultAvatar;

        usersTable.innerHTML += `
            <tr>
                <td onclick="openModal('${user.key}')">${name}</td>
                <td>${phone}</td>
                <td>${region} / ${district}</td>
                <td>${status}</td>
                <td>
                    <button class="btn btn-warning" onclick="blockUser('${user.key}', ${data.blocked})">Block</button>
                    <button class="btn btn-danger" onclick="deleteUser('${user.key}')">Delete</button>
                </td>
            </tr>
        `;
    });
});

// BLOCK USER
window.blockUser = function (uid, current) {
    update(ref(db, "users/" + uid), { blocked: !current });
};

// DELETE USER
window.deleteUser = function (uid) {
    if (confirm("Rostdan o‘chirmoqchimisiz?")) {
        remove(ref(db, "users/" + uid));
    }
};

// OPEN MODAL
window.openModal = async function (uid) {
    const snap = await get(ref(db, "users/" + uid));
    const data = snap.val();

    document.getElementById("modalAvatar").src = data.avatar ?? defaultAvatar;
    document.getElementById("modalName").innerHTML = data.fullName ?? "Noma'lum";
    document.getElementById("modalPhone").innerHTML = data.phone ?? "/";
    document.getElementById("modalRegion").innerHTML = data.region ?? "/";
    document.getElementById("modalDistrict").innerHTML = data.district ?? "/";
    document.getElementById("modalStatus").innerHTML = data.blocked ? "Bloklangan" : "Aktiv";

    document.getElementById("userModal").style.display = "flex";
};

// CLOSE MODAL
window.closeModal = function () {
    document.getElementById("userModal").style.display = "none";
};

// SEARCH
document.getElementById("search").addEventListener("input", function () {
    const value = this.value.toLowerCase();
    const rows = usersTable.querySelectorAll("tr");

    rows.forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(value)
            ? ""
            : "none";
    });
});
