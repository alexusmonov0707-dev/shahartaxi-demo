import {
    auth,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    db,
    set,
    ref
} from "../../lib.js";

let confirmationResult = null;

window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    size: "invisible",
});

document.getElementById("sendBtn").onclick = async () => {
    try {
        const phone = document.getElementById("phone").value.trim();

        confirmationResult = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);

        alert("SMS yuborildi");
    } catch (err) {
        alert(err.message);
    }
};

document.getElementById("verifyBtn").onclick = async () => {
    try {
        const code = document.getElementById("code").value.trim();
        const result = await confirmationResult.confirm(code);

        const user = result.user;

        await set(ref(db, "users/" + user.uid), {
            phone: user.phoneNumber,
            role: "user",
            createdAt: Date.now(),
        });

        localStorage.setItem("uid", user.uid);

        alert("Ro‘yxatdan o‘tildi");
        window.location.href = "index.html";

    } catch (err) {
        alert(err.message);
    }
};
