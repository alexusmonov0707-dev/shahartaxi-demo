import { db, ref, get } from "../libs/lib.js";

window.loginAdmin = async function () {
    const login = document.getElementById("login").value.trim();
    const pass = document.getElementById("pass").value.trim();
    const error = document.getElementById("error");

    if (!login || !pass) {
        error.innerText = "Login va parolni kiriting!";
        return;
    }

    // admin larni olish
    const adminsSnap = await get(ref(db, "admins"));

    if (!adminsSnap.exists()) {
        error.innerText = "Adminlar topilmadi!";
        return;
    }

    const admins = adminsSnap.val();

    // username orqali qidiramiz
    if (!admins[login]) {
        error.innerText = "Login yoki parol noto‘g‘ri!";
        return;
    }

    const admin = admins[login];

    if (admin.password !== pass) {
        error.innerText = "Login yoki parol noto‘g‘ri!";
        return;
    }

    // Admin found — session yozamiz
    localStorage.setItem("adminUser", JSON.stringify({
        username: admin.username,
        role: admin.role
    }));

    // Dashboardga o'tamiz
    location.href = "./dashboard.html";
};
