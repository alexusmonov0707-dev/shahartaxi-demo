/***************************************
 *  HELPERS — eski kodlar bilan moslik
 ****************************************/

// DOM short helper
export const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => document.querySelectorAll(sel);


/***************************************
 *  FIREBASE INITIALIZATION (v9 MODULAR)
 ****************************************/

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
    getAuth, 
    RecaptchaVerifier,
    signInWithPhoneNumber,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { 
    getDatabase, ref, set, get, update 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";


/***************************************
 *  FIREBASE CONFIG
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
 *  AUTH HELPERS
 ****************************************/

// Recaptcha loader
export function initRecaptcha(containerId = "recaptcha-container") {
    return new RecaptchaVerifier(auth, containerId, { size: "invisible" });
}

// SMS yuborish
export function sendLoginSMS(phone, verifier) {
    return signInWithPhoneNumber(auth, phone, verifier);
}

// SMS tasdiqlash
export function verifyLoginCode(confirmObj, code) {
    return confirmObj.confirm(code);
}

// Auth listener
export function onUserState(callback) {
    return onAuthStateChanged(auth, callback);
}


/***************************************
 *  DATABASE HELPERS
 ****************************************/

export async function dbSet(path, data) {
    return await set(ref(db, path), data);
}

export async function dbUpdate(path, data) {
    return await update(ref(db, path), data);
}

export async function dbGet(path) {
    const snap = await get(ref(db, path));
    return snap.exists() ? snap.val() : null;
}

export function dbRef(path) {
    return ref(db, path);
}
