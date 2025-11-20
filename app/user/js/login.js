console.log("LOGIN JS loaded");

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyBNM3yMxb8TqZ7t6B5VuuxIE0s8d1xdRqs",
    authDomain: "shahartaxi-demo.firebaseapp.com",
    databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
    projectId: "shahartaxi-demo",
    storageBucket: "shahartaxi-demo.appspot.com",
    messagingSenderId: "499577358676",
    appId: "1:499577358676:web:64ebf7f1a8f2e189cdaf4e"
};

// Init Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// recaptcha
window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('send-btn', {
    size: 'invisible'
});

let confirmation = null;

// SMS kod yuborish
function sendCode() {
    const phone = document.getElementById("phone").value.trim();

    if (!phone) return alert("Telefon raqamni kiriting!");

    auth.signInWithPhoneNumber(phone, window.recaptchaVerifier)
        .then(result => {
            confirmation = result;
            alert("Kod yuborildi!");
        })
        .catch(err => {
            console.error(err);
            alert("Xatolik: " + err.message);
        });
}

// Kodni tasdiqlash
function verifyCode() {
    if (!confirmation) return alert("Avval kod yuboring!");

    const code = document.getElementById("code").value.trim();

    confirmation.confirm(code)
        .then(res => {
            alert("Muvaffaqiyatli kirdingiz!");
            window.location.href = "index.html";
        })
        .catch(err => {
            console.error(err);
            alert("Noto'g'ri kod!");
        });
}
