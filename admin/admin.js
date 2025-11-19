import { db, ref, get } from "./firebase.js";

async function loginAdmin() {
    const login = document.getElementById("login").value.trim();
    const pass = document.getElementById("pass").value.trim();
    const error = document.getElementById("error");

    error.textContent = "";

    if (!login || !pass) {
        error.textContent = "Iltimos, maydonlarni to‘ldiring!";
        return;
    }

    try {
        // admins bo‘limidan o‘qish
        const adminRef = ref(db, "admins/" + login);
        const snapshot = await get(adminRef);

        if (!snapshot.exists()) {
            error.textContent = "Login yoki parol noto‘g‘ri!";
            return;
        }

        const data = snapshot.val();

        if (data.password !== pass) {
            error.textContent = "Login yoki parol noto‘g‘ri!";
            return;
        }

        // Kirish muvaffaqiyatli
        localStorage.setItem("admin", login);
        window.location.href = "./dashboard.html";

    } catch (err) {
        console.error(err);
        error.textContent = "Serverda xatolik!";
    }
}

window.loginAdmin = loginAdmin;
