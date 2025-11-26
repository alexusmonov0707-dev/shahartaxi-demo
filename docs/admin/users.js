import { db, ref, get, update, remove, onValue } from "../../libs/lib.js";

// Elementlar
const usersTable = document.getElementById("usersTable");
const searchInput = document.getElementById("searchInput");
const userModal = document.getElementById("userModal");
const modalContent = document.getElementById("modalContent");
const modalClose = document.getElementById("modalClose");

// =======================
// 🚀 Foydalanuvchilarni yuklash
// =======================
function loadUsers() {
    const usersRef = ref(db, "users");

    onValue(usersRef, (snapshot) => {
        const data = snapshot.val();
        usersTable.innerHTML = ""; // tozalaymiz

        if (!data) return;

        Object.entries(data).forEach(([uid, user]) => {
            const name = user.fullName || "—";
            const phone = user.phone || "—";
            const region = (user.region || "—") + " / " + (user.city || "—");
            const status = user.blocked ? "❌ Bloklangan" : "✓ Aktiv";

            const row = `
                <tr>
                    <td>${name}</td>
                    <td>${phone}</td>
                    <td>${region}</td>
                    <td>${status}</td>
                    <td>
                        <button class="btn btn-sm btn-warning blockBtn" data-uid="${uid}">
                            ${user.blocked ? "Unblock" : "Block"}
                        </button>
                        <button class="btn btn-sm btn-danger deleteBtn" data-uid="${uid}">
                            Delete
                        </button>
                    </td>
                </tr>
            `;

            usersTable.insertAdjacentHTML("beforeend", row);
        });

        attachEvents();
    });
}

loadUsers();

// =======================
// 🔍 Qidiruv
// =======================
searchInput.addEventListener("input", () => {
    const value = searchInput.value.toLowerCase();

    Array.from(usersTable.children).forEach((tr) => {
        tr.style.display = tr.innerText.toLowerCase().includes(value) ? "" : "none";
    });
});

// =======================
// 🧷 Tugmalarni ulang
// =======================
function attachEvents() {
    document.querySelectorAll(".blockBtn").forEach((btn) =>
        btn.addEventListener("click", blockUser)
    );

    document.querySelectorAll(".deleteBtn").forEach((btn) =>
        btn.addEventListener("click", deleteUser)
    );
}

// =======================
// 🚫 Block / Unblock
// =======================
function blockUser() {
    const uid = this.dataset.uid;
    const userRef = ref(db, "users/" + uid);

    update(userRef, {
        blocked: this.innerText === "Block" ? true : false,
    });
}

// =======================
// 🗑 Delete user
// =======================
function deleteUser() {
    const uid = this.dataset.uid;

    if (!confirm("Rostdan ham o‘chirmoqchimisiz?")) return;

    remove(ref(db, "users/" + uid));
}

// =======================
// 📄 Modalni ko‘rsatish (hozircha yopiq turadi)
// =======================
modalClose.addEventListener("click", () => {
    userModal.style.display = "none";
});
