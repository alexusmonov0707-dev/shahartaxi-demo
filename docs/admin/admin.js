import { db, ref, get } from "./firebase.js";

console.log("ADMIN.JS LOADED!!!"); // <-- MUHIM: brauzer yangi faylni yuklaganini tekshiradi

window.loginAdmin = async function () {
    const login = document.getElementById("login").value.trim();
    const pass = document.getElementById("pass").value.trim();
    const error = document.getElementById("error");

    error.textContent = "";

    console.log("---- LOGIN BOSILDI ----");
    console.log("Kiritilgan login:", login);
    console.log("Kiritilgan parol:", pass);

    try {
        // 1) Admin bo‘limidan login bo‘yicha ma’lumot olish
        const adminRef = ref(db, "admins/" + login);
        const snap = await get(adminRef);

        console.log("Snapshot exists:", snap.exists());
        console.log("Snapshot value:", snap.val());

        if (!snap.exists()) {
            error.textContent = "Login yoki parol noto‘g‘ri!";
            return;
        }

        const admin = snap.val();

        console.log("DB login:", login);
        console.log("DB password:", admin.password);
        console.log("DB username:", admin.username);

        // PAROLNI SOLISHTIRISH - 100% ishlaydi
        if (String(admin.password) !== String(pass)) {
            console.log("PAROL NOTO'G'RI: DB:", admin.password, "INPUT:", pass);
            error.textContent = "Login yoki parol noto‘g‘ri!";
            return;
        }

        // Login OK
        console.log("LOGIN MUVAFFAQIYATLI!");
        localStorage.setItem("admin", login);

        window.location.href = "./dashboard.html";

    } catch (e) {
        console.error("XATO:", e);
        error.textContent = "Server xatosi yuz berdi!";
    }
};
