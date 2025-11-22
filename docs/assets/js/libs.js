// ======================================================
//   SHAHARTAXI — UNIVERSAL FIREBASE BACKEND (MODULAR)
// ======================================================

// -------- Firebase imports --------
import { initializeApp } 
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

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
    get,
    set,
    update,
    push
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// FIREBASE CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyApWU...VVc",
    authDomain: "shahartaxi-demo.firebaseapp.com",
    databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
    projectId: "shahartaxi-demo",
    messagingSenderId: "874241795701",
    appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getDatabase(app);

// Persistence
await setPersistence(auth, browserLocalPersistence);

// Helper $
export const $ = id => document.getElementById(id);

// EXPORT METHODS
export {
    auth,
    db,
    ref,
    get,
    set,
    update,
    push,
    onAuthStateChanged,
    RecaptchaVerifier,
    signInWithPhoneNumber
};
