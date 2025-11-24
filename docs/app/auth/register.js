import { auth, createUserWithEmailAndPassword, db, ref, set }
from "/shahartaxi-demo/docs/libs/lib.js";

const nameInput = document.getElementById("fullName");
const phoneInput = document.getElementById("phone");
const roleInput = document.getElementById("role");
const passwordInput = document.getElementById("password");

document.getElementById("registerBtn").onclick = async () => {

    const fullName = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const role = roleInput.value;
    const password = passwordInput.value;

    if (!fullName || !phone || !password) {
        alert("Barcha maydonlarni to‘ldiring.");
        return;
    }

    const email = phone + "@shahartaxi.uz";

    try {
        const user = await createUserWithEmailAndPassword(auth, email, password);

        await set(ref(db, "users/" + user.user.uid), {
            uid: user.user.uid,
            fullName,
            phone,
            role,
            balance: 0,
            subscriptions: { taxi: { active: false } }
        });

        alert("Akkount yaratildi!");

        window.location.href = "/shahartaxi-demo/app/user/index.html";

    } catch (err) {
        console.error(err);
        alert("Ro‘yxatdan o‘tishda xatolik!");
    }
};
