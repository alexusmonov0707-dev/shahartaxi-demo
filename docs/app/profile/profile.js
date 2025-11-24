import { auth, db, ref, get, onAuthStateChanged }
from "/shahartaxi-demo/docs/libs/lib.js";

// Elementlar
const avatarImg = document.getElementById("avatarImg");
const fullName = document.getElementById("fullName");
const phone = document.getElementById("phone");
const balance = document.getElementById("balance");

const genderRow = document.getElementById("genderRow");
const gender = document.getElementById("gender");
const birthRow = document.getElementById("birthRow");
const birthdate = document.getElementById("birthdate");

const driverBlock = document.getElementById("driverBlock");

const carModelRow = document.getElementById("carModelRow");
const carColorRow = document.getElementById("carColorRow");
const carNumberRow = document.getElementById("carNumberRow");
const licenseRow = document.getElementById("licenseRow");

const carModel = document.getElementById("carModel");
const carColor = document.getElementById("carColor");
const carNumber = document.getElementById("carNumber");
const license = document.getElementById("license");

// Abonement elementi
const subscriptionBlock = document.getElementById("subscriptionBlock");
const subActive = document.getElementById("subActive");
const subInactive = document.getElementById("subInactive");
const subPlan = document.getElementById("subPlan");
const subExpire = document.getElementById("subExpire");

const subBuyBtn = document.getElementById("subBuyBtn");
const subManageBtn = document.getElementById("subManageBtn");

// Logout
document.getElementById("logoutBtn").onclick = () => auth.signOut();

// Profil tahrirlash
document.getElementById("editProfileBtn").onclick = () => {
    window.location.href = "/shahartaxi-demo/docs/app/profile/profile-edit.html";
};

// Balans to‘ldirish
document.getElementById("topUpBtn").onclick = () => {
    window.location.href = "/shahartaxi-demo/docs/app/profile/top-up.html";
};


// AUTH
onAuthStateChanged(auth, async user => {
    if (!user) {
        location.href = "/shahartaxi-demo/docs/app/auth/login.html";
        return;
    }
    loadProfile(user.uid);
});


// PROFILNI YUKLASH
async function loadProfile(uid) {
    const snap = await get(ref(db, "users/" + uid));
    if (!snap.exists()) return;

    const u = snap.val();

    // Avatar
    avatarImg.src = u.avatar || "/shahartaxi-demo/docs/img/avatar-default.png";

    // Basic info
    fullName.textContent = u.fullName || "Yuklanmoqda...";
    phone.textContent = u.phone || "-";
    balance.textContent = (u.balance || 0) + " so‘m";

    // Gender
    if (u.gender) {
        genderRow.style.display = "block";
        gender.textContent = u.gender;
    }

    // Birthdate
    if (u.birthdate) {
        birthRow.style.display = "block";
        birthdate.textContent = u.birthdate;
    }

    // Driver info
    if (u.role === "driver") {
        driverBlock.style.display = "block";

        if (u.carModel) { carModelRow.style.display = "block"; carModel.textContent = u.carModel; }
        if (u.carColor) { carColorRow.style.display = "block"; carColor.textContent = u.carColor; }
        if (u.carNumber) { carNumberRow.style.display = "block"; carNumber.textContent = u.carNumber; }
        if (u.license) { licenseRow.style.display = "block"; license.textContent = u.license; }

        // SUPER-APP: ABONEMENT
        subscriptionBlock.style.display = "block";

        const sub = u.subscriptions?.taxi;

        if (sub && sub.active && sub.expiresAt > Date.now()) {
            // Aktiv abonement
            subActive.style.display = "block";
            subInactive.style.display = "none";

            subPlan.textContent = sub.plan;
            subExpire.textContent = new Date(sub.expiresAt).toLocaleString("uz-UZ");

        } else {
            // Abonement yo‘q
            subActive.style.display = "none";
            subInactive.style.display = "block";
        }
    }

    // Abonement tugmalari
    subBuyBtn.onclick = () => {
        window.location.href = "/shahartaxi-demo/docs/app/subscription/subscription.html";
    };
    subManageBtn.onclick = () => {
        window.location.href = "/shahartaxi-demo/docs/app/subscription/subscription.html";
    };
}
