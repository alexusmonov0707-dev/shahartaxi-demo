// admin.js — yangilangan
import { db, ref, get, child } from "../libs/lib.js"; // agar lib.js boshqa joyda bo'lsa pathni moslang

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
        // 1) Avvalo to'g'ridan-to'g'ri node (admins/<login>) ga qaraymiz
        const snap = await get(ref(db, "admins/" + login));
        if (snap.exists()) {
            const admin = snap.val();
            // Password raqam yoki string bo'lishi mumkin — stringga aylantirib tekshir
            if (String(admin.password) !== pass) {
                error.textContent = "Login yoki parol noto‘g‘ri!";
                console.warn("Admin node topildi, lekin parol mos emas:", admin);
                return;
            }

            // muvaffaqiyat
            sessionStorage.setItem("admin", login);
            location.href = "./dashboard.html";
            return;
        }

        // 2) Agar admins/<login> topilmasa — barcha admins ichida username yoki email bilan qidiruv (fallback)
        const allSnap = await get(ref(db, "admins"));
        if (allSnap.exists()) {
            const list = allSnap.val();
            // list: { key1: { username: 'admin001', password: 123456, ... }, ... }
            for (const key of Object.keys(list)) {
                const a = list[key];
                // qidiruvni kengaytiramiz: match username yoki email yoki kalit bilan
                if ((a.username && a.username === login) ||
                    (a.email && a.email === login) ||
                    key === login) {
                    // topildi — parolni tekshir
                    if (String(a.password) === pass) {
                        sessionStorage.setItem("admin", key);
                        location.href = "./dashboard.html";
                        return;
                    } else {
                        error.textContent = "Login yoki parol noto‘g‘ri!";
                        console.warn("Admin topildi (fallback), lekin parol mos emas:", key, a);
                        return;
                    }
                }
            }
        }

        // hammasi sinab ko'rildi — topilmadi
        error.textContent = "Bunday admin topilmadi!";
        console.warn("Admin topilmadi. Kiritilgan login:", login);

    } catch (err) {
        console.error("Server xatosi:", err);
        error.textContent = "Server xatosi!";
    }
}

window.loginAdmin = loginAdmin;
