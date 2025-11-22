// app/user/js/login.js
import {
  auth,
  db,
  ref,
  get,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  $
} from "../../libs/lib.js";

// ==========================
// INVISIBLE RECAPTCHA
// ==========================
window.recaptchaVerifier = new RecaptchaVerifier(
  auth,
  "recaptcha-container",
  { size: "invisible" }
);

// ==========================
// SEND SMS
// ==========================
$("sendBtn").onclick = async () => {
  const phone = $("phone").value.trim();

  if (!phone.startsWith("+998")) {
    alert("Telefonni +998 bilan kiriting");
    return;
  }

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
    alert("SMS yuborishda xatolik: " + e.message);
  }
};

// ==========================
// VERIFY CODE
// ==========================
$("verifyBtn").onclick = async () => {
  const code = $("smsCode").value.trim();

  try {
    const result = await window.confirmationResult.confirm(code);
    const user = result.user;

    const snap = await get(ref(db, "users/" + user.uid));

    if (snap.exists()) {
      window.location.href = "/shahartaxi-demo/app/user/index.html";
    } else {
      window.location.href = "/shahartaxi-demo/app/user/register.html";
    }

  } catch (e) {
    alert("Kod xato yoki muddati tugagan!");
  }
};
