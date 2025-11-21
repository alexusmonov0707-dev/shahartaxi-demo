// ================================
//  Firebase Modular V9 Setup
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
//  FIREBASE CONFIG
//  (sening real project configing qoldi — o‘zgartirmadim)
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
//  INITIALIZE
// ================================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);


// ================================
//  EXPORTS — Login/Register tizimi uchun
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
//  🔥 QO‘SHIMCHA YORDAMCHI FUNKSIYALAR
//  (sening eski lib.js ichidagi funksiyalar asosida QAYTA YOZILDI)
// ================================

// UID olish — universal
export function getUID() {
    return localStorage.getItem("uid") ?? null;
}

// Logout
export function logout() {
    localStorage.removeItem("uid");
    window.location.href = "login.html";
}

// Random ID (eski kodingdan olinib qayta yozildi)
export function randomID(len = 20) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let res = "";
    for (let i = 0; i < len; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
    return res;
}

// Profil yangilash
export async function updateUser(uid, data) {
    await update(ref(db, "users/" + uid), data);
}

// Bitta userni olish
export async function getUser(uid) {
    const snap = await get(ref(db, "users/" + uid));
    return snap.exists() ? snap.val() : null;
}

// E’lon qo‘shish
export async function createAd(adID, data) {
    await set(ref(db, "ads/" + adID), data);
}

// Bitta e’lonni olish
export async function getAd(adID) {
    const snap = await get(ref(db, "ads/" + adID));
    return snap.exists() ? snap.val() : null;
}

// E’lonni o‘chirish
export async function deleteAd(adID) {
    await remove(ref(db, "ads/" + adID));
}

// Rasm yuklash
export async function uploadImage(file, path) {
    const storageRef = sRef(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
}
