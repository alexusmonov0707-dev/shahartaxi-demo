import { auth, signInWithEmailAndPassword, db, ref, get } 
from "/shahartaxi-demo/docs/libs/lib.js";

const phoneInput = document.getElementById("phone");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");

loginBtn.onclick = async () => {

    const phone = phoneInput.value.trim();
    const password = passwordInput.value;

    if (!phone || !password) {
        alert("Iltimos, barcha maydonlarni to‘ldiring.");
        return;
    }

    const email = phone + "@shahartaxi.uz";

    try {
        const user = await signInWithEmailAndPassword(auth, email, password);

        // USER DATA YUKLASH
        const snap = await get(ref(db, "users/" + user.user.uid));
        const u = snap.val();

        // Bitta umumiy dashboard
        window.location.href = "/shahartaxi-demo/app/user/index.html";

    } catch (err) {
        console.error(err);
        alert("Telefon yoki parol noto‘g‘ri.");
    }
};
