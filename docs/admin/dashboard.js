// References
const adsRef = firebase.database().ref("ads");
const usersRef = firebase.database().ref("users");

// Jami e'lonlar
adsRef.on("value", snap => {
    const data = snap.val() || {};
    document.getElementById("totalAds").textContent = Object.keys(data).length;
});

// Jami foydalanuvchilar
usersRef.on("value", snap => {
    const data = snap.val() || {};

    document.getElementById("totalUsers").textContent = Object.keys(data).length;

    // faqat haydovchilar
    const driverCount = Object.values(data).filter(u => u.role === "driver").length;
    document.getElementById("totalDrivers").textContent = driverCount;
});

// So‘nggi 5 e’lon
adsRef.orderByChild("createdAt").limitToLast(5).on("value", snap => {
    const data = snap.val() || {};
    const sorted = Object.values(data).sort((a,b) => b.createdAt - a.createdAt).slice(0,5);

    const list = document.getElementById("latestAds");
    list.innerHTML = "";

    sorted.forEach(ad => {
        const li = document.createElement("li");
        li.textContent = `${ad.fromRegion} → ${ad.toRegion} | ${ad.price} so'm`;
        list.appendChild(li);
    });
});

// So‘nggi 5 foydalanuvchi
usersRef.orderByChild("createdAt").limitToLast(5).on("value", snap => {
    const data = snap.val() || {};
    const sorted = Object.values(data).sort((a,b)=>b.createdAt - a.createdAt).slice(0,5);

    const list = document.getElementById("latestUsers");
    list.innerHTML = "";

    sorted.forEach(user => {
        const li = document.createElement("li");
        li.textContent = `${user.fullName} (${user.phone})`;
        list.appendChild(li);
    });
});

// Logout
function logout() {
    localStorage.removeItem("admin");
    window.location.href = "./login.html";
}
