import { db, ref, get } from "./firebase.js";

window.loginAdmin = async function () {
    const login = document.getElementById("login").value.trim();
    const pass = document.getElementById("pass").value.trim();
    const error = document.getElementById("error");

    error.textContent = "";

    try {
        // admnlar pathni TEKSHIRAMIZ
        // /admins/admin001
        const adminRef = ref(db, "admins/" + login);
        const snap = await get(adminRef);

        if (!snap.exists()) {
            error.textContent = "Login yoki parol noto‘g‘ri!";
            return;
        }

        const admin = snap.val();

        if (!admin.password || admin.password !== pass) {
            error.textContent = "Login yoki parol noto‘g‘ri!";
            return;
        }

        // login muvaffaqiyatli
        localStorage.setItem("admin", login);
        window.location.href = "./dashboard.html";

    } catch (err) {
        console.error(err);
        error.textContent = "Server xatosi!";
    }
};
