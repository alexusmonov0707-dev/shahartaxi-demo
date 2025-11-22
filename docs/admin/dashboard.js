import { db, ref, get } from "./firebase.js";

console.log("DASHBOARD.JS loaded");

// show admin id (stored in localStorage by login)
const adminId = localStorage.getItem("admin") || null;
document.getElementById("adminName").textContent = adminId ? `Admin: ${adminId}` : "";

// Logout handler
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("admin");
  window.location.href = "./login.html";
});

// Quick stats function (example: count nodes)
async function loadStats() {
  try {
    const adsSnap = await get(ref(db, "ads"));
    const usersSnap = await get(ref(db, "users"));
    const driversSnap = await get(ref(db, "drivers"));

    document.getElementById("statAds").textContent = adsSnap.exists() ? Object.keys(adsSnap.val()).length : 0;
    document.getElementById("statUsers").textContent = usersSnap.exists() ? Object.keys(usersSnap.val()).length : 0;
    document.getElementById("statDrivers").textContent = driversSnap.exists() ? Object.keys(driversSnap.val()).length : 0;

  } catch (err) {
    console.error("Stat load error:", err);
    document.getElementById("statAds").textContent = "err";
    document.getElementById("statUsers").textContent = "err";
    document.getElementById("statDrivers").textContent = "err";
  }
}

// call on load
loadStats();
