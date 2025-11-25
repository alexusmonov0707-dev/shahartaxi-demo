const adminSession = sessionStorage.getItem("admin");
if (!adminSession) {
    location.href = "./login.html";
}

import { db, ref, get } from "../libs/lib.js";

document.getElementById("adminName").textContent = adminSession;

// statistikani olish
async function loadStats() {
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
}

loadStats();

// logout
document.getElementById("logoutBtn").onclick = () => {
    sessionStorage.removeItem("admin");
    location.href = "./login.html";
};
