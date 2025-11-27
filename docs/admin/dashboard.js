document.addEventListener("DOMContentLoaded", () => {

    const db = firebase.database();

    const totalAdsEl = document.getElementById("totalAds");
    const totalUsersEl = document.getElementById("totalUsers");
    const totalDriversEl = document.getElementById("totalDrivers");

    const lastAdsList = document.getElementById("lastAds");
    const lastUsersList = document.getElementById("lastUsers");


    // 1. Jami e'lonlar
    function loadTotalAds() {
        db.ref("ads").once("value", snap => {
            totalAdsEl.innerText = snap.numChildren();
        });
    }

    // 2. Jami foydalanuvchilar
    function loadTotalUsers() {
        db.ref("users").once("value", snap => {
            totalUsersEl.innerText = snap.numChildren();
        });
    }

    // 3. Jami haydovchilar
    function loadTotalDrivers() {
        db.ref("users").once("value", snap => {
            let count = 0;
            snap.forEach(child => {
                if (child.val().role === "driver") count++;
            });
            totalDriversEl.innerText = count;
        });
    }

    // 4. Oxirgi 5 e'lon
    function loadLastAds() {
        db.ref("ads")
          .orderByChild("createdAt")
          .limitToLast(5)
          .once("value", snap => {

            lastAdsList.innerHTML = "";
            const arr = [];

            snap.forEach(s => arr.push(s.val()));
            arr.reverse();

            arr.forEach(ad => {
                const div = document.createElement("div");
                div.className = "py-2";
                div.innerHTML = `
                    <div class="flex justify-between">
                        <span>${ad.fromRegion} → ${ad.toRegion}</span>
                        <span class="font-bold">${ad.price} so’m</span>
                    </div>`;
                lastAdsList.appendChild(div);
            });
        });
    }

    // 5. Oxirgi 5 foydalanuvchi
    function loadLastUsers() {
        db.ref("users")
          .orderByChild("createdAt")
          .limitToLast(5)
          .once("value", snap => {

            lastUsersList.innerHTML = "";
            const arr = [];

            snap.forEach(s => arr.push(s.val()));
            arr.reverse();

            arr.forEach(u => {
                const div = document.createElement("div");
                div.className = "py-2";
                div.innerHTML = `
                    <div class="flex justify-between">
                        <span>${u.fullName || "Noma’lum"}</span>
                        <span>${u.phone || ""}</span>
                    </div>`;
                lastUsersList.appendChild(div);
            });
        });
    }

    // Run all
    loadTotalAds();
    loadTotalUsers();
    loadTotalDrivers();
    loadLastAds();
    loadLastUsers();

});

function logout() {
    window.location.href = "../login.html";
}
