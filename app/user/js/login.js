let confirmationResult;

// Telefon raqamiga SMS yuborish
function sendCode() {
    const phone = document.getElementById("phone").value;

    if (!phone.startsWith("+998")) {
        alert("Telefon raqamni +998 bilan yozing!");
        return;
    }

    const verifier = new firebase.auth.RecaptchaVerifier('phone', {
        size: 'invisible'
    });

    auth.signInWithPhoneNumber(phone, verifier)
        .then(result => {
            confirmationResult = result;
            alert("SMS kod yuborildi!");
        })
        .catch(err => {
            console.error(err);
            alert("Xatolik: " + err.message);
        });
}

// SMS kodni tasdiqlash
function verifyCode() {
    const code = document.getElementById("smsCode").value;

    confirmationResult.confirm(code)
        .then(res => {
            const user = res.user;

            saveUserLocal(user.uid);

            window.location.href = "index.html";
        })
        .catch(err => {
            console.error(err);
            alert("Kod noto‘g‘ri!");
        });
}

console.log("LOGIN JS loaded");
