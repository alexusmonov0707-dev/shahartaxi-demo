import { db, ref, get } from "./firebase.js";

console.log("DASHBOARD.JS loaded");

// =====================
// ADMIN AUTH CHECK
// =====================
const adminId = localStorage.getItem("admin");

if (!adminId) {
  // admin login qilmagan → chiqarib yuboramiz
  window.location.href = "./login.html";
} 

// admin nomini chiqaramiz
document.getElementById("adminName").textContent = `Admin: ${adminId}`;

// =====================
// LOGOUT
// =====================
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("admin");
  window.location.href = "./login.html";
});

// =====================
// LOAD STATISTICS
// =====================
async function loadStats() {
  try {
    const adsSnap = await get(ref(db, "ads"));
    const usersSnap = await get(ref(db, "users"));

    // drivers alohida bo'lmagan — users ichidan "role=driver" bo'yicha sanaymiz
    let driverCount = 0;
    if (usersSnap.exists()) {
      const users = usersSnap.val();
      Object.values(users).forEach(u => {
        if (u.role === "driver") driverCount++;
      });
    }

    document.getElementById("statAds").textContent =
      adsSnap.exists() ? Object.keys(adsSnap.val()).length : 0;

    document.getElementById("statUsers").textContent =
      usersSnap.exists() ? Object.keys(usersSnap.val()).length : 0;

    document.getElementById("statDrivers").textContent = driverCount;

  } catch (err) {
    console.error("Stat load error:", err);
  }
}

loadStats();
