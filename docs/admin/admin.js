import { db, ref, get } from "../libs/lib.js";

window.loginAdmin = async function () {
    const username = document.getElementById("login").value.trim();
    const password = document.getElementById("pass").value.trim();
    const error = document.getElementById("error");

    if (!username || !password) {
        error.textContent = "Login va parolni kiriting!";
        return;
    }

    try {
        const snap = await get(ref(db, "admins/" + username));
        if (!snap.exists()) {
            error.textContent = "Login yoki parol noto‘g‘ri!";
            return;
        }

        const admin = snap.val();

        if (admin.password != password) {
            error.textContent = "Login yoki parol noto‘g‘ri!";
            return;
        }

        // login ok – session saqlaymiz
        sessionStorage.setItem("admin", username);

        location.href = "/shahartaxi-demo/docs/admin/dashboard.html";

    } catch (e) {
        console.error(e);
        error.textContent = "Xatolik yuz berdi!";
    }
};
