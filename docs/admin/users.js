import { db, ref, get, update, remove } from "../libs/lib.js";

const tableBody = document.querySelector("tbody");
const modal = document.getElementById("userModal");
const closeBtn = document.getElementById("closeModal");
const modalName = document.getElementById("modalName");
const modalPhone = document.getElementById("modalPhone");
const modalRegion = document.getElementById("modalRegion");
const modalDistrict = document.getElementById("modalDistrict");
const modalCarModel = document.getElementById("modalCarModel");
const modalCarNumber = document.getElementById("modalCarNumber");
const modalStatus = document.getElementById("modalStatus");
const modalAvatar = document.getElementById("modalAvatar");

async function loadUsers() {
    try {
        const usersRef = ref(db, "users");
        const snapshot = await get(usersRef);
        const users = snapshot.val();

        tableBody.innerHTML = ""; // tozalaymiz

        Object.keys(users).forEach(uid => {
            const u = users[uid];

            // fallback values
            const name = u.fullName || "Noma'lum";
            const phone = u.phone || "Noma'lum";
            const region = u.region || "/";
            const district = u.district || "/";
            const status = u.blocked ? "Bloklangan" : "✓ Aktiv";

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${name}</td>
                <td>${phone}</td>
                <td>${region}</td>
                <td>${status}</td>
                <td>
                    <button class="blockBtn" data-id="${uid}">Blok</button>
                    <button class="deleteBtn" data-id="${uid}">Delete</button>
                    <button class="viewBtn" data-id="${uid}">Info</button>
                </td>
            `;

            // VIEW (MODAL) tugmasi
            row.querySelector(".viewBtn").addEventListener("click", () => {
                modalName.textContent = name;
                modalPhone.textContent = phone;
                modalRegion.textContent = region;
                modalDistrict.textContent = district;
                modalCarModel.textContent = u.carModel || "/";
                modalCarNumber.textContent = u.carNumber || "/";
                modalStatus.textContent = status;

                modalAvatar.src = u.techPassportUrl || "./img/avatar.png";

                modal.style.display = "flex";
            });

            // BLOK
            row.querySelector(".blockBtn").addEventListener("click", async () => {
                await update(ref(db, "users/" + uid), {
                    blocked: !u.blocked
                });
                loadUsers();
            });

            // DELETE
            row.querySelector(".deleteBtn").addEventListener("click", async () => {
                await remove(ref(db, "users/" + uid));
                loadUsers();
            });

            tableBody.appendChild(row);
        });

    } catch (err) {
        console.error("ERROR:", err);
    }
}

// MODAL YOPISH
closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
});

loadUsers();
