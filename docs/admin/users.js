import { db, ref, onValue, update, remove } from "../libs/lib.js";

const table = document.getElementById("usersTable");
const search = document.getElementById("search");

function renderUsers(data) {
    table.innerHTML = "";

    if (!data) return;

    Object.keys(data).forEach(id => {
        const u = data[id];

        const region = (u.region && u.district)
                        ? `${u.region} / ${u.district}`
                        : "/";

        const status = u.blocked ? "❌ Block" : "✓ Aktiv";

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${u.fullName || "-"}</td>
            <td>${u.phone || "-"}</td>
            <td>${region}</td>
            <td>${status}</td>
            <td>
                <button class="blockBtn" data-id="${id}">
                    ${u.blocked ? "Unblock" : "Block"}
                </button>
                <button class="delBtn" data-id="${id}" style="background:red; color:white;">Delete</button>
            </td>
        `;

        table.appendChild(tr);
    });
}

// === LIVE FIREBASE LISTENER ===
const usersRef = ref(db, "users/");
onValue(usersRef, snapshot => {
    const data = snapshot.val();
    window.__USERS = data;  // search uchun saqlab qo'yamiz
    renderUsers(data);
});

// === Qidiruv ===
search.addEventListener("input", () => {
    const txt = search.value.toLowerCase();
    const data = window.__USERS || {};

    const filtered = {};

    Object.keys(data).forEach(id => {
        const u = data[id];
        const s = JSON.stringify(u).toLowerCase();
        if (s.includes(txt)) filtered[id] = u;
    });

    renderUsers(filtered);
});

// === Delegatsiya: Block + Delete ===
table.addEventListener("click", e => {
    const id = e.target.dataset.id;
    if (!id) return;

    if (e.target.classList.contains("delBtn")) {
        if (confirm("Foydalanuvchini o‘chirasizmi?")) {
            remove(ref(db, "users/" + id));
        }
    }

    if (e.target.classList.contains("blockBtn")) {
        const user = window.__USERS[id];
        update(ref(db, "users/" + id), {
            blocked: !user.blocked
        });
    }
});
