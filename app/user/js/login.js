// login.js
// type=module tug'ilishi uchun fayl modul formatda bo'lishi kerak.
// Import — lib.js ichida firebase init va eksportlar bor (app/user/js/lib.js)
import { auth, RecaptchaVerifier, signInWithPhoneNumber, get, ref, db } from './lib.js';

// DOM
const phoneInput = document.getElementById('phone');
const sendBtn = document.getElementById('sendBtn');
const codeInput = document.getElementById('code');
const verifyBtn = document.getElementById('verifyBtn');

console.log('LOGIN JS loaded');

let confirmationResult = null;

// reCAPTCHA init (invisible) — Firebase sizning lib.js orqali RecaptchaVerifier ni ishlatadi
function initRecaptcha() {
  // create invisible reCAPTCHA inside #recaptcha-container
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier('recaptcha-container', {
      'size': 'invisible',
      'callback': (response) => {
        // reCAPTCHA muvoffaqiyatli
      }
    }, auth);
  }
}

sendBtn.addEventListener('click', async () => {
  const phone = phoneInput.value.trim();
  if (!phone) {
    alert('Telefon raqamni kiriting.');
    return;
  }

  try {
    initRecaptcha();
    const verifier = window.recaptchaVerifier;
    // signInWithPhoneNumber qaytgan confirmationResult globalga yozamiz
    confirmationResult = await signInWithPhoneNumber(auth, phone, verifier);
    window.confirmationResult = confirmationResult;
    alert('SMS kodi yuborildi. Test kodlardan biri bilan tasdiqlang.');
  } catch (err) {
    console.error('sendCode error', err);
    alert('Kod yuborishda xatolik: ' + (err?.message || err));
    // Agar reCAPTCHA ishlamayotgan bo'lsa, qayta yarating:
    if (window.recaptchaVerifier) {
      try { window.recaptchaVerifier.clear(); } catch(e) {}
      window.recaptchaVerifier = null;
    }
  }
});

verifyBtn.addEventListener('click', async () => {
  const code = codeInput.value.trim();
  if (!code) {
    alert('Iltimos SMS kodni kiriting.');
    return;
  }
  try {
    // confirmationResult global bo'lmagan holatda eski usulga qarshi muomala
    const conf = window.confirmationResult || confirmationResult;
    if (!conf) {
      alert('Iltimos avval "SMS kod yuborish" tugmasini bosing.');
      return;
    }
    const result = await conf.confirm(code); // userCredential qaytaradi
    const user = result.user;
    // Saqlash: uid localStorage ga
    localStorage.setItem('uid', user.uid);

    alert('Muvaffaqiyatli kirdingiz!');
    // Redirect -> index (app/user/index.html bo'lsa shu yerga)
    window.location.href = 'index.html';
  } catch (err) {
    console.error('verifyCode error', err);
    alert('Kodni tasdiqlashda xatolik: ' + (err?.message || err));
  }
});
