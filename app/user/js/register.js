// app/user/js/register.js
import { auth, signInWithPhoneNumber, RecaptchaVerifier, set, db, ref } from './lib.js';

// Rekapcha va process shunga o'xshash login.js bilan
let recaptchaReg = null;
let regConfirmation = null;

function initRegRecaptcha() {
  if (recaptchaReg) return;
  recaptchaReg = new RecaptchaVerifier('reg-recaptcha', { size: 'invisible' }, auth);
}

document.getElementById('regSend').addEventListener('click', async () => {
  initRegRecaptcha();
  const phone = document.getElementById('regPhone').value.trim();
  if (!phone) return alert("Telefon kiriting");
  try {
    const result = await signInWithPhoneNumber(auth, phone, recaptchaReg);
    regConfirmation = result;
    alert("SMS yuborildi. Kodni kiriting.");
  } catch (err) {
    console.error(err);
    alert("SMS yuborilmadi: " + (err.message || err));
    if (recaptchaReg) { recaptchaReg.clear(); recaptchaReg = null; }
  }
});

document.getElementById('regVerify').addEventListener('click', async () => {
  const code = document.getElementById('regCode').value.trim();
  if (!code || !regConfirmation) return alert("Avval kod yuboring va keyin kiriting.");
  try {
    const userCredential = await regConfirmation.confirm(code);
    // foydalanuvchi yaratilgan / kirgan
    // bitta basic users/{uid} yozamiz, keyin profile da to'ldiradi
    const user = userCredential.user;
    const uRef = ref(db, 'users/' + user.uid);
    await set(uRef, {
      phone: user.phoneNumber || "",
      fullName: "",
      role: "passenger",
      avatar: "",
      createdAt: Date.now(),
      balance: 0
    });
    alert("Roʻyxatdan oʻtildi. Profilni toʻldiring.");
    window.location.href = "profile.html";
  } catch (err) {
    console.error(err);
    alert("Kod noto'g'ri: " + (err.message || err));
  }
});
