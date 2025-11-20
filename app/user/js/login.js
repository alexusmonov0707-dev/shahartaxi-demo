console.log("LOGIN JS loaded");

// Firebase config (sening real konfiguratsiyang)
const firebaseConfig = {
    apiKey: "AIzaSyBNM3yMxb8TqZ7t6B5VuuxIE0s8d1xdRqs",
    authDomain: "shahartaxi-demo.firebaseapp.com",
    databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
    projectId: "shahartaxi-demo",
    storageBucket: "shahartaxi-demo.appspot.com",
    messagingSenderId: "499577358676",
    appId: "1:499577358676:web:64ebf7f1a8f2e189cdaf4e"
};

// Firebase ishga tushirish
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

let confirmResult = null;

// ➤ SMS kod yuborish
function sendCode() {
    let phone = document.getElementById("phone").value.trim();

    if (!phone) {
        alert("Telefon raqamini kiriting!");
        return;
    }

    auth.signInWithPhoneNumber(phone, new firebase.auth.RecaptchaVerifier('send-btn', {
        size: "invisible"
    }))
    .then(result => {
        confirmResult = result;
        alert("Kod yuborildi!");
    })
    .catch(err => {
        console.error(err);
        alert("Xatolik: " + err.message);
    });
}

// ➤ Kodni tasdiqlash
function verifyCode() {
    let code = document.getElementById("code").value.trim();

    if (!confirmResult) {
        alert("Avval kod yuboring!");
        return;
    }

    confirmResult.confirm(code)
    .then(user => {
        alert("Muvaffaqiyatli kirdingiz!");
        window.location.href = "index.html";
    })
    .catch(err => {
        console.error(err);
        alert("Xato kod!");
    });
}
