// Modular register.js
window.addEventListener("load", () => {

  const regPhone = document.getElementById("regPhone");
  const fullName = document.getElementById("fullName");
  const roleInput = document.getElementById("role");
  const regCode = document.getElementById("regCode");

  const regSendBtn = document.getElementById("regSendBtn");
  const regVerifyBtn = document.getElementById("regVerifyBtn");

  const { auth, RecaptchaVerifier, signInWithPhoneNumber, db, ref, set, update } = window.shahaFirebase;

  // === recaptcha ===
  window.recaptchaVerifierReg = new RecaptchaVerifier(auth, "regSendBtn", {
    size: "invisible"
  });

  regSendBtn.onclick = async () => {
    const phone = regPhone.value.trim();
    if (!phone) return alert("Telefonni kiriting");

    try {
      const confirmation = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifierReg);
      window.regConfirm = confirmation;
      alert("SMS yuborildi");
    } catch (err) {
      console.error(err);
      alert("Xatolik (SMS): " + err.message);
    }
  };

  regVerifyBtn.onclick = async () => {
    try {
      const result = await window.regConfirm.confirm(regCode.value.trim());
      const user = result.user;

      await update(ref(db, "users/" + user.uid), {
        fullName: fullName.value,
        role: roleInput.value,
        phone: user.phoneNumber,
        createdAt: Date.now()
      });

      alert("Ro‘yxatdan o‘tdingiz!");
      window.location.href = "index.html";

    } catch (err) {
      console.error(err);
      alert("Kod xato!");
    }
  };
});
