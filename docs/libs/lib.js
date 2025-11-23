// ======================================================
//   SHAHARTAXI — UNIVERSAL FIREBASE BACKEND (MODULAR)
// ======================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getAuth,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
    getDatabase,
    ref,
    set,
    get,
    push,
    update
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";


// === YOUR REAL FIREBASE CONFIG ===
const firebaseConfig = {
    apiKey: "AIzaSyApWUG40YuC9aC5E9MOLXwLcYgRihREWvc",
    authDomain: "shahartaxi-demo.firebaseapp.com",
    databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
    projectId: "shahartaxi-demo",
    storageBucket: "shahartaxi-demo.firebasestorage.app",
    messagingSenderId: "874241795701",
    appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};


// === INITIALIZE FIREBASE ===
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);


// === UNIVERSAL FUNCTIONS ===

export function saveData(path, data) {
    return set(ref(db, path), data);
}

export function updateData(path, data) {
    return update(ref(db, path), data);
}

export function getData(path) {
    return get(ref(db, path));
}

export function pushData(path, data) {
    return push(ref(db, path), data);
}

export {
    RecaptchaVerifier,
    signInWithPhoneNumber,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence
};
