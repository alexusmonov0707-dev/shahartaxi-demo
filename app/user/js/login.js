console.log("LOGIN JS loaded");

// Firebase init (sizning lib.js dagi)
import {
  auth,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "../js/lib.js";

let confirmationResult = null;

// Recaptcha
window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
  size: "invisible",
});

// SMS yuborish
window.sendCode = async function () {
  let phone = document.getElementById("phone").value.trim();

  try {
    confirmationResult = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
    alert("Kod yuborildi!");
  } catch (err) {
    console.error(err);
    alert("Xatolik: " + err.message);
  }
};

// Kodni tasdiqlash
window.verifyCode = async function () {
  let code = document.getElementById("code").value.trim();

  try {
    const result = await confirmationResult.confirm(code);
    const user = result.user;

    alert("Muvaffaqiyatli kirdingiz!");

    // 👉 MUHIM QISM (sizda yo‘q edi)
    localStorage.setItem("uid", user.uid);

    // 👉 To‘g‘ri sahifaga o‘tish
    window.location.href = "index.html";

  } catch (err) {
    console.error(err);
    alert("Xatolik: " + err.message);
  }
};
