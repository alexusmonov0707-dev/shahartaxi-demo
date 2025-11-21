console.log("LOGIN JS loaded");

// ------- FIREBASE IMPORTS -------
import {
    getAuth,
    signInWithPhoneNumber,
    RecaptchaVerifier,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { app } from "./lib.js"; 


const auth = getAuth(app);

let confirmationResult = null;


// ========== 1) SMS YUBORISH FUNKSIYASI ==========
window.sendCode = async function () {
    const phone = document.getElementById("phone").value.trim();

    if (!phone) {
        alert("Telefon raqamni kiriting!");
        return;
    }

    try {
        // TEST MODE uchun recaptcha required emas
        window.recaptchaVerifier = new RecaptchaVerifier(auth, "sms-button", {
            size: "invisible"
        });

        confirmationResult = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);

        alert("SMS kod yuborildi!");

    } catch (err) {
        console.error(err);
        alert("Xatolik: " + err.message);
    }
};


// ========== 2) KODNI TEKSHIRISH ==========
window.verifyCode = async function () {
    const code = document.getElementById("smsCode").value.trim();

    if (!code) {
        alert("Kodni kiriting!");
        return;
    }

    try {
        const result = await confirmationResult.confirm(code);
        const user = result.user;

        alert("Muvaffaqiyatli kirdingiz!");

        // login bo‘lgandan keyin index.html ga o‘tadi
        window.location.href = "index.html";

    } catch (err) {
        console.error(err);
        alert("Kod xato yoki muddati tugagan!");
    }
};
