/***************************************
 *  FIREBASE INITIALIZATION (v9 MODULAR)
 ****************************************/

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
    getAuth, 
    RecaptchaVerifier,
    signInWithPhoneNumber,
    signInWithCustomToken,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { 
    getDatabase, 
    ref, 
    set, 
    get, 
    update 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";


/***************************************
 *  YOUR FIREBASE CONFIG
 ****************************************/

const firebaseConfig = {
    apiKey: "AIzaSyApWU4G4YuC9aCsE9M0LXtLy67RiRNEWvc",
    authDomain: "shahartaxi-demo.firebaseapp.com",
    databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
    projectId: "shahartaxi-demo",
    storageBucket: "shahartaxi-demo.firebasestorage.app",
    messagingSenderId: "874241795701",
    appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};


/***************************************
 *  INITIALIZE SERVICES
 ****************************************/

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);


/***************************************
 *  EXPORTABLE HELPERS
 ****************************************/

// ReCAPTCHA – LOGIN / REGISTER uchun
export function initRecaptcha(containerId = "recaptcha-container") {
    const verifier = new RecaptchaVerifier(auth, containerId, {
        size: "invisible"
    });
    return verifier;
}

// SMS yuborish
export async function sendLoginSMS(phone, verifier) {
    return await signInWithPhoneNumber(auth, phone, verifier);
}

// SMS kodini tasdiqlash
export async function verifyLoginCode(confirmation, code) {
    return await confirmation.confirm(code);
}

// Userni olish
export function subscribeAuth(callback) {
    onAuthStateChanged(auth, callback);
}


// Realtime Database – user yaratish
export async function createUser(uid, data) {
    return await set(ref(db, "users/" + uid), data);
}

// Userni yangilash
export async function updateUser(uid, data) {
    return await update(ref(db, "users/" + uid), data);
}

// User malumotini olish
export async function getUser(uid) {
    const snap = await get(ref(db, "users/" + uid));
    return snap.exists() ? snap.val() : null;
}

