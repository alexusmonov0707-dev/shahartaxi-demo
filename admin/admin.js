import { db, ref, get } from "./firebase.js";

window.loginAdmin = async function () {
    const login = document.getElementById("login").value.trim();
    const pass = document.getElementById("pass").value.trim();
    const error = document.getElementById("error");
    error.textContent = "";

    try {
        // 1) Hamma adminlarni olish
        const adminsRef = ref(db, "admins");
        const snap = await get(adminsRef);

        if (!snap.exists()) {
            error.textContent = "Adminlar topilmadi!";
            return;
        }

        const admins = snap.val();
        let foundAdmin = null;

        // 2) username orqali qidirish
        for (let key in admins) {
            if (admins[key].username === login) {
                foundAdmin = { id: key, ...admins[key] };
                break;
            }
        }

        if (!foundAdmin) {
            error.textContent = "Login yoki parol noto‘g‘ri!";
            return;
        }

        // 3) Parol tekshirish
        if (foundAdmin.password != pass) {
            error.textContent = "Login yoki parol noto‘g‘ri!";
            return;
        }

        // 4) Login OK
        localStorage.setItem("admin", foundAdmin.id);
        window.location.href = "./dashboard.html";

    } catch (e) {
        console.error(e);
        error.textContent = "Server xatosi!";
    }
};
