import { auth, db, ref, get, onAuthStateChanged }
from "/shahartaxi-demo/docs/libs/lib.js";

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

const subscriptionBlock = document.getElementById("subscriptionBlock");
const subActive = document.getElementById("subActive");
const subInactive = document.getElementById("subInactive");
const subPlan = document.getElementById("subPlan");
const subExpire = document.getElementById("subExpire");

const subBuyBtn = document.getElementById("subBuyBtn");
const subManageBtn = document.getElementById("subManageBtn");

document.getElementById("logoutBtn").onclick = () => auth.signOut();
document.getElementById("editProfileBtn").onclick = () => {
    window.location.href = "/shahartaxi-demo/docs/app/profile/profile-edit.html";
};
document.getElementById("topUpBtn").onclick = () => {
    window.location.href = "/shahartaxi-demo/docs/app/profile/top-up.html";
};

onAuthStateChanged(auth, async user => {
    if (!user) {
        location.href = "/shahartaxi-demo/docs/app/auth/login.html";
        return;
    }
    await loadProfile(user.uid);
});

async function loadProfile(uid) {
    // 🔥 GitHub Pages cache muammosini chetlab o‘tish
    const userRef = ref(db, `users/${uid}`);
    const snap = await get(userRef);

    if (!snap.exists()) return;
    const u = snap.val();

    avatarImg.src = u.avatar || "/shahartaxi-demo/docs/img/avatar-default.png";
    fullName.textContent = u.fullName || "";
    phone.textContent = u.phone || "-";
    balance.textContent = (u.balance || 0) + " so‘m";

    if (u.gender) {
        genderRow.style.display = "block";
        gender.textContent = u.gender;
    }
    if (u.birthdate) {
        birthRow.style.display = "block";
        birthdate.textContent = u.birthdate;
    }

    // Driver bo'lsa
    if (u.role === "driver") {
        driverBlock.style.display = "block";

        if (u.carModel) { carModelRow.style.display = "block"; carModel.textContent = u.carModel; }
        if (u.carColor) { carColorRow.style.display = "block"; carColor.textContent = u.carColor; }
        if (u.carNumber) { carNumberRow.style.display = "block"; carNumber.textContent = u.carNumber; }
        if (u.license) { licenseRow.style.display = "block"; license.textContent = u.license; }

        subscriptionBlock.style.display = "block";

        const sub = u.subscriptions?.taxi;

        // 🔥 ABONEMENT HOLATI
        if (sub && sub.active && sub.expiresAt > Date.now()) {
            subActive.style.display = "block";
            subInactive.style.display = "none";

            subPlan.textContent = sub.plan;
            subExpire.textContent = new Date(sub.expiresAt).toLocaleString("uz-UZ");

        } else {
            subActive.style.display = "none";
            subInactive.style.display = "block";
        }
    }

    subBuyBtn.onclick = () => {
        window.location.href = "/shahartaxi-demo/docs/app/subscription/subscription.html";
    };
    subManageBtn.onclick = () => {
        window.location.href = "/shahartaxi-demo/docs/app/subscription/subscription.html";
    };
}
