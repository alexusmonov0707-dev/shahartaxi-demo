// app/user/js/login.js
import {
  auth,
  db,
  ref,
  get,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "./lib.js";


// ==========================
// Invisible Recaptcha
// ==========================
window.recaptchaVerifier = new RecaptchaVerifier(
  auth,
  "recaptcha-container",
  { size: "invisible" }
);


// ==========================
// SEND SMS
// ==========================
document.getElementById("sendBtn").onclick = async () => {
  const phone = document.getElementById("phone").value;

  try {
    const confirmation = await signInWithPhoneNumber(
      auth,
      phone,
      window.recaptchaVerifier
    );

    window.confirmationResult = confirmation;
    alert("SMS yuborildi!");

  } catch (e) {
    console.error(e);
    alert("SMS yuborishda xato: " + e.message);
  }
};


// ==========================
// VERIFY CODE
// ==========================
document.getElementById("verifyBtn").onclick = async () => {
  const code = document.getElementById("smsCode").value;

  try {
    const result = await window.confirmationResult.confirm(code);
    const user = result.user;

    const snap = await get(ref(db, "users/" + user.uid));

    if (!snap.exists()) {
      window.location.href = "register.html";
    } else {
      window.location.href = "index.html";
    }

  } catch (e) {
    alert("Kod xato!");
  }
};
