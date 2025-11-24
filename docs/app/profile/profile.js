// IMPORTS
import { auth, db, ref, get, onAuthStateChanged } 
from "/shahartaxi-demo/docs/libs/lib.js";

// ELEMENTLAR
const avatarImg = document.getElementById("avatarImg");
const fullName = document.getElementById("fullName");
const phone = document.getElementById("phone");

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

const balance = document.getElementById("balance");


// ===== 🔵 TUGMALAR ULANISHI =====

// CHIQISH
document.getElementById("logoutBtn").onclick = () => auth.signOut();

// PROFILNI TAHRIRLASH
document.getElementById("editProfileBtn").onclick = () => {
    window.location.href = "/shahartaxi-demo/docs/app/profile/profile-edit.html";
};

// BALANSNI TO‘LDIRISH — SENI MUAMMONING YECHIMI!
document.getElementById("topUpBtn").onclick = () => {
    window.location.href = "/shahartaxi-demo/docs/app/profile/top-up.html";
};


// ===== 🔵 FIREBASE AUTH =====

onAuthStateChanged(auth, async user => {
    if (!user) {
        location.href = "/shahartaxi-demo/docs/app/auth/login.html";
        return;
    }

    loadProfile(user.uid);
});


// ===== 🔵 PROFILNI YUKLASH =====

async function loadProfile(uid) {
    const snap = await get(ref(db, "users/" + uid));

    if (!snap.exists()) return;

    const u = snap.val();

    // Avatar
    avatarImg.src = u.avatar || "/shahartaxi-demo/docs/img/avatar-default.png";

    // Asosiy ma’lumotlar
    fullName.textContent = u.fullName || "Yuklanmoqda...";
    phone.textContent = u.phone || "-";
    balance.textContent = (u.balance || 0) + " so‘m";

    // Gender
    if (u.gender) {
        gender.textContent = u.gender;
        genderRow.style.display = "block";
    }

    // Tug‘ilgan sana
    if (u.birthdate) {
        birthdate.textContent = u.birthdate;
        birthRow.style.display = "block";
    }

    // Haydovchi bo‘lsa
    if (u.role === "driver") {
        driverBlock.style.display = "block";

        if (u.carModel) {
            carModel.textContent = u.carModel;
            carModelRow.style.display = "block";
        }

        if (u.carColor) {
            carColor.textContent = u.carColor;
            carColorRow.style.display = "block";
        }

        if (u.carNumber) {
            carNumber.textContent = u.carNumber;
            carNumberRow.style.display = "block";
        }

        if (u.license) {
            license.textContent = u.license;
            licenseRow.style.display = "block";
        }
    }
}
