document.addEventListener("DOMContentLoaded", () => {

    const db = firebase.database();

    // --- Elementlar ---
    const totalAdsEl = document.getElementById("totalAds");
    const totalUsersEl = document.getElementById("totalUsers");
    const totalDriversEl = document.getElementById("totalDrivers");

    const lastAdsList = document.getElementById("lastAds");
    const lastUsersList = document.getElementById("lastUsers");


    // 1. JAMMI E'LONLAR
    function loadTotalAds() {
        firebase.database().ref("ads").once("value", snapshot => {
            totalAdsEl.innerText = snapshot.numChildren();
        });
    }

    // 2. JAMMI FOYDALANUVCHILAR
    function loadTotalUsers() {
        firebase.database().ref("users").once("value", snapshot => {
            totalUsersEl.innerText = snapshot.numChildren();
        });
    }

    // 3. JAMMI HAYDOVCHILAR 
    // (users ichida role = "driver")
    function loadTotalDrivers() {
        firebase.database().ref("users").once("value", snapshot => {
            let count = 0;
            snapshot.forEach(child => {
                if (child.val().role === "driver") count++;
            });
            totalDriversEl.innerText = count;
        });
    }


    // 4. SO‘NGGI 5 E’LON
    function loadLastAds() {
        firebase.database()
            .ref("ads")
            .orderByChild("createdAt")
            .limitToLast(5)
            .once("value", snapshot => {

                lastAdsList.innerHTML = "";

                const items = [];
                snapshot.forEach(s => items.push(s.val()));

                items.reverse(); // oxirgilari yuqoriga

                items.forEach(ad => {
                    const li = document.createElement("div");
                    li.className = "list-item";
                    li.innerText = `${ad.fromRegion} ➝ ${ad.toRegion} | ${ad.price}`;
                    lastAdsList.appendChild(li);
                });
            });
    }

    // 5. SO‘NGGI 5 FOYDALANUVCHI
    function loadLastUsers() {
        firebase.database()
            .ref("users")
            .orderByChild("createdAt")
            .limitToLast(5)
            .once("value", snapshot => {

                lastUsersList.innerHTML = "";

                const items = [];
                snapshot.forEach(s => items.push(s.val()));

                items.reverse();

                items.forEach(u => {
                    const li = document.createElement("div");
                    li.className = "list-item";
                    li.innerText = `${u.fullName || "Noma’lum"} — ${u.phone}`;
                    lastUsersList.appendChild(li);
                });
            });
    }


    // BOSHLASH
    loadTotalAds();
    loadTotalUsers();
    loadTotalDrivers();
    loadLastAds();
    loadLastUsers();

});
