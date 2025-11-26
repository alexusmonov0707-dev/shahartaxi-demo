import { db, ref, get } from "../libs/lib.js";

async function loginAdmin() {
    const login = document.getElementById("login").value.trim();
    const pass = document.getElementById("pass").value.trim();
    const error = document.getElementById("error");

    error.textContent = "";

    if (!login || !pass) {
        error.textContent = "Login va parolni kiriting!";
        return;
    }

    try {
        const snap = await get(ref(db, "admins/" + login));
        if (!snap.exists()) {
            error.textContent = "Bunday admin topilmadi!";
            return;
        }

        const admin = snap.val();

        if (admin.password !== pass) {
            error.textContent = "Login yoki parol noto‘g‘ri!";
            return;
        }

        // SUCCESS — sessionga saqlaymiz
        sessionStorage.setItem("admin", login);

        // 🔥 MUHIM! TO‘G‘RI YO‘NALISH
        location.href = "./dashboard.html";

    } catch (err) {
        console.error(err);
        error.textContent = "Server xatosi!";
    }
}

window.loginAdmin = loginAdmin;
