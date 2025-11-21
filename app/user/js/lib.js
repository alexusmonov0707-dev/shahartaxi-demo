// ================================
//  Firebase Modular V9 Setup (CDN)
// ================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

import {
    getAuth,
    RecaptchaVerifier,
    signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import {
    getDatabase,
    ref,
    set,
    get,
    update,
    remove,
    onValue,
    query,
    orderByChild,
    equalTo
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

import {
    getStorage,
    uploadBytes,
    getDownloadURL,
    ref as sRef
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";


// ================================
//   FIREBASE PROJECT CONFIG
// ================================
const firebaseConfig = {
    apiKey: "AIzaSyApWUG40YuC9aCsE9MOLXwLcYgRihREWvc",
    authDomain: "shahartaxi-demo.firebaseapp.com",
    databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
    projectId: "shahartaxi-demo",
    storageBucket: "shahartaxi-demo.firebasestorage.app",
    messagingSenderId: "874241795701",
    appId: "1:965674015103:web:7033aee93013f9f46197d4"
};


// ================================
//   INITIALIZE FIREBASE
// ================================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);


// ================================
//   EXPORT FIREBASE OBJECTS
// ================================
export {
    app,
    auth,
    db,
    storage,

    RecaptchaVerifier,
    signInWithPhoneNumber,

    ref,
    set,
    get,
    update,
    remove,
    onValue,
    query,
    orderByChild,
    equalTo,

    uploadBytes,
    getDownloadURL,
    sRef
};


// ================================
//   UNIVERSAL HELPERS
// ================================
export function getUID() {
    return localStorage.getItem("uid") ?? null;
}

export function logout() {
    localStorage.removeItem("uid");
    window.location.href = "login.html";
}

export function randomID(len = 20) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let out = "";
    for (let i = 0; i < len; i++) {
        out += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return out;
}


// ================================
//   USER FUNCTIONS
// ================================
export async function updateUser(uid, data) {
    await update(ref(db, "users/" + uid), data);
}

export async function getUser(uid) {
    const snap = await get(ref(db, "users/" + uid));
    return snap.exists() ? snap.val() : null;
}


// ================================
//   ADS FUNCTIONS
// ================================
export async function createAd(id, data) {
    await set(ref(db, "ads/" + id), data);
}

export async function getAd(id) {
    const snap = await get(ref(db, "ads/" + id));
    return snap.exists() ? snap.val() : null;
}

export async function deleteAd(id) {
    await remove(ref(db, "ads/" + id));
}


// ================================
//   IMAGE UPLOADER
// ================================
export async function uploadImage(file, path) {
    const storageRef = sRef(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
}
