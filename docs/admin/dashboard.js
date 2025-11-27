// --- Dashboard Stats --- //

const adsRef = firebase.database().ref("ads");
const usersRef = firebase.database().ref("users");

// Jami e'lonlar
adsRef.on("value", snap => {
    const data = snap.val() || {};
    const total = Object.keys(data).length;
    document.getElementById("totalAds").textContent = total;
});

// Jami foydalanuvchilar
usersRef.on("value", snap => {
    const data = snap.val() || {};
    const total = Object.keys(data).length;
    document.getElementById("totalUsers").textContent = total;

    // Haydovchilar soni
    const drivers = Object.values(data).filter(u => u.role === "driver");
    document.getElementById("totalDrivers").textContent = drivers.length;
});

// So‘nggi 5 e’lon
adsRef
    .orderByChild("createdAt")
    .limitToLast(5)
    .on("value", snap => {
        const list = document.getElementById("latestAds");
        list.innerHTML = "";

        const data = snap.val() || {};
        const arr = Object.values(data).sort((a, b) => b.createdAt - a.createdAt);

        arr.slice(0, 5).forEach(ad => {
            const li = document.createElement("li");
            li.textContent = `${ad.fromRegion} → ${ad.toRegion} | ${ad.price} UZS`;
            list.appendChild(li);
        });
    });

// So‘nggi 5 foydalanuvchi
usersRef
    .orderByChild("createdAt")
    .limitToLast(5)
    .on("value", snap => {
        const list = document.getElementById("latestUsers");
        list.innerHTML = "";

        const data = snap.val() || {};
        const arr = Object.values(data).sort((a, b) => b.createdAt - a.createdAt);

        arr.slice(0, 5).forEach(user => {
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
