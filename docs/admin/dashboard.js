// dashboard.js (type="module" bilan ishlaydi)

import { database, ref } from "./firebase.js";
import { get, child, onValue, query, limitToLast, orderByChild } 
    from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

// ========= References =========
const adsRef = ref(database, "ads");
const usersRef = ref(database, "users");

// ========= Total Ads =========
onValue(adsRef, snap => {
    const data = snap.val() || {};
    document.getElementById("totalAds").textContent = Object.keys(data).length;
});

// ========= Total Users + Drivers =========
onValue(usersRef, snap => {
    const data = snap.val() || {};

    document.getElementById("totalUsers").textContent = Object.keys(data).length;

    const drivers = Object.values(data).filter(u => u.role === "driver").length;
    document.getElementById("totalDrivers").textContent = drivers;
});

// ========= Latest 5 Ads =========
const latestAdsQuery = query(
    adsRef,
    orderByChild("createdAt"),
    limitToLast(5)
);

onValue(latestAdsQuery, snap => {
    const data = snap.val() || {};
    const sorted = Object.values(data)
        .sort((a,b) => b.createdAt - a.createdAt)
        .slice(0,5);

    const ul = document.getElementById("latestAds");
    ul.innerHTML = "";

    sorted.forEach(ad => {
        let li = document.createElement("li");
        li.textContent = `${ad.fromRegion} → ${ad.toRegion} | ${ad.price} so'm`;
        ul.appendChild(li);
    });
});

// ========= Latest 5 Users =========
const latestUsersQuery = query(
    usersRef,
    orderByChild("createdAt"),
    limitToLast(5)
);

onValue(latestUsersQuery, snap => {
    const data = snap.val() || {};
    const sorted = Object.values(data)
        .sort((a,b)=> b.createdAt - a.createdAt)
        .slice(0,5);

    const ul = document.getElementById("latestUsers");
    ul.innerHTML = "";

    sorted.forEach(u => {
        const li = document.createElement("li");
        li.textContent = `${u.fullName} (${u.phone})`;
        ul.appendChild(li);
    });
});

// ========= Logout =========
window.logout = function() {
    localStorage.removeItem("admin");
    window.location.href = "./login.html";
};
