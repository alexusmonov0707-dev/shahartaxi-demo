import { db, ref, get } from "./firebase.js";

window.loginAdmin = async function () {
    const login = document.getElementById("login").value.trim();
    const pass = document.getElementById("pass").value.trim();
    const error = document.getElementById("error");

    error.textContent = "";

    try {
        const adminRef = ref(db, "admins/" + login);
        const snap = await get(adminRef);

        if (!snap.exists()) {
            error.textContent = "Login yoki parol noto‘g‘ri!";
            return;
        }

        const admin = snap.val();

        if (admin.password !== pass) {
            error.textContent = "Login yoki parol noto‘g‘ri!";
            return;
        }

        localStorage.setItem("admin", login);
        window.location.href = "./dashboard.html";

    } catch (e) {
        console.error(e);
        error.textContent = "Server xatosi!";
    }
};
