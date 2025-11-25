import { auth, signInWithEmailAndPassword, onAuthStateChanged, db, ref, get } from "../libs/lib.js";

window.loginAdmin = async function () {
    const login = document.getElementById("login").value.trim();
    const pass = document.getElementById("pass").value.trim();
    const error = document.getElementById("error");

    error.textContent = "";

    if (!login || !pass) {
        error.textContent = "Login va parolni to‘ldiring!";
        return;
    }

    try {
        // LOGIN = email sifatida ishlaymiz (admin001@admin.uz kabi)
        const email = login.includes("@") ? login : `${login}@admin.uz`;

        const result = await signInWithEmailAndPassword(auth, email, pass);
        const uid = result.user.uid;

        // Admin tekshiruvi
        const snap = await get(ref(db, "admins/" + uid));
        if (!snap.exists()) {
            error.textContent = "Siz admin emassiz!";
            return;
        }

        // Dashboardga yo‘naltiramiz
        location.href = "/shahartaxi-demo/docs/admin/dashboard.html";

    } catch (e) {
        console.log(e);
        error.textContent = "Login yoki parol noto‘g‘ri!";
    }
};

// Avvaldan login bo‘lsa to‘g‘ridan-dashboard
onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    const snap = await get(ref(db, "admins/" + user.uid));
    if (snap.exists()) {
        location.href = "/shahartaxi-demo/docs/admin/dashboard.html";
    }
});
