import { db, ref, get } from "../libs/lib.js";

window.loginAdmin = async () => {
    const login = document.getElementById("login").value.trim();
    const pass = document.getElementById("pass").value.trim();
    const error = document.getElementById("error");

    error.textContent = "";

    try {
        const snap = await get(ref(db, `admins/${login}`));
        if (!snap.exists()) {
            error.textContent = "Login yoki parol noto‘g‘ri!";
            return;
        }

        const admin = snap.val();

        if (admin.password !== pass) {
            error.textContent = "Login yoki parol noto‘g‘ri!";
            return;
        }

        // LOGIN MUVAFFAQIYATLI — SESSION SAQLAYMIZ
        sessionStorage.setItem("admin", login);

        location.href = "./dashboard.html";
    }
    catch (e) {
        error.textContent = "Xatolik yuz berdi!";
        console.log(e);
    }
};
