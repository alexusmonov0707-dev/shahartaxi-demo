// ==============================
// FIREBASE CONFIG
// ==============================
import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
    getDatabase,
    ref,
    child,
    get,
    set,
    update,
    push,
    remove,
    query,
    orderByChild,
    orderByKey,
    orderByValue,
    limitToFirst,
    limitToLast,
    startAt,
    endAt,
    equalTo,
    onValue
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

import {
    getAuth,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence,

    // 💚 EMAIL AUTH qo'shildi
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut

} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";


// ==============================
// INITIALIZE
// ==============================
const firebaseConfig = {
    apiKey: "AIzaSyBLGU1t6wJAbBjC0ATk5vpywUextNhRKt0",
    authDomain: "shahartaxi-demo.firebaseapp.com",
    databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
    projectId: "shahartaxi-demo",
    storageBucket: "shahartaxi-demo.appspot.com",
    messagingSenderId: "385802387503",
    appId: "1:385802387503:web:2e7f403d3ab216e8b2ad87"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);


// ==============================
// OPTIONAL: LOCAL PERSISTENCE
// ==============================
setPersistence(auth, browserLocalPersistence);


// ==============================
// RECAPTCHA HELPER
// ==============================
function createRecaptcha(containerId) {
    window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        containerId,
        {
            size: "invisible",
            callback: () => { }
        }
    );
    return window.recaptchaVerifier;
}


// ==============================
// EXPORT QILINADIGAN OBYEKT VA FUNKSIYALAR
// ==============================
export {
    // main services
    auth,
    db,

    // database
    ref,
    child,
    get,
    set,
    update,
    push,
    remove,
    query,
    orderByChild,
    orderByKey,
    orderByValue,
    limitToFirst,
    limitToLast,
    startAt,
    endAt,
    equalTo,
    onValue,

    // auth
    onAuthStateChanged,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    createRecaptcha,

    // 💚 EMAIL AUTH EXPORTLARI
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
};
