// =============================
//   FIREBASE INIT
// =============================
import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";

import {
    getAuth,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    signOut as firebaseSignOut
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

import {
    getDatabase,
    ref,
    set,
    get,
    update,
    onValue
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-database.js";

// =============================
//   FIREBASE CONFIG
// =============================
const firebaseConfig = {
    apiKey: "AIzaSyApWUG4YuC9aCsE9MOLXwLcYgRihREWvc",
    authDomain: "shahartaxi-demo.firebaseapp.com",
    projectId: "shahartaxi-demo",
    storageBucket: "shahartaxi-demo.appspot.com",
    messagingSenderId: "874241795701",
    appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c",
    databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com"
};

// Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// =============================
//   AUTH HELPERS
// =============================

// ReCaptcha yaratish
export function createRecaptcha(containerId) {
    return new RecaptchaVerifier(auth, containerId, {
        size: "invisible"
    });
}

// SMS yuborish
export async function sendCode(phone, recaptcha) {
    return await signInWithPhoneNumber(auth, phone, recaptcha);
}

// Kodni tasdiqlash
export async function verifyCode(confirmationResult, code) {
    return await confirmationResult.confirm(code);
}

// Tizimdan chiqish
export async function signOut() {
    return await firebaseSignOut(auth);
}

// =============================
// DATABASE HELPERS
// =============================

// User yaratish
export function createUser(uid, data) {
    return set(ref(db, "users/" + uid), data);
}

// Userni olish
export function getUser(uid) {
    return get(ref(db, "users/" + uid));
}

// Userni yangilash
export function updateUser(uid, data) {
    return update(ref(db, "users/" + uid), data);
}

// Real-time listener
export function listenUser(uid, callback) {
    return onValue(ref(db, "users/" + uid), (snap) => {
        callback(snap.val());
    });
}

// Ads yaratish / olsh / yangilash
export function createAd(id, data) {
    return set(ref(db, "ads/" + id), data);
}

export function getAds() {
    return get(ref(db, "ads"));
}

export function listenAds(callback) {
    return onValue(ref(db, "ads"), snap => callback(snap.val()));
}

// Export Firebase obyektlari
export {
    auth,
    db,
    ref,
    get,
    set,
    update,
    onValue
};
