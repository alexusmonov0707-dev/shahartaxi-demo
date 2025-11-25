const admin = JSON.parse(localStorage.getItem("adminUser"));

if (!admin || admin.role !== "admin") {
    location.href = "./login.html";
}

import { auth, onAuthStateChanged, signOut, db, ref, get } from "../libs/lib.js";

// Sahifa yuklanganda admin login tekshiruvi
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // foydalanuvchi yo'q — loginga qaytarish
        location.href = "/shahartaxi-demo/docs/admin/login.html";
        return;
    }

    // admin malumotlari
    const snap = await get(ref(db, "admins/" + user.uid));
    if (!snap.exists()) {
        alert("Siz admin emassiz!");
        await signOut(auth);
        location.href = "/shahartaxi-demo/docs/admin/login.html";
        return;
    }

    const adminData = snap.val();
    document.getElementById("adminName").textContent = adminData.fullName || "Admin";

    // statistikani yuklaymiz
    loadStats();
});

// statistikani olish
async function loadStats() {
    const adsSnap = await get(ref(db, "ads"));
    const usersSnap = await get(ref(db, "users"));

    let ads = 0;
    let users = 0;
    let drivers = 0;

    if (adsSnap.exists()) {
        ads = Object.keys(adsSnap.val()).length;
    }
    if (usersSnap.exists()) {
        const list = usersSnap.val();
        users = Object.keys(list).length;
        drivers = Object.values(list).filter(u => u.role === "driver").length;
    }

    document.getElementById("statAds").textContent = ads;
    document.getElementById("statUsers").textContent = users;
    document.getElementById("statDrivers").textContent = drivers;
}

// logout
document.getElementById("logoutBtn").addEventListener("click", async () => {
    await signOut(auth);
    location.href = "/shahartaxi-demo/docs/admin/login.html";
});
