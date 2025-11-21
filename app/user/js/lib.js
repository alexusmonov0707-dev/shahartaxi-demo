// === Firebase ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  get,
  update,
  child,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

import {
  getAuth,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

export const $ = (q) => document.querySelector(q);
export const $$ = (q) => document.querySelectorAll(q);

// === YOUR FIREBASE CONFIG ===
export const firebaseConfig = {
  apiKey: "AIzaSyApWUG4GUyC9aCsE9MOLXwLcYgRihREWvc",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
  projectId: "shahartaxi-demo",
  storageBucket: "shahartaxi-demo.firebasestorage.app",
  messagingSenderId: "874241795701",
  appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);


// === UNIVERSAL USER HELPER ===
export async function getUser(uid) {
  return (await get(ref(db, "users/" + uid))).val();
}

export async function saveUser(uid, data) {
  return update(ref(db, "users/" + uid), data);
}


// === PROFILE FUNCTIONALITY ===
export function logout() {
  signOut(auth).then(() => {
    localStorage.removeItem("uid");
    window.location.href = "login.html";
  });
}

export function openBalanceModal() {
  alert("Balans oynasi hozircha tayyor emas!");
}

export function openEditProfile() {
  alert("Profil tahrirlash oynasi hozircha tayyor emas!");
}

export function chooseAvatar() {
  alert("Avatar tanlash funksiyasi hali tayyorlanmagan!");
}


// === LOGIN HELPERS (kerak bo‘lsa ishlatadi) ===
export function createRecaptcha(containerId = "recaptcha-container") {
  window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
  });
  return window.recaptchaVerifier;
}

export async function sendSms(phone) {
  const appVerifier = createRecaptcha();
  return signInWithPhoneNumber(auth, phone, appVerifier);
}
