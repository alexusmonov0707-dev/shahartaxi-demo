import { db, ref, get, child } from "./firebase.js";

document.getElementById("adminName").textContent = sessionStorage.getItem("admin");

// LOAD ALL DASHBOARD DATA
loadDashboard();

async function loadDashboard() {
    try {
        const adsSnap = await get(ref(db, "ads"));
        const usersSnap = await get(ref(db, "users"));

        let ads = 0;
        let users = 0;
        let drivers = 0;

        if (adsSnap.exists()) ads = Object.keys(adsSnap.val()).length;
        if (usersSnap.exists()) {
            const list = usersSnap.val();
            users = Object.keys(list).length;
            drivers = Object.values(list).filter(u => u.role === "driver").length;
        }

        document.getElementById("statAds").textContent = ads;
        document.getElementById("statUsers").textContent = users;
        document.getElementById("statDrivers").textContent = drivers;

        loadRecentAds(adsSnap.val() || {});
        loadRecentUsers(usersSnap.val() || {});

    } catch (e) {
        console.error("Dashboard error:", e);
    }
}

// RECENT ADS
function loadRecentAds(ads) {
    const container = document.getElementById("recentAds");
    container.innerHTML = "";

    const last5 = Object.entries(ads)
        .slice(-5)
        .reverse();

    last5.forEach(([id, ad]) => {
        container.innerHTML += `
            <li>🚕 <b>${ad.fromRegion}</b> → <b>${ad.toRegion}</b>
                <span class="text-gray-500"> (${ad.date || "Noma'lum"})</span>
            </li>`;
    });
}

// RECENT USERS
function loadRecentUsers(users) {
    const container = document.getElementById("recentUsers");
    container.innerHTML = "";

    const last5 = Object.entries(users)
        .slice(-5)
        .reverse();

    last5.forEach(([id, u]) => {
        container.innerHTML += `
            <li>👤 <b>${u.fullName || u.username || id}</b>
            <span class="text-gray-500"> (${u.role})</span></li>`;
    });
}

// LOGOUT
document.getElementById("logoutBtn").onclick = () => {
    sessionStorage.removeItem("admin");
    location.href = "./login.html";
};
