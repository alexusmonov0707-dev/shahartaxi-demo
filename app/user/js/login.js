import {
    auth,
    RecaptchaVerifier,
    signInWithPhoneNumber
} from "../../lib.js";

console.log("LOGIN JS loaded");

// GLOBAL o'zgaruvchi
let confirmationResult = null;

// Recaptcha
window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    size: "invisible",
});

// SMS yuborish
document.getElementById("sendBtn").onclick = async () => {
    try {
        const phone = document.getElementById("phone").value.trim();

        confirmationResult = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);

        alert("SMS kod yuborildi");
    } catch (err) {
        console.error(err);
        alert("Xatolik: " + err.message);
    }
};

// Kodni tasdiqlash
document.getElementById("verifyBtn").onclick = async () => {
    try {
        const code = document.getElementById("code").value.trim();

        const result = await confirmationResult.confirm(code);
        const user = result.user;

        console.log("Kirish muvaffaqiyatli:", user);

        localStorage.setItem("uid", user.uid);

        window.location.href = "index.html";
    } catch (err) {
        console.error(err);
        alert("Kod noto‘g‘ri");
    }
};
