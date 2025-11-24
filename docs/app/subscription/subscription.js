import { auth, db, ref, get, update, onAuthStateChanged }
from "/shahartaxi-demo/docs/libs/lib.js";

let uid = null;
let balance = 0;

onAuthStateChanged(auth, async user => {
    if (!user) {
        location.href = "/shahartaxi-demo/docs/app/auth/login.html";
        return;
    }
    uid = user.uid;
    loadUser();
});

async function loadUser() {
    const snap = await get(ref(db, "users/" + uid));
    if (!snap.exists()) return;

    const user = snap.val();
    balance = user.balance || 0;

    // Yo'lovchiga abonement kerak emas
    if (user.role !== "driver") {
        document.querySelector("body").innerHTML =
            "<h2 style='text-align:center;margin-top:40px;'>Sizga abonement kerak emas</h2>";
        return;
    }

    const sub = user.subscription;

    if (sub && sub.active && sub.expiresAt > Date.now()) {
        // Faol abonement
        document.getElementById("currentSub").style.display = "block";
        document.getElementById("planName").textContent = sub.plan;
        document.getElementById("expires").textContent = 
            new Date(sub.expiresAt).toLocaleString("uz-UZ");

    } else {
        // Abonement yo'q
        document.getElementById("buySection").style.display = "block";
    }
}

window.buy = async (plan) => {
    const price = (plan === "weekly") ? 5000 : 20000;
    const duration = (plan === "weekly") ? 7 : 30; // kun

    if (balance < price) {
        alert("Balansingizda mablag‘ yetarli emas.");
        return;
    }

    const expiresAt = Date.now() + duration * 24 * 60 * 60 * 1000;

    await update(ref(db, "users/" + uid), {
        balance: balance - price,
        subscription: {
            active: true,
            plan,
            expiresAt
        }
    });

    alert("Abonement muvaffaqiyatli faollashtirildi!");
    location.reload();
};
