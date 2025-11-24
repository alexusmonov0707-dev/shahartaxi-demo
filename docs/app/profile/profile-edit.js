import { auth, db, ref, get, update, onAuthStateChanged } 
from "/shahartaxi-demo/docs/libs/lib.js";

const avatar = document.getElementById("avatar");
const fullName = document.getElementById("fullName");
const phone = document.getElementById("phone");
const gender = document.getElementById("gender");
const birthdate = document.getElementById("birthdate");

const carModel = document.getElementById("carModel");
const carColor = document.getElementById("carColor");
const carNumber = document.getElementById("carNumber");
const license = document.getElementById("license");

const driverFields = document.getElementById("driverFields");

let currentUid = null;

onAuthStateChanged(auth, async user => {
    if (!user) {
        location.href = "/shahartaxi-demo/docs/app/auth/login.html";
        return;
    }

    currentUid = user.uid;
    loadData();
});


async function loadData() {
    const snap = await get(ref(db, "users/" + currentUid));
    if (!snap.exists()) return;

    const u = snap.val();

    avatar.value = u.avatar || "";
    fullName.value = u.fullName || "";
    phone.textContent = u.phone || "-";
    gender.value = u.gender || "";
    birthdate.value = u.birthdate || "";

    if (u.role === "driver") {
        driverFields.classList.remove("hidden");

        carModel.value = u.carModel || "";
        carColor.value = u.carColor || "";
        carNumber.value = u.carNumber || "";
        license.value = u.license || "";
    }
}

document.getElementById("saveBtn").onclick = async () => {

    const data = {
        avatar: avatar.value,
        fullName: fullName.value.trim(),
        gender: gender.value || "",
        birthdate: birthdate.value || ""
    };

    // Driver fields
    if (!driverFields.classList.contains("hidden")) {
        data.carModel = carModel.value.trim();
        data.carColor = carColor.value.trim();
        data.carNumber = carNumber.value.trim();
        data.license = license.value.trim();
    }

    await update(ref(db, "users/" + currentUid), data);

    alert("Profil yangilandi!");
    location.href = "profile.html";
};
