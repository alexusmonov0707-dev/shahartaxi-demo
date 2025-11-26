// FIREBASE SETTINGS
const firebaseConfig = {
    apiKey: "...",
    authDomain: "...",
    databaseURL: "...",
    projectId: "...",
    storageBucket: "...",
    messagingSenderId: "...",
    appId: "..."
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const usersList = document.getElementById("usersList");
const searchInput = document.getElementById("searchInput");


// ==================== LOAD USERS =====================

function loadUsers() {
    db.ref("users").on("value", (snap) => {
        usersList.innerHTML = "";

        snap.forEach(child => {
            const user = child.val();
            const uid = child.key;

            const name = user.fullName || "Noma'lum";
            const phone = user.phone || "/";
            const region = user.region || "/";
            const district = user.district || "/";
            const blocked = user.blocked ? "❌ Bloklangan" : "✓ Aktiv";

            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td onclick="openUser('${uid}')">${name}</td>
                <td>${phone}</td>
                <td>${region} / ${district}</td>
                <td>${blocked}</td>
                <td>
                    <button class="btn blockBtn" onclick="blockUser('${uid}', ${!user.blocked})">
                        ${user.blocked ? "Unblock" : "Block"}
                    </button>
                    <button class="btn deleteBtn" onclick="deleteUser('${uid}')">Delete</button>
                </td>
            `;

            usersList.appendChild(tr);
        });
    });
}

loadUsers();


// ================= SEARCH =================

searchInput.addEventListener("keyup", function () {
    let value = this.value.toLowerCase();
    let rows = usersList.getElementsByTagName("tr");

    for (let i = 0; i < rows.length; i++) {
        let txt = rows[i].innerText.toLowerCase();
        rows[i].style.display = txt.includes(value) ? "" : "none";
    }
});


// ================= DELETE =================

function deleteUser(uid) {
    if (confirm("O‘chirishni tasdiqlaysizmi?")) {
        db.ref("users/" + uid).remove();
    }
}


// ================= BLOCK / UNBLOCK =================

function blockUser(uid, status) {
    db.ref("users/" + uid).update({
        blocked: status
    });
}


// ================= MODAL OPEN =================

function openUser(uid) {
    db.ref("users/" + uid).once("value", snap => {
        const u = snap.val();

        document.getElementById("modalName").innerText = u.fullName || "Noma'lum";
        document.getElementById("modalPhone").innerText = u.phone || "/";
        document.getElementById("modalRegion").innerText = u.region || "/";
        document.getElementById("modalDistrict").innerText = u.district || "/";
        document.getElementById("modalStatus").innerText = u.blocked ? "❌ Bloklangan" : "✓ Aktiv";

        document.getElementById("modalAvatar").src =
            u.avatar || "/assets/avatar-default.png";

        document.getElementById("userModal").style.display = "flex";
    });
}

function closeModal() {
    document.getElementById("userModal").style.display = "none";
}
