import { db, ref, get, update } from "../libs/lib.js";

let cache = [];

async function loadDrivers() {
    const tbody = document.getElementById("driversTable");
    tbody.innerHTML = "<tr><td colspan='5'>Yuklanmoqda...</td></tr>";

    const snap = await get(ref(db, "users"));

    if (!snap.exists()) {
        tbody.innerHTML = "<tr><td colspan='5'>Haydovchilar yo‘q</td></tr>";
        return;
    }

    cache = Object.entries(snap.val())
        .filter(([id, u]) => u.role === "driver" && u.verified === false)
        .map(([id, u]) => ({ id, ...u }));

    render(cache);
}

function render(list) {
    const tbody = document.getElementById("driversTable");
    tbody.innerHTML = "";

    list.forEach(u => {
        tbody.innerHTML += `
        <tr>
            <td>${u.fullName}</td>
            <td>${u.phone}</td>
            <td>${u.carModel} (${u.carColor})</td>
            <td><span class="badge pending">Kutilmoqda</span></td>

            <td>
                <button class="btn view" onclick="openModal('${u.id}')">Ko‘rish</button>
            </td>
        </tr>`;
    });
}

window.openModal = function (id) {
    const u = cache.find(x => x.id === id);

    document.getElementById("m_fullName").textContent = u.fullName;
    document.getElementById("m_phone").textContent = u.phone;

    document.getElementById("m_car").textContent = u.carModel;
    document.getElementById("m_color").textContent = u.carColor;
    document.getElementById("m_number").textContent = u.carNumber;

    document.getElementById("m_avatar").src = u.avatar ?? "/assets/default.png";
    document.getElementById("m_license").src = u.licenseUrl ?? u.license ?? "";
    document.getElementById("m_tech").src = u.techPassportUrl ?? "";

    // Buttons
    document.getElementById("approveBtn").onclick = () => approveDriver(u.id);
    document.getElementById("rejectBtn").onclick = () => rejectDriver(u.id);

    document.getElementById("modal").style.display = "flex";
};

window.closeModal = function () {
    document.getElementById("modal").style.display = "none";
};

async function approveDriver(id) {
    await update(ref(db, "users/" + id), { verified: true });
    closeModal();
    loadDrivers();
}

async function rejectDriver(id) {
    await update(ref(db, "users/" + id), { verified: "rejected" });
    closeModal();
    loadDrivers();
}

loadDrivers();
