// app/user/js/login.js
import { auth, signInWithPhoneNumber, RecaptchaVerifier, onAuthStateChanged } from './lib.js';

// prepare recaptcha once page loads
window.recaptchaVerifier = null;
window.confirmationResult = null;

function initRecaptcha() {
  if (window.recaptchaVerifier) return;
  window.recaptchaVerifier = new RecaptchaVerifier('recaptcha-container', {
    size: 'invisible'
  }, auth);
}

document.getElementById('sendCodeBtn').addEventListener('click', async function () {
  initRecaptcha();
  const phone = document.getElementById('phone').value.trim();
  if (!phone) return alert("Telefon raqam kiriting.");
  try {
    const appVerifier = window.recaptchaVerifier;
    const result = await signInWithPhoneNumber(auth, phone, appVerifier);
    window.confirmationResult = result;
    alert("SMS kodi yuborildi. Kodni kiriting va tasdiqlang.");
  } catch (err) {
    console.error("sendCode error:", err);
    alert("SMS yuborishda xato: " + (err.message || err));
    // reset recaptcha so user can retry
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }
  }
});

document.getElementById('verifyBtn').addEventListener('click', async function () {
  const code = document.getElementById('smsCode').value.trim();
  if (!code) return alert("SMS kodni kiriting.");
  if (!window.confirmationResult) return alert("Avval SMS kod yuboring.");
  try {
    const credential = await window.confirmationResult.confirm(code);
    // kirish muvaffaqiyatli
    alert("Tizimga kirdingiz!");
    // redirect to app index
    window.location.href = "index.html";
  } catch (err) {
    console.error("verify error:", err);
    alert("Kod noto'g'ri yoki xatolik: " + (err.message || err));
  }
});

// keep user session watch
onAuthStateChanged(auth, user => {
  if (user) {
    // agar allaqachon tizimga kiritilgan bo'lsa indexga o'tkazamiz
    // (agar index.php yoqligini tekshirish kerak bo'lsa shart qo'yishingiz mumkin)
    // window.location.href = "index.html";
    console.log("User logged in:", user.uid);
  } else {
    console.log("No user");
  }
});
