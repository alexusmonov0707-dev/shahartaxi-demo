// app/user/js/login.js
// ES6 MODULE + MODULAR FIREBASE

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
    getAuth, RecaptchaVerifier, signInWithPhoneNumber 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getDatabase, ref, get
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";


// =============================
// FIREBASE CONFIG
// =============================
const firebaseConfig = {
    apiKey: "AIzaSyApWUG40YuC9aCsE9MOLXwLcYgRihREWvc",
    authDomain: "shahartaxi-demo.firebaseapp.com",
    databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
    projectId: "shahartaxi-demo",
    messagingSenderId: "874241795701",
    appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};


// =============================
// INIT FIREBASE
// =============================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);


// =============================
// INVISIBLE RECAPTCHA
// =============================
window.recaptchaVerifier = new RecaptchaVerifier(
    auth,
    "recaptcha-container",
    { size: "invisible" }
);


// =============================
// SEND SMS CODE
// =============================
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


// =============================
// VERIFY CODE
// =============================
document.getElementById("verifyBtn").onclick = async () => {
    const code = document.getElementById("smsCode").value;

    try {
        const result = await window.confirmationResult.confirm(code);
        const user = result.user;

        const snap = await get(ref(db, "users/" + user.uid));

        // Yangi user = register.html
        if (!snap.exists()) {
            window.location.href = "register.html";
            return;
        }

        // Eski user = index.html (USER ichida)
        window.location.href = "index.html";   // ✅ OK
    } 
    catch (e) {
        alert("Kod xato!");
    }
};

