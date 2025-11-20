// admin.js
import { db, ref, query, orderByChild, equalTo, get } from "./firebase.js";

window.loginAdmin = async function () {
    const login = document.getElementById("login").value.trim();
    const pass  = document.getElementById("pass").value.trim();
    const error = document.getElementById("error");

    error.textContent = "";

    if (!login || !pass) {
        error.textContent = "Login va parolni kiriting!";
        return;
    }

    try {
        const q = query(ref(db, "admins"), orderByChild("username"), equalTo(login));
        const snap = await get(q);

        if (!snap.exists()) {
            error.textContent = "Login yoki parol noto‘g‘ri!";
            return;
        }

        const key = Object.keys(snap.val())[0];
        const admin = snap.val()[key];

        if (admin.password !== pass) {
            error.textContent = "Login yoki parol noto‘g‘ri!";
            return;
        }

        // Login muvaffaqiyatli
        localStorage.setItem("admin", JSON.stringify(admin));
        window.location.href = "dashboard.html";

    } catch (e) {
        console.error(e);
        error.textContent = "Server xatosi!";
    }
};
