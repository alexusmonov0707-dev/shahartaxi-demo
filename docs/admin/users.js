import { db, ref, onValue, update, remove } from "../../libs/lib.js";

const tbody = document.querySelector("tbody");
const searchInput = document.getElementById("search");

// === FOYDALANUVCHILARNI YUKLASH ===
function loadUsers() {
    const usersRef = ref(db, "users");

    onValue(usersRef, (snapshot) => {
        const data = snapshot.val();
        tbody.innerHTML = "";

        for (let id in data) {
            const user = data[id];

            // MINTAQANI TO‘G‘RI O‘QISH
            const region = user.region?.region || "/"; 
            const district = user.region?.district || "/";

            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${user.fullName || ""}</td>
                <td>${user.phone || ""}</td>
                <td>${region} / ${district}</td>
                <td>${user.active ? "✓ Aktiv" : "❌ Bloklangan"}</td>
                <td>
                    <button class="blockBtn" data-id="${id}">
                        ${user.active ? "Block" : "Unblock"}
                    </button>
                    <button class="deleteBtn" data-id="${id}">Delete</button>
                </td>
            `;

            tbody.appendChild(tr);
        }

        attachActionButtons();
    });
}

// === BLOCK / UNBLOCK FUNKSIYA ===
function attachActionButtons() {
    document.querySelectorAll(".blockBtn").forEach((btn) => {
        btn.onclick = () => {
            const userId = btn.dataset.id;
            const userRef = ref(db, "users/" + userId);

            update(userRef, {
                active: btn.textContent === "Block" ? false : true
            });
        };
    });

    document.querySelectorAll(".deleteBtn").forEach((btn) => {
        btn.onclick = () => {
            const userId = btn.dataset.id;
            const userRef = ref(db, "users/" + userId);

            remove(userRef);
        };
    });
}

// === QIDIRUV ===
searchInput.addEventListener("input", () => {
    const value = searchInput.value.toLowerCase();
    const rows = document.querySelectorAll("tbody tr");

    rows.forEach((tr) => {
        const text = tr.textContent.toLowerCase();
        tr.style.display = text.includes(value) ? "" : "none";
    });
});

// === START ===
loadUsers();
