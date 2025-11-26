import { db, ref, onValue, remove, update } from "../libs/lib.js";

const tableBody = document.getElementById("usersTable");
const modal = document.getElementById("userModal");

// MODAL ELEMENTS
const m_name = document.getElementById("m_name");
const m_phone = document.getElementById("m_phone");
const m_region = document.getElementById("m_region");
const m_district = document.getElementById("m_district");
const m_status = document.getElementById("m_status");
const m_avatar = document.getElementById("m_avatar");


function closeModal() {
    modal.style.display = "none";
}

function openModal(user) {
    m_name.textContent = user.name || "Noma'lum";
    m_phone.textContent = user.phone || "-";
    m_region.textContent = user.region || "/";
    m_district.textContent = user.district || "/";
    m_status.textContent = user.status === "active" ? "✓ Aktiv" : "Bloklangan";

    m_avatar.src = user.avatar || "../img/default.png";

    modal.style.display = "flex";
}


// LOAD USERS
onValue(ref(db, "users"), (snapshot) => {
    tableBody.innerHTML = "";
    snapshot.forEach(child => {
        const id = child.key;
        const u = child.val();

        const name = u.name ?? "undefined";
        const phone = u.phone ?? "-";
        const region = u.region ?? "/";
        const status = u.status === "active" ? "✓ Aktiv" : "Bloklangan";

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="cursor:pointer;color:#007bff" onclick='openUser("${id}")'>
                ${name}
            </td>
            <td>${phone}</td>
            <td>${region}</td>
            <td>${status}</td>
            <td>
                <button class="btn btn-block" onclick="blockUser('${id}')">Block</button>
                <button class="btn btn-delete" onclick="deleteUser('${id}')">Delete</button>
            </td>
        `;

        tableBody.appendChild(tr);
    });
});


// OPEN USER DETAILS
window.openUser = function(id) {
    onValue(ref(db, "users/" + id), (snap) => {
        openModal(snap.val());
    }, { onlyOnce: true });
};


// DELETE USER
window.deleteUser = function(id) {
    if (confirm("Rostdan o‘chirilsinmi?")) {
        remove(ref(db, "users/" + id));
    }
};

// BLOCK USER
window.blockUser = function(id) {
    update(ref(db, "users/" + id), { status: "blocked" });
};
