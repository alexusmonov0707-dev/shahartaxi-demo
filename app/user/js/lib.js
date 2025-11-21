// ==========================
//  FIREBASE IMPORTS
// ==========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    signInWithPhoneNumber,
    RecaptchaVerifier,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
    getDatabase,
    ref,
    set,
    get,
    update
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";


// ==========================
//  FIREBASE CONFIG
// ==========================
const firebaseConfig = {
    apiKey: "AIzaSyApWUG4OY uC9aCsE9MOLXwLcYgRihREWvc",
    authDomain: "shahartaxi-demo.firebaseapp.com",
    databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
    projectId: "shahartaxi-demo",
    storageBucket: "shahartaxi-demo.firebasestorage.app",
    messagingSenderId: "874241795701",
    appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};

// START FIREBASE
export const app    = initializeApp(firebaseConfig);
export const auth   = getAuth(app);
export const db     = getDatabase(app);


// ==========================
//  PHONE LOGIN HELPERS
// ==========================
export function setupRecaptcha(buttonId) {
    window.recaptchaVerifier = new RecaptchaVerifier(
        buttonId,
        { size: "invisible" },
        auth
    );
    return window.recaptchaVerifier;
}

export function sendSMS(phone, verifier) {
    return signInWithPhoneNumber(auth, phone, verifier);
}

export { onAuthStateChanged }; // VERY IMPORTANT FOR PROFILE
export { signOut };             // ALSO USED IN PROFILE


// ==========================
//  DATABASE HELPERS
// ==========================
export function dbSet(path, data) {
    return set(ref(db, path), data);
}

export function dbUpdate(path, data) {
    return update(ref(db, path), data);
}

export function dbGet(path) {
    return get(ref(db, path));
}
