import { auth } from "../lib.js";
import {
    RecaptchaVerifier,
    signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

console.log("LOGIN JS loaded");

// TEST RAQAMLAR UCHUN RECAPTCHA O‘CHIRILADI
window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    size: 'invisible',
}, auth);

// --- SMS yuborish ---
document.getElementById("sendCodeBtn").onclick = async () => {
    const phone = document.getElementById("phone").value.trim();

    try {
        const appVerifier = window.recaptchaVerifier;

        window.confirmationResult = await signInWithPhoneNumber(auth, phone, appVerifier);

        alert("SMS kod yuborildi!");
    } catch (err) {
        alert("Xato: " + err.message);
        console.log(err);
    }
};

// --- KODNI TASDIQLASH ---
document.getElementById("verifyBtn").onclick = async () => {
    const code = document.getElementById("code").value.trim();

    try {
        const result = await window.confirmationResult.confirm(code);

        alert("Muvaffaqiyatli kirdingiz!");

        location.href = "index.html";

    } catch (err) {
        alert("Kirish xatosi: " + err.message);
    }
};
