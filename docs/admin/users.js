import { db, ref, onValue, update, remove } from "../libs/lib.js";

const tbody = document.getElementById("userTable");

onValue(ref(db, "users"), snapshot => {
    tbody.innerHTML = "";

    snapshot.forEach(child => {
        let user = child.val();
        let uid = child.key;

        let row = `
        <tr onclick="showDetails('${uid}')">
            <td>${user.fullName || ""}</td>
            <td>${user.phone || ""}</td>

            <!-- ⭐ TO‘G‘RILANGAN QATOR ⭐ -->
            <td>${(user.regionName || "/")} / ${(user.districtName || "")}</td>

            <td>${user.active ? "✔ Aktiv" : "❌ Bloklangan"}</td>

            <td>
                <button class="btn-warning" onclick="event.stopPropagation(); blockUser('${uid}')">
                    ${user.active ? "Block" : "Unblock"}
                </button>
                <button class="btn-danger" onclick="event.stopPropagation(); deleteUser('${uid}')">
                    Delete
                </button>
            </td>
        </tr>
        `;

        tbody.innerHTML += row;
    });
});

window.blockUser = async function (uid) {
    await update(ref(db, `users/${uid}`), {
        active: false
    });
};

window.deleteUser = async function (uid) {
    if (!confirm("O‘chirishni xohlaysizmi?")) return;
    await remove(ref(db, `users/${uid}`));
};

window.showDetails = function (uid) {
    onValue(ref(db, `users/${uid}`), snap => {
        let user = snap.val();
        
        document.getElementById("modalName").innerText = user.fullName;
        document.getElementById("modalPhone").innerText = user.phone;
        document.getElementById("modalCar").innerText = user.carName;
        document.getElementById("modalColor").innerText = user.color;
        document.getElementById("modalPlate").innerText = user.plate;
        document.getElementById("modalBalance").innerText = user.balance;
        document.getElementById("modalAvatar").src = user.avatar || "../img/avatar-default.png";

        document.getElementById("modal").classList.remove("hidden");
    });
};

window.hideModal = function () {
    document.getElementById("modal").classList.add("hidden");
};
