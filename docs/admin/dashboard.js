document.addEventListener("DOMContentLoaded", function () {

    const totalAdsEl = document.getElementById("totalAds");
    const totalUsersEl = document.getElementById("totalUsers");
    const totalDriversEl = document.getElementById("totalDrivers");

    const lastAdsList = document.getElementById("lastAds");
    const lastUsersList = document.getElementById("lastUsers");

    const adsRef = db.ref("ads");
    const usersRef = db.ref("users");

    // 1) Jami e'lonlar
    adsRef.on("value", (snap) => {
        totalAdsEl.innerText = snap.numChildren();
    });

    // 2) Jami foydalanuvchilar
    usersRef.on("value", (snap) => {
        totalUsersEl.innerText = snap.numChildren();
    });

    // 3) Haydovchilar soni
    usersRef.on("value", (snap) => {
        let count = 0;
        snap.forEach(child => {
            if (child.val().role === "driver") count++;
        });
        totalDriversEl.innerText = count;
    });

    // 4) Oxirgi 5 ta e'lon
    adsRef.orderByChild("createdAt").limitToLast(5).on("value", (snap) => {

        lastAdsList.innerHTML = "";
        let arr = [];

        snap.forEach(s => arr.push(s.val()));
        arr.reverse(); // eng oxirgi tepada bo‘lishi uchun

        arr.forEach(ad => {
            let div = document.createElement("div");
            div.className = "py-2 border-b";
            div.innerHTML = `
                <div class="flex justify-between">
                    <span>${ad.fromRegion} → ${ad.toRegion}</span>
                    <span class="font-bold">${ad.price} soʻm</span>
                </div>
            `;
            lastAdsList.appendChild(div);
        });

    });

    // 5) Oxirgi 5 foydalanuvchi
    usersRef.orderByChild("createdAt").limitToLast(5).on("value", (snap) => {

        lastUsersList.innerHTML = "";
        let arr = [];

        snap.forEach(s => arr.push(s.val()));
        arr.reverse();

        arr.forEach(u => {
            let div = document.createElement("div");
            div.className = "py-2 border-b";
            div.innerHTML = `
                <div class="flex justify-between">
                    <span>${u.fullName || "Noma’lum"}</span>
                    <span>${u.phone || ""}</span>
                </div>
            `;
            lastUsersList.appendChild(div);
        });

    });

});

function logout() {
    window.location.href = "../login.html";
}
