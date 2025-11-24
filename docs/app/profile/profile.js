import { auth, db, ref, get, onAuthStateChanged, update } 
from "/shahartaxi-demo/docs/libs/lib.js";

const avatarImg = document.getElementById("avatarImg");
const fullName = document.getElementById("fullName");
const phone = document.getElementById("phone");
const genderRow = document.getElementById("genderRow");
const gender = document.getElementById("gender");
const birthRow = document.getElementById("birthRow");
const birthdate = document.getElementById("birthdate");

const carModelRow = document.getElementById("carModelRow");
const carColorRow = document.getElementById("carColorRow");
const carNumberRow = document.getElementById("carNumberRow");
const licenseRow = document.getElementById("licenseRow");

const carModel = document.getElementById("carModel");
const carColor = document.getElementById("carColor");
const carNumber = document.getElementById("carNumber");
const license = document.getElementById("license");

const driverBlock = document.getElementById("driverBlock");

const balance = document.getElementById("balance");

document.getElementById("logoutBtn").onclick = () => auth.signOut();

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        location.href = "/shahartaxi-demo/docs/app/auth/login.html";
        return;
    }
    loadProfile(user.uid);
});

async function loadProfile(uid) {
    const snap = await get(ref(db, "users/" + uid));
    if (!snap.exists()) return;

    const u = snap.val();

    // avatar
    avatarImg.src = u.avatar || "/shahartaxi-demo/docs/img/avatar-default.png";

    fullName.textContent = u.fullName || "Ism ko‘rilmadi";
    phone.textContent = u.phone || "-";

    balance.textContent = (u.balance || 0) + " so‘m";

    // gender
    if (u.gender) {
        gender.textContent = u.gender;
        genderRow.style.display = "block";
    }

    // birthdate
    if (u.birthdate) {
        birthdate.textContent = u.birthdate;
        birthRow.style.display = "block";
    }

    // ROLE bo‘yicha maydonlar
    if (u.role === "driver") {
        driverBlock.style.display = "block";

        if (u.carModel) {
            document.querySelector("#carModelRow span").textContent = u.carModel;
            carModelRow.style.display = "block";
        }

        if (u.carColor) {
            document.querySelector("#carColorRow span").textContent = u.carColor;
            carColorRow.style.display = "block";
        }

        if (u.carNumber) {
            document.querySelector("#carNumberRow span").textContent = u.carNumber;
            carNumberRow.style.display = "block";
        }

        if (u.license) {
            document.querySelector("#licenseRow span").textContent = u.license;
            licenseRow.style.display = "block";
        }
    }
    <script>
document.getElementById("editProfileBtn").onclick = () => {
    window.location.href = "profile-edit.html";
};
</script>
}


