// =======================
//  GLOBAL FIREBASE INIT
// =======================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
    getAuth, 
    RecaptchaVerifier, 
    signInWithPhoneNumber,
    signOut 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { 
    getDatabase, 
    ref, 
    get, 
    set, 
    update 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyApWUG4QYuC9aCsE9MOLXwLcYgRihREWvc",
    authDomain: "shahartaxi-demo.firebaseapp.com",
    databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
    projectId: "shahartaxi-demo",
    storageBucket: "shahartaxi-demo.firebasestorage.app",
    messagingSenderId: "874241795701",
    appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);


// =======================
//   HELPERS
// =======================

export function $(id) {
    return document.getElementById(id);
}

export function saveUserLocal(data) {
    localStorage.setItem("user", JSON.stringify(data));
}

export function getUserLocal() {
    return JSON.parse(localStorage.getItem("user"));
}

export function logoutUser() {
    localStorage.removeItem("user");
    signOut(auth);
    window.location.href = "/shahartaxi-demo/app/user/login.html";
}


// =======================
//  AUTH: SMS YUBORISH
// =======================

export async function sendSMS(phone) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, "sms-btn", {
        size: "invisible"
    });

    const appVerifier = window.recaptchaVerifier;

    return await signInWithPhoneNumber(auth, phone, appVerifier);
}


// =======================
//  DATABASE FUNCTIONS
// =======================

// GET — profile uchun kerak
export async function dbGet(path) {
    return await get(ref(db, path));
}

// SAVE (register uchun)
export async function dbSave(path, data) {
    return await set(ref(db, path), data);
}

// UPDATE (profil tahrirlash uchun)
export async function dbUpdate(path, data) {
    return await update(ref(db, path), data);
}


// =======================
// EXPORTS PROFILE UCHUN 
// =======================

export { get, set, update, signOut };
