// =====================
//  ADMIN AUTH SYSTEM
// =====================

import { db } from "./firebase.js";
import {
    ref,
    get,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";


// ===========================================
// LOGIN – username + password ni tekshiradi
// ===========================================
export async function loginAdmin(username, password) {
    try {
        const adminsRef = ref(db, "admins");
        const snap = await get(adminsRef);

        if (!snap.exists()) {
            return { ok: false, error: "Adminlar mavjud emas!" };
        }

        const admins = snap.val();

        // ADMIN QIDIRISH
        let foundAdmin = null;
        for (let key in admins) {
            if (
                admins[key].username === username &&
                admins[key].password === password
            ) {
                foundAdmin = { id: key, ...admins[key] };
                break;
            }
        }

        if (!foundAdmin) {
            return { ok: false, error: "Login yoki parol noto‘g‘ri!" };
        }

        // SESSION SAQLAYMIZ
        sessionStorage.setItem("admin", foundAdmin.id);

        return { ok: true, admin: foundAdmin };
    }
    catch (err) {
        return { ok: false, error: err.message };
    }
}


// ===========================================
// ADMIN INFO – sessiondagi admin ID orqali
// ===========================================
export async function getCurrentAdmin() {
    const adminId = sessionStorage.getItem("admin");
    if (!adminId) return null;

    const snap = await get(ref(db, "admins/" + adminId));
    if (!snap.exists()) return null;

    return { id: adminId, ...snap.val() };
}


// ===========================================
// ADMIN GUARD — sahifaga kirishni himoyalash
// ===========================================
export async function adminGuard(requiredRole = null) {
    const adminId = sessionStorage.getItem("admin");

    // SESSION YO'Q → LOGIN GA TASHLAYMIZ
    if (!adminId) {
        window.location.href = "./login.html";
        return false;
    }

    const snap = await get(ref(db, "admins/" + adminId));

    if (!snap.exists()) {
        sessionStorage.removeItem("admin");
        window.location.href = "./login.html";
        return false;
    }

    const admin = snap.val();

    // ROLE CHECK
    if (requiredRole && admin.role !== requiredRole) {
        alert("Sizga bu sahifaga ruxsat yo‘q!");
        window.location.href = "./dashboard.html";
        return false;
    }

    return admin;
}


// ===========================================
// LOGOUT
// ===========================================
export function logout() {
    sessionStorage.removeItem("admin");
    window.location.href = "./login.html";
}
