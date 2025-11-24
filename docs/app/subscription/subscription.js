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

    if (user.role !== "driver") {
        document.body.innerHTML = "<h2 style='text-align:center;margin-top:40px;'>Sizga abonement kerak emas</h2>";
        return;
    }

    const sub = user.subscriptions?.taxi;

    if (sub && sub.active && sub.expiresAt > Date.now()) {
        document.getElementById("currentSub").style.display = "block";
        document.getElementById("planName").textContent = sub.plan;
        document.getElementById("expires").textContent =
            new Date(sub.expiresAt).toLocaleString("uz-UZ");
    } else {
        document.getElementById("buySection").style.display = "block";
    }
}

window.buy = async (plan) => {
    const price = (plan === "weekly") ? 5000 : 20000;
    const duration = (plan === "weekly") ? 7 : 30;

    if (balance < price) {
        alert("Balansingizda mablag‘ yetarli emas.");
        return;
    }

    const expiresAt = Date.now() + duration * 24 * 60 * 60 * 1000;

    // 🔥 Super-app arxitekturasi uchun MUSTAQIL update
    await update(ref(db, `users/${uid}/subscriptions/taxi`), {
        active: true,
        plan,
        expiresAt
    });

    await update(ref(db, `users/${uid}`), {
        balance: balance - price
    });

    alert("Abonement muvaffaqiyatli faollashtirildi!");
    location.reload();
};
