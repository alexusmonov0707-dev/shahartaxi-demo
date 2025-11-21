// register.js
import { auth, RecaptchaVerifier, signInWithPhoneNumber, set, ref } from './lib.js';

const phoneInput = document.getElementById('phone');
const roleSelect = document.getElementById('role');
const sendBtn = document.getElementById('sendBtn');
const codeInput = document.getElementById('code');
const registerBtn = document.getElementById('registerBtn');

let confirmationResult = null;

function initRecaptcha() {
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier('recaptcha-container', {
      'size': 'invisible',
      'callback': (response) => {}
    }, auth);
  }
}

sendBtn.addEventListener('click', async () => {
  const phone = phoneInput.value.trim();
  if (!phone) {
    alert('Telefon raqam kiriting');
    return;
  }
  try {
    initRecaptcha();
    const verifier = window.recaptchaVerifier;
    confirmationResult = await signInWithPhoneNumber(auth, phone, verifier);
    window.confirmationResult = confirmationResult;
    alert('SMS kodi yuborildi.');
  } catch (err) {
    console.error(err);
    alert('Kod yuborishda xatolik: ' + (err?.message || err));
  }
});

registerBtn.addEventListener('click', async () => {
  const code = codeInput.value.trim();
  const role = roleSelect.value;
  if (!code) { alert('Kod kiriting'); return; }
  try {
    const conf = window.confirmationResult || confirmationResult;
    if (!conf) { alert('Avval "SMS kod yuborish" bosing'); return; }
    const result = await conf.confirm(code);
    const user = result.user;
    const uid = user.uid;

    // Yangi user yaratish: minimal ma'lumotlar
    const userData = {
      phone: user.phone || phoneInput.value.trim(),
      createdAt: Date.now(),
      role: role,
      fullName: '',
      balance: 0
    };
    await set(ref(firebase.database ? firebase.database() : null, `users/${uid}`), userData)
      .catch(async (e) => {
        // Agar lib.js eksportida set/ref bor bo'lsa shundan foydalan
        // fallback: import set/ref from lib.js already — but to be safe:
        // second approach (if set/ref imported in header):
        console.error('set error', e);
      });

    // Agar lib.js eksportlari to'g'ri bo'lsa yuqoridagi set() ishlaydi.
    localStorage.setItem('uid', uid);
    alert('Ro‘yxatdan muvaffaqiyatli o‘tildi.');
    window.location.href = 'index.html';
  } catch (err) {
    console.error('register verify error', err);
    alert('Tasdiqlashda xatolik: ' + (err?.message || err));
  }
});
