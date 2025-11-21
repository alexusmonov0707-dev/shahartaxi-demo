// Modular login.js
window.addEventListener("load", () => {

  const phoneInput = document.getElementById("phoneInput");
  const codeInput = document.getElementById("codeInput");
  const sendBtn = document.getElementById("sendBtn");
  const verifyBtn = document.getElementById("verifyBtn");

  const { auth, RecaptchaVerifier, signInWithPhoneNumber } = window.shahaFirebase;

  // === Invisible Recaptcha ===
  window.recaptchaVerifier = new RecaptchaVerifier(auth, "sendBtn", {
    size: "invisible"
  });

  sendBtn.onclick = async () => {
    const phone = phoneInput.value.trim();
    if (!phone) return alert("Telefon kiriting");

    try {
      const confirmation = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
      window.confirmationResult = confirmation;
      alert("SMS yuborildi!");
    } catch (err) {
      console.error(err);
      alert("Xatolik (SMS): " + err.message);
    }
  };

  verifyBtn.onclick = async () => {
    const code = codeInput.value.trim();
    if (!code) return alert("Kod kiriting");

    try {
      const result = await window.confirmationResult.confirm(code);
      alert("Muvaffaqiyatli kirdingiz!");
      window.location.href = "index.html";
    } catch (err) {
      console.error(err);
      alert("Kod xato!");
    }
  };
});
