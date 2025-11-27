// Logout
document.getElementById("logoutBtn").onclick = () => {
    sessionStorage.removeItem("admin");
    location.href = "login.html";
};

// Firebase DB
const db = firebase.database();

// ADS count + last 5 ads
function loadAds() {
    db.ref("ads").once("value", snap => {
        let ads = snap.exists() ? Object.entries(snap.val()) : [];
        document.getElementById("statAds").textContent = ads.length;

        // So'nggi 5 ta
        ads = ads
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 5);

        let html = "";
        ads.forEach(a => {
            html += `
                <div class="border-b py-2">
                    <strong>${a.fromRegion} → ${a.toRegion}</strong>
                    <div class="text-sm text-gray-600">${a.comment || ""}</div>
                </div>
            `;
        });

        document.getElementById("lastAds").innerHTML = html;
    });
}

// USERS count + drivers + last 5 users
function loadUsers() {
    db.ref("users").once("value", snap => {
        if (!snap.exists()) return;

        const users = Object.entries(snap.val()).map(([id, u]) => ({ id, ...u }));

        document.getElementById("statUsers").textContent = users.length;
        document.getElementById("statDrivers").textContent =
            users.filter(u => u.role === "driver").length;

        // Last 5
        const lastUsers = users
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
            .slice(0, 5);

        let html = "";
        lastUsers.forEach(u => {
            html += `
                <div class="border-b py-2">
                    <strong>${u.fullName}</strong>
                    <div class="text-sm text-gray-600">${u.phone}</div>
                </div>
            `;
        });

        document.getElementById("lastUsers").innerHTML = html;
    });
}

// LOAD ALL
loadAds();
loadUsers();
