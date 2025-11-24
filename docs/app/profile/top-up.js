import { auth, db, ref, get, update, onAuthStateChanged } 
from "/shahartaxi-demo/docs/libs/lib.js";

let currentUid = null;
const balanceEl = document.getElementById("balance");
const amount = document.getElementById("amount");
const msg = document.getElementById("message");

onAuthStateChanged(auth, async user => {
    if (!user) {
        location.href = "/shahartaxi-demo/docs/app/auth/login.html";
        return;
    }
    currentUid = user.uid;
    loadBalance();
});

// Balansni yuklash
async function loadBalance() {
    const snap = await get(ref(db, "users/" + currentUid));
    if (!snap.exists()) return;

    const u = snap.val();
    balanceEl.textContent = u.balance || 0;
}

// Balansni to‘ldirish tugmasi
document.getElementById("topUpBtn").onclick = async () => {

    const amountVal = Number(amount.value);

    if (!amountVal || amountVal < 1000) {
        alert("Minimal to‘ldirish summasi: 1000 so‘m");
        return;
    }

    // Joriy balansni olish
    const snap = await get(ref(db, "users/" + currentUid));
    if (!snap.exists()) return;

    const currentBalance = snap.val().balance || 0;

    // Yangi balans
    const newBalance = currentBalance + amountVal;

    // Firebasega yozish
    await update(ref(db, "users/" + currentUid), {
        balance: newBalance
    });

    msg.style.display = "block";

    // UI yangilash
    balanceEl.textContent = newBalance;
    amount.value = "";
};
