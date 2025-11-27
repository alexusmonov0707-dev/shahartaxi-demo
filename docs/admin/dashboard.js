// ============================
// Firebase tayyor bo'lishini kutamiz
// ============================
function waitForFirebase(timeout = 6000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();

        function check() {
            if (window.firebase && window.firebase.database) {
                return resolve(window.firebase.database());
            }
            if (Date.now() - start >= timeout) {
                return reject("Firebase load timeout!");
            }
            setTimeout(check, 100);
        }

        check();
    });
}

// ============================
// Dashboardni ishga tushirish
// ============================
waitForFirebase()
    .then(db => {
        loadTotalAds(db);
        loadTotalUsers(db);
        loadTotalDrivers(db);
        loadLastAds(db);
        loadLastUsers(db);
    })
    .catch(err => {
        console.error("Firebase error:", err);
        alert("Firebase ulanmadi!");
    });

// ============================
// 1) Jami e'lonlar
// ============================
function loadTotalAds(db) {
    db.ref("ads").once("value").then(snap => {
        document.getElementById("totalAds").innerText = snap.numChildren();
    });
}

// ============================
// 2) Jami foydalanuvchilar
// ============================
function loadTotalUsers(db) {
    db.ref("users").once("value").then(snap => {
        document.getElementById("totalUsers").innerText = snap.numChildren();
    });
}

// ============================
// 3) Haydovchilar soni
// ============================
function loadTotalDrivers(db) {
    db.ref("users").once("value").then(snap => {
        let count = 0;
        snap.forEach(child => {
            if (child.val().role === "driver") count++;
        });
        document.getElementById("totalDrivers").innerText = count;
    });
}

// ============================
// 4) So‘nggi 5 e’lon
// ============================
function loadLastAds(db) {
    db.ref("ads")
        .orderByChild("createdAt")
        .limitToLast(5)
        .once("value")
        .then(snap => {
            const box = document.getElementById("lastAds");
            box.innerHTML = "";

            let arr = [];
            snap.forEach(s => arr.push(s.val()));
            arr.reverse();

            arr.forEach(ad => {
                const div = document.createElement("div");
                div.className = "p-2 border-b";
                div.innerHTML = `
                    <div class="flex justify-between">
                        <span>${ad.fromRegion} → ${ad.toRegion}</span>
                        <span class="font-bold">${ad.price} so'm</span>
                    </div>`;
                box.appendChild(div);
            });
        });
}

// ============================
// 5) So‘nggi 5 foydalanuvchi
// ============================
function loadLastUsers(db) {
    db.ref("users")
        .orderByChild("createdAt")
        .limitToLast(5)
        .once("value")
        .then(snap => {
            const box = document.getElementById("lastUsers");
            box.innerHTML = "";

            let arr = [];
            snap.forEach(s => arr.push(s.val()));
            arr.reverse();

            arr.forEach(u => {
                const div = document.createElement("div");
                div.className = "p-2 border-b";
                div.innerHTML = `
                    <div class="flex justify-between">
                        <span>${u.fullName || "Noma'lum"}</span>
                        <span>${u.phone || ""}</span>
                    </div>`;
                box.appendChild(div);
            });
        });
}

// ============================
// Logout
// ============================
function logout() {
    window.location.href = "../login.html";
}
