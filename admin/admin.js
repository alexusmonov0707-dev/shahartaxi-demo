import { db, ref, get } from "./firebase.js";

window.loginAdmin = async function () {
    const error = document.getElementById("error");
    error.textContent = "Tekshiryapman...";

    try {
        const adminRef = ref(db, "admins/admin001");
        const snap = await get(adminRef);

        console.log("SNAPSHOT RAW:", snap);
        console.log("SNAPSHOT EXISTS:", snap.exists());
        console.log("SNAPSHOT VALUE:", snap.val());

        if (!snap.exists()) {
            error.textContent = "❌ Firebase admin001 ni O‘QIMAYAPTI!";
        } else {
            error.textContent = "✅ Firebase admin001 MA'LUMOTNI O‘QIDI!";
        }

    } catch (e) {
        console.error("XATO:", e);
        error.textContent = "❌ Firebase ERROR — console'ni tekshir!";
    }
};
