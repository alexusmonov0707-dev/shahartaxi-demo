console.log("LOGIN JS loaded");

// ReCAPTCHA
let recaptchaVerifier;

window.onload = function () {
    recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
        size: 'invisible'
    });
};

function sendCode() {
    const phone = document.getElementById("phone").value;
    if (!phone.startsWith("+998")) {
        alert("Raqam +998 bilan boshlanishi kerak");
        return;
    }

    firebase.auth().signInWithPhoneNumber(phone, recaptchaVerifier)
        .then((confirmation) => {
            window.confirmationResult = confirmation;
            alert("SMS yuborildi");
        })
        .catch((err) => {
            console.error(err);
            alert("Xato: " + err.message);
        });
}

function verifyCode() {
    const code = document.getElementById("code").value;

    window.confirmationResult.confirm(code)
        .then((result) => {
            const user = result.user;

            // Session saqlash
            localStorage.setItem("uid", user.uid);

            // User bor yoki yo‘qligini tekshiramiz
            firebase.database().ref("users/" + user.uid).once("value", snap => {
                if (snap.exists()) {
                    location.href = "index.html";
                } else {
                    location.href = "register.html";
                }
            });
        })
        .catch((err) => {
            console.error(err);
            alert("Kod noto‘g‘ri!");
        });
}
