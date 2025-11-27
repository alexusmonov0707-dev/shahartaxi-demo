// Firebase global o'zgaruvchilari:
// window.db
// window.ref
// window.child
// window.get

// ChiQish
window.logout = function () {
    window.location.href = "login.html";
};

// Jami e'lonlar
function loadTotalAds() {
    const adsRef = window.child(window.ref(window.db), "ads");

    window.get(adsRef).then(snapshot => {
        if (snapshot.exists()) {
            document.getElementById("totalAds").textContent =
                Object.keys(snapshot.val()).length;
        }
    });
}

// Jami foydalanuvchilar
function loadTotalUsers() {
    const usersRef = window.child(window.ref(window.db), "users");

    window.get(usersRef).then(snapshot => {
        if (snapshot.exists()) {
            document.getElementById("totalUsers").textContent =
                Object.keys(snapshot.val()).length;
        }
    });
}

// Jami haydovchilar
function loadTotalDrivers() {
    const driversRef = window.child(window.ref(window.db), "drivers");

    window.get(driversRef).then(snapshot => {
        if (snapshot.exists()) {
            document.getElementById("totalDrivers").textContent =
                Object.keys(snapshot.val()).length;
        }
    });
}

// So'nggi 5 e’lon
function loadLatestAds() {
    const adsRef = window.child(window.ref(window.db), "ads");

    window.get(adsRef).then(snapshot => {
        if (!snapshot.exists()) return;

        const ads = Object.entries(snapshot.val());

        ads.sort((a, b) => b[1].createdAt - a[1].createdAt);

        const latest = ads.slice(0, 5);

        const container = document.getElementById("latestAds");
        container.innerHTML = "";

        latest.forEach(([id, ad]) => {
            const li = document.createElement("li");
            li.textContent = `${ad.fromRegion} → ${ad.toRegion} (${ad.price} so'm)`;
            container.appendChild(li);
        });
    });
}

// So'nggi 5 foydalanuvchi
function loadLatestUsers() {
    const usersRef = window.child(window.ref(window.db), "users");

    window.get(usersRef).then(snapshot => {
        if (!snapshot.exists()) return;

        const users = Object.entries(snapshot.val());

        users.sort((a, b) => b[1].createdAt - a[1].createdAt);

        const latest = users.slice(0, 5);

        const container = document.getElementById("latestUsers");
        container.innerHTML = "";

        latest.forEach(([id, u]) => {
            const li = document.createElement("li");
            li.textContent = `${u.fullName || "Noma’lum"} — ${u.phone || ""}`;
            container.appendChild(li);
        });
    });
}

// Dastlab yuklash
loadTotalAds();
loadTotalUsers();
loadTotalDrivers();
loadLatestAds();
loadLatestUsers();
